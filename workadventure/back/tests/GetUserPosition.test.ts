import { describe, expect, it, vi } from "vitest";
import { JoinRoomMessage, PositionMessage_Direction } from "@workadventure/messages";
import { GameRoom } from "../src/Model/GameRoom";
import type { UserSocket } from "../src/Model/User";
import type { EmoteCallback } from "../src/Model/Zone";
import { SocketManager } from "../src/Services/SocketManager";

const ROOM_URL = "https://play.workadventu.re/_/global/localhost/test.json";

function createMockUserSocket(): UserSocket {
    // The room only writes to the socket in these tests: a partial mock of the gRPC stream is enough.
    return { write: vi.fn().mockReturnValue(true), end: vi.fn() } as unknown as UserSocket;
}

function joinMessage(uuid: string, x: number, y: number): JoinRoomMessage {
    return JoinRoomMessage.fromPartial({
        userUuid: uuid,
        IPAddress: "10.0.0.2",
        name: uuid,
        positionMessage: { x, y, direction: PositionMessage_Direction.LEFT, moving: false },
    });
}

const emote: EmoteCallback = () => {};

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

describe("SocketManager.getUserPosition", () => {
    it("tells where a user of the room stands", async () => {
        const room = await createRoom();
        const bob = await room.join(createMockUserSocket(), joinMessage("bob", 320, 480));

        expect(SocketManager.getUserPosition(room, { userUuid: "bob" })).toEqual({
            position: { x: 320, y: 480, direction: PositionMessage_Direction.LEFT, moving: false },
            userId: bob.id,
        });
    });

    it("prefers the connection asked for when the user is connected several times", async () => {
        const room = await createRoom();
        await room.join(createMockUserSocket(), joinMessage("bob", 100, 100));
        const secondTab = await room.join(createMockUserSocket(), joinMessage("bob", 900, 900));

        const answer = SocketManager.getUserPosition(room, { userUuid: "bob", userId: secondTab.id });

        expect(answer.userId).toBe(secondTab.id);
        expect(answer.position?.x).toBe(900);
    });

    it("ignores a connection id that belongs to somebody else", async () => {
        const room = await createRoom();
        const bob = await room.join(createMockUserSocket(), joinMessage("bob", 100, 100));
        const carol = await room.join(createMockUserSocket(), joinMessage("carol", 900, 900));

        const answer = SocketManager.getUserPosition(room, { userUuid: "bob", userId: carol.id });

        expect(answer.userId).toBe(bob.id);
        expect(answer.position?.x).toBe(100);
    });

    it("answers without a position when the user is not in the room", async () => {
        const room = await createRoom();

        expect(SocketManager.getUserPosition(room, { userUuid: "ghost" })).toEqual({});
    });
});
