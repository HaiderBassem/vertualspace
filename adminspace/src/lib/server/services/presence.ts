/**
 * "Who's in" (docs/PRESENCE.md): the live list of people connected to the organization's worlds, as WorkAdventure's
 * pushers report it (POST /api/presence/report, src/lib/server/adminApi/handlers/presence.ts).
 *
 * Storage (presence_reports): one row per pusher, replaced by each of its reports in a single upsert and valid until
 * received time + ttlSeconds. Every AdminSpace instance writes and reads the same rows, so the page is right whichever
 * instance a pusher or a viewer reaches. Stale rows are never read and are deleted opportunistically (here, at most
 * once a minute per process, and by the hourly retention). Nothing historical is kept.
 *
 * Privacy: people are stored only when their play URL designates a room this AdminSpace manages, by ids (organization,
 * world, room) rather than the raw URL; the page shows them only to people holding presence.view on the world's
 * workspace, and only within their own organization.
 */
import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { PresenceReportData } from "../../contract/workadventure";
import {
    MAX_INSTANCE_ID_LENGTH,
    MAX_IDENTIFIER_LENGTH,
    groupPresence,
    identifierKey,
    isoOrNull,
    reportExpiry,
    type PresenceEntry,
    type PresenceView,
} from "../../presence/model";
import type { OrganizationAccess } from "../auth/rbac";
import { db, schema } from "../db/client";
import { findEntryRoom, listOrganizationWorlds, listRooms, resolvePlayUri } from "./worlds";

// ---------------------------------------------------------------------------------------------
// Play URL to room
// ---------------------------------------------------------------------------------------------

export interface PresenceRoom {
    organizationId: string;
    worldId: string;
    roomId: string;
}

const ROOM_CACHE_MS = 60_000;
const ROOM_CACHE_MAX = 5000;
const roomCache = new Map<string, { room: PresenceRoom | null; until: number }>();

/** Forgets resolved play URLs (tests, or after rooms were renamed). */
export function clearPresenceRoomCache(): void {
    roomCache.clear();
}

/**
 * The AdminSpace room a play URL designates, with the resolver every Admin API endpoint uses (resolvePlayUri). A URL
 * naming the world only is the world's entry room, as for /api/map. Undefined for URLs outside AdminSpace's worlds
 * (/~/ and /_/ maps, unknown worlds or rooms). Cached for a minute: pushers report the same rooms every few seconds.
 */
export async function resolvePresenceRoom(playUri: string, now = Date.now()): Promise<PresenceRoom | undefined> {
    const cached = roomCache.get(playUri);
    if (cached && cached.until > now) return cached.room ?? undefined;
    const resolved = await resolvePlayUri(playUri);
    let room: PresenceRoom | null = null;
    if (resolved.kind === "room") {
        room = {
            organizationId: resolved.context.organization.id,
            worldId: resolved.context.world.id,
            roomId: resolved.room.id,
        };
    } else if (resolved.kind === "worldWithoutRoom") {
        const entry = await findEntryRoom(resolved.context.world.id);
        if (entry) {
            room = {
                organizationId: resolved.context.organization.id,
                worldId: resolved.context.world.id,
                roomId: entry.id,
            };
        }
    }
    if (roomCache.size >= ROOM_CACHE_MAX) roomCache.clear();
    roomCache.set(playUri, { room, until: now + ROOM_CACHE_MS });
    return room ?? undefined;
}

// ---------------------------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------------------------

const PURGE_EVERY_MS = 60_000;
let lastPurge = 0;

/** Deletes the reports that stopped holding. Returns how many. */
export async function purgeStalePresence(now = new Date()): Promise<number> {
    const rows = await db()
        .delete(schema.presenceReports)
        .where(lte(schema.presenceReports.expiresAt, now))
        .returning({ instanceId: schema.presenceReports.instanceId });
    lastPurge = now.getTime();
    return rows.length;
}

export interface StoreResult {
    /** False when the report was older than the one already stored for this pusher (it is then ignored). */
    applied: boolean;
    /** People stored (in rooms this AdminSpace manages). */
    stored: number;
    /** People left out: outside AdminSpace's rooms, or with an identifier or URL too long to be real. */
    skipped: number;
}

const MAX_PLAY_URI_LENGTH = 2048;

/**
 * Stores a pusher's report in place of its previous one. The report must already be valid for the contract
 * (isPresenceReportData) and within MAX_REPORT_USERS; `reportedAt` must be a date.
 */
export async function storePresenceReport(report: PresenceReportData, now = new Date()): Promise<StoreResult> {
    const reportedAt = new Date(report.reportedAt);
    if (Number.isNaN(reportedAt.getTime()) || report.instanceId.length > MAX_INSTANCE_ID_LENGTH) {
        throw new Error("Invalid presence report");
    }
    const entries: PresenceEntry[] = [];
    let skipped = 0;
    const rooms = new Map<string, PresenceRoom | undefined>();
    for (const user of report.users) {
        if (
            !user.userIdentifier ||
            user.userIdentifier.length > MAX_IDENTIFIER_LENGTH ||
            user.playUri.length > MAX_PLAY_URI_LENGTH
        ) {
            skipped++;
            continue;
        }
        if (!rooms.has(user.playUri)) rooms.set(user.playUri, await resolvePresenceRoom(user.playUri, now.getTime()));
        const room = rooms.get(user.playUri);
        if (!room) {
            skipped++;
            continue;
        }
        entries.push({
            userIdentifier: user.userIdentifier,
            name: user.name.slice(0, 200),
            isLogged: user.isLogged,
            status: user.availabilityStatus.slice(0, 64).toUpperCase(),
            connectedAt: isoOrNull(user.connectedAt),
            ...room,
        });
    }

    const values = {
        instanceId: report.instanceId,
        reportedAt,
        receivedAt: now,
        expiresAt: reportExpiry(now, report.ttlSeconds),
        users: entries,
    };
    // Reports of one pusher may arrive out of order: an older one never replaces a newer one, unless that one expired.
    const written = await db()
        .insert(schema.presenceReports)
        .values(values)
        .onConflictDoUpdate({
            target: schema.presenceReports.instanceId,
            set: {
                reportedAt: values.reportedAt,
                receivedAt: values.receivedAt,
                expiresAt: values.expiresAt,
                users: values.users,
            },
            setWhere: or(
                lte(schema.presenceReports.reportedAt, values.reportedAt),
                lte(schema.presenceReports.expiresAt, now),
            ),
        })
        .returning({ instanceId: schema.presenceReports.instanceId });

    if (now.getTime() - lastPurge >= PURGE_EVERY_MS) await purgeStalePresence(now);
    return { applied: written.length > 0, stored: entries.length, skipped };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** Everyone currently reported in the organization's rooms (fresh reports only). */
export async function presenceEntries(organizationId: string, now = new Date()): Promise<PresenceEntry[]> {
    const rows = await db().execute<{ entry: PresenceEntry }>(sql`
        select u.value as entry
        from ${schema.presenceReports} r
        cross join lateral jsonb_array_elements(r.users) as u(value)
        where r.expires_at > ${now.toISOString()}::timestamptz and u.value->>'organizationId' = ${organizationId}`);
    return [...rows].map((row) => row.entry);
}

/**
 * Identifiers (lower case) of the given people who are connected to a room of the world right now. One query, for the
 * "online now" dot of the members list.
 */
export async function onlineIdentifiers(
    worldId: string,
    identifiers: readonly string[],
    now = new Date(),
): Promise<Set<string>> {
    const keys = [...new Set(identifiers.map(identifierKey))].filter((key) => key.length > 0);
    if (keys.length === 0) return new Set();
    const list = sql.join(
        keys.map((key) => sql`${key}`),
        sql`, `,
    );
    const rows = await db().execute<{ key: string }>(sql`
        select distinct lower(u.value->>'userIdentifier') as key
        from ${schema.presenceReports} r
        cross join lateral jsonb_array_elements(r.users) as u(value)
        where r.expires_at > ${now.toISOString()}::timestamptz
          and u.value->>'worldId' = ${worldId}
          and lower(u.value->>'userIdentifier') in (${list})`);
    return new Set([...rows].map((row) => row.key));
}

/** World ids whose people the viewer may see: presence.view in the world's workspace. */
function visibleWorlds<T extends { workspaceId: string }>(access: OrganizationAccess, worlds: T[]): T[] {
    return worlds.filter((world) => access.can("presence.view", { workspaceId: world.workspaceId }));
}

/**
 * The "Who's in" view of an organization for a viewer: people grouped by world then room, with their member page in
 * the world and their account in the organization when known. Worlds the viewer may not see are left out.
 */
export async function organizationPresence(
    access: OrganizationAccess,
    now = new Date(),
    locale = "en-US",
): Promise<PresenceView> {
    const organizationId = access.organization.id;
    const worlds = visibleWorlds(access, await listOrganizationWorlds(organizationId, true));
    const worldIds = new Set(worlds.map((world) => world.id));
    const entries = (await presenceEntries(organizationId, now)).filter((entry) => worldIds.has(entry.worldId));
    const presentWorlds = worlds.filter((world) => entries.some((entry) => entry.worldId === world.id));

    const roomLists = await Promise.all(presentWorlds.map((world) => listRooms(world.id)));
    const rooms = new Map<string, { worldId: string; name: string; position: number }>();
    roomLists.forEach((list) =>
        list.forEach((room, index) => rooms.set(room.id, { worldId: room.worldId, name: room.name, position: index })),
    );

    const keys = [...new Set(entries.map((entry) => identifierKey(entry.userIdentifier)))];
    const emails = [...new Set(entries.filter((entry) => entry.isLogged).map((e) => identifierKey(e.userIdentifier)))];
    const [memberRows, accountRows] = await Promise.all([
        keys.length > 0 && presentWorlds.length > 0
            ? db()
                  .select({
                      id: schema.members.id,
                      worldId: schema.members.worldId,
                      uuid: schema.members.uuid,
                      email: schema.members.email,
                  })
                  .from(schema.members)
                  .where(
                      and(
                          inArray(
                              schema.members.worldId,
                              presentWorlds.map((world) => world.id),
                          ),
                          or(
                              inArray(sql`lower(${schema.members.uuid})`, keys),
                              inArray(sql`lower(${schema.members.email})`, keys),
                          ),
                      ),
                  )
            : [],
        emails.length > 0
            ? db()
                  .select({ name: schema.accounts.name, email: schema.accounts.email })
                  .from(schema.accounts)
                  .innerJoin(
                      schema.organizationMemberships,
                      and(
                          eq(schema.organizationMemberships.accountId, schema.accounts.id),
                          eq(schema.organizationMemberships.organizationId, organizationId),
                      ),
                  )
                  .where(inArray(sql`lower(${schema.accounts.email})`, emails))
            : [],
    ]);
    const members = new Map<string, string>();
    for (const row of memberRows) {
        members.set(`${row.worldId}\u0000${identifierKey(row.uuid)}`, row.id);
        if (row.email) members.set(`${row.worldId}\u0000${identifierKey(row.email)}`, row.id);
    }
    const accounts = new Map(accountRows.map((row) => [identifierKey(row.email), row]));

    return groupPresence(
        entries,
        {
            worlds: new Map(presentWorlds.map((world) => [world.id, { slug: world.slug, name: world.name }])),
            rooms,
            memberOf: (worldId, identifier) => members.get(`${worldId}\u0000${identifierKey(identifier)}`) ?? null,
            accountOf: (identifier) => accounts.get(identifierKey(identifier)) ?? null,
        },
        now,
        locale,
    );
}
