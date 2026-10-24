import { afterEach, describe, expect, it, vi } from "vitest";
import {
    JoinRoomMessage,
    KnockOnGroupAnswer_Status,
    PositionMessage_Direction,
    RoomJoinedMessage,
} from "@workadventure/messages";
import type { ServerToClientMessage } from "@workadventure/messages";
import { GameRoom } from "../src/Model/GameRoom";
import type { User, UserSocket } from "../src/Model/User";
import { Point } from "../src/Model/Websocket/MessageUserPosition";
import type { EmoteCallback } from "../src/Model/Zone";

const ROOM_URL = "https://play.workadventu.re/_/global/localhost/test.json";

type WrittenMessage = NonNullable<ServerToClientMessage["message"]>;

function createMockUserSocket() {
    const written: WrittenMessage[] = [];
    // The room only writes to the socket in these tests: a partial mock of the gRPC stream is enough.
    const socket = {
        write: vi.fn((chunk: ServerToClientMessage) => {
            if (chunk.message) written.push(chunk.message);
            return true;
        }),
        end: vi.fn(),
    } as unknown as UserSocket;
    return { socket, written };
}

const emote: EmoteCallback = () => {};

/** A room where users within 160px of each other (or of a group's center) talk together. */
function createRoom(): Promise<GameRoom> {
    return GameRoom.create(
        ROOM_URL,
        () => {},
        () => {},
        160,
        160,
        () => {},
        () => {},
        () => {},
        emote,
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
    // The user's messages are held until the front was told it joined the room.
    user.write({ $case: "roomJoinedMessage", roomJoinedMessage: RoomJoinedMessage.fromPartial({}) });
    return { user, written };
}

function messagesOfType<C extends WrittenMessage["$case"]>(written: WrittenMessage[], type: C) {
    return written.filter((message): message is Extract<WrittenMessage, { $case: C }> => message.$case === type);
}

/**
 * Alice and Bob talk in a locked conversation centered on (150, 100). Carol stands right next to it, at (260, 100):
 * close enough to join, were it not locked.
 */
async function createLockedConversation() {
    const room = await createRoom();
    const alice = await joinRoom(room, "alice", 100, 100);
    const bob = await joinRoom(room, "bob", 200, 100);
    const group = alice.user.group;
    if (group === undefined) throw new Error("Alice and Bob should talk together");
    group.lock();

    const carol = await joinRoom(room, "carol", 260, 100);
    expect(carol.user.group).toBeUndefined();

    const moveTo = (user: User, x: number, y: number) => room.updatePosition(user, new Point(x, y));
    return { room, group, alice, bob, carol, moveTo };
}

describe("Knocking on a locked conversation", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("asks the members, and lets the knocker in right away when one of them says so", async () => {
        const { room, group, alice, bob, carol } = await createLockedConversation();

        const answer = room.knockOnGroup(carol.user, group.getId());

        expect(answer.status).toBe(KnockOnGroupAnswer_Status.SENT);
        for (const member of [alice, bob]) {
            expect(messagesOfType(member.written, "groupKnockReceivedMessage")).toEqual([
                {
                    $case: "groupKnockReceivedMessage",
                    groupKnockReceivedMessage: {
                        groupId: group.getId(),
                        knockerUserId: carol.user.id,
                        knockerUuid: "carol",
                        knockerName: "carol",
                    },
                },
            ]);
        }
        expect(carol.user.group).toBeUndefined();

        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });

        expect(carol.user.group).toBe(group);
        expect(messagesOfType(carol.written, "groupKnockAnsweredMessage")).toEqual([
            {
                $case: "groupKnockAnsweredMessage",
                groupKnockAnsweredMessage: { groupId: group.getId(), accepted: true, responderName: "alice" },
            },
        ]);
        // Bob's prompt closes: Alice answered.
        expect(messagesOfType(bob.written, "groupKnockClosedMessage")).toEqual([
            {
                $case: "groupKnockClosedMessage",
                groupKnockClosedMessage: { groupId: group.getId(), knockerUserId: carol.user.id },
            },
        ]);
    });

    it("lets the knocker in once: coming back means knocking again", async () => {
        const { room, group, alice, carol, moveTo } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());
        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });
        expect(carol.user.group).toBe(group);

        moveTo(carol.user, 900, 100);
        expect(carol.user.group).toBeUndefined();
        expect(group.isLocked()).toBe(true);

        moveTo(carol.user, 260, 100);
        expect(carol.user.group).toBeUndefined();
    });

    it("keeps the knocker out when a member answers 'Not now'", async () => {
        const { room, group, bob, carol, moveTo } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());

        room.answerGroupKnock(bob.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: false });
        moveTo(carol.user, 250, 100);

        expect(carol.user.group).toBeUndefined();
        expect(messagesOfType(carol.written, "groupKnockAnsweredMessage")[0].groupKnockAnsweredMessage).toEqual({
            groupId: group.getId(),
            accepted: false,
            responderName: "bob",
        });
    });

    it("lets a knocker who walked away before being let in join when they come back", async () => {
        const { room, group, alice, carol, moveTo } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());
        moveTo(carol.user, 900, 100);

        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });
        expect(carol.user.group).toBeUndefined();

        moveTo(carol.user, 260, 100);
        expect(carol.user.group).toBe(group);
    });

    it("forgets who was let in when the conversation ends", async () => {
        const { room, group, alice, bob, carol, moveTo } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());
        moveTo(carol.user, 900, 100);
        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });

        // Bob leaves: alone, Alice's conversation ends. Then Bob comes back, and they lock a new one, at the same spot.
        room.leave(bob.user);
        expect(alice.user.group).toBeUndefined();
        const bobAgain = await joinRoom(room, "bob", 200, 100);
        const newGroup = alice.user.group;
        expect(newGroup).toBeDefined();
        expect(newGroup).toBe(bobAgain.user.group);
        newGroup?.lock();

        moveTo(carol.user, 260, 100);
        expect(carol.user.group).toBeUndefined();
    });

    it("only takes the first answer, and only from a member", async () => {
        const { room, group, alice, bob, carol } = await createLockedConversation();
        const dave = await joinRoom(room, "dave", 1000, 1000);
        room.knockOnGroup(carol.user, group.getId());

        // Dave is not in the conversation: he cannot open it.
        room.answerGroupKnock(dave.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });
        expect(carol.user.group).toBeUndefined();

        room.answerGroupKnock(bob.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: false });
        // Too late, Bob already answered.
        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });
        expect(carol.user.group).toBeUndefined();
        expect(messagesOfType(carol.written, "groupKnockAnsweredMessage")).toHaveLength(1);
    });

    it("cannot be used to let in somebody who never knocked", async () => {
        const { room, group, alice, carol, moveTo } = await createLockedConversation();

        room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true });
        moveTo(carol.user, 250, 100);

        expect(carol.user.group).toBeUndefined();
    });

    it("refuses the knocks that make no sense", async () => {
        const { room, group, alice, carol } = await createLockedConversation();

        expect(room.knockOnGroup(alice.user, group.getId()).status).toBe(KnockOnGroupAnswer_Status.ALREADY_MEMBER);
        expect(room.knockOnGroup(carol.user, 987654).status).toBe(KnockOnGroupAnswer_Status.GROUP_NOT_FOUND);

        group.lock(false);
        expect(room.knockOnGroup(carol.user, group.getId()).status).toBe(KnockOnGroupAnswer_Status.NOT_LOCKED);
        expect(messagesOfType(alice.written, "groupKnockReceivedMessage")).toHaveLength(0);
    });

    it("refuses a knock from across the map: one knocks at the door", async () => {
        const { room, group, alice, carol, moveTo } = await createLockedConversation();
        moveTo(carol.user, 900, 100);

        expect(room.knockOnGroup(carol.user, group.getId()).status).toBe(KnockOnGroupAnswer_Status.TOO_FAR);
        expect(messagesOfType(alice.written, "groupKnockReceivedMessage")).toHaveLength(0);
    });

    it("rate-limits the knocks on a conversation", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const { room, group, alice, carol } = await createLockedConversation();

        expect(room.knockOnGroup(carol.user, group.getId()).status).toBe(KnockOnGroupAnswer_Status.SENT);
        const second = room.knockOnGroup(carol.user, group.getId());
        expect(second.status).toBe(KnockOnGroupAnswer_Status.RATE_LIMITED);
        expect(second.retryAfterMs).toBeGreaterThan(14_000);
        expect(messagesOfType(alice.written, "groupKnockReceivedMessage")).toHaveLength(1);

        vi.setSystemTime(Date.now() + 15_000);
        expect(room.knockOnGroup(carol.user, group.getId()).status).toBe(KnockOnGroupAnswer_Status.SENT);
    });

    it("closes the members' prompt when the knocker leaves, and ignores a late answer", async () => {
        const { room, group, alice, bob, carol } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());

        room.leave(carol.user);

        for (const member of [alice, bob]) {
            expect(messagesOfType(member.written, "groupKnockClosedMessage")).toHaveLength(1);
        }
        expect(() =>
            room.answerGroupKnock(alice.user, { groupId: group.getId(), knockerUserId: carol.user.id, accept: true }),
        ).not.toThrow();
    });

    it("closes the members' prompt when the knocker walks in once the conversation is unlocked", async () => {
        const { room, group, alice, carol, moveTo } = await createLockedConversation();
        room.knockOnGroup(carol.user, group.getId());

        group.lock(false);
        moveTo(carol.user, 255, 100);

        expect(carol.user.group).toBe(group);
        expect(messagesOfType(alice.written, "groupKnockClosedMessage")).toHaveLength(1);
    });
});
