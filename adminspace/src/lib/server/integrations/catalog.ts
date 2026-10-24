/**
 * What the Integration Center pages show of each provider: whether this server is configured for it, the
 * organization's connection or destinations, and how many people connected it personally (a count, never who).
 * Statuses are honest: "connected" only after a real successful call (exchange, test, verified webhook or delivery).
 */
import { connectionView, organizationConnections, personalConnectionCounts, type Connection } from "./connections";
import { listEndpoints, type Endpoint } from "./endpoints";
import { redirectUriFor } from "./oauth";
import { PROVIDERS, missingConfiguration } from "./registry";
import type { ConnectionMethod, ProviderDefinition, ProviderId } from "./types";

export type CatalogStatus = "notConfigured" | "available" | "pending" | "connected" | "error" | "revoked" | "expired";

export interface ModeView {
    method: ConnectionMethod;
    scopes: readonly string[];
    /** Names of the environment variables (and ORIGIN) this server still needs; empty when available. */
    missing: string[];
    /** Variables the mode needs, to show in the setup steps. */
    env: readonly string[];
}

function modeView(mode: ProviderDefinition["organization"]): ModeView | null {
    if (!mode) return null;
    return { method: mode.method, scopes: mode.scopes, missing: missingConfiguration(mode), env: mode.env };
}

function connectionStatus(connection: Connection | undefined): CatalogStatus {
    if (!connection || connection.status === "not_configured") return "available";
    return connection.status;
}

/** Destinations: connected once one delivered, error when paused by a failure, pending until the first delivery. */
export function endpointsStatus(endpoints: Endpoint[]): CatalogStatus {
    if (endpoints.length === 0) return "available";
    if (endpoints.some((e) => e.enabled && e.lastSuccessAt && e.consecutiveFailures === 0)) return "connected";
    if (
        endpoints.some((e) => e.disabledReason && e.disabledReason !== "manual") ||
        endpoints.some((e) => e.consecutiveFailures > 0)
    ) {
        return "error";
    }
    return "pending";
}

export interface ProviderCard {
    id: ProviderId;
    category: ProviderDefinition["category"];
    capabilities: ProviderDefinition["capabilities"];
    organization: ModeView | null;
    personal: ModeView | null;
    status: CatalogStatus;
    connection: ReturnType<typeof connectionView> | null;
    personalCount: number;
    endpointCount: number;
    endpointKind: ProviderDefinition["endpointKind"] | null;
    redirectUri: string | null;
    setupUrl: string;
    manageAccessUrl: string | null;
}

export function cardFor(
    provider: ProviderDefinition,
    connections: Connection[],
    endpoints: Endpoint[],
    counts: Map<string, number>,
): ProviderCard {
    const organization = modeView(provider.organization);
    const personal = modeView(provider.personal);
    const connection = connections.find((c) => c.provider === provider.id);
    const ofKind = provider.endpointKind ? endpoints.filter((e) => e.kind === provider.endpointKind) : [];
    let status: CatalogStatus;
    if (organization) {
        if (organization.method === "endpoints") status = endpointsStatus(ofKind);
        else if (organization.missing.length > 0 && !connection) status = "notConfigured";
        else status = connectionStatus(connection);
        // Slack can also notify through pasted webhook URLs, without the app.
        if (provider.id === "slack" && status !== "connected" && ofKind.length > 0) status = endpointsStatus(ofKind);
    } else {
        status = personal && personal.missing.length > 0 ? "notConfigured" : "available";
    }
    const usesRedirect = [organization?.method, personal?.method].some((m) => m === "oauth" || m === "trelloToken");
    return {
        id: provider.id,
        category: provider.category,
        capabilities: provider.capabilities,
        organization,
        personal,
        status,
        connection: connection ? connectionView(connection) : null,
        personalCount: counts.get(provider.id) ?? 0,
        endpointCount: ofKind.length,
        endpointKind: provider.endpointKind ?? null,
        redirectUri: usesRedirect ? (redirectUriFor(provider.id) ?? null) : null,
        setupUrl: provider.setupUrl,
        manageAccessUrl: provider.manageAccessUrl ?? null,
    };
}

export async function catalogFor(organizationId: string): Promise<ProviderCard[]> {
    const [connections, endpoints, counts] = await Promise.all([
        organizationConnections(organizationId),
        listEndpoints(organizationId),
        personalConnectionCounts(organizationId),
    ]);
    return PROVIDERS.map((provider) => cardFor(provider, connections, endpoints, counts));
}
