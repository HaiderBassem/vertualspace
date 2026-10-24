import type { AreaData, SeatedState, WAMFileFormat } from "@workadventure/map-editor";
import { SEAT_PLAYER_VARIABLE } from "@workadventure/map-editor";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
import type { ServerToClientMessage } from "@workadventure/messages";
import {
    JoinRoomMessage,
    PositionMessage_Direction,
    RoomJoinedMessage,
    SetPlayerVariableMessage_Scope,
    SitAnswer_Status,
} from "@workadventure/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The room loads its map from map-storage: make map-storage addresses known before the code reads its settings.
vi.hoisted(() => {
    process.env.PUBLIC_MAP_STORAGE_URL = "http://map-storage.test";
});

import { GameRoom } from "../src/Model/GameRoom";
import type { Sitter } from "../src/Model/SeatManager";
import { SeatManager } from "../src/Model/SeatManager";
import type { User, UserSocket } from "../src/Model/User";
import { Point } from "../src/Model/Websocket/MessageUserPosition";

// A desk owned by Alice at (100,100)-(196,196), with a chair in it, and a sofa in the lobby.
const DESK: AreaData = {
    id: "desk-1",
    name: "Desk 1",
    visible: true,
    x: 100,
    y: 100,
    width: 96,
    height: 96,
    properties: [
        { id: "p", type: "personalAreaPropertyData", accessClaimMode: "dynamic", allowedTags: [], ownerId: "alice" },
    ],
};
const DESK_CHAIR = "entity:chair";
const SOFA = "entity:sofa";

function createWam(desk: AreaData = DESK): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "map.tmj",
        areas: [desk],
        entities: {
            chair: {
                x: 130,
                y: 150,
                prefabRef: { collectionName: "basic furniture", id: "basic furniture:Basic Chair:blue:Up" },
            },
            sofa: {
                x: 500,
                y: 500,
                prefabRef: { collectionName: "basic furniture", id: "basic furniture:Couch:grey:Down" },
            },
            table: {
                x: 120,
                y: 100,
                prefabRef: { collectionName: "basic furniture", id: "basic furniture:Basic Wood Table:orange:Down" },
            },
        },
        entityCollections: [],
    };
}

class FakeSitter implements Sitter {
    constructor(
        public readonly uuid: string,
        public position: { x: number; y: number },
        public readonly tags: string[] = [],
    ) {}
    getPosition() {
        return this.position;
    }
}

function createSeats(wam: WAMFileFormat = createWam()) {
    const published: { user: FakeSitter; state: SeatedState | null }[] = [];
    let currentWam = wam;
    const manager = new SeatManager<FakeSitter>(
        {
            getWam: () => currentWam,
            publishSeat: (user, state) => published.push({ user, state }),
        },
        () => Date.parse("2026-10-24T10:00:00Z"),
    );
    return { manager, published, setWam: (next: WAMFileFormat) => (currentWam = next) };
}

describe("SeatManager", () => {
    it("sits the owner of a desk on its chair and tells everyone", () => {
        const { manager, published } = createSeats();
        const alice = new FakeSitter("alice", { x: 146, y: 170 });

        const answer = manager.sit(alice, DESK_CHAIR);

        expect(answer).toEqual({
            status: SitAnswer_Status.SEATED,
            seat: { seatId: DESK_CHAIR, x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" },
        });
        expect(published).toEqual([
            { user: alice, state: { seatId: DESK_CHAIR, x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" } },
        ]);
        expect(manager.occupantOf(DESK_CHAIR)).toBe(alice);
    });

    it("keeps the chair of a desk for its owner", () => {
        const { manager, published } = createSeats();
        const bob = new FakeSitter("bob", { x: 146, y: 170 });

        expect(manager.sit(bob, DESK_CHAIR).status).toBe(SitAnswer_Status.DESK_TAKEN);
        expect(published).toEqual([]);
        expect(manager.occupantOf(DESK_CHAIR)).toBeUndefined();
    });

    it("gives a seat to one person only: the second asking is told it is taken", () => {
        const { manager } = createSeats();
        const bob = new FakeSitter("bob", { x: 516, y: 516 });
        const carol = new FakeSitter("carol", { x: 520, y: 520 });

        expect(manager.sit(bob, SOFA).status).toBe(SitAnswer_Status.SEATED);
        expect(manager.sit(carol, SOFA).status).toBe(SitAnswer_Status.SEAT_TAKEN);
        expect(manager.occupantOf(SOFA)).toBe(bob);
    });

    it("refuses unknown seats, furniture that is not a seat, and seats out of reach", () => {
        const { manager } = createSeats();
        const bob = new FakeSitter("bob", { x: 516, y: 516 });

        expect(manager.sit(bob, "entity:nope").status).toBe(SitAnswer_Status.SEAT_NOT_FOUND);
        expect(manager.sit(bob, "entity:table").status).toBe(SitAnswer_Status.SEAT_NOT_FOUND);
        bob.position = { x: 900, y: 900 };
        expect(manager.sit(bob, SOFA).status).toBe(SitAnswer_Status.TOO_FAR);
    });

    it("moves a player from one seat to another without announcing that they stood up in between", () => {
        const wam = createWam();
        wam.entities.armchair = {
            x: 540,
            y: 500,
            prefabRef: { collectionName: "basic furniture", id: "basic furniture:Armchair:black:Left" },
        };
        const { manager, published } = createSeats(wam);
        const bob = new FakeSitter("bob", { x: 530, y: 516 });

        manager.sit(bob, SOFA);
        manager.sit(bob, "entity:armchair");

        expect(published.map((entry) => entry.state?.seatId ?? null)).toEqual([SOFA, "entity:armchair"]);
        expect(manager.occupantOf(SOFA)).toBeUndefined();
        expect(manager.occupantOf("entity:armchair")).toBe(bob);
    });

    it("lets a person take their seat back from an older connection of theirs", () => {
        const { manager, published } = createSeats();
        const oldTab = new FakeSitter("alice", { x: 146, y: 170 });
        const newTab = new FakeSitter("alice", { x: 146, y: 170 });

        manager.sit(oldTab, DESK_CHAIR);
        expect(manager.sit(newTab, DESK_CHAIR).status).toBe(SitAnswer_Status.SEATED);

        expect(published.map(({ user, state }) => [user === oldTab ? "old" : "new", state?.seatId ?? null])).toEqual([
            ["old", DESK_CHAIR],
            ["old", null],
            ["new", DESK_CHAIR],
        ]);
        expect(manager.seatOf(oldTab)).toBeUndefined();
    });

    it("stands a player up when they ask (an empty seat), walk away, or leave", () => {
        const { manager, published } = createSeats();
        const bob = new FakeSitter("bob", { x: 516, y: 516 });

        manager.sit(bob, SOFA);
        expect(manager.sit(bob, "")).toEqual({ status: SitAnswer_Status.STOOD_UP, seat: undefined });
        expect(published.at(-1)).toEqual({ user: bob, state: null });

        manager.sit(bob, SOFA);
        bob.position = { x: 530, y: 530 }; // shifting on the sofa is not standing up
        manager.onUserMoved(bob);
        expect(manager.seatOf(bob)).toBeDefined();
        bob.position = { x: 600, y: 516 };
        manager.onUserMoved(bob);
        expect(manager.seatOf(bob)).toBeUndefined();
        expect(published.at(-1)).toEqual({ user: bob, state: null });

        bob.position = { x: 516, y: 516 };
        manager.sit(bob, SOFA);
        const announcements = published.length;
        manager.onUserLeft(bob);
        expect(manager.occupantOf(SOFA)).toBeUndefined();
        // Leaving is announced by the player leaving the room, not by the seat.
        expect(published).toHaveLength(announcements);
    });

    it("gives the chair of a hot desk to the person who booked it, when their booking begins", () => {
        const hotDesk = (reservations: { id: string; userId: string; start: string; end: string }[]): AreaData => ({
            ...DESK,
            properties: [
                {
                    id: "p",
                    type: "personalAreaPropertyData",
                    accessClaimMode: "dynamic",
                    allowedTags: [],
                    ownerId: null,
                    deskType: "hot",
                    reservations,
                },
            ],
        });
        const { manager, published, setWam } = createSeats(createWam(hotDesk([])));
        const bob = new FakeSitter("bob", { x: 146, y: 170 });
        const carol = new FakeSitter("carol", { x: 150, y: 172 });
        expect(manager.sit(bob, DESK_CHAIR).status).toBe(SitAnswer_Status.SEATED);

        // Carol's booking begins while Bob still sits there: she gets the chair when she asks for it.
        setWam(
            createWam(
                hotDesk([{ id: "b", userId: "carol", start: "2026-10-24T09:00:00Z", end: "2026-10-24T17:00:00Z" }]),
            ),
        );
        expect(manager.sit(carol, DESK_CHAIR).status).toBe(SitAnswer_Status.SEATED);
        expect(manager.seatOf(bob)).toBeUndefined();
        expect(published.slice(-2).map(({ user, state }) => [user.uuid, state?.seatId ?? null])).toEqual([
            ["bob", null],
            ["carol", DESK_CHAIR],
        ]);
        // And nobody else takes it from her.
        expect(manager.sit(bob, DESK_CHAIR).status).toBe(SitAnswer_Status.DESK_RESERVED);
    });

    it("stands up whoever may no longer sit there when the map changes", () => {
        const { manager, published, setWam } = createSeats();
        const alice = new FakeSitter("alice", { x: 146, y: 170 });
        const bob = new FakeSitter("bob", { x: 516, y: 516 });
        manager.sit(alice, DESK_CHAIR);
        manager.sit(bob, SOFA);

        // The desk is given to Dan: Alice stands up. Bob's sofa did not change: he stays.
        setWam(
            createWam({
                ...DESK,
                properties: [
                    {
                        id: "p",
                        type: "personalAreaPropertyData",
                        accessClaimMode: "static",
                        allowedTags: [],
                        ownerId: "dan",
                    },
                ],
            }),
        );
        manager.onMapChanged();
        expect(manager.seatOf(alice)).toBeUndefined();
        expect(manager.seatOf(bob)).toBeDefined();
        expect(published.at(-1)).toEqual({ user: alice, state: null });

        // The sofa is moved away: Bob stands up.
        const moved = createWam();
        moved.entities.sofa = { ...moved.entities.sofa, x: 700 };
        setWam(moved);
        manager.onMapChanged();
        expect(manager.seatOf(bob)).toBeUndefined();
    });
});

// ------------------------------------------------------------------------------------------------------------------
// In a real room: the answers, what the players' browsers receive, and what nobody can fake.
// ------------------------------------------------------------------------------------------------------------------

type WrittenMessage = NonNullable<ServerToClientMessage["message"]>;

function createMockUserSocket() {
    const written: WrittenMessage[] = [];
    const socket = {
        write: vi.fn((chunk: ServerToClientMessage) => {
            if (chunk.message) written.push(chunk.message);
            return true;
        }),
        end: vi.fn(),
    } as unknown as UserSocket;
    return { socket, written };
}

async function createRoomWithSeats(): Promise<GameRoom> {
    vi.spyOn(mapFetcher, "fetchWamFile").mockResolvedValue(createWam());
    return GameRoom.create(
        "http://play.test/~/office/map.wam",
        () => {},
        () => {},
        160,
        160,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
    );
}

async function joinRoom(room: GameRoom, uuid: string, x: number, y: number) {
    const { socket, written } = createMockUserSocket();
    const user = await room.join(
        socket,
        JoinRoomMessage.fromPartial({
            userUuid: uuid,
            IPAddress: "10.0.0.2",
            name: uuid,
            positionMessage: { x, y, direction: PositionMessage_Direction.DOWN, moving: false },
        }),
    );
    user.write({ $case: "roomJoinedMessage", roomJoinedMessage: RoomJoinedMessage.fromPartial({}) });
    return { user, written };
}

function seatOf(user: User): unknown {
    const variable = user.getVariables().getVariables().get(SEAT_PLAYER_VARIABLE);
    return variable === undefined ? undefined : JSON.parse(variable.value);
}

function ownSeatUpdates(written: WrittenMessage[], user: User): unknown[] {
    return written
        .filter(
            (message): message is Extract<WrittenMessage, { $case: "batchMessage" }> =>
                message.$case === "batchMessage",
        )
        .flatMap((batch) => batch.batchMessage.payload)
        .flatMap((sub) =>
            sub.message?.$case === "playerDetailsUpdatedMessage" ? [sub.message.playerDetailsUpdatedMessage] : [],
        )
        .filter((update) => update.userId === user.id && update.details?.setVariable?.name === SEAT_PLAYER_VARIABLE)
        .map((update): unknown => JSON.parse(update.details?.setVariable?.value ?? "null"));
}

describe("Sitting in a room", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("seats the owner, publishes the public seat variable, and tells their own browser", async () => {
        const room = await createRoomWithSeats();
        const alice = await joinRoom(room, "alice", 146, 170);

        expect(room.sit(alice.user, DESK_CHAIR).status).toBe(SitAnswer_Status.SEATED);
        vi.advanceTimersByTime(150);

        const expected = { seatId: DESK_CHAIR, x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" };
        expect(seatOf(alice.user)).toEqual(expected);
        expect(alice.user.getVariables().getVariables().get(SEAT_PLAYER_VARIABLE)?.isPublic).toBe(true);
        expect(ownSeatUpdates(alice.written, alice.user)).toEqual([expected]);
    });

    it("refuses Bob the chair of Alice's desk, and the sofa once Carol sits on it", async () => {
        const room = await createRoomWithSeats();
        const bob = await joinRoom(room, "bob", 146, 170);
        const carol = await joinRoom(room, "carol", 516, 516);

        expect(room.sit(bob.user, DESK_CHAIR).status).toBe(SitAnswer_Status.DESK_TAKEN);
        expect(room.sit(carol.user, SOFA).status).toBe(SitAnswer_Status.SEATED);
        room.updatePosition(bob.user, new Point(520, 520));
        expect(room.sit(bob.user, SOFA).status).toBe(SitAnswer_Status.SEAT_TAKEN);
        expect(seatOf(bob.user)).toBeUndefined();
    });

    it("ignores a browser or a script writing the seat variable itself", async () => {
        const room = await createRoomWithSeats();
        const bob = await joinRoom(room, "bob", 146, 170);

        room.updatePlayerDetails(bob.user, {
            setVariable: {
                name: SEAT_PLAYER_VARIABLE,
                value: JSON.stringify({ seatId: DESK_CHAIR, x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" }),
                public: true,
                persist: false,
                ttl: undefined,
                scope: SetPlayerVariableMessage_Scope.ROOM,
            },
            availabilityStatus: 0,
            outlineColor: undefined,
            removeOutlineColor: undefined,
            showVoiceIndicator: undefined,
            chatID: undefined,
            sayMessage: undefined,
        });

        expect(seatOf(bob.user)).toBeUndefined();
    });

    it("frees the seat when its player walks away or leaves, so that another can sit", async () => {
        const room = await createRoomWithSeats();
        const carol = await joinRoom(room, "carol", 516, 516);
        const bob = await joinRoom(room, "bob", 520, 520);

        room.sit(carol.user, SOFA);
        room.updatePosition(carol.user, new Point(700, 516));
        vi.advanceTimersByTime(150);
        expect(seatOf(carol.user)).toBeNull();
        expect(ownSeatUpdates(carol.written, carol.user).at(-1)).toBeNull();
        expect(room.sit(bob.user, SOFA).status).toBe(SitAnswer_Status.SEATED);

        room.updatePosition(carol.user, new Point(516, 516));
        room.leave(bob.user);
        expect(room.sit(carol.user, SOFA).status).toBe(SitAnswer_Status.SEATED);
    });
});
