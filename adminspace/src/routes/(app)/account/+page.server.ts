import { fail } from "@sveltejs/kit";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import { isLocale, LOCALES } from "$lib/i18n";
import { LOCALE_COOKIE } from "$lib/i18n/cookie";
import { timeZoneOptions } from "$lib/i18n/format";
import { audit } from "$lib/server/audit";
import {
    checkPasswordPolicy,
    countRemainingRecoveryCodes,
    enableTotp,
    generateRecoveryCodes,
    hashPassword,
    matchTotpStep,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    readTotpEnrolment,
    resetSecondFactor,
    startTotpEnrolment,
    verifyCurrentSecondFactor,
    verifyPassword,
} from "$lib/server/auth/credentials";
import { destroyAccountSessions, markSessionMfaVerified, rotateSession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { parseForm, requiredText } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";

function current(locals: App.Locals) {
    const account = requireAccount(locals);
    const session = locals.session;
    if (!session) throw new Error("Session expected");
    return { account, session };
}

/** Sensitive account changes are throttled per account (password guessing from a hijacked session). */
async function throttled(accountId: string): Promise<boolean> {
    const result = await checkRateLimit(
        `sensitive:account:${accountId}`,
        config().RATE_LIMIT_SENSITIVE_PER_ACCOUNT,
        900,
    );
    return !result.allowed;
}

/** After a password or second-factor change: other sessions end, the current one gets a new token. */
async function secureSessions(event: RequestEvent, accountId: string, sessionId: string): Promise<void> {
    await destroyAccountSessions(accountId, sessionId);
    const session = await db().query.sessions.findFirst({ where: eq(schema.sessions.id, sessionId) });
    if (session) {
        await rotateSession(event.cookies, session, {
            ipAddress: event.locals.clientIp,
            userAgent: event.request.headers.get("user-agent") ?? undefined,
        });
    }
}

export const load: PageServerLoad = async ({ locals, url }) => {
    const { account, session } = current(locals);
    const sessions = await db().query.sessions.findMany({
        where: and(eq(schema.sessions.accountId, account.id), gt(schema.sessions.expiresAt, new Date())),
        orderBy: desc(schema.sessions.lastSeenAt),
    });
    return {
        profile: {
            name: account.name,
            email: account.email,
            locale: account.locale ?? "",
            timeZone: account.timeZone ?? "",
            mfaEnabled: account.totpEnabledAt !== null,
            mfaEnabledAt: account.totpEnabledAt?.toISOString() ?? null,
        },
        recoveryCodesRemaining: account.totpEnabledAt ? await countRemainingRecoveryCodes(account.id) : 0,
        mfaRequired: url.searchParams.get("mfa") === "required",
        mustChangePassword: account.mustChangePassword,
        mfaMandatory: config().REQUIRE_MFA,
        passwordMinLength: PASSWORD_MIN_LENGTH,
        passwordMaxLength: PASSWORD_MAX_LENGTH,
        locales: LOCALES.map((l) => ({ tag: l.tag, nativeName: l.nativeName })),
        timeZones: timeZoneOptions(),
        // Session ids are hashes of the cookie tokens; they are not sent to the browser.
        sessions: sessions.map((s) => ({
            current: s.id === session.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            createdAt: s.createdAt.toISOString(),
            lastSeenAt: s.lastSeenAt.toISOString(),
        })),
    };
};

const Profile = z.object({
    name: requiredText(200),
    email: z.string().trim().email().max(320),
    currentPassword: z
        .string()
        .max(PASSWORD_MAX_LENGTH + 1)
        .optional(),
});
const Preferences = z.object({ locale: z.string().max(35), timeZone: z.string().max(64) });

const field = (form: FormData, name: string) => String(form.get(name) ?? "").slice(0, PASSWORD_MAX_LENGTH + 1);

export const actions: Actions = {
    profile: async (event) => {
        const { request, locals } = event;
        const { account, session } = current(locals);
        const parsed = parseForm(await request.formData(), Profile);
        if (!parsed.ok) return parsed.failure;
        const { name, email, currentPassword } = parsed.data;
        const emailChanged = email.toLowerCase() !== account.email.toLowerCase();
        if (emailChanged) {
            // The email is the login identifier: changing it requires the password.
            if (await throttled(account.id)) return fail(429, { section: "profile" as const, rateLimited: true });
            if (!(await verifyPassword(account.passwordHash, currentPassword ?? ""))) {
                return fail(400, { section: "profile" as const, passwordError: "wrongPassword" as const });
            }
            const taken = await db().query.accounts.findFirst({
                where: and(sql`lower(${schema.accounts.email}) = lower(${email})`, ne(schema.accounts.id, account.id)),
            });
            if (taken) return fail(400, { section: "profile" as const, emailTaken: true });
        }
        try {
            await db().update(schema.accounts).set({ name, email }).where(eq(schema.accounts.id, account.id));
        } catch (cause) {
            // Concurrent change to the same email: the unique index decides.
            if ((cause as { code?: string }).code === "23505") {
                return fail(400, { section: "profile" as const, emailTaken: true });
            }
            throw cause;
        }
        if (emailChanged) await secureSessions(event, account.id, session.id);
        await audit({
            action: "account.profile.update",
            account,
            targetType: "account",
            targetId: account.id,
            ipAddress: locals.clientIp ?? null,
            details: { emailChanged },
        });
        return { section: "profile" as const, success: true };
    },

    preferences: async ({ request, locals, cookies }) => {
        const { account } = current(locals);
        const parsed = Preferences.safeParse(Object.fromEntries(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const locale = isLocale(parsed.data.locale) ? parsed.data.locale : null;
        const timeZone = timeZoneOptions().includes(parsed.data.timeZone) ? parsed.data.timeZone : null;
        await db().update(schema.accounts).set({ locale, timeZone }).where(eq(schema.accounts.id, account.id));
        // The language switcher cookie wins over the account preference: align it with the new choice.
        if (locale) {
            cookies.set(LOCALE_COOKIE, locale, {
                path: "/",
                httpOnly: true,
                sameSite: "lax",
                secure: config().NODE_ENV === "production",
                maxAge: 365 * 24 * 3600,
            });
        } else {
            cookies.delete(LOCALE_COOKIE, { path: "/" });
        }
        await audit({ action: "account.preferences.update", account, ipAddress: locals.clientIp ?? null });
        return { section: "preferences" as const, success: true };
    },

    password: async (event) => {
        const { request, locals } = event;
        const { account, session } = current(locals);
        if (await throttled(account.id)) return fail(429, { section: "password" as const, rateLimited: true });
        const form = await request.formData();
        const newPassword = field(form, "newPassword");
        if (!(await verifyPassword(account.passwordHash, field(form, "currentPassword")))) {
            return fail(400, { section: "password" as const, passwordError: "wrongPassword" as const });
        }
        const problem = checkPasswordPolicy(newPassword);
        if (problem) {
            return fail(400, {
                section: "password" as const,
                passwordError: problem === "tooShort" ? ("passwordTooShort" as const) : ("passwordTooLong" as const),
            });
        }
        if (newPassword !== field(form, "passwordConfirm")) {
            return fail(400, { section: "password" as const, passwordError: "passwordMismatch" as const });
        }
        await db()
            .update(schema.accounts)
            .set({
                passwordHash: await hashPassword(newPassword),
                passwordChangedAt: new Date(),
                mustChangePassword: false,
            })
            .where(eq(schema.accounts.id, account.id));
        await secureSessions(event, account.id, session.id);
        await audit({ action: "account.password.change", account, ipAddress: locals.clientIp ?? null });
        return { section: "password" as const, success: true };
    },

    /** Starts (or, when enabled, replaces) the second factor. Requires the password, and a current code when enabled. */
    mfaStart: async ({ request, locals }) => {
        const { account } = current(locals);
        if (await throttled(account.id)) return fail(429, { section: "mfa" as const, rateLimited: true });
        const form = await request.formData();
        if (!(await verifyPassword(account.passwordHash, field(form, "currentPassword")))) {
            return fail(400, { section: "mfa" as const, passwordError: "wrongPassword" as const });
        }
        if (account.totpEnabledAt) {
            const check = await verifyCurrentSecondFactor(account, field(form, "code"));
            if (!check.ok) return fail(400, { section: "mfa" as const, codeError: check.reason });
        }
        const enrolment = startTotpEnrolment(account);
        // The sealed secret travels back with the confirmation code; it is bound to this account and
        // expires after 15 minutes. Nothing is saved before the app proves it produces valid codes.
        return { section: "mfa" as const, mfaSetup: enrolment };
    },

    mfaConfirm: async (event) => {
        const { request, locals } = event;
        const { account, session } = current(locals);
        if (await throttled(account.id)) return fail(429, { section: "mfa" as const, rateLimited: true });
        const form = await request.formData();
        const token = String(form.get("token") ?? "").slice(0, 2048);
        const secret = readTotpEnrolment(token, account.id);
        const setup = {
            token,
            uri: String(form.get("uri") ?? "").slice(0, 1024),
            base32: String(form.get("base32") ?? "").slice(0, 128),
        };
        if (!secret) return fail(400, { section: "mfa" as const, enrolmentExpired: true });
        const step = matchTotpStep(secret, field(form, "code"), account.email);
        if (step === undefined) {
            return fail(400, { section: "mfa" as const, mfaInvalid: true, mfaSetup: setup });
        }
        const replaced = account.totpEnabledAt !== null;
        await enableTotp(account.id, secret, step);
        const recoveryCodes = await generateRecoveryCodes(account.id);
        await markSessionMfaVerified(session.id);
        await secureSessions(event, account.id, session.id);
        await audit({
            action: replaced ? "account.mfa.replace" : "account.mfa.enable",
            account,
            ipAddress: locals.clientIp ?? null,
        });
        return { section: "mfa" as const, mfaEnabled: true, recoveryCodes };
    },

    mfaDisable: async (event) => {
        const { request, locals } = event;
        const { account, session } = current(locals);
        if (config().REQUIRE_MFA) return fail(400, { section: "mfa" as const, mfaMandatory: true });
        if (await throttled(account.id)) return fail(429, { section: "mfa" as const, rateLimited: true });
        const form = await request.formData();
        if (!(await verifyPassword(account.passwordHash, field(form, "currentPassword")))) {
            return fail(400, { section: "mfa" as const, passwordError: "wrongPassword" as const });
        }
        const check = await verifyCurrentSecondFactor(account, field(form, "code"));
        if (!check.ok) return fail(400, { section: "mfa" as const, codeError: check.reason });
        await resetSecondFactor(account.id);
        await secureSessions(event, account.id, session.id);
        await audit({ action: "account.mfa.disable", account, ipAddress: locals.clientIp ?? null });
        return { section: "mfa" as const, mfaDisabled: true };
    },

    recoveryCodes: async ({ request, locals }) => {
        const { account } = current(locals);
        if (!account.totpEnabledAt) return fail(400, { section: "mfa" as const, message: "validation" as const });
        if (await throttled(account.id)) return fail(429, { section: "mfa" as const, rateLimited: true });
        const form = await request.formData();
        if (!(await verifyPassword(account.passwordHash, field(form, "currentPassword")))) {
            return fail(400, { section: "mfa" as const, passwordError: "wrongPassword" as const });
        }
        const recoveryCodes = await generateRecoveryCodes(account.id);
        await audit({ action: "account.mfa.recovery_codes", account, ipAddress: locals.clientIp ?? null });
        return { section: "mfa" as const, recoveryCodes };
    },

    endOtherSessions: async ({ locals }) => {
        const { account, session } = current(locals);
        await destroyAccountSessions(account.id, session.id);
        await audit({ action: "account.sessions.end_others", account, ipAddress: locals.clientIp ?? null });
        return { section: "sessions" as const, sessionsEnded: true };
    },
};
