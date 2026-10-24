/**
 * Delivery of events to endpoints: one attempt (attemptDelivery), run by the "integration.deliver" job with retries
 * and backoff (jobs.ts), or directly for "Send a test event".
 *
 * Classification of answers:
 * - 2xx: delivered.
 * - 429: retried after Retry-After (Discord's retry_after too).
 * - 408, 5xx, timeouts, network errors: retried with exponential backoff (8 attempts, about two hours).
 * - 410 Gone: the endpoint is disabled (the receiver asked to stop; Standard Webhooks and Slack use it).
 * - 401/403/404 from a chat webhook (Slack, Discord, Teams): the webhook was deleted or its token is wrong; the endpoint
 *   is disabled at once (Discord bans addresses that keep sending invalid requests).
 * - Other 4xx and redirects: this delivery fails without retry.
 * - An endpoint failing 10 times in a row is disabled. Enabling it again (or retrying a delivery) is a person's choice.
 */
import { and, count, desc, eq, sql } from "drizzle-orm";
import { config } from "../config";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";
import { enqueueJob } from "../services/jobs";
import { describeEvent, recordEvent, type DeliverableEventType, type EventActor } from "./events";
import { endpointCredentials, type Endpoint } from "./endpoints";
import { discordPayload, slackMessage, teamsPayload, webhookBody } from "./formatters";
import {
    GuardedRequestError,
    guardedRequest,
    headerValue,
    type GuardedRequestInit,
    type GuardedResponse,
} from "./guardedRequest";
import { ProviderError } from "./http";
import { organizationConnection, withAccessToken } from "./connections";
import { postSlackMessage } from "./providers/slack";
import { discordExecuteUrl } from "./providers/webhooks";
import { standardWebhookHeaders } from "./signatures";

export const FAILURE_LIMIT = 10;
const D = schema.integrationDeliveries;
const E = schema.integrationEndpoints;

export type Transport = (url: string, init: GuardedRequestInit) => Promise<GuardedResponse>;

export interface DeliveryOutcome {
    status: "succeeded" | "retry" | "failed" | "skipped";
    httpStatus: number | null;
    /** Short code: "http_500", "timeout", "privateAddress", "channel_not_found"... */
    error: string | null;
    retryAfterSec?: number | undefined;
    /** Set when this answer disabled the endpoint. */
    disabled?: "gone" | "unauthorized" | "blocked" | "failing" | undefined;
}

interface Classified {
    ok: boolean;
    retry: boolean;
    error: string | null;
    retryAfterSec?: number | undefined;
    disable?: "gone" | "unauthorized" | "blocked" | undefined;
}

const CHAT_KINDS = new Set(["slack", "discord", "teams"]);

/** Discord's 429 body carries retry_after (seconds, may be fractional). */
function discordRetryAfter(body: string): number | undefined {
    try {
        const value = (JSON.parse(body) as { retry_after?: unknown }).retry_after;
        return typeof value === "number" && Number.isFinite(value) ? Math.ceil(value) : undefined;
    } catch {
        return undefined;
    }
}

export function classifyAnswer(kind: Endpoint["kind"], response: GuardedResponse): Classified {
    const status = response.status;
    if (status >= 200 && status < 300) return { ok: true, retry: false, error: null };
    const error = `http_${status}`;
    if (status === 429) {
        const header = Number(headerValue(response.headers, "retry-after"));
        const retryAfterSec =
            (kind === "discord" ? discordRetryAfter(response.body) : undefined) ??
            (Number.isFinite(header) ? header : 60);
        return { ok: false, retry: true, error, retryAfterSec: Math.min(3600, Math.max(1, Math.ceil(retryAfterSec))) };
    }
    if (status === 410) return { ok: false, retry: false, error, disable: "gone" };
    if ([401, 403, 404].includes(status) && CHAT_KINDS.has(kind)) {
        return { ok: false, retry: false, error, disable: "unauthorized" };
    }
    if (status === 408 || status >= 500) return { ok: false, retry: true, error };
    return { ok: false, retry: false, error };
}

function transportError(error: unknown): Classified {
    if (error instanceof GuardedRequestError) {
        if (error.code === "timeout" || error.code === "network" || error.code === "unresolvable") {
            return { ok: false, retry: true, error: error.code };
        }
        // The URL now resolves to a private address, or is not acceptable any more: stop using it.
        return { ok: false, retry: false, error: error.code, disable: "blocked" };
    }
    if (error instanceof ProviderError) {
        if (["rateLimited", "unavailable", "timeout"].includes(error.code)) {
            return {
                ok: false,
                retry: true,
                error: error.providerCode ?? error.code,
                retryAfterSec: error.retryAfterSec,
            };
        }
        if (error.code === "unauthorized" || error.code === "invalidGrant") {
            return { ok: false, retry: false, error: error.providerCode ?? error.code, disable: "unauthorized" };
        }
        return { ok: false, retry: false, error: error.providerCode ?? error.code };
    }
    return { ok: false, retry: true, error: "unexpected" };
}

const defaultTransport: Transport = (url, init) =>
    guardedRequest(url, { ...init, allowedPrivateHosts: config().INTEGRATION_ALLOWED_PRIVATE_HOSTS });

/** Sends one event to one endpoint and classifies the outcome (no database write). */
async function send(
    endpoint: Endpoint,
    event: { id: string; type: DeliverableEventType; data: Record<string, unknown>; occurredAt: Date },
    deliveryId: string,
    organization: { name: string; defaultLocale: string },
    transport: Transport,
): Promise<Classified & { httpStatus: number | null }> {
    const { url, signingSecret } = endpointCredentials(endpoint);
    const json = { "content-type": "application/json" };
    try {
        if (endpoint.kind === "slack" && !url) {
            const connection = await organizationConnection(endpoint.organizationId, "slack");
            if (!connection || !endpoint.channel)
                return {
                    ok: false,
                    retry: false,
                    error: "slackNotConnected",
                    disable: "unauthorized",
                    httpStatus: null,
                };
            const message = slackMessage(describeEvent(event, organization));
            await withAccessToken(connection, (token) => postSlackMessage(token, endpoint.channel!, message));
            return { ok: true, retry: false, error: null, httpStatus: 200 };
        }
        if (!url) return { ok: false, retry: false, error: "unreadableUrl", disable: "blocked", httpStatus: null };
        let response: GuardedResponse;
        switch (endpoint.kind) {
            case "slack":
                response = await transport(url, {
                    method: "POST",
                    headers: json,
                    body: JSON.stringify(slackMessage(describeEvent(event, organization))),
                });
                break;
            case "discord":
                response = await transport(discordExecuteUrl(url), {
                    method: "POST",
                    headers: json,
                    body: JSON.stringify(discordPayload(describeEvent(event, organization))),
                });
                break;
            case "teams":
                response = await transport(url, {
                    method: "POST",
                    headers: json,
                    body: JSON.stringify(teamsPayload(describeEvent(event, organization))),
                });
                break;
            default: {
                const body = webhookBody(event);
                const headers = signingSecret
                    ? {
                          ...json,
                          ...standardWebhookHeaders(signingSecret, deliveryId, Math.floor(Date.now() / 1000), body),
                      }
                    : json;
                response = await transport(url, { method: "POST", headers, body });
            }
        }
        return { ...classifyAnswer(endpoint.kind, response), httpStatus: response.status };
    } catch (error) {
        return {
            ...transportError(error),
            httpStatus: error instanceof ProviderError ? (error.httpStatus ?? null) : null,
        };
    }
}

/**
 * One delivery attempt. `finalAttempt`: no retry will follow, so a retryable failure is final too. Disabled endpoints
 * are skipped unless `ignoreDisabled` (a test sent by a person).
 */
export async function attemptDelivery(
    deliveryId: string,
    organizationId: string,
    options: { finalAttempt?: boolean; ignoreDisabled?: boolean; transport?: Transport } = {},
): Promise<DeliveryOutcome> {
    const [row] = await db()
        .select({ delivery: D, endpoint: E, event: schema.integrationEvents, organization: schema.organizations })
        .from(D)
        .innerJoin(E, and(eq(E.id, D.endpointId), eq(E.organizationId, D.organizationId)))
        .innerJoin(
            schema.integrationEvents,
            and(
                eq(schema.integrationEvents.id, D.eventId),
                eq(schema.integrationEvents.organizationId, D.organizationId),
            ),
        )
        .innerJoin(schema.organizations, eq(schema.organizations.id, D.organizationId))
        .where(and(eq(D.id, deliveryId), eq(D.organizationId, organizationId)));
    if (!row) return { status: "skipped", httpStatus: null, error: "deliveryGone" };
    if (row.delivery.status === "succeeded") return { status: "skipped", httpStatus: null, error: null };
    if (!row.endpoint.enabled && !options.ignoreDisabled) {
        await db()
            .update(D)
            .set({ status: "failed", lastError: "endpointDisabled", finishedAt: new Date() })
            .where(eq(D.id, deliveryId));
        return { status: "skipped", httpStatus: null, error: "endpointDisabled" };
    }

    const result = await send(
        row.endpoint,
        {
            id: row.event.id,
            type: row.event.type as DeliverableEventType,
            data: row.event.data,
            occurredAt: row.event.occurredAt,
        },
        deliveryId,
        { name: row.organization.name, defaultLocale: row.organization.defaultLocale },
        options.transport ?? defaultTransport,
    );
    const now = new Date();
    const final = result.ok || !result.retry || options.finalAttempt === true;
    await db()
        .update(D)
        .set({
            attempts: sql`${D.attempts} + 1`,
            responseStatus: result.httpStatus,
            lastError: result.error,
            status: result.ok ? "succeeded" : final ? "failed" : "pending",
            finishedAt: final ? now : null,
        })
        .where(eq(D.id, deliveryId));

    let disabled: DeliveryOutcome["disabled"];
    if (result.ok) {
        await db()
            .update(E)
            .set({ consecutiveFailures: 0, lastSuccessAt: now, lastError: null })
            .where(eq(E.id, row.endpoint.id));
    } else {
        const [endpoint] = await db()
            .update(E)
            .set({
                consecutiveFailures: sql`${E.consecutiveFailures} + 1`,
                lastFailureAt: now,
                lastError: result.error,
                ...(result.disable
                    ? { enabled: false, disabledReason: result.disable }
                    : {
                          enabled: sql`case when ${E.consecutiveFailures} + 1 >= ${FAILURE_LIMIT} then false else ${E.enabled} end`,
                          disabledReason: sql`case when ${E.consecutiveFailures} + 1 >= ${FAILURE_LIMIT} and ${E.enabled} then 'failing' else ${E.disabledReason} end`,
                      }),
            })
            .where(eq(E.id, row.endpoint.id))
            .returning({ enabled: E.enabled, disabledReason: E.disabledReason });
        if (row.endpoint.enabled && endpoint && !endpoint.enabled) {
            disabled = (endpoint.disabledReason as DeliveryOutcome["disabled"]) ?? "failing";
        }
    }
    return {
        status: result.ok ? "succeeded" : final ? "failed" : "retry",
        httpStatus: result.httpStatus,
        error: result.error,
        retryAfterSec: result.retryAfterSec,
        disabled,
    };
}

/** "Send a test event": one immediate attempt to one endpoint (even disabled), logged like any delivery. */
export async function sendTestEvent(
    organizationId: string,
    endpoint: Endpoint,
    by: EventActor,
    message: string,
    transport?: Transport,
): Promise<DeliveryOutcome> {
    const { deliveryIds } = await recordEvent(
        db(),
        organizationId,
        "integration.test",
        { message, by },
        [endpoint.id],
        {
            enqueue: false,
        },
    );
    const deliveryId = deliveryIds[0];
    if (!deliveryId) return { status: "skipped", httpStatus: null, error: "deliveryGone" };
    return attemptDelivery(deliveryId, organizationId, { finalAttempt: true, ignoreDisabled: true, transport });
}

export type RetryProblem = "notFound" | "notFailed" | "endpointDisabled";

/** Runs a failed delivery again (a fresh set of attempts), if its endpoint is enabled. */
export async function retryDelivery(organizationId: string, deliveryId: string): Promise<"ok" | RetryProblem> {
    if (!isUuid(deliveryId)) return "notFound";
    const [row] = await db()
        .select({ delivery: D, enabled: E.enabled })
        .from(D)
        .innerJoin(E, and(eq(E.id, D.endpointId), eq(E.organizationId, D.organizationId)))
        .where(and(eq(D.id, deliveryId), eq(D.organizationId, organizationId)));
    if (!row) return "notFound";
    if (row.delivery.status !== "failed") return "notFailed";
    if (!row.enabled) return "endpointDisabled";
    await db().transaction(async (tx) => {
        await tx
            .update(D)
            .set({ status: "pending", lastError: null, finishedAt: null })
            .where(and(eq(D.id, deliveryId), eq(D.organizationId, organizationId)));
        // Same idempotency key as the first job: a finished job is re-armed with a full set of attempts.
        await enqueueJob(tx, {
            kind: "integration.deliver",
            organizationId,
            payload: { deliveryId },
            idempotencyKey: `integration.deliver:${row.delivery.eventId}:${row.delivery.endpointId}`,
            maxAttempts: 8,
        });
    });
    return "ok";
}

export const DELIVERY_PAGE_SIZE = 50;

export interface DeliveryFilter {
    status?: "pending" | "succeeded" | "failed" | undefined;
    endpointId?: string | undefined;
    eventType?: string | undefined;
    page: number;
}

/** The delivery log of an organization, newest first, with filters. */
export async function listDeliveries(organizationId: string, filter: DeliveryFilter) {
    const where = and(
        eq(D.organizationId, organizationId),
        filter.status ? eq(D.status, filter.status) : undefined,
        filter.endpointId && isUuid(filter.endpointId) ? eq(D.endpointId, filter.endpointId) : undefined,
        filter.eventType ? eq(schema.integrationEvents.type, filter.eventType) : undefined,
    );
    const base = db()
        .select({
            id: D.id,
            status: D.status,
            attempts: D.attempts,
            responseStatus: D.responseStatus,
            lastError: D.lastError,
            createdAt: D.createdAt,
            finishedAt: D.finishedAt,
            eventId: D.eventId,
            eventType: schema.integrationEvents.type,
            endpointId: E.id,
            endpointName: E.name,
            endpointKind: E.kind,
        })
        .from(D)
        .innerJoin(E, and(eq(E.id, D.endpointId), eq(E.organizationId, D.organizationId)))
        .innerJoin(
            schema.integrationEvents,
            and(
                eq(schema.integrationEvents.id, D.eventId),
                eq(schema.integrationEvents.organizationId, D.organizationId),
            ),
        )
        .where(where);
    const [rows, totals] = await Promise.all([
        base
            .orderBy(desc(D.createdAt))
            .limit(DELIVERY_PAGE_SIZE)
            .offset((filter.page - 1) * DELIVERY_PAGE_SIZE),
        db()
            .select({ value: count() })
            .from(D)
            .innerJoin(
                schema.integrationEvents,
                and(
                    eq(schema.integrationEvents.id, D.eventId),
                    eq(schema.integrationEvents.organizationId, D.organizationId),
                ),
            )
            .where(where),
    ]);
    return {
        total: totals[0]?.value ?? 0,
        deliveries: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            finishedAt: r.finishedAt?.toISOString() ?? null,
        })),
    };
}
