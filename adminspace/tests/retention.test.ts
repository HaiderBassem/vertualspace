/**
 * Retention deletes only what the retention policies say. Needs the database of .env.
 * Every call is scoped to this test's own world (worldIds), so it never purges other data.
 * Old records are 4000 days old (beyond the 3650-day maximum of any policy), recent ones are new,
 * so the expectations hold whatever the instance settings of the database are.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { runRetention } from "../src/lib/server/services/retention";

const NOW = new Date("2026-06-01T12:00:00Z");
const DAY = 86_400_000;
const OLD = new Date(NOW.getTime() - 4000 * DAY);
const RECENT = new Date(NOW.getTime() - 2 * DAY);
let organizationId = "";
let workspaceId = "";
let worldId = "";

beforeAll(async () => {
    const [organization] = await db()
        .insert(schema.organizations)
        .values({ slug: `retention-test-${Date.now()}`, name: "Retention test" })
        .returning();
    if (!organization) throw new Error("organization not created");
    organizationId = organization.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organizationId, slug: "main", name: "Main" })
        .returning();
    if (!workspace) throw new Error("workspace not created");
    workspaceId = workspace.id;
    const [world] = await db()
        .insert(schema.worlds)
        .values({
            organizationId,
            workspaceId,
            slug: "world",
            name: "World",
            settings: { privacy: { guestRetentionDays: 30, analyticsRetentionDays: 10 } },
        })
        .returning();
    if (!world) throw new Error("world not created");
    worldId = world.id;

    await db()
        .insert(schema.members)
        .values([
            { worldId, uuid: "old-guest", kind: "guest", lastSeenAt: new Date(NOW.getTime() - 40 * DAY) },
            { worldId, uuid: "recent-guest", kind: "guest", lastSeenAt: new Date(NOW.getTime() - 5 * DAY) },
            { worldId, uuid: "old-member", kind: "member", lastSeenAt: new Date(NOW.getTime() - 400 * DAY) },
        ]);
    const event = { worldId, eventName: "test", source: "client", roomId: "room", actorHash: "x", properties: {} };
    const suffix = Date.now();
    await db()
        .insert(schema.analyticsEvents)
        .values([
            { ...event, eventId: `old-${suffix}`, occurredAt: new Date(NOW.getTime() - 20 * DAY) },
            { ...event, eventId: `recent-${suffix}`, occurredAt: RECENT },
        ]);

    const ban = { worldId, reason: "test", bannedBy: "test" };
    await db()
        .insert(schema.bans)
        .values([
            // Active forever: never deleted, however old.
            { ...ban, memberUuid: "active-permanent", createdAt: OLD },
            // Active until the future: never deleted.
            { ...ban, memberUuid: "active-until-future", createdAt: OLD, expiresAt: new Date(NOW.getTime() + DAY) },
            // Expired long ago: deleted.
            { ...ban, memberUuid: "expired-long-ago", createdAt: OLD, expiresAt: OLD },
            // Revoked long ago: deleted.
            { ...ban, memberUuid: "revoked-long-ago", createdAt: OLD, revokedAt: OLD },
            // Revoked recently: kept.
            { ...ban, memberUuid: "revoked-recently", createdAt: OLD, revokedAt: RECENT },
        ]);

    const report = { worldId, roomUrl: "/@/x/y/z", reporterUuid: "reporter", comment: "c" };
    await db()
        .insert(schema.reports)
        .values([
            { ...report, reportedUuid: "open-old", status: "open", createdAt: OLD },
            { ...report, reportedUuid: "resolved-old", status: "resolved", createdAt: OLD, handledAt: OLD },
            { ...report, reportedUuid: "dismissed-recent", status: "dismissed", createdAt: OLD, handledAt: RECENT },
        ]);

    const recording = {
        worldId,
        status: "EGRESS_COMPLETE",
        playUri: "http://play.test/@/x/y/z",
        recorderUuid: "recorder",
        files: [],
    };
    await db()
        .insert(schema.recordingEvents)
        .values([
            { ...recording, egressId: `old-${suffix}`, receivedAt: OLD },
            { ...recording, egressId: `recent-${suffix}`, receivedAt: RECENT },
        ]);

    await db()
        .insert(schema.auditLogs)
        .values([
            { worldId, actorLabel: "test", action: "test.old", occurredAt: OLD },
            { worldId, actorLabel: "test", action: "test.recent", occurredAt: RECENT },
        ]);
});

afterAll(async () => {
    await db().delete(schema.auditLogs).where(eq(schema.auditLogs.worldId, worldId));
    await db().delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    await closeDb();
});

it("applies every policy to this world only, keeping active bans and open reports", async () => {
    const report = await runRetention(NOW, { worldIds: [worldId] });

    const members = await db().query.members.findMany({ where: eq(schema.members.worldId, worldId) });
    expect(members.map((m) => m.uuid).sort()).toEqual(["old-member", "recent-guest"]);

    const events = await db().query.analyticsEvents.findMany({ where: eq(schema.analyticsEvents.worldId, worldId) });
    expect(events.map((e) => e.eventId.split("-")[0])).toEqual(["recent"]);

    const bans = await db().query.bans.findMany({ where: eq(schema.bans.worldId, worldId) });
    expect(bans.map((b) => b.memberUuid).sort()).toEqual([
        "active-permanent",
        "active-until-future",
        "revoked-recently",
    ]);

    const reports = await db().query.reports.findMany({ where: eq(schema.reports.worldId, worldId) });
    expect(reports.map((r) => r.reportedUuid).sort()).toEqual(["dismissed-recent", "open-old"]);

    const recordings = await db().query.recordingEvents.findMany({
        where: eq(schema.recordingEvents.worldId, worldId),
    });
    expect(recordings.map((r) => r.egressId.split("-")[0])).toEqual(["recent"]);

    const audits = await db().query.auditLogs.findMany({ where: eq(schema.auditLogs.worldId, worldId) });
    expect(audits.map((a) => a.action)).toEqual(["test.recent"]);

    expect(report).toMatchObject({
        guestsDeleted: 1,
        analyticsDeleted: 1,
        bansDeleted: 2,
        reportsDeleted: 1,
        recordingEventsDeleted: 1,
        auditLogsDeleted: 1,
        // Scoped runs never touch sessions.
        sessionsDeleted: 0,
    });
});

it("is safe to run again (idempotent)", async () => {
    const again = await runRetention(NOW, { worldIds: [worldId] });
    expect(again).toEqual({
        guestsDeleted: 0,
        analyticsDeleted: 0,
        sessionsDeleted: 0,
        auditLogsDeleted: 0,
        bansDeleted: 0,
        reportsDeleted: 0,
        recordingEventsDeleted: 0,
    });
});
