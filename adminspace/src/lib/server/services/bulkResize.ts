/**
 * Resizing many rooms at once ("change the size of all workspaces"): pick rooms of the organization's workspaces,
 * preview every resize with map-storage dry runs, then apply them as background jobs (`room.resize`, one per room,
 * grouped by a batch id in their payload) with per-room results.
 *
 * Every room is checked against the person's access (room.manage in the room's workspace) at each step: a form
 * cannot add a room the person may not manage. Targets are absolute sizes computed at preview time, so a retried
 * job never resizes twice.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { OrganizationAccess } from "../auth/rbac";
import { isUuid } from "../http/forms";
import { enqueueJob, type Job } from "./jobs";
import { listWorkspaces } from "./workspaces";
import { listOrganizationWorlds, worldState } from "./worlds";
import { currentRoomSize, mapWithConcurrency, resizableMap, resizeRoom } from "./roomSize";
import {
    ROOM_SIZE_PROBLEMS,
    RESIZE_REASONS,
    targetSize,
    type ResizeAnchor,
    type ResizeFill,
    type ResizeReason,
    type ResizeSummary,
    type RoomSize,
    type RoomSizeProblem,
    type SizeTarget,
} from "../../rooms/size";

/** At most this many rooms per preview or batch: each preview is a map-storage call. */
export const MAX_BULK_ROOMS = 200;
const PREVIEW_CONCURRENCY = 6;

type World = typeof schema.worlds.$inferSelect;

export interface BulkTree {
    workspaces: {
        id: string;
        slug: string;
        name: string;
        worlds: {
            id: string;
            slug: string;
            name: string;
            rooms: { id: string; name: string; slug: string; problem: RoomSizeProblem | null }[];
        }[];
    }[];
}

/** Workspaces, open worlds and rooms the person may resize (rooms AdminSpace cannot resize carry their problem). */
export async function bulkTree(access: OrganizationAccess, workspaceId?: string): Promise<BulkTree> {
    const organizationId = access.organization.id;
    const workspaces = (await listWorkspaces(organizationId)).filter(
        (w) => (!workspaceId || w.id === workspaceId) && access.can("room.manage", { workspaceId: w.id }),
    );
    const workspaceIds = new Set(workspaces.map((w) => w.id));
    const worlds = (await listOrganizationWorlds(organizationId)).filter(
        (w) => workspaceIds.has(w.workspaceId) && worldState(w) === "open",
    );
    const rooms = worlds.length
        ? await db().query.rooms.findMany({
              where: inArray(
                  schema.rooms.worldId,
                  worlds.map((w) => w.id),
              ),
              orderBy: (r, { asc }) => [asc(r.position), asc(r.name)],
          })
        : [];
    const problems = new Map<string, RoomSizeProblem | null>();
    const worldById = new Map(worlds.map((w) => [w.id, w]));
    for (const room of rooms) {
        const check = await resizableMap(worldById.get(room.worldId)!, room);
        problems.set(room.id, check.ok ? null : check.problem);
    }
    return {
        workspaces: workspaces.map((workspace) => ({
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            worlds: worlds
                .filter((w) => w.workspaceId === workspace.id)
                .map((world) => ({
                    id: world.id,
                    slug: world.slug,
                    name: world.name,
                    rooms: rooms
                        .filter((r) => r.worldId === world.id)
                        .map((r) => ({ id: r.id, name: r.name, slug: r.slug, problem: problems.get(r.id) ?? null })),
                })),
        })),
    };
}

/** Rooms of the organization among `roomIds` that the person may resize, with their world. */
async function manageableRooms(access: OrganizationAccess, roomIds: string[]) {
    const ids = [...new Set(roomIds.filter(isUuid))].slice(0, MAX_BULK_ROOMS);
    if (ids.length === 0) return [];
    const rows = await db()
        .select({ room: schema.rooms, world: schema.worlds })
        .from(schema.rooms)
        .innerJoin(schema.worlds, eq(schema.worlds.id, schema.rooms.worldId))
        .where(and(inArray(schema.rooms.id, ids), eq(schema.worlds.organizationId, access.organization.id)));
    return rows.filter(
        ({ world }) => worldState(world) === "open" && access.can("room.manage", { workspaceId: world.workspaceId }),
    );
}

export interface BulkPreviewRow {
    roomId: string;
    roomName: string;
    worldName: string;
    from: RoomSize | null;
    to: RoomSize | null;
    status: "ready" | "sameSize" | "outOfRange" | RoomSizeProblem;
    summary: ResizeSummary | null;
    reason: ResizeReason | null;
    detail: string | null;
}

/** Dry runs of a bulk resize: what each room would become. Nothing changes. */
export async function previewBulkResize(
    access: OrganizationAccess,
    roomIds: string[],
    target: SizeTarget,
    anchor: ResizeAnchor,
    fill: ResizeFill,
): Promise<BulkPreviewRow[]> {
    const rows = await manageableRooms(access, roomIds);
    return mapWithConcurrency(rows, PREVIEW_CONCURRENCY, async ({ room, world }): Promise<BulkPreviewRow> => {
        const base = {
            roomId: room.id,
            roomName: room.name,
            worldName: world.name,
            summary: null,
            reason: null,
            detail: null,
        };
        const reading = await currentRoomSize(world, room);
        if (reading.status === "problem") return { ...base, from: null, to: null, status: reading.problem };
        const from = { width: reading.size.width, height: reading.size.height };
        if (reading.size.infinite) return { ...base, from, to: null, status: "unresizable", reason: "infinite" };
        const to = targetSize(from, target);
        if (!to) return { ...base, from, to: null, status: "outOfRange" };
        if (to.width === from.width && to.height === from.height) return { ...base, from, to, status: "sameSize" };
        const result = await resizeRoom(world, room, { ...to, anchor, fill }, true);
        if (result.status === "problem") {
            return {
                ...base,
                from,
                to,
                status: result.problem,
                reason: result.reason ?? null,
                detail: result.detail ?? null,
            };
        }
        return { ...base, from, to, status: "ready", summary: result.summary };
    });
}

/** Records one `room.resize` job per room. Returns the batch id, or undefined when no room may be resized. */
export async function applyBulkResize(
    access: OrganizationAccess,
    actorId: string,
    items: { roomId: string; width: number; height: number }[],
    anchor: ResizeAnchor,
    fill: ResizeFill,
): Promise<{ batchId: string; rooms: string[] } | undefined> {
    const sizes = new Map(items.map((i) => [i.roomId, i]));
    const rows = await manageableRooms(access, [...sizes.keys()]);
    if (rows.length === 0) return undefined;
    const batchId = randomUUID();
    await db().transaction(async (tx) => {
        for (const { room, world } of rows) {
            const size = sizes.get(room.id)!;
            await enqueueJob(tx, {
                kind: "room.resize",
                organizationId: world.organizationId,
                payload: {
                    roomId: room.id,
                    worldId: world.id,
                    batchId,
                    width: size.width,
                    height: size.height,
                    anchor,
                    fill,
                },
                idempotencyKey: `resize:${batchId}:${room.id}`,
                maxAttempts: 5,
                createdBy: actorId,
            });
        }
    });
    return { batchId, rooms: rows.map((r) => r.room.id) };
}

export interface BulkResultRow {
    jobId: string;
    roomId: string;
    roomName: string | null;
    worldName: string | null;
    status: Job["status"];
    to: RoomSize;
    attempts: number;
    maxAttempts: number;
    summary: ResizeSummary | null;
    /** Why the last attempt failed: a size problem, "roomGone", or null. */
    problem: RoomSizeProblem | "roomGone" | null;
    reason: ResizeReason | null;
}

/** The problem code a `room.resize` job's error starts with (see jobHandlers.ts). */
export function resizeJobProblem(lastError: string | null): {
    problem: RoomSizeProblem | "roomGone" | null;
    reason: ResizeReason | null;
} {
    if (!lastError) return { problem: null, reason: null };
    const match = /^\w*: ([a-zA-Z]+)(?::([a-zA-Z]+))?/.exec(lastError);
    const code = match?.[1];
    const reason = match?.[2];
    const problem =
        code === "roomGone"
            ? "roomGone"
            : (ROOM_SIZE_PROBLEMS as readonly string[]).includes(code ?? "")
              ? (code as RoomSizeProblem)
              : "unavailable";
    return {
        problem,
        reason: (RESIZE_REASONS as readonly string[]).includes(reason ?? "") ? (reason as ResizeReason) : null,
    };
}

/** The rooms of a batch and how their resize went, limited to the rooms the person may manage. */
export async function bulkResults(access: OrganizationAccess, batchId: string): Promise<BulkResultRow[] | undefined> {
    if (!isUuid(batchId)) return undefined;
    const jobs = await db()
        .select()
        .from(schema.jobs)
        .where(
            and(
                eq(schema.jobs.organizationId, access.organization.id),
                eq(schema.jobs.kind, "room.resize"),
                sql`${schema.jobs.payload}->>'batchId' = ${batchId}`,
            ),
        );
    if (jobs.length === 0) return undefined;
    const roomIds = jobs.map((j) => String((j.payload as { roomId?: unknown }).roomId)).filter(isUuid);
    const worldIds = jobs.map((j) => String((j.payload as { worldId?: unknown }).worldId)).filter(isUuid);
    const [rooms, worlds] = await Promise.all([
        roomIds.length ? db().query.rooms.findMany({ where: inArray(schema.rooms.id, roomIds) }) : [],
        worldIds.length
            ? db().query.worlds.findMany({
                  where: and(
                      inArray(schema.worlds.id, worldIds),
                      eq(schema.worlds.organizationId, access.organization.id),
                  ),
              })
            : ([] as World[]),
    ]);
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const worldById = new Map(worlds.map((w) => [w.id, w]));
    return jobs
        .flatMap((job): BulkResultRow[] => {
            const payload = job.payload as { roomId: string; worldId: string; width: number; height: number };
            const world = worldById.get(payload.worldId);
            if (world && !access.can("room.manage", { workspaceId: world.workspaceId })) return [];
            if (!world && !access.can("room.manage")) return [];
            const room = roomById.get(payload.roomId);
            const failed = job.status === "failed" || (job.status === "pending" && job.attempts > 0);
            const { problem, reason } = failed ? resizeJobProblem(job.lastError) : { problem: null, reason: null };
            const result = job.result as { summary?: ResizeSummary } | null;
            return [
                {
                    jobId: job.id,
                    roomId: payload.roomId,
                    roomName: room?.name ?? null,
                    worldName: world?.name ?? null,
                    status: job.status,
                    to: { width: payload.width, height: payload.height },
                    attempts: job.attempts,
                    maxAttempts: job.maxAttempts,
                    summary: result?.summary ?? null,
                    problem: room ? problem : "roomGone",
                    reason,
                },
            ];
        })
        .sort(
            (a, b) =>
                (a.worldName ?? "").localeCompare(b.worldName ?? "") ||
                (a.roomName ?? "").localeCompare(b.roomName ?? ""),
        );
}

/** The world of a resize job of the organization (to check the person's access before a retry). */
export async function resizeJobWorld(organizationId: string, jobId: string): Promise<World | undefined> {
    if (!isUuid(jobId)) return undefined;
    const job = await db().query.jobs.findFirst({
        where: and(
            eq(schema.jobs.id, jobId),
            eq(schema.jobs.organizationId, organizationId),
            eq(schema.jobs.kind, "room.resize"),
        ),
    });
    const worldId = (job?.payload as { worldId?: unknown } | undefined)?.worldId;
    if (!isUuid(worldId)) return undefined;
    return db().query.worlds.findFirst({
        where: and(eq(schema.worlds.id, worldId), eq(schema.worlds.organizationId, organizationId)),
    });
}
