/**
 * Microsoft 365 / Outlook calendar through Microsoft Graph (personal). Microsoft identity platform v2 authorization
 * code flow with PKCE and a client secret (confidential web application).
 *
 * - Scopes: openid offline_access User.Read Calendars.ReadBasic. ReadBasic gives no body or attendees: what WorkAdventure
 *   needs and nothing more. In "busy" mode the subject, place and meeting link are not even selected.
 * - Refresh tokens rotate: every refresh returns a new one, stored at once (connections.ts holds a lease meanwhile).
 * - The tenant (MICROSOFT_OAUTH_TENANT) may require an administrator's consent before employees can connect.
 * - There is no API to revoke one application's tokens: disconnecting deletes them here, and people remove the
 *   application at https://myapplications.microsoft.com.
 */
import { z } from "zod";
import { config } from "../../config";
import { ProviderError, errorForStatus, getJson, providerFetch, parseJson, retryAfterSeconds } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type {
    CalendarEvent,
    CalendarQuery,
    ExternalIdentity,
    OAuthAdapter,
    ProviderDefinition,
    TokenSet,
} from "../types";
import { bearer, cleanText, clientCredentials, httpUrlOrNull, isoOrNull } from "./shared";

const GRAPH = "https://graph.microsoft.com/v1.0";
export const MICROSOFT_SCOPES = ["openid", "offline_access", "User.Read", "Calendars.ReadBasic"] as const;

function credentials() {
    return clientCredentials("Microsoft", config().MICROSOFT_OAUTH_CLIENT_ID, config().MICROSOFT_OAUTH_CLIENT_SECRET);
}

function authority(): string {
    return `https://login.microsoftonline.com/${encodeURIComponent(config().MICROSOFT_OAUTH_TENANT)}/oauth2/v2.0`;
}

/** Graph returns scopes without their resource prefix ("Calendars.ReadBasic"); both forms are accepted. */
export function hasCalendarScope(scopes: readonly string[]): boolean {
    return scopes.some((scope) => /(^|\/)calendars\.read(basic|write)?$/i.test(scope));
}

const Me = z.object({
    id: z.string().min(1).max(200),
    displayName: z.string().max(300).nullable().optional(),
    mail: z.string().max(320).nullable().optional(),
    userPrincipalName: z.string().max(320).nullable().optional(),
});

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const me = await getJson(`${GRAPH}/me?$select=id,displayName,mail,userPrincipalName`, Me, "Microsoft Graph /me", {
        headers: bearer(accessToken),
    });
    return { id: me.id, name: me.mail ?? me.userPrincipalName ?? me.displayName ?? me.id };
}

async function exchangeCode(input: { code: string; codeVerifier: string | undefined; redirectUri: string }) {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            `${authority()}/token`,
            {
                client_id: id,
                client_secret: secret,
                grant_type: "authorization_code",
                code: input.code,
                redirect_uri: input.redirectUri,
                code_verifier: input.codeVerifier,
                scope: MICROSOFT_SCOPES.join(" "),
            },
            "Microsoft token",
        ),
        "Microsoft token",
    );
    const tokens = tokenSetFrom(answer);
    if (!hasCalendarScope(tokens.scopes))
        throw new ProviderError("scopeMissing", "Microsoft: calendar scope not granted");
    return { tokens, identity: await identify(tokens.accessToken) };
}

async function refresh(refreshToken: string): Promise<TokenSet> {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            `${authority()}/token`,
            {
                client_id: id,
                client_secret: secret,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                scope: MICROSOFT_SCOPES.join(" "),
            },
            "Microsoft token refresh",
        ),
        "Microsoft token refresh",
    );
    return tokenSetFrom(answer);
}

export const microsoftOAuth: OAuthAdapter = {
    pkce: true,
    authorizeUrl({ state, codeChallenge, redirectUri }) {
        return urlWithParams(`${authority()}/authorize`, {
            client_id: credentials().id,
            response_type: "code",
            redirect_uri: redirectUri,
            response_mode: "query",
            scope: MICROSOFT_SCOPES.join(" "),
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge ? "S256" : undefined,
            prompt: "select_account",
        });
    },
    exchangeCode,
    refresh,
    // No revocation endpoint for an application's tokens (Graph's revokeSignInSessions would sign the person out of
    // every device): the tokens are deleted here and the person removes the application in their account.
    revoke: async () => "unsupported",
    test: (accessToken) => identify(accessToken),
};

const GraphTime = z.object({ dateTime: z.string(), timeZone: z.string().optional() });
const GraphEvent = z
    .object({
        id: z.string().min(1).max(1024),
        subject: z.string().nullable().optional(),
        start: GraphTime,
        end: GraphTime,
        showAs: z.string().optional(),
        isCancelled: z.boolean().optional(),
        isAllDay: z.boolean().optional(),
        location: z.object({ displayName: z.string().nullable().optional() }).passthrough().nullable().optional(),
        onlineMeeting: z.object({ joinUrl: z.string().nullable().optional() }).passthrough().nullable().optional(),
    })
    .passthrough();
const CalendarView = z.object({ value: z.array(GraphEvent).default([]) }).passthrough();

/** Graph dateTimes have no offset; with Prefer: outlook.timezone="UTC" they are UTC. */
function graphTime(value: string): string | null {
    return isoOrNull(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);
}

/** Busy means showAs "busy" or "oof" (out of office); tentative, free and working elsewhere do not block. */
export function mapGraphEvents(items: z.infer<typeof GraphEvent>[], query: CalendarQuery): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    for (const item of items) {
        if (item.isCancelled) continue;
        const start = graphTime(item.start.dateTime);
        const end = graphTime(item.end.dateTime);
        if (!start || !end) continue;
        const details = query.detail === "details";
        events.push({
            id: item.id,
            title: (details ? cleanText(item.subject, 300) : null) ?? query.busyTitle,
            start,
            end,
            allDay: item.isAllDay === true,
            busy: item.showAs === "busy" || item.showAs === "oof",
            location: details ? cleanText(item.location?.displayName, 300) : null,
            joinUrl: details ? httpUrlOrNull(item.onlineMeeting?.joinUrl) : null,
        });
    }
    return events;
}

export async function listMicrosoftEvents(accessToken: string, query: CalendarQuery): Promise<CalendarEvent[]> {
    const select =
        query.detail === "details"
            ? "subject,start,end,showAs,isCancelled,isAllDay,location,onlineMeeting"
            : "start,end,showAs,isCancelled,isAllDay";
    const url = urlWithParams(`${GRAPH}/me/calendarView`, {
        startDateTime: query.from.toISOString(),
        endDateTime: query.to.toISOString(),
        $select: select,
        $orderby: "start/dateTime",
        $top: "50",
    });
    const response = await providerFetch(url, {
        headers: { ...bearer(accessToken), prefer: 'outlook.timezone="UTC"' },
    });
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw errorForStatus(response.status, "Microsoft calendarView", {
            // Graph throttling: 429 with Retry-After.
            retryAfterSec: retryAfterSeconds(response.headers) ?? (response.status === 429 ? 60 : undefined),
        });
    }
    const answer = await parseJson(response, CalendarView, "Microsoft calendarView");
    return mapGraphEvents(answer.value, query);
}

export const microsoft: ProviderDefinition = {
    id: "microsoft",
    category: "calendars",
    capabilities: ["calendar"],
    personal: {
        method: "oauth",
        env: ["MICROSOFT_OAUTH_CLIENT_ID", "MICROSOFT_OAUTH_CLIENT_SECRET"],
        scopes: MICROSOFT_SCOPES,
    },
    oauth: microsoftOAuth,
    manageAccessUrl: "https://myapplications.microsoft.com",
    setupUrl: "https://learn.microsoft.com/entra/identity-platform/quickstart-register-app",
};
