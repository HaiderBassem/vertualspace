/**
 * "Who's in": the people WorkAdventure reports as connected right now (POST /api/presence/report, contract
 * PresenceReportData of WorkAdventure) and how the back office shows them. Pure: no database, no Svelte, so the
 * server, the page and the tests share it.
 *
 * Each pusher sends the full list of its connected people; a report replaces the previous one of the same pusher and
 * holds for ttlSeconds only. What is stored per person is the minimum the page needs (see PresenceEntry): the room is
 * kept as AdminSpace ids, never as the raw play URL, and people outside the rooms AdminSpace manages are not stored.
 */

/** How long a report may hold at most, whatever the pusher asks: a pusher that stopped is forgotten within it. */
export const MAX_TTL_SECONDS = 600;
/** Floor of a report's lifetime, so that a misconfigured pusher (ttlSeconds: 1) does not make people flicker. */
export const MIN_TTL_SECONDS = 15;
/** People per report (one pusher); a larger report is refused with 413 rather than shown incomplete. */
export const MAX_REPORT_USERS = 5000;
/** Size of a report's JSON body (about 400 bytes per person at most). */
export const MAX_REPORT_BYTES = 2_500_000;
/** Identifiers longer than an email can be (RFC 5321) are not real people: they are left out. */
export const MAX_IDENTIFIER_LENGTH = 320;
/** Pusher instance ids longer than this are refused (400). */
export const MAX_INSTANCE_ID_LENGTH = 200;
/** How often the "Who's in" page asks for a fresh list. */
export const PRESENCE_REFRESH_MS = 15_000;

/** One person in one room, as stored (jsonb) in presence_reports.users. */
export interface PresenceEntry {
    /** Email for people who signed in, a UUID chosen by the pusher for guests. */
    userIdentifier: string;
    name: string;
    isLogged: boolean;
    /** WorkAdventure's availability status, as sent (upper case), e.g. "BUSY". */
    status: string;
    /** ISO 8601, or null when the pusher sent no valid date. */
    connectedAt: string | null;
    organizationId: string;
    worldId: string;
    roomId: string;
}

/** Statuses the back office tells apart. Unknown WorkAdventure values show as online (contract). */
export const PRESENCE_STATUSES = [
    "online",
    "away",
    "backInAMoment",
    "busy",
    "doNotDisturb",
    "inMeeting",
    "speaking",
    "silent",
    "noProximity",
] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

const STATUS_OF: Record<string, PresenceStatus> = {
    ONLINE: "online",
    AWAY: "away",
    BACK_IN_A_MOMENT: "backInAMoment",
    BUSY: "busy",
    DO_NOT_DISTURB: "doNotDisturb",
    JITSI: "inMeeting",
    BBB: "inMeeting",
    SPEAKER: "speaking",
    SILENT: "silent",
    DENY_PROXIMITY_MEETING: "noProximity",
};

/** WorkAdventure's availability status (any case) to what the page shows; unknown values are "online". */
export function presenceStatus(raw: string | null | undefined): PresenceStatus {
    return STATUS_OF[(raw ?? "").trim().toUpperCase()] ?? "online";
}

/** Colour family of the dot next to a status (the page maps it to its theme tokens). */
export function statusTone(status: PresenceStatus): "success" | "warning" | "danger" | "accent" | "neutral" {
    switch (status) {
        case "online":
            return "success";
        case "away":
        case "backInAMoment":
            return "warning";
        case "busy":
        case "doNotDisturb":
            return "danger";
        case "inMeeting":
        case "speaking":
            return "accent";
        default:
            return "neutral";
    }
}

/** The lifetime granted to a report, from what the pusher asked, clamped to [MIN_TTL_SECONDS, MAX_TTL_SECONDS]. */
export function clampTtl(ttlSeconds: number): number {
    if (!Number.isFinite(ttlSeconds)) return MIN_TTL_SECONDS;
    return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.floor(ttlSeconds)));
}

/**
 * When a report stops holding: counted from when AdminSpace received it (the pusher's clock is not trusted, a skewed
 * reportedAt must neither keep people online forever nor hide them at once).
 */
export function reportExpiry(receivedAt: Date, ttlSeconds: number): Date {
    return new Date(receivedAt.getTime() + clampTtl(ttlSeconds) * 1000);
}

/** A report is shown only while it holds. */
export function isReportFresh(expiresAt: Date | string, now: Date): boolean {
    return new Date(expiresAt).getTime() > now.getTime();
}

/** An ISO 8601 date as sent by the pusher, normalized; null when it is not a date. */
export function isoOrNull(value: string | null | undefined): string | null {
    if (!value) return null;
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** Identifier comparison: emails are case-insensitive, guest UUIDs are lower case anyway. */
export function identifierKey(identifier: string): string {
    return identifier.trim().toLowerCase();
}

/**
 * The same person in the same room reported twice (two pushers during a reconnection, two tabs): shown once, connected
 * since the earliest time, with the status of the latest connection. A person in two rooms stays in both.
 */
export function dedupePresence(entries: readonly PresenceEntry[]): PresenceEntry[] {
    const byKey = new Map<string, PresenceEntry>();
    for (const entry of entries) {
        const key = `${entry.roomId}\u0000${identifierKey(entry.userIdentifier)}`;
        const seen = byKey.get(key);
        if (!seen) {
            byKey.set(key, entry);
            continue;
        }
        const seenTime = seen.connectedAt ? Date.parse(seen.connectedAt) : Infinity;
        const time = entry.connectedAt ? Date.parse(entry.connectedAt) : Infinity;
        const latest = time > seenTime ? entry : seen;
        byKey.set(key, { ...latest, connectedAt: time < seenTime ? entry.connectedAt : seen.connectedAt });
    }
    return [...byKey.values()];
}

/** A person as the page shows them. */
export interface PresencePerson {
    userIdentifier: string;
    name: string;
    isLogged: boolean;
    status: PresenceStatus;
    connectedAt: string | null;
    /** The person's member page in this world, when they are known there. */
    memberId: string | null;
    /** Their back-office account in this organization, when the email matches one. */
    account: { name: string; email: string } | null;
}

export interface PresenceRoomGroup {
    id: string;
    name: string;
    people: PresencePerson[];
}

export interface PresenceWorldGroup {
    id: string;
    slug: string;
    name: string;
    rooms: PresenceRoomGroup[];
    count: number;
}

export interface PresenceCounts {
    total: number;
    signedIn: number;
    guests: number;
}

export interface PresenceView {
    worlds: PresenceWorldGroup[];
    counts: PresenceCounts;
    /** ISO 8601: when the list was read. */
    checkedAt: string;
}

export interface PresenceDirectory {
    worlds: ReadonlyMap<string, { slug: string; name: string }>;
    rooms: ReadonlyMap<string, { worldId: string; name: string; position: number }>;
    /** Member id by world id and identifier key. */
    memberOf: (worldId: string, identifier: string) => string | null;
    /** Account by identifier key (emails only). */
    accountOf: (identifier: string) => { name: string; email: string } | null;
}

const byName = (collator: Intl.Collator) => (a: { name: string }, b: { name: string }) =>
    collator.compare(a.name, b.name);

/**
 * Groups people by world, then room, for the page: worlds and people sorted by name, rooms in the world's order.
 * Entries whose world or room is not in the directory (deleted since the report, or not visible to the viewer) are
 * left out.
 */
export function groupPresence(
    entries: readonly PresenceEntry[],
    directory: PresenceDirectory,
    now: Date,
    locale = "en-US",
): PresenceView {
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    const worlds = new Map<string, PresenceWorldGroup>();
    const rooms = new Map<string, PresenceRoomGroup & { position: number }>();
    const counts: PresenceCounts = { total: 0, signedIn: 0, guests: 0 };

    for (const entry of dedupePresence(entries)) {
        const world = directory.worlds.get(entry.worldId);
        const room = directory.rooms.get(entry.roomId);
        if (!world || !room || room.worldId !== entry.worldId) continue;
        let worldGroup = worlds.get(entry.worldId);
        if (!worldGroup) {
            worldGroup = { id: entry.worldId, slug: world.slug, name: world.name, rooms: [], count: 0 };
            worlds.set(entry.worldId, worldGroup);
        }
        let roomGroup = rooms.get(entry.roomId);
        if (!roomGroup) {
            roomGroup = { id: entry.roomId, name: room.name, position: room.position, people: [] };
            rooms.set(entry.roomId, roomGroup);
            worldGroup.rooms.push(roomGroup);
        }
        roomGroup.people.push({
            userIdentifier: entry.userIdentifier,
            name: entry.name,
            isLogged: entry.isLogged,
            status: presenceStatus(entry.status),
            connectedAt: entry.connectedAt,
            memberId: directory.memberOf(entry.worldId, entry.userIdentifier),
            account: entry.isLogged ? directory.accountOf(entry.userIdentifier) : null,
        });
        worldGroup.count++;
        counts.total++;
        if (entry.isLogged) counts.signedIn++;
        else counts.guests++;
    }

    const sortedWorlds = [...worlds.values()].sort(byName(collator));
    for (const world of sortedWorlds) {
        world.rooms.sort(
            (a, b) =>
                (rooms.get(a.id)?.position ?? 0) - (rooms.get(b.id)?.position ?? 0) || collator.compare(a.name, b.name),
        );
        world.rooms = world.rooms.map((room) => ({
            id: room.id,
            name: room.name,
            people: [...room.people].sort(byName(collator)),
        }));
    }
    return { worlds: sortedWorlds, counts, checkedAt: now.toISOString() };
}
