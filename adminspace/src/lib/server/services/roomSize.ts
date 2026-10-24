/**
 * Room sizes: reading the current size of a room (the width and height of its Tiled map) and resizing it through
 * map-storage's POST /resize (catalog/mapStorage.ts). Map-storage is the source of truth: sizes are never stored
 * here, since rooms are also resized from inside WorkAdventure.
 *
 * Pages check the person's permission (room.manage). This module checks the map: only WAM rooms on the configured
 * map-storage, and only maps the organization may change (`wamWritableBy`: the platform's token can write any map).
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { wamWritableBy } from "../catalog/install";
import {
    readRoomMap,
    resizeRoomMap,
    wamTarget,
    type ResizeReport,
    type RoomMapFailure,
    type ResizeFailure,
} from "../catalog/mapStorage";
import {
    MAX_ROOM_TILES,
    MIN_ROOM_TILES,
    RESIZE_ANCHORS,
    RESIZE_FILLS,
    resizeReasonOf,
    summarizeReport,
    type ResizeOptions,
    type ResizeReason,
    type ResizeSummary,
    type RoomSizeProblem,
    type SizeReading,
} from "../../rooms/size";
import type { Room } from "./worlds";

type World = typeof schema.worlds.$inferSelect;

const tiles = z.coerce.number().int().min(MIN_ROOM_TILES).max(MAX_ROOM_TILES);

/** The resize options of a form or a query string. */
export const ResizeOptionsSchema = z.object({
    width: tiles,
    height: tiles,
    anchor: z.enum(RESIZE_ANCHORS).default("top-left"),
    fill: z.enum(RESIZE_FILLS).default("extend"),
});

export type MapCheck = { ok: true; wamUrl: string } | { ok: false; problem: RoomSizeProblem };

/** Whether AdminSpace may read and resize this room's map for its organization. */
export async function resizableMap(
    world: Pick<World, "organizationId">,
    room: Pick<Room, "mapKind" | "wamUrl">,
): Promise<MapCheck> {
    if (room.mapKind === "tmj") return { ok: false, problem: "tiled" };
    if (!room.wamUrl) return { ok: false, problem: "noMap" };
    const target = await wamTarget(room.wamUrl);
    if (!target) return { ok: false, problem: "notOnMapStorage" };
    // Maps of other organizations are never read nor written for this one.
    if (!(await wamWritableBy(world.organizationId, target))) return { ok: false, problem: "otherOrganization" };
    return { ok: true, wamUrl: room.wamUrl };
}

function mapProblem(failure: RoomMapFailure): RoomSizeProblem {
    return failure;
}

/** The current size of a room, read from map-storage. */
export async function currentRoomSize(
    world: Pick<World, "organizationId">,
    room: Pick<Room, "mapKind" | "wamUrl">,
): Promise<SizeReading> {
    const check = await resizableMap(world, room);
    if (!check.ok) return { status: "problem", problem: check.problem };
    const read = await readRoomMap(check.wamUrl, 6_000);
    if (read.status !== "ok") return { status: "problem", problem: mapProblem(read.status) };
    const { map } = read.value;
    return {
        status: "ok",
        size: {
            width: map.width,
            height: map.height,
            tileWidth: map.tilewidth,
            tileHeight: map.tileheight,
            infinite: map.infinite === true,
        },
    };
}

export type ResizeResult =
    | { status: "ok"; summary: ResizeSummary; report: ResizeReport }
    | { status: "problem"; problem: RoomSizeProblem; reason?: ResizeReason; detail?: string; httpStatus?: number };

function resizeProblem(failure: ResizeFailure): RoomSizeProblem {
    return failure === "notConfigured" ? "notOnMapStorage" : failure;
}

/**
 * Resizes a room (or, with `dryRun`, only computes what would change). After a real resize, map-storage moves the
 * people in the room with the map; a room created from a template whose size had been refused is ready again.
 */
export async function resizeRoom(
    world: Pick<World, "organizationId">,
    room: Pick<Room, "id" | "mapKind" | "wamUrl" | "syncError">,
    options: ResizeOptions,
    dryRun: boolean,
): Promise<ResizeResult> {
    const check = await resizableMap(world, room);
    if (!check.ok) return { status: "problem", problem: check.problem };
    const outcome = await resizeRoomMap(check.wamUrl, { ...options, dryRun });
    if (outcome.status !== "ok") {
        const problem = resizeProblem(outcome.status);
        return {
            status: "problem",
            problem,
            ...(problem === "unresizable" ? { reason: resizeReasonOf(outcome.detail) } : {}),
            ...(outcome.detail ? { detail: outcome.detail } : {}),
            ...(outcome.httpStatus ? { httpStatus: outcome.httpStatus } : {}),
        };
    }
    if (!dryRun && room.syncError === "resizeRejected") {
        await db()
            .update(schema.rooms)
            .set({ syncState: "ready", syncError: null })
            .where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.syncError, "resizeRejected")));
    }
    return { status: "ok", summary: summarizeReport(outcome.value.report), report: outcome.value.report };
}

/** Runs `task` over `items` with at most `limit` running at once (bulk previews), keeping the order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await task(items[index]!);
        }
    });
    await Promise.all(workers);
    return results;
}
