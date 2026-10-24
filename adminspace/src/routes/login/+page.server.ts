import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { checkCredentials } from "$lib/server/auth/credentials";
import { createSession, destroySession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { pseudonymize } from "$lib/server/crypto";
import { formValues, safeRedirectPath } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { hasAnyAccount } from "$lib/server/services/accounts";
import { passwordResetAvailable } from "$lib/server/services/passwordReset";
import { registrationAvailability } from "$lib/server/services/registration";

const WINDOW_SECONDS = 15 * 60;

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!(await hasAnyAccount())) redirect(303, "/setup");
    const redirectTo = safeRedirectPath(url.searchParams.get("redirectTo") ?? "/");
    if (locals.account && locals.session) redirect(303, redirectTo);
    const registration = await registrationAvailability();
    return {
        redirectTo,
        resetAvailable: passwordResetAvailable(),
        registrationOpen: registration === "open" || registration === "openWithoutVerification",
    };
};

const LoginForm = z.object({
    email: z.string().trim().min(1).max(320),
    password: z.string().min(1).max(256),
    redirectTo: z.string().max(2048).optional(),
});

export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        const formData = await request.formData();
        const parsed = LoginForm.safeParse(formValues(formData));
        const typedEmail = String(formData.get("email") ?? "").slice(0, 320);
        if (!parsed.success) {
            return fail(400, { email: typedEmail, reason: "invalid" as const });
        }
        const { email, password, redirectTo } = parsed.data;

        // Throttling, shared by every instance: per network address and per targeted account.
        const subject = pseudonymize(email.toLowerCase(), "login");
        const [byIp, byAccount] = await Promise.all([
            checkRateLimit(
                `login:ip:${locals.clientIp ?? "unknown"}`,
                config().RATE_LIMIT_LOGIN_PER_IP,
                WINDOW_SECONDS,
            ),
            checkRateLimit(`login:account:${subject}`, config().RATE_LIMIT_LOGIN_PER_ACCOUNT, WINDOW_SECONDS),
        ]);
        if (!byIp.allowed || !byAccount.allowed) {
            return fail(429, { email, reason: "rateLimited" as const });
        }

        const result = await checkCredentials(email, password);
        if (!result.ok) {
            // Never the raw input (it may be a mistyped password): a pseudonym, or the account id.
            await audit({
                action: "auth.login_failed",
                actorLabel: `login:${subject.slice(0, 16)}`,
                targetType: result.accountId ? "account" : undefined,
                targetId: result.accountId,
                ipAddress: locals.clientIp ?? null,
                details: { reason: result.reason },
            });
            return fail(400, { email, reason: result.reason });
        }

        // A new session for every login; the one the browser presented, if any, is ended.
        await destroySession(cookies);
        const mfaPending = result.account.totpEnabledAt !== null;
        await createSession(cookies, result.account.id, {
            ipAddress: locals.clientIp,
            userAgent: request.headers.get("user-agent") ?? undefined,
            mfaVerified: !mfaPending,
        });
        await audit({ action: "auth.login", account: result.account, ipAddress: locals.clientIp ?? null });
        const target = safeRedirectPath(redirectTo);
        redirect(303, mfaPending ? `/login/mfa?redirectTo=${encodeURIComponent(target)}` : target);
    },
};
