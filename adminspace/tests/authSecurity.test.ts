/**
 * Authentication hardening: rate limiting, TOTP replay and lockout, recovery codes, redirects,
 * secrets, sessions and first-run bootstrap. Uses the database of .env; every row is cleaned up.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Cookies } from "@sveltejs/kit";
import { eq, inArray, like, sql } from "drizzle-orm";
import * as OTPAuth from "otpauth";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import {
    consumeRecoveryCode,
    countRemainingRecoveryCodes,
    enableTotp,
    generateRecoveryCodes,
    hashPassword,
    MAX_FAILED_SECOND_FACTOR,
    readTotpEnrolment,
    startTotpEnrolment,
    verifySecondFactor,
} from "../src/lib/server/auth/credentials";
import { createFirstSuperadmin } from "../src/lib/server/auth/bootstrap";
import { createSession, readSession, sessionCookieName } from "../src/lib/server/auth/session";
import { checkRateLimit } from "../src/lib/server/security/rateLimit";
import { safeRedirectPath } from "../src/lib/server/http/forms";
import { config, parseConfig, secretProblems } from "../src/lib/server/config";
import { decrypt, encrypt, encryptV1ForTests } from "../src/lib/server/crypto";

const RUN = `s1-${Date.now()}`;
const createdAccounts: string[] = [];

async function newAccount(label: string) {
    const [account] = await db()
        .insert(schema.accounts)
        .values({
            email: `${RUN}-${label}@example.test`,
            name: label,
            passwordHash: await hashPassword(`${RUN}-pw-long`),
        })
        .returning();
    if (!account) throw new Error("account not created");
    createdAccounts.push(account.id);
    return account;
}

function memoryCookies(): Cookies & { jar: Map<string, string> } {
    const jar = new Map<string, string>();
    return {
        jar,
        get: (name: string) => jar.get(name),
        getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
        set: (name: string, value: string) => void jar.set(name, value),
        delete: (name: string) => void jar.delete(name),
        serialize: () => "",
    } as unknown as Cookies & { jar: Map<string, string> };
}

afterAll(async () => {
    await db()
        .delete(schema.rateLimits)
        .where(like(schema.rateLimits.key, `${RUN}%`));
    if (createdAccounts.length > 0) {
        await db().delete(schema.auditLogs).where(inArray(schema.auditLogs.accountId, createdAccounts));
        await db().delete(schema.accounts).where(inArray(schema.accounts.id, createdAccounts));
    }
    await closeDb();
});

describe("rate limiting (shared PostgreSQL store)", () => {
    it("never lets more than the limit through under concurrent hits", async () => {
        const key = `${RUN}:concurrent`;
        const results = await Promise.all(Array.from({ length: 25 }, () => checkRateLimit(key, 10, 60)));
        expect(results.filter((r) => r.allowed)).toHaveLength(10);
        expect(Math.max(...results.map((r) => r.count))).toBe(25);
    });

    it("starts a new window once the previous one is over", async () => {
        const key = `${RUN}:window`;
        const t0 = new Date("2026-01-01T00:00:00Z");
        await checkRateLimit(key, 2, 60, t0);
        await checkRateLimit(key, 2, 60, new Date(t0.getTime() + 1_000));
        const third = await checkRateLimit(key, 2, 60, new Date(t0.getTime() + 2_000));
        expect(third.allowed).toBe(false);
        expect(third.retryAfterSec).toBeGreaterThan(0);
        const nextWindow = await checkRateLimit(key, 2, 60, new Date(t0.getTime() + 61_000));
        expect(nextWindow).toMatchObject({ allowed: true, count: 1 });
    });

    it("treats a limit of 0 as disabled", async () => {
        expect((await checkRateLimit(`${RUN}:off`, 0, 60)).allowed).toBe(true);
    });
});

describe("second factor", () => {
    let secret: string;
    let accountId: string;

    beforeAll(async () => {
        const account = await newAccount("totp");
        accountId = account.id;
        const enrolment = startTotpEnrolment(account);
        const read = readTotpEnrolment(enrolment.token, account.id);
        expect(read).toBe(enrolment.base32);
        // An enrolment token is bound to its account.
        expect(readTotpEnrolment(enrolment.token, crypto.randomUUID())).toBeUndefined();
        secret = enrolment.base32;
        await enableTotp(account.id, secret, 0);
    });

    const totp = () =>
        new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
    const fresh = async () => {
        const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId) });
        if (!account) throw new Error("missing");
        return account;
    };

    it("accepts a valid code once, then refuses its replay", async () => {
        const code = totp().generate();
        expect(await verifySecondFactor(await fresh(), code)).toEqual({ ok: true, method: "totp" });
        expect(await verifySecondFactor(await fresh(), code)).toEqual({ ok: false, reason: "invalid" });
    });

    it("locks after repeated invalid codes, even for a valid one", async () => {
        let last;
        for (let i = 0; i < MAX_FAILED_SECOND_FACTOR; i++) {
            last = await verifySecondFactor(await fresh(), "000000");
        }
        expect(last).toEqual({ ok: false, reason: "locked" });
        const later = new Date(Date.now() + 30_000);
        const nextCode = totp().generate({ timestamp: later.getTime() });
        expect(await verifySecondFactor(await fresh(), nextCode, later)).toEqual({ ok: false, reason: "locked" });
        await db()
            .update(schema.accounts)
            .set({ totpLockedUntil: null, totpFailedCount: 0 })
            .where(eq(schema.accounts.id, accountId));
    });

    it("accepts each recovery code exactly once", async () => {
        const codes = await generateRecoveryCodes(accountId);
        expect(codes).toHaveLength(10);
        expect(new Set(codes).size).toBe(10);
        expect(await countRemainingRecoveryCodes(accountId)).toBe(10);
        const [first, second] = codes as [string, string];
        expect(await verifySecondFactor(await fresh(), first.toUpperCase())).toEqual({ ok: true, method: "recovery" });
        expect(await verifySecondFactor(await fresh(), first)).toEqual({ ok: false, reason: "invalid" });
        expect(await consumeRecoveryCode(accountId, second)).toBe(true);
        expect(await consumeRecoveryCode(accountId, second)).toBe(false);
        expect(await countRemainingRecoveryCodes(accountId)).toBe(8);
        // Regenerating invalidates every previous code.
        const renewed = await generateRecoveryCodes(accountId);
        expect(await consumeRecoveryCode(accountId, codes[2] ?? "")).toBe(false);
        expect(await consumeRecoveryCode(accountId, renewed[0] ?? "")).toBe(true);
    });
});

describe("safeRedirectPath", () => {
    it.each([
        ["/\t/evil.example", "/"],
        ["/\n/evil.example", "/"],
        ["/\r\n/evil.example", "/"],
        ["/\\evil.example", "/"],
        ["\\\\evil.example", "/"],
        ["//evil.example", "/"],
        ["/\\/evil.example", "/"],
        ["https://evil.example", "/"],
        ["javascript:alert(1)", "/"],
        ["/%09/evil.example", "/%09/evil.example"],
        ["", "/"],
        [42, "/"],
        ["/o/acme/w/hq?tab=rooms#top", "/o/acme/w/hq?tab=rooms#top"],
        ["/worlds", "/worlds"],
    ])("%j -> %j", (input, expected) => {
        const result = safeRedirectPath(input);
        expect(result).toBe(expected);
        // Whatever comes out stays on our origin.
        expect(new URL(result, "https://admin.example").origin).toBe("https://admin.example");
    });
});

describe("secrets", () => {
    const strong = "a".repeat(20) + "Zq9X7vL2mN4pR8tY6wB3cD5f";
    it("flags short and placeholder values", () => {
        expect(secretProblems({ ADMIN_API_TOKEN: "123", APP_SECRET: strong, ADMIN_SOCKETS_TOKEN: undefined })).toEqual([
            "ADMIN_API_TOKEN must be at least 32 characters",
            "ADMIN_API_TOKEN is a placeholder value",
        ]);
        expect(
            secretProblems({
                ADMIN_API_TOKEN: strong,
                APP_SECRET: "change-me-to-at-least-32-random-characters",
                ADMIN_SOCKETS_TOKEN: "",
            }),
        ).toEqual(["APP_SECRET is a placeholder value"]);
        expect(secretProblems({ ADMIN_API_TOKEN: strong, APP_SECRET: strong, ADMIN_SOCKETS_TOKEN: strong })).toEqual(
            [],
        );
    });

    it("refuses insecure secrets in production only", () => {
        const base = { DATABASE_URL: "postgres://u:p@localhost:5432/db", APP_SECRET: strong };
        expect(() => parseConfig({ ...base, NODE_ENV: "production", ADMIN_API_TOKEN: "123" })).toThrow(/Insecure/);
        expect(parseConfig({ ...base, NODE_ENV: "test", ADMIN_API_TOKEN: "123" }).ADMIN_API_TOKEN).toBe("123");
        expect(parseConfig({ ...base, NODE_ENV: "production", ADMIN_API_TOKEN: strong }).NODE_ENV).toBe("production");
    });

    it("encrypts with v2 (HKDF) and still decrypts v1 payloads", () => {
        const sealed = encrypt("hello");
        expect(sealed.startsWith("v2.")).toBe(true);
        expect(decrypt(sealed)).toBe("hello");
        expect(decrypt(encryptV1ForTests("legacy"))).toBe("legacy");
    });
});

describe("sessions", () => {
    it("expires a session after its absolute lifetime, whatever the activity", async () => {
        const account = await newAccount("absolute");
        const cookies = memoryCookies();
        const id = await createSession(cookies, account.id, { mfaVerified: true });
        expect(await readSession(cookies)).toBeDefined();
        const tooOld = new Date(Date.now() - (config().SESSION_ABSOLUTE_HOURS + 1) * 3_600_000);
        await db()
            .update(schema.sessions)
            .set({ createdAt: tooOld, expiresAt: new Date(Date.now() + 3_600_000) })
            .where(eq(schema.sessions.id, id));
        expect(await readSession(cookies)).toBeUndefined();
        expect(cookies.jar.has(sessionCookieName())).toBe(false);
        expect(await db().query.sessions.findFirst({ where: eq(schema.sessions.id, id) })).toBeUndefined();
    });

    it("keeps at most SESSION_MAX_PER_ACCOUNT sessions, ending the oldest", async () => {
        const account = await newAccount("cap");
        const max = config().SESSION_MAX_PER_ACCOUNT;
        for (let i = 0; i < max + 3; i++) {
            await createSession(memoryCookies(), account.id, { mfaVerified: true });
        }
        const rows = await db()
            .select({ value: sql<number>`count(*)::int` })
            .from(schema.sessions)
            .where(eq(schema.sessions.accountId, account.id));
        expect(rows[0]?.value).toBe(max);
    });
});

describe("first-run bootstrap", () => {
    it("creates at most one first account under concurrent attempts", async () => {
        const before = await db()
            .select({ value: sql<number>`count(*)::int` })
            .from(schema.accounts);
        const results = await Promise.all(
            [1, 2, 3].map((n) =>
                createFirstSuperadmin({
                    name: `First ${n}`,
                    email: `${RUN}-first-${n}@example.test`,
                    password: "x".repeat(16),
                }),
            ),
        );
        const created = results.filter((r) => r !== undefined);
        created.forEach((account) => createdAccounts.push(account.id));
        expect(created.length).toBeLessThanOrEqual(1);
        if ((before[0]?.value ?? 0) === 0) {
            // Only meaningful on an empty database: exactly one wins.
            expect(created).toHaveLength(1);
        }
    });
});
