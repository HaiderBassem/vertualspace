/**
 * Server-side sessions. The cookie carries a random 256-bit token; the database only stores its
 * SHA-256, so a database leak does not leak usable sessions.
 *
 * Lifetime: a session slides with activity up to SESSION_TTL_HOURS of inactivity, and never lives
 * longer than SESSION_ABSOLUTE_HOURS after it was created. An account keeps at most
 * SESSION_MAX_PER_ACCOUNT sessions: the oldest are ended beyond that.
 */
import type { Cookies } from "@sveltejs/kit";
import { and, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { config } from "../config";
import { randomToken, sha256Hex } from "../crypto";
import { db, schema } from "../db/client";

export type Account = typeof schema.accounts.$inferSelect;
export type Session = typeof schema.sessions.$inferSelect;

export function sessionCookieName(): string {
    // The __Host- prefix (RFC 6265bis) pins the cookie to this exact host, but requires HTTPS.
    return config().NODE_ENV === "production" ? "__Host-adminspace_session" : "adminspace_session";
}

/** Expiry of a session created at `createdAt`, used now: idle limit, capped by the absolute one. */
export function sessionExpiry(createdAt: Date, now = new Date()): Date {
    const idle = now.getTime() + config().SESSION_TTL_HOURS * 3_600_000;
    const absolute = createdAt.getTime() + config().SESSION_ABSOLUTE_HOURS * 3_600_000;
    return new Date(Math.min(idle, absolute));
}

function setCookie(cookies: Cookies, token: string, expires: Date): void {
    cookies.set(sessionCookieName(), token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: config().NODE_ENV === "production",
        expires,
    });
}

/** Ends the oldest sessions of an account beyond SESSION_MAX_PER_ACCOUNT. */
export async function enforceSessionCap(accountId: string): Promise<void> {
    const keep = config().SESSION_MAX_PER_ACCOUNT;
    const rows = await db()
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(eq(schema.sessions.accountId, accountId))
        .orderBy(desc(schema.sessions.createdAt), desc(schema.sessions.lastSeenAt))
        .offset(keep);
    if (rows.length > 0) {
        await db()
            .delete(schema.sessions)
            .where(
                inArray(
                    schema.sessions.id,
                    rows.map((r) => r.id),
                ),
            );
    }
}

/** Creates a session and sets its cookie. Returns the session id (hash of the token). */
export async function createSession(
    cookies: Cookies,
    accountId: string,
    meta: { ipAddress?: string; userAgent?: string; mfaVerified: boolean },
): Promise<string> {
    const token = randomToken();
    const now = new Date();
    const expiresAt = sessionExpiry(now, now);
    const id = sha256Hex(token);
    await db()
        .insert(schema.sessions)
        .values({
            id,
            accountId,
            expiresAt,
            createdAt: now,
            mfaVerified: meta.mfaVerified,
            ipAddress: meta.ipAddress ?? null,
            userAgent: meta.userAgent?.slice(0, 500) ?? null,
        });
    setCookie(cookies, token, expiresAt);
    await enforceSessionCap(accountId);
    return id;
}

/**
 * Replaces the current session with a new token (session fixation hardening after a password or
 * second-factor change). The new session keeps the second-factor state of the old one.
 */
export async function rotateSession(
    cookies: Cookies,
    session: Session,
    meta: { ipAddress?: string; userAgent?: string },
): Promise<string> {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, session.id));
    return createSession(cookies, session.accountId, { ...meta, mfaVerified: session.mfaVerified });
}

/** Returns the session and its account, or undefined. Extends the session when it is used. */
export async function readSession(cookies: Cookies): Promise<{ session: Session; account: Account } | undefined> {
    const token = cookies.get(sessionCookieName());
    if (!token) return undefined;

    const id = sha256Hex(token);
    const now = new Date();
    const row = await db()
        .select({ session: schema.sessions, account: schema.accounts })
        .from(schema.sessions)
        .innerJoin(schema.accounts, eq(schema.accounts.id, schema.sessions.accountId))
        .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, now)))
        .limit(1)
        .then((rows) => rows[0]);

    const absoluteEnd = row ? row.session.createdAt.getTime() + config().SESSION_ABSOLUTE_HOURS * 3_600_000 : 0;
    if (!row || row.account.status !== "active" || absoluteEnd <= now.getTime()) {
        if (row) await db().delete(schema.sessions).where(eq(schema.sessions.id, id));
        cookies.delete(sessionCookieName(), { path: "/" });
        return undefined;
    }

    // Slide the expiry at most once a minute to keep writes low.
    if (now.getTime() - row.session.lastSeenAt.getTime() > 60_000) {
        const expiresAt = sessionExpiry(row.session.createdAt, now);
        await db().update(schema.sessions).set({ lastSeenAt: now, expiresAt }).where(eq(schema.sessions.id, id));
        setCookie(cookies, token, expiresAt);
    }
    return row;
}

export async function markSessionMfaVerified(sessionId: string): Promise<void> {
    await db().update(schema.sessions).set({ mfaVerified: true }).where(eq(schema.sessions.id, sessionId));
}

export async function destroySessionById(sessionId: string): Promise<void> {
    await db().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function destroySession(cookies: Cookies): Promise<void> {
    const token = cookies.get(sessionCookieName());
    if (token) {
        await destroySessionById(sha256Hex(token));
    }
    cookies.delete(sessionCookieName(), { path: "/" });
}

/** Ends every session of an account, e.g. after a password change, except optionally the current one. */
export async function destroyAccountSessions(accountId: string, exceptSessionId?: string): Promise<void> {
    await db()
        .delete(schema.sessions)
        .where(
            exceptSessionId
                ? and(eq(schema.sessions.accountId, accountId), ne(schema.sessions.id, exceptSessionId))
                : eq(schema.sessions.accountId, accountId),
        );
}

export async function purgeExpiredSessions(): Promise<void> {
    await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}
