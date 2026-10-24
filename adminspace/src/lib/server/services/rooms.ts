/** Rooms of a world, managed from the back office, and maps available in WorkAdventure's map-storage. */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";
import { buildRoomUrl, trimSlash } from "../workadventure/playUri";
import { getInstanceSettings } from "./instance";
import { verifiedHosts } from "./domains";
import { openSecret } from "./secrets";
import { organizationDirectory } from "../catalog/mapStorage";
import { listRooms, type Room } from "./worlds";

export type MapKind = (typeof schema.mapKind.enumValues)[number];

// ---------------------------------------------------------------------------------------------
// Map checks
// ---------------------------------------------------------------------------------------------

/** WorkAdventure loads .wam files from map-storage and Tiled maps as .tmj or .json. */
export function mapExtensionOk(kind: MapKind, url: string): boolean {
    let pathname: string;
    try {
        pathname = new URL(url).pathname.toLowerCase();
    } catch {
        return false;
    }
    return kind === "wam" ? pathname.endsWith(".wam") : pathname.endsWith(".tmj") || pathname.endsWith(".json");
}

export type MapReachability = "ok" | "unreachable" | "httpError" | "notChecked";

/** Private, loopback, link-local and other non-public addresses (IPv4 and IPv6). */
export function isNonPublicAddress(address: string): boolean {
    const version = isIP(address);
    if (version === 4) {
        const [a = 0, b = 0] = address.split(".").map(Number);
        return (
            a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            a >= 224
        );
    }
    if (version === 6) {
        const lower = address.toLowerCase();
        if (lower.startsWith("::ffff:")) return isNonPublicAddress(lower.slice(7));
        return (
            lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || /^ff/.test(lower)
        );
    }
    return true;
}

const MAP_CHECK_TIMEOUT_MS = 5_000;

/**
 * Whether a map URL answers. Only the status code is looked at, never the content. To avoid using this
 * admin as a probe of internal networks (SSRF), hosts resolving to non-public addresses are not
 * fetched ("notChecked"), except the configured map-storage and play hosts.
 */
export async function checkMapReachable(url: string): Promise<{ status: MapReachability; httpStatus?: number }> {
    let target: URL;
    try {
        target = new URL(url);
    } catch {
        return { status: "unreachable" };
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return { status: "notChecked" };
    const settings = await getInstanceSettings();
    const trusted = new Set(
        [settings.mapStoragePublicUrl, settings.mapStorageInternalUrl, settings.playUrl]
            .filter((u): u is string => Boolean(u))
            .map((u) => new URL(u).hostname.toLowerCase()),
    );
    const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!trusted.has(host)) {
        try {
            const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
            if (addresses.length === 0 || addresses.some((a) => isNonPublicAddress(a.address))) {
                return { status: "notChecked" };
            }
        } catch {
            return { status: "unreachable" };
        }
    }
    try {
        const response = await fetch(target, {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(MAP_CHECK_TIMEOUT_MS),
        });
        await response.body?.cancel();
        if (response.status >= 200 && response.status < 400) return { status: "ok", httpStatus: response.status };
        return { status: "httpError", httpStatus: response.status };
    } catch {
        return { status: "unreachable" };
    }
}

/** The URL WorkAdventure loads for a room. */
export function roomMapUrl(room: Pick<Room, "mapKind" | "mapUrl" | "wamUrl">): string | null {
    return room.mapKind === "wam" ? room.wamUrl : room.mapUrl;
}

export interface RoomInput {
    slug: string;
    name: string;
    description?: string | undefined;
    mapKind: MapKind;
    mapUrl?: string | undefined;
    wamUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    requiredTags: string[];
    isDefault: boolean;
}

/** Postgres unique violation, possibly wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
    let current: unknown = error;
    for (let depth = 0; current && depth < 3; depth++) {
        if (typeof current === "object" && "code" in current && (current as { code: unknown }).code === "23505") {
            return true;
        }
        current = typeof current === "object" && "cause" in current ? (current as { cause: unknown }).cause : undefined;
    }
    return false;
}

function values(input: RoomInput) {
    return {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        mapKind: input.mapKind,
        mapUrl: input.mapKind === "tmj" ? (input.mapUrl ?? null) : null,
        wamUrl: input.mapKind === "wam" ? (input.wamUrl ?? null) : null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        requiredTags: [...new Set(input.requiredTags)],
    };
}

export async function getRoom(worldId: string, roomId: string): Promise<Room | undefined> {
    if (!isUuid(roomId)) return undefined;
    return db().query.rooms.findFirst({ where: and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.id, roomId)) });
}

/** Creates a room. The first room of a world, or one created as default, becomes the only default room. */
export async function createRoom(worldId: string, input: RoomInput): Promise<Room | "slugTaken"> {
    try {
        return await db().transaction(async (tx) => {
            const existing = await tx.query.rooms.findMany({ where: eq(schema.rooms.worldId, worldId) });
            const isDefault = input.isDefault || existing.length === 0;
            if (isDefault) {
                await tx.update(schema.rooms).set({ isDefault: false }).where(eq(schema.rooms.worldId, worldId));
            }
            const position = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;
            const [room] = await tx
                .insert(schema.rooms)
                .values({ worldId, ...values(input), isDefault, position })
                .returning();
            if (!room) throw new Error("Room creation returned no row");
            return room;
        });
    } catch (error) {
        if (isUniqueViolation(error)) return "slugTaken";
        throw error;
    }
}

export async function updateRoom(
    worldId: string,
    roomId: string,
    input: RoomInput,
): Promise<Room | "slugTaken" | "notFound"> {
    if (!isUuid(roomId)) return "notFound";
    try {
        return await db().transaction(async (tx) => {
            if (input.isDefault) {
                await tx
                    .update(schema.rooms)
                    .set({ isDefault: false })
                    .where(and(eq(schema.rooms.worldId, worldId), ne(schema.rooms.id, roomId)));
            }
            const fields = values(input);
            const [room] = await tx
                .update(schema.rooms)
                .set({
                    ...fields,
                    ...(input.isDefault ? { isDefault: true } : {}),
                    // Another map does not list the world's component collection yet (catalog/install.ts).
                    collectionLinkedAt: sql`case when ${schema.rooms.wamUrl} is not distinct from ${fields.wamUrl}
                        then ${schema.rooms.collectionLinkedAt} else null end`,
                })
                .where(and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.id, roomId)))
                .returning();
            return room ?? "notFound";
        });
    } catch (error) {
        if (isUniqueViolation(error)) return "slugTaken";
        throw error;
    }
}

/** Makes one room the default of its world, in a transaction so there is always exactly one. */
export async function setDefaultRoom(worldId: string, roomId: string): Promise<boolean> {
    if (!isUuid(roomId)) return false;
    return db().transaction(async (tx) => {
        const target = await tx.query.rooms.findFirst({
            where: and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.id, roomId)),
        });
        if (!target) return false;
        await tx.update(schema.rooms).set({ isDefault: false }).where(eq(schema.rooms.worldId, worldId));
        await tx.update(schema.rooms).set({ isDefault: true }).where(eq(schema.rooms.id, roomId));
        return true;
    });
}

/** Deletes a room. If it was the default one, the next room becomes the default. */
export async function deleteRoom(worldId: string, roomId: string): Promise<Room | undefined> {
    if (!isUuid(roomId)) return undefined;
    return db().transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema.rooms)
            .where(and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.id, roomId)))
            .returning();
        if (deleted?.isDefault) {
            const next = await tx.query.rooms.findFirst({
                where: eq(schema.rooms.worldId, worldId),
                orderBy: [asc(schema.rooms.position), asc(schema.rooms.name)],
            });
            if (next) await tx.update(schema.rooms).set({ isDefault: true }).where(eq(schema.rooms.id, next.id));
        }
        return deleted;
    });
}

/**
 * Moves a room one step up or down in the list of rooms, renumbering positions.
 * Answers "notFound" when the room is not a room of this world (nothing changes), "unchanged" when it is
 * already first (up) or last (down), and "moved" otherwise.
 */
export async function moveRoom(
    worldId: string,
    roomId: string,
    direction: "up" | "down",
): Promise<"moved" | "unchanged" | "notFound"> {
    if (!isUuid(roomId)) return "notFound";
    const rooms = await db().query.rooms.findMany({
        where: eq(schema.rooms.worldId, worldId),
        orderBy: [asc(schema.rooms.position), asc(schema.rooms.name)],
    });
    const index = rooms.findIndex((r) => r.id === roomId);
    if (index < 0) return "notFound";
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rooms.length) return "unchanged";
    const ordered = [...rooms];
    const [moved] = ordered.splice(index, 1);
    if (!moved) return "notFound";
    ordered.splice(target, 0, moved);
    await db().transaction(async (tx) => {
        for (const [position, room] of ordered.entries()) {
            if (room.position !== position) {
                await tx.update(schema.rooms).set({ position }).where(eq(schema.rooms.id, room.id));
            }
        }
    });
    return "moved";
}

/** Full WorkAdventure URLs of the rooms of a world, keyed by room id. Empty when the play URL is unknown. */
export async function roomUrls(
    organizationSlug: string,
    worldSlug: string,
    rooms: Pick<Room, "id" | "slug">[],
): Promise<Map<string, string>> {
    const { playUrl } = await getInstanceSettings();
    const urls = new Map<string, string>();
    if (!playUrl) return urls;
    const origin = new URL(playUrl).origin;
    for (const room of rooms) urls.set(room.id, buildRoomUrl(origin, organizationSlug, worldSlug, room.slug));
    return urls;
}

export async function worldRoomUrls(organizationSlug: string, worldId: string, worldSlug: string): Promise<string[]> {
    return [...(await roomUrls(organizationSlug, worldSlug, await listRooms(worldId))).values()];
}

/**
 * Every URL under which the rooms of a world can be open in WorkAdventure: on the play URL and on each
 * verified custom domain of the organization (https and http). Used to address the pusher, which keys
 * rooms by their full URL.
 */
export async function allWorldRoomUrls(
    organization: { id: string; slug: string },
    world: { id: string; slug: string },
): Promise<string[]> {
    const { playUrl } = await getInstanceSettings();
    const origins = new Set<string>();
    if (playUrl) origins.add(new URL(playUrl).origin);
    for (const host of await verifiedHosts(organization.id)) {
        origins.add(`https://${host}`);
        origins.add(`http://${host}`);
    }
    const rooms = await listRooms(world.id);
    const urls: string[] = [];
    for (const origin of origins) {
        for (const room of rooms) urls.push(buildRoomUrl(origin, organization.slug, world.slug, room.slug));
    }
    return urls;
}

// ---------------------------------------------------------------------------------------------
// Map-storage
// ---------------------------------------------------------------------------------------------

/** Read loosely: map-storage's cache format (MapsCacheFileFormat) may gain fields. */
const MapsList = z
    .object({
        maps: z.record(
            z
                .object({
                    metadata: z
                        .object({ name: z.string().nullish(), description: z.string().nullish() })
                        .passthrough()
                        .nullish(),
                })
                .passthrough()
                .nullish(),
        ),
    })
    .passthrough();

export interface MapStorageMap {
    path: string;
    name: string;
    description?: string | undefined;
    wamUrl: string;
}

export type MapStorageListing =
    { status: "ok"; maps: MapStorageMap[] } | { status: "notConfigured" } | { status: "unreachable" };

/**
 * Maps of the configured map-storage an organization may pick for its rooms: everything outside AdminSpace's
 * own directories, and its own directory (rooms created from templates of other organizations are not shown).
 */
export async function listMapStorageMaps(organizationId: string): Promise<MapStorageListing> {
    const settings = await getInstanceSettings();
    const internal = settings.mapStorageInternalUrl ?? settings.mapStoragePublicUrl;
    const publicUrl = settings.mapStoragePublicUrl ?? settings.mapStorageInternalUrl;
    if (!internal || !publicUrl) return { status: "notConfigured" };
    const token = openSecret(settings.mapStorageApiToken);
    try {
        const response = await fetch(`${trimSlash(internal)}/maps`, {
            headers: token ? { authorization: `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) return { status: "unreachable" };
        const parsed = MapsList.safeParse(await response.json());
        if (!parsed.success) return { status: "unreachable" };
        const maps = Object.entries(parsed.data.maps)
            .map(([path, value]) => ({
                path,
                name: value?.metadata?.name || path,
                description: value?.metadata?.description ?? undefined,
                wamUrl: `${trimSlash(publicUrl)}/${path.replace(/^\/+/, "")}`,
            }))
            .filter(({ path }) => {
                const clean = path.replace(/^\/+/, "");
                return (
                    !clean.startsWith("adminspace/") || clean.startsWith(`${organizationDirectory(organizationId)}/`)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        return { status: "ok", maps };
    } catch {
        return { status: "unreachable" };
    }
}
