/**
 * HTTP helpers.
 *
 * Back-office JSON endpoints answer errors as RFC 9457 "Problem Details" (application/problem+json).
 * The WorkAdventure Admin API does NOT use this format: WorkAdventure expects its own ErrorApiData
 * bodies (see src/lib/server/workadventure/errors.ts), so Admin API handlers must not call problem().
 */
import { timingSafeEqual } from "node:crypto";
import { config } from "../config";

export interface ProblemDetails {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    [extension: string]: unknown;
}

export function problem(details: ProblemDetails, headers: HeadersInit = {}): Response {
    return new Response(JSON.stringify({ type: "about:blank", ...details }), {
        status: details.status,
        headers: { "content-type": "application/problem+json; charset=utf-8", ...headers },
    });
}

export function json(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
    });
}

export function noContent(): Response {
    return new Response(null, { status: 204 });
}

/** Constant-time string comparison, to avoid leaking secrets through timing. */
export function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
        // Still compare to keep the timing independent of where the strings differ.
        timingSafeEqual(left, left);
        return false;
    }
    return timingSafeEqual(left, right);
}

/**
 * Checks the token WorkAdventure sends on Admin API calls. WorkAdventure sends ADMIN_API_TOKEN raw in
 * the Authorization header (no "Bearer" prefix); a "Bearer " prefix is accepted too. Returns a 403
 * Response to send back when the token is wrong, as WorkAdventure's documentation requires.
 */
export function checkAdminApiToken(request: Request): Response | undefined {
    const header = request.headers.get("authorization") ?? request.headers.get("admin-token") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
    if (!safeEqual(token, config().ADMIN_API_TOKEN)) {
        return new Response("Forbidden", { status: 403 });
    }
    return undefined;
}
