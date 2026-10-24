import { describe, expect, it } from "vitest";
import type { AreaData, PersonalAreaPropertyData, WAMEntityData } from "../../src/types";
import {
    deskContaining,
    isSeatFurnitureName,
    listSeats,
    nearestSeat,
    parsePrefabId,
    parseSeatedState,
    seatOfEntity,
    seatsOfDesk,
} from "../../src/PersonalDesk/Seats";
import { evaluateDeskSeating, evaluateSit } from "../../src/PersonalDesk/SitPolicy";

type Desk = Omit<PersonalAreaPropertyData, "id" | "type" | "accessClaimMode" | "allowedTags"> &
    Partial<Pick<PersonalAreaPropertyData, "accessClaimMode" | "allowedTags">>;

function deskArea(id: string, rect: { x: number; y: number; width: number; height: number }, desk: Desk): AreaData {
    return {
        id,
        name: id,
        visible: true,
        ...rect,
        properties: [
            {
                id: `${id}-property`,
                type: "personalAreaPropertyData",
                accessClaimMode: desk.accessClaimMode ?? "dynamic",
                allowedTags: desk.allowedTags ?? [],
                ...desk,
            },
        ],
    };
}

function entity(prefabId: string, x: number, y: number): Pick<WAMEntityData, "x" | "y" | "prefabRef"> {
    return { x, y, prefabRef: { collectionName: prefabId.split(":")[0], id: prefabId } };
}

describe("prefab identifiers", () => {
    it("are read from the end, so that collection names may contain colons", () => {
        expect(parsePrefabId("basic furniture:Basic Chair:blue:Up")).toEqual({
            collectionName: "basic furniture",
            name: "Basic Chair",
            color: "blue",
            direction: "Up",
        });
        expect(parsePrefabId("acme:office:Stool:red:Left")?.collectionName).toBe("acme:office");
    });

    it("keep the parts even when the last one is not a direction", () => {
        expect(parsePrefabId("x:Chair:red:Sideways")?.direction).toBeUndefined();
    });

    it("are not understood when they do not have the collection shape (uploaded objects)", () => {
        expect(parsePrefabId("2f6a2c5e-0f5e-4a52-9f1f-0d6e1d4c1b9a")).toBeUndefined();
        expect(parsePrefabId("a:b:c")).toBeUndefined();
        expect(parsePrefabId(":Chair:red:Up")).toBeUndefined();
    });
});

describe("furniture to sit on", () => {
    it("is recognised from its name", () => {
        for (const name of ["Basic Chair", "Armchair", "Couch", "Pouf", "Office chairs", "Bar stool", "Sofa"]) {
            expect(isSeatFurnitureName(name), name).toBe(true);
        }
        for (const name of ["Basic Wood Table", "Plant", "Chairman portrait", "Computer Screen", "Seating plan"]) {
            expect(isSeatFurnitureName(name), name).toBe(false);
        }
    });

    it("offers a seat at its centre, facing the way it faces", () => {
        expect(seatOfEntity("e1", entity("basic furniture:Basic Chair:blue:Up", 100, 200))).toEqual({
            id: "entity:e1",
            x: 116,
            y: 216,
            direction: "Up",
        });
        expect(
            seatOfEntity("e2", entity("basic furniture:Couch:grey:Down", 0, 0), { width: 64, height: 64 }),
        ).toMatchObject({ x: 32, y: 32, direction: "Down" });
    });

    it("faces down when its identifier says no direction", () => {
        expect(seatOfEntity("e3", entity("custom:Chair:red:Diagonal", 0, 0))?.direction).toBe("Down");
    });

    it("is not offered by other furniture", () => {
        expect(seatOfEntity("t", entity("basic furniture:Basic Wood Table:orange:Down", 0, 0))).toBeUndefined();
    });
});

describe("listSeats", () => {
    const desk = deskArea("desk-1", { x: 100, y: 100, width: 96, height: 96 }, { ownerId: "alice" });
    const meetingRoom: AreaData = {
        id: "room",
        name: "Room",
        visible: true,
        x: 0,
        y: 400,
        width: 500,
        height: 300,
        properties: [],
    };

    it("ties the seats inside a desk to that desk, and leaves the others free-standing", () => {
        const seats = listSeats(
            [meetingRoom, desk],
            [
                ["chair-at-desk", entity("basic furniture:Basic Chair:blue:Up", 130, 150)],
                ["sofa", entity("basic furniture:Couch:grey:Down", 50, 450)],
                ["table", entity("basic furniture:Basic Wood Table:orange:Down", 120, 100)],
            ],
        );
        expect(seats).toEqual([
            { id: "entity:chair-at-desk", x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" },
            { id: "entity:sofa", x: 66, y: 466, direction: "Down" },
        ]);
    });

    it("adds the seats drawn on desks, with stable identifiers", () => {
        const drawn = deskArea(
            "desk-2",
            { x: 300, y: 100, width: 64, height: 64 },
            {
                ownerId: null,
                seats: [
                    { x: 310, y: 120, direction: "Down" },
                    { x: 340, y: 120, direction: "Down" },
                ],
            },
        );
        expect(listSeats([drawn], []).map((seat) => seat.id)).toEqual(["desk:desk-2:0", "desk:desk-2:1"]);
        expect(seatsOfDesk(listSeats([drawn], []), "desk-2")).toHaveLength(2);
    });

    it("uses the real size of an object when it is known", () => {
        const [seat] = listSeats([], [["c", entity("basic furniture:Armchair:black:Up", 0, 0)]], () => ({
            width: 32,
            height: 64,
        }));
        expect(seat).toMatchObject({ x: 16, y: 32 });
    });

    it("finds the desk that contains a point", () => {
        expect(deskContaining([meetingRoom, desk], { x: 150, y: 150 })?.id).toBe("desk-1");
        expect(deskContaining([meetingRoom, desk], { x: 50, y: 450 })).toBeUndefined();
    });
});

describe("nearestSeat", () => {
    const seats = [
        { id: "b", x: 10, y: 0 },
        { id: "a", x: -10, y: 0 },
        { id: "far", x: 200, y: 0 },
    ];

    it("picks the closest seat within reach, ties broken by id", () => {
        expect(nearestSeat(seats, { x: 0, y: 0 }, 50)?.id).toBe("a");
        expect(nearestSeat(seats, { x: 8, y: 0 }, 50)?.id).toBe("b");
    });

    it("finds nothing out of reach", () => {
        expect(nearestSeat(seats, { x: 100, y: 100 }, 20)).toBeUndefined();
    });
});

describe("the seated state", () => {
    it("is read from a valid variable value only", () => {
        const state = { seatId: "entity:e1", x: 1, y: 2, direction: "Up" };
        expect(parseSeatedState(state)).toEqual(state);
        expect(parseSeatedState(null)).toBeUndefined();
        expect(parseSeatedState(undefined)).toBeUndefined();
        expect(parseSeatedState({ ...state, direction: "North" })).toBeUndefined();
        expect(parseSeatedState("entity:e1")).toBeUndefined();
    });
});

describe("evaluateSit", () => {
    const now = Date.parse("2026-10-24T10:00:00Z");
    const seat = { x: 100, y: 100, deskAreaId: "desk-1" };
    const alice = { uuid: "alice", tags: [] };
    const bob = { uuid: "bob", tags: ["sales"] };
    const desk = (overrides: Partial<NonNullable<Parameters<typeof evaluateSit>[0]["desk"]>> = {}) => ({
        ownerId: null,
        allowedTags: [],
        ...overrides,
    });

    it("lets anyone sit on a free seat that belongs to no desk", () => {
        expect(evaluateSit({ seat, desk: null, sitter: bob, occupantUuid: undefined, now })).toEqual({ allowed: true });
    });

    it("refuses a seat that does not exist, or that is too far away", () => {
        expect(evaluateSit({ seat: undefined, desk: null, sitter: bob, occupantUuid: undefined, now })).toEqual({
            allowed: false,
            reason: "SEAT_NOT_FOUND",
        });
        expect(
            evaluateSit({ seat, desk: null, sitter: bob, occupantUuid: undefined, position: { x: 300, y: 100 }, now }),
        ).toEqual({ allowed: false, reason: "TOO_FAR" });
        expect(
            evaluateSit({ seat, desk: null, sitter: bob, occupantUuid: undefined, position: { x: 150, y: 120 }, now }),
        ).toEqual({ allowed: true });
    });

    it("keeps one person per seat, but lets a person take back their own seat (another tab of theirs)", () => {
        expect(evaluateSit({ seat, desk: null, sitter: bob, occupantUuid: "alice", now })).toEqual({
            allowed: false,
            reason: "SEAT_TAKEN",
        });
        expect(evaluateSit({ seat, desk: null, sitter: bob, occupantUuid: "bob", now })).toEqual({ allowed: true });
    });

    it("keeps the seats of a desk for the people it belongs to", () => {
        expect(
            evaluateSit({ seat, desk: desk({ ownerId: "alice" }), sitter: bob, occupantUuid: undefined, now }),
        ).toEqual({ allowed: false, reason: "DESK_TAKEN" });
        expect(
            evaluateSit({ seat, desk: desk({ ownerId: "alice" }), sitter: alice, occupantUuid: undefined, now }),
        ).toEqual({ allowed: true });
        const shared = desk({ ownerId: "alice", deskType: "shared", coOwnerIds: ["bob"] });
        expect(evaluateSit({ seat, desk: shared, sitter: bob, occupantUuid: undefined, now })).toEqual({
            allowed: true,
        });
    });

    it("tells the owner of a desk first that it is theirs, before saying a seat is taken", () => {
        expect(
            evaluateSit({ seat, desk: desk({ ownerId: "alice" }), sitter: bob, occupantUuid: "carol", now }),
        ).toEqual({
            allowed: false,
            reason: "DESK_TAKEN",
        });
    });

    it("lets the owner of a desk that is out of service still sit at it, and nobody else", () => {
        expect(evaluateDeskSeating(desk({ ownerId: "alice", disabled: true }), alice, now)).toEqual({ allowed: true });
        expect(evaluateDeskSeating(desk({ disabled: true }), alice, now)).toEqual({
            allowed: false,
            reason: "DESK_DISABLED",
        });
    });

    it("keeps a reserved desk for the person it is kept for, whatever their tags", () => {
        const reserved = desk({
            allowedTags: ["design"],
            reservations: [{ id: "r", userId: "bob", start: "2026-10-24T08:00:00Z", end: "2026-10-24T18:00:00Z" }],
        });
        expect(evaluateDeskSeating(reserved, alice, now)).toEqual({ allowed: false, reason: "DESK_RESERVED" });
        expect(evaluateDeskSeating(reserved, bob, now)).toEqual({ allowed: true });
        // After the reservation, the tags of the desk apply again.
        expect(evaluateDeskSeating(reserved, bob, Date.parse("2026-10-24T19:00:00Z"))).toEqual({
            allowed: false,
            reason: "DESK_NOT_ELIGIBLE",
        });
    });

    it("opens a hot desk to everyone it is open to", () => {
        const hot = desk({ deskType: "hot", allowedTags: ["sales"] });
        expect(evaluateDeskSeating(hot, bob, now)).toEqual({ allowed: true });
        expect(evaluateDeskSeating(hot, alice, now)).toEqual({ allowed: false, reason: "DESK_NOT_ELIGIBLE" });
    });
});
