import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { createSession, destroySession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { completeRegistration, findPendingSignup } from "$lib/server/services/registration";
import { SLUG_PATTERN } from "$lib/server/workadventure/playUri";

/**
 * GET shows what will be created and changes nothing: mail scanners and link previews open links.
 * The organization is created by the POST of the confirmation button.
 */
export const load: PageServerLoad = async ({ url }) => {
    const token = url.searchParams.get("token") ?? "";
    const pending = await findPendingSignup(token);
    return {
        pending: pending
            ? {
                  email: pending.email,
                  name: pending.name,
                  organizationName: pending.organizationName,
                  organizationSlug: pending.organizationSlug,
              }
            : null,
    };
};

const ConfirmForm = z.object({
    token: z.string().min(20).max(200),
    organizationSlug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(SLUG_PATTERN)
        .optional()
        .or(z.literal("").transform(() => undefined)),
});

export const actions: Actions = {
    default: async ({ request, locals, cookies }) => {
        const limit = await checkRateLimit(
            `register-verify:ip:${locals.clientIp ?? "unknown"}`,
            config().RATE_LIMIT_LOGIN_PER_IP,
            900,
        );
        if (!limit.allowed) return fail(429, { rateLimited: true as const });
        const parsed = ConfirmForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { invalid: true as const });

        const outcome = await completeRegistration(parsed.data.token, parsed.data.organizationSlug);
        if (outcome.result === "invalid") return fail(400, { invalid: true as const });
        if (outcome.result === "accountExists") return fail(400, { accountExists: true as const });
        if (outcome.result === "slugTaken") {
            return fail(400, { slugTaken: true as const, organizationSlug: parsed.data.organizationSlug ?? "" });
        }

        const { accountId, organization } = outcome;
        await audit({
            action: "registration.complete",
            account: { id: accountId, email: organization.contactEmail ?? "" },
            organizationId: organization.id,
            targetType: "organization",
            targetId: organization.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: organization.slug, verified: true },
        });
        // A new session for the new account; whatever session the browser presented ends.
        await destroySession(cookies);
        await createSession(cookies, accountId, {
            ipAddress: locals.clientIp,
            userAgent: request.headers.get("user-agent") ?? undefined,
            mfaVerified: true,
        });
        redirect(303, `/o/${organization.slug}/welcome`);
    },
};
