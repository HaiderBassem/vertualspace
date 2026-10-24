import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { checkPasswordPolicy, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "$lib/server/auth/credentials";
import { createSession } from "$lib/server/auth/session";
import { config } from "$lib/server/config";
import { fullyAuthenticated } from "$lib/server/context";
import { pseudonymize } from "$lib/server/crypto";
import { formValues } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { publicOrigin } from "$lib/server/services/mail";
import { registrationAvailability, startRegistration } from "$lib/server/services/registration";
import { SLUG_PATTERN } from "$lib/server/workadventure/playUri";

export const load: PageServerLoad = async ({ locals }) => {
    // People who already have an account create further organizations from their account.
    if (fullyAuthenticated(locals)) redirect(303, "/organizations");
    return {
        availability: await registrationAvailability(),
        passwordMinLength: PASSWORD_MIN_LENGTH,
        passwordMaxLength: PASSWORD_MAX_LENGTH,
    };
};

const RegisterForm = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    password: z.string().max(PASSWORD_MAX_LENGTH + 1),
    passwordConfirm: z.string().max(PASSWORD_MAX_LENGTH + 1),
    organizationName: z.string().trim().min(1).max(200),
    organizationSlug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
    /** Honeypot: hidden from people, filled by naive bots. */
    website: z.string().max(500).optional(),
});

type Field = "name" | "email" | "password" | "passwordConfirm" | "organizationName" | "organizationSlug";
type RegisterError = "invalid" | "tooShort" | "tooLong" | "mismatch" | "slugTaken";

export const actions: Actions = {
    default: async ({ request, locals, cookies, url }) => {
        if (fullyAuthenticated(locals)) redirect(303, "/organizations");
        const values = formValues(await request.formData());
        const kept = {
            name: values.name ?? "",
            email: values.email ?? "",
            organizationName: values.organizationName ?? "",
            organizationSlug: values.organizationSlug ?? "",
        };
        const availability = await registrationAvailability();
        if (availability === "closed" || availability === "needsMail") {
            return fail(403, { values: kept, unavailable: true as const });
        }

        const byIp = await checkRateLimit(
            `register:ip:${locals.clientIp ?? "unknown"}`,
            config().RATE_LIMIT_REGISTRATION_PER_IP,
            3600,
        );
        if (!byIp.allowed) return fail(429, { values: kept, rateLimited: true as const });

        const parsed = RegisterForm.safeParse(values);
        if (!parsed.success) {
            const field = String(parsed.error.issues[0]?.path[0] ?? "email") as Field;
            return fail(400, { values: kept, field, error: "invalid" as RegisterError });
        }
        const input = parsed.data;
        // A filled honeypot gets the normal "check your inbox" answer and nothing else.
        if (input.website) return { pending: true as const, email: input.email };

        const problem = checkPasswordPolicy(input.password);
        if (problem) return fail(400, { values: kept, field: "password" as Field, error: problem as RegisterError });
        if (input.password !== input.passwordConfirm) {
            return fail(400, { values: kept, field: "passwordConfirm" as Field, error: "mismatch" as RegisterError });
        }

        const subject = pseudonymize(input.email.toLowerCase(), "register");
        const byAddress = await checkRateLimit(`register:address:${subject}`, 3, 3600);
        if (!byAddress.allowed) return fail(429, { values: kept, rateLimited: true as const });

        const outcome = await startRegistration(
            {
                name: input.name,
                email: input.email,
                password: input.password,
                organizationName: input.organizationName,
                organizationSlug: input.organizationSlug,
                locale: locals.locale,
                ipAddress: locals.clientIp,
            },
            publicOrigin(url),
        );

        switch (outcome.result) {
            case "slugTaken":
                return fail(400, {
                    values: kept,
                    field: "organizationSlug" as Field,
                    error: "slugTaken" as RegisterError,
                });
            case "unavailable":
                return fail(403, { values: kept, unavailable: true as const });
            case "accountExists":
                return fail(400, { values: kept, accountExists: true as const });
            case "pending":
                // Never the raw address in the audit trail of an unverified request: a pseudonym.
                await audit({
                    action: "registration.request",
                    actorLabel: `registration:${subject.slice(0, 16)}`,
                    ipAddress: locals.clientIp ?? null,
                    details: { organizationSlug: input.organizationSlug },
                });
                return { pending: true as const, email: input.email };
            case "created": {
                // Instance without email verification: the person is logged in at once.
                await audit({
                    action: "registration.complete",
                    account: { id: outcome.accountId, email: input.email },
                    organizationId: outcome.organization.id,
                    targetType: "organization",
                    targetId: outcome.organization.id,
                    ipAddress: locals.clientIp ?? null,
                    details: { slug: outcome.organization.slug, verified: false },
                });
                await createSession(cookies, outcome.accountId, {
                    ipAddress: locals.clientIp,
                    userAgent: request.headers.get("user-agent") ?? undefined,
                    mfaVerified: true,
                });
                redirect(303, `/o/${outcome.organization.slug}/welcome`);
            }
        }
    },
};
