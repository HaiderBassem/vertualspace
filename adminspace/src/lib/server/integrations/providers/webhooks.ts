/**
 * Providers reached through a webhook URL an administrator pastes (no OAuth application on this server): Discord,
 * Microsoft Teams (Workflows), Zapier, n8n and any HTTPS endpoint. The URL is the credential: it is sealed at rest,
 * shown only as a hint, and every request goes through guardedRequest.ts (no private addresses, no redirects).
 *
 * - Discord: POST {url}?wait=true with embeds; 429 { retry_after, global }. Discord bans IP addresses that make 10,000
 *   invalid requests (401/403/429) in 10 minutes: endpoints that keep failing are disabled. Discord has no API to set
 *   a user's status.
 * - Teams: Office 365 connectors (incoming webhooks on *.webhook.office.com) are retired; a Workflows webhook
 *   ("Send webhook alerts to a channel") takes { type: "message", attachments: [Adaptive Card] } and answers 202.
 * - Zapier ("Webhooks by Zapier" Catch Hook), n8n (Webhook node) and generic endpoints receive Standard Webhooks
 *   requests signed with the endpoint's whsec_ secret.
 */
import type { EndpointKind, ProviderDefinition } from "../types";

const DISCORD_WEBHOOK =
    /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d{5,30})\/([A-Za-z0-9_-]{20,200})$/;
const ZAPIER_HOOK = /^https:\/\/hooks\.zapier\.com\/hooks\/(?:catch|standard)\/[A-Za-z0-9/_-]{3,300}$/;

export function isDiscordWebhookUrl(url: string): boolean {
    return DISCORD_WEBHOOK.test(url);
}

/** The execute URL of a Discord webhook on API v10, waiting for the message (errors come back in the answer). */
export function discordExecuteUrl(url: string): string {
    const match = DISCORD_WEBHOOK.exec(url);
    if (!match) throw new Error("not a Discord webhook URL");
    return `https://discord.com/api/v10/webhooks/${match[1]}/${match[2]}?wait=true`;
}

export type TeamsUrlProblem = "retiredConnector" | "notTeamsUrl";

/** Teams Workflows URLs are on Azure Logic Apps or Power Platform hosts; connector URLs are refused (retired). */
export function teamsUrlProblem(url: string): TeamsUrlProblem | undefined {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return "notTeamsUrl";
    }
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".webhook.office.com") || host === "outlook.office.com" || host === "outlook.office365.com") {
        return "retiredConnector";
    }
    if (parsed.protocol !== "https:") return "notTeamsUrl";
    return host.endsWith(".logic.azure.com") || host.endsWith(".powerplatform.com") ? undefined : "notTeamsUrl";
}

export function isZapierHookUrl(url: string): boolean {
    return ZAPIER_HOOK.test(url);
}

/** What may be shown of a webhook URL: scheme, host and the first characters of the path (never the token part). */
export function urlHint(url: string): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname.length > 18 ? `${parsed.pathname.slice(0, 18)}…` : parsed.pathname;
        return `${parsed.protocol}//${parsed.host}${path}`.slice(0, 200);
    } catch {
        return "";
    }
}

function endpointProvider(
    id: "discord" | "teams" | "zapier" | "n8n" | "webhook",
    kind: EndpointKind,
    category: ProviderDefinition["category"],
    setupUrl: string,
    automation = false,
): ProviderDefinition {
    return {
        id,
        category,
        capabilities: automation ? ["notifications", "automation"] : ["notifications"],
        organization: { method: "endpoints", env: [], scopes: [] },
        endpointKind: kind,
        setupUrl,
    };
}

export const discord = endpointProvider(
    "discord",
    "discord",
    "chat",
    "https://support.discord.com/hc/articles/228383668-Intro-to-Webhooks",
);
export const teams = endpointProvider(
    "teams",
    "teams",
    "chat",
    "https://support.microsoft.com/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498",
);
export const zapier = endpointProvider(
    "zapier",
    "zapier",
    "automation",
    "https://help.zapier.com/hc/articles/8496288690317-Trigger-Zaps-from-webhooks",
    true,
);
export const n8n = endpointProvider(
    "n8n",
    "n8n",
    "automation",
    "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/",
    true,
);
export const webhook = endpointProvider("webhook", "webhook", "automation", "https://www.standardwebhooks.com", true);
