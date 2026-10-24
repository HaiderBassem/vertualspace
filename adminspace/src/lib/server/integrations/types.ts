/**
 * Types of the Integration Center's provider registry (registry.ts). A provider is a typed module
 * (providers/*.ts): its configuration, the scopes it asks for, what it can do in the virtual office, and the calls
 * that connect, refresh, revoke and test a connection. Texts shown to people live in the i18n module
 * `integrationCenter`, keyed by provider id: definitions stay language-free.
 */
import type { IntegrationSettings } from "../../settings/integrationSettings";

export const PROVIDER_IDS = [
    "google",
    "microsoft",
    "slack",
    "discord",
    "teams",
    "github",
    "gitlab",
    "notion",
    "trello",
    "miro",
    "spotify",
    "zapier",
    "n8n",
    "webhook",
] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** In the order the catalog shows them. */
export const PROVIDER_CATEGORIES = ["calendars", "chat", "developer", "productivity", "music", "automation"] as const;
export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const ENDPOINT_KINDS = ["slack", "discord", "teams", "webhook", "zapier", "n8n"] as const;
export type EndpointKind = (typeof ENDPOINT_KINDS)[number];

export type ProviderCapability =
    /** Meetings and free/busy shown in WorkAdventure (GET /api/calendar/events). */
    | "calendar"
    /** Receives the organization's events (endpoints and subscriptions). */
    | "notifications"
    /** Sets the person's status at the provider during busy calendar events. */
    | "statusSync"
    /** Recent coding activity shown in WorkAdventure (GET /api/presence/activity). */
    | "activity"
    /** Verified webhooks of the organization's repositories feeding the activity of people who share it. */
    | "inboundWebhooks"
    /** Boards and pages to place in rooms (WorkAdventure "open a website" objects). */
    | "resources"
    /** What a person is listening to (GET /api/presence/activity). */
    | "music"
    /** Calls the automation API (/automation/v1) to act on the organization. */
    | "automation";

/**
 * How a connection is made:
 * - oauth: OAuth 2.0 authorization code flow (state, PKCE S256 where the provider supports it);
 * - trelloToken: Trello's authorization page returning a user token in the URL fragment;
 * - receiver: an inbound webhook receiver (URL + secret given to the provider), proven by its first verified call;
 * - endpoints: webhook URLs pasted by an administrator (no OAuth application needed).
 */
export type ConnectionMethod = "oauth" | "trelloToken" | "receiver" | "endpoints";

export interface ModeDefinition {
    method: ConnectionMethod;
    /** Environment variables this server needs for this mode (names only; values are never shown). */
    env: readonly string[];
    /** Scopes asked for (shown before connecting). */
    scopes: readonly string[];
}

export interface TokenSet {
    accessToken: string;
    refreshToken?: string | undefined;
    expiresAt?: Date | undefined;
    /** Scopes granted. */
    scopes: string[];
}

export interface ExternalIdentity {
    /** The provider's stable id of the account, workspace or token owner. */
    id: string;
    /** What people recognize: an email, a login, a workspace name. */
    name: string;
}

export interface ExchangeResult {
    tokens: TokenSet;
    identity: ExternalIdentity;
    /** Provider bookkeeping saved with the connection (Slack workspace...). */
    settings?: Partial<IntegrationSettings>;
    /** Slack: the incoming webhook created during installation, stored sealed (becomes a notification endpoint). */
    incomingWebhook?: { url: string; channel: string };
}

export interface OAuthAdapter {
    /** True when the provider supports PKCE (S256); a verifier is then generated and sent. */
    pkce: boolean;
    authorizeUrl(input: {
        personal: boolean;
        state: string;
        codeChallenge: string | undefined;
        redirectUri: string;
    }): string;
    exchangeCode(input: {
        code: string;
        codeVerifier: string | undefined;
        redirectUri: string;
        personal: boolean;
    }): Promise<ExchangeResult>;
    /** Absent: tokens do not expire (or cannot be refreshed: the person reconnects). */
    refresh?(refreshToken: string, redirectUri: string | undefined): Promise<TokenSet>;
    /** Revokes the grant at the provider; "unsupported" when the provider has no revocation API. */
    revoke(tokens: {
        accessToken: string | undefined;
        refreshToken: string | undefined;
    }): Promise<"revoked" | "unsupported">;
    /** A cheap authenticated call proving the token works; returns who it belongs to. */
    test(accessToken: string, personal: boolean): Promise<ExternalIdentity>;
}

export interface ProviderDefinition {
    id: ProviderId;
    category: ProviderCategory;
    capabilities: readonly ProviderCapability[];
    /** Connected once for the whole organization by an administrator (integration.manage). */
    organization?: ModeDefinition;
    /** Connected by each person for themselves (integration.personal). */
    personal?: ModeDefinition;
    /** Notification providers: the kind of their endpoints. */
    endpointKind?: EndpointKind;
    oauth?: OAuthAdapter;
    /** Where people remove AdminSpace's access at the provider when it has no revocation API. */
    manageAccessUrl?: string;
    /** The provider's documentation for creating the application or webhook (docs/INTEGRATIONS.md has the steps). */
    setupUrl: string;
}

export type ConnectionScope = "organization" | "personal";

/** One calendar entry as WorkAdventure receives it (GET /api/calendar/events). */
export interface CalendarEvent {
    id: string;
    title: string;
    /** ISO 8601, UTC. For all-day events, midnight UTC of the first day. */
    start: string;
    end: string;
    allDay: boolean;
    /** True when the time counts as busy (not cancelled, not marked free). */
    busy: boolean;
    location: string | null;
    /** http(s) link of the online meeting, if any. */
    joinUrl: string | null;
}

/** What a person shares of their calendar: free/busy only, or titles, places and meeting links too. */
export type CalendarDetail = "busy" | "details";

export interface CalendarQuery {
    from: Date;
    to: Date;
    detail: CalendarDetail;
    /** Title of entries whose title is not shared or missing ("Busy", localized). */
    busyTitle: string;
}

/** A board or page that can be placed in a room (WorkAdventure "open a website" object). */
export interface ExternalResource {
    id: string;
    title: string;
    /** Link to open it at the provider. */
    url: string;
    /** Link made for embedding (Miro live embed), when the provider has one. */
    embedUrl: string | null;
    updatedAt: string | null;
}
