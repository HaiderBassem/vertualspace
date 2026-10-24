/**
 * OAuth 2.0 building blocks shared by the providers (RFC 6749, RFC 7636 PKCE, RFC 6750 bearer tokens).
 *
 * - `state` is 256 random bits; only its SHA-256 is stored (integration_oauth_states), single use, 10 minutes.
 * - PKCE uses S256 only: the verifier is 64 characters of base64url (RFC 7636 §4.1 allows 43 to 128), sealed at rest.
 * - Redirect URIs are built from ORIGIN, never from the request's Host header.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { config } from "../config";
import { randomToken } from "../crypto";
import { ProviderError, formBody, providerFetch, retryAfterSeconds, safeProviderCode } from "./http";
import type { TokenSet } from "./types";

export const STATE_TTL_MS = 10 * 60_000;

export function newState(): string {
    return randomToken(32);
}

/** RFC 7636 S256: BASE64URL(SHA256(ASCII(code_verifier))). */
export function codeChallengeS256(verifier: string): string {
    return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function newPkcePair(): { verifier: string; challenge: string } {
    const verifier = randomToken(48);
    return { verifier, challenge: codeChallengeS256(verifier) };
}

/** A URL with query parameters (undefined values are left out). */
export function urlWithParams(base: string, params: Record<string, string | undefined>): string {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
    return url.toString();
}

/** Origin of this server for redirect URIs and webhook URLs given to providers (ORIGIN), if configured. */
export function integrationOrigin(): string | undefined {
    const origin = config().ORIGIN;
    return origin ? new URL(origin).origin : undefined;
}

/** {ORIGIN}/integrations/oauth/{provider}/callback: the redirect URI to register in the provider's console. */
export function redirectUriFor(provider: string, origin = integrationOrigin()): string | undefined {
    return origin ? `${origin}/integrations/oauth/${provider}/callback` : undefined;
}

/** Scopes from a token answer: space-separated (RFC 6749) or comma-separated (Slack, GitHub). */
export function splitScopes(value: string | undefined | null): string[] {
    if (!value) return [];
    return [
        ...new Set(
            value
                .split(/[\s,]+/)
                .map((scope) => scope.trim())
                .filter(Boolean),
        ),
    ];
}

/** The standard token answer (RFC 6749 §5.1); providers add their own fields. */
export const TokenAnswer = z
    .object({
        access_token: z.string().min(1).max(8192),
        token_type: z.string().optional(),
        expires_in: z.coerce.number().int().positive().optional(),
        refresh_token: z.string().min(1).max(8192).optional(),
        scope: z.string().max(4000).optional(),
    })
    .passthrough();
export type TokenAnswer = z.infer<typeof TokenAnswer>;

export function tokenSetFrom(
    answer: Pick<TokenAnswer, "access_token" | "expires_in" | "refresh_token" | "scope">,
    now = new Date(),
    fallbackScopes: readonly string[] = [],
): TokenSet {
    const scopes = splitScopes(answer.scope);
    return {
        accessToken: answer.access_token,
        refreshToken: answer.refresh_token,
        expiresAt: answer.expires_in ? new Date(now.getTime() + answer.expires_in * 1000) : undefined,
        scopes: scopes.length > 0 ? scopes : [...fallbackScopes],
    };
}

/** RFC 6749 §5.2 error answer. */
const TokenErrorAnswer = z.object({ error: z.string(), error_description: z.string().optional() }).passthrough();

/** Codes meaning the code or refresh token can no longer be used: the person must connect again. */
const DEAD_GRANT = new Set([
    "invalid_grant",
    // Slack (HTTP 200, ok: false)
    "invalid_code",
    "code_already_used",
    "invalid_refresh_token",
    "token_revoked",
    "token_expired",
    // GitHub (HTTP 200)
    "bad_verification_code",
    "bad_refresh_token",
]);

/** The ProviderError of an OAuth error code (RFC 6749 §5.2 and providers' variants). */
export function oauthError(code: string | undefined, httpStatus: number, context: string, retryAfterSec?: number) {
    const providerCode = safeProviderCode(code);
    const message = `${context}: ${providerCode ?? `HTTP ${httpStatus}`}`;
    if (code && DEAD_GRANT.has(code)) return new ProviderError("invalidGrant", message, { httpStatus, providerCode });
    if (httpStatus === 429 || code === "ratelimited" || code === "slow_down") {
        return new ProviderError("rateLimited", message, { httpStatus, providerCode, retryAfterSec });
    }
    if (code === "invalid_scope") return new ProviderError("scopeMissing", message, { httpStatus, providerCode });
    if (httpStatus >= 500) return new ProviderError("unavailable", message, { httpStatus, providerCode });
    if (code === "access_denied") return new ProviderError("forbidden", message, { httpStatus, providerCode });
    return new ProviderError("rejected", message, { httpStatus, providerCode });
}

export interface TokenRequestOptions {
    /** client_secret_basic (Authorization: Basic) instead of client_secret_post. */
    basicAuth?: string;
    /** Send the parameters as JSON (Notion) instead of a form. */
    json?: boolean;
    /** Send the parameters in the query string (Miro), with an empty body. */
    query?: boolean;
    headers?: Record<string, string>;
}

/**
 * POSTs a token request and returns the JSON answer. Errors are classified (invalid_grant → "invalidGrant"), including
 * providers that answer errors with HTTP 200 (GitHub's `error` field; Slack's `ok: false` is handled by its adapter).
 */
export async function tokenRequest(
    url: string,
    params: Record<string, string | undefined>,
    context: string,
    options: TokenRequestOptions = {},
): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json", ...(options.headers ?? {}) };
    if (options.basicAuth) headers.authorization = options.basicAuth;
    let target = url;
    let body: string | URLSearchParams | undefined;
    if (options.query) {
        target = urlWithParams(url, params);
    } else if (options.json) {
        headers["content-type"] = "application/json";
        body = JSON.stringify(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)));
    } else {
        body = formBody(params);
    }
    const response = await providerFetch(target, { method: "POST", headers, body });
    let answer: unknown;
    try {
        answer = await response.json();
    } catch {
        answer = undefined;
    }
    const error = TokenErrorAnswer.safeParse(answer);
    if (!response.ok || error.success) {
        throw oauthError(
            error.success ? error.data.error : undefined,
            response.status,
            context,
            retryAfterSeconds(response.headers),
        );
    }
    if (answer === undefined) throw new ProviderError("invalidResponse", `${context}: the answer is not JSON`);
    return answer;
}

/** Parses a standard token answer; anything else is "invalidResponse". */
export function parseTokenAnswer(answer: unknown, context: string): TokenAnswer {
    const parsed = TokenAnswer.safeParse(answer);
    if (!parsed.success) throw new ProviderError("invalidResponse", `${context}: no access token in the answer`);
    return parsed.data;
}
