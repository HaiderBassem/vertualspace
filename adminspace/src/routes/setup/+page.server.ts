import { error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { createFirstSuperadmin, setupAvailability, setupTokenMatches } from "$lib/server/auth/bootstrap";
import { checkPasswordPolicy, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "$lib/server/auth/credentials";
import { createSession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { hasAnyAccount } from "$lib/server/services/accounts";

export const load: PageServerLoad = async () => {
    if (await hasAnyAccount()) redirect(303, "/login");
    return {
        availability: setupAvailability(),
        passwordMinLength: PASSWORD_MIN_LENGTH,
        passwordMaxLength: PASSWORD_MAX_LENGTH,
    };
};

const SetupForm = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    password: z.string().max(PASSWORD_MAX_LENGTH + 1),
    passwordConfirm: z.string().max(PASSWORD_MAX_LENGTH + 1),
    setupToken: z.string().max(512).optional(),
});

export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        // Only the very first account can be created here, and only when web setup is allowed.
        if (await hasAnyAccount()) redirect(303, "/login");
        const availability = setupAvailability();
        if (availability === "disabled") error(403, "Web setup is disabled");

        const limit = await checkRateLimit(
            `setup:ip:${locals.clientIp ?? "unknown"}`,
            config().RATE_LIMIT_SETUP_PER_IP,
            3600,
        );
        if (!limit.allowed) return fail(429, { values: { name: "", email: "" }, field: "_form", rateLimited: true });

        const values = formValues(await request.formData());
        const parsed = SetupForm.safeParse(values);
        if (!parsed.success) {
            const field = String(parsed.error.issues[0]?.path[0] ?? "email");
            return fail(400, { values: { name: values.name ?? "", email: values.email ?? "" }, field });
        }
        const { name, email, password, passwordConfirm, setupToken } = parsed.data;
        if (availability === "token" && !setupTokenMatches(setupToken ?? "")) {
            return fail(400, { values: { name, email }, field: "setupToken" });
        }
        const problem = checkPasswordPolicy(password);
        if (problem) {
            return fail(400, { values: { name, email }, field: "password", problem });
        }
        if (password !== passwordConfirm) {
            return fail(400, { values: { name, email }, field: "passwordConfirm" });
        }
        const account = await createFirstSuperadmin({ name, email, password, locale: locals.locale });
        if (!account) redirect(303, "/login");
        await audit({
            action: "account.create",
            account,
            targetType: "account",
            targetId: account.id,
            ipAddress: locals.clientIp ?? null,
            details: { superadmin: true, via: "setup" },
        });
        await createSession(cookies, account.id, {
            ipAddress: locals.clientIp,
            userAgent: request.headers.get("user-agent") ?? undefined,
            mfaVerified: true,
        });
        redirect(303, "/organizations");
    },
};
