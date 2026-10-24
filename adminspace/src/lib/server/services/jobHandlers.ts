/**
 * Handlers of the background jobs that change WorkAdventure (registered on import, see hooks.server.ts).
 *
 * All are idempotent: they first look at the current state on map-storage and only change what is
 * missing (sizes are absolute, doors have stable ids), so a retry after a crash or a timeout never duplicates
 * anything. All re-check that the room still belongs to the job's organization (a job payload is not trusted on
 * its own).
 */
import { createHash } from "node:crypto";
import path from "node:path";
import { and, eq, inArray, isNotNull, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { audit } from "../audit";
import {
    componentIdOfPrefab,
    prefabId,
    WORKADVENTURE_FORMATS,
    type ComponentManifest,
    type RoomSyncProblem,
} from "../../catalog/manifest";
import {
    MAX_ROOM_TILES,
    MIN_ROOM_TILES,
    RESIZE_ANCHORS,
    RESIZE_FILLS,
    isPermanentSizeProblem,
    type ResizeOptions,
} from "../../rooms/size";
import { collectionName, templateDirectory, wamWritableBy, worldCollectionUrl } from "../catalog/install";
import { exitArea, placeDoors, type PixelRect } from "../catalog/doors";
import {
    buildZip,
    getWam,
    mapStoragePublicBase,
    patchWam,
    readRoomMap,
    uploadArchive,
    wamTarget,
} from "../catalog/mapStorage";
import { assetsOf, versionFiles } from "../catalog/store";
import { logJson } from "../security/requestLog";
import { PermanentJobError, registerJobHandler, type Job } from "./jobs";
import { resizeRoom } from "./roomSize";

const tiles = z.number().int().min(MIN_ROOM_TILES).max(MAX_ROOM_TILES);
const LinkPayload = z.object({ roomId: z.string().uuid(), worldId: z.string().uuid() });
/** Doors the room gets after it is provisioned (the "Create office" wizard): exits to other rooms of the world. */
const DoorsPayload = z.object({
    placement: z.enum(["entrance", "walls"]),
    targets: z
        .array(z.object({ name: z.string().min(1).max(200), url: z.string().regex(/^\/@\/[^\s?#]{1,400}$/) }))
        .max(30),
});
const ProvisionPayload = LinkPayload.extend({
    versionId: z.string().uuid(),
    directory: z.string().max(200),
    components: z.record(z.string(), z.string().uuid()),
    /** Size chosen when the room was created; absent: the template's own size. */
    size: z.object({ width: tiles, height: tiles }).optional(),
    doors: DoorsPayload.optional(),
});
const ResizePayload = LinkPayload.extend({
    batchId: z.string().uuid(),
    width: tiles,
    height: tiles,
    anchor: z.enum(RESIZE_ANCHORS),
    fill: z.enum(RESIZE_FILLS),
});

/** The room of a job, only if it is still in the job's world and organization. */
async function roomOf(job: Job, roomId: string, worldId: string) {
    if (!job.organizationId) return undefined;
    const [row] = await db()
        .select({ room: schema.rooms, world: schema.worlds, organization: schema.organizations })
        .from(schema.rooms)
        .innerJoin(schema.worlds, eq(schema.worlds.id, schema.rooms.worldId))
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(
            and(
                eq(schema.rooms.id, roomId),
                eq(schema.worlds.id, worldId),
                eq(schema.worlds.organizationId, job.organizationId),
            ),
        );
    return row;
}

async function markRoom(roomId: string, fields: Partial<typeof schema.rooms.$inferInsert>): Promise<void> {
    await db().update(schema.rooms).set(fields).where(eq(schema.rooms.id, roomId));
}

/** An error that tells the room's page why the change failed; `permanent` stops the retries. */
function syncFailure(problem: RoomSyncProblem, message: string, permanent = false): Error {
    const error = permanent ? new PermanentJobError(message) : new Error(message);
    return Object.assign(error, { syncProblem: problem });
}

async function recordFailure(job: Job, _error: string, final: boolean, cause: unknown): Promise<void> {
    const roomId = (job.payload as { roomId?: unknown }).roomId;
    if (typeof roomId !== "string") return;
    const problem =
        cause && typeof cause === "object" && "syncProblem" in cause
            ? (cause.syncProblem as RoomSyncProblem)
            : "unexpected";
    await markRoom(roomId, { syncState: final ? "failed" : "pending", syncError: problem });
}

// ---------------------------------------------------------------------------------------------
// wam.link_collection: make sure the room's WAM lists the world's collection file
// ---------------------------------------------------------------------------------------------

registerJobHandler(
    "wam.link_collection",
    async (job) => {
        const { roomId, worldId } = LinkPayload.parse(job.payload);
        const row = await roomOf(job, roomId, worldId);
        if (!row) return { skipped: "roomGone" };
        const url = worldCollectionUrl(worldId);
        if (!url) throw syncFailure("originMissing", "ORIGIN is not configured: collection URLs cannot be built", true);
        const target = await wamTarget(row.room.wamUrl);
        if (!target) {
            await markRoom(roomId, { syncState: "ready", syncError: null });
            return { skipped: "notOnConfiguredMapStorage" };
        }
        // Re-checked at run time: another organization may have started using the same map meanwhile.
        if (!(await wamWritableBy(job.organizationId!, target))) {
            throw syncFailure("otherOrganization", "the map belongs to another organization", true);
        }

        const wam = await getWam(target);
        if (wam.status === "notFound")
            throw syncFailure("mapNotFound", "the room's WAM file does not exist (404)", true);
        if (wam.status === "unauthorized") {
            throw syncFailure("unauthorized", "map-storage refused the request (401/403)", true);
        }
        if (wam.status !== "ok") {
            throw syncFailure(
                "unavailable",
                `map-storage did not return the WAM file (${wam.httpStatus ?? "network"})`,
            );
        }

        if (!wam.value.entityCollections.some((c) => c.url === url)) {
            // The "test" operation makes the change conditional on the list read above: a concurrent
            // edit fails the patch (400) and the job retries on fresh data instead of overwriting it.
            const patch = await patchWam(target, [
                { op: "test", path: "/entityCollections", value: wam.value.entityCollections },
                { op: "add", path: "/entityCollections/-", value: { url, type: "file" } },
            ]);
            if (patch.status === "unauthorized") {
                throw syncFailure("unauthorized", "map-storage refused the token (401/403)", true);
            }
            if (patch.status !== "ok") {
                throw syncFailure(
                    patch.status === "unavailable" ? "unavailable" : "rejected",
                    `map-storage refused the change (${patch.httpStatus ?? "network"})`,
                );
            }
        }
        await markRoom(roomId, { syncState: "ready", syncError: null, collectionLinkedAt: new Date() });
        return { linked: true, url };
    },
    { onFailure: recordFailure },
);

// ---------------------------------------------------------------------------------------------
// room.provision_template: upload a room template to map-storage as a new WAM room
// ---------------------------------------------------------------------------------------------

/** Stable entity ids, so that a retried upload writes exactly the same WAM file. */
function entityId(roomId: string, index: number): string {
    const hex = createHash("sha256").update(`${roomId}:${index}`).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

registerJobHandler(
    "room.provision_template",
    async (job) => {
        const payload = ProvisionPayload.parse(job.payload);
        const row = await roomOf(job, payload.roomId, payload.worldId);
        if (!row) return { skipped: "roomGone" };
        // Nothing of the payload but ids is trusted: the directory is derived again, and the template and its
        // furniture must still be published components this organization may use.
        if (payload.directory !== templateDirectory(row.world, row.room.id)) {
            throw syncFailure("unexpected", "the job's directory does not match the room", true);
        }
        const usableVersionIds = new Set(
            (
                await db()
                    .select({ id: schema.componentVersions.id })
                    .from(schema.componentVersions)
                    .innerJoin(schema.components, eq(schema.components.id, schema.componentVersions.componentId))
                    .where(
                        and(
                            inArray(schema.componentVersions.id, [payload.versionId]),
                            isNotNull(schema.componentVersions.publishedAt),
                            or(
                                isNull(schema.components.organizationId),
                                eq(schema.components.organizationId, row.world.organizationId),
                            ),
                        ),
                    )
            ).map((v) => v.id),
        );
        if (!usableVersionIds.has(payload.versionId)) {
            throw syncFailure("templateMissing", "the template is not available to this organization", true);
        }
        const furniture = Object.values(payload.components);
        if (furniture.length > 0) {
            const usable = await db()
                .select({ id: schema.components.id })
                .from(schema.components)
                .where(
                    and(
                        inArray(schema.components.id, furniture),
                        or(
                            isNull(schema.components.organizationId),
                            eq(schema.components.organizationId, row.world.organizationId),
                        ),
                    ),
                );
            if (usable.length !== new Set(furniture).size) {
                throw syncFailure("templateMissing", "furniture of the template is not available", true);
            }
        }
        if (row.room.syncState === "ready" && row.room.wamUrl) return { skipped: "alreadyProvisioned" };
        const url = worldCollectionUrl(payload.worldId);
        if (!url) throw syncFailure("originMissing", "ORIGIN is not configured: collection URLs cannot be built", true);

        const [version] = await db()
            .select()
            .from(schema.componentVersions)
            .where(eq(schema.componentVersions.id, payload.versionId));
        if (!version) throw syncFailure("templateMissing", "the template version no longer exists", true);
        const manifest = version.manifest as ComponentManifest;
        const template = manifest.template;
        if (!template) throw syncFailure("templateMissing", "the component is not a room template", true);
        const files = await versionFiles(version.id);

        const mapName = path.posix.basename(template.map);
        const wamName = mapName.replace(/\.tmj$/, ".wam");
        const entities: Record<string, unknown> = {};
        for (const [index, placed] of template.entities.entries()) {
            const componentId = payload.components[placed.component];
            if (!componentId) continue;
            entities[entityId(payload.roomId, index)] = {
                x: placed.x,
                y: placed.y,
                prefabRef: {
                    collectionName: collectionName(row.organization.name),
                    id: prefabId(componentId, placed.variant),
                },
            };
        }
        const wam = {
            version: WORKADVENTURE_FORMATS.wam,
            mapUrl: `./${mapName}`,
            entities,
            areas: [],
            entityCollections: [{ url, type: "file" }],
            metadata: {
                name: row.room.name,
                description: manifest.description ?? null,
                copyright: [manifest.license, manifest.attribution].filter(Boolean).join(" — "),
            },
            vendor: { adminspace: { component: manifest.key, version: manifest.version } },
        };
        const publicBase = await mapStoragePublicBase();
        if (!publicBase) throw syncFailure("unavailable", "map-storage is not configured");
        const wamUrl = `${publicBase}/${payload.directory}/${wamName}`;

        // Uploaded once: a retry after a later step (size, doors) finds the room's map already there.
        if (row.room.wamUrl !== wamUrl) {
            const entries = [
                ...[template.map, ...template.files].map((file) => {
                    const stored = files.get(file);
                    if (!stored) throw syncFailure("templateMissing", `file ${file} of the template is missing`, true);
                    return { name: file, data: stored.data };
                }),
                { name: wamName, data: Buffer.from(JSON.stringify(wam, null, 4)) },
            ];
            // A directory of its own (the room id): map-storage empties the upload directory first.
            const upload = await uploadArchive(payload.directory, buildZip(entries));
            if (upload.status === "unauthorized") {
                throw syncFailure("unauthorized", "map-storage refused the token (401/403)", true);
            }
            if (upload.status === "rejected") {
                throw syncFailure("mapRejected", `map-storage refused the map (${upload.httpStatus ?? 400})`, true);
            }
            if (upload.status !== "ok") {
                throw syncFailure("unavailable", `map-storage is not reachable (${upload.httpStatus ?? "network"})`);
            }
            const target = await wamTarget(wamUrl);
            const check = target ? await getWam(target) : undefined;
            if (check?.status !== "ok")
                throw syncFailure("unavailable", "the uploaded room is not readable on map-storage yet");
            // Usable from now on, at the template's size, even if a later step fails.
            await markRoom(payload.roomId, { wamUrl, collectionLinkedAt: new Date() });
        }

        // The chosen size, applied after the upload so that any template can be any size. Absolute: a retry
        // resizes a room that already has this size to the same size, which changes nothing.
        let sizeRefused: string | undefined;
        if (payload.size && (payload.size.width !== template.width || payload.size.height !== template.height)) {
            const resized = await resizeRoom(
                row.world,
                { id: row.room.id, mapKind: "wam", wamUrl, syncError: row.room.syncError },
                // "top": the room grows evenly on both sides and downwards, its doorway stays bottom middle.
                { ...payload.size, anchor: "top", fill: "extend" },
                false,
            );
            if (resized.status === "problem") {
                if (resized.problem === "unauthorized") {
                    throw syncFailure("unauthorized", "map-storage refused the token (401/403)", true);
                }
                if (!isPermanentSizeProblem(resized.problem)) {
                    throw syncFailure(
                        "unavailable",
                        `map-storage did not resize the room (${resized.httpStatus ?? "network"})`,
                    );
                }
                sizeRefused = `${resized.problem}${resized.reason ? `:${resized.reason}` : ""}`;
            }
        }

        if (payload.doors && payload.doors.targets.length > 0) {
            await addDoors(row.world.id, payload.roomId, wamUrl, payload.doors);
        }

        if (sizeRefused) {
            // The room works at its template's size; its page explains it and offers another size.
            throw syncFailure("resizeRejected", `map-storage refused the room size (${sizeRefused})`, true);
        }
        await markRoom(payload.roomId, { wamUrl, syncState: "ready", syncError: null });
        return { wamUrl, ...(payload.size ? { size: payload.size } : {}) };
    },
    { onFailure: recordFailure },
);

// ---------------------------------------------------------------------------------------------
// Doors: WAM exit areas to other rooms of the world (the "Create office" wizard)
// ---------------------------------------------------------------------------------------------

/** Pixel rectangles of the furniture placed in a room (AdminSpace prefabs; their image sizes are known). */
async function furnitureRects(
    worldId: string,
    entities: Record<string, { x?: unknown; y?: unknown; prefabRef?: { id?: unknown } }>,
): Promise<PixelRect[]> {
    const installed = await db()
        .select({ componentId: schema.componentInstallations.componentId, version: schema.componentVersions })
        .from(schema.componentInstallations)
        .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentInstallations.versionId))
        .where(eq(schema.componentInstallations.worldId, worldId));
    const files = await assetsOf(installed.map((i) => i.version.id));
    const sizes = new Map<string, { width: number; height: number }>();
    for (const { componentId, version } of installed) {
        for (const variant of (version.manifest as ComponentManifest).entity?.variants ?? []) {
            const file = files.get(version.id)?.get(variant.image);
            if (file?.width && file.height) {
                sizes.set(prefabId(componentId, variant.key), { width: file.width, height: file.height });
            }
        }
    }
    const rects: PixelRect[] = [];
    for (const entity of Object.values(entities)) {
        const id = typeof entity.prefabRef?.id === "string" ? entity.prefabRef.id : "";
        if (typeof entity.x !== "number" || typeof entity.y !== "number") continue;
        // Unknown prefabs (not AdminSpace's) count as one tile: better a door a little further than on a sofa.
        const size = sizes.get(id) ?? (componentIdOfPrefab(id) ? undefined : { width: 32, height: 32 });
        rects.push({ x: entity.x, y: entity.y, width: size?.width ?? 32, height: size?.height ?? 32 });
    }
    return rects;
}

/** Adds the missing doors of a room (stable ids: a retry adds nothing twice). */
async function addDoors(
    worldId: string,
    roomId: string,
    wamUrl: string,
    doors: z.infer<typeof DoorsPayload>,
): Promise<void> {
    const read = await readRoomMap(wamUrl);
    if (read.status !== "ok") {
        throw syncFailure(
            read.status === "unavailable" ? "unavailable" : "rejected",
            `the room's map could not be read to add its doors (${read.status})`,
            read.status !== "unavailable",
        );
    }
    const { map, wam } = read.value;
    const areas = wam.areas as { id?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown }[];
    const existingIds = new Set(areas.map((a) => a.id));
    const areaRects: PixelRect[] = areas.flatMap((a) =>
        typeof a.x === "number" &&
        typeof a.y === "number" &&
        typeof a.width === "number" &&
        typeof a.height === "number"
            ? [{ x: a.x, y: a.y, width: a.width, height: a.height }]
            : [],
    );
    const entities = ((wam as { entities?: unknown }).entities ?? {}) as Record<
        string,
        { x?: unknown; y?: unknown; prefabRef?: { id?: unknown } }
    >;
    const cells = placeDoors({
        map,
        obstacles: [...(await furnitureRects(worldId, entities)), ...areaRects],
        count: doors.targets.length,
        placement: doors.placement,
    });
    if (cells.length < doors.targets.length) {
        logJson("warn", "not every door fits in the room", {
            roomId,
            doors: doors.targets.length,
            placed: cells.length,
            size: `${map.width}x${map.height}`,
        });
    }
    const additions = doors.targets
        .slice(0, cells.length)
        .map((target, index) =>
            exitArea({
                seed: `${roomId}:${target.url}`,
                name: target.name,
                url: target.url,
                cells: cells[index]!,
                tileWidth: map.tilewidth,
                tileHeight: map.tileheight,
            }),
        )
        .filter((area) => !existingIds.has(area.id));
    if (additions.length === 0) return;
    const target = await wamTarget(wamUrl);
    if (!target) throw syncFailure("unexpected", "the room's map is not on the configured map-storage", true);
    // Conditional on the areas read above: a concurrent edit fails the patch and the job retries on fresh data.
    const patch = await patchWam(target, [
        { op: "test", path: "/areas", value: wam.areas },
        ...additions.map((area) => ({ op: "add" as const, path: "/areas/-", value: area })),
    ]);
    if (patch.status === "unauthorized")
        throw syncFailure("unauthorized", "map-storage refused the token (401/403)", true);
    if (patch.status !== "ok") {
        throw syncFailure(
            patch.status === "unavailable" ? "unavailable" : "rejected",
            `map-storage refused the doors (${patch.httpStatus ?? "network"})`,
        );
    }
}

// ---------------------------------------------------------------------------------------------
// room.resize: bulk resize of rooms (one job per room, per-room results)
// ---------------------------------------------------------------------------------------------

/**
 * The error of a failed resize job starts with a code the results page translates: "<problem>[:<reason>]".
 * 4xx answers fail at once (PermanentJobError); 5xx and network errors are retried with backoff.
 */
registerJobHandler("room.resize", async (job) => {
    const payload = ResizePayload.parse(job.payload);
    const row = await roomOf(job, payload.roomId, payload.worldId);
    if (!row) throw new PermanentJobError("roomGone");
    const options: ResizeOptions = {
        width: payload.width,
        height: payload.height,
        anchor: payload.anchor,
        fill: payload.fill,
    };
    const result = await resizeRoom(row.world, row.room, options, false);
    if (result.status === "problem") {
        const code = `${result.problem}${result.reason ? `:${result.reason}` : ""}`;
        const detail = `${code} (${result.httpStatus ?? "no answer"})`;
        throw isPermanentSizeProblem(result.problem) ? new PermanentJobError(detail) : new Error(detail);
    }
    const creator = job.createdBy
        ? await db().query.accounts.findFirst({ where: eq(schema.accounts.id, job.createdBy) })
        : undefined;
    const { summary } = result;
    await audit({
        action: "room.resize",
        account: creator ? { id: creator.id, email: creator.email } : null,
        actorLabel: "system:jobs",
        organizationId: row.world.organizationId,
        worldId: row.world.id,
        targetType: "room",
        targetId: row.room.id,
        details: {
            batchId: payload.batchId,
            from: `${summary.from.width}x${summary.from.height}`,
            to: `${summary.to.width}x${summary.to.height}`,
            anchor: payload.anchor,
            fill: payload.fill,
            movedObjects: summary.movedObjects,
            movedAreas: summary.movedAreas,
            via: "bulk",
        },
    });
    return { summary };
});
