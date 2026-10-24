/**
 * Self-service password reset by email (OWASP Forgot Password Cheat Sheet):
 *
 * - Same answer, in the same time, whether or not the address has an account: the lookup and the
 *   email happen after the answer.
 * - 256-bit random token, only its SHA-256 stored, valid 30 minutes, single use; a new request
 *   invalidates the previous links of the account.
 * - Links are built from ORIGIN, never from the Host header; the token is in the query string (request
 *   logs record paths only) and the pages send Referrer-Policy: no-referrer.
 * - Nothing changes before a valid token is used; using it ends every session, clears the lockout and
 *   notifies the person. It does not log in, and two-factor authentication still applies at login.
 * - Disabled accounts receive nothing. Without a mail server the feature is unavailable (and says so).
 */
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { randomToken, sha256Hex } from "../crypto";
import { checkPasswordPolicy, hashPassword } from "../auth/credentials";
import { destroyAccountSessions } from "../auth/session";
import { localeInfo, messagesFor, isLocale, DEFAULT_LOCALE, format, type Locale } from "../../i18n";
import { mailConfigured, sendMail } from "./mail";
import { logJson } from "../security/requestLog";

export const RESET_TTL_MINUTES = 30;

function resetLink(origin: string, token: string): string {
    return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export function passwordResetAvailable(): boolean {
    return mailConfigured();
}

/**
 * Handles a reset request for `email`. Returns at once; the work (lookup, token, email) runs after the
 * answer so that neither its content nor its timing tells whether the address has an account.
 */
export function requestPasswordReset(input: {
    email: string;
    origin: string;
    locale: Locale;
    ipAddress: string | undefined;
}): void {
    const email = input.email.trim().toLowerCase();
    void (async () => {
        const account = await db().query.accounts.findFirst({
            where: sql`lower(${schema.accounts.email}) = ${email}`,
        });
        if (!account || account.status !== "active") return;
        await issuePasswordResetLink(account, input);
    })().catch((error: unknown) =>
        logJson("error", "password reset request failed", { error: error instanceof Error ? error.name : "unknown" }),
    );
}

/**
 * Creates a reset link for an account (only the newest link works) and emails it to the account's own
 * address. Also used when a platform administrator resets a password: the link goes to the person, the
 * administrator never learns a password. Returns whether the email was sent.
 */
export async function issuePasswordResetLink(
    account: { id: string; email: string; name: string; locale: string | null },
    input: { origin: string; locale: Locale; ipAddress: string | undefined },
): Promise<boolean> {
    const token = randomToken();
    await db().transaction(async (tx) => {
        await tx
            .update(schema.passwordResets)
            .set({ usedAt: new Date() })
            .where(and(eq(schema.passwordResets.accountId, account.id), isNull(schema.passwordResets.usedAt)));
        await tx.insert(schema.passwordResets).values({
            accountId: account.id,
            tokenHash: sha256Hex(token),
            expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
            ipAddress: input.ipAddress ?? null,
        });
    });
    const locale = account.locale && isLocale(account.locale) ? account.locale : input.locale;
    const m = messagesFor(locale).onboarding.emails.passwordReset;
    const info = localeInfo(locale);
    const delivery = await sendMail({
        to: account.email,
        purpose: "password_reset",
        message: {
            subject: m.subject,
            paragraphs: [format(m.body, { name: account.name })],
            action: { label: m.action, url: resetLink(input.origin, token) },
            footnote: format(m.footnote, { minutes: RESET_TTL_MINUTES }),
            dir: info.dir,
            lang: info.tag,
        },
    });
    return delivery === "sent";
}

/** Whether a reset link is still usable (the page then shows the form). */
export async function isResetTokenValid(token: string): Promise<boolean> {
    if (token.length < 20 || token.length > 200) return false;
    const row = await db().query.passwordResets.findFirst({
        where: and(
            eq(schema.passwordResets.tokenHash, sha256Hex(token)),
            isNull(schema.passwordResets.usedAt),
            gt(schema.passwordResets.expiresAt, new Date()),
        ),
    });
    return row !== undefined;
}

export type ResetResult =
    { result: "ok"; accountId: string } | { result: "invalid" } | { result: "tooShort" } | { result: "tooLong" };

/** Sets a new password with a valid link. Ends every session of the account and notifies the person. */
export async function resetPassword(token: string, password: string, defaultLocale: Locale): Promise<ResetResult> {
    const problem = checkPasswordPolicy(password);
    if (problem === "tooShort") return { result: "tooShort" };
    if (problem === "tooLong") return { result: "tooLong" };
    const passwordHash = await hashPassword(password);
    const account = await db().transaction(async (tx) => {
        const [reset] = await tx
            .select()
            .from(schema.passwordResets)
            .where(
                and(
                    eq(schema.passwordResets.tokenHash, sha256Hex(token)),
                    isNull(schema.passwordResets.usedAt),
                    gt(schema.passwordResets.expiresAt, new Date()),
                ),
            )
            .for("update");
        if (!reset) return undefined;
        const [updated] = await tx
            .update(schema.accounts)
            .set({
                passwordHash,
                passwordChangedAt: new Date(),
                mustChangePassword: false,
                failedLoginCount: 0,
                lockedUntil: null,
                // The emailed link proves the address.
                emailVerifiedAt: sql`coalesce(${schema.accounts.emailVerifiedAt}, now())`,
            })
            .where(and(eq(schema.accounts.id, reset.accountId), eq(schema.accounts.status, "active")))
            .returning();
        if (!updated) return undefined;
        await tx
            .update(schema.passwordResets)
            .set({ usedAt: new Date() })
            .where(and(eq(schema.passwordResets.accountId, reset.accountId), isNull(schema.passwordResets.usedAt)));
        return updated;
    });
    if (!account) return { result: "invalid" };
    await destroyAccountSessions(account.id);

    const locale = isLocale(account.locale) ? account.locale : (defaultLocale ?? DEFAULT_LOCALE);
    const m = messagesFor(locale).onboarding.emails.passwordChanged;
    const info = localeInfo(locale);
    void sendMail({
        to: account.email,
        purpose: "password_changed",
        message: {
            subject: m.subject,
            paragraphs: [format(m.body, { name: account.name })],
            footnote: m.footnote,
            dir: info.dir,
            lang: info.tag,
        },
    }).catch(() => undefined);
    return { result: "ok", accountId: account.id };
}

/** Deletes used or expired reset links. Returns the number deleted. */
export async function purgePasswordResets(now = new Date()): Promise<number> {
    const rows = await db()
        .delete(schema.passwordResets)
        .where(or(lt(schema.passwordResets.expiresAt, now), sql`${schema.passwordResets.usedAt} is not null`))
        .returning({ id: schema.passwordResets.id });
    return rows.length;
}
