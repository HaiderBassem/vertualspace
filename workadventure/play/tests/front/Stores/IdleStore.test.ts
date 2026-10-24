import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Writable } from "svelte/store";
import { get } from "svelte/store";

const mocks = vi.hoisted(() => ({ savedMinutes: [] as number[] }));
const media = vi.hoisted(() => ({
    peers: undefined as Writable<unknown[]> | undefined,
    streaming: undefined as Writable<boolean> | undefined,
}));

vi.mock("../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: {
        getAwayAfterIdleMinutes: () => 10,
        setAwayAfterIdleMinutes: (minutes: number) => mocks.savedMinutes.push(minutes),
    },
}));
vi.mock("../../../src/front/Stores/PeerStore", async () => {
    const { writable } = await import("svelte/store");
    media.peers = writable<unknown[]>([]);
    return { videoStreamElementsStore: media.peers };
});
vi.mock("../../../src/front/Stores/IsStreamingStore", async () => {
    const { writable } = await import("svelte/store");
    media.streaming = writable(false);
    return { isLiveStreamingStore: media.streaming };
});

const { awayAfterIdleMinutesStore, awayBecauseIdleStore, userIdleStore } =
    await import("../../../src/front/Stores/IdleStore");

describe("IdleStore", () => {
    let unsubscribe: () => void = () => {};

    beforeEach(() => {
        vi.useFakeTimers();
        awayAfterIdleMinutesStore.set(10);
        unsubscribe = awayBecauseIdleStore.subscribe(() => {});
    });

    afterEach(() => {
        unsubscribe();
        media.peers?.set([]);
        media.streaming?.set(false);
        vi.useRealTimers();
    });

    it("becomes idle after the chosen delay without input, and active again on the next input", () => {
        vi.advanceTimersByTime(9 * 60_000);
        expect(get(userIdleStore)).toBe(false);

        vi.advanceTimersByTime(60_000 + 15_000);
        expect(get(userIdleStore)).toBe(true);
        expect(get(awayBecauseIdleStore)).toBe(true);

        window.dispatchEvent(new Event("keydown"));
        expect(get(userIdleStore)).toBe(false);
    });

    it("restarts the delay on every input", () => {
        vi.advanceTimersByTime(8 * 60_000);
        window.dispatchEvent(new Event("pointermove"));
        vi.advanceTimersByTime(8 * 60_000);

        expect(get(userIdleStore)).toBe(false);
    });

    it("is never away during a conversation or a stream", () => {
        vi.advanceTimersByTime(11 * 60_000);
        expect(get(awayBecauseIdleStore)).toBe(true);

        media.peers?.set([{}]);
        expect(get(awayBecauseIdleStore)).toBe(false);

        media.peers?.set([]);
        media.streaming?.set(true);
        expect(get(awayBecauseIdleStore)).toBe(false);
    });

    it("never becomes idle when the delay is 0, and remembers the choice", () => {
        awayAfterIdleMinutesStore.set(0);
        vi.advanceTimersByTime(60 * 60_000);

        expect(get(userIdleStore)).toBe(false);
        expect(mocks.savedMinutes.at(-1)).toBe(0);
    });
});
