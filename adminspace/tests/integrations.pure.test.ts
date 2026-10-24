/**
 * Integration Center, without a database: OAuth URLs (state, PKCE S256), token exchanges and refreshes against a mocked
 * fetch (the only mock: providers' APIs), error mapping, webhook signatures with published test vectors (Standard
 * Webhooks, Slack, GitHub) and vectors computed independently with openssl (Notion, Trello), message formatting,
 * calendar and activity mapping, SSRF guards and the classification of delivery answers.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    Object.assign(process.env, {
        ORIGIN: "https://admin.example.com",
        GOOGLE_OAUTH_CLIENT_ID: "google-client",
        GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
        MICROSOFT_OAUTH_CLIENT_ID: "ms-client",
        MICROSOFT_OAUTH_CLIENT_SECRET: "ms-secret",
        MICROSOFT_OAUTH_TENANT: "contoso.onmicrosoft.com",
        SLACK_CLIENT_ID: "slack-client",
        SLACK_CLIENT_SECRET: "slack-secret",
        GITHUB_OAUTH_CLIENT_ID: "gh-client",
        GITHUB_OAUTH_CLIENT_SECRET: "gh-secret",
        GITLAB_BASE_URL: "https://gitlab.example.com/",
        GITLAB_CLIENT_ID: "gl-client",
        GITLAB_CLIENT_SECRET: "gl-secret",
        NOTION_CLIENT_ID: "notion-client",
        NOTION_CLIENT_SECRET: "notion-secret",
        TRELLO_API_KEY: "trello-key",
        MIRO_CLIENT_ID: "miro-client",
        MIRO_CLIENT_SECRET: "miro-secret",
        SPOTIFY_CLIENT_ID: "spotify-client",
        SPOTIFY_CLIENT_SECRET: "spotify-secret",
    });
    delete process.env.SLACK_SIGNING_SECRET;
});

import { ProviderError, retryAfterSeconds, setProviderFetch } from "../src/lib/server/integrations/http";
import { codeChallengeS256, newPkcePair, redirectUriFor, splitScopes } from "../src/lib/server/integrations/oauth";
import {
    constantTimeEqual,
    newWebhookSecret,
    signStandardWebhook,
    verifyGithubSignature,
    verifyGitlabToken,
    verifyNotionSignature,
    verifySlackSignature,
    verifyStandardWebhook,
    verifyTrelloSignature,
} from "../src/lib/server/integrations/signatures";
import {
    GOOGLE_EVENTS_SCOPE,
    GOOGLE_FREEBUSY_SCOPE,
    googleOAuth,
    listGoogleEvents,
    mapGoogleEvents,
    mapGoogleFreeBusy,
} from "../src/lib/server/integrations/providers/google";
import { mapGraphEvents, microsoftOAuth } from "../src/lib/server/integrations/providers/microsoft";
import { normalizeSlackChannel, isSlackWebhookUrl, slackOAuth } from "../src/lib/server/integrations/providers/slack";
import {
    githubOAuth,
    githubWebhookActivity,
    latestGithubCoding,
    pollGithubActivity,
} from "../src/lib/server/integrations/providers/github";
import {
    gitlabOAuth,
    gitlabWebhookActivity,
    latestGitlabCoding,
} from "../src/lib/server/integrations/providers/gitlab";
import { notionOAuth, notionTitle } from "../src/lib/server/integrations/providers/notion";
import { miroEmbedUrl, miroOAuth } from "../src/lib/server/integrations/providers/miro";
import { mapNowPlaying, spotifyOAuth } from "../src/lib/server/integrations/providers/spotify";
import { isTrelloToken, trelloAuthorizeUrl } from "../src/lib/server/integrations/providers/trello";
import {
    discordExecuteUrl,
    isDiscordWebhookUrl,
    isZapierHookUrl,
    teamsUrlProblem,
    urlHint,
} from "../src/lib/server/integrations/providers/webhooks";
import {
    discordPayload,
    escapeSlack,
    slackMessage,
    teamsPayload,
    webhookBody,
} from "../src/lib/server/integrations/formatters";
import {
    describeEvent,
    eventKey,
    ORG_EVENT_TYPES,
    type NotificationMessage,
} from "../src/lib/server/integrations/events";
import { GuardedRequestError, guardedRequest, outgoingUrlProblem } from "../src/lib/server/integrations/guardedRequest";
import { classifyAnswer } from "../src/lib/server/integrations/deliveries";
import { missingConfiguration, PROVIDERS, providerById } from "../src/lib/server/integrations/registry";
import {
    AUTOMATION_TOKEN_PREFIX,
    automationTokenStatus,
    generateAutomationToken,
} from "../src/lib/server/integrations/automation";
import { calendarWindow, MAX_WINDOW_MS } from "../src/lib/server/integrations/calendar";
import { readIntegrationSettings } from "../src/lib/settings/integrationSettings";
import { sha256Hex } from "../src/lib/server/crypto";
import { messagesFor } from "../src/lib/i18n";

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/** A fetch answering from a list of handlers (first matching prefix), recording every call. */
function fakeFetch(routes: Record<string, Handler>) {
    const calls: { url: URL; init: RequestInit }[] = [];
    const implementation = (async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        calls.push({ url, init });
        const key = Object.keys(routes).find((prefix) => url.toString().startsWith(prefix));
        if (!key) return new Response("not found", { status: 404 });
        return routes[key]!(url, init);
    }) as typeof fetch;
    setProviderFetch(implementation);
    return calls;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function params(url: string): URLSearchParams {
    return new URL(url).searchParams;
}

async function bodyOf(init: RequestInit): Promise<URLSearchParams> {
    return new URLSearchParams(String(init.body ?? ""));
}

afterEach(() => setProviderFetch(undefined));

describe("PKCE and OAuth building blocks", () => {
    it("computes S256 challenges as RFC 7636 Appendix B", () => {
        expect(codeChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        );
    });

    it("generates 64-character verifiers of unreserved characters, never twice the same", () => {
        const pairs = Array.from({ length: 50 }, () => newPkcePair());
        for (const { verifier, challenge } of pairs) {
            expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
            expect(challenge).toBe(codeChallengeS256(verifier));
        }
        expect(new Set(pairs.map((p) => p.verifier)).size).toBe(50);
    });

    it("builds redirect URIs from ORIGIN only", () => {
        expect(redirectUriFor("google")).toBe("https://admin.example.com/integrations/oauth/google/callback");
        expect(redirectUriFor("google", "")).toBeUndefined();
    });

    it("splits scopes separated by spaces or commas", () => {
        expect(splitScopes("a b,c  a")).toEqual(["a", "b", "c"]);
        expect(splitScopes(undefined)).toEqual([]);
    });

    it("reads Retry-After as seconds or as an HTTP date, capped at one hour", () => {
        expect(retryAfterSeconds(new Headers({ "retry-after": "12" }))).toBe(12);
        const now = Date.parse("2026-10-24T10:00:00Z");
        expect(retryAfterSeconds(new Headers({ "retry-after": "Sat, 24 Oct 2026 10:00:30 GMT" }), now)).toBe(30);
        expect(retryAfterSeconds(new Headers({ "retry-after": "99999" }))).toBe(3600);
        expect(retryAfterSeconds(new Headers())).toBeUndefined();
    });
});

describe("authorization URLs", () => {
    const redirectUri = "https://admin.example.com/integrations/oauth/x/callback";
    const base = { state: "state-123", codeChallenge: "challenge-abc", redirectUri };

    it("Google: offline access with consent prompt, calendar scopes, PKCE S256", () => {
        const q = params(googleOAuth.authorizeUrl({ ...base, personal: true }));
        expect(q.get("client_id")).toBe("google-client");
        expect(q.get("redirect_uri")).toBe(redirectUri);
        expect(q.get("response_type")).toBe("code");
        expect(q.get("access_type")).toBe("offline");
        expect(q.get("prompt")).toBe("consent");
        expect(q.get("scope")?.split(" ")).toEqual(
            expect.arrayContaining([GOOGLE_EVENTS_SCOPE, GOOGLE_FREEBUSY_SCOPE]),
        );
        expect(q.get("state")).toBe("state-123");
        expect(q.get("code_challenge")).toBe("challenge-abc");
        expect(q.get("code_challenge_method")).toBe("S256");
    });

    it("Microsoft: tenant from the environment, ReadBasic scope, query response mode, PKCE", () => {
        const url = new URL(microsoftOAuth.authorizeUrl({ ...base, personal: true }));
        expect(url.origin + url.pathname).toBe(
            "https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize",
        );
        expect(url.searchParams.get("scope")).toBe("openid offline_access User.Read Calendars.ReadBasic");
        expect(url.searchParams.get("response_mode")).toBe("query");
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("Slack: bot scopes for the workspace, user scope for a person, no PKCE", () => {
        const org = params(slackOAuth.authorizeUrl({ ...base, personal: false }));
        expect(org.get("scope")).toBe("chat:write,chat:write.public,incoming-webhook");
        expect(org.get("user_scope")).toBeNull();
        const personal = params(slackOAuth.authorizeUrl({ ...base, personal: true }));
        expect(personal.get("user_scope")).toBe("users.profile:write");
        expect(personal.get("scope")).toBeNull();
        expect(personal.get("code_challenge")).toBeNull();
        expect(slackOAuth.pkce).toBe(false);
    });

    it("GitHub, GitLab and Spotify use PKCE; Notion and Miro do not", () => {
        expect(params(githubOAuth.authorizeUrl({ ...base, personal: true })).get("code_challenge_method")).toBe("S256");
        expect(params(githubOAuth.authorizeUrl({ ...base, personal: true })).get("scope")).toBe("read:user");
        const gitlab = new URL(gitlabOAuth.authorizeUrl({ ...base, personal: true }));
        expect(gitlab.origin + gitlab.pathname).toBe("https://gitlab.example.com/oauth/authorize");
        expect(gitlab.searchParams.get("scope")).toBe("read_user");
        expect(params(spotifyOAuth.authorizeUrl({ ...base, personal: true })).get("scope")).toBe(
            "user-read-currently-playing",
        );
        expect(params(notionOAuth.authorizeUrl({ ...base, personal: false })).get("owner")).toBe("user");
        expect(notionOAuth.pkce).toBe(false);
        expect(miroOAuth.pkce).toBe(false);
    });

    it("Trello: read token for 30 days, returned in the fragment of the return URL carrying the state", () => {
        const q = params(trelloAuthorizeUrl({ state: "s-1", redirectUri, appName: "AdminSpace" }));
        expect(q.get("response_type")).toBe("token");
        expect(q.get("callback_method")).toBe("fragment");
        expect(q.get("expiration")).toBe("30days");
        expect(q.get("scope")).toBe("read");
        expect(q.get("key")).toBe("trello-key");
        expect(q.get("return_url")).toBe(`${redirectUri}?state=s-1`);
        expect(isTrelloToken("a".repeat(64))).toBe(true);
        expect(isTrelloToken("not a token")).toBe(false);
    });
});

describe("token exchanges, refreshes and errors (mocked provider APIs)", () => {
    it("Google: exchanges the code with the verifier, checks the granted scopes, identifies the account", async () => {
        const calls = fakeFetch({
            "https://oauth2.googleapis.com/token": () =>
                json({
                    access_token: "at-1",
                    expires_in: 3599,
                    refresh_token: "rt-1",
                    scope: `openid email ${GOOGLE_FREEBUSY_SCOPE}`,
                    token_type: "Bearer",
                }),
            "https://www.googleapis.com/oauth2/v3/userinfo": () => json({ sub: "1234", email: "ada@example.com" }),
        });
        const result = await googleOAuth.exchangeCode({
            code: "code-1",
            codeVerifier: "verifier-1",
            redirectUri: "https://admin.example.com/cb",
            personal: true,
        });
        expect(result.tokens.accessToken).toBe("at-1");
        expect(result.tokens.refreshToken).toBe("rt-1");
        expect(result.tokens.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 3500_000);
        expect(result.identity).toEqual({ id: "1234", name: "ada@example.com" });
        const sent = await bodyOf(calls[0]!.init);
        expect(sent.get("code_verifier")).toBe("verifier-1");
        expect(sent.get("grant_type")).toBe("authorization_code");
        expect(sent.get("client_secret")).toBe("google-secret");
        expect(calls[1]!.init.headers).toMatchObject({ authorization: "Bearer at-1" });
    });

    it("Google: refuses a grant without any calendar scope (unticked on the consent screen)", async () => {
        fakeFetch({
            "https://oauth2.googleapis.com/token": () => json({ access_token: "at", scope: "openid email" }),
        });
        await expect(
            googleOAuth.exchangeCode({ code: "c", codeVerifier: "v", redirectUri: "r", personal: true }),
        ).rejects.toMatchObject({ code: "scopeMissing" });
    });

    it("maps invalid_grant on refresh to invalidGrant (the person must reconnect)", async () => {
        fakeFetch({ "https://oauth2.googleapis.com/token": () => json({ error: "invalid_grant" }, 400) });
        await expect(googleOAuth.refresh!("dead-token", undefined)).rejects.toMatchObject({ code: "invalidGrant" });
    });

    it("Microsoft: a refresh returns a new refresh token (rotation)", async () => {
        const calls = fakeFetch({
            "https://login.microsoftonline.com/": () =>
                json({
                    access_token: "at-2",
                    refresh_token: "rt-2",
                    expires_in: 3600,
                    scope: "Calendars.ReadBasic User.Read",
                }),
        });
        const tokens = await microsoftOAuth.refresh!("rt-1", undefined);
        expect(tokens.refreshToken).toBe("rt-2");
        expect(tokens.accessToken).toBe("at-2");
        const sent = await bodyOf(calls[0]!.init);
        expect(sent.get("grant_type")).toBe("refresh_token");
        expect(sent.get("refresh_token")).toBe("rt-1");
    });

    it("GitHub: errors answered with HTTP 200 are errors (bad_verification_code → invalidGrant)", async () => {
        fakeFetch({ "https://github.com/login/oauth/access_token": () => json({ error: "bad_verification_code" }) });
        await expect(
            githubOAuth.exchangeCode({ code: "c", codeVerifier: "v", redirectUri: "r", personal: true }),
        ).rejects.toMatchObject({ code: "invalidGrant" });
    });

    it("Slack: an install keeps the bot token, the workspace and the incoming webhook", async () => {
        fakeFetch({
            "https://slack.com/api/oauth.v2.access": () =>
                json({
                    ok: true,
                    access_token: "xoxb-1",
                    token_type: "bot",
                    scope: "chat:write,chat:write.public,incoming-webhook",
                    team: { id: "T1", name: "Acme" },
                    authed_user: { id: "U1" },
                    incoming_webhook: { url: "https://hooks.slack.com/services/T1/B1/xyz", channel: "#office" },
                }),
            "https://slack.com/api/auth.test": () =>
                json({ ok: true, team: "Acme", team_id: "T1", user: "bot", user_id: "UB" }),
        });
        const result = await slackOAuth.exchangeCode({
            code: "c",
            codeVerifier: undefined,
            redirectUri: "r",
            personal: false,
        });
        expect(result.tokens.accessToken).toBe("xoxb-1");
        expect(result.identity).toEqual({ id: "T1", name: "Acme" });
        expect(result.incomingWebhook).toEqual({
            url: "https://hooks.slack.com/services/T1/B1/xyz",
            channel: "#office",
        });
        expect(result.settings).toMatchObject({ teamId: "T1", teamName: "Acme" });
    });

    it("Slack: a personal install keeps the person's token; ok:false errors are classified", async () => {
        fakeFetch({
            "https://slack.com/api/oauth.v2.access": () =>
                json({
                    ok: true,
                    team: { id: "T1", name: "Acme" },
                    authed_user: { id: "U7", access_token: "xoxp-7", scope: "users.profile:write", token_type: "user" },
                }),
            "https://slack.com/api/auth.test": () =>
                json({ ok: true, team: "Acme", team_id: "T1", user: "ada", user_id: "U7" }),
        });
        const result = await slackOAuth.exchangeCode({
            code: "c",
            codeVerifier: undefined,
            redirectUri: "r",
            personal: true,
        });
        expect(result.tokens.accessToken).toBe("xoxp-7");
        expect(result.identity).toEqual({ id: "U7", name: "ada" });

        fakeFetch({ "https://slack.com/api/oauth.v2.access": () => json({ ok: false, error: "invalid_code" }) });
        await expect(
            slackOAuth.exchangeCode({ code: "c", codeVerifier: undefined, redirectUri: "r", personal: true }),
        ).rejects.toMatchObject({ code: "invalidGrant" });
        fakeFetch({ "https://slack.com/api/auth.test": () => json({ ok: false, error: "token_revoked" }) });
        await expect(slackOAuth.test("xoxp", true)).rejects.toMatchObject({ code: "unauthorized" });
        fakeFetch({
            "https://slack.com/api/auth.test": () => new Response("", { status: 429, headers: { "retry-after": "7" } }),
        });
        await expect(slackOAuth.test("xoxp", true)).rejects.toMatchObject({ code: "rateLimited", retryAfterSec: 7 });
    });

    it("Google API quota errors (403 rateLimitExceeded) are rate limits, not permission errors", async () => {
        fakeFetch({
            "https://www.googleapis.com/calendar/v3/": () =>
                json({ error: { errors: [{ reason: "rateLimitExceeded" }] } }, 403),
        });
        const error = await listGoogleEvents(
            "at",
            { from: new Date(), to: new Date(Date.now() + 3600_000), detail: "details", busyTitle: "Busy" },
            [GOOGLE_EVENTS_SCOPE],
        ).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe("rateLimited");
    });

    it("network failures and timeouts become ProviderErrors", async () => {
        setProviderFetch((async () => {
            throw new TypeError("fetch failed");
        }) as typeof fetch);
        await expect(spotifyOAuth.test("at", true)).rejects.toMatchObject({ code: "unavailable" });
        setProviderFetch((async () => {
            throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
        }) as typeof fetch);
        await expect(spotifyOAuth.test("at", true)).rejects.toMatchObject({ code: "timeout" });
    });

    it("GitHub events: ETag sent, 304 means unchanged, X-Poll-Interval respected", async () => {
        const calls = fakeFetch({
            "https://api.github.com/users/ada/events": () =>
                new Response(null, { status: 304, headers: { "x-poll-interval": "120" } }),
        });
        const now = new Date("2026-10-24T10:00:00Z");
        const poll = await pollGithubActivity("at", "ada", '"etag-1"', now);
        expect(poll.notModified).toBe(true);
        expect(poll.pollAfter.toISOString()).toBe("2026-10-24T10:02:00.000Z");
        expect(calls[0]!.init.headers).toMatchObject({
            "if-none-match": '"etag-1"',
            "x-github-api-version": "2022-11-28",
        });
    });
});

describe("webhook signatures", () => {
    it("Standard Webhooks: the specification's test vector", () => {
        const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
        const body = '{"test": 2432232314}';
        expect(signStandardWebhook(secret, "msg_p5jXN8AQM9LWM0D4loKWxJek", 1614265330, body)).toBe(
            "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
        );
        const headers = {
            id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
            timestamp: "1614265330",
            signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
        };
        expect(verifyStandardWebhook(secret, headers, body, 1614265330)).toBe(true);
        // Secret rotation: several signatures, one valid is enough.
        expect(
            verifyStandardWebhook(secret, { ...headers, signature: `v1,bad= ${headers.signature}` }, body, 1614265330),
        ).toBe(true);
        // Tampered body, other secret, replay outside the tolerance.
        expect(verifyStandardWebhook(secret, headers, '{"test": 1}', 1614265330)).toBe(false);
        expect(verifyStandardWebhook(newWebhookSecret(), headers, body, 1614265330)).toBe(false);
        expect(verifyStandardWebhook(secret, headers, body, 1614265330 + 301)).toBe(false);
    });

    it("new secrets are whsec_ + base64 of 32 random bytes", () => {
        const secret = newWebhookSecret();
        expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{43}=$/);
        expect(Buffer.from(secret.slice(6), "base64")).toHaveLength(32);
    });

    it("Slack: the example of Slack's documentation, and stale requests", () => {
        const secret = "8f742231b10e8888abcd99yyyzzz85a5";
        const body =
            "token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c";
        const signature = "v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503";
        expect(verifySlackSignature(secret, "1531420618", body, signature, 1531420618)).toBe("ok");
        expect(verifySlackSignature(secret, "1531420618", `${body}x`, signature, 1531420618)).toBe("invalid");
        expect(verifySlackSignature(secret, "1531420618", body, signature, 1531420618 + 301)).toBe("stale");
        expect(verifySlackSignature(secret, "not-a-time", body, signature, 1531420618)).toBe("stale");
    });

    it("GitHub: the example of GitHub's documentation", () => {
        const header = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";
        expect(verifyGithubSignature("It's a Secret to Everybody", "Hello, World!", header)).toBe(true);
        expect(verifyGithubSignature("It's a Secret to Everybody", "Hello, World?", header)).toBe(false);
        expect(verifyGithubSignature("other", "Hello, World!", header)).toBe(false);
    });

    it("Notion and Trello: vectors computed with openssl", () => {
        const notionBody = '{"id":"56c4f5fa-1d2c-4b5e-8b44-9a3c1e2f0a11","type":"page.content_updated"}';
        expect(
            verifyNotionSignature(
                "secret_tMrlL1qK5vuQAh1b6cZGhFChZTSYJlce98V0pYn7yBl",
                notionBody,
                "sha256=6dc4781792102b12593232c67ba7ae981f278b7b66928d8a1c5d5ab557c6af2e",
            ),
        ).toBe(true);
        expect(
            verifyNotionSignature(
                "secret_other",
                notionBody,
                "sha256=6dc4781792102b12593232c67ba7ae981f278b7b66928d8a1c5d5ab557c6af2e",
            ),
        ).toBe(false);
        const trelloBody = '{"action":{"type":"updateBoard"}}';
        const callback = "https://admin.example.com/integrations/webhooks/trello";
        expect(
            verifyTrelloSignature("trello-app-secret-for-tests", trelloBody, callback, "CKAfYm0zwe90MyqU7MkAv3WgoJM="),
        ).toBe(true);
        // The callback URL is part of what is signed.
        expect(
            verifyTrelloSignature(
                "trello-app-secret-for-tests",
                trelloBody,
                `${callback}/other`,
                "CKAfYm0zwe90MyqU7MkAv3WgoJM=",
            ),
        ).toBe(false);
    });

    it("GitLab: the secret token itself, compared in constant time; empty secrets never match", () => {
        expect(verifyGitlabToken("s3cret", "s3cret")).toBe(true);
        expect(verifyGitlabToken("s3cret", "s3cre")).toBe(false);
        expect(verifyGitlabToken("", "")).toBe(false);
        expect(constantTimeEqual("abc", "abd")).toBe(false);
    });
});

describe("messages per destination", () => {
    const message: NotificationMessage = {
        title: "<!channel> & <@U1>",
        text: "[click](https://evil.example) *bold* @everyone",
        facts: [{ label: "Email", value: "ada@example.com" }],
        context: "Acme · now",
        occurredAt: "2026-10-24T10:00:00.000Z",
        tone: "warning",
    };

    it("Slack: control characters escaped, text fallback and blocks", () => {
        expect(escapeSlack("<!channel> & <@U1>")).toBe("&lt;!channel&gt; &amp; &lt;@U1&gt;");
        const payload = slackMessage(message);
        expect(payload.text).not.toContain("<!channel>");
        expect(JSON.stringify(payload.blocks)).not.toContain("<!channel>");
        expect(payload.blocks).toHaveLength(2);
    });

    it("Discord: nobody is pinged, markdown links are neutralized", () => {
        const payload = discordPayload(message);
        expect(payload.allowed_mentions).toEqual({ parse: [] });
        expect(payload.embeds[0]!.description).toContain("\\[click\\]\\(https://evil.example\\)");
        expect(payload.embeds[0]!.fields).toEqual([{ name: "Email", value: "ada@example.com", inline: true }]);
        expect(payload.embeds[0]!.timestamp).toBe(message.occurredAt);
    });

    it("Teams: an Adaptive Card 1.4 in a Workflows message", () => {
        const payload = teamsPayload(message);
        expect(payload.type).toBe("message");
        const card = payload.attachments[0]!;
        expect(card.contentType).toBe("application/vnd.microsoft.card.adaptive");
        expect(card.content.type).toBe("AdaptiveCard");
        expect(card.content.version).toBe("1.4");
        expect(JSON.stringify(card.content.body)).toContain("FactSet");
    });

    it("webhooks: Standard Webhooks JSON { type, timestamp, data }", () => {
        const body = JSON.parse(
            webhookBody({ type: "member.joined", occurredAt: new Date(message.occurredAt), data: { a: 1 } }),
        );
        expect(body).toEqual({ type: "member.joined", timestamp: message.occurredAt, data: { a: 1 } });
    });

    it("describes events in the organization's language", () => {
        const fr = describeEvent(
            {
                type: "member.invited",
                occurredAt: new Date("2026-10-24T10:00:00Z"),
                data: {
                    invitation: {
                        id: "i",
                        email: "new@example.com",
                        role: "moderator",
                        expiresAt: "2026-10-31T10:00:00Z",
                    },
                    invitedBy: { name: "Ada" },
                },
            },
            { name: "Acme", defaultLocale: "fr-FR" },
        );
        expect(fr.text).toContain("Ada");
        expect(fr.text).toContain("new@example.com");
        expect(fr.text).toContain(messagesFor("fr-FR").shell.roles.moderator);
        const left = describeEvent(
            {
                type: "member.removed",
                occurredAt: new Date(),
                data: { person: { name: "Bob", email: "bob@example.com" }, by: null, reason: "left" },
            },
            { name: "Acme", defaultLocale: "en-US" },
        );
        expect(left.text).toBe("Bob left Acme.");
        // Every event type has its texts.
        for (const type of [...ORG_EVENT_TYPES, "integration.test" as const]) {
            expect(messagesFor("en-US").integrationCenter.notify.events[eventKey(type)].title.length).toBeGreaterThan(
                0,
            );
        }
    });
});

describe("calendars and activity", () => {
    const query = { from: new Date("2026-10-24T00:00:00Z"), to: new Date("2026-10-25T00:00:00Z"), busyTitle: "Busy" };
    const googleItems = [
        {
            id: "e1",
            status: "confirmed",
            summary: "Design review",
            start: { dateTime: "2026-10-24T09:00:00+02:00" },
            end: { dateTime: "2026-10-24T10:00:00+02:00" },
            location: "Room 1",
            hangoutLink: "https://meet.google.com/abc-defg-hij",
        },
        {
            id: "e2",
            status: "cancelled",
            summary: "Cancelled",
            start: { dateTime: "2026-10-24T11:00:00Z" },
            end: { dateTime: "2026-10-24T12:00:00Z" },
        },
        {
            id: "e3",
            summary: "Holiday",
            transparency: "transparent",
            start: { date: "2026-10-24" },
            end: { date: "2026-10-25" },
        },
        {
            id: "e4",
            summary: "Bad link",
            start: { dateTime: "2026-10-24T13:00:00Z" },
            end: { dateTime: "2026-10-24T14:00:00Z" },
            hangoutLink: "javascript:alert(1)",
        },
    ];

    it("Google events: UTC times, all-day dates, free entries not busy, cancelled ones dropped, http(s) links only", () => {
        const events = mapGoogleEvents(googleItems, { ...query, detail: "details" });
        expect(events.map((e) => e.id)).toEqual(["e1", "e3", "e4"]);
        expect(events[0]).toEqual({
            id: "e1",
            title: "Design review",
            start: "2026-10-24T07:00:00.000Z",
            end: "2026-10-24T08:00:00.000Z",
            allDay: false,
            busy: true,
            location: "Room 1",
            joinUrl: "https://meet.google.com/abc-defg-hij",
        });
        expect(events[1]).toMatchObject({ allDay: true, busy: false, start: "2026-10-24T00:00:00.000Z" });
        expect(events[2]!.joinUrl).toBeNull();
    });

    it("free/busy only: no title, place or link ever comes out", () => {
        const events = mapGoogleEvents(googleItems, { ...query, detail: "busy" });
        for (const event of events) {
            expect(event.title).toBe("Busy");
            expect(event.location).toBeNull();
            expect(event.joinUrl).toBeNull();
        }
        const busy = mapGoogleFreeBusy([{ start: "2026-10-24T09:00:00Z", end: "2026-10-24T09:30:00Z" }], {
            ...query,
            detail: "busy",
        });
        expect(busy).toEqual([
            {
                id: "busy-2026-10-24T09:00:00.000Z",
                title: "Busy",
                start: "2026-10-24T09:00:00.000Z",
                end: "2026-10-24T09:30:00.000Z",
                allDay: false,
                busy: true,
                location: null,
                joinUrl: null,
            },
        ]);
    });

    it("Microsoft Graph events: UTC without offset, busy = busy or oof, cancelled dropped", () => {
        const events = mapGraphEvents(
            [
                {
                    id: "m1",
                    subject: "1:1",
                    start: { dateTime: "2026-10-24T09:00:00.0000000", timeZone: "UTC" },
                    end: { dateTime: "2026-10-24T09:30:00.0000000", timeZone: "UTC" },
                    showAs: "busy",
                    onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/x" },
                    location: { displayName: "Online" },
                },
                {
                    id: "m2",
                    start: { dateTime: "2026-10-24T10:00:00" },
                    end: { dateTime: "2026-10-24T11:00:00" },
                    showAs: "tentative",
                },
                {
                    id: "m3",
                    isCancelled: true,
                    start: { dateTime: "2026-10-24T12:00:00" },
                    end: { dateTime: "2026-10-24T13:00:00" },
                },
                {
                    id: "m4",
                    start: { dateTime: "2026-10-24T14:00:00" },
                    end: { dateTime: "2026-10-24T15:00:00" },
                    showAs: "oof",
                },
            ],
            { ...query, detail: "details" },
        );
        expect(events.map((e) => [e.id, e.busy])).toEqual([
            ["m1", true],
            ["m2", false],
            ["m4", true],
        ]);
        expect(events[0]).toMatchObject({
            start: "2026-10-24T09:00:00.000Z",
            joinUrl: "https://teams.microsoft.com/l/meetup-join/x",
            location: "Online",
        });
    });

    it("caps the window at 7 days", () => {
        const from = new Date("2026-10-24T00:00:00Z");
        expect(calendarWindow(from, new Date("2026-12-31T00:00:00Z")).to.getTime() - from.getTime()).toBe(
            MAX_WINDOW_MS,
        );
        expect(calendarWindow(from, new Date("2026-10-25T00:00:00Z")).to.toISOString()).toBe(
            "2026-10-25T00:00:00.000Z",
        );
    });

    it("Spotify: nothing while paused, songs and episodes otherwise", () => {
        expect(mapNowPlaying({ is_playing: false, item: { name: "Song", artists: [{ name: "A" }] } })).toBeNull();
        expect(mapNowPlaying({ is_playing: true, item: null })).toBeNull();
        expect(
            mapNowPlaying({ is_playing: true, item: { name: "Song", artists: [{ name: "A" }, { name: "B" }] } }),
        ).toEqual({
            title: "Song",
            artist: "A, B",
        });
        expect(mapNowPlaying({ is_playing: true, item: { name: "Episode 3", show: { name: "Podcast" } } })).toEqual({
            title: "Episode 3",
            artist: "Podcast",
        });
    });

    it("coding activity: pushes and pull requests count, stars and comments do not", () => {
        expect(
            latestGithubCoding([
                { type: "WatchEvent", repo: { name: "a/star" }, created_at: "2026-10-24T10:00:00Z" },
                { type: "PushEvent", repo: { name: "acme/api" }, created_at: "2026-10-24T09:00:00Z" },
            ]),
        ).toEqual({ repo: "acme/api", at: "2026-10-24T09:00:00.000Z" });
        expect(
            latestGitlabCoding([
                { action_name: "commented on", created_at: "2026-10-24T10:00:00Z" },
                { action_name: "pushed to", created_at: "2026-10-24T08:00:00Z" },
            ]),
        ).toEqual({
            at: "2026-10-24T08:00:00.000Z",
        });
        const now = new Date("2026-10-24T12:00:00Z");
        expect(
            githubWebhookActivity("push", { repository: { full_name: "acme/web" }, sender: { id: 42 } }, now),
        ).toEqual({
            senderId: "42",
            repo: "acme/web",
            at: now.toISOString(),
        });
        expect(githubWebhookActivity("ping", { zen: "hi" }, now)).toBeNull();
        expect(
            gitlabWebhookActivity(
                { object_kind: "push", user_id: 7, project: { path_with_namespace: "acme/infra" } },
                now,
            ),
        ).toEqual({
            senderId: "7",
            repo: "acme/infra",
            at: now.toISOString(),
        });
        expect(gitlabWebhookActivity({ object_kind: "note", user_id: 7 }, now)).toBeNull();
    });

    it("Notion titles and Miro embed links", () => {
        expect(
            notionTitle({
                object: "page",
                id: "p",
                properties: { Name: { type: "title", title: [{ plain_text: "Road" }, { plain_text: "map" }] } },
            }),
        ).toBe("Roadmap");
        expect(miroEmbedUrl("uXjVO=")).toBe("https://miro.com/app/live-embed/uXjVO%3D/");
    });
});

describe("outgoing URLs (SSRF) and destinations", () => {
    it("refuses plain http, credentials and private addresses unless the host is allowed", () => {
        expect(outgoingUrlProblem("https://hooks.example.com/x", [])).toBeUndefined();
        expect(outgoingUrlProblem("http://hooks.example.com/x", [])).toBe("insecureScheme");
        expect(outgoingUrlProblem("ftp://hooks.example.com/x", [])).toBe("insecureScheme");
        expect(outgoingUrlProblem("https://user:pass@hooks.example.com/x", [])).toBe("credentialsInUrl");
        for (const host of ["127.0.0.1", "10.0.0.5", "169.254.169.254", "[::1]", "[fd00::1]", "192.168.1.10"]) {
            expect(outgoingUrlProblem(`https://${host}/hook`, []), host).toBe("privateAddress");
        }
        expect(outgoingUrlProblem("http://10.0.0.5:5678/webhook/x", ["10.0.0.5"])).toBeUndefined();
        expect(outgoingUrlProblem("not a url", [])).toBe("invalidUrl");
    });

    it("guardedRequest refuses a private address before any connection", async () => {
        const error = await guardedRequest("https://127.0.0.1/hook", { method: "POST" }).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(GuardedRequestError);
        expect((error as GuardedRequestError).code).toBe("privateAddress");
    });

    it("recognizes each destination's webhook URLs", () => {
        const discord = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGH_-";
        expect(isDiscordWebhookUrl(discord)).toBe(true);
        expect(isDiscordWebhookUrl("https://evil.example/api/webhooks/1/x")).toBe(false);
        expect(discordExecuteUrl(discord)).toBe(
            "https://discord.com/api/v10/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGH_-?wait=true",
        );
        expect(teamsUrlProblem("https://acme.webhook.office.com/webhookb2/x")).toBe("retiredConnector");
        expect(
            teamsUrlProblem("https://prod-12.westeurope.logic.azure.com:443/workflows/x/triggers/manual/paths/invoke"),
        ).toBeUndefined();
        expect(
            teamsUrlProblem("https://default1234.environment.api.powerplatform.com:443/powerautomate/x"),
        ).toBeUndefined();
        expect(teamsUrlProblem("https://example.com/x")).toBe("notTeamsUrl");
        expect(isZapierHookUrl("https://hooks.zapier.com/hooks/catch/123/abc/")).toBe(true);
        expect(isSlackWebhookUrl("https://hooks.slack.com/services/T000/B000/XXXXXXXX")).toBe(true);
        expect(isSlackWebhookUrl("https://hooks.slack.com.evil.example/services/x")).toBe(false);
        expect(normalizeSlackChannel("#general")).toBe("#general");
        expect(normalizeSlackChannel("C0123ABCD")).toBe("C0123ABCD");
        expect(normalizeSlackChannel("Not valid!")).toBeUndefined();
        expect(urlHint(discord)).toBe("https://discord.com/api/webhooks/1234…");
    });

    it("classifies answers: delivered, retried, failed, or the endpoint disabled", () => {
        const answer = (status: number, body = "", headers: Record<string, string> = {}) => ({ status, headers, body });
        expect(classifyAnswer("webhook", answer(204))).toMatchObject({ ok: true });
        expect(classifyAnswer("webhook", answer(410))).toMatchObject({ ok: false, retry: false, disable: "gone" });
        expect(classifyAnswer("webhook", answer(503))).toMatchObject({ ok: false, retry: true });
        expect(classifyAnswer("webhook", answer(404))).toMatchObject({ ok: false, retry: false });
        expect(classifyAnswer("webhook", answer(404)).disable).toBeUndefined();
        expect(classifyAnswer("discord", answer(404))).toMatchObject({ retry: false, disable: "unauthorized" });
        expect(
            classifyAnswer("discord", answer(429, JSON.stringify({ retry_after: 2.5, global: false }))),
        ).toMatchObject({
            retry: true,
            retryAfterSec: 3,
        });
        expect(classifyAnswer("teams", answer(429, "", { "retry-after": "40" }))).toMatchObject({
            retry: true,
            retryAfterSec: 40,
        });
        expect(classifyAnswer("zapier", answer(301))).toMatchObject({ ok: false, retry: false });
    });
});

describe("registry, settings and tokens", () => {
    it("every provider is configured from the environment, webhook ones need nothing", () => {
        expect(PROVIDERS.map((p) => p.id)).toHaveLength(14);
        expect(missingConfiguration(providerById("google").personal!)).toEqual([]);
        expect(missingConfiguration(providerById("discord").organization!)).toEqual([]);
        const slack = providerById("slack");
        expect(slack.organization?.env).toEqual(["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"]);
    });

    it("reads settings leniently: invalid fields are dropped, valid ones kept", () => {
        expect(readIntegrationSettings({ calendarSharing: "details", shareMusic: "yes", statusSync: true })).toEqual({
            calendarSharing: "details",
            statusSync: true,
        });
        expect(readIntegrationSettings(null)).toEqual({});
    });

    it("automation tokens: prefixed, 256 bits, only the hash is meant for storage", () => {
        const { token, hash, prefix } = generateAutomationToken();
        expect(token.startsWith(AUTOMATION_TOKEN_PREFIX)).toBe(true);
        expect(token.slice(AUTOMATION_TOKEN_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(hash).toBe(sha256Hex(token));
        expect(prefix).toBe(token.slice(0, 12));
        const now = new Date("2026-10-24T00:00:00Z");
        expect(automationTokenStatus({ revokedAt: null, expiresAt: null }, now)).toBe("active");
        expect(automationTokenStatus({ revokedAt: null, expiresAt: new Date("2026-10-23T00:00:00Z") }, now)).toBe(
            "expired",
        );
        expect(automationTokenStatus({ revokedAt: now, expiresAt: null }, now)).toBe("revoked");
    });
});
