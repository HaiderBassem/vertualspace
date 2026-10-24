import { Subject } from "rxjs";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import type { AvailabilityFeedback, WatchedSpaceUser } from "../AvailabilityWatcher";
import { AvailabilityWatcher, isFreeStatus } from "../AvailabilityWatcher";

const ROOM = "https://play.example.com/@/acme/hq/floor-2";

function user(status: AvailabilityStatus, overrides: Partial<WatchedSpaceUser> = {}): WatchedSpaceUser {
    return { uuid: "bob", name: "Bob", playUri: ROOM, chatID: "@bob:matrix", availabilityStatus: status, ...overrides };
}

describe("AvailabilityWatcher", () => {
    let joined: Subject<WatchedSpaceUser>;
    let updated: Subject<{ newUser: WatchedSpaceUser; changes: { availabilityStatus?: unknown } }>;
    let present: Map<string, WatchedSpaceUser>;
    let feedback: { [K in keyof AvailabilityFeedback]: ReturnType<typeof vi.fn<AvailabilityFeedback[K]>> };
    let now: number;
    let watcher: AvailabilityWatcher;

    const statusChanged = (next: WatchedSpaceUser) => {
        present.set(next.uuid, next);
        updated.next({ newUser: next, changes: { availabilityStatus: next.availabilityStatus } });
    };

    beforeEach(() => {
        joined = new Subject();
        updated = new Subject();
        present = new Map([["bob", user(AvailabilityStatus.BUSY)]]);
        feedback = { free: vi.fn(), watching: vi.fn(), alreadyFree: vi.fn() };
        now = Date.parse("2026-10-24T10:00:00Z");
        watcher = new AvailabilityWatcher({
            space: {
                observeUserJoined: joined,
                observeUserUpdated: updated,
                getSpaceUserByUuid: (uuid) => present.get(uuid),
            },
            feedback,
            now: () => now,
        });
    });

    afterEach(() => watcher.destroy());

    it("tells once when somebody busy becomes free, wherever they are in the world", () => {
        watcher.watch({ uuid: "bob", name: "Bob" });
        expect(feedback.watching).toHaveBeenCalledWith({ uuid: "bob", name: "Bob" });
        expect(get(watcher.watchedStore)).toEqual(new Set(["bob"]));

        statusChanged(user(AvailabilityStatus.JITSI));
        expect(feedback.free).not.toHaveBeenCalled();

        statusChanged(user(AvailabilityStatus.ONLINE, { playUri: `${ROOM}-b` }));
        expect(feedback.free).toHaveBeenCalledOnce();
        expect(feedback.free).toHaveBeenCalledWith({
            uuid: "bob",
            name: "Bob",
            playUri: `${ROOM}-b`,
            chatId: "@bob:matrix",
            pictureStore: undefined,
        });
        expect(watcher.isWatching("bob")).toBe(false);

        statusChanged(user(AvailabilityStatus.BUSY));
        statusChanged(user(AvailabilityStatus.ONLINE));
        expect(feedback.free).toHaveBeenCalledOnce();
    });

    it("does not wait for somebody who is free already", () => {
        present.set("bob", user(AvailabilityStatus.ONLINE));
        watcher.watch({ uuid: "bob", name: "Bob" });
        expect(feedback.alreadyFree).toHaveBeenCalledWith({ uuid: "bob", name: "Bob" });
        expect(watcher.isWatching("bob")).toBe(false);
    });

    it("waits for somebody who left, and tells when they come back free", () => {
        present.clear();
        watcher.watch({ uuid: "bob", name: "Bob" });
        joined.next(user(AvailabilityStatus.AWAY));
        expect(feedback.free).not.toHaveBeenCalled();
        joined.next(user(AvailabilityStatus.ONLINE, { chatID: undefined }));
        expect(feedback.free).toHaveBeenCalledWith(expect.objectContaining({ uuid: "bob", chatId: undefined }));
    });

    it("ignores other people and other changes", () => {
        watcher.watch({ uuid: "bob", name: "Bob" });
        statusChanged(user(AvailabilityStatus.ONLINE, { uuid: "carol", name: "Carol" }));
        updated.next({ newUser: user(AvailabilityStatus.ONLINE), changes: {} });
        expect(feedback.free).not.toHaveBeenCalled();
    });

    it("stops waiting when asked, and forgets a wait after a working day", () => {
        watcher.watch({ uuid: "bob", name: "Bob" });
        watcher.unwatch("bob");
        statusChanged(user(AvailabilityStatus.ONLINE));
        expect(feedback.free).not.toHaveBeenCalled();

        present.set("bob", user(AvailabilityStatus.BUSY));
        watcher.watch({ uuid: "bob", name: "Bob" });
        now += 8 * 3_600_000 + 1;
        statusChanged(user(AvailabilityStatus.ONLINE));
        expect(feedback.free).not.toHaveBeenCalled();
        expect(get(watcher.watchedStore)).toEqual(new Set());
    });

    it("stops listening once destroyed", () => {
        watcher.watch({ uuid: "bob", name: "Bob" });
        watcher.destroy();
        statusChanged(user(AvailabilityStatus.ONLINE));
        expect(feedback.free).not.toHaveBeenCalled();
    });
});

describe("isFreeStatus", () => {
    it("is free online, and not away, busy, in a meeting, on stage or in a silent zone", () => {
        expect(isFreeStatus(AvailabilityStatus.ONLINE)).toBe(true);
        expect(isFreeStatus(AvailabilityStatus.SOUND_BLOCKED)).toBe(true);
        for (const status of [
            AvailabilityStatus.SILENT,
            AvailabilityStatus.AWAY,
            AvailabilityStatus.BUSY,
            AvailabilityStatus.DO_NOT_DISTURB,
            AvailabilityStatus.BACK_IN_A_MOMENT,
            AvailabilityStatus.JITSI,
            AvailabilityStatus.BBB,
            AvailabilityStatus.LIVEKIT,
            AvailabilityStatus.SPEAKER,
            AvailabilityStatus.LISTENER,
            AvailabilityStatus.DENY_PROXIMITY_MEETING,
            AvailabilityStatus.UNCHANGED,
        ]) {
            expect(isFreeStatus(status)).toBe(false);
        }
    });
});
