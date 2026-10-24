/**
 * Background work of the Integration Center (registered on import, see hooks.server.ts):
 *
 * - integration.deliver: one event to one endpoint (deliveries.ts), retried with backoff, Retry-After honoured.
 * - integration.revoke: personal connections of people who left, revoked at the provider then deleted.
 * - integration.sync: periodic work of personal connections, only while it is useful: people WorkAdventure asked about
 *   in the last 30 minutes (coding activity, token refresh), and calendars of people who enabled their Slack status
 *   ("In a meeting" during busy events, cleared by Slack at the end of the meeting).
 *
 * scheduleIntegrationSync() enqueues due syncs every two minutes (one job per connection, same idempotency key, so a
 * pending sync is never doubled); several instances can run it.
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { db, schema } from "../db/client";
import { DEFAULT_LOCALE, isLocale, messagesFor } from "../../i18n";
import { readIntegrationSettings } from "../../settings/integrationSettings";
import { describeError, logJson } from "../security/requestLog";
import { PermanentJobError, RetryLaterJobError, enqueueJob, registerJobHandler, type Job } from "../services/jobs";
import { fetchCalendar } from "./calendar";
import { markFailure, personalConnection, revokeAtProvider, withAccessToken, type Connection } from "./connections";
import { attemptDelivery } from "./deliveries";
import { refreshCoding } from "./presence";
import { setSlackStatus } from "./providers/slack";
import type { ProviderId } from "./types";

const Ids = {
    delivery: z.object({ deliveryId: z.string().uuid() }),
    connection: z.object({ connectionId: z.string().uuid() }),
};

async function connectionOf(job: Job, connectionId: string): Promise<Connection | undefined> {
    if (!job.organizationId) return undefined;
    const [row] = await db()
        .select()
        .from(schema.integrationConnections)
        .where(
            and(
                eq(schema.integrationConnections.id, connectionId),
                eq(schema.integrationConnections.organizationId, job.organizationId),
            ),
        );
    return row;
}

registerJobHandler(
    "integration.deliver",
    async (job) => {
        const { deliveryId } = Ids.delivery.parse(job.payload);
        if (!job.organizationId) throw new PermanentJobError("integration.deliver without organization");
        const outcome = await attemptDelivery(deliveryId, job.organizationId, {
            finalAttempt: job.attempts >= job.maxAttempts,
        });
        if (outcome.status === "succeeded" || outcome.status === "skipped") {
            return { status: outcome.status, httpStatus: outcome.httpStatus, error: outcome.error };
        }
        const message = `delivery ${outcome.status}: ${outcome.error ?? "unknown"}`;
        if (outcome.status === "failed") throw new PermanentJobError(message);
        throw outcome.retryAfterSec
            ? new RetryLaterJobError(message, outcome.retryAfterSec * 1000)
            : new Error(message);
    },
    {
        // A job that ran out of time (timeout) leaves the delivery pending: record its final failure.
        onFailure: async (job, error, final) => {
            if (!final || !job.organizationId) return;
            const parsed = Ids.delivery.safeParse(job.payload);
            if (!parsed.success) return;
            await db()
                .update(schema.integrationDeliveries)
                .set({ status: "failed", lastError: error.slice(0, 300), finishedAt: new Date() })
                .where(
                    and(
                        eq(schema.integrationDeliveries.id, parsed.data.deliveryId),
                        eq(schema.integrationDeliveries.organizationId, job.organizationId),
                        eq(schema.integrationDeliveries.status, "pending"),
                    ),
                );
        },
    },
);

registerJobHandler("integration.revoke", async (job) => {
    const { connectionId } = Ids.connection.parse(job.payload);
    const connection = await connectionOf(job, connectionId);
    // Gone, or connected again since (the person came back): nothing to do.
    if (!connection || connection.status !== "revoked") return { skipped: true };
    const outcome = await revokeAtProvider(connection);
    await db()
        .delete(schema.integrationConnections)
        .where(
            and(
                eq(schema.integrationConnections.id, connection.id),
                eq(schema.integrationConnections.status, "revoked"),
            ),
        );
    await audit({
        action: "integration.revoke",
        actorLabel: "system:jobs",
        organizationId: connection.organizationId,
        targetType: "integration",
        targetId: connection.id,
        details: {
            provider: connection.provider,
            personal: connection.accountId !== null,
            outcome,
            reason: connection.lastError,
        },
    });
    return { outcome };
});

/** Sets the Slack status of a person in a busy calendar event (once per event; Slack clears it at the end). */
async function syncSlackStatus(calendar: Connection, now: Date): Promise<string> {
    if (!calendar.accountId) return "notPersonal";
    const slack = await personalConnection(calendar.organizationId, calendar.accountId, "slack");
    if (!slack || slack.status !== "connected" || !readIntegrationSettings(slack.settings).statusSync)
        return "statusSyncOff";
    const events = await fetchCalendar(calendar, "busy", now, new Date(now.getTime() + 60_000), "");
    const current = events.find(
        (e) => e.busy && !e.allDay && Date.parse(e.start) <= now.getTime() && Date.parse(e.end) > now.getTime(),
    );
    if (!current) return "free";
    const key = `${calendar.provider}:${current.id}:${current.start}`.slice(0, 300);
    const slackSettings = readIntegrationSettings(slack.settings);
    if (slackSettings.statusSetFor === key) return "alreadySet";
    const [account] = await db()
        .select({ locale: schema.accounts.locale })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, calendar.accountId));
    const locale = isLocale(account?.locale) ? account.locale : DEFAULT_LOCALE;
    await withAccessToken(slack, (token) =>
        setSlackStatus(token, {
            text: messagesFor(locale).integrationCenter.statusText,
            emoji: ":spiral_calendar_pad:",
            expiration: new Date(current.end),
        }),
    );
    await db()
        .update(schema.integrationConnections)
        .set({ settings: { ...slackSettings, statusSetFor: key }, lastSyncAt: now, lastError: null })
        .where(eq(schema.integrationConnections.id, slack.id));
    return "statusSet";
}

registerJobHandler("integration.sync", async (job) => {
    const { connectionId } = Ids.connection.parse(job.payload);
    const connection = await connectionOf(job, connectionId);
    if (!connection || connection.status !== "connected" || !connection.accountId) return { skipped: true };
    const now = new Date();
    try {
        let result: string;
        switch (connection.provider as ProviderId) {
            case "google":
            case "microsoft":
                result = await syncSlackStatus(connection, now);
                break;
            case "github":
            case "gitlab":
                result = (await refreshCoding(connection, now)) ? "activity" : "noActivity";
                break;
            default:
                result = "nothingToDo";
        }
        await db()
            .update(schema.integrationConnections)
            .set({ lastSyncAt: now })
            .where(eq(schema.integrationConnections.id, connection.id));
        return { result };
    } catch (error) {
        // Recorded on the connection (expired when its credentials are dead); the next round tries again.
        await markFailure(connection.id, error);
        logJson("warn", "integration sync failed", {
            connectionId: connection.id,
            provider: connection.provider,
            error: describeError(error),
        });
        return { error: describeError(error).message };
    }
});

/** Enqueues the syncs that are due (see the module comment for "useful"). Returns how many. */
export async function enqueueDueSyncs(limit = 200): Promise<number> {
    const rows = await db().execute(sql`
        select c.id, c.organization_id
        from integration_connections c
        where c.status = 'connected' and c.account_id is not null
          and c.provider in ('google', 'microsoft', 'github', 'gitlab')
          and (c.last_sync_at is null or c.last_sync_at < now() - interval '4 minutes')
          and (
                (c.provider in ('github', 'gitlab') and coalesce((c.settings->>'shareActivity')::boolean, false)
                    and c.last_used_at > now() - interval '30 minutes')
             or (c.provider in ('google', 'microsoft') and exists (
                    select 1 from integration_connections s
                    where s.organization_id = c.organization_id and s.account_id = c.account_id
                      and s.provider = 'slack' and s.status = 'connected'
                      and coalesce((s.settings->>'statusSync')::boolean, false)))
          )
        order by c.last_sync_at nulls first
        limit ${limit}`);
    const due = rows as unknown as { id: string; organization_id: string }[];
    for (const row of due) {
        await enqueueJob(db(), {
            kind: "integration.sync",
            organizationId: row.organization_id,
            payload: { connectionId: row.id },
            idempotencyKey: `integration.sync:${row.id}`,
            maxAttempts: 1,
        });
    }
    return due.length;
}

let timer: ReturnType<typeof setInterval> | undefined;

/** Starts the sync scheduler of this process (servers running the job worker). Errors are logged, never thrown. */
export function scheduleIntegrationSync(intervalMs = 120_000): void {
    if (timer) return;
    timer = setInterval(() => {
        enqueueDueSyncs().catch((error: unknown) =>
            logJson("error", "integration sync scheduling failed", { error: describeError(error) }),
        );
    }, intervalMs);
    timer.unref();
}

export function stopIntegrationSync(): void {
    if (timer) clearInterval(timer);
    timer = undefined;
}

/**
 * Retention (called by services/retention.ts): events and their deliveries after 30 days (pending ones are kept),
 * finished or expired OAuth flows after a day, inbound delivery ids after 7 days.
 */
export async function purgeIntegrationRecords(
    now = new Date(),
): Promise<{ events: number; oauthStates: number; inbound: number }> {
    const day = 86_400_000;
    const events = await db().execute(sql`
        delete from integration_events e
        where e.occurred_at < ${new Date(now.getTime() - 30 * day).toISOString()}::timestamptz
          and not exists (select 1 from integration_deliveries d where d.event_id = e.id and d.status = 'pending')
        returning e.id`);
    const states = await db()
        .delete(schema.integrationOauthStates)
        .where(
            sql`${schema.integrationOauthStates.expiresAt} < ${new Date(now.getTime() - day).toISOString()}::timestamptz`,
        )
        .returning({ id: schema.integrationOauthStates.id });
    const inbound = await db()
        .delete(schema.integrationInboundEvents)
        .where(
            sql`${schema.integrationInboundEvents.receivedAt} < ${new Date(now.getTime() - 7 * day).toISOString()}::timestamptz`,
        )
        .returning({ id: schema.integrationInboundEvents.externalId });
    return { events: (events as unknown as unknown[]).length, oauthStates: states.length, inbound: inbound.length };
}
