/**
 * Password and second-factor handling for back-office accounts.
 *
 * - Passwords: argon2id with the OWASP Password Storage Cheat Sheet parameters (m=19 MiB, t=2, p=1),
 *   minimum 12 characters (NIST SP 800-63B §3.1.1.2 asks for at least 8; we are stricter).
 * - Brute force: the account is locked for 15 minutes after 10 consecutive password failures. Counters
 *   are updated atomically, and a locked account answers exactly like a wrong password (no oracle).
 *   Per-IP and per-account rate limits come on top (src/lib/server/security/rateLimit.ts).
 * - Second factor: TOTP (RFC 6238, SHA-1, 6 digits, 30 s), secret encrypted at rest. A time step is
 *   accepted once (no replay); 5 invalid codes lock the second factor for 15 minutes.
 * - Recovery codes: 10 single-use codes per account, stored as keyed hashes (HMAC with APP_SECRET).
 */
import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import * as OTPAuth from "otpauth";
import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { decrypt, encrypt, pseudonymize } from "../crypto";

const ARGON2_OPTIONS = { algorithm: 2 /* Argon2id */, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;
export const MAX_FAILED_LOGINS = 10;
export const MAX_FAILED_SECOND_FACTOR = 5;
const LOCK_MINUTES = 15;
export const RECOVERY_CODE_COUNT = 10;
const ENROLMENT_TTL_MS = 15 * 60_000;
const TOTP_PERIOD_SECONDS = 30;

type AccountRow = typeof schema.accounts.$inferSelect;

export function hashPassword(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
        return await verify(passwordHash, password);
    } catch {
        return false;
    }
}

export type PasswordProblem = "tooShort" | "tooLong";

export function checkPasswordPolicy(password: string): PasswordProblem | undefined {
    if (password.length < PASSWORD_MIN_LENGTH) return "tooShort";
    if (password.length > PASSWORD_MAX_LENGTH) return "tooLong";
    return undefined;
}

// A valid hash of a random password, verified when the email is unknown so that response time does
// not reveal which emails have an account.
let dummyHash: Promise<string> | undefined;

async function burnVerification(password: string): Promise<void> {
    dummyHash ??= hashPassword(crypto.randomUUID());
    await verifyPassword(await dummyHash, password);
}

/**
 * Login outcome. "invalid" covers unknown emails, wrong passwords and locked accounts alike, so that
 * the answer reveals nothing. `accountId` is only for the server's audit trail, never for the person.
 */
export type LoginResult =
    { ok: true; account: AccountRow } | { ok: false; reason: "invalid" | "disabled"; accountId?: string };

export async function checkCredentials(email: string, password: string): Promise<LoginResult> {
    const account = await db().query.accounts.findFirst({
        where: sql`lower(${schema.accounts.email}) = lower(${email})`,
    });

    if (!account) {
        await burnVerification(password);
        return { ok: false, reason: "invalid" };
    }

    const passwordOk = await verifyPassword(account.passwordHash, password);
    const locked = account.lockedUntil !== null && account.lockedUntil > new Date();
    if (locked) {
        return { ok: false, reason: "invalid", accountId: account.id };
    }
    if (!passwordOk) {
        // One atomic statement: concurrent guesses all count.
        await db().execute(sql`
            update accounts set
                failed_login_count = case when failed_login_count + 1 >= ${MAX_FAILED_LOGINS} then 0 else failed_login_count + 1 end,
                locked_until = case when failed_login_count + 1 >= ${MAX_FAILED_LOGINS}
                    then now() + make_interval(mins => ${LOCK_MINUTES}) else locked_until end
            where id = ${account.id}`);
        return { ok: false, reason: "invalid", accountId: account.id };
    }
    if (account.status !== "active") {
        return { ok: false, reason: "disabled", accountId: account.id };
    }
    await db()
        .update(schema.accounts)
        .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
        .where(eq(schema.accounts.id, account.id));
    return { ok: true, account };
}

// ---------------------------------------------------------------------------------------------
// TOTP
// ---------------------------------------------------------------------------------------------

const ISSUER = "Adminspace";

function totpFor(secretBase32: string, label: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
        issuer: ISSUER,
        label,
        algorithm: "SHA1",
        digits: 6,
        period: TOTP_PERIOD_SECONDS,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
}

function currentStep(now = Date.now()): number {
    return Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
}

/** Time step matched by `code` (current step ± 1 for clock drift), or undefined. */
export function matchTotpStep(
    secretBase32: string,
    code: string,
    label = "account",
    now = Date.now(),
): number | undefined {
    const normalized = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalized)) return undefined;
    try {
        const delta = totpFor(secretBase32, label).validate({ token: normalized, window: 1, timestamp: now });
        return delta === null ? undefined : currentStep(now) + delta;
    } catch {
        return undefined;
    }
}

/**
 * Starts an enrolment: a new secret, returned as a sealed token bound to the account and valid
 * 15 minutes. Nothing is stored until a valid code confirms it.
 */
export function startTotpEnrolment(account: Pick<AccountRow, "id" | "email">): {
    token: string;
    uri: string;
    base32: string;
} {
    const secret = new OTPAuth.Secret({ size: 20 });
    const token = encrypt(JSON.stringify({ s: secret.base32, a: account.id, e: Date.now() + ENROLMENT_TTL_MS }));
    return { token, uri: totpFor(secret.base32, account.email).toString(), base32: secret.base32 };
}

/** The secret of an enrolment token, when it was issued for this account and has not expired. */
export function readTotpEnrolment(token: string, accountId: string): string | undefined {
    try {
        const data = JSON.parse(decrypt(token)) as { s?: unknown; a?: unknown; e?: unknown };
        if (data.a !== accountId || typeof data.s !== "string" || typeof data.e !== "number") return undefined;
        return data.e > Date.now() ? data.s : undefined;
    } catch {
        return undefined;
    }
}

/** Stores a confirmed secret, accepting `step` as already used, and resets second-factor counters. */
export async function enableTotp(accountId: string, secretBase32: string, step: number): Promise<void> {
    await db()
        .update(schema.accounts)
        .set({
            totpSecret: encrypt(secretBase32),
            totpEnabledAt: new Date(),
            totpLastStep: step,
            totpFailedCount: 0,
            totpLockedUntil: null,
        })
        .where(eq(schema.accounts.id, accountId));
}

/** Removes the second factor and its recovery codes (by the person, or by a superadmin). */
export async function resetSecondFactor(accountId: string): Promise<void> {
    await db().transaction(async (tx) => {
        await tx
            .update(schema.accounts)
            .set({
                totpSecret: null,
                totpEnabledAt: null,
                totpLastStep: null,
                totpFailedCount: 0,
                totpLockedUntil: null,
            })
            .where(eq(schema.accounts.id, accountId));
        await tx.delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.accountId, accountId));
    });
}

export type SecondFactorResult =
    { ok: true; method: "totp" | "recovery" } | { ok: false; reason: "invalid" | "locked" };

function secondFactorLocked(account: Pick<AccountRow, "totpLockedUntil">, now: Date): boolean {
    return account.totpLockedUntil !== null && account.totpLockedUntil > now;
}

/** Records an invalid code; returns true when this failure locks the second factor. */
async function recordSecondFactorFailure(accountId: string): Promise<boolean> {
    const rows = await db().execute<{ locked: boolean }>(sql`
        update accounts set
            totp_failed_count = case when totp_failed_count + 1 >= ${MAX_FAILED_SECOND_FACTOR} then 0 else totp_failed_count + 1 end,
            totp_locked_until = case when totp_failed_count + 1 >= ${MAX_FAILED_SECOND_FACTOR}
                then now() + make_interval(mins => ${LOCK_MINUTES}) else totp_locked_until end
        where id = ${accountId}
        returning (totp_locked_until is not null and totp_locked_until > now()) as locked`);
    return Boolean(rows[0]?.locked);
}

/**
 * Checks a second factor at login: a 6-digit TOTP code (each time step accepted once) or a recovery
 * code (each code accepted once). Every check and its consumption is a single atomic statement.
 */
export async function verifySecondFactor(
    account: AccountRow,
    input: string,
    now = new Date(),
): Promise<SecondFactorResult> {
    const fresh = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, account.id) });
    if (!fresh?.totpSecret) return { ok: false, reason: "invalid" };
    if (secondFactorLocked(fresh, now)) return { ok: false, reason: "locked" };

    const code = input.trim();
    if (/^\d[\d\s]*$/.test(code)) {
        let secret: string;
        try {
            secret = decrypt(fresh.totpSecret);
        } catch {
            return { ok: false, reason: "invalid" };
        }
        const step = matchTotpStep(secret, code, fresh.email, now.getTime());
        if (step !== undefined) {
            const consumed = await db()
                .update(schema.accounts)
                .set({ totpLastStep: step, totpFailedCount: 0 })
                .where(
                    and(
                        eq(schema.accounts.id, fresh.id),
                        or(isNull(schema.accounts.totpLastStep), sql`${schema.accounts.totpLastStep} < ${step}`),
                    ),
                )
                .returning({ id: schema.accounts.id });
            if (consumed.length > 0) return { ok: true, method: "totp" };
        }
    } else if (await consumeRecoveryCode(fresh.id, code)) {
        await db().update(schema.accounts).set({ totpFailedCount: 0 }).where(eq(schema.accounts.id, fresh.id));
        return { ok: true, method: "recovery" };
    }

    return { ok: false, reason: (await recordSecondFactorFailure(fresh.id)) ? "locked" : "invalid" };
}

/**
 * Checks a current code for a sensitive change made from an already verified session (replacing or
 * disabling the second factor). Same replay and attempt rules as at login.
 */
export const verifyCurrentSecondFactor = verifySecondFactor;

// ---------------------------------------------------------------------------------------------
// Recovery codes
// ---------------------------------------------------------------------------------------------

/** Unambiguous lowercase alphabet (no 0/o, 1/l/i). 10 characters: about 49 bits per code. */
const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function normalizeRecoveryCode(code: string): string {
    return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function recoveryCodeHash(code: string): string {
    return pseudonymize(normalizeRecoveryCode(code), "recovery-code");
}

function newRecoveryCode(): string {
    let raw = "";
    for (let i = 0; i < 10; i++) raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/** Replaces the account's recovery codes with new ones, returned in clear text once. */
export async function generateRecoveryCodes(accountId: string): Promise<string[]> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    await db().transaction(async (tx) => {
        await tx.delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.accountId, accountId));
        await tx
            .insert(schema.recoveryCodes)
            .values(codes.map((code) => ({ accountId, codeHash: recoveryCodeHash(code) })));
    });
    return codes;
}

/** Marks a recovery code as used. True only the first time a valid code is presented. */
export async function consumeRecoveryCode(accountId: string, code: string): Promise<boolean> {
    if (normalizeRecoveryCode(code).length !== 10) return false;
    const rows = await db()
        .update(schema.recoveryCodes)
        .set({ usedAt: new Date() })
        .where(
            and(
                eq(schema.recoveryCodes.accountId, accountId),
                eq(schema.recoveryCodes.codeHash, recoveryCodeHash(code)),
                isNull(schema.recoveryCodes.usedAt),
            ),
        )
        .returning({ id: schema.recoveryCodes.id });
    return rows.length > 0;
}

export async function countRemainingRecoveryCodes(accountId: string): Promise<number> {
    const rows = await db()
        .select({ value: count() })
        .from(schema.recoveryCodes)
        .where(and(eq(schema.recoveryCodes.accountId, accountId), isNull(schema.recoveryCodes.usedAt)));
    return rows[0]?.value ?? 0;
}
