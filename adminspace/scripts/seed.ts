/**
 * Seeds the avatar catalog from a WorkAdventure checkout, so that texture ids match the ones
 * WorkAdventure players already use. Idempotent: run it again after WorkAdventure adds textures.
 *
 *   npm run db:seed                         # avatar catalog only
 *   npm run db:seed -- --demo               # + a demo organization, world and room
 *   npm run db:seed -- --from <directory>   # catalog from a directory with woka.json + companions.json
 *
 * Without --from, the catalog is read from a WorkAdventure checkout (../workadventure, or WORKADVENTURE_REPO).
 * In production, copy the catalog out of WorkAdventure's own play image instead (docs/OPERATIONS.md):
 *   docker compose cp play:/usr/src/play/src/pusher/data ./wa-catalog
 *   docker compose cp ./wa-catalog adminspace:/tmp/wa-catalog
 *   docker compose exec adminspace node build/cli/seed.js --from /tmp/wa-catalog
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { closeDb, db, schema } from "../src/lib/server/db/client";

function argument(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const from = argument("--from");
const repo = path.resolve(process.env.WORKADVENTURE_REPO ?? path.join(process.cwd(), "..", "workadventure"));
const dataDir = from ? path.resolve(from) : path.join(repo, "play/src/pusher/data");

const Texture = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    position: z.number().optional(),
    tintable: z.boolean().optional(),
    behavior: z.enum(["cat", "dog", "red_panda"]).optional(),
});
const Collection = z.object({ name: z.string(), position: z.number().optional(), textures: z.array(Texture) });
const WokaFile = z.record(z.object({ collections: z.array(Collection) }));
const CompanionFile = z.array(Collection);

type WokaPart = (typeof schema.wokaPart.enumValues)[number];
const PARTS: readonly string[] = schema.wokaPart.enumValues;

async function seedWokas(): Promise<number> {
    const file = WokaFile.parse(JSON.parse(await readFile(path.join(dataDir, "woka.json"), "utf8")));
    let count = 0;
    for (const [part, { collections }] of Object.entries(file)) {
        if (!PARTS.includes(part)) {
            console.warn(`Skipping unknown Woka part "${part}"`);
            continue;
        }
        for (const [index, collection] of collections.entries()) {
            const position = collection.position ?? index;
            const [row] = await db()
                .insert(schema.wokaCollections)
                .values({ part: part as WokaPart, name: collection.name, position })
                .onConflictDoUpdate({
                    target: [schema.wokaCollections.part, schema.wokaCollections.name],
                    set: { position },
                })
                .returning();
            if (!row) continue;
            for (const [textureIndex, texture] of collection.textures.entries()) {
                await db()
                    .insert(schema.wokaTextures)
                    .values({
                        id: texture.id,
                        collectionId: row.id,
                        name: texture.name,
                        url: texture.url,
                        tintable: texture.tintable ?? false,
                        position: texture.position ?? textureIndex,
                    })
                    .onConflictDoUpdate({
                        target: schema.wokaTextures.id,
                        set: { collectionId: row.id, name: texture.name, url: texture.url },
                    });
                count++;
            }
        }
    }
    return count;
}

async function seedCompanions(): Promise<number> {
    const file = CompanionFile.parse(JSON.parse(await readFile(path.join(dataDir, "companions.json"), "utf8")));
    let count = 0;
    for (const [index, collection] of file.entries()) {
        const position = collection.position ?? index;
        const [row] = await db()
            .insert(schema.companionCollections)
            .values({ name: collection.name, position })
            .onConflictDoUpdate({ target: schema.companionCollections.name, set: { position } })
            .returning();
        if (!row) continue;
        for (const [textureIndex, texture] of collection.textures.entries()) {
            const behavior = texture.behavior ?? null;
            await db()
                .insert(schema.companionTextures)
                .values({
                    id: texture.id,
                    collectionId: row.id,
                    name: texture.name,
                    url: texture.url,
                    behavior,
                    position: texture.position ?? textureIndex,
                })
                .onConflictDoUpdate({
                    target: schema.companionTextures.id,
                    set: { collectionId: row.id, name: texture.name, url: texture.url, behavior },
                });
            count++;
        }
    }
    return count;
}

async function seedDemo(): Promise<void> {
    const [organization] = await db()
        .insert(schema.organizations)
        .values({ slug: "demo", name: "Demo organization", countryCode: "FR", defaultLocale: "en-US" })
        .onConflictDoUpdate({ target: schema.organizations.slug, set: { name: "Demo organization" } })
        .returning();
    if (!organization) return;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "main", name: "Main workspace" })
        .onConflictDoUpdate({
            target: [schema.workspaces.organizationId, schema.workspaces.slug],
            set: { name: "Main workspace" },
        })
        .returning();
    if (!workspace) return;
    const [world] = await db()
        .insert(schema.worlds)
        .values({
            organizationId: organization.id,
            workspaceId: workspace.id,
            slug: "office",
            name: "Demo office",
            accessPolicy: "public",
        })
        .onConflictDoUpdate({
            target: [schema.worlds.organizationId, schema.worlds.slug],
            set: { name: "Demo office" },
        })
        .returning();
    if (!world) return;
    const mapStorage = process.env.WORKADVENTURE_MAP_STORAGE_PUBLIC_URL;
    await db()
        .insert(schema.rooms)
        .values({
            worldId: world.id,
            slug: "lobby",
            name: "Lobby",
            isDefault: true,
            mapKind: mapStorage ? "wam" : "tmj",
            wamUrl: mapStorage ? `${mapStorage.replace(/\/+$/, "")}/starter/map.wam` : null,
            mapUrl: mapStorage ? null : "https://workadventure.github.io/map-starter-kit/office.tmj",
        })
        .onConflictDoNothing();
    for (const name of ["admin", "editor"]) {
        await db().insert(schema.tags).values({ worldId: world.id, name }).onConflictDoNothing();
    }
    console.info("Demo world created: /@/demo/office/lobby");
}

const wokas = await seedWokas();
const companions = await seedCompanions();
console.info(`Avatar catalog seeded from ${dataDir}: ${wokas} Woka textures, ${companions} companions.`);
if (process.argv.includes("--demo")) {
    await seedDemo();
}
await closeDb();
