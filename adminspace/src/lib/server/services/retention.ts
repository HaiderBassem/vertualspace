/**
 * Data retention (storage limitation, GDPR art. 5(1)(e); ISO/IEC 27701).
 *
 * - Per world (privacy settings): guests not seen for guestRetentionDays (0 keeps them), analytics
 *   older than analyticsRetentionDays (default 395).
 * - Per instance (Platform › Instance settings, see RETENTION_DEFAULTS): audit log entries, inactive
 *   bans (revoked or expired; active bans are never deleted), closed reports (resolved or dismissed;
 *   open reports are never deleted) and recording events.
 * - Expired sessions.
 *
 * Every step is an idempotent DELETE ... WHERE <older than cutoff>: a failed or interrupted run is safe
 * to run again. Runs hourly in the server (hooks.server.ts) and on demand (`npm run retention:run`).
 * Each run logs one JSON line and its outcome is kept for the system status page.
 */
import { and, eq, inArray, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { readWorldSettings } from "../../settings/worldSettings";
import { retentionPolicy } from "../../settings/instanceSettings";
import { audit } from "../audit";
import { db, schema } from "../db/client";
import { purgeFinishedJobs } from "./jobs";
import { purgeIntegrationRecords } from "../integrations/jobs";
import { purgePasswordResets } from "./passwordReset";
import { purgeStalePresence } from "./presence";
import { purgeSignupRequests } from "./registration";
import { getInstanceSettings } from "./instance";

/** Analytics are kept 13 months when a world does not choose (a common audience-measurement limit). */
export const DEFAULT_ANALYTICS_RETENTION_DAYS = 395;

export interface RetentionReport {
    guestsDeleted: number;
    analyticsDeleted: number;
    sessionsDeleted: number;
    auditLogsDeleted: number;
    bansDeleted: number;
    reportsDeleted: number;
    recordingEventsDeleted: number;
}

export interface RetentionOptions {
    /**
     * Restricts the run to these worlds (world-scoped tables only; sessions and audit entries without
     * a world are left alone). Used by tests so that they never purge other data.
     */
    worldIds?: string[];
}

export interface RetentionStatus {
    lastRunAt: string;
    durationMs: number;
    ok: boolean;
    report?: RetentionReport;
    error?: string;
}

let lastStatus: RetentionStatus | undefined;

/** Outcome of the last run in this process (undefined before the first one). */
export function retentionStatus(): RetentionStatus | undefined {
    return lastStatus;
}

function daysAgo(days: number, now: Date): Date {
    return new Date(now.getTime() - days * 86_400_000);
}

function worldFilter(column: typeof schema.bans.worldId | typeof schema.auditLogs.worldId, options: RetentionOptions) {
    return options.worldIds ? inArray(column, options.worldIds) : undefined;
}

export async function runRetention(now = new Date(), options: RetentionOptions = {}): Promise<RetentionReport> {
    const report: RetentionReport = {
        guestsDeleted: 0,
        analyticsDeleted: 0,
        sessionsDeleted: 0,
        auditLogsDeleted: 0,
        bansDeleted: 0,
        reportsDeleted: 0,
        recordingEventsDeleted: 0,
    };
    if (options.worldIds && options.worldIds.length === 0) return report;

    const worlds = await db()
        .select({ id: schema.worlds.id, settings: schema.worlds.settings })
        .from(schema.worlds)
        .where(options.worldIds ? inArray(schema.worlds.id, options.worldIds) : undefined);
    for (const world of worlds) {
        const privacy = readWorldSettings(world.settings).privacy ?? {};

        const guestDays = privacy.guestRetentionDays ?? 0;
        if (guestDays > 0) {
            const cutoff = daysAgo(guestDays, now);
            const deleted = await db()
                .delete(schema.members)
                .where(
                    and(
                        eq(schema.members.worldId, world.id),
                        eq(schema.members.kind, "guest"),
                        or(
                            lt(schema.members.lastSeenAt, cutoff),
                            and(isNull(schema.members.lastSeenAt), lt(schema.members.createdAt, cutoff)),
                        ),
                    ),
                )
                .returning({ id: schema.members.id });
            report.guestsDeleted += deleted.length;
        }

        const analyticsDays = privacy.analyticsRetentionDays ?? DEFAULT_ANALYTICS_RETENTION_DAYS;
        const analytics = await db()
            .delete(schema.analyticsEvents)
            .where(
                and(
                    eq(schema.analyticsEvents.worldId, world.id),
                    lt(schema.analyticsEvents.occurredAt, daysAgo(analyticsDays, now)),
                ),
            )
            .returning({ id: schema.analyticsEvents.eventId });
        report.analyticsDeleted += analytics.length;
    }

    const policy = retentionPolicy(await getInstanceSettings());

    // Inactive bans only: revoked, or expired, for longer than the retention period.
    const banCutoff = daysAgo(policy.inactiveBanRetentionDays, now);
    const bans = await db()
        .delete(schema.bans)
        .where(
            and(
                worldFilter(schema.bans.worldId, options),
                or(
                    and(isNotNull(schema.bans.revokedAt), lt(schema.bans.revokedAt, banCutoff)),
                    and(
                        isNull(schema.bans.revokedAt),
                        isNotNull(schema.bans.expiresAt),
                        lte(schema.bans.expiresAt, now),
                        lt(schema.bans.expiresAt, banCutoff),
                    ),
                ),
            ),
        )
        .returning({ id: schema.bans.id });
    report.bansDeleted = bans.length;

    // Closed reports only (resolved or dismissed); open reports stay until someone handles them.
    const reportCutoff = daysAgo(policy.closedReportRetentionDays, now);
    const reports = await db()
        .delete(schema.reports)
        .where(
            and(
                options.worldIds ? inArray(schema.reports.worldId, options.worldIds) : undefined,
                inArray(schema.reports.status, ["resolved", "dismissed"]),
                sql`coalesce(${schema.reports.handledAt}, ${schema.reports.createdAt}) < ${reportCutoff.toISOString()}::timestamptz`,
            ),
        )
        .returning({ id: schema.reports.id });
    report.reportsDeleted = reports.length;

    const recordings = await db()
        .delete(schema.recordingEvents)
        .where(
            and(
                options.worldIds ? inArray(schema.recordingEvents.worldId, options.worldIds) : undefined,
                lt(schema.recordingEvents.receivedAt, daysAgo(policy.recordingEventRetentionDays, now)),
            ),
        )
        .returning({ id: schema.recordingEvents.id });
    report.recordingEventsDeleted = recordings.length;

    const lifecycle = {
        signupRequests: 0,
        passwordResets: 0,
        emailDeliveries: 0,
        jobs: 0,
        integrationEvents: 0,
        presenceReports: 0,
    };
    const auditConditions: (SQL | undefined)[] = [
        lt(schema.auditLogs.occurredAt, daysAgo(policy.auditLogRetentionDays, now)),
        worldFilter(schema.auditLogs.worldId, options),
    ];
    const auditLogs = await db()
        .delete(schema.auditLogs)
        .where(and(...auditConditions))
        .returning({ id: schema.auditLogs.id });
    report.auditLogsDeleted = auditLogs.length;

    if (!options.worldIds) {
        const sessions = await db()
            .delete(schema.sessions)
            .where(lt(schema.sessions.expiresAt, now))
            .returning({ id: schema.sessions.id });
        report.sessionsDeleted = sessions.length;
        // Onboarding secrets and operational logs: used or expired links (they hold password hashes or
        // point to accounts), email delivery records after 90 days, finished jobs after 30 days.
        lifecycle.signupRequests = await purgeSignupRequests(now);
        lifecycle.passwordResets = await purgePasswordResets(now);
        lifecycle.emailDeliveries = (
            await db()
                .delete(schema.emailDeliveries)
                .where(lt(schema.emailDeliveries.createdAt, daysAgo(90, now)))
                .returning({ id: schema.emailDeliveries.id })
        ).length;
        lifecycle.jobs = await purgeFinishedJobs(30, now);
        // Integration Center: events and deliveries after 30 days, OAuth flows and inbound delivery ids.
        lifecycle.integrationEvents = (await purgeIntegrationRecords(now)).events;
        // Who's in: reports of pushers that stopped (normally already deleted when a fresh report arrives).
        lifecycle.presenceReports = await purgeStalePresence(now);
    }

    const deletedRecords =
        report.guestsDeleted +
        report.analyticsDeleted +
        report.auditLogsDeleted +
        report.bansDeleted +
        report.reportsDeleted +
        report.recordingEventsDeleted;
    // Scoped runs (tests) leave no trace outside their own worlds.
    if (deletedRecords > 0 && !options.worldIds) {
        await audit({ action: "retention.run", actorLabel: "system", details: { ...report, lifecycle } });
    }
    return report;
}

/** Runs retention once, recording its outcome and logging one JSON line. Never throws. */
export async function runRetentionObserved(): Promise<RetentionStatus> {
    const started = Date.now();
    try {
        const report = await runRetention();
        lastStatus = {
            lastRunAt: new Date(started).toISOString(),
            durationMs: Date.now() - started,
            ok: true,
            report,
        };
        console.info(JSON.stringify({ level: "info", time: lastStatus.lastRunAt, message: "retention", ...report }));
    } catch (error) {
        lastStatus = {
            lastRunAt: new Date(started).toISOString(),
            durationMs: Date.now() - started,
            ok: false,
            error: error instanceof Error ? error.message.slice(0, 300) : "unknown error",
        };
        console.error(
            JSON.stringify({
                level: "error",
                time: lastStatus.lastRunAt,
                message: "retention failed",
                error: lastStatus.error,
            }),
        );
    }
    return lastStatus;
}

let timer: ReturnType<typeof setInterval> | undefined;

/** Starts the hourly retention job once per process. Errors are logged, never thrown. */
export function scheduleRetention(intervalMs = 3_600_000): void {
    if (timer) return;
    const run = () => {
        void runRetentionObserved();
    };
    // First run shortly after start-up, so a restart does not delay purges by a full interval.
    setTimeout(run, 60_000).unref();
    timer = setInterval(run, intervalMs);
    timer.unref();
}
