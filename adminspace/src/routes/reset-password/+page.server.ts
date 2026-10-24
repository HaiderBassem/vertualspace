import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "$lib/server/auth/credentials";
import { config } from "$lib/server/config";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { isResetTokenValid, resetPassword } from "$lib/server/services/passwordReset";

export const load: PageServerLoad = async ({ url }) => ({
    valid: await isResetTokenValid(url.searchParams.get("token") ?? ""),
    passwordMinLength: PASSWORD_MIN_LENGTH,
    passwordMaxLength: PASSWORD_MAX_LENGTH,
});

const ResetForm = z.object({
    token: z.string().min(20).max(200),
    password: z.string().max(PASSWORD_MAX_LENGTH + 1),
    passwordConfirm: z.string().max(PASSWORD_MAX_LENGTH + 1),
});

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const limit = await checkRateLimit(
            `reset-use:ip:${locals.clientIp ?? "unknown"}`,
            config().RATE_LIMIT_LOGIN_PER_IP,
            900,
        );
        if (!limit.allowed) return fail(429, { rateLimited: true as const });
        const parsed = ResetForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { invalid: true as const });
        if (parsed.data.password !== parsed.data.passwordConfirm) return fail(400, { mismatch: true as const });
        const outcome = await resetPassword(parsed.data.token, parsed.data.password, locals.locale);
        if (outcome.result === "tooShort" || outcome.result === "tooLong") {
            return fail(400, { problem: outcome.result });
        }
        if (outcome.result === "invalid") return fail(400, { invalid: true as const });
        await audit({
            action: "account.password_reset",
            actorLabel: `account:${outcome.accountId}`,
            targetType: "account",
            targetId: outcome.accountId,
            ipAddress: locals.clientIp ?? null,
        });
        // Not logged in automatically (OWASP): the person logs in with the new password (and 2FA).
        return { done: true as const };
    },
};
