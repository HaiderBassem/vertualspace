/**
 * Receiver of map-storage's webhook (POST /hooks/map-storage), called after every change of a WAM map:
 *
 *   POST WEB_HOOK_URL   Authorization: <WEB_HOOK_API_TOKEN>  (raw token; "Bearer <token>" is accepted too)
 *   { "domain": "map-storage.example.com", "mapPath": "adminspace/<org>/<world>/<dir>/map.wam", "action": "update" }
 *
 * (map-storage/src/Services/WebHookService.ts). `mapPath` has no leading slash and is absent when a ZIP upload
 * changed several files at once.
 *
 * What it does, and nothing else:
 * - "update" of `adminspace/<organization id>/<world id>/<dir>/map.wam`, a map no room uses yet, in an open world of
 *   that organization: registers the room (WorkAdventure's in-game "Add room" writes such maps next to the room they
 *   were made from, then polls the Admin API's /api/room/sameWorld for it for about 15 seconds).
 * - "update" of a map a room uses whose map was reported deleted: the room is ready again.
 * - "delete" of a map rooms use: those rooms are marked failed ("mapDeleted"). Nothing is ever deleted here.
 *
 * Every other call is answered 200 "ignored". It is called for every edit of every map, so the common path is one
 * indexed query; registration is idempotent (the world row is locked while a room is added).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { audit } from "../audit";
import { isUuid } from "../http/forms";
import { json, safeEqual } from "../http/problem";
import { logJson } from "../security/requestLog";
import { linkNewRoom } from "../catalog/install";
import { mapStoragePublicBase, plainWamPath, readWamFile } from "../catalog/mapStorage";
import { ROOM_SLUG_PATTERN, slugify } from "../workadventure/playUri";
import { getInstanceSettings } from "./instance";
import { openSecret } from "./secrets";

const ACTOR = "system:map-storage";
/** Bodies are three short strings: anything bigger is not a map-storage webhook. */
const MAX_BODY_BYTES = 8 * 1024;

const WebhookBody = z.object({
    domain: z.string().max(255),
    mapPath: z.string().max(1024).nullish(),
    action: z.enum(["update", "delete"]),
});

/** Directory names map-storage gives new rooms ("focus-room", "focus-room-2"). */
const ROOM_DIRECTORY = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const ADMINSPACE_ROOM = /^adminspace\/([^/]+)\/([^/]+)\/([^/]+)\/map\.wam$/;

export type WebhookResult =
    | { result: "registered"; roomId: string; slug: string }
    | { result: "known" }
    | { result: "restored"; rooms: number }
    | { result: "markedDeleted"; rooms: number }
    | { result: "ignored"; reason: string };

/** The webhook token, when configured (instance settings, or WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN). */
async function webhookToken(): Promise<string | undefined> {
    return openSecret((await getInstanceSettings()).mapStorageWebhookToken);
}

/** Checks the Authorization header in constant time. Refuses everything when no token is configured. */
async function authorized(request: Request): Promise<boolean> {
    const expected = await webhookToken();
    const header = request.headers.get("authorization") ?? "";
    const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
    if (!expected) {
        logJson("warn", "map-storage webhook refused: no webhook token is configured", {});
        // Same work as a real comparison, so the answer time does not tell whether a token is configured.
        safeEqual(given, given);
        return false;
    }
    return safeEqual(given, expected);
}

/** The URL forms under which rooms may store a map path (as written by map-storage, and percent-encoded). */
function wamUrlsOf(publicBase: string, mapPath: string): string[] {
    return [...new Set([`${publicBase}/${mapPath}`, `${publicBase}/${encodeURI(mapPath)}`])];
}

/** A slug unique among `taken`, following the room slug rules, from the first usable candidate base. */
export function uniqueRoomSlug(bases: string[], taken: Set<string>): string {
    const base =
        bases
            .map((b) => slugify(b).slice(0, 120).replace(/-+$/, ""))
            .find((b) => b.length > 0 && ROOM_SLUG_PATTERN.test(b)) ?? "room";
    if (!taken.has(base)) return base;
    for (let n = 2; n < 10_000; n++) {
        const candidate = `${base}-${n}`;
        if (!taken.has(candidate)) return candidate;
    }
    return `${base}-${randomUUID().slice(0, 8)}`;
}

/** The room name map-storage wrote into the WAM (WorkAdventure stores what the person typed in metadata.name). */
async function nameFromWam(wamUrl: string): Promise<string | undefined> {
    const wam = await readWamFile(wamUrl, 3_000);
    if (wam.status !== "ok") return undefined;
    const metadata = (wam.value as { metadata?: { name?: unknown } }).metadata;
    const name = typeof metadata?.name === "string" ? metadata.name.replace(/\s+/g, " ").trim() : "";
    return name ? name.slice(0, 200) : undefined;
}

async function markDeleted(wamUrls: string[]): Promise<number> {
    const rooms = await db()
        .update(schema.rooms)
        .set({ syncState: "failed", syncError: "mapDeleted" })
        .where(and(eq(schema.rooms.mapKind, "wam"), inArray(schema.rooms.wamUrl, wamUrls)))
        .returning({ id: schema.rooms.id, worldId: schema.rooms.worldId, slug: schema.rooms.slug });
    for (const room of rooms) {
        const world = await db().query.worlds.findFirst({ where: eq(schema.worlds.id, room.worldId) });
        await audit({
            action: "room.map_deleted",
            actorLabel: ACTOR,
            organizationId: world?.organizationId ?? null,
            worldId: room.worldId,
            targetType: "room",
            targetId: room.id,
            details: { slug: room.slug, source: "mapStorageWebhook" },
        });
    }
    return rooms.length;
}

/** A room whose map was reported deleted is ready again once map-storage reports the map updated. */
async function restoreDeleted(roomIds: string[]): Promise<number> {
    const rooms = await db()
        .update(schema.rooms)
        .set({ syncState: "ready", syncError: null })
        .where(and(inArray(schema.rooms.id, roomIds), eq(schema.rooms.syncError, "mapDeleted")))
        .returning({ id: schema.rooms.id, worldId: schema.rooms.worldId });
    for (const room of rooms) {
        const world = await db().query.worlds.findFirst({ where: eq(schema.worlds.id, room.worldId) });
        await audit({
            action: "room.map_restored",
            actorLabel: ACTOR,
            organizationId: world?.organizationId ?? null,
            worldId: room.worldId,
            targetType: "room",
            targetId: room.id,
            details: { source: "mapStorageWebhook" },
        });
    }
    return rooms.length;
}

/** Rooms using a map: the common path of the webhook (one query on the rooms_wam_url_idx index). */
function roomsUsing(wamUrls: string[]) {
    return db()
        .select({ id: schema.rooms.id, syncError: schema.rooms.syncError })
        .from(schema.rooms)
        .where(inArray(schema.rooms.wamUrl, wamUrls));
}

/** Registers a room created inside WorkAdventure (see the file comment for the conditions). */
async function register(mapPath: string, wamUrl: string, wamUrls: string[]): Promise<WebhookResult> {
    const match = ADMINSPACE_ROOM.exec(mapPath);
    if (!match) return { result: "ignored", reason: "notAdminSpaceRoom" };
    const [, organizationId, worldId, directory] = match as unknown as [string, string, string, string];
    if (!isUuid(organizationId) || !isUuid(worldId) || !ROOM_DIRECTORY.test(directory)) {
        return { result: "ignored", reason: "notAdminSpaceRoom" };
    }
    // Rooms created from templates live in a directory named after their id, written by AdminSpace itself: never
    // registered again (a room deleted in AdminSpace must not come back when someone still edits its map).
    if (isUuid(directory)) return { result: "ignored", reason: "templateRoom" };

    const world = await db().query.worlds.findFirst({
        where: and(eq(schema.worlds.id, worldId), eq(schema.worlds.organizationId, organizationId)),
    });
    if (!world) return { result: "ignored", reason: "worldNotFound" };
    if (world.archivedAt) return { result: "ignored", reason: "worldArchived" };

    // Read before the transaction: no network call while the world row is locked.
    const name = (await nameFromWam(wamUrl)) ?? directory;

    const created = await db().transaction(async (tx) => {
        // One registration at a time per world: two webhook calls for the same new map add one room.
        await tx.execute(sql`select id from worlds where id = ${world.id} for update`);
        const [existing] = await tx
            .select({ id: schema.rooms.id })
            .from(schema.rooms)
            .where(inArray(schema.rooms.wamUrl, wamUrls))
            .limit(1);
        if (existing) return undefined;
        const rooms = await tx
            .select({ slug: schema.rooms.slug, position: schema.rooms.position })
            .from(schema.rooms)
            .where(eq(schema.rooms.worldId, world.id));
        const slug = uniqueRoomSlug([directory, name], new Set(rooms.map((r) => r.slug)));
        const [room] = await tx
            .insert(schema.rooms)
            .values({
                worldId: world.id,
                slug,
                name,
                mapKind: "wam",
                wamUrl,
                mapUrl: null,
                isDefault: rooms.length === 0,
                position: rooms.reduce((max, r) => Math.max(max, r.position), -1) + 1,
                syncState: "ready",
            })
            .returning({ id: schema.rooms.id, slug: schema.rooms.slug });
        return room;
    });
    if (!created) return { result: "known" };

    await audit({
        action: "room.create",
        actorLabel: ACTOR,
        organizationId: world.organizationId,
        worldId: world.id,
        targetType: "room",
        targetId: created.id,
        details: { slug: created.slug, name, source: "mapStorageWebhook", mapPath },
    });
    // A world with components gets its collection into the new room too (a background job).
    await linkNewRoom(world, null).catch((error: unknown) =>
        logJson("warn", "collection link of a webhook room failed", { roomId: created.id, error: String(error) }),
    );
    return { result: "registered", roomId: created.id, slug: created.slug };
}

/** Handles one webhook call (kept independent from SvelteKit: tested with plain Request objects). */
export async function handleMapStorageWebhook(request: Request): Promise<Response> {
    if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
    if (!(await authorized(request))) return new Response("Forbidden", { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
        return json({ status: "error", message: "Body too large" }, { status: 413 });
    }
    let raw: unknown;
    try {
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) return json({ status: "error", message: "Body too large" }, { status: 413 });
        raw = JSON.parse(text);
    } catch {
        return json({ status: "error", message: "Invalid JSON" }, { status: 400 });
    }
    const body = WebhookBody.safeParse(raw);
    if (!body.success) return json({ status: "error", message: "Invalid body" }, { status: 400 });

    const outcome = await handle(body.data);
    if (outcome.result !== "ignored" && outcome.result !== "known") {
        logJson("info", "map-storage webhook", { action: body.data.action, mapPath: body.data.mapPath, ...outcome });
    }
    return json(outcome);
}

async function handle(body: z.infer<typeof WebhookBody>): Promise<WebhookResult> {
    if (!body.mapPath) return { result: "ignored", reason: "noMapPath" };
    const publicBase = await mapStoragePublicBase();
    if (!publicBase) return { result: "ignored", reason: "mapStorageNotConfigured" };
    // Map-storage serves several domains; only the one AdminSpace's rooms use is followed.
    const domain = body.domain.split(":")[0]!.toLowerCase();
    if (domain !== new URL(publicBase).hostname.toLowerCase()) return { result: "ignored", reason: "otherDomain" };
    const mapPath = plainWamPath(body.mapPath.replace(/^\/+/, ""));
    if (!mapPath) return { result: "ignored", reason: "notAWamFile" };
    const wamUrls = wamUrlsOf(publicBase, mapPath);

    if (body.action === "delete") {
        const rooms = await markDeleted(wamUrls);
        return rooms > 0 ? { result: "markedDeleted", rooms } : { result: "ignored", reason: "unknownMap" };
    }
    const using = await roomsUsing(wamUrls);
    if (using.length > 0) {
        const deleted = using.filter((r) => r.syncError === "mapDeleted").map((r) => r.id);
        const restored = deleted.length > 0 ? await restoreDeleted(deleted) : 0;
        return restored > 0 ? { result: "restored", rooms: restored } : { result: "known" };
    }
    return register(mapPath, wamUrls[0]!, wamUrls);
}
