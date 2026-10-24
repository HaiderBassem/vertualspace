/**
 * GitLab (gitlab.com or self-managed, GITLAB_BASE_URL), two parts like GitHub:
 *
 * - Personal: OAuth application with PKCE S256, scope read_user. Access tokens last two hours and refresh tokens
 *   rotate. The events API (`/api/v4/events?after=YYYY-MM-DD`) gives activity times; with read_user it does not name
 *   the project, so polled activity has no repository (verified webhooks do).
 * - Organization: a webhook receiver authenticated by X-Gitlab-Token (GitLab sends the secret token itself);
 *   deliveries are de-duplicated on X-Gitlab-Event-UUID (or Idempotency-Key).
 */
import { z } from "zod";
import { config } from "../../config";
import { errorForStatus, getJson, providerFetch, parseJson, retryAfterSeconds } from "../http";
import { parseTokenAnswer, tokenRequest, tokenSetFrom, urlWithParams } from "../oauth";
import type { ExternalIdentity, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, clientCredentials, isoDate, isoOrNull } from "./shared";

export const GITLAB_SCOPES = ["read_user"] as const;

export function gitlabBase(): string {
    return config().GITLAB_BASE_URL.replace(/\/+$/, "");
}

function credentials() {
    return clientCredentials("GitLab", config().GITLAB_CLIENT_ID, config().GITLAB_CLIENT_SECRET);
}

const User = z.object({ id: z.number().int(), username: z.string().min(1).max(255) });

async function identify(accessToken: string): Promise<ExternalIdentity> {
    const user = await getJson(`${gitlabBase()}/api/v4/user`, User, "GitLab /user", { headers: bearer(accessToken) });
    return { id: String(user.id), name: user.username };
}

async function exchangeCode(input: { code: string; codeVerifier: string | undefined; redirectUri: string }) {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            `${gitlabBase()}/oauth/token`,
            {
                client_id: id,
                client_secret: secret,
                code: input.code,
                grant_type: "authorization_code",
                redirect_uri: input.redirectUri,
                code_verifier: input.codeVerifier,
            },
            "GitLab token",
        ),
        "GitLab token",
    );
    const tokens = tokenSetFrom(answer, new Date(), GITLAB_SCOPES);
    return { tokens, identity: await identify(tokens.accessToken) };
}

/** Refresh tokens rotate: the new one replaces the old one at once (connections.ts). */
async function refresh(refreshToken: string, redirectUri: string | undefined): Promise<TokenSet> {
    const { id, secret } = credentials();
    const answer = parseTokenAnswer(
        await tokenRequest(
            `${gitlabBase()}/oauth/token`,
            {
                client_id: id,
                client_secret: secret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
                redirect_uri: redirectUri,
            },
            "GitLab token refresh",
        ),
        "GitLab token refresh",
    );
    return tokenSetFrom(answer, new Date(), GITLAB_SCOPES);
}

async function revoke(tokens: { accessToken: string | undefined; refreshToken: string | undefined }) {
    const token = tokens.refreshToken ?? tokens.accessToken;
    if (!token) return "revoked" as const;
    const { id, secret } = credentials();
    const response = await providerFetch(`${gitlabBase()}/oauth/revoke`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: id, client_secret: secret, token }),
    });
    await response.body?.cancel().catch(() => undefined);
    // RFC 7009: 200 also for tokens that were already invalid.
    if (response.ok) return "revoked" as const;
    throw errorForStatus(response.status, "GitLab revoke");
}

export const gitlabOAuth: OAuthAdapter = {
    pkce: true,
    authorizeUrl({ state, codeChallenge, redirectUri }) {
        return urlWithParams(`${gitlabBase()}/oauth/authorize`, {
            client_id: credentials().id,
            redirect_uri: redirectUri,
            response_type: "code",
            state,
            scope: GITLAB_SCOPES.join(" "),
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge ? "S256" : undefined,
        });
    },
    exchangeCode,
    refresh,
    revoke,
    test: (accessToken) => identify(accessToken),
};

const GitlabEvent = z.object({ action_name: z.string().optional(), created_at: z.string() }).passthrough();

/** Pushes and merge request actions count as coding; comments do not. */
export function latestGitlabCoding(events: z.infer<typeof GitlabEvent>[]): { at: string } | null {
    for (const event of events) {
        if (!/^(pushed|opened|merged|accepted|approved)/.test(event.action_name ?? "")) continue;
        const at = isoOrNull(event.created_at);
        if (at) return { at };
    }
    return null;
}

/** The person's events since yesterday (GitLab's `after` is a date, exclusive). */
export async function pollGitlabActivity(accessToken: string, now = new Date()): Promise<{ at: string } | null> {
    const after = isoDate(new Date(now.getTime() - 2 * 86_400_000));
    const response = await providerFetch(
        urlWithParams(`${gitlabBase()}/api/v4/events`, { after, per_page: "20", sort: "desc" }),
        { headers: bearer(accessToken) },
    );
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw errorForStatus(response.status, "GitLab events", { retryAfterSec: retryAfterSeconds(response.headers) });
    }
    return latestGitlabCoding(await parseJson(response, z.array(GitlabEvent).max(100), "GitLab events"));
}

const PushHook = z
    .object({
        object_kind: z.string(),
        user_id: z.number().int().optional(),
        user: z.object({ id: z.number().int() }).passthrough().optional(),
        project: z
            .object({ path_with_namespace: z.string().max(300) })
            .passthrough()
            .optional(),
    })
    .passthrough();

/** Push and merge request hooks count as activity of the user who triggered them. */
export function gitlabWebhookActivity(payload: unknown, now = new Date()) {
    const parsed = PushHook.safeParse(payload);
    if (!parsed.success || !["push", "merge_request", "tag_push"].includes(parsed.data.object_kind)) return null;
    const userId = parsed.data.user_id ?? parsed.data.user?.id;
    if (userId === undefined || !parsed.data.project) return null;
    return { senderId: String(userId), repo: parsed.data.project.path_with_namespace, at: now.toISOString() };
}

export const gitlab: ProviderDefinition = {
    id: "gitlab",
    category: "developer",
    capabilities: ["activity", "inboundWebhooks"],
    personal: { method: "oauth", env: ["GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET"], scopes: GITLAB_SCOPES },
    organization: { method: "receiver", env: [], scopes: [] },
    oauth: gitlabOAuth,
    setupUrl: "https://docs.gitlab.com/integration/oauth_provider/",
};
