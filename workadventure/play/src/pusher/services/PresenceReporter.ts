import { randomUUID } from "crypto";
import { hostname } from "os";
import type { PresenceReportData, PresenceReportUser } from "@workadventure/messages";

/** What the reporter needs to know of a connected user. */
export interface PresenceSource {
    userUuid: string;
    name: string;
    isLogged: boolean;
    roomId: string;
    availabilityStatus: string;
}

export interface PresenceReporterOptions {
    /** Sends a report; resolves false when the admin does not want reports (anymore). */
    send: (report: PresenceReportData) => Promise<boolean>;
    instanceId?: string;
    ttlSeconds?: number;
    /** How long a change waits for others before the list is sent. */
    debounceMs?: number;
    now?: () => number;
}

export const PRESENCE_TTL_SECONDS = 90;
const PRESENCE_DEBOUNCE_MS = 3_000;

/**
 * Tells the admin who is connected to this pusher (POST /api/presence/report), for its "who is in the office" view.
 *
 * The admin gets the whole list, never a delta: a lost report is repaired by the next one, and a pusher that stops is
 * forgotten when its last list expires (ttlSeconds). The list goes a few seconds after someone joins, leaves or changes
 * their status, and at least every ttlSeconds / 3 so that it never expires while the pusher runs.
 */
export class PresenceReporter {
    private readonly users = new Map<object, PresenceReportUser>();
    private readonly send: PresenceReporterOptions["send"];
    private readonly instanceId: string;
    private readonly ttlSeconds: number;
    private readonly debounceMs: number;
    private readonly now: () => number;
    private enabled = false;
    private stopped = false;
    private debounceTimer: NodeJS.Timeout | undefined;
    private heartbeatTimer: NodeJS.Timeout | undefined;
    private sending: Promise<void> | undefined;
    private dirty = false;
    private lastFailureLogged = false;

    constructor(options: PresenceReporterOptions) {
        this.send = options.send;
        this.instanceId = options.instanceId ?? `${hostname()}-${randomUUID().slice(0, 8)}`;
        this.ttlSeconds = options.ttlSeconds ?? PRESENCE_TTL_SECONDS;
        this.debounceMs = options.debounceMs ?? PRESENCE_DEBOUNCE_MS;
        this.now = options.now ?? Date.now;
    }

    /** Starts reporting, once the admin said it wants reports. Without it, the reporter only keeps its list. */
    enable(): void {
        if (this.enabled || this.stopped) return;
        this.enabled = true;
        this.heartbeatTimer = setInterval(
            () => {
                this.flush().catch(() => {});
            },
            (this.ttlSeconds * 1000) / 3,
        );
        this.schedule();
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    /** A user entered a room (key: their socket, so the same person in two tabs counts twice, like in the room). */
    join(key: object, source: PresenceSource): void {
        this.users.set(key, {
            userIdentifier: source.userUuid,
            name: source.name,
            isLogged: source.isLogged,
            playUri: source.roomId,
            availabilityStatus: source.availabilityStatus,
            connectedAt: new Date(this.now()).toISOString(),
        });
        this.schedule();
    }

    /** A user changed their status (or their name). Statuses that do not change are not reported again. */
    update(key: object, changes: { availabilityStatus?: string; name?: string }): void {
        const user = this.users.get(key);
        if (!user) return;
        const availabilityStatus =
            changes.availabilityStatus && changes.availabilityStatus !== "UNCHANGED"
                ? changes.availabilityStatus
                : user.availabilityStatus;
        const name = changes.name || user.name;
        if (availabilityStatus === user.availabilityStatus && name === user.name) return;
        this.users.set(key, { ...user, availabilityStatus, name });
        this.schedule();
    }

    leave(key: object): void {
        if (this.users.delete(key)) this.schedule();
    }

    /** The list as it would be sent now. */
    report(): PresenceReportData {
        return {
            instanceId: this.instanceId,
            reportedAt: new Date(this.now()).toISOString(),
            ttlSeconds: this.ttlSeconds,
            users: Array.from(this.users.values()),
        };
    }

    /** Sends the list now (at most one report on the way at a time; changes meanwhile go in the next one). */
    flush(): Promise<void> {
        if (!this.enabled) return Promise.resolve();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
        if (this.sending) {
            this.dirty = true;
            return this.sending;
        }
        this.dirty = false;
        this.sending = this.send(this.report())
            .then((wanted) => {
                this.lastFailureLogged = false;
                if (!wanted) this.disable();
            })
            .catch((error: unknown) => {
                // The admin is down or refuses the report: say it once, the next report retries.
                if (!this.lastFailureLogged) {
                    console.warn("[PresenceReporter] Could not report who is connected to the admin:", error);
                    this.lastFailureLogged = true;
                }
            })
            .finally(() => {
                this.sending = undefined;
                if (this.dirty) this.schedule();
            });
        return this.sending;
    }

    /** On shutdown: tells the admin that nobody is connected here anymore, rather than letting the list expire. */
    async drain(): Promise<void> {
        if (!this.enabled) return;
        this.users.clear();
        await this.sending;
        await this.flush();
    }

    stop(): void {
        this.stopped = true;
        this.disable();
    }

    private disable(): void {
        this.enabled = false;
        clearTimeout(this.debounceTimer);
        clearInterval(this.heartbeatTimer);
        this.debounceTimer = undefined;
        this.heartbeatTimer = undefined;
    }

    private schedule(): void {
        if (!this.enabled || this.debounceTimer) return;
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = undefined;
            this.flush().catch(() => {});
        }, this.debounceMs);
    }
}
