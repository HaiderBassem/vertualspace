/**
 * Fixed-window rate limiting, stored in PostgreSQL so that every instance of the application shares
 * the same counters. One atomic upsert per check: concurrent requests cannot slip past the limit.
 *
 *   const result = await checkRateLimit(`login:ip:${ip}`, 30, 900);
 *   if (!result.allowed) ...
 *
 * Stable API for callers: checkRateLimit, enforceRateLimit (for +server.ts handlers, returns a 429
 * Response) and assertRateLimit (for loads and form actions, throws a SvelteKit 429 error).
 */
import { error } from "@sveltejs/kit";
import { lt, sql } from "drizzle-orm";
import { db, schema } from "../db/client";

export interface RateLimitResult {
    allowed: boolean;
    /** Requests counted in the current window, this one included. */
    count: number;
    limit: number;
    /** Seconds until the current window ends. */
    retryAfterSec: number;
}

/** Keys are truncated to the column size; long subjects (e-mails, user agents) should be hashed first. */
function normalizeKey(key: string): string {
    return key.length <= 200 ? key : key.slice(0, 200);
}

let lastCleanup = 0;

/** Deletes expired counters, at most once a minute per process. */
async function cleanup(now: Date): Promise<void> {
    if (now.getTime() - lastCleanup < 60_000) return;
    lastCleanup = now.getTime();
    await db().delete(schema.rateLimits).where(lt(schema.rateLimits.expiresAt, now));
}

/**
 * Counts `weight` hits (default 1) for `key` and tells whether it is within `limit` hits per `windowSec`
 * seconds. A limit of 0 (or less) disables the check. A weight counts several units at once, e.g. one
 * invitation request for many addresses.
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSec: number,
    now = new Date(),
    weight = 1,
): Promise<RateLimitResult> {
    if (limit <= 0) return { allowed: true, count: 0, limit, retryAfterSec: 0 };
    const windowMs = windowSec * 1000;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const windowEnd = new Date(windowStart.getTime() + windowMs);
    const rows = await db()
        .insert(schema.rateLimits)
        .values({ key: normalizeKey(key), windowStart, count: weight, expiresAt: windowEnd })
        .onConflictDoUpdate({
            target: schema.rateLimits.key,
            set: {
                count: sql`case when ${schema.rateLimits.windowStart} = excluded.window_start then ${schema.rateLimits.count} + excluded.count else excluded.count end`,
                windowStart: sql`excluded.window_start`,
                expiresAt: sql`excluded.expires_at`,
            },
        })
        .returning({ count: schema.rateLimits.count });
    const count = rows[0]?.count ?? 1;
    void cleanup(now).catch(() => undefined);
    return {
        allowed: count <= limit,
        count,
        limit,
        retryAfterSec: Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)),
    };
}

/** For +server.ts handlers: undefined when allowed, else a 429 response with Retry-After. */
export async function enforceRateLimit(key: string, limit: number, windowSec: number): Promise<Response | undefined> {
    const result = await checkRateLimit(key, limit, windowSec);
    if (result.allowed) return undefined;
    return new Response(JSON.stringify({ status: "error", message: "Too many requests" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(result.retryAfterSec) },
    });
}

/** For loads and form actions: throws a SvelteKit 429 error when the limit is exceeded. */
export async function assertRateLimit(key: string, limit: number, windowSec: number): Promise<void> {
    const result = await checkRateLimit(key, limit, windowSec);
    if (!result.allowed) error(429, "Too many requests");
}

/** Removes the counters of a key (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
    await db()
        .delete(schema.rateLimits)
        .where(sql`${schema.rateLimits.key} = ${normalizeKey(key)}`);
}
