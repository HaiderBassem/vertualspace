import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { focusSessionStore } from "../../../src/front/Stores/PresenceStores";
import type { CustomStatus } from "../../../src/front/Utils/CustomStatus";
import { endFocusSession, startFocusSession } from "../../../src/front/Utils/FocusSession";

function sink(initial?: CustomStatus) {
    let shown = initial;
    return {
        current: () => shown,
        set: (status: CustomStatus | undefined) => {
            shown = status;
        },
    };
}

describe("focus sessions", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        endFocusSession(sink());
        vi.useRealTimers();
    });

    it("start: do not disturb until the end, and '🎧 Focusing' for the others", () => {
        const status = sink();
        startFocusSession(25, status, "Focusing", Date.now());
        const session = get(focusSessionStore);
        expect(session?.until).toBe(Date.now() + 25 * 60_000);
        expect(status.current()).toEqual({ emoji: "🎧", text: "Focusing", expiresAt: session?.until });
    });

    it("ends by itself, and takes away the status it showed", () => {
        const status = sink();
        startFocusSession(25, status, "Focusing", Date.now());
        vi.advanceTimersByTime(25 * 60_000);
        expect(get(focusSessionStore)).toBeUndefined();
        expect(status.current()).toBeUndefined();
    });

    it("keeps a status the user set themselves", () => {
        const own = { emoji: "🌴", text: "On vacation" };
        const status = sink(own);
        startFocusSession(50, status, "Focusing", Date.now());
        expect(status.current()).toBe(own);
        endFocusSession(status);
        expect(status.current()).toBe(own);
        expect(get(focusSessionStore)).toBeUndefined();
    });

    it("replaces the focus status an earlier session left, and clears it at the end", () => {
        const leftover = { emoji: "🎧", text: "Focusing", expiresAt: Date.now() + 5 * 60_000 };
        const status = sink(leftover);
        startFocusSession(25, status, "Focusing", Date.now());
        expect(status.current()?.expiresAt).toBe(Date.now() + 25 * 60_000);
        endFocusSession(status);
        expect(status.current()).toBeUndefined();
    });

    it("replaces the session going on", () => {
        const status = sink();
        startFocusSession(25, status, "Focusing", Date.now());
        startFocusSession(90, status, "Focusing", Date.now());
        expect(get(focusSessionStore)?.until).toBe(Date.now() + 90 * 60_000);
        vi.advanceTimersByTime(25 * 60_000);
        expect(get(focusSessionStore)).toBeDefined();
    });
});
