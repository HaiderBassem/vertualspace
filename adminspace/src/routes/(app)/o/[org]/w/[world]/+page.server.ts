import { and, count, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { loadWorld } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { countOpenReports } from "$lib/server/services/moderation";
import { listAuditEntries } from "$lib/server/services/organizations";
import { worldOccupancy } from "$lib/server/services/pusher";

async function countMembers(worldId: string, kind: "member" | "guest"): Promise<number> {
    const rows = await db()
        .select({ value: count() })
        .from(schema.members)
        .where(and(eq(schema.members.worldId, worldId), eq(schema.members.kind, kind)));
    return rows[0]?.value ?? 0;
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access, world, worldUrl } = await loadWorld(locals, params.org, params.world);

    const occupancy = worldUrl
        ? worldOccupancy(worldUrl).then(
              (value) => ({ reachable: true as const, ...value }),
              () => ({ reachable: false as const, total: 0, rooms: {} as Record<string, number> }),
          )
        : Promise.resolve({ reachable: false as const, total: 0, rooms: {} as Record<string, number> });

    const [roomRows, members, guests, openReports, live, recent] = await Promise.all([
        db().select({ value: count() }).from(schema.rooms).where(eq(schema.rooms.worldId, world.id)),
        countMembers(world.id, "member"),
        countMembers(world.id, "guest"),
        countOpenReports(world.id),
        occupancy,
        access.can("audit.read")
            ? listAuditEntries({ worldId: world.id, limit: 10, offset: 0 }).then((r) => r.entries)
            : Promise.resolve([]),
    ]);

    return {
        stats: { rooms: roomRows[0]?.value ?? 0, members, guests, openReports },
        live: {
            reachable: live.reachable,
            total: live.total,
            rooms: Object.entries(live.rooms)
                .map(([url, people]) => ({ url, people }))
                .sort((a, b) => b.people - a.people),
        },
        recent,
    };
};
