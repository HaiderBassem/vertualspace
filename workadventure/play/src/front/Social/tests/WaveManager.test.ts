import { afterEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import type { SendWaveAnswer } from "@workadventure/messages";
import { SendWaveAnswer_Status, SpaceUser } from "@workadventure/messages";
import { readable } from "svelte/store";
import type { WaveFeedback, WaveSpace } from "../WaveManager";
import { WaveManager } from "../WaveManager";

type WaveEvent = { $case: "wave"; wave: { waveBack: boolean }; spaceName: string; sender: SpaceUser };

function createWaveManager(options: { answer?: SendWaveAnswer | Error; blocked?: string[] } = {}) {
    const waves = new Subject<WaveEvent>();
    const pictureStore = readable<string | undefined>("data:image/png;base64,AAAA");
    const sendWave = vi.fn((_spaceName: string, _receiverUserUuid: string, _waveBack: boolean) => {
        const answer = options.answer ?? { status: SendWaveAnswer_Status.SENT, retryAfterMs: 0 };
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    });
    const feedback: WaveFeedback = {
        received: vi.fn(),
        sent: vi.fn(),
        rateLimited: vi.fn(),
        receiverGone: vi.fn(),
        failed: vi.fn(),
    };
    const playReceivedSound = vi.fn();
    const space: WaveSpace = {
        getName: () => "allWorldUser",
        observePrivateEvent: () => waves,
        getSpaceUserBySpaceUserId: (spaceUserId) => (spaceUserId === "map2_4" ? { pictureStore } : undefined),
    };
    const manager = new WaveManager({
        space,
        connection: { sendWave },
        feedback,
        playReceivedSound,
        isBlocked: (uuid) => options.blocked?.includes(uuid) ?? false,
    });
    const receiveWave = (sender: Partial<SpaceUser>, waveBack = false) =>
        waves.next({
            $case: "wave",
            wave: { waveBack },
            spaceName: "allWorldUser",
            sender: SpaceUser.fromPartial(sender),
        });
    return { manager, sendWave, feedback, playReceivedSound, receiveWave, waves, pictureStore };
}

const bob = { uuid: "bob", name: "Bob" };

describe("WaveManager", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("waves through the space and confirms it", async () => {
        const { manager, sendWave, feedback } = createWaveManager();

        await manager.wave(bob);

        expect(sendWave).toHaveBeenCalledWith("allWorldUser", "bob", false);
        expect(feedback.sent).toHaveBeenCalledWith(bob);
    });

    it("sends a wave back as such", async () => {
        const { manager, sendWave } = createWaveManager();

        await manager.wave(bob, { waveBack: true });

        expect(sendWave).toHaveBeenCalledWith("allWorldUser", "bob", true);
    });

    it("tells how long to wait when the server rate-limits the wave", async () => {
        const { manager, feedback } = createWaveManager({
            answer: { status: SendWaveAnswer_Status.RATE_LIMITED, retryAfterMs: 6_500 },
        });

        await manager.wave(bob);

        expect(feedback.rateLimited).toHaveBeenCalledWith(bob, 6_500);
        expect(feedback.sent).not.toHaveBeenCalled();
    });

    it("tells when the person is gone", async () => {
        const { manager, feedback } = createWaveManager({
            answer: { status: SendWaveAnswer_Status.RECEIVER_NOT_FOUND, retryAfterMs: 0 },
        });

        await manager.wave(bob);

        expect(feedback.receiverGone).toHaveBeenCalledWith(bob);
    });

    it("reports a failure without rejecting", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { manager, feedback } = createWaveManager({ answer: new Error("Connection lost") });

        await expect(manager.wave(bob)).resolves.toBeUndefined();

        expect(feedback.failed).toHaveBeenCalledWith(bob);
    });

    it("stays silent when the scene closed while the wave was in flight", async () => {
        const { manager, feedback } = createWaveManager({ answer: new Error("aborted") });

        const pending = manager.wave(bob);
        manager.destroy();
        await pending;

        expect(feedback.failed).not.toHaveBeenCalled();
    });

    it("shows a received wave with what is needed to answer it, and plays the sound", () => {
        const { receiveWave, feedback, playReceivedSound, pictureStore } = createWaveManager();

        receiveWave({
            spaceUserId: "map2_4",
            uuid: "alice",
            name: "Alice",
            playUri: "/_/global/maps.example.com/garden.tmj",
            chatID: "@alice:matrix.example.com",
        });

        expect(feedback.received).toHaveBeenCalledWith({
            sender: {
                uuid: "alice",
                name: "Alice",
                playUri: "/_/global/maps.example.com/garden.tmj",
                chatId: "@alice:matrix.example.com",
                pictureStore,
            },
            waveBack: false,
        });
        expect(playReceivedSound).toHaveBeenCalledTimes(1);
    });

    it("passes the wave-back flag and copes with a sender without chat nor picture", () => {
        const { receiveWave, feedback } = createWaveManager();

        receiveWave({ spaceUserId: "map1_3", uuid: "carol", name: "Carol", playUri: "/map1" }, true);

        expect(feedback.received).toHaveBeenCalledWith({
            sender: { uuid: "carol", name: "Carol", playUri: "/map1", chatId: undefined, pictureStore: undefined },
            waveBack: true,
        });
    });

    it("ignores the waves of blocked users", () => {
        const { receiveWave, feedback, playReceivedSound } = createWaveManager({ blocked: ["mallory"] });

        receiveWave({ spaceUserId: "map1_5", uuid: "mallory", name: "Mallory" });

        expect(feedback.received).not.toHaveBeenCalled();
        expect(playReceivedSound).not.toHaveBeenCalled();
    });

    it("stops listening once destroyed", () => {
        const { manager, receiveWave, feedback, waves } = createWaveManager();

        manager.destroy();
        receiveWave({ spaceUserId: "map1_3", uuid: "carol", name: "Carol" });

        expect(feedback.received).not.toHaveBeenCalled();
        expect(waves.observed).toBe(false);
    });
});
