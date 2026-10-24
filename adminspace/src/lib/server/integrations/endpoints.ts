/**
 * Notification endpoints of an organization: where its events go and which ones. Every query is scoped by
 * organization id (an id from a form never reaches another tenant's row). URLs and signing secrets are sealed; pages
 * get endpointView() (a hint of the URL, never the URL).
 */
import { and, asc, eq } from "drizzle-orm";
import { config } from "../config";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";
import { openSecret, sealSecret } from "../services/secrets";
import { ORG_EVENT_TYPES, type OrgEventType } from "./events";
import { checkOutgoingUrl, type OutgoingUrlProblem } from "./guardedRequest";
import {
    isDiscordWebhookUrl,
    isZapierHookUrl,
    teamsUrlProblem,
    urlHint,
    type TeamsUrlProblem,
} from "./providers/webhooks";
import { isSlackWebhookUrl, normalizeSlackChannel } from "./providers/slack";
import { newWebhookSecret } from "./signatures";
import { organizationConnection } from "./connections";
import type { EndpointKind } from "./types";

export type Endpoint = typeof schema.integrationEndpoints.$inferSelect;
const E = schema.integrationEndpoints;

/** Kinds whose requests are signed with Standard Webhooks (a whsec_ secret per endpoint). */
export const SIGNED_KINDS: readonly EndpointKind[] = ["webhook", "zapier", "n8n"];

export type EndpointTargetProblem =
    | OutgoingUrlProblem
    | TeamsUrlProblem
    | "notDiscordUrl"
    | "notSlackUrl"
    | "notZapierUrl"
    | "urlRequired"
    | "invalidChannel"
    | "slackNotConnected";

/** Checks what an administrator typed for an endpoint of this kind, including where the URL resolves to. */
export async function checkEndpointTarget(
    organizationId: string,
    kind: EndpointKind,
    input: { url?: string | undefined; channel?: string | undefined },
): Promise<{ ok: true; url: string | null; channel: string | null } | { ok: false; problem: EndpointTargetProblem }> {
    const url = input.url?.trim() ?? "";
    if (kind === "slack" && !url) {
        const channel = normalizeSlackChannel(input.channel ?? "");
        if (!channel) return { ok: false, problem: input.channel ? "invalidChannel" : "urlRequired" };
        const connection = await organizationConnection(organizationId, "slack");
        if (connection?.status !== "connected") return { ok: false, problem: "slackNotConnected" };
        return { ok: true, url: null, channel };
    }
    if (!url) return { ok: false, problem: "urlRequired" };
    if (kind === "slack" && !isSlackWebhookUrl(url)) return { ok: false, problem: "notSlackUrl" };
    if (kind === "discord" && !isDiscordWebhookUrl(url)) return { ok: false, problem: "notDiscordUrl" };
    if (kind === "zapier" && !isZapierHookUrl(url)) return { ok: false, problem: "notZapierUrl" };
    if (kind === "teams") {
        const problem = teamsUrlProblem(url);
        if (problem) return { ok: false, problem };
    }
    const problem = await checkOutgoingUrl(url, config().INTEGRATION_ALLOWED_PRIVATE_HOSTS);
    if (problem) return { ok: false, problem };
    return { ok: true, url, channel: null };
}

export function cleanEventTypes(values: readonly string[]): OrgEventType[] {
    return ORG_EVENT_TYPES.filter((type) => values.includes(type));
}

export async function createEndpoint(input: {
    organizationId: string;
    kind: EndpointKind;
    name: string;
    url: string | null;
    channel: string | null;
    eventTypes: OrgEventType[];
    createdBy: string;
}): Promise<{ endpoint: Endpoint; signingSecret: string | null }> {
    const signingSecret = SIGNED_KINDS.includes(input.kind) ? newWebhookSecret() : null;
    const [endpoint] = await db()
        .insert(E)
        .values({
            organizationId: input.organizationId,
            kind: input.kind,
            name: input.name,
            url: input.url ? sealSecret(input.url) : null,
            urlHint: input.url ? urlHint(input.url) : null,
            channel: input.channel,
            signingSecret: signingSecret ? sealSecret(signingSecret) : null,
            eventTypes: input.eventTypes,
            createdBy: input.createdBy,
        })
        .returning();
    if (!endpoint) throw new Error("Endpoint insert returned no row");
    return { endpoint, signingSecret };
}

export function listEndpoints(organizationId: string): Promise<Endpoint[]> {
    return db().select().from(E).where(eq(E.organizationId, organizationId)).orderBy(asc(E.createdAt));
}

export async function getEndpoint(organizationId: string, id: string): Promise<Endpoint | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await db()
        .select()
        .from(E)
        .where(and(eq(E.organizationId, organizationId), eq(E.id, id)));
    return row;
}

/** Name, subscriptions and enabled state. Enabling again clears the automatic disabling and its failure count. */
export async function updateEndpoint(
    organizationId: string,
    id: string,
    patch: { name?: string; eventTypes?: OrgEventType[]; enabled?: boolean },
): Promise<Endpoint | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await db()
        .update(E)
        .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.eventTypes !== undefined ? { eventTypes: patch.eventTypes } : {}),
            ...(patch.enabled !== undefined
                ? patch.enabled
                    ? { enabled: true, disabledReason: null, consecutiveFailures: 0 }
                    : { enabled: false, disabledReason: null }
                : {}),
        })
        .where(and(eq(E.organizationId, organizationId), eq(E.id, id)))
        .returning();
    return row;
}

export async function deleteEndpoint(organizationId: string, id: string): Promise<Endpoint | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await db()
        .delete(E)
        .where(and(eq(E.organizationId, organizationId), eq(E.id, id)))
        .returning();
    return row;
}

/** A new signing secret (shown once); the old one stops being used at once. */
export async function rotateSigningSecret(organizationId: string, id: string): Promise<string | undefined> {
    const endpoint = await getEndpoint(organizationId, id);
    if (!endpoint || !SIGNED_KINDS.includes(endpoint.kind)) return undefined;
    const secret = newWebhookSecret();
    await db()
        .update(E)
        .set({ signingSecret: sealSecret(secret) })
        .where(and(eq(E.organizationId, organizationId), eq(E.id, id)));
    return secret;
}

/** The sealed URL and secret of an endpoint, opened for a delivery (server side only). */
export function endpointCredentials(endpoint: Endpoint): {
    url: string | undefined;
    signingSecret: string | undefined;
} {
    return { url: openSecret(endpoint.url), signingSecret: openSecret(endpoint.signingSecret) };
}

/** What pages may see of an endpoint. */
export function endpointView(endpoint: Endpoint) {
    return {
        id: endpoint.id,
        kind: endpoint.kind,
        name: endpoint.name,
        urlHint: endpoint.urlHint,
        channel: endpoint.channel,
        eventTypes: cleanEventTypes(endpoint.eventTypes),
        enabled: endpoint.enabled,
        signed: endpoint.signingSecret !== null,
        consecutiveFailures: endpoint.consecutiveFailures,
        disabledReason: endpoint.disabledReason,
        lastSuccessAt: endpoint.lastSuccessAt?.toISOString() ?? null,
        lastFailureAt: endpoint.lastFailureAt?.toISOString() ?? null,
        lastError: endpoint.lastError,
        createdAt: endpoint.createdAt.toISOString(),
    };
}
export type EndpointView = ReturnType<typeof endpointView>;
