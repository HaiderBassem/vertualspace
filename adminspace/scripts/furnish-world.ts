/**
 * Adds a furnished office (and a garden) to a world that already exists, from the built-in room templates: reception,
 * open office, meeting rooms, lounge, garden terrace, linked by doors, with the reception as the room people land in.
 * Rooms the world already has are left as they are. The rooms are uploaded by background jobs of the running server.
 *
 *   npm run world:furnish -- --org acme --world office [--layout hybrid] [--size medium] [--no-garden] [--keep-default]
 *   node build/cli/furnish-world.js --org acme --world office                               (production image)
 */
import { and, eq } from "drizzle-orm";
import { audit } from "../src/lib/server/audit";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { furnishWorld } from "../src/lib/server/services/office";
import { OFFICE_LAYOUTS, type OfficeLayout } from "../src/lib/rooms/office";
import { ROOM_SIZE_PRESETS, type RoomSizePresetKey } from "../src/lib/rooms/size";

function option(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    const value = index > 0 ? process.argv[index + 1] : undefined;
    return value && !value.startsWith("--") ? value : undefined;
}

const orgSlug = option("org");
const worldSlug = option("world");
const layout = (option("layout") ?? "hybrid") as OfficeLayout;
const size = (option("size") ?? "medium") as RoomSizePresetKey;
if (!orgSlug || !worldSlug || !OFFICE_LAYOUTS.includes(layout) || !ROOM_SIZE_PRESETS.some((p) => p.key === size)) {
    console.error(
        `Usage: furnish-world --org <slug> --world <slug> [--layout ${OFFICE_LAYOUTS.join("|")}] [--size ${ROOM_SIZE_PRESETS.map((p) => p.key).join("|")}] [--no-garden] [--keep-default]`,
    );
    process.exit(2);
}

const NAMES = {
    reception: "Reception",
    openOffice: "Open office",
    meeting: "Meeting room",
    lounge: "Lounge",
    focus: "Focus room",
    garden: "Garden terrace",
} as const;

try {
    const [row] = await db()
        .select({ world: schema.worlds, organization: schema.organizations })
        .from(schema.worlds)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(and(eq(schema.organizations.slug, orgSlug), eq(schema.worlds.slug, worldSlug)));
    if (!row) {
        console.error(`No world ${orgSlug}/${worldSlug}.`);
        process.exit(1);
    }
    const outcome = await furnishWorld({
        world: row.world,
        organization: { id: row.organization.id, slug: row.organization.slug },
        layout,
        size,
        garden: !process.argv.includes("--no-garden"),
        makeDefault: !process.argv.includes("--keep-default"),
        actorId: null,
        roomName: (room) => (room.number ? `${NAMES[room.kind]} ${room.number}` : NAMES[room.kind]),
    });
    if (outcome.result !== "furnished") {
        console.error(`Not furnished: ${outcome.result}.`);
        process.exit(1);
    }
    await audit({
        action: "world.furnish",
        actorLabel: "cli:furnish-world",
        organizationId: row.organization.id,
        worldId: row.world.id,
        targetType: "world",
        targetId: row.world.id,
        details: { layout, size, rooms: outcome.rooms.map((r) => r.slug), defaultRoom: outcome.defaultRoom ?? null },
    });
    for (const room of outcome.rooms) console.info(`created  ${room.slug} (${room.template})`);
    for (const slug of outcome.skipped) console.info(`kept     ${slug}`);
    if (outcome.defaultRoom) console.info(`entry    ${outcome.defaultRoom}`);
    console.info(`world: ${outcome.rooms.length} rooms added; they are uploaded in the background (a few seconds).`);
} finally {
    await closeDb();
}
