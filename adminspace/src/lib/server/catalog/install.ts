/**
 * Components in worlds: compatibility, installation, update, removal, the collection file WorkAdventure
 * loads, and rooms created from templates.
 *
 * How furniture reaches WorkAdventure's map editor (verified, see docs/ENTERPRISE_ARCHITECTURE.md): the
 * editor loads the entity collections listed in each room's WAM file. AdminSpace serves ONE collection
 * file per world (/wa/worlds/{id}/collection.json, built from the world's installations) and adds its URL
 * to every WAM room of the world once, through a durable job (wam.link_collection). Installing more
 * components afterwards only changes the file: no further map change.
 */
import { and, eq, inArray, isNull, like, ne, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { config } from "../config";
import { componentIdOfPrefab, prefabId, isHostedTemplateMap, type ComponentManifest } from "../../catalog/manifest";
import { enqueueJob } from "../services/jobs";
import { checkRateLimit } from "../security/rateLimit";
import { assetPath, assetsOf, latestPublishedVersions } from "./store";
import { getWam, mapStoragePublicUrl, organizationDirectory, wamTarget, type MapStorageTarget } from "./mapStorage";

type Transaction = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
type Room = typeof schema.rooms.$inferSelect;
type World = typeof schema.worlds.$inferSelect;

/**
 * Public origin of this server as WorkAdventure players' browsers reach it (ORIGIN). Collection and
 * asset URLs written into maps are absolute: WorkAdventure does not resolve relative collection URLs.
 */
export function playerFacingOrigin(): string | undefined {
    const origin = config().ORIGIN;
    return origin ? new URL(origin).origin : undefined;
}

export function worldCollectionUrl(worldId: string): string | undefined {
    const origin = playerFacingOrigin();
    return origin ? `${origin}/wa/worlds/${worldId}/collection.json` : undefined;
}

export type RoomCompatibility = "ready" | "tiled" | "otherMapStorage" | "otherOrganization" | "noMap";

export interface RoomStatus {
    id: string;
    name: string;
    slug: string;
    compatibility: RoomCompatibility;
    linked: boolean;
    syncState: Room["syncState"];
    syncError: string | null;
}

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Whether AdminSpace may change a WAM file on behalf of an organization. The platform's map-storage token
 * can write any map, and a room's map URL is chosen by the organization: so AdminSpace only writes in the
 * organization's own directory, or in a map outside AdminSpace's directories that no room of another
 * organization uses.
 */
export async function wamWritableBy(organizationId: string, target: MapStorageTarget): Promise<boolean> {
    if (target.path.startsWith("adminspace/")) {
        return target.path.startsWith(`${organizationDirectory(organizationId)}/`);
    }
    const others = await db()
        .select({ wamUrl: schema.rooms.wamUrl })
        .from(schema.rooms)
        .innerJoin(schema.worlds, eq(schema.worlds.id, schema.rooms.worldId))
        .where(
            and(
                ne(schema.worlds.organizationId, organizationId),
                eq(schema.rooms.mapKind, "wam"),
                like(schema.rooms.wamUrl, `%${escapeLike(target.path)}%`),
            ),
        );
    for (const other of others) {
        if ((await wamTarget(other.wamUrl))?.path === target.path) return false;
    }
    return true;
}

/**
 * Counts one component change of an organization (upload, install, removal, room from a template, repair)
 * and tells whether it is within RATE_LIMIT_COMPONENT_CHANGES_PER_ORGANIZATION per hour: each change
 * queues work for map-storage and the shared job worker.
 */
export async function componentChangeAllowed(organizationId: string): Promise<boolean> {
    const limit = config().RATE_LIMIT_COMPONENT_CHANGES_PER_ORGANIZATION;
    return (await checkRateLimit(`components:org:${organizationId}`, limit, 3600)).allowed;
}

/** True when a WAM URL designates a map that belongs to another organization (refused for rooms). */
export async function mapOfAnotherOrganization(organizationId: string, wamUrl: string): Promise<boolean> {
    const target = await wamTarget(wamUrl);
    return target !== undefined && !(await wamWritableBy(organizationId, target));
}

/**
 * Whether each room can receive AdminSpace furniture: a WAM map on the configured map-storage that the
 * organization may change (`wamWritableBy`).
 */
export async function roomStatuses(world: Pick<World, "id" | "organizationId">): Promise<RoomStatus[]> {
    const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.worldId, world.id) });
    return Promise.all(
        rooms.map(async (room) => {
            let compatibility: RoomCompatibility;
            const target = room.mapKind === "wam" ? await wamTarget(room.wamUrl) : undefined;
            if (room.mapKind === "tmj") compatibility = "tiled";
            else if (!room.wamUrl) compatibility = "noMap";
            else if (!target) compatibility = "otherMapStorage";
            else compatibility = (await wamWritableBy(world.organizationId, target)) ? "ready" : "otherOrganization";
            return {
                id: room.id,
                name: room.name,
                slug: room.slug,
                compatibility,
                linked: room.collectionLinkedAt !== null,
                syncState: room.syncState,
                syncError: room.syncError,
            };
        }),
    );
}

/** Records the link jobs of the world's compatible rooms (idempotent per room). */
async function enqueueLinks(
    tx: Transaction,
    world: World,
    rooms: RoomStatus[],
    actorId: string | null,
): Promise<number> {
    const targets = rooms.filter((r) => r.compatibility === "ready");
    for (const room of targets) {
        await enqueueJob(tx, {
            kind: "wam.link_collection",
            organizationId: world.organizationId,
            payload: { roomId: room.id, worldId: world.id },
            idempotencyKey: `wam-link:${room.id}`,
            createdBy: actorId,
        });
    }
    if (targets.length > 0) {
        await tx
            .update(schema.rooms)
            .set({ syncState: "pending", syncError: null })
            .where(
                and(
                    inArray(
                        schema.rooms.id,
                        targets.map((r) => r.id),
                    ),
                    isNull(schema.rooms.collectionLinkedAt),
                ),
            );
    }
    return targets.length;
}

/** A published component the organization may use: its own or the platform's. */
async function usableComponent(organizationId: string, componentId: string) {
    const [component] = await db()
        .select()
        .from(schema.components)
        .where(
            and(
                eq(schema.components.id, componentId),
                eq(schema.components.status, "published"),
                sql`(${schema.components.organizationId} is null or ${schema.components.organizationId} = ${organizationId})`,
            ),
        );
    if (!component) return undefined;
    const version = (await latestPublishedVersions([component.id])).get(component.id);
    return version ? { component, version } : undefined;
}

export type InstallResult =
    | { result: "installed" | "updated" | "unchanged"; linkedRooms: number }
    | { result: "notFound" }
    | { result: "notEntity" }
    | { result: "incompatible" }
    | { result: "originMissing" };

/** Installs (or updates to the newest version) an entity component in a world of the organization. */
export async function installComponent(input: {
    world: World;
    componentId: string;
    actorId: string | null;
}): Promise<InstallResult> {
    const { world } = input;
    const usable = await usableComponent(world.organizationId, input.componentId);
    if (!usable) return { result: "notFound" };
    if (usable.component.kind !== "entity") return { result: "notEntity" };
    if (!worldCollectionUrl(world.id)) return { result: "originMissing" };
    const rooms = await roomStatuses(world);
    if (!rooms.some((r) => r.compatibility === "ready")) return { result: "incompatible" };

    return db().transaction(async (tx): Promise<InstallResult> => {
        const [existing] = await tx
            .select()
            .from(schema.componentInstallations)
            .where(
                and(
                    eq(schema.componentInstallations.worldId, world.id),
                    eq(schema.componentInstallations.componentId, usable.component.id),
                ),
            )
            .for("update");
        if (existing?.versionId === usable.version.id) {
            return { result: "unchanged", linkedRooms: rooms.filter((r) => r.linked).length };
        }
        if (existing) {
            await tx
                .update(schema.componentInstallations)
                .set({ versionId: usable.version.id, installedBy: input.actorId })
                .where(eq(schema.componentInstallations.id, existing.id));
        } else {
            await tx.insert(schema.componentInstallations).values({
                organizationId: world.organizationId,
                worldId: world.id,
                componentId: usable.component.id,
                versionId: usable.version.id,
                installedBy: input.actorId,
            });
        }
        const linkedRooms = await enqueueLinks(tx, world, rooms, input.actorId);
        return { result: existing ? "updated" : "installed", linkedRooms };
    });
}

export type UninstallResult =
    | { result: "removed" }
    | { result: "notInstalled" }
    | { result: "inUse"; rooms: { name: string; count: number }[] }
    | { result: "cannotVerify"; rooms: string[] };

/**
 * Removes a component from a world, unless pieces of it are placed in a room: removing it would leave
 * WorkAdventure with references to prefabs it cannot find. When a room's map cannot be read, removal is
 * refused too (it cannot be proven safe).
 */
export async function uninstallComponent(world: World, componentId: string): Promise<UninstallResult> {
    const installation = await db().query.componentInstallations.findFirst({
        where: and(
            eq(schema.componentInstallations.worldId, world.id),
            eq(schema.componentInstallations.organizationId, world.organizationId),
            eq(schema.componentInstallations.componentId, componentId),
        ),
    });
    if (!installation) return { result: "notInstalled" };
    const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.worldId, world.id) });
    const inUse: { name: string; count: number }[] = [];
    const unreadable: string[] = [];
    for (const room of rooms.filter((r) => r.mapKind === "wam" && r.collectionLinkedAt)) {
        const target = await wamTarget(room.wamUrl);
        // Maps of other organizations are never read (nor written) for this one.
        if (!target || !(await wamWritableBy(world.organizationId, target))) continue;
        const wam = await getWam(target);
        if (wam.status !== "ok") {
            unreadable.push(room.name);
            continue;
        }
        const count = Object.values(wam.value.entities).filter(
            (e) => componentIdOfPrefab(e.prefabRef.id) === componentId,
        ).length;
        if (count > 0) inUse.push({ name: room.name, count });
    }
    if (inUse.length > 0) return { result: "inUse", rooms: inUse };
    if (unreadable.length > 0) return { result: "cannotVerify", rooms: unreadable };
    await db().delete(schema.componentInstallations).where(eq(schema.componentInstallations.id, installation.id));
    return { result: "removed" };
}

/** Re-checks every compatible room of a world (the link job verifies the WAM and repairs it). */
export async function reconcileWorld(world: World, actorId: string | null): Promise<number> {
    const rooms = await roomStatuses(world);
    return db().transaction(async (tx) => {
        await tx.update(schema.rooms).set({ collectionLinkedAt: null }).where(eq(schema.rooms.worldId, world.id));
        return enqueueLinks(tx, world, rooms, actorId);
    });
}

/** When a WAM room is added to a world that has components, it gets the collection too. */
export async function linkNewRoom(world: World, actorId: string | null): Promise<void> {
    const [installed] = await db()
        .select({ value: sql<number>`count(*)::int` })
        .from(schema.componentInstallations)
        .where(eq(schema.componentInstallations.worldId, world.id));
    if (!installed?.value) return;
    const rooms = (await roomStatuses(world)).filter((r) => !r.linked);
    await db().transaction((tx) => enqueueLinks(tx, world, rooms, actorId));
}

/** Map-storage directory of a room created from a template (re-derived by the job, never trusted). */
export function templateDirectory(world: Pick<World, "id" | "organizationId">, roomId: string): string {
    return `${organizationDirectory(world.organizationId)}/${world.id}/${roomId}`;
}

export interface InstalledComponent {
    componentId: string;
    name: string;
    kind: string;
    category: string;
    version: string;
    latestVersion: string | null;
    installedAt: string;
}

export async function listInstalled(world: World): Promise<InstalledComponent[]> {
    const rows = await db()
        .select({
            installation: schema.componentInstallations,
            component: schema.components,
            version: schema.componentVersions,
        })
        .from(schema.componentInstallations)
        .innerJoin(schema.components, eq(schema.components.id, schema.componentInstallations.componentId))
        .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentInstallations.versionId))
        .where(
            and(
                eq(schema.componentInstallations.worldId, world.id),
                eq(schema.componentInstallations.organizationId, world.organizationId),
            ),
        );
    const latest = await latestPublishedVersions(rows.map((r) => r.component.id));
    return rows.map(({ installation, component, version }) => ({
        componentId: component.id,
        name: component.name,
        kind: component.kind,
        category: component.category,
        version: version.version,
        latestVersion: latest.get(component.id)?.version ?? null,
        installedAt: installation.installedAt.toISOString(),
    }));
}

/** Worlds of the organization where a component is installed (component detail page). */
export async function installationsOf(
    organizationId: string,
    componentId: string,
): Promise<{ worldId: string; version: string }[]> {
    const rows = await db()
        .select({ worldId: schema.componentInstallations.worldId, version: schema.componentVersions.version })
        .from(schema.componentInstallations)
        .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentInstallations.versionId))
        .where(
            and(
                eq(schema.componentInstallations.organizationId, organizationId),
                eq(schema.componentInstallations.componentId, componentId),
            ),
        );
    return rows;
}

// ---------------------------------------------------------------------------------------------
// The collection file (libs/map-editor EntityCollectionRaw, version "1.0")
// ---------------------------------------------------------------------------------------------

export interface EntityCollectionFile {
    collectionName: string;
    tags: string[];
    version: "1.0";
    collection: {
        id: string;
        name: string;
        tags: string[];
        imagePath: string;
        direction: string;
        color: string;
        collisionGrid?: number[][];
        depthOffset?: number;
    }[];
}

export function collectionName(organizationName: string): string {
    return `${organizationName} · AdminSpace`;
}

/**
 * The entity collection of a world: every variant of every installed entity component. Undefined when
 * the world does not exist, is archived, or belongs to a suspended organization.
 */
export async function buildWorldCollection(worldId: string): Promise<EntityCollectionFile | undefined> {
    const origin = playerFacingOrigin();
    if (!origin) return undefined;
    const [world] = await db()
        .select({ world: schema.worlds, organization: schema.organizations })
        .from(schema.worlds)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(eq(schema.worlds.id, worldId));
    if (!world || world.world.archivedAt || world.organization.status !== "active") return undefined;
    const rows = await db()
        .select({ componentId: schema.componentInstallations.componentId, version: schema.componentVersions })
        .from(schema.componentInstallations)
        .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentInstallations.versionId))
        .innerJoin(schema.components, eq(schema.components.id, schema.componentInstallations.componentId))
        .where(and(eq(schema.componentInstallations.worldId, worldId), ne(schema.components.status, "draft")));
    const files = await assetsOf(rows.map((r) => r.version.id));
    const collection: EntityCollectionFile["collection"] = [];
    for (const { componentId, version } of rows) {
        const manifest = version.manifest as ComponentManifest;
        for (const variant of manifest.entity?.variants ?? []) {
            const file = files.get(version.id)?.get(variant.image);
            if (!file) continue;
            collection.push({
                id: prefabId(componentId, variant.key),
                name: manifest.name,
                tags: [manifest.category, ...manifest.tags],
                imagePath: `${origin}${assetPath(version.id, file.sha256, file.contentType)}`,
                direction: variant.direction,
                color: variant.color,
                ...(variant.collisionGrid ? { collisionGrid: variant.collisionGrid } : {}),
                ...(variant.depthOffset !== undefined ? { depthOffset: variant.depthOffset } : {}),
            });
        }
    }
    return { collectionName: collectionName(world.organization.name), tags: [], version: "1.0", collection };
}

// ---------------------------------------------------------------------------------------------
// Rooms from templates
// ---------------------------------------------------------------------------------------------

export type TemplateResult =
    | { result: "created"; roomId: string; roomSlug: string }
    | { result: "notFound" }
    | { result: "notTemplate" }
    | { result: "sizeUnsupported" }
    | { result: "dependencyMissing"; keys: string[] }
    | { result: "slugTaken" }
    | { result: "originMissing" }
    | { result: "mapStorageMissing" };

/**
 * Creates a room from a room template: the room row (state "pending", no map yet), the installation of
 * the furniture it places, and the job that uploads the map to map-storage into a directory of its own
 * (adminspace/{organization id}/{world id}/{room id}, `templateDirectory`) so that nothing existing can be
 * overwritten and no other organization's map is ever a target.
 */
export async function createRoomFromTemplate(input: {
    world: World;
    componentId: string;
    name: string;
    slug: string;
    actorId: string | null;
    /** Keep a new world, its first room and the provisioning job in the same transaction. */
    transaction?: Transaction;
    /** Size the room gets right after the upload (map-storage resize, fill "extend"); absent: the template's. */
    size?: { width: number; height: number } | undefined;
    /** Exits to other rooms of the world, added after the size (the "Create office" wizard). */
    doors?: { placement: "entrance" | "walls"; targets: { name: string; url: string }[] } | undefined;
}): Promise<TemplateResult> {
    const { world } = input;
    const usable = await usableComponent(world.organizationId, input.componentId);
    if (!usable) return { result: "notFound" };
    if (usable.component.kind !== "room_template") return { result: "notTemplate" };
    if (!worldCollectionUrl(world.id)) return { result: "originMissing" };
    if (!(await mapStoragePublicUrl(""))) return { result: "mapStorageMissing" };
    const manifest = usable.version.manifest as ComponentManifest;
    if (manifest.template && isHostedTemplateMap(manifest.template.map) && input.size) {
        return { result: "sizeUnsupported" };
    }
    const requires = manifest.template?.requires ?? [];
    // Required furniture: the organization's own component of that key first, else the platform's.
    const candidates = requires.length
        ? await db()
              .select()
              .from(schema.components)
              .where(
                  and(
                      inArray(schema.components.key, requires),
                      eq(schema.components.status, "published"),
                      eq(schema.components.kind, "entity"),
                      sql`(${schema.components.organizationId} is null or ${schema.components.organizationId} = ${world.organizationId})`,
                  ),
              )
        : [];
    const byKey = new Map<string, (typeof candidates)[number]>();
    for (const c of candidates) {
        const current = byKey.get(c.key);
        if (!current || (current.organizationId === null && c.organizationId !== null)) byKey.set(c.key, c);
    }
    const missing = requires.filter((k) => !byKey.has(k));
    if (missing.length > 0) return { result: "dependencyMissing", keys: missing };
    const versions = await latestPublishedVersions([...byKey.values()].map((c) => c.id));

    try {
        const provision = async (tx: Transaction): Promise<TemplateResult> => {
            const [room] = await tx
                .insert(schema.rooms)
                .values({
                    worldId: world.id,
                    slug: input.slug,
                    name: input.name,
                    mapKind: "wam",
                    wamUrl: null,
                    syncState: "pending",
                    templateVersionId: usable.version.id,
                    position: sql`(select coalesce(max(position), -1) + 1 from rooms where world_id = ${world.id})`,
                })
                .returning({ id: schema.rooms.id, slug: schema.rooms.slug });
            if (!room) throw new Error("Room creation returned no row");
            for (const component of byKey.values()) {
                const version = versions.get(component.id);
                if (!version) continue;
                await tx
                    .insert(schema.componentInstallations)
                    .values({
                        organizationId: world.organizationId,
                        worldId: world.id,
                        componentId: component.id,
                        versionId: version.id,
                        installedBy: input.actorId,
                    })
                    .onConflictDoNothing();
            }
            await enqueueJob(tx, {
                kind: "room.provision_template",
                organizationId: world.organizationId,
                payload: {
                    roomId: room.id,
                    worldId: world.id,
                    versionId: usable.version.id,
                    directory: templateDirectory(world, room.id),
                    components: Object.fromEntries([...byKey.values()].map((c) => [c.key, c.id])),
                    ...(input.size ? { size: input.size } : {}),
                    ...(input.doors ? { doors: input.doors } : {}),
                },
                idempotencyKey: `provision:${room.id}`,
                createdBy: input.actorId,
            });
            return { result: "created", roomId: room.id, roomSlug: room.slug };
        };
        return await (input.transaction ? provision(input.transaction) : db().transaction(provision));
    } catch (error) {
        if ((error as { code?: string }).code === "23505") return { result: "slugTaken" };
        throw error;
    }
}
