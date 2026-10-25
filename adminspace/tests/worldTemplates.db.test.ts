import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema, closeDb } from "../src/lib/server/db/client";
import { importCatalogDirectory } from "../src/lib/server/catalog/builtin";
import { createWorld } from "../src/lib/server/services/worldAdmin";
import { memberTagNames } from "../src/lib/server/services/members";
import { runDueJobs } from "../src/lib/server/services/jobs";
import "../src/lib/server/services/jobHandlers";

const uploaded = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock("../src/lib/server/catalog/mapStorage", async (importOriginal) => {
    const original = await importOriginal<typeof import("../src/lib/server/catalog/mapStorage")>();
    return {
        ...original,
        uploadArchive: vi.fn(async (directory: string, archive: Buffer) => {
            const entries = original.readZip(archive, {
                maxEntries: 100,
                maxEntryBytes: 10_000_000,
                maxTotal: 20_000_000,
            });
            expect([...entries.keys()]).toEqual(["map.wam"]);
            uploaded.set(`${directory}/map.wam`, JSON.parse(entries.get("map.wam")!.toString()));
            return { status: "ok", value: undefined };
        }),
        getWam: vi.fn(async (target: { path: string }) => ({ status: "ok", value: uploaded.get(target.path) })),
    };
});

let organizationId: string;
let workspaceId: string;
let componentId: string;
let account: typeof schema.accounts.$inferSelect;

beforeAll(async () => {
    await importCatalogDirectory(path.resolve("catalog/builtin"));
    const [org] = await db()
        .insert(schema.organizations)
        .values({ slug: "template-test", name: "Template test" })
        .returning();
    organizationId = org!.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId, slug: "main", name: "Main" })
        .returning();
    workspaceId = workspace!.id;
    [account] = (await db()
        .insert(schema.accounts)
        .values({ email: "creator@template.test", name: "Creator", passwordHash: "test" })
        .returning()) as [typeof account];
    componentId = (await db().query.components.findFirst({ where: eq(schema.components.key, "wa-village") }))!.id;
});

afterAll(async () => {
    await db().delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    await db().delete(schema.accounts).where(eq(schema.accounts.id, account.id));
    await closeDb();
});

function input(slug: string, templateId = componentId) {
    return {
        organizationId,
        workspaceId,
        name: slug,
        slug,
        description: null,
        accessPolicy: "public" as const,
        firstRoomTemplate: { componentId: templateId, name: "WA Village", actorId: account.id },
        creator: { email: account.email, name: account.name },
    };
}

it("creates independent editable rooms and durable provisioning jobs for separate worlds", async () => {
    const worlds = await Promise.all([createWorld(input("one")), createWorld(input("two"))]);
    const directories = [];
    for (const world of worlds) {
        if (typeof world === "string") throw new Error(world);
        const rooms = await db().query.rooms.findMany({ where: eq(schema.rooms.worldId, world.id) });
        expect(rooms).toHaveLength(1);
        expect(rooms[0]).toMatchObject({ mapKind: "wam", isDefault: true, syncState: "pending" });
        const job = await db().query.jobs.findFirst({
            where: eq(schema.jobs.idempotencyKey, `provision:${rooms[0]!.id}`),
        });
        expect(job?.kind).toBe("room.provision_template");
        directories.push(job!.payload.directory);
        const member = await db().query.members.findFirst({ where: eq(schema.members.worldId, world.id) });
        expect(member?.email).toBe(account.email);
        expect(await memberTagNames(member!.id)).toContain("editor");
    }
    expect(directories[0]).not.toBe(directories[1]);
    await runDueJobs();
    expect(uploaded.size).toBe(2);
    for (const world of worlds) {
        if (typeof world === "string") throw new Error(world);
        const room = await db().query.rooms.findFirst({ where: eq(schema.rooms.worldId, world.id) });
        expect(room?.syncState).toBe("ready");
        expect(room?.wamUrl).toContain(`/adminspace/${organizationId}/${world.id}/`);
    }
    const copies = [...uploaded.values()];
    expect(copies[0]?.mapUrl).toBe("https://workadventure.github.io/wa-village/wa-headquarters.tmj");
    expect(copies[0]?.entityCollections).not.toEqual(copies[1]?.entityCollections);
    expect(copies[0]?.areas).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                name: "Conference room",
                properties: expect.arrayContaining([expect.objectContaining({ type: "livekitRoomProperty" })]),
            }),
        ]),
    );
    const firstAreas = copies[0]!.areas as { properties: { type: string; roomName?: string }[] }[];
    const secondAreas = copies[1]!.areas as { properties: { type: string; roomName?: string }[] }[];
    expect(firstAreas[0]?.properties.find((p) => p.type === "livekitRoomProperty")?.roomName).not.toBe(
        secondAreas[0]?.properties.find((p) => p.type === "livekitRoomProperty")?.roomName,
    );
    const secondBefore = structuredClone(copies[1]!.areas);
    copies[0]!.areas = [{ id: "independent-edit" }];
    expect(copies[1]?.areas).toEqual(secondBefore);
});

it("rolls back the world when its template cannot be provisioned", async () => {
    await expect(createWorld(input("refused", "00000000-0000-4000-8000-000000000099"))).rejects.toThrow();
    expect(await db().query.worlds.findFirst({ where: eq(schema.worlds.slug, "refused") })).toBeUndefined();
});
