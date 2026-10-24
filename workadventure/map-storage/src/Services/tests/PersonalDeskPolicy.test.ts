import { describe, expect, it } from "vitest";
import type { AreaData } from "@workadventure/map-editor";
import type { ModifyAreaMessage } from "@workadventure/messages";
import {
    DeskPolicyError,
    assertDeskChangeAllowed,
    evaluateDeskChange,
    normalizeDeskChange,
} from "../PersonalDeskPolicy";

interface DeskOptions {
    ownerId?: string | null;
    mode?: "dynamic" | "static";
    allowedTags?: string[];
    disabled?: boolean;
}

function desk(id: string, options: DeskOptions = {}): AreaData {
    return {
        id,
        name: id,
        x: 0,
        y: 0,
        width: 64,
        height: 64,
        visible: true,
        properties: [
            {
                id: `${id}-property`,
                type: "personalAreaPropertyData",
                accessClaimMode: options.mode ?? "dynamic",
                allowedTags: options.allowedTags ?? [],
                ownerId: options.ownerId ?? null,
                ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
            },
        ],
    };
}

/** What the browser sends to set the owner of a desk: the same properties, with another ownerId. */
function setOwner(area: AreaData, ownerId: string | null): ModifyAreaMessage {
    return {
        id: area.id,
        modifyProperties: true,
        properties: area.properties.map((property) =>
            property.type === "personalAreaPropertyData" ? { ...property, ownerId } : property,
        ),
    };
}

const NO_TAGS: string[] = [];

describe("evaluateDeskChange", () => {
    describe("claiming a desk", () => {
        it("lets an employee claim a free desk that is open to claiming", () => {
            const free = desk("d1");

            expect(evaluateDeskChange(setOwner(free, "alice"), "alice", NO_TAGS, free, [free])).toEqual({
                allowed: true,
                kind: "claim",
            });
        });

        it("refuses a desk that another employee already owns", () => {
            const taken = desk("d1", { ownerId: "bob" });

            expect(evaluateDeskChange(setOwner(taken, "alice"), "alice", NO_TAGS, taken, [taken])).toEqual({
                allowed: false,
                reason: "DESK_TAKEN",
            });
        });

        it("refuses a desk that an administrator assigns, which cannot be claimed by oneself", () => {
            const assigned = desk("d1", { mode: "static" });

            expect(evaluateDeskChange(setOwner(assigned, "alice"), "alice", NO_TAGS, assigned, [assigned])).toEqual({
                allowed: false,
                reason: "DESK_NOT_CLAIMABLE",
            });
        });

        it("refuses a desk that an administrator took out of service", () => {
            const disabled = desk("d1", { disabled: true });

            expect(evaluateDeskChange(setOwner(disabled, "alice"), "alice", NO_TAGS, disabled, [disabled])).toEqual({
                allowed: false,
                reason: "DESK_DISABLED",
            });
        });

        it("refuses an employee who lacks the tag the desk asks for", () => {
            const reserved = desk("d1", { allowedTags: ["design"] });

            expect(evaluateDeskChange(setOwner(reserved, "alice"), "alice", ["sales"], reserved, [reserved])).toEqual({
                allowed: false,
                reason: "DESK_NOT_ELIGIBLE",
            });
        });

        it("lets an employee who has one of the tags the desk asks for claim it", () => {
            const reserved = desk("d1", { allowedTags: ["design", "product"] });

            expect(
                evaluateDeskChange(setOwner(reserved, "alice"), "alice", ["sales", "product"], reserved, [reserved]),
            ).toEqual({ allowed: true, kind: "claim" });
        });

        it("lets anyone claim a desk that asks for no tag", () => {
            const open = desk("d1", { allowedTags: [] });

            expect(evaluateDeskChange(setOwner(open, "alice"), "alice", NO_TAGS, open, [open]).allowed).toBe(true);
        });

        it("refuses a second desk to an employee who already has one", () => {
            const mine = desk("d1", { ownerId: "alice" });
            const other = desk("d2");

            expect(evaluateDeskChange(setOwner(other, "alice"), "alice", NO_TAGS, other, [mine, other])).toEqual({
                allowed: false,
                reason: "DESK_ALREADY_OWNED",
            });
        });

        it("lets an employee claim a desk once the first one was released", () => {
            const released = desk("d1");
            const other = desk("d2");

            expect(
                evaluateDeskChange(setOwner(other, "alice"), "alice", NO_TAGS, other, [released, other]).allowed,
            ).toBe(true);
        });

        it("refuses an employee with no identity", () => {
            const free = desk("d1");

            expect(evaluateDeskChange(setOwner(free, ""), "", NO_TAGS, free, [free]).allowed).toBe(false);
        });
    });

    describe("releasing a desk", () => {
        it("lets the owner release their desk", () => {
            const mine = desk("d1", { ownerId: "alice" });

            expect(evaluateDeskChange(setOwner(mine, null), "alice", NO_TAGS, mine, [mine])).toEqual({
                allowed: true,
                kind: "release",
            });
        });

        it("lets the owner release a desk that was disabled after they claimed it", () => {
            const mine = desk("d1", { ownerId: "alice", disabled: true });

            expect(evaluateDeskChange(setOwner(mine, null), "alice", NO_TAGS, mine, [mine]).allowed).toBe(true);
        });

        it("lets the owner of a desk that an administrator assigned release it", () => {
            const mine = desk("d1", { ownerId: "alice", mode: "static" });

            expect(evaluateDeskChange(setOwner(mine, null), "alice", NO_TAGS, mine, [mine]).allowed).toBe(true);
        });

        it("refuses to release the desk of another employee", () => {
            const bobs = desk("d1", { ownerId: "bob" });

            expect(evaluateDeskChange(setOwner(bobs, null), "alice", NO_TAGS, bobs, [bobs])).toEqual({
                allowed: false,
                reason: "DESK_TAKEN",
            });
        });

        it("refuses to give a desk to another employee", () => {
            const mine = desk("d1", { ownerId: "alice" });

            expect(evaluateDeskChange(setOwner(mine, "bob"), "alice", NO_TAGS, mine, [mine]).allowed).toBe(false);
        });
    });

    describe("anything else about a desk", () => {
        it("refuses to move or resize a desk", () => {
            const mine = desk("d1", { ownerId: "alice" });
            const message = { ...setOwner(mine, "alice"), x: 500, y: 500 } as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, mine, [mine]).allowed).toBe(false);
        });

        it("refuses to change what the desk is while claiming it, such as its claim mode", () => {
            const free = desk("d1", { mode: "dynamic" });
            const message = {
                id: free.id,
                modifyProperties: true,
                properties: [
                    {
                        id: "d1-property",
                        type: "personalAreaPropertyData",
                        accessClaimMode: "static",
                        allowedTags: [],
                        ownerId: "alice",
                    },
                ],
            } as unknown as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, free, [free]).allowed).toBe(false);
        });

        it("refuses to turn the desk back on while claiming it", () => {
            const disabled = desk("d1", { disabled: true });
            const message = {
                id: disabled.id,
                modifyProperties: true,
                properties: [
                    {
                        id: "d1-property",
                        type: "personalAreaPropertyData",
                        accessClaimMode: "dynamic",
                        allowedTags: [],
                        ownerId: "alice",
                        disabled: false,
                    },
                ],
            } as unknown as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, disabled, [disabled]).allowed).toBe(false);
        });

        it("refuses to add a property to the desk, such as a restriction of rights", () => {
            const free = desk("d1");
            const message = {
                id: free.id,
                modifyProperties: true,
                properties: [
                    ...(setOwner(free, "alice").properties as unknown[]),
                    { id: "extra", type: "restrictedRightsPropertyData", readTags: [], writeTags: ["alice"] },
                ],
            } as unknown as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, free, [free]).allowed).toBe(false);
        });

        it("refuses to edit an area that is not a desk", () => {
            const room: AreaData = {
                id: "r1",
                name: "room",
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                visible: true,
                properties: [],
            };
            const message = { id: "r1", modifyProperties: true, properties: [] } as unknown as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, room, [room]).allowed).toBe(false);
        });

        it("refuses to edit an area that does not exist", () => {
            const message = { id: "ghost", modifyProperties: true, properties: [] } as unknown as ModifyAreaMessage;

            expect(evaluateDeskChange(message, "alice", NO_TAGS, undefined, []).allowed).toBe(false);
        });
    });
});

describe("desk types, reservations and owner names", () => {
    const now = Date.parse("2026-10-24T10:00:00Z");
    const withProperty = (area: AreaData, extra: Record<string, unknown>): AreaData => ({
        ...area,
        properties: area.properties.map((property) =>
            property.type === "personalAreaPropertyData" ? { ...property, ...extra } : property,
        ),
    });

    it("refuses to let anyone claim a hot desk or a shared desk", () => {
        for (const deskType of ["hot", "shared"]) {
            const area = withProperty(desk("d1"), { deskType });
            expect(evaluateDeskChange(setOwner(area, "alice"), "alice", NO_TAGS, area, [area], now)).toEqual({
                allowed: false,
                reason: "DESK_NOT_CLAIMABLE",
            });
        }
    });

    it("refuses a desk kept for somebody else right now, and lets that person claim it whatever the tags", () => {
        const area = withProperty(desk("d1", { allowedTags: ["design"] }), {
            reservations: [{ id: "r", userId: "carol", start: "2026-10-24T09:00:00Z", end: "2026-10-24T12:00:00Z" }],
        });
        expect(evaluateDeskChange(setOwner(area, "alice"), "alice", ["design"], area, [area], now)).toEqual({
            allowed: false,
            reason: "DESK_RESERVED",
        });
        expect(evaluateDeskChange(setOwner(area, "carol"), "carol", NO_TAGS, area, [area], now).allowed).toBe(true);
        // Once the reservation is over, the tags of the desk apply again.
        const later = Date.parse("2026-10-24T13:00:00Z");
        expect(evaluateDeskChange(setOwner(area, "carol"), "carol", NO_TAGS, area, [area], later)).toEqual({
            allowed: false,
            reason: "DESK_NOT_ELIGIBLE",
        });
    });

    it("counts a co-owner of a shared desk as somebody who already has a desk", () => {
        const shared = withProperty(desk("shared", { ownerId: "bob", mode: "static" }), {
            deskType: "shared",
            coOwnerIds: ["alice"],
        });
        const free = desk("d2");
        expect(evaluateDeskChange(setOwner(free, "alice"), "alice", NO_TAGS, free, [shared, free], now)).toEqual({
            allowed: false,
            reason: "DESK_ALREADY_OWNED",
        });
    });

    it("lets the owner's name go with a claim, and nothing else", () => {
        const free = desk("d1");
        const claim = setOwner(free, "alice");
        claim.properties = claim.properties.map((property: Record<string, unknown>) => ({
            ...property,
            ownerName: "Alice",
        }));
        expect(evaluateDeskChange(claim, "alice", NO_TAGS, free, [free], now).allowed).toBe(true);

        const sneaky = setOwner(free, "alice");
        sneaky.properties = sneaky.properties.map((property: Record<string, unknown>) => ({
            ...property,
            deskType: "hot",
        }));
        expect(evaluateDeskChange(sneaky, "alice", NO_TAGS, free, [free], now).allowed).toBe(false);
    });

    it("does not keep the former owner's name on a released desk", () => {
        const mine = withProperty(desk("d1", { ownerId: "alice" }), { ownerName: "Alice" });
        const release = setOwner(mine, null);
        expect(evaluateDeskChange(release, "alice", NO_TAGS, mine, [mine], now).allowed).toBe(true);

        normalizeDeskChange(release, "release");

        expect(release.properties[0]).toMatchObject({ ownerId: null, ownerName: null });
    });

    it("leaves a claim as it was sent", () => {
        const free = desk("d1");
        const claim = setOwner(free, "alice");
        claim.properties = claim.properties.map((property: Record<string, unknown>) => ({
            ...property,
            ownerName: "Alice",
        }));
        normalizeDeskChange(claim, "claim");
        expect(claim.properties[0]).toMatchObject({ ownerId: "alice", ownerName: "Alice" });
    });
});

describe("booking a hot desk", () => {
    const now = Date.parse("2026-10-24T08:00:00Z");
    const hot = (reservations: unknown[] = []): AreaData => {
        const area = desk("hot1");
        return {
            ...area,
            properties: area.properties.map((property) => ({ ...property, deskType: "hot", reservations })),
        } as AreaData;
    };
    const jane = {
        id: "b1",
        userId: "jane",
        userName: "Jane",
        start: "2026-10-24T08:00:00.000Z",
        end: "2026-10-24T17:00:00.000Z",
    };
    /** What the browser sends to book or cancel: the same properties, with other reservations. */
    const setReservations = (area: AreaData, reservations: unknown[]): ModifyAreaMessage => ({
        id: area.id,
        modifyProperties: true,
        properties: area.properties.map((property) => ({ ...property, reservations })),
    });

    it("lets an employee book a free hot desk and cancel their booking", () => {
        const free = hot();
        expect(evaluateDeskChange(setReservations(free, [jane]), "jane", NO_TAGS, free, [free], now)).toEqual({
            allowed: true,
            kind: "book",
        });
        const booked = hot([jane]);
        expect(evaluateDeskChange(setReservations(booked, []), "jane", NO_TAGS, booked, [booked], now)).toEqual({
            allowed: true,
            kind: "cancel",
        });
    });

    it("refuses to cancel someone else's booking, or to book over it", () => {
        const booked = hot([jane]);
        expect(evaluateDeskChange(setReservations(booked, []), "bob", NO_TAGS, booked, [booked], now)).toEqual({
            allowed: false,
            reason: "BOOKING_INVALID",
        });
        const bob = { ...jane, id: "b2", userId: "bob", userName: "Bob" };
        expect(evaluateDeskChange(setReservations(booked, [jane, bob]), "bob", NO_TAGS, booked, [booked], now)).toEqual(
            { allowed: false, reason: "BOOKING_CONFLICT" },
        );
    });

    it("refuses to book a personal desk, or to change anything else along with a booking", () => {
        const personal = desk("d1");
        expect(
            evaluateDeskChange(setReservations(personal, [jane]), "jane", NO_TAGS, personal, [personal], now),
        ).toEqual({ allowed: false, reason: "DESK_NOT_BOOKABLE" });

        const free = hot();
        const sneaky = setReservations(free, [jane]);
        sneaky.properties = sneaky.properties.map((property: Record<string, unknown>) => ({
            ...property,
            disabled: true,
        }));
        expect(evaluateDeskChange(sneaky, "jane", NO_TAGS, free, [free], now)).toEqual({
            allowed: false,
            reason: "DESK_CHANGE_NOT_ALLOWED",
        });
        const moved = { ...setReservations(free, [jane]), x: 32 };
        expect(evaluateDeskChange(moved, "jane", NO_TAGS, free, [free], now)).toEqual({
            allowed: false,
            reason: "DESK_CHANGE_NOT_ALLOWED",
        });
    });

    it("refuses a second desk booked for the same time", () => {
        const first = hot([jane]);
        const second = { ...hot(), id: "hot2" };
        const again = { ...jane, id: "b3" };
        expect(
            evaluateDeskChange(setReservations(second, [again]), "jane", NO_TAGS, second, [first, second], now),
        ).toEqual({ allowed: false, reason: "BOOKING_DOUBLE" });
    });

    it("throws the reason of a refused booking for the browser to explain", () => {
        const personal = desk("d1");
        expect(() =>
            assertDeskChangeAllowed(setReservations(personal, [jane]), "jane", NO_TAGS, personal, [personal], now),
        ).toThrow(/^DESK_NOT_BOOKABLE: /);
    });
});

describe("assertDeskChangeAllowed", () => {
    it("does nothing for a change that is allowed", () => {
        const free = desk("d1");

        expect(() => assertDeskChangeAllowed(setOwner(free, "alice"), "alice", NO_TAGS, free, [free])).not.toThrow();
    });

    it("throws an error that carries the reason, for the browser to explain", () => {
        const taken = desk("d1", { ownerId: "bob" });

        const attempt = () => assertDeskChangeAllowed(setOwner(taken, "alice"), "alice", NO_TAGS, taken, [taken]);

        expect(attempt).toThrow(DeskPolicyError);
        expect(attempt).toThrow(/^DESK_TAKEN: /);
    });
});
