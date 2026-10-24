/**
 * The provider registry: every integration AdminSpace offers, and whether this server is configured for it.
 * A provider is offered only when the environment variables of its mode are set (and ORIGIN, for flows that give the
 * provider a URL of this server); otherwise the Integration Center shows "Not configured" with the setup steps.
 */
import { config } from "../config";
import { integrationOrigin } from "./oauth";
import { github } from "./providers/github";
import { gitlab } from "./providers/gitlab";
import { google } from "./providers/google";
import { microsoft } from "./providers/microsoft";
import { miro } from "./providers/miro";
import { notion } from "./providers/notion";
import { slack } from "./providers/slack";
import { spotify } from "./providers/spotify";
import { trello } from "./providers/trello";
import { discord, n8n, teams, webhook, zapier } from "./providers/webhooks";
import {
    PROVIDER_IDS,
    type ConnectionScope,
    type EndpointKind,
    type ModeDefinition,
    type ProviderDefinition,
    type ProviderId,
} from "./types";

export const PROVIDERS: readonly ProviderDefinition[] = [
    google,
    microsoft,
    slack,
    discord,
    teams,
    github,
    gitlab,
    notion,
    trello,
    miro,
    spotify,
    zapier,
    n8n,
    webhook,
];

const BY_ID = new Map<ProviderId, ProviderDefinition>(PROVIDERS.map((provider) => [provider.id, provider]));

export function isProviderId(value: unknown): value is ProviderId {
    return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

export function providerById(id: ProviderId): ProviderDefinition {
    const provider = BY_ID.get(id);
    if (!provider) throw new Error(`unknown provider ${id}`);
    return provider;
}

export function modeOf(provider: ProviderDefinition, scope: ConnectionScope): ModeDefinition | undefined {
    return scope === "personal" ? provider.personal : provider.organization;
}

/** Providers whose personal connections give WorkAdventure a calendar (one per person and organization). */
export const CALENDAR_PROVIDERS = ["google", "microsoft"] as const satisfies readonly ProviderId[];

export function isCalendarProvider(id: ProviderId): id is (typeof CALENDAR_PROVIDERS)[number] {
    return (CALENDAR_PROVIDERS as readonly ProviderId[]).includes(id);
}

/** The provider whose notification endpoints have this kind. */
export function providerOfEndpointKind(kind: EndpointKind): ProviderDefinition {
    const provider = PROVIDERS.find((p) => p.endpointKind === kind);
    if (!provider) throw new Error(`no provider for endpoint kind ${kind}`);
    return provider;
}

/**
 * Names of what this server lacks for a mode: its environment variables, and ORIGIN when the flow gives the provider
 * a URL of this server (OAuth redirect, Trello return URL, webhook receiver URL).
 */
export function missingConfiguration(mode: ModeDefinition): string[] {
    const env = config() as unknown as Record<string, unknown>;
    const missing = mode.env.filter((name) => {
        const value = env[name];
        return value === undefined || value === "";
    });
    if (mode.method !== "endpoints" && !integrationOrigin()) missing.push("ORIGIN");
    return missing;
}

export function isModeAvailable(provider: ProviderDefinition, scope: ConnectionScope): boolean {
    const mode = modeOf(provider, scope);
    return mode !== undefined && missingConfiguration(mode).length === 0;
}

/** True when at least one provider with the capability can be connected personally on this server. */
export function personalCapabilityAvailable(capability: ProviderDefinition["capabilities"][number]): boolean {
    return PROVIDERS.some((p) => p.capabilities.includes(capability) && isModeAvailable(p, "personal"));
}
