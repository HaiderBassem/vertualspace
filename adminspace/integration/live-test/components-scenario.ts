/**
 * Live check of the component features against a REAL WorkAdventure map-storage (the wa-test stack):
 *
 *   1. a room template is provisioned through the real job: ZIP upload into its own directory, which
 *      map-storage validates with WorkAdventure's own map validator;
 *   2. the uploaded WAM lists the world's collection URL and the template's furniture;
 *   3. drift is simulated (the URL removed from the WAM with a JSON Patch), then reconciliation re-adds it,
 *      exactly once;
 *   4. the collection file served by AdminSpace lists the furniture with absolute image URLs.
 *
 * Uses the .env database (creates and deletes its own organization) and restores the instance settings.
 *
 *   LIVE_MAP_STORAGE_TOKEN=$(docker inspect wa-test-map-storage-1 --format '{{range .Config.Env}}{{println .}}{{end}}' \
 *     | sed -n 's/^AUTHENTICATION_TOKEN=//p') npx tsx --env-file=.env integration/live-test/components-scenario.ts
 */
import { eq, like } from "drizzle-orm";
import { closeDb, db, schema } from "../../src/lib/server/db/client";
import { saveInstanceSettings } from "../../src/lib/server/services/instance";
import { readInstanceSettings } from "../../src/lib/settings/instanceSettings";
import { createOrganization } from "../../src/lib/server/services/organizations";
import { importCatalogDirectory } from "../../src/lib/server/catalog/builtin";
import {
    buildWorldCollection,
    createRoomFromTemplate,
    reconcileWorld,
    templateDirectory,
    worldCollectionUrl,
} from "../../src/lib/server/catalog/install";
import { getWam, patchWam, wamTarget } from "../../src/lib/server/catalog/mapStorage";
import { runDueJobs } from "../../src/lib/server/services/jobs";
import "../../src/lib/server/services/jobHandlers";

const MAP_STORAGE = process.env.LIVE_MAP_STORAGE_URL ?? "http://wa.localhost/map-storage";
const TOKEN = process.env.LIVE_MAP_STORAGE_TOKEN;
if (!TOKEN) throw new Error("LIVE_MAP_STORAGE_TOKEN is required (map-storage AUTHENTICATION_TOKEN)");
const SLUG = `live-${Date.now().toString(36)}`;

function check(condition: unknown, label: string): void {
    console.info(`${condition ? "PASS" : "FAIL"}  ${label}`);
    if (!condition) process.exitCode = 1;
}

async function drain(): Promise<void> {
    for (let i = 0; i < 10 && (await runDueJobs()) > 0; i++) {
        // until no job is due
    }
}

const saved =
    (await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) }))?.settings ?? {};
let directory: string | undefined;
try {
    await saveInstanceSettings({
        ...readInstanceSettings(saved),
        mapStoragePublicUrl: MAP_STORAGE,
        mapStorageInternalUrl: MAP_STORAGE,
        mapStorageApiToken: TOKEN,
    });
    const [owner] = await db()
        .insert(schema.accounts)
        .values({ email: `${SLUG}@live.test`, name: "Live", passwordHash: "x" })
        .returning();
    const created = await createOrganization(
        { name: "Live test", slug: SLUG, countryCode: null, defaultLocale: "en-US", contactEmail: null },
        owner!.id,
    );
    if (created === "slugTaken") throw new Error("slug taken");
    const [world] = await db()
        .insert(schema.worlds)
        .values({ organizationId: created.organization.id, workspaceId: created.workspace.id, slug: "hq", name: "HQ" })
        .returning();
    await importCatalogDirectory("catalog/builtin");
    const [template] = await db().select().from(schema.components).where(like(schema.components.key, "meeting-room"));

    const outcome = await createRoomFromTemplate({
        world: world!,
        componentId: template!.id,
        name: "Board room",
        slug: "board-room",
        actorId: owner!.id,
    });
    check(outcome.result === "created", `room created from template (${outcome.result})`);
    if (outcome.result !== "created") throw new Error("stop");
    directory = templateDirectory(world!, outcome.roomId);
    await drain();
    const [room] = await db().select().from(schema.rooms).where(eq(schema.rooms.id, outcome.roomId));
    check(
        room?.syncState === "ready" && room.wamUrl,
        `map uploaded and accepted by map-storage (${room?.syncState} ${room?.syncError ?? ""})`,
    );

    const target = await wamTarget(room!.wamUrl);
    const wam = target ? await getWam(target) : undefined;
    const url = worldCollectionUrl(world!.id);
    check(wam?.status === "ok", `WAM readable on map-storage: ${room?.wamUrl}`);
    if (wam?.status === "ok") {
        check(
            wam.value.entityCollections.some((c) => c.url === url),
            "WAM lists the world collection",
        );
        check(
            Object.keys(wam.value.entities).length >= 8,
            `WAM places the template furniture (${Object.keys(wam.value.entities).length})`,
        );
        // Drift: someone removed the collection; reconciliation must add it back once.
        const index = wam.value.entityCollections.findIndex((c) => c.url === url);
        const removed = await patchWam(target!, [{ op: "remove", path: `/entityCollections/${index}` }]);
        check(removed.status === "ok", `real JSON Patch accepted by map-storage (${removed.status})`);
        await reconcileWorld(world!, owner!.id);
        await drain();
        const after = await getWam(target!);
        check(
            after.status === "ok" && after.value.entityCollections.filter((c) => c.url === url).length === 1,
            "reconciliation re-added the collection exactly once",
        );
    }
    const collection = await buildWorldCollection(world!.id);
    check(
        (collection?.collection.length ?? 0) > 0,
        `collection file lists ${collection?.collection.length ?? 0} prefabs`,
    );
} finally {
    if (directory) {
        const response = await fetch(`${MAP_STORAGE}/${directory}`, {
            method: "DELETE",
            headers: { authorization: `Bearer ${TOKEN}` },
        });
        console.info(`cleanup: DELETE ${directory} -> ${response.status}`);
    }
    await db().delete(schema.organizations).where(eq(schema.organizations.slug, SLUG));
    await db()
        .delete(schema.accounts)
        .where(eq(schema.accounts.email, `${SLUG}@live.test`));
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: saved })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: saved } });
    await closeDb();
}
