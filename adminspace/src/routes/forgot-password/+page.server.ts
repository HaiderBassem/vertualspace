import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { config } from "$lib/server/config";
import { fullyAuthenticated } from "$lib/server/context";
import { pseudonymize } from "$lib/server/crypto";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { publicOrigin } from "$lib/server/services/mail";
import { passwordResetAvailable, requestPasswordReset } from "$lib/server/services/passwordReset";

export const load: PageServerLoad = ({ locals }) => {
    if (fullyAuthenticated(locals)) redirect(303, "/account");
    return { available: passwordResetAvailable() };
};

const RequestForm = z.object({ email: z.string().trim().email().max(320) });

export const actions: Actions = {
    default: async ({ request, locals, url }) => {
        if (!passwordResetAvailable()) return fail(503, { unavailable: true as const });
        const values = formValues(await request.formData());
        const parsed = RequestForm.safeParse(values);
        if (!parsed.success) return fail(400, { email: values.email ?? "", invalid: true as const });

        const byIp = await checkRateLimit(
            `reset:ip:${locals.clientIp ?? "unknown"}`,
            config().RATE_LIMIT_PASSWORD_RESET_PER_IP,
            3600,
        );
        if (!byIp.allowed) return fail(429, { email: parsed.data.email, rateLimited: true as const });
        const subject = pseudonymize(parsed.data.email.toLowerCase(), "reset");
        const byAddress = await checkRateLimit(`reset:address:${subject}`, 3, 3600);
        const origin = publicOrigin(url);
        // Over the per-address limit, or without a link origin, the answer is the same: nothing is sent.
        if (byAddress.allowed && origin) {
            requestPasswordReset({
                email: parsed.data.email,
                origin,
                locale: locals.locale,
                ipAddress: locals.clientIp,
            });
        }
        return { sent: true as const };
    },
};
