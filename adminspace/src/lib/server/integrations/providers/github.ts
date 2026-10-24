/**
 * GitHub, two parts:
 *
 * - Personal: an OAuth app (GITHUB_OAUTH_CLIENT_ID/SECRET), authorization code flow with PKCE S256, scope read:user.
 *   People who opt in share their recent activity ("coding in acme/api") with the office. The events API is polled
 *   with an ETag (a 304 does not count against the rate limit) and never more often than X-Poll-Interval allows.
 *   read:user only shows public activity.
 * - Organization: a webhook receiver for the organization's repositories (private ones included). GitHub signs every
 *   delivery with X-Hub-Signature-256; deliveries are de-duplicated on X-GitHub-Delivery. Pushes are attributed only
 *   to people who connected their own GitHub account and share their activity.
 */
import { z } from "zod";
import { config } from "../../config";
import { basicAuth, errorForStatus, getJson, providerFetch, parseJson, retryAfterSeconds } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type { ExternalIdentity, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, clientCredentials, isoOrNull } from "./shared";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const API = "https://api.github.com";
export const GITHUB_SCOPES = ["read:user"] as const;

function credentials() {
    return clientCredentials("GitHub", config().GITHUB_OAUTH_CLIENT_ID, config().GITHUB_OAUTH_CLIENT_SECRET);
}

/** Headers of every REST call (GitHub requires a User-Agent; the API version is pinned). */
export function githubHeaders(token?: string): Record<string, string> {
    return {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "AdminSpace-Integrations",
        ...(token ? bearer(token) : {}),
    };
}

const User = z.object({
    id: z.number().int(),
    login: z.string().min(1).max(100),
    name: z.string().nullable().optional(),
});

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const user = await getJson(`${API}/user`, User, "GitHub /user", { headers: githubHeaders(accessToken) });
    return { id: String(user.id), name: user.login };
}

async function exchangeCode(input: { code: string; codeVerifier: string | undefined; redirectUri: string }) {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            TOKEN_URL,
            {
                client_id: id,
                client_secret: secret,
                code: input.code,
                redirect_uri: input.redirectUri,
                code_verifier: input.codeVerifier,
            },
            "GitHub token",
        ),
        "GitHub token",
    );
    const tokens = tokenSetFrom(answer, new Date(), GITHUB_SCOPES);
    return { tokens, identity: await identify(tokens.accessToken) };
}

/** Only for apps with expiring user tokens (GitHub Apps); OAuth apps' tokens do not expire. */
async function refresh(refreshToken: string): Promise<TokenSet> {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            TOKEN_URL,
            { client_id: id, client_secret: secret, grant_type: "refresh_token", refresh_token: refreshToken },
            "GitHub token refresh",
        ),
        "GitHub token refresh",
    );
    return tokenSetFrom(answer, new Date(), GITHUB_SCOPES);
}

async function revoke(tokens: { accessToken: string | undefined }) {
    if (!tokens.accessToken) return "revoked" as const;
    const { id, secret } = credentials();
    const response = await providerFetch(`${API}/applications/${encodeURIComponent(id)}/grant`, {
        method: "DELETE",
        headers: { ...githubHeaders(), authorization: basicAuth(id, secret), "content-type": "application/json" },
        body: JSON.stringify({ access_token: tokens.accessToken }),
    });
    await response.body?.cancel().catch(() => undefined);
    // 404/422: the grant is already gone.
    if (response.status === 204 || response.status === 404 || response.status === 422) return "revoked" as const;
    throw errorForStatus(response.status, "GitHub revoke");
}

export const githubOAuth: OAuthAdapter = {
    pkce: true,
    authorizeUrl({ state, codeChallenge, redirectUri }) {
        return urlWithParams(AUTHORIZE_URL, {
            client_id: credentials().id,
            redirect_uri: redirectUri,
            scope: GITHUB_SCOPES.join(" "),
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge ? "S256" : undefined,
            allow_signup: "false",
        });
    },
    exchangeCode,
    refresh,
    revoke,
    test: (accessToken) => identify(accessToken),
};

// ---------------------------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------------------------

/** Event types that mean "working on code" (issue comments and stars do not). */
const CODING_EVENTS = new Set(["PushEvent", "PullRequestEvent", "PullRequestReviewEvent", "CreateEvent"]);

const GithubEvent = z
    .object({ type: z.string(), repo: z.object({ name: z.string().max(300) }), created_at: z.string() })
    .passthrough();

export interface ActivityPoll {
    /** null when nothing changed since the ETag (304) or no coding event was found. */
    latest: { repo: string; at: string } | null;
    notModified: boolean;
    etag: string | undefined;
    /** Earliest time of the next poll (X-Poll-Interval, at least 60 seconds). */
    pollAfter: Date;
}

/** The most recent coding event of a list of GitHub events. */
export function latestGithubCoding(events: z.infer<typeof GithubEvent>[]): { repo: string; at: string } | null {
    for (const event of events) {
        if (!CODING_EVENTS.has(event.type)) continue;
        const at = isoOrNull(event.created_at);
        if (at) return { repo: event.repo.name, at };
    }
    return null;
}

export async function pollGithubActivity(
    accessToken: string,
    login: string,
    etag: string | undefined,
    now = new Date(),
): Promise<ActivityPoll> {
    const response = await providerFetch(`${API}/users/${encodeURIComponent(login)}/events?per_page=30`, {
        headers: { ...githubHeaders(accessToken), ...(etag ? { "if-none-match": etag } : {}) },
    });
    const interval = Math.max(60, Number(response.headers.get("x-poll-interval")) || 60);
    const pollAfter = new Date(now.getTime() + interval * 1000);
    if (response.status === 304) {
        await response.body?.cancel().catch(() => undefined);
        return { latest: null, notModified: true, etag, pollAfter };
    }
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw errorForStatus(response.status, "GitHub events", { retryAfterSec: retryAfterSeconds(response.headers) });
    }
    const events = await parseJson(response, z.array(GithubEvent).max(100), "GitHub events");
    return {
        latest: latestGithubCoding(events),
        notModified: false,
        etag: response.headers.get("etag")?.slice(0, 300) ?? undefined,
        pollAfter,
    };
}

/** What a verified webhook delivery says about who worked on which repository. */
export interface WebhookActivity {
    /** The sender's GitHub user id (matches the external account id of personal connections). */
    senderId: string;
    repo: string;
    at: string;
}

const WebhookPayload = z
    .object({
        repository: z
            .object({ full_name: z.string().max(300) })
            .passthrough()
            .optional(),
        sender: z.object({ id: z.number().int() }).passthrough().optional(),
    })
    .passthrough();

/** Push, pull request and review deliveries count as activity; "ping" and the rest do not. */
export function githubWebhookActivity(event: string, payload: unknown, now = new Date()): WebhookActivity | null {
    if (!["push", "pull_request", "pull_request_review", "create"].includes(event)) return null;
    const parsed = WebhookPayload.safeParse(payload);
    if (!parsed.success || !parsed.data.repository || !parsed.data.sender) return null;
    return { senderId: String(parsed.data.sender.id), repo: parsed.data.repository.full_name, at: now.toISOString() };
}

export const github: ProviderDefinition = {
    id: "github",
    category: "developer",
    capabilities: ["activity", "inboundWebhooks"],
    personal: { method: "oauth", env: ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"], scopes: GITHUB_SCOPES },
    organization: { method: "receiver", env: [], scopes: [] },
    oauth: githubOAuth,
    manageAccessUrl: "https://github.com/settings/applications",
    setupUrl: "https://docs.github.com/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
};
