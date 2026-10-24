import { describe, expect, it, vi } from "vitest";
import type { PrivateEvent } from "@workadventure/messages";
import { SendWaveAnswer_Status, SpaceUser } from "@workadventure/messages";
import type { WaveHost } from "../src/Model/WaveManager";
import { WAVE_RATE_LIMIT_POLICY, WaveManager } from "../src/Model/WaveManager";
import { SocialRateLimiter } from "../src/Model/SocialRateLimiter";

function createSpace(...partialUsers: Partial<SpaceUser>[]) {
    const users = partialUsers.map((user) => SpaceUser.fromPartial(user));
    const dispatched: PrivateEvent[] = [];
    const host: WaveHost = {
        name: "world.allWorldUser",
        getAllUsers: () => users,
        dispatchPrivateEvent: vi.fn((event: PrivateEvent) => {
            dispatched.push(event);
        }),
    };
    let now = 1_000_000;
    const manager = new WaveManager(host, new SocialRateLimiter(WAVE_RATE_LIMIT_POLICY, () => now));
    const user = (spaceUserId: string): SpaceUser => {
        const found = users.find((candidate) => candidate.spaceUserId === spaceUserId);
        if (!found) throw new Error(`no user ${spaceUserId}`);
        return found;
    };
    return {
        manager,
        user,
        dispatched,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe("WaveManager", () => {
    it("delivers the wave to every connection of the receiver, with the sender as sender", () => {
        const { manager, user, dispatched } = createSpace(
            { spaceUserId: "map1_1", uuid: "alice", name: "Alice" },
            { spaceUserId: "map1_2", uuid: "bob", name: "Bob" },
            // Bob has a second tab, on another map of the world.
            { spaceUserId: "map2_7", uuid: "bob", name: "Bob" },
            { spaceUserId: "map2_8", uuid: "carol", name: "Carol" },
        );

        const answer = manager.sendWave(user("map1_1"), "bob", false);

        expect(answer).toEqual({ status: SendWaveAnswer_Status.SENT, retryAfterMs: 0 });
        expect(dispatched.map((event) => event.receiverUserId)).toEqual(["map1_2", "map2_7"]);
        for (const event of dispatched) {
            expect(event.senderUserId).toBe("map1_1");
            expect(event.spaceName).toBe("world.allWorldUser");
            expect(event.spaceEvent?.event).toEqual({ $case: "wave", wave: { waveBack: false } });
        }
    });

    it("marks a wave back as such", () => {
        const { manager, user, dispatched } = createSpace(
            { spaceUserId: "a", uuid: "alice" },
            { spaceUserId: "b", uuid: "bob" },
        );

        manager.sendWave(user("b"), "alice", true);

        expect(dispatched[0].spaceEvent?.event).toEqual({ $case: "wave", wave: { waveBack: true } });
    });

    it("allows one wave to the same person every 10 seconds", () => {
        const { manager, user, dispatched, advance } = createSpace(
            { spaceUserId: "a", uuid: "alice" },
            { spaceUserId: "b", uuid: "bob" },
        );

        expect(manager.sendWave(user("a"), "bob", false).status).toBe(SendWaveAnswer_Status.SENT);
        advance(3_000);
        expect(manager.sendWave(user("a"), "bob", false)).toEqual({
            status: SendWaveAnswer_Status.RATE_LIMITED,
            retryAfterMs: 7_000,
        });
        expect(dispatched).toHaveLength(1);

        advance(7_000);
        expect(manager.sendWave(user("a"), "bob", false).status).toBe(SendWaveAnswer_Status.SENT);
        expect(dispatched).toHaveLength(2);
    });

    it("shares the limits between the connections of the sender", () => {
        const { manager, user } = createSpace(
            { spaceUserId: "tab1", uuid: "alice" },
            { spaceUserId: "tab2", uuid: "alice" },
            { spaceUserId: "b", uuid: "bob" },
        );

        expect(manager.sendWave(user("tab1"), "bob", false).status).toBe(SendWaveAnswer_Status.SENT);
        expect(manager.sendWave(user("tab2"), "bob", false).status).toBe(SendWaveAnswer_Status.RATE_LIMITED);
    });

    it("limits the bursts of a sender waving at many people", () => {
        const receivers = ["b", "c", "d", "e", "f", "g"].map((uuid) => ({ spaceUserId: uuid, uuid }));
        const { manager, user } = createSpace({ spaceUserId: "a", uuid: "alice" }, ...receivers);

        const statuses = receivers.map((receiver) => manager.sendWave(user("a"), receiver.uuid, false).status);

        expect(statuses).toEqual([
            SendWaveAnswer_Status.SENT,
            SendWaveAnswer_Status.SENT,
            SendWaveAnswer_Status.SENT,
            SendWaveAnswer_Status.SENT,
            SendWaveAnswer_Status.SENT,
            SendWaveAnswer_Status.RATE_LIMITED,
        ]);
    });

    it("refuses waves to nobody and to oneself, without using the sender's quota", () => {
        const { manager, user, dispatched } = createSpace(
            { spaceUserId: "a", uuid: "alice" },
            { spaceUserId: "a2", uuid: "alice" },
            { spaceUserId: "b", uuid: "bob" },
        );

        expect(manager.sendWave(user("a"), "ghost", false).status).toBe(SendWaveAnswer_Status.RECEIVER_NOT_FOUND);
        expect(manager.sendWave(user("a"), "alice", false).status).toBe(SendWaveAnswer_Status.RECEIVER_NOT_FOUND);
        expect(manager.sendWave(user("a"), "", false).status).toBe(SendWaveAnswer_Status.RECEIVER_NOT_FOUND);
        expect(dispatched).toHaveLength(0);

        expect(manager.sendWave(user("a"), "bob", false).status).toBe(SendWaveAnswer_Status.SENT);
    });
});
