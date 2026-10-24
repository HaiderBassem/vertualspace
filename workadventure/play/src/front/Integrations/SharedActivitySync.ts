import type { PresenceActivityAnswer } from "@workadventure/messages";

/**
 * What a user chose to share of their activity in the admin back office (AdminSpace: "share what I listen to" with
 * Spotify, "share my coding activity" with GitHub or GitLab), shown to the others when they click on them. The admin
 * reads the providers: tokens never reach the browser. It travels as a public player variable of the world.
 */
export const ACTIVITY_VARIABLE = "wa:activity";

/** How often the shared activity is read again. */
export const ACTIVITY_REFRESH_MS = 60 * 1000;

const MAX_TEXT_LENGTH = 120;

export interface SharedActivity {
    music?: { title: string; artist: string };
    coding?: { provider: string; repo: string };
}

function text(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value.slice(0, MAX_TEXT_LENGTH) : undefined;
}

/** The activity of an answer, or undefined when the user shares nothing right now. */
export function toSharedActivity(answer: PresenceActivityAnswer): SharedActivity | undefined {
    const activity: SharedActivity = {};
    const title = text(answer.musicTitle);
    if (title) activity.music = { title, artist: text(answer.musicArtist) ?? "" };
    const repo = text(answer.codingRepo);
    if (repo) activity.coding = { provider: text(answer.codingProvider) ?? "", repo };
    return activity.music || activity.coding ? activity : undefined;
}

/** An activity read from the variable of another user: anything else is ignored. */
export function parseSharedActivity(value: unknown): SharedActivity | undefined {
    if (typeof value !== "object" || value === null) return undefined;
    const { music, coding } = value as { music?: unknown; coding?: unknown };
    const activity: SharedActivity = {};
    if (typeof music === "object" && music !== null) {
        const title = text((music as { title?: unknown }).title);
        if (title) activity.music = { title, artist: text((music as { artist?: unknown }).artist) ?? "" };
    }
    if (typeof coding === "object" && coding !== null) {
        const repo = text((coding as { repo?: unknown }).repo);
        if (repo) activity.coding = { provider: text((coding as { provider?: unknown }).provider) ?? "", repo };
    }
    return activity.music || activity.coding ? activity : undefined;
}

export interface SharedActivitySyncHost {
    query(): Promise<PresenceActivityAnswer>;
    /** Shares the activity with the others (undefined: nothing to share anymore). */
    publish(activity: SharedActivity | undefined): void;
}

/**
 * Reads the shared activity every minute and shares it when it changed. Stops for good when the admin offers no shared
 * activity (or the user is a guest: the pusher answers "not supported" for them).
 */
export class SharedActivitySync {
    private timer: ReturnType<typeof setInterval> | undefined;
    private published: string | undefined;
    private stopped = false;

    constructor(private readonly host: SharedActivitySyncHost) {}

    public start(): void {
        this.refresh().catch(() => {});
        this.timer = setInterval(() => {
            this.refresh().catch(() => {});
        }, ACTIVITY_REFRESH_MS);
    }

    public stop(): void {
        this.stopped = true;
        clearInterval(this.timer);
        this.timer = undefined;
    }

    public async refresh(): Promise<void> {
        let answer: PresenceActivityAnswer;
        try {
            answer = await this.host.query();
        } catch {
            // The connection is closing, or the pusher is busy: the next reading will do.
            return;
        }
        if (this.stopped) return;
        if (!answer.supported) {
            this.stop();
            return;
        }
        const activity = toSharedActivity(answer);
        const key = activity ? JSON.stringify(activity) : "";
        // Nothing shared yet and nothing to share: no need to tell anyone.
        if (key === (this.published ?? "")) return;
        this.published = key;
        this.host.publish(activity);
    }
}
