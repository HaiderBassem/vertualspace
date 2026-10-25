/**
 * "Create an office": a world with rooms from the built-in room templates, sized for the team, linked with doors
 * (WAM exit areas added by each room's provisioning job), and its reception or open office as the default room.
 *
 * Everything is checked before anything is created (templates installed, map-storage and ORIGIN configured), so a
 * person never ends with half an office because of the configuration.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { createRoomFromTemplate, playerFacingOrigin } from "../catalog/install";
import { mapStoragePublicUrl } from "../catalog/mapStorage";
import { SLUG_PATTERN, slugify } from "../workadventure/playUri";
import { setDefaultRoom } from "./rooms";
import { createWorld } from "./worldAdmin";
import { planOffice, type OfficeLayout, type PlannedRoom } from "../../rooms/office";
import type { RoomSizePresetKey } from "../../rooms/size";

type World = typeof schema.worlds.$inferSelect;

export type OfficeProblem = "templatesMissing" | "mapStorageMissing" | "originMissing";

/** The published room templates an organization may use, by key (its own first, else the platform's). */
async function templatesByKey(organizationId: string, keys: string[]): Promise<Map<string, string>> {
    const rows = await db()
        .select({
            id: schema.components.id,
            key: schema.components.key,
            organizationId: schema.components.organizationId,
        })
        .from(schema.components)
        .where(
            and(
                inArray(schema.components.key, keys),
                eq(schema.components.kind, "room_template"),
                eq(schema.components.status, "published"),
                sql`(${schema.components.organizationId} is null or ${schema.components.organizationId} = ${organizationId})`,
            ),
        );
    const byKey = new Map<string, { id: string; own: boolean }>();
    for (const row of rows) {
        const current = byKey.get(row.key);
        if (!current || (!current.own && row.organizationId !== null)) {
            byKey.set(row.key, { id: row.id, own: row.organizationId !== null });
        }
    }
    return new Map([...byKey].map(([key, value]) => [key, value.id]));
}

/** What would stop an office from being created right now, if anything. */
export async function officeProblem(organizationId: string): Promise<OfficeProblem | undefined> {
    if (!playerFacingOrigin()) return "originMissing";
    if (!(await mapStoragePublicUrl(""))) return "mapStorageMissing";
    const keys = [
        ...new Set(
            ["open", "hybrid", "private"].flatMap((l) => planOffice(l as OfficeLayout, "small").map((r) => r.template)),
        ),
    ];
    const templates = await templatesByKey(organizationId, keys);
    return keys.every((k) => templates.has(k)) ? undefined : "templatesMissing";
}

/** Creates the world under a free slug made from the name ("acme-hq", "acme-hq-2", …). */
async function createOfficeWorld(input: { organizationId: string; workspaceId: string; name: string }): Promise<World> {
    const base = slugify(input.name).slice(0, 56).replace(/-+$/, "");
    const stem = base && SLUG_PATTERN.test(base) ? base : "office";
    for (let n = 1; n <= 100; n++) {
        const slug = n === 1 ? stem : `${stem}-${n}`;
        const world = await createWorld({
            organizationId: input.organizationId,
            workspaceId: input.workspaceId,
            name: input.name,
            slug,
            description: null,
            accessPolicy: "members",
        });
        if (world !== "slugTaken") return world;
    }
    throw new Error("No free world slug for the office");
}

export type OfficeResult =
    | { result: "created"; world: World; rooms: { id: string; slug: string; name: string; template: string }[] }
    | { result: OfficeProblem };

export async function createOffice(input: {
    organization: { id: string; slug: string };
    workspaceId: string;
    name: string;
    layout: OfficeLayout;
    size: RoomSizePresetKey;
    actorId: string;
    /** The name of a planned room in the creator's language. */
    roomName: (room: PlannedRoom) => string;
}): Promise<OfficeResult> {
    const problem = await officeProblem(input.organization.id);
    if (problem) return { result: problem };
    const plan = planOffice(input.layout, input.size);
    const templates = await templatesByKey(
        input.organization.id,
        plan.map((r) => r.template),
    );
    if (!plan.every((r) => templates.has(r.template))) return { result: "templatesMissing" };

    const world = await createOfficeWorld({
        organizationId: input.organization.id,
        workspaceId: input.workspaceId,
        name: input.name,
    });
    const named = plan.map((r) => ({ ...r, name: input.roomName(r) }));
    const url = (slug: string) => `/@/${input.organization.slug}/${world.slug}/${slug}`;
    const main = named.find((r) => r.isDefault) ?? named[0]!;
    const rooms: { id: string; slug: string; name: string; template: string }[] = [];
    for (const planned of named) {
        const doors =
            planned === main
                ? {
                      placement: "walls" as const,
                      targets: named.filter((r) => r !== main).map((r) => ({ name: r.name, url: url(r.slug) })),
                  }
                : { placement: "entrance" as const, targets: [{ name: main.name, url: url(main.slug) }] };
        const created = await createRoomFromTemplate({
            world,
            componentId: templates.get(planned.template)!,
            name: planned.name,
            slug: planned.slug,
            actorId: input.actorId,
            size: planned.size,
            doors,
        });
        if (created.result !== "created")
            throw new Error(`Office room ${planned.slug} was not created: ${created.result}`);
        rooms.push({ id: created.roomId, slug: created.roomSlug, name: planned.name, template: planned.template });
        if (planned === main) await setDefaultRoom(world.id, created.roomId);
    }
    return { result: "created", world, rooms };
}
