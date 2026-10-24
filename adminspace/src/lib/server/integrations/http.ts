/**
 * HTTP calls to providers' own APIs (fixed, well-known hosts such as slack.com or googleapis.com): timeouts, error
 * classification and Retry-After. URLs typed by people (webhook endpoints) never go through here but through
 * guardedRequest.ts, which refuses private addresses.
 *
 * Errors carry a code (ProviderErrorCode) and the HTTP status, never a provider's response body: bodies can echo
 * tokens or personal data, and messages end up in job errors and logs.
 */
import type { z } from "zod";

export type ProviderErrorCode =
    /** This server lacks the provider's configuration (environment variables, ORIGIN). */
    | "notConfigured"
    /** 401: the token is invalid or was revoked. */
    | "unauthorized"
    /** The authorization code or refresh token is dead (RFC 6749 invalid_grant): the person must reconnect. */
    | "invalidGrant"
    /** 403: no permission (consent withdrawn, admin consent needed, plan limits...). */
    | "forbidden"
    /** The person did not grant a scope the feature needs. */
    | "scopeMissing"
    | "notFound"
    /** 429, or a provider-specific quota error: retry after `retryAfterSec`. */
    | "rateLimited"
    /** Another 4xx: the provider refused the request (bad configuration, invalid input). */
    | "rejected"
    /** 5xx or network failure. */
    | "unavailable"
    | "timeout"
    /** The answer did not have the expected shape. */
    | "invalidResponse";

export class ProviderError extends Error {
    override name = "ProviderError";
    readonly httpStatus: number | undefined;
    readonly retryAfterSec: number | undefined;
    /** The provider's own short error code (e.g. Slack's "channel_not_found"), when it gives one. */
    readonly providerCode: string | undefined;

    constructor(
        readonly code: ProviderErrorCode,
        message: string,
        details: {
            httpStatus?: number | undefined;
            retryAfterSec?: number | undefined;
            providerCode?: string | undefined;
        } = {},
    ) {
        super(message);
        this.httpStatus = details.httpStatus;
        this.retryAfterSec = details.retryAfterSec;
        this.providerCode = details.providerCode;
    }
}

/** A provider's error code, reduced to what may be stored and shown: letters, digits, dot, dash, underscore. */
export function safeProviderCode(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const clean = value.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 60);
    return clean.length > 0 ? clean : undefined;
}

let fetchOverride: typeof fetch | undefined;

/** Tests only: replaces the fetch used to call providers' APIs (undefined restores the real one). */
export function setProviderFetch(implementation: typeof fetch | undefined): void {
    fetchOverride = implementation;
}

export const DEFAULT_TIMEOUT_MS = 10_000;

function isTimeout(error: unknown): boolean {
    return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** fetch with a timeout; network failures become ProviderError ("timeout" or "unavailable"). */
export async function providerFetch(
    url: string | URL,
    init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
    try {
        return await (fetchOverride ?? fetch)(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
        if (isTimeout(error)) throw new ProviderError("timeout", `no answer within ${timeoutMs} ms`);
        throw new ProviderError("unavailable", `network error (${error instanceof Error ? error.name : "unknown"})`);
    }
}

/** Seconds to wait from a Retry-After header (delta-seconds or HTTP-date), capped at one hour. */
export function retryAfterSeconds(headers: Headers, now = Date.now()): number | undefined {
    const raw = headers.get("retry-after");
    if (!raw) return undefined;
    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.min(3600, Math.max(0, Math.ceil(seconds)));
    const date = Date.parse(raw);
    if (Number.isNaN(date)) return undefined;
    return Math.min(3600, Math.max(0, Math.ceil((date - now) / 1000)));
}

/** The ProviderError matching an unsuccessful HTTP status. */
export function errorForStatus(
    status: number,
    context: string,
    details: { retryAfterSec?: number | undefined; providerCode?: string | undefined } = {},
): ProviderError {
    const message = `${context} answered ${status}${details.providerCode ? ` (${details.providerCode})` : ""}`;
    const extra = { httpStatus: status, ...details };
    if (status === 401) return new ProviderError("unauthorized", message, extra);
    if (status === 403) return new ProviderError("forbidden", message, extra);
    if (status === 404 || status === 410) return new ProviderError("notFound", message, extra);
    if (status === 429) return new ProviderError("rateLimited", message, extra);
    if (status === 408) return new ProviderError("timeout", message, extra);
    if (status >= 500) return new ProviderError("unavailable", message, extra);
    return new ProviderError("rejected", message, extra);
}

/** Throws the classified error of a non-2xx answer (its body is discarded, never logged). */
export async function expectOk(response: Response, context: string): Promise<Response> {
    if (response.ok) return response;
    await response.body?.cancel().catch(() => undefined);
    throw errorForStatus(response.status, context, { retryAfterSec: retryAfterSeconds(response.headers) });
}

/** Parses a JSON answer with a zod schema; anything else is "invalidResponse". */
export async function parseJson<S extends z.ZodTypeAny>(
    response: Response,
    schema: S,
    context: string,
): Promise<z.infer<S>> {
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw new ProviderError("invalidResponse", `${context}: the answer is not JSON`, {
            httpStatus: response.status,
        });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ProviderError("invalidResponse", `${context}: unexpected answer`, { httpStatus: response.status });
    }
    return parsed.data as z.infer<S>;
}

/** Calls a provider's JSON API: classified errors for non-2xx, the parsed body otherwise. */
export async function getJson<S extends z.ZodTypeAny>(
    url: string | URL,
    schema: S,
    context: string,
    init: RequestInit & { timeoutMs?: number } = {},
): Promise<z.infer<S>> {
    const response = await providerFetch(url, init);
    await expectOk(response, context);
    return parseJson(response, schema, context);
}

/** application/x-www-form-urlencoded body of a token request. */
export function formBody(params: Record<string, string | undefined>): URLSearchParams {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) body.set(key, value);
    return body;
}

export function basicAuth(user: string, password: string): string {
    return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}
