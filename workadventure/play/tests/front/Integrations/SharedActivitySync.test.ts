import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresenceActivityAnswer } from "@workadventure/messages";
import {
    ACTIVITY_REFRESH_MS,
    parseSharedActivity,
    SharedActivitySync,
    toSharedActivity,
    type SharedActivity,
} from "../../../src/front/Integrations/SharedActivitySync";

const answer = (overrides: Partial<PresenceActivityAnswer> = {}): PresenceActivityAnswer => ({
    supported: true,
    musicTitle: "",
    musicArtist: "",
    codingProvider: "",
    codingRepo: "",
    ...overrides,
});

describe("toSharedActivity", () => {
    it("keeps what the user shares, and nothing when they share nothing", () => {
        expect(toSharedActivity(answer({ musicTitle: "So What", musicArtist: "Miles Davis" }))).toEqual({
            music: { title: "So What", artist: "Miles Davis" },
        });
        expect(toSharedActivity(answer({ codingProvider: "github", codingRepo: "acme/api" }))).toEqual({
            coding: { provider: "github", repo: "acme/api" },
        });
        expect(toSharedActivity(answer())).toBeUndefined();
    });
});

describe("parseSharedActivity", () => {
    it("reads the activity of another user, and ignores anything else", () => {
        expect(parseSharedActivity({ music: { title: "So What", artist: "Miles Davis" } })).toEqual({
            music: { title: "So What", artist: "Miles Davis" },
        });
        expect(parseSharedActivity({ coding: { repo: "acme/api" } })).toEqual({
            coding: { provider: "", repo: "acme/api" },
        });
        expect(parseSharedActivity(null)).toBeUndefined();
        expect(parseSharedActivity("music")).toBeUndefined();
        expect(parseSharedActivity({ music: { title: 42 } })).toBeUndefined();
        expect(parseSharedActivity({ music: { title: "x".repeat(500) } })?.music?.title).toHaveLength(120);
    });
});

describe("SharedActivitySync", () => {
    let query: ReturnType<typeof vi.fn<() => Promise<PresenceActivityAnswer>>>;
    let published: (SharedActivity | undefined)[];
    let sync: SharedActivitySync;

    beforeEach(() => {
        vi.useFakeTimers();
        query = vi.fn(() => Promise.resolve(answer()));
        published = [];
        sync = new SharedActivitySync({ query, publish: (activity) => published.push(activity) });
    });

    afterEach(() => {
        sync.stop();
        vi.useRealTimers();
    });

    it("shares the activity when it changes, every minute, and stops sharing it when it is over", async () => {
        query.mockResolvedValueOnce(answer({ musicTitle: "So What", musicArtist: "Miles Davis" }));
        sync.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(published).toEqual([{ music: { title: "So What", artist: "Miles Davis" } }]);

        query.mockResolvedValueOnce(answer({ musicTitle: "So What", musicArtist: "Miles Davis" }));
        await vi.advanceTimersByTimeAsync(ACTIVITY_REFRESH_MS);
        expect(published).toHaveLength(1);

        await vi.advanceTimersByTimeAsync(ACTIVITY_REFRESH_MS);
        expect(published).toEqual([{ music: { title: "So What", artist: "Miles Davis" } }, undefined]);
    });

    it("shares nothing while there is nothing to share", async () => {
        sync.start();
        await vi.advanceTimersByTimeAsync(ACTIVITY_REFRESH_MS * 2);
        expect(published).toEqual([]);
    });

    it("stops for good when the admin offers no shared activity", async () => {
        query.mockResolvedValue(answer({ supported: false }));
        sync.start();
        await vi.advanceTimersByTimeAsync(ACTIVITY_REFRESH_MS * 3);
        expect(query).toHaveBeenCalledOnce();
    });

    it("tries again later when a reading fails", async () => {
        query.mockRejectedValueOnce(new Error("closing"));
        query.mockResolvedValueOnce(answer({ codingProvider: "gitlab", codingRepo: "acme/web" }));
        sync.start();
        await vi.advanceTimersByTimeAsync(ACTIVITY_REFRESH_MS);
        expect(published).toEqual([{ coding: { provider: "gitlab", repo: "acme/web" } }]);
    });
});
