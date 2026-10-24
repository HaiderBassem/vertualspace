/**
 * Inbound webhooks from providers (public routes under /integrations/webhooks/): verified on the raw body before
 * anything is parsed, de-duplicated, answered fast (Slack wants an answer within 3 seconds).
 *
 * - Slack Events API (/integrations/webhooks/slack): signed with SLACK_SIGNING_SECRET (v0 HMAC, 5-minute window);
 *   url_verification is echoed; tokens_revoked and app_uninstalled revoke the matching connections at once.
 * - GitHub (/integrations/webhooks/github/{receiver}): X-Hub-Signature-256 with the receiver's secret; "ping" proves the
 *   receiver works (it becomes "connected"); pushes and pull requests update the activity of people who connected
 *   their own GitHub account and share it.
 * - GitLab (/integrations/webhooks/gitlab/{receiver}): X-Gitlab-Token; same activity rules.
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { config } from "../config";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";
import { json } from "../http/problem";
import { logJson } from "../security/requestLog";
import { openSecret } from "../services/secrets";
import { readIntegrationSettings } from "../../settings/integrationSettings";
import { githubWebhookActivity } from "./providers/github";
import { gitlabWebhookActivity } from "./providers/gitlab";
import { verifyGithubSignature, verifyGitlabToken, verifySlackSignature } from "./signatures";

const MAX_BODY_BYTES = 1_000_000;
const C = schema.integrationConnections;

/** The raw body, refused above 1 MB (signatures are computed on the exact bytes received). */
async function rawBody(request: Request): Promise<string | Response> {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return new Response(null, { status: 413 });
    return text;
}

/** Records a delivery id; false when it was already processed (replay or provider retry). */
async function firstDelivery(provider: string, externalId: string, organizationId: string | null): Promise<boolean> {
    const rows = await db()
        .insert(schema.integrationInboundEvents)
        .values({ provider, externalId: externalId.slice(0, 200), organizationId })
        .onConflictDoNothing()
        .returning({ id: schema.integrationInboundEvents.externalId });
    return rows.length > 0;
}

function parseJson(body: string): unknown {
    try {
        return JSON.parse(body);
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------------------------
// Slack Events API
// ---------------------------------------------------------------------------------------------

const SlackEnvelope = z
    .object({
        type: z.string(),
        challenge: z.string().max(200).optional(),
        team_id: z.string().max(40).optional(),
        event_id: z.string().max(100).optional(),
        event: z
            .object({
                type: z.string(),
                tokens: z
                    .object({ oauth: z.array(z.string()).optional(), bot: z.array(z.string()).optional() })
                    .optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();

/** Revokes the Slack connections of a workspace: all of them, or the people whose user tokens were revoked. */
async function revokeSlack(teamId: string, userIds: string[] | "all", includeBot: boolean): Promise<number> {
    const team = sql`${C.settings}->>'teamId' = ${teamId}`;
    const conditions = [];
    if (userIds === "all") conditions.push(and(eq(C.provider, "slack"), team));
    else {
        if (userIds.length > 0)
            conditions.push(and(eq(C.provider, "slack"), team, inArray(C.externalAccountId, userIds)));
        if (includeBot)
            conditions.push(and(eq(C.provider, "slack"), isNull(C.accountId), eq(C.externalAccountId, teamId)));
    }
    let count = 0;
    for (const condition of conditions) {
        const rows = await db()
            .update(C)
            .set({ status: "revoked", lastError: "revokedAtProvider", accessToken: null, refreshToken: null })
            .where(condition)
            .returning({ id: C.id });
        count += rows.length;
    }
    return count;
}

export async function handleSlackEvents(request: Request, now = Math.floor(Date.now() / 1000)): Promise<Response> {
    const secret = config().SLACK_SIGNING_SECRET;
    if (!secret) return new Response(null, { status: 404 });
    const body = await rawBody(request);
    if (body instanceof Response) return body;
    const verification = verifySlackSignature(
        secret,
        request.headers.get("x-slack-request-timestamp") ?? "",
        body,
        request.headers.get("x-slack-signature") ?? "",
        now,
    );
    if (verification !== "ok") return new Response(null, { status: 401 });
    const parsed = SlackEnvelope.safeParse(parseJson(body));
    if (!parsed.success) return new Response(null, { status: 400 });
    const envelope = parsed.data;
    if (envelope.type === "url_verification") return json({ challenge: envelope.challenge ?? "" });
    if (envelope.type !== "event_callback" || !envelope.event || !envelope.team_id)
        return new Response(null, { status: 200 });
    if (envelope.event_id && !(await firstDelivery("slack", envelope.event_id, null)))
        return new Response(null, { status: 200 });
    if (envelope.event.type === "app_uninstalled") {
        const revoked = await revokeSlack(envelope.team_id, "all", true);
        logJson("info", "slack app uninstalled", { teamId: envelope.team_id, revoked });
    } else if (envelope.event.type === "tokens_revoked") {
        const tokens = envelope.event.tokens ?? {};
        const revoked = await revokeSlack(envelope.team_id, tokens.oauth ?? [], (tokens.bot ?? []).length > 0);
        logJson("info", "slack tokens revoked", { teamId: envelope.team_id, revoked });
    }
    return new Response(null, { status: 200 });
}

// ---------------------------------------------------------------------------------------------
// GitHub and GitLab receivers
// ---------------------------------------------------------------------------------------------

async function receiver(provider: "github" | "gitlab", id: string) {
    if (!isUuid(id)) return undefined;
    const [row] = await db()
        .select()
        .from(C)
        .where(and(eq(C.id, id), eq(C.provider, provider), isNull(C.accountId)));
    return row && (row.status === "pending" || row.status === "connected") ? row : undefined;
}

/** Updates the activity of the person (personal connection, same organization) who shares it. */
async function recordActivity(
    organizationId: string,
    provider: "github" | "gitlab",
    activity: { senderId: string; repo: string; at: string },
): Promise<boolean> {
    const people = await db()
        .select()
        .from(C)
        .where(
            and(
                eq(C.organizationId, organizationId),
                eq(C.provider, provider),
                eq(C.externalAccountId, activity.senderId),
                eq(C.status, "connected"),
                sql`${C.accountId} is not null`,
            ),
        );
    const sharing = people.filter((p) => readIntegrationSettings(p.settings).shareActivity);
    for (const person of sharing) {
        await db()
            .update(C)
            .set({ activity: { provider, repo: activity.repo, at: activity.at } })
            .where(eq(C.id, person.id));
    }
    return sharing.length > 0;
}

async function markReceiverWorking(id: string): Promise<void> {
    await db()
        .update(C)
        .set({ status: "connected", lastTestedAt: new Date(), lastSyncAt: new Date(), lastError: null })
        .where(eq(C.id, id));
}

export async function handleGithubWebhook(request: Request, receiverId: string): Promise<Response> {
    const row = await receiver("github", receiverId);
    if (!row) return new Response(null, { status: 404 });
    const body = await rawBody(request);
    if (body instanceof Response) return body;
    const secret = openSecret(row.secret);
    if (!secret || !verifyGithubSignature(secret, body, request.headers.get("x-hub-signature-256") ?? "")) {
        return new Response(null, { status: 401 });
    }
    const delivery = request.headers.get("x-github-delivery") ?? "";
    if (delivery && !(await firstDelivery("github", delivery, row.organizationId))) {
        return json({ status: "duplicate" }, { status: 200 });
    }
    await markReceiverWorking(row.id);
    const event = (request.headers.get("x-github-event") ?? "").slice(0, 60);
    const activity = githubWebhookActivity(event, parseJson(body));
    const recorded = activity ? await recordActivity(row.organizationId, "github", activity) : false;
    return json({ status: "ok", event, activity: recorded }, { status: 202 });
}

export async function handleGitlabWebhook(request: Request, receiverId: string): Promise<Response> {
    const row = await receiver("gitlab", receiverId);
    if (!row) return new Response(null, { status: 404 });
    const body = await rawBody(request);
    if (body instanceof Response) return body;
    const secret = openSecret(row.secret);
    if (!secret || !verifyGitlabToken(secret, request.headers.get("x-gitlab-token") ?? "")) {
        return new Response(null, { status: 401 });
    }
    const delivery = request.headers.get("x-gitlab-event-uuid") ?? request.headers.get("idempotency-key") ?? "";
    if (delivery && !(await firstDelivery("gitlab", delivery, row.organizationId))) {
        return json({ status: "duplicate" }, { status: 200 });
    }
    await markReceiverWorking(row.id);
    const activity = gitlabWebhookActivity(parseJson(body));
    const recorded = activity ? await recordActivity(row.organizationId, "gitlab", activity) : false;
    return json({ status: "ok", activity: recorded }, { status: 202 });
}
