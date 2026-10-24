import { and, count, countDistinct, desc, eq, gte } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { readWorldSettings } from "$lib/settings/worldSettings";
import { loadWorld } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { listAuditEntries } from "$lib/server/services/organizations";

const ANALYTICS_DAYS = 30;

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "audit.read");
    const since = new Date(Date.now() - ANALYTICS_DAYS * 86_400_000);

    const [recordings, events, audit] = await Promise.all([
        db().query.recordingEvents.findMany({
            where: eq(schema.recordingEvents.worldId, world.id),
            orderBy: desc(schema.recordingEvents.receivedAt),
            limit: 50,
        }),
        db()
            .select({
                eventName: schema.analyticsEvents.eventName,
                total: count(),
                people: countDistinct(schema.analyticsEvents.actorHash),
            })
            .from(schema.analyticsEvents)
            .where(and(eq(schema.analyticsEvents.worldId, world.id), gte(schema.analyticsEvents.occurredAt, since)))
            .groupBy(schema.analyticsEvents.eventName)
            .orderBy(desc(count())),
        listAuditEntries({ worldId: world.id, limit: 50, offset: 0 }),
    ]);

    return {
        analyticsEnabled: readWorldSettings(world.settings).privacy?.analytics === true,
        recordings: recordings.map((r) => ({
            id: r.id,
            status: r.status,
            recorderUuid: r.recorderUuid,
            startedAt: r.startedAt?.toISOString() ?? null,
            endedAt: r.endedAt?.toISOString() ?? r.receivedAt.toISOString(),
            error: r.error,
            durationSeconds: r.files.reduce((max, f) => Math.max(max, f.durationSeconds), 0),
            fileCount: r.files.length,
            sizeBytes: r.files.reduce((sum, f) => sum + f.sizeBytes, 0),
        })),
        events,
        audit: audit.entries,
    };
};
