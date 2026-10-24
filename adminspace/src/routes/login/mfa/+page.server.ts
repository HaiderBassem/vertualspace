import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { verifySecondFactor } from "$lib/server/auth/credentials";
import { destroySession, markSessionMfaVerified } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { safeRedirectPath } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";

const WINDOW_SECONDS = 15 * 60;
/** Attempts per pending session: a stolen password alone cannot try codes for long. */
const ATTEMPTS_PER_SESSION = 10;

export const load: PageServerLoad = ({ locals, url }) => {
    if (!locals.account || !locals.session) redirect(303, "/login");
    const redirectTo = safeRedirectPath(url.searchParams.get("redirectTo") ?? "/");
    if (!locals.account.totpEnabledAt || locals.session.mfaVerified) redirect(303, redirectTo);
    return { redirectTo };
};

export const actions: Actions = {
    default: async ({ request, locals, cookies }) => {
        const { account, session } = locals;
        if (!account || !session || !account.totpSecret) redirect(303, "/login");
        if (session.mfaVerified) redirect(303, "/");

        const [byIp, bySession] = await Promise.all([
            checkRateLimit(`mfa:ip:${locals.clientIp ?? "unknown"}`, config().RATE_LIMIT_MFA_PER_IP, WINDOW_SECONDS),
            checkRateLimit(`mfa:session:${session.id}`, ATTEMPTS_PER_SESSION, WINDOW_SECONDS),
        ]);
        if (!byIp.allowed || !bySession.allowed) {
            return fail(429, { rateLimited: true });
        }

        const form = await request.formData();
        const code = String(form.get("code") ?? "").slice(0, 64);
        const result = await verifySecondFactor(account, code);
        if (!result.ok) {
            await audit({
                action: result.reason === "locked" ? "auth.mfa_locked" : "auth.mfa_failed",
                account,
                ipAddress: locals.clientIp ?? null,
            });
            if (result.reason === "locked") {
                // The password step must be done again once the lock is over.
                await destroySession(cookies);
                return fail(400, { locked: true });
            }
            return fail(400, { invalid: true });
        }
        await markSessionMfaVerified(session.id);
        if (result.method === "recovery") {
            await audit({ action: "auth.recovery_code_used", account, ipAddress: locals.clientIp ?? null });
        }
        redirect(303, safeRedirectPath(form.get("redirectTo")));
    },
};
