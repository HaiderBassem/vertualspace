/**
 * Map-storage webhook (POST /hooks/map-storage, services/mapStorageWebhook.ts) against the real database and a local
 * fake map-storage serving the WAM files: authentication, what is ignored, registration of rooms created inside
 * WorkAdventure (name, slug, idempotency, concurrency), the room appearing in /api/room/sameWorld with its wamUrl as
 * WorkAdventure's in-game "Add room" polls it, and deleted maps reported on their rooms. Everything is created under
 * "hook-test-*" and deleted after; instance settings are restored.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, like } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { config } from "../src/lib/server/config";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { ShortMapDescriptionList } from "../src/lib/contract/adminApi";
import { saveInstanceSettings } from "../src/lib/server/services/instance";
import { sealSecret } from "../src/lib/server/services/secrets";
import { handleMapStorageWebhook } from "../src/lib/server/services/mapStorageWebhook";
import { readInstanceSettings } from "../src/lib/settings/instanceSettings";
import { startFakeMapStorage, type FakeMapStorage } from "./support/fakeMapStorage";

const SUFFIX = Date.now().toString(36);
const ORG = `hook-test-${SUFFIX}`;
const PLAY = "http://play.hook-test.example";
const WEBHOOK_TOKEN = "webhook-token-for-tests-0123456789abcdef";
const MAP_TOKEN = "map-storage-token-for-hook-tests-0123456789";

let fake: FakeMapStorage;
let savedSettings: unknown;
let organizationId = "";
let otherOrganizationId = "";
let worldId = "";
let archivedWorldId = "";

function wamOf(name: string | undefined): Record<string, unknown> {
    return {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities: {},
        areas: [],
        entityCollections: [],
        ...(name === undefined ? {} : { metadata: { name } }),
    };
}

function hook(body: unknown, init: { token?: string | null; method?: string; raw?: string } = {}): Promise<Response> {
    const headers = new Headers({ "content-type": "application/json" });
    const token = init.token === undefined ? WEBHOOK_TOKEN : init.token;
    if (token !== null) headers.set("authorization", token);
    return handleMapStorageWebhook(
        new Request("http://admin.test/hooks/map-storage", {
            method: init.method ?? "POST",
            headers,
            ...(init.method === "GET" ? {} : { body: init.raw ?? JSON.stringify(body) }),
        }),
    );
}

async function hookJson(body: unknown): Promise<Record<string, unknown>> {
    const response = await hook(body);
    expect(response.status).toBe(200);
    return (await response.json()) as Record<string, unknown>;
}

const update = (mapPath: string | undefined, domain = "127.0.0.1") => ({ domain, mapPath, action: "update" });
const pathIn = (world: string, directory: string, organization = organizationId) =>
    `adminspace/${organization}/${world}/${directory}/map.wam`;

beforeAll(async () => {
    fake = await startFakeMapStorage(MAP_TOKEN);
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    savedSettings = row?.settings ?? {};
    const [organization] = await db().insert(schema.organizations).values({ slug: ORG, name: "Hook test" }).returning();
    const [other] = await db()
        .insert(schema.organizations)
        .values({ slug: `${ORG}-other`, name: "Hook other" })
        .returning();
    organizationId = organization!.id;
    otherOrganizationId = other!.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId, slug: "main", name: "Main" })
        .returning();
    const [world] = await db()
        .insert(schema.worlds)
        .values({ organizationId, workspaceId: workspace!.id, slug: "hq", name: "HQ", accessPolicy: "public" })
        .returning();
    const [archived] = await db()
        .insert(schema.worlds)
        .values({
            organizationId,
            workspaceId: workspace!.id,
            slug: "old",
            name: "Old",
            accessPolicy: "public",
            archivedAt: new Date(),
        })
        .returning();
    worldId = world!.id;
    archivedWorldId = archived!.id;
    await db()
        .insert(schema.rooms)
        .values([
            {
                worldId,
                slug: "lobby",
                name: "Lobby",
                isDefault: true,
                mapKind: "wam",
                wamUrl: `${fake.url}/hq/lobby.wam`,
                position: 0,
            },
            {
                worldId,
                slug: "kitchen",
                name: "Kitchen",
                mapKind: "tmj",
                mapUrl: "https://maps.test/k.tmj",
                position: 1,
            },
        ]);
});

afterAll(async () => {
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${ORG}%`));
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: savedSettings as object })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: savedSettings as object } });
    await fake.close();
    await closeDb();
});

async function configure(webhookToken: string | undefined): Promise<void> {
    await saveInstanceSettings({
        ...readInstanceSettings(savedSettings),
        playUrl: PLAY,
        mapStoragePublicUrl: fake.url,
        mapStorageInternalUrl: fake.url,
        mapStorageApiToken: MAP_TOKEN,
        mapStorageWebhookToken: webhookToken ? sealSecret(webhookToken) : undefined,
    });
}

describe("authentication", () => {
    it("refuses every call while no webhook token is configured", async () => {
        await configure(undefined);
        if (config().WORKADVENTURE_MAP_STORAGE_WEBHOOK_TOKEN) return; // configured by the environment here
        expect((await hook(update("x/map.wam"))).status).toBe(403);
        expect((await hook(update("x/map.wam"), { token: null })).status).toBe(403);
    });

    it("accepts the raw token (as map-storage sends it) or a Bearer token, and nothing else", async () => {
        await configure(WEBHOOK_TOKEN);
        expect((await hook(update(undefined))).status).toBe(200);
        expect((await hook(update(undefined), { token: `Bearer ${WEBHOOK_TOKEN}` })).status).toBe(200);
        expect((await hook(update(undefined), { token: `${WEBHOOK_TOKEN}x` })).status).toBe(403);
        expect((await hook(update(undefined), { token: null })).status).toBe(403);
    });

    it("answers 400 to bodies that are not map-storage's, and 405 to other methods", async () => {
        expect((await hook(undefined, { raw: "{not json" })).status).toBe(400);
        expect((await hook({ domain: "127.0.0.1", mapPath: "a.wam", action: "rename" })).status).toBe(400);
        expect((await hook(undefined, { method: "GET" })).status).toBe(405);
    });
});

describe("ignored calls", () => {
    it("ignores uploads of several files, other domains, other files and maps outside AdminSpace rooms", async () => {
        expect(await hookJson(update(undefined))).toEqual({ result: "ignored", reason: "noMapPath" });
        expect(await hookJson(update(pathIn(worldId, "a"), "maps.other.example"))).toMatchObject({
            reason: "otherDomain",
        });
        expect(await hookJson(update("adminspace/x/notes.txt"))).toMatchObject({ reason: "notAWamFile" });
        expect(await hookJson(update("../etc/map.wam"))).toMatchObject({ reason: "notAWamFile" });
        expect(await hookJson(update("office/map.wam"))).toMatchObject({ reason: "notAdminSpaceRoom" });
    });

    it("ignores worlds of another organization, archived worlds and template directories", async () => {
        fake.put(pathIn(worldId, "stolen", otherOrganizationId), wamOf("Stolen"));
        expect(await hookJson(update(pathIn(worldId, "stolen", otherOrganizationId)))).toMatchObject({
            reason: "worldNotFound",
        });
        fake.put(pathIn(archivedWorldId, "attic"), wamOf("Attic"));
        expect(await hookJson(update(pathIn(archivedWorldId, "attic")))).toMatchObject({ reason: "worldArchived" });
        // Rooms from templates live under their room id; one deleted in AdminSpace must not come back.
        const roomId = "3f2b8c1e-5d4a-4b6c-9e8f-1a2b3c4d5e6f";
        fake.put(pathIn(worldId, roomId), wamOf("Template room"));
        expect(await hookJson(update(pathIn(worldId, roomId)))).toMatchObject({ reason: "templateRoom" });
        const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.worldId, worldId) });
        expect(rooms.map((r) => r.slug).sort()).toEqual(["kitchen", "lobby"]);
    });
});

describe("rooms created inside WorkAdventure", () => {
    it("registers the room with the name typed in WorkAdventure, then lists it in sameWorld with its wamUrl", async () => {
        const mapPath = pathIn(worldId, "focus-room");
        fake.put(mapPath, wamOf("Focus room"));
        const answer = await hookJson(update(mapPath));
        expect(answer).toMatchObject({ result: "registered", slug: "focus-room" });

        const room = await db().query.rooms.findFirst({
            where: and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.slug, "focus-room")),
        });
        expect(room).toMatchObject({
            name: "Focus room",
            mapKind: "wam",
            wamUrl: `${fake.url}/${mapPath}`,
            mapUrl: null,
            isDefault: false,
            position: 2,
            syncState: "ready",
        });
        const [entry] = await db()
            .select()
            .from(schema.auditLogs)
            .where(and(eq(schema.auditLogs.targetId, room!.id), eq(schema.auditLogs.action, "room.create")));
        expect(entry).toMatchObject({ actorLabel: "system:map-storage", organizationId, worldId, accountId: null });

        // What WorkAdventure's client polls for about 15 seconds after "Add room".
        const response = await dispatchAdminApi(
            new Request(
                `http://admin.test/api/room/sameWorld?roomUrl=${encodeURIComponent(`${PLAY}/@/${ORG}/hq/lobby`)}`,
                { headers: { authorization: config().ADMIN_API_TOKEN } },
            ),
            "198.51.100.20",
        );
        expect(response.status).toBe(200);
        const rooms = ShortMapDescriptionList.parse(await response.json());
        expect(rooms).toContainEqual(
            expect.objectContaining({
                name: "Focus room",
                wamUrl: `${fake.url}/${mapPath}`,
                roomUrl: `${PLAY}/@/${ORG}/hq/focus-room`,
            }),
        );
    });

    it("is idempotent: later updates of the map add nothing", async () => {
        const mapPath = pathIn(worldId, "focus-room");
        expect(await hookJson(update(mapPath))).toEqual({ result: "known" });
        expect(await hookJson(update(`/${mapPath}`))).toEqual({ result: "known" });
        const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.wamUrl, `${fake.url}/${mapPath}`) });
        expect(rooms).toHaveLength(1);
    });

    it("adds one room when map-storage reports the same new map twice at once", async () => {
        const mapPath = pathIn(worldId, "quiet-room");
        fake.put(mapPath, wamOf("Quiet room"));
        const answers = await Promise.all([
            hookJson(update(mapPath)),
            hookJson(update(mapPath)),
            hookJson(update(mapPath)),
        ]);
        expect(answers.filter((a) => a.result === "registered")).toHaveLength(1);
        expect(answers.filter((a) => a.result === "known")).toHaveLength(2);
        const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.wamUrl, `${fake.url}/${mapPath}`) });
        expect(rooms).toHaveLength(1);
    });

    it("picks a free slug and falls back to the directory name when the WAM has no name or cannot be read", async () => {
        const kitchen = pathIn(worldId, "kitchen");
        fake.put(kitchen, wamOf(undefined));
        expect(await hookJson(update(kitchen))).toMatchObject({ result: "registered", slug: "kitchen-2" });
        const unreadable = pathIn(worldId, "phone-booth");
        expect(await hookJson(update(unreadable))).toMatchObject({ result: "registered", slug: "phone-booth" });
        const room = await db().query.rooms.findFirst({ where: eq(schema.rooms.wamUrl, `${fake.url}/${unreadable}`) });
        expect(room?.name).toBe("phone-booth");
    });
});

describe("deleted maps", () => {
    it("marks the rooms of a deleted map failed without deleting anything, and restores them when it is back", async () => {
        const mapPath = pathIn(worldId, "focus-room");
        const wamUrl = `${fake.url}/${mapPath}`;
        expect(await hookJson({ domain: "127.0.0.1", mapPath, action: "delete" })).toEqual({
            result: "markedDeleted",
            rooms: 1,
        });
        const room = await db().query.rooms.findFirst({ where: eq(schema.rooms.wamUrl, wamUrl) });
        expect(room).toMatchObject({ syncState: "failed", syncError: "mapDeleted" });
        const [entry] = await db()
            .select()
            .from(schema.auditLogs)
            .where(and(eq(schema.auditLogs.targetId, room!.id), eq(schema.auditLogs.action, "room.map_deleted")));
        expect(entry?.actorLabel).toBe("system:map-storage");

        expect(await hookJson({ domain: "127.0.0.1", mapPath, action: "delete" })).toMatchObject({
            result: "markedDeleted",
        });
        expect(await hookJson({ domain: "127.0.0.1", mapPath: "nobody/uses.wam", action: "delete" })).toMatchObject({
            result: "ignored",
        });

        expect(await hookJson(update(mapPath))).toEqual({ result: "restored", rooms: 1 });
        expect(await db().query.rooms.findFirst({ where: eq(schema.rooms.wamUrl, wamUrl) })).toMatchObject({
            syncState: "ready",
            syncError: null,
        });
    });
});
