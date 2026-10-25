/**
 * Room sizes against the real database and a local fake map-storage (tests/support/fakeMapStorage.ts): reading a
 * room's size, dry runs and resizes, refusals per status, rooms from templates created at a chosen size (in the same
 * job, after the upload), bulk resizes as jobs (retried on 5xx, not on 4xx, per-room results, access checks), and
 * the "Create an office" wizard with its doors. Everything is created under "size-test-*" and deleted after; instance
 * settings are restored.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, like, sql } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { buildAccess, type OrganizationAccess } from "../src/lib/server/auth/rbac";
import { importCatalogDirectory } from "../src/lib/server/catalog/builtin";
import { createRoomFromTemplate, templateDirectory } from "../src/lib/server/catalog/install";
import { saveInstanceSettings } from "../src/lib/server/services/instance";
import { enqueueJob, runDueJobs } from "../src/lib/server/services/jobs";
import { currentRoomSize, resizeRoom } from "../src/lib/server/services/roomSize";
import { applyBulkResize, bulkResults, previewBulkResize } from "../src/lib/server/services/bulkResize";
import { createOffice } from "../src/lib/server/services/office";
import { readInstanceSettings } from "../src/lib/settings/instanceSettings";
import { planOffice } from "../src/lib/rooms/office";
import "../src/lib/server/services/jobHandlers";
import { startFakeMapStorage, type FakeMapStorage } from "./support/fakeMapStorage";

const SUFFIX = Date.now().toString(36);
const ORG = `size-test-${SUFFIX}`;
const TOKEN = "map-storage-token-for-size-tests-0123456789";

let fake: FakeMapStorage;
let savedSettings: unknown;
let organization: typeof schema.organizations.$inferSelect;
let otherOrganizationId = "";
let workspaceA = "";
let workspaceB = "";
let world: typeof schema.worlds.$inferSelect;
let accountId = "";
let admin: OrganizationAccess;
let managerOfB: OrganizationAccess;

/** A room on the fake map-storage with a Tiled map of the given size (walls on the edges). */
function putMap(directory: string, width: number, height: number, extra: Record<string, unknown> = {}): string {
    const wall = (x: number, y: number) => x === 0 || y === 0 || x === width - 1 || y === height - 1;
    fake.put(`${directory}/map.tmj`, {
        type: "map",
        width,
        height,
        tilewidth: 32,
        tileheight: 32,
        infinite: false,
        layers: [
            {
                name: "walls",
                type: "tilelayer",
                width,
                height,
                data: Array.from({ length: width * height }, (_, i) =>
                    wall(i % width, Math.floor(i / width)) ? 1 : 0,
                ),
            },
        ],
        tilesets: [{ firstgid: 1, tiles: [{ id: 0, properties: [{ name: "collides", type: "bool", value: true }] }] }],
        ...extra,
    });
    fake.put(`${directory}/map.wam`, {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities: { chair: { x: (width - 2) * 32, y: 64, prefabRef: { collectionName: "x", id: "y" } } },
        areas: [],
        entityCollections: [],
    });
    return `${fake.url}/${directory}/map.wam`;
}

async function insertRoom(slug: string, fields: Partial<typeof schema.rooms.$inferInsert>) {
    const [room] = await db()
        .insert(schema.rooms)
        .values({ worldId: world.id, slug, name: slug, mapKind: "wam", ...fields })
        .returning();
    return room!;
}

/**
 * Runs the job queue until nothing is due (jobs waiting for a retry delay stay pending). Another process working the
 * same queue (a dev server's job worker on the .env database) would take some of these jobs: run the database tests
 * with JOB_WORKER=false there, or against a database of their own.
 */
async function drainJobs(): Promise<void> {
    for (let i = 0; i < 50 && (await runDueJobs(20)) > 0; i++) {
        // keep going
    }
}

async function jobOf(kind: string, roomId: string) {
    const [job] = await db()
        .select()
        .from(schema.jobs)
        .where(and(eq(schema.jobs.kind, kind), sql`${schema.jobs.payload}->>'roomId' = ${roomId}`))
        .orderBy(sql`${schema.jobs.createdAt} desc`)
        .limit(1);
    return job!;
}

beforeAll(async () => {
    fake = await startFakeMapStorage(TOKEN);
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    savedSettings = row?.settings ?? {};
    await saveInstanceSettings({
        ...readInstanceSettings(savedSettings),
        playUrl: "http://play.size-test.example",
        mapStoragePublicUrl: fake.url,
        mapStorageInternalUrl: fake.url,
        mapStorageApiToken: TOKEN,
    });
    const [org] = await db().insert(schema.organizations).values({ slug: ORG, name: "Size test" }).returning();
    const [other] = await db()
        .insert(schema.organizations)
        .values({ slug: `${ORG}-other`, name: "Size other" })
        .returning();
    organization = org!;
    otherOrganizationId = other!.id;
    const [a] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "a", name: "A" })
        .returning();
    const [b] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "b", name: "B" })
        .returning();
    workspaceA = a!.id;
    workspaceB = b!.id;
    const [w] = await db()
        .insert(schema.worlds)
        .values({ organizationId: organization.id, workspaceId: workspaceA, slug: "hq", name: "HQ" })
        .returning();
    world = w!;
    const [account] = await db()
        .insert(schema.accounts)
        .values({ email: `admin-${SUFFIX}@size.test`, name: "Admin", passwordHash: "x", emailVerifiedAt: new Date() })
        .returning();
    accountId = account!.id;
    admin = buildAccess({ organization, role: "admin", workspaceRoles: new Map(), support: undefined });
    managerOfB = buildAccess({
        organization,
        role: "employee",
        workspaceRoles: new Map([[workspaceB, "manager" as const]]),
        support: undefined,
    });
    await importCatalogDirectory("catalog/builtin");
});

afterAll(async () => {
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${ORG}%`));
    await db().delete(schema.accounts).where(eq(schema.accounts.id, accountId));
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: savedSettings as object })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: savedSettings as object } });
    await fake.close();
    await closeDb();
});

describe("one room", () => {
    it("reads the size from the Tiled map the WAM file points to", async () => {
        const room = await insertRoom("small", { wamUrl: putMap("rooms/small", 20, 15) });
        expect(await currentRoomSize(world, room)).toEqual({
            status: "ok",
            size: { width: 20, height: 15, tileWidth: 32, tileHeight: 32, infinite: false },
        });
    });

    it("refuses maps AdminSpace may not read or change", async () => {
        const tiled = await insertRoom("tiled", { mapKind: "tmj", mapUrl: "https://maps.test/a.tmj" });
        expect(await currentRoomSize(world, tiled)).toEqual({ status: "problem", problem: "tiled" });
        const elsewhere = await insertRoom("elsewhere", { wamUrl: "https://maps.elsewhere.test/a.wam" });
        expect(await currentRoomSize(world, elsewhere)).toEqual({ status: "problem", problem: "notOnMapStorage" });
        const theirs = await insertRoom("theirs", {
            wamUrl: putMap(`adminspace/${otherOrganizationId}/w/r`, 10, 10),
        });
        expect(await currentRoomSize(world, theirs)).toEqual({ status: "problem", problem: "otherOrganization" });
        expect(
            (await resizeRoom(world, theirs, { width: 20, height: 20, anchor: "top-left", fill: "extend" }, true))
                .status,
        ).toBe("problem");
        fake.put("rooms/external/map.wam", {
            version: "2.1.0",
            mapUrl: "https://cdn.test/map.tmj",
            entities: {},
            areas: [],
        });
        const external = await insertRoom("external", { wamUrl: `${fake.url}/rooms/external/map.wam` });
        expect(await currentRoomSize(world, external)).toEqual({ status: "problem", problem: "external" });
        const gone = await insertRoom("gone", { wamUrl: `${fake.url}/rooms/gone/map.wam` });
        expect(await currentRoomSize(world, gone)).toEqual({ status: "problem", problem: "notFound" });
    });

    it("previews without changing anything, then resizes with the chosen anchor and fill", async () => {
        const room = await insertRoom("growing", { wamUrl: putMap("rooms/growing", 20, 15) });
        const options = { width: 32, height: 24, anchor: "center", fill: "extend" } as const;
        const preview = await resizeRoom(world, room, options, true);
        expect(preview).toMatchObject({ status: "ok", summary: { columns: 12, rows: 9, movedObjects: 0 } });
        expect((fake.json("rooms/growing/map.tmj") as { width: number }).width).toBe(20);
        expect(fake.resizes.at(-1)).toMatchObject({ wamUrl: room.wamUrl, ...options, dryRun: true });

        const done = await resizeRoom(world, room, options, false);
        expect(done.status).toBe("ok");
        expect(fake.json("rooms/growing/map.tmj")).toMatchObject({ width: 32, height: 24 });
        expect(await currentRoomSize(world, room)).toMatchObject({ size: { width: 32, height: 24 } });
        // Shrinking with "empty" crops the map: the chair near the right edge has to move.
        const crop = await resizeRoom(world, room, { width: 10, height: 24, anchor: "top-left", fill: "empty" }, true);
        expect(crop).toMatchObject({ status: "ok", summary: { columns: -22, movedObjects: 1 } });
    });

    it("explains each refusal of map-storage", async () => {
        const room = await insertRoom("stubborn", { wamUrl: putMap("rooms/stubborn", 20, 15) });
        const options = { width: 30, height: 20, anchor: "top-left", fill: "extend" } as const;
        fake.resizeFailures.set("rooms/stubborn/map.wam", {
            status: 422,
            error: 'The layer "floor" is compressed (zlib). Save the map in Tiled with the CSV layer format.',
        });
        expect(await resizeRoom(world, room, options, true)).toMatchObject({
            status: "problem",
            problem: "unresizable",
            reason: "compressed",
            httpStatus: 422,
            detail: expect.stringContaining("compressed") as string,
        });
        fake.resizeFailures.delete("rooms/stubborn/map.wam");
        fake.down = 503;
        expect(await resizeRoom(world, room, options, true)).toMatchObject({ problem: "unavailable", httpStatus: 503 });
        fake.down = 401;
        expect(await resizeRoom(world, room, options, true)).toMatchObject({ problem: "unauthorized" });
        fake.down = undefined;
        fake.put("rooms/infinite/map.wam", { version: "2.1.0", mapUrl: "./map.tmj", entities: {}, areas: [] });
        fake.put("rooms/infinite/map.tmj", {
            width: 10,
            height: 10,
            tilewidth: 32,
            tileheight: 32,
            infinite: true,
            layers: [],
        });
        const infinite = await insertRoom("infinite", { wamUrl: `${fake.url}/rooms/infinite/map.wam` });
        expect(await resizeRoom(world, infinite, options, true)).toMatchObject({
            problem: "unresizable",
            reason: "infinite",
        });
    });
});

describe("rooms from templates", () => {
    async function template(key: string): Promise<string> {
        const component = await db().query.components.findFirst({
            where: and(eq(schema.components.key, key), eq(schema.components.kind, "room_template")),
        });
        return component!.id;
    }

    it("uploads the template, then resizes it to the chosen size in the same job", async () => {
        const created = await createRoomFromTemplate({
            world,
            componentId: await template("meeting-room"),
            name: "Board room",
            slug: "board-room",
            actorId: accountId,
            size: { width: 32, height: 24 },
        });
        expect(created.result).toBe("created");
        if (created.result !== "created") return;
        await drainJobs();
        const room = await db().query.rooms.findFirst({ where: eq(schema.rooms.id, created.roomId) });
        const directory = templateDirectory(world, created.roomId);
        expect(room).toMatchObject({ syncState: "ready", syncError: null, wamUrl: `${fake.url}/${directory}/map.wam` });
        expect(fake.json(`${directory}/map.tmj`)).toMatchObject({ width: 32, height: 24 });
        expect(fake.resizes.filter((r) => r.wamUrl === room!.wamUrl)).toEqual([
            { wamUrl: room!.wamUrl, width: 32, height: 24, anchor: "top", fill: "extend", dryRun: false },
        ]);
        expect(await jobOf("room.provision_template", created.roomId)).toMatchObject({
            status: "succeeded",
            attempts: 1,
        });
    });

    it("keeps the template's own size when none is chosen", async () => {
        const created = await createRoomFromTemplate({
            world,
            componentId: await template("lounge"),
            name: "Lounge",
            slug: "lounge",
            actorId: accountId,
        });
        if (created.result !== "created") throw new Error(created.result);
        await drainJobs();
        const room = await db().query.rooms.findFirst({ where: eq(schema.rooms.id, created.roomId) });
        expect(room?.syncState).toBe("ready");
        expect(fake.resizes.some((r) => r.wamUrl === room!.wamUrl)).toBe(false);
        expect(fake.json(`${templateDirectory(world, created.roomId)}/map.tmj`)).toMatchObject({
            width: 14,
            height: 10,
        });
    });

    it("keeps the room usable at the template's size when map-storage refuses the size, and says so", async () => {
        const created = await createRoomFromTemplate({
            world,
            componentId: await template("meeting-room"),
            name: "Tiny",
            slug: "tiny",
            actorId: accountId,
            size: { width: 64, height: 48 },
        });
        if (created.result !== "created") throw new Error(created.result);
        const path = `${templateDirectory(world, created.roomId)}/map.wam`;
        fake.resizeFailures.set(path, { status: 422, error: "Infinite maps cannot be resized." });
        await drainJobs();
        let room = (await db().query.rooms.findFirst({ where: eq(schema.rooms.id, created.roomId) }))!;
        expect(room).toMatchObject({ syncState: "failed", syncError: "resizeRejected", wamUrl: `${fake.url}/${path}` });
        // 4xx: no retry.
        expect(await jobOf("room.provision_template", created.roomId)).toMatchObject({ status: "failed", attempts: 1 });
        // Another size from the room page works, and the room is ready again.
        fake.resizeFailures.delete(path);
        expect(
            (await resizeRoom(world, room, { width: 20, height: 15, anchor: "top", fill: "extend" }, false)).status,
        ).toBe("ok");
        room = (await db().query.rooms.findFirst({ where: eq(schema.rooms.id, created.roomId) }))!;
        expect(room).toMatchObject({ syncState: "ready", syncError: null });
    });
});

describe("many rooms at once", () => {
    let roomA = "";
    let roomB = "";

    it("previews every room: ready, already at that size, or why not", async () => {
        roomA = (await insertRoom("bulk-a", { wamUrl: putMap("rooms/bulk-a", 20, 15) })).id;
        roomB = (await insertRoom("bulk-b", { wamUrl: putMap("rooms/bulk-b", 32, 24) })).id;
        const tiled = (await db().query.rooms.findFirst({ where: eq(schema.rooms.slug, "tiled") }))!.id;
        const rows = await previewBulkResize(
            admin,
            [roomA, roomB, tiled],
            { mode: "exact", width: 32, height: 24 },
            "top-left",
            "extend",
        );
        const byRoom = new Map(rows.map((r) => [r.roomId, r]));
        expect(byRoom.get(roomA)).toMatchObject({
            status: "ready",
            from: { width: 20, height: 15 },
            to: { width: 32, height: 24 },
        });
        expect(byRoom.get(roomB)).toMatchObject({ status: "sameSize" });
        expect(byRoom.get(tiled)).toMatchObject({ status: "tiled" });
        const grown = await previewBulkResize(admin, [roomA], { mode: "shrink", tiles: 18 }, "top-left", "extend");
        expect(grown[0]).toMatchObject({ status: "outOfRange" });
        // Nothing changed.
        expect(fake.json("rooms/bulk-a/map.tmj")).toMatchObject({ width: 20 });
    });

    it("leaves out rooms the person may not manage", async () => {
        expect(await previewBulkResize(managerOfB, [roomA], { mode: "grow", tiles: 2 }, "top-left", "extend")).toEqual(
            [],
        );
        expect(
            await applyBulkResize(
                managerOfB,
                accountId,
                [{ roomId: roomA, width: 30, height: 30 }],
                "top-left",
                "extend",
            ),
        ).toBeUndefined();
    });

    it("resizes in background jobs, retrying when map-storage is down", async () => {
        const batch = await applyBulkResize(
            admin,
            accountId,
            [{ roomId: roomA, width: 32, height: 24 }],
            "top-left",
            "extend",
        );
        expect(batch?.rooms).toEqual([roomA]);
        fake.down = 503;
        await drainJobs();
        let job = await jobOf("room.resize", roomA);
        expect(job).toMatchObject({ status: "pending", attempts: 1 });
        expect((await bulkResults(admin, batch!.batchId))?.[0]).toMatchObject({
            status: "pending",
            problem: "unavailable",
        });
        fake.down = undefined;
        await db()
            .update(schema.jobs)
            .set({ runAfter: sql`now()` })
            .where(eq(schema.jobs.id, job.id));
        await drainJobs();
        job = await jobOf("room.resize", roomA);
        expect(job).toMatchObject({ status: "succeeded", attempts: 2 });
        expect(fake.json("rooms/bulk-a/map.tmj")).toMatchObject({ width: 32, height: 24 });
        const [result] = (await bulkResults(admin, batch!.batchId))!;
        expect(result).toMatchObject({
            status: "succeeded",
            roomName: "bulk-a",
            to: { width: 32, height: 24 },
            problem: null,
        });
        expect(result!.summary).toMatchObject({ columns: 12, rows: 9 });
        const [entry] = await db()
            .select()
            .from(schema.auditLogs)
            .where(and(eq(schema.auditLogs.targetId, roomA), eq(schema.auditLogs.action, "room.resize")));
        expect(entry).toMatchObject({ accountId, organizationId: organization.id });
        // Results are only shown to people who may manage the rooms.
        expect(await bulkResults(managerOfB, batch!.batchId)).toEqual([]);
    });

    it("does not retry a resize map-storage refuses", async () => {
        fake.resizeFailures.set("rooms/bulk-b/map.wam", { status: 422, error: "Infinite maps cannot be resized." });
        const batch = await applyBulkResize(
            admin,
            accountId,
            [{ roomId: roomB, width: 40, height: 30 }],
            "center",
            "empty",
        );
        await drainJobs();
        expect(await jobOf("room.resize", roomB)).toMatchObject({ status: "failed", attempts: 1 });
        expect((await bulkResults(admin, batch!.batchId))?.[0]).toMatchObject({
            status: "failed",
            problem: "unresizable",
            reason: "infinite",
        });
        fake.resizeFailures.delete("rooms/bulk-b/map.wam");
    });
});

describe("Create an office", () => {
    it("creates a world of linked rooms, sized for the team, with the reception as default room", async () => {
        const outcome = await createOffice({
            organization: { id: organization.id, slug: organization.slug },
            workspaceId: workspaceA,
            name: "Acme HQ",
            layout: "hybrid",
            size: "medium",
            actorId: accountId,
            roomName: (room) => `${room.kind}${room.number ?? ""}`,
        });
        if (outcome.result !== "created") throw new Error(outcome.result);
        expect(outcome.world.slug).toBe("acme-hq");
        expect(outcome.rooms.map((r) => r.slug)).toEqual(planOffice("hybrid", "medium").map((r) => r.slug));
        await drainJobs();

        const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.worldId, outcome.world.id) });
        expect(rooms.every((r) => r.syncState === "ready")).toBe(true);
        expect(rooms.filter((r) => r.isDefault).map((r) => r.slug)).toEqual(["reception"]);
        const path = (slug: string) => {
            const room = rooms.find((r) => r.slug === slug)!;
            return `${templateDirectory(outcome.world, room.id)}/map.wam`;
        };
        // The open office has the chosen size, the reception one size smaller, meeting rooms their own.
        expect(fake.json(path("open-office").replace(/map\.wam$/, "map.tmj"))).toMatchObject({ width: 32, height: 24 });
        expect(fake.json(path("reception").replace(/map\.wam$/, "map.tmj"))).toMatchObject({ width: 20, height: 15 });
        expect(fake.json(path("meeting-room-1").replace(/map\.wam$/, "map.tmj"))).toMatchObject({
            width: 12,
            height: 10,
        });

        type Area = { name: string; properties: { type: string; url: string }[] };
        const exits = (slug: string) =>
            (fake.json(path(slug)) as { areas: Area[] }).areas
                .filter((a) => a.properties[0]?.type === "exit")
                .map((a) => a.properties[0]!.url);
        const base = `/@/${organization.slug}/acme-hq`;
        expect(exits("reception").sort()).toEqual(
            ["open-office", "meeting-room-1", "meeting-room-2", "lounge"].map((s) => `${base}/${s}`).sort(),
        );
        for (const slug of ["open-office", "meeting-room-1", "meeting-room-2", "lounge"]) {
            expect(exits(slug)).toEqual([`${base}/reception`]);
        }

        // A second run of a provisioning job adds no door twice.
        const reception = rooms.find((r) => r.slug === "reception")!;
        const job = await jobOf("room.provision_template", reception.id);
        await db().update(schema.rooms).set({ syncState: "pending" }).where(eq(schema.rooms.id, reception.id));
        await enqueueJob(db(), {
            kind: job.kind,
            organizationId: job.organizationId,
            payload: job.payload,
            idempotencyKey: job.idempotencyKey!,
        });
        await drainJobs();
        expect(exits("reception")).toHaveLength(4);
        expect(await db().query.rooms.findFirst({ where: eq(schema.rooms.id, reception.id) })).toMatchObject({
            syncState: "ready",
        });
    });

    it("takes a free world slug and refuses when the templates are not there", async () => {
        const again = await createOffice({
            organization: { id: organization.id, slug: organization.slug },
            workspaceId: workspaceA,
            name: "Acme HQ",
            layout: "open",
            size: "small",
            actorId: accountId,
            roomName: (room) => room.kind,
        });
        if (again.result !== "created") throw new Error(again.result);
        expect(again.world.slug).toBe("acme-hq-2");
        await drainJobs();

        await db()
            .update(schema.components)
            .set({ status: "deprecated" })
            .where(and(eq(schema.components.key, "open-office"), sql`${schema.components.organizationId} is null`));
        try {
            const refused = await createOffice({
                organization: { id: organization.id, slug: organization.slug },
                workspaceId: workspaceA,
                name: "No office",
                layout: "open",
                size: "small",
                actorId: accountId,
                roomName: (room) => room.kind,
            });
            expect(refused).toEqual({ result: "templatesMissing" });
            expect(await db().query.worlds.findFirst({ where: eq(schema.worlds.name, "No office") })).toBeUndefined();
        } finally {
            await db()
                .update(schema.components)
                .set({ status: "published" })
                .where(and(eq(schema.components.key, "open-office"), sql`${schema.components.organizationId} is null`));
        }
    });
});
