/**
 * Slack: one Slack app (SLACK_CLIENT_ID/SECRET) serves two connections.
 *
 * - Organization: OAuth v2 install with bot scopes chat:write, chat:write.public and incoming-webhook. The bot token
 *   posts the organization's events (chat.postMessage) and the install creates an incoming webhook for the channel
 *   chosen on Slack's consent screen.
 * - Personal: user scope users.profile:write only, to set the person's status during their calendar meetings.
 *
 * Slack answers most errors with HTTP 200 and { ok: false, error }; tokens do not expire unless token rotation is
 * enabled on the app (then 12-hour access tokens and single-use refresh tokens). Rate limits are 429 + Retry-After;
 * users.profile.set allows about ten calls per minute and person.
 */
import { z } from "zod";
import { config } from "../../config";
import { ProviderError, providerFetch, retryAfterSeconds, safeProviderCode } from "../http";
import { oauthError, splitScopes, tokenRequest, urlWithParams } from "../oauth";
import type { ExchangeResult, ExternalIdentity, OAuthAdapter, ProviderDefinition, TokenSet } from "../types";
import { bearer, clientCredentials } from "./shared";

const AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const API = "https://slack.com/api";

export const SLACK_BOT_SCOPES = ["chat:write", "chat:write.public", "incoming-webhook"] as const;
export const SLACK_USER_SCOPES = ["users.profile:write"] as const;

function credentials() {
    return clientCredentials("Slack", config().SLACK_CLIENT_ID, config().SLACK_CLIENT_SECRET);
}

const SlackAnswer = z.object({ ok: z.boolean(), error: z.string().optional() }).passthrough();

/** The ProviderError of a Slack Web API error code. */
export function slackError(code: string | undefined, method: string, httpStatus = 200, retryAfterSec?: number) {
    const providerCode = safeProviderCode(code);
    const message = `Slack ${method}: ${providerCode ?? `HTTP ${httpStatus}`}`;
    const details = { httpStatus, providerCode, retryAfterSec };
    switch (code) {
        case "invalid_auth":
        case "not_authed":
        case "account_inactive":
        case "token_revoked":
        case "token_expired":
        case "no_permission":
            return new ProviderError("unauthorized", message, details);
        case "missing_scope":
            return new ProviderError("scopeMissing", message, details);
        case "ratelimited":
            return new ProviderError("rateLimited", message, { ...details, retryAfterSec: retryAfterSec ?? 30 });
        case "channel_not_found":
        case "not_in_channel":
        case "is_archived":
            return new ProviderError("notFound", message, details);
        default:
            if (httpStatus === 429)
                return new ProviderError("rateLimited", message, { ...details, retryAfterSec: retryAfterSec ?? 30 });
            if (httpStatus >= 500) return new ProviderError("unavailable", message, details);
            return new ProviderError("rejected", message, details);
    }
}

/** Calls a Slack Web API method with a token; returns the answer when ok. */
export async function slackApi(
    method: string,
    token: string,
    body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const response = await providerFetch(`${API}/${method}`, {
        method: "POST",
        headers: { ...bearer(token), "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(body ?? {}),
    });
    const retryAfterSec = retryAfterSeconds(response.headers);
    if (response.status === 429) {
        await response.body?.cancel().catch(() => undefined);
        throw slackError("ratelimited", method, 429, retryAfterSec);
    }
    let answer: z.infer<typeof SlackAnswer> | undefined;
    try {
        const parsed = SlackAnswer.safeParse(await response.json());
        answer = parsed.success ? parsed.data : undefined;
    } catch {
        answer = undefined;
    }
    if (!response.ok || !answer) throw slackError(answer?.error, method, response.status, retryAfterSec);
    if (!answer.ok) throw slackError(answer.error, method, response.status, retryAfterSec);
    return answer;
}

const AuthTest = z.object({
    team: z.string().max(200).optional(),
    team_id: z.string().max(40),
    user: z.string().max(200).optional(),
    user_id: z.string().max(40).optional(),
});

async function authTest(token: string): Promise<z.infer<typeof AuthTest>> {
    const parsed = AuthTest.safeParse(await slackApi("auth.test", token));
    if (!parsed.success) throw new ProviderError("invalidResponse", "Slack auth.test: unexpected answer");
    return parsed.data;
}

async function identify(token: string, personal: boolean): Promise<ExternalIdentity> {
    const info = await authTest(token);
    if (personal) return { id: info.user_id ?? info.team_id, name: info.user ?? info.user_id ?? info.team_id };
    return { id: info.team_id, name: info.team ?? info.team_id };
}

const TokenPart = z.object({
    access_token: z.string().min(1).max(8192),
    scope: z.string().max(4000).optional(),
    refresh_token: z.string().max(8192).optional(),
    expires_in: z.coerce.number().int().positive().optional(),
});
const InstallAnswer = z
    .object({
        ok: z.literal(true),
        access_token: z.string().max(8192).optional(),
        scope: z.string().max(4000).optional(),
        refresh_token: z.string().max(8192).optional(),
        expires_in: z.coerce.number().int().positive().optional(),
        team: z
            .object({ id: z.string().max(40), name: z.string().max(200).optional() })
            .nullable()
            .optional(),
        authed_user: z
            .object({
                id: z.string().max(40),
                access_token: z.string().max(8192).optional(),
                scope: z.string().max(4000).optional(),
                refresh_token: z.string().max(8192).optional(),
                expires_in: z.coerce.number().int().positive().optional(),
            })
            .passthrough()
            .optional(),
        incoming_webhook: z
            .object({ url: z.string().max(2048), channel: z.string().max(200).optional() })
            .passthrough()
            .optional(),
    })
    .passthrough();

function tokenSet(part: z.infer<typeof TokenPart>, now = new Date()): TokenSet {
    return {
        accessToken: part.access_token,
        refreshToken: part.refresh_token,
        expiresAt: part.expires_in ? new Date(now.getTime() + part.expires_in * 1000) : undefined,
        scopes: splitScopes(part.scope),
    };
}

/** oauth.v2.access: errors come back with HTTP 200 and ok: false. */
async function accessRequest(params: Record<string, string | undefined>, context: string): Promise<unknown> {
    const { id, secret } = credentials();
    const answer = await tokenRequest(
        `${API}/oauth.v2.access`,
        { ...params, client_id: id, client_secret: secret },
        context,
    );
    const status = SlackAnswer.safeParse(answer);
    if (!status.success) throw new ProviderError("invalidResponse", `${context}: unexpected answer`);
    if (!status.data.ok) throw oauthError(status.data.error, 200, context);
    return answer;
}

/** Reads an install answer: the bot token (organization) or the person's token (personal). */
export function parseSlackInstall(
    answer: unknown,
    personal: boolean,
): Omit<ExchangeResult, "identity"> & { teamId: string; teamName: string | undefined; userId: string | undefined } {
    const parsed = InstallAnswer.safeParse(answer);
    const team = parsed.success ? parsed.data.team : undefined;
    if (!parsed.success || !team) throw new ProviderError("invalidResponse", "Slack install: unexpected answer");
    const data = { ...parsed.data, team };
    const part = TokenPart.safeParse(personal ? data.authed_user : data);
    if (!part.success) throw new ProviderError("scopeMissing", "Slack install: no token for the requested scopes");
    const tokens = tokenSet(part.data);
    const wanted = personal ? SLACK_USER_SCOPES : SLACK_BOT_SCOPES;
    if (!wanted.every((scope) => tokens.scopes.includes(scope))) {
        throw new ProviderError("scopeMissing", "Slack install: a requested scope was not granted");
    }
    return {
        tokens,
        teamId: data.team.id,
        teamName: data.team.name,
        userId: data.authed_user?.id,
        settings: { teamId: data.team.id, ...(data.team.name ? { teamName: data.team.name } : {}) },
        ...(!personal && data.incoming_webhook
            ? { incomingWebhook: { url: data.incoming_webhook.url, channel: data.incoming_webhook.channel ?? "" } }
            : {}),
    };
}

export const slackOAuth: OAuthAdapter = {
    // Slack's OAuth v2 uses the client secret; it does not take PKCE for this flow.
    pkce: false,
    authorizeUrl({ personal, state, redirectUri }) {
        return urlWithParams(AUTHORIZE_URL, {
            client_id: credentials().id,
            scope: personal ? undefined : SLACK_BOT_SCOPES.join(","),
            user_scope: personal ? SLACK_USER_SCOPES.join(",") : undefined,
            redirect_uri: redirectUri,
            state,
        });
    },
    async exchangeCode({ code, redirectUri, personal }) {
        const install = parseSlackInstall(
            await accessRequest({ code, redirect_uri: redirectUri }, "Slack install"),
            personal,
        );
        const identity = await identify(install.tokens.accessToken, personal);
        return {
            tokens: install.tokens,
            identity,
            ...(install.settings ? { settings: install.settings } : {}),
            ...(install.incomingWebhook ? { incomingWebhook: install.incomingWebhook } : {}),
        };
    },
    /** Only with token rotation enabled on the Slack app: the refresh token is single use (stored at once). */
    async refresh(refreshToken) {
        const answer = await accessRequest(
            { grant_type: "refresh_token", refresh_token: refreshToken },
            "Slack token refresh",
        );
        const top = TokenPart.safeParse(answer);
        const user = TokenPart.safeParse((answer as { authed_user?: unknown }).authed_user);
        const part = top.success ? top.data : user.success ? user.data : undefined;
        if (!part) throw new ProviderError("invalidResponse", "Slack token refresh: no token in the answer");
        return tokenSet(part);
    },
    async revoke({ accessToken }) {
        if (!accessToken) return "revoked";
        try {
            await slackApi("auth.revoke", accessToken);
        } catch (error) {
            // Already revoked or invalid: that is the outcome asked for.
            if (error instanceof ProviderError && error.code === "unauthorized") return "revoked";
            throw error;
        }
        return "revoked";
    },
    test: (accessToken, personal) => identify(accessToken, personal),
};

export interface SlackMessage {
    text: string;
    blocks: unknown[];
}

/** Posts a message with the organization's bot token (chat:write.public: no need to join public channels). */
export async function postSlackMessage(botToken: string, channel: string, message: SlackMessage): Promise<void> {
    await slackApi("chat.postMessage", botToken, {
        channel,
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
        unfurl_media: false,
    });
}

/** Sets the person's status until `expiration` (Slack clears it then by itself). */
export async function setSlackStatus(
    userToken: string,
    status: { text: string; emoji: string; expiration: Date },
): Promise<void> {
    await slackApi("users.profile.set", userToken, {
        profile: {
            status_text: status.text.slice(0, 100),
            status_emoji: status.emoji,
            status_expiration: Math.floor(status.expiration.getTime() / 1000),
        },
    });
}

/** Incoming webhook URLs (pasted, or created by the install). */
export function isSlackWebhookUrl(url: string): boolean {
    return /^https:\/\/hooks\.slack\.com\/(services|triggers|workflows)\/[A-Za-z0-9/_-]{10,300}$/.test(url);
}

/** A Slack channel as typed by an administrator: "#general", "general" or a channel id. */
export function normalizeSlackChannel(value: string): string | undefined {
    const channel = value.trim().replace(/^#/, "");
    if (/^[CGD][A-Z0-9]{6,20}$/.test(channel)) return channel;
    return /^[a-z0-9][a-z0-9._-]{0,79}$/.test(channel) ? `#${channel}` : undefined;
}

export const slack: ProviderDefinition = {
    id: "slack",
    category: "chat",
    capabilities: ["notifications", "statusSync"],
    organization: {
        method: "oauth",
        env: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
        scopes: SLACK_BOT_SCOPES,
    },
    personal: {
        method: "oauth",
        env: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
        scopes: SLACK_USER_SCOPES,
    },
    endpointKind: "slack",
    oauth: slackOAuth,
    setupUrl: "https://api.slack.com/apps",
};
