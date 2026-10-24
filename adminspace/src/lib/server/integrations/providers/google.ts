/**
 * Google Calendar (personal). OAuth 2.0 for web server applications with PKCE S256, offline access (refresh token;
 * prompt=consent so that Google returns one again after a reconnection).
 *
 * Data minimization: in "busy" mode (the default) AdminSpace calls the freeBusy API, which returns busy intervals
 * only: no title, place or attendee ever reaches this server. Titles, places and meeting links are read with
 * events.list only when the person chose to share details.
 *
 * Refresh tokens can die (password change, consent withdrawn, 6 months unused, testing apps after 7 days): Google then
 * answers invalid_grant and the connection becomes "expired" until the person reconnects.
 */
import { z } from "zod";
import { config } from "../../config";
import { ProviderError, errorForStatus, providerFetch, parseJson, retryAfterSeconds, safeProviderCode } from "../http";
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

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const GOOGLE_FREEBUSY_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
export const GOOGLE_SCOPES = ["openid", "email", GOOGLE_EVENTS_SCOPE, GOOGLE_FREEBUSY_SCOPE] as const;

function credentials() {
    return clientCredentials("Google", config().GOOGLE_OAUTH_CLIENT_ID, config().GOOGLE_OAUTH_CLIENT_SECRET);
}

/** Google lets people untick scopes on the consent screen: at least one calendar scope must have been granted. */
export function checkGoogleScopes(scopes: readonly string[]): void {
    if (!scopes.includes(GOOGLE_EVENTS_SCOPE) && !scopes.includes(GOOGLE_FREEBUSY_SCOPE)) {
        throw new ProviderError("scopeMissing", "Google: no calendar scope was granted");
    }
}

const Userinfo = z.object({ sub: z.string().min(1).max(200), email: z.string().max(320).optional() });

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const response = await providerFetch(USERINFO_URL, { headers: bearer(accessToken) });
    if (!response.ok) throw await googleError(response, "Google userinfo");
    const info = await parseJson(response, Userinfo, "Google userinfo");
    return { id: info.sub, name: info.email ?? info.sub };
}

const GoogleErrorBody = z
    .object({
        error: z
            .object({ errors: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional() })
            .passthrough(),
    })
    .passthrough();

/**
 * Google's errors: 429, and 403 with reason rateLimitExceeded / userRateLimitExceeded / quotaExceeded are rate
 * limits (back off); 403 insufficientPermissions means a scope is missing.
 */
export async function googleError(response: Response, context: string): Promise<ProviderError> {
    const retryAfterSec = retryAfterSeconds(response.headers);
    let reason: string | undefined;
    if (response.status === 403 || response.status === 429) {
        try {
            const body = GoogleErrorBody.safeParse(await response.json());
            reason = body.success ? body.data.error.errors?.[0]?.reason : undefined;
        } catch {
            reason = undefined;
        }
    } else {
        await response.body?.cancel().catch(() => undefined);
    }
    const providerCode = safeProviderCode(reason);
    if (response.status === 429 || (reason && /rate|quota|usageLimits/i.test(reason))) {
        return new ProviderError("rateLimited", `${context}: rate limited`, {
            httpStatus: response.status,
            retryAfterSec: retryAfterSec ?? 60,
            providerCode,
        });
    }
    if (reason === "insufficientPermissions" || reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") {
        return new ProviderError("scopeMissing", `${context}: missing scope`, { httpStatus: 403, providerCode });
    }
    return errorForStatus(response.status, context, { retryAfterSec, providerCode });
}

async function exchangeCode(input: { code: string; codeVerifier: string | undefined; redirectUri: string }) {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            TOKEN_URL,
            {
                grant_type: "authorization_code",
                code: input.code,
                redirect_uri: input.redirectUri,
                client_id: id,
                client_secret: secret,
                code_verifier: input.codeVerifier,
            },
            "Google token",
        ),
        "Google token",
    );
    const tokens = tokenSetFrom(answer);
    checkGoogleScopes(tokens.scopes);
    return { tokens, identity: await identify(tokens.accessToken) };
}

async function refresh(refreshToken: string): Promise<TokenSet> {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            TOKEN_URL,
            { grant_type: "refresh_token", refresh_token: refreshToken, client_id: id, client_secret: secret },
            "Google token refresh",
        ),
        "Google token refresh",
    );
    // Google does not rotate refresh tokens: the caller keeps the one it has when none is returned.
    return tokenSetFrom(answer);
}

async function revoke(tokens: { accessToken: string | undefined; refreshToken: string | undefined }) {
    const token = tokens.refreshToken ?? tokens.accessToken;
    if (!token) return "revoked" as const;
    const response = await providerFetch(REVOKE_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
    });
    await response.body?.cancel().catch(() => undefined);
    // 400 invalid_token: already revoked or expired, which is what was asked.
    if (response.ok || response.status === 400) return "revoked" as const;
    throw errorForStatus(response.status, "Google revoke");
}

export const googleOAuth: OAuthAdapter = {
    pkce: true,
    authorizeUrl({ state, codeChallenge, redirectUri }) {
        return urlWithParams(AUTHORIZE_URL, {
            client_id: credentials().id,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: GOOGLE_SCOPES.join(" "),
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge ? "S256" : undefined,
        });
    },
    exchangeCode,
    refresh,
    revoke,
    test: (accessToken) => identify(accessToken),
};

// ---------------------------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------------------------

const GoogleTime = z.object({ dateTime: z.string().optional(), date: z.string().optional() }).passthrough();
const GoogleEvent = z
    .object({
        id: z.string().min(1).max(1024),
        status: z.string().optional(),
        summary: z.string().optional(),
        transparency: z.string().optional(),
        start: GoogleTime,
        end: GoogleTime,
        location: z.string().optional(),
        hangoutLink: z.string().optional(),
        conferenceData: z
            .object({
                entryPoints: z
                    .array(
                        z.object({ entryPointType: z.string().optional(), uri: z.string().optional() }).passthrough(),
                    )
                    .optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();
const EventList = z.object({ items: z.array(GoogleEvent).default([]) }).passthrough();
const FreeBusy = z
    .object({
        calendars: z.record(
            z
                .object({
                    busy: z.array(z.object({ start: z.string(), end: z.string() })).default([]),
                    errors: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional(),
                })
                .passthrough(),
        ),
    })
    .passthrough();

/** A Google start/end: dateTime (with offset) or date (all-day, "YYYY-MM-DD"). */
function googleTime(time: z.infer<typeof GoogleTime>): { iso: string; allDay: boolean } | undefined {
    if (time.dateTime) {
        const iso = isoOrNull(time.dateTime);
        return iso ? { iso, allDay: false } : undefined;
    }
    if (time.date && /^\d{4}-\d{2}-\d{2}$/.test(time.date)) {
        const iso = isoOrNull(`${time.date}T00:00:00Z`);
        return iso ? { iso, allDay: true } : undefined;
    }
    return undefined;
}

/** Maps events.list items to calendar entries (cancelled ones dropped; "free" entries kept with busy: false). */
export function mapGoogleEvents(items: z.infer<typeof GoogleEvent>[], query: CalendarQuery): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    for (const item of items) {
        if (item.status === "cancelled") continue;
        const start = googleTime(item.start);
        const end = googleTime(item.end);
        if (!start || !end) continue;
        const details = query.detail === "details";
        const video = item.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
        events.push({
            id: item.id,
            title: (details ? cleanText(item.summary, 300) : null) ?? query.busyTitle,
            start: start.iso,
            end: end.iso,
            allDay: start.allDay,
            busy: item.transparency !== "transparent",
            location: details ? cleanText(item.location, 300) : null,
            joinUrl: details ? (httpUrlOrNull(item.hangoutLink) ?? httpUrlOrNull(video)) : null,
        });
    }
    return events;
}

/** Busy intervals of the freeBusy API as calendar entries. */
export function mapGoogleFreeBusy(busy: { start: string; end: string }[], query: CalendarQuery): CalendarEvent[] {
    return busy.flatMap((interval) => {
        const start = isoOrNull(interval.start);
        const end = isoOrNull(interval.end);
        if (!start || !end) return [];
        return [
            {
                id: `busy-${start}`,
                title: query.busyTitle,
                start,
                end,
                allDay: false,
                busy: true,
                location: null,
                joinUrl: null,
            },
        ];
    });
}

/** The person's primary calendar between `from` and `to`, at the detail they chose and the scopes they granted. */
export async function listGoogleEvents(
    accessToken: string,
    query: CalendarQuery,
    grantedScopes: readonly string[],
): Promise<CalendarEvent[]> {
    const canReadEvents = grantedScopes.includes(GOOGLE_EVENTS_SCOPE);
    const canReadFreeBusy = grantedScopes.includes(GOOGLE_FREEBUSY_SCOPE);
    if (query.detail === "busy" && canReadFreeBusy) {
        const response = await providerFetch(`${CALENDAR_API}/freeBusy`, {
            method: "POST",
            headers: { ...bearer(accessToken), "content-type": "application/json" },
            body: JSON.stringify({
                timeMin: query.from.toISOString(),
                timeMax: query.to.toISOString(),
                items: [{ id: "primary" }],
            }),
        });
        if (!response.ok) throw await googleError(response, "Google freeBusy");
        const answer = await parseJson(response, FreeBusy, "Google freeBusy");
        const primary = answer.calendars.primary;
        if (primary?.errors?.length) {
            throw new ProviderError("rejected", "Google freeBusy: the primary calendar returned an error", {
                providerCode: safeProviderCode(primary.errors[0]?.reason),
            });
        }
        return mapGoogleFreeBusy(primary?.busy ?? [], query);
    }
    if (!canReadEvents) throw new ProviderError("scopeMissing", "Google: the events scope was not granted");
    const fields =
        query.detail === "details"
            ? "items(id,status,summary,transparency,start,end,location,hangoutLink,conferenceData(entryPoints(entryPointType,uri)))"
            : "items(id,status,transparency,start,end)";
    const url = urlWithParams(`${CALENDAR_API}/calendars/primary/events`, {
        timeMin: query.from.toISOString(),
        timeMax: query.to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
        fields,
    });
    const response = await providerFetch(url, { headers: bearer(accessToken) });
    if (!response.ok) throw await googleError(response, "Google events");
    const answer = await parseJson(response, EventList, "Google events");
    return mapGoogleEvents(answer.items, query);
}

export const google: ProviderDefinition = {
    id: "google",
    category: "calendars",
    capabilities: ["calendar"],
    personal: {
        method: "oauth",
        env: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
        scopes: GOOGLE_SCOPES,
    },
    oauth: googleOAuth,
    manageAccessUrl: "https://myaccount.google.com/connections",
    setupUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
};
