import type { Observable, Subscription } from "rxjs";
import type { Readable } from "svelte/store";
import { writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";

/**
 * Statuses of someone who can be talked to: not away, busy, in a meeting, on stage, or in a silent zone (where nobody can
 * talk to them).
 */
const FREE_STATUSES: ReadonlySet<number> = new Set([
    AvailabilityStatus.ONLINE,
    // Imposed by the browser until the next click: the person is there.
    AvailabilityStatus.SOUND_BLOCKED,
]);

export function isFreeStatus(status: AvailabilityStatus | number): boolean {
    return FREE_STATUSES.has(status);
}

/** What the watcher needs to know of a user of the space. */
export interface WatchedSpaceUser {
    uuid: string;
    name: string;
    playUri: string;
    chatID: string | undefined;
    availabilityStatus: number;
    pictureStore?: Readable<string | undefined>;
}

/** What the watcher uses of a space (the world space, so that people are followed on every map of the world). */
export interface AvailabilityWatchSpace {
    readonly observeUserJoined: Observable<WatchedSpaceUser>;
    readonly observeUserUpdated: Observable<{ newUser: WatchedSpaceUser; changes: { availabilityStatus?: unknown } }>;
    getSpaceUserByUuid(uuid: string): WatchedSpaceUser | undefined;
}

/** Somebody the user waited for, now free. */
export interface NowFreeUser {
    uuid: string;
    name: string;
    playUri: string;
    /** Their Matrix id, to send them a message. Undefined when they have no chat account. */
    chatId: string | undefined;
    pictureStore: Readable<string | undefined> | undefined;
}

/** How the watcher tells the user what happened. */
export interface AvailabilityFeedback {
    /** Somebody the user waited for is free. */
    free: (user: NowFreeUser) => void;
    /** The user will be told. */
    watching: (target: { uuid: string; name: string }) => void;
    /** No need to wait: the person is free already. */
    alreadyFree: (target: { uuid: string; name: string }) => void;
}

export interface AvailabilityWatcherOptions {
    space: AvailabilityWatchSpace;
    feedback: AvailabilityFeedback;
    now?: () => number;
    /** A wait not answered within this time is forgotten (default: 8 hours, a working day). */
    maxWaitMs?: number;
}

const DEFAULT_MAX_WAIT_MS = 8 * 3_600_000;

/**
 * "Tell me when they are free": the user picks somebody who is busy, away or in a meeting, and is told once that person
 * becomes free again, on whatever map of the world they are. Each wait is answered once, then forgotten.
 */
export class AvailabilityWatcher {
    private readonly waits = new Map<string, { name: string; since: number }>();
    private readonly _watchedStore = writable<ReadonlySet<string>>(new Set());
    private readonly subscriptions: Subscription[];
    private readonly now: () => number;
    private readonly maxWaitMs: number;

    /** The uuids of the people the user waits for. */
    public readonly watchedStore: Readable<ReadonlySet<string>> = { subscribe: this._watchedStore.subscribe };

    constructor(private readonly options: AvailabilityWatcherOptions) {
        this.now = options.now ?? Date.now;
        this.maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
        this.subscriptions = [
            options.space.observeUserJoined.subscribe((user) => this.check(user)),
            options.space.observeUserUpdated.subscribe(({ newUser, changes }) => {
                if (changes.availabilityStatus !== undefined) this.check(newUser);
            }),
        ];
    }

    /** Waits for somebody to be free, unless they already are. */
    public watch(target: { uuid: string; name: string }): void {
        const current = this.options.space.getSpaceUserByUuid(target.uuid);
        if (current && isFreeStatus(current.availabilityStatus)) {
            this.options.feedback.alreadyFree(target);
            return;
        }
        this.waits.set(target.uuid, { name: target.name, since: this.now() });
        this.publish();
        this.options.feedback.watching(target);
    }

    public unwatch(uuid: string): void {
        if (this.waits.delete(uuid)) this.publish();
    }

    public isWatching(uuid: string): boolean {
        this.forgetOldWaits();
        return this.waits.has(uuid);
    }

    public destroy(): void {
        for (const subscription of this.subscriptions) subscription.unsubscribe();
        this.waits.clear();
        this.publish();
    }

    private check(user: WatchedSpaceUser): void {
        this.forgetOldWaits();
        const wait = this.waits.get(user.uuid);
        if (!wait || !isFreeStatus(user.availabilityStatus)) return;
        this.waits.delete(user.uuid);
        this.publish();
        this.options.feedback.free({
            uuid: user.uuid,
            name: user.name || wait.name,
            playUri: user.playUri,
            chatId: user.chatID || undefined,
            pictureStore: user.pictureStore,
        });
    }

    private forgetOldWaits(): void {
        const now = this.now();
        let changed = false;
        for (const [uuid, wait] of this.waits) {
            if (now - wait.since > this.maxWaitMs) {
                this.waits.delete(uuid);
                changed = true;
            }
        }
        if (changed) this.publish();
    }

    private publish(): void {
        this._watchedStore.set(new Set(this.waits.keys()));
    }
}
