import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { DEFAULT_LOCALE, isLocale } from "$lib/i18n";
import { countryOptions } from "$lib/i18n/format";
import { audit } from "$lib/server/audit";
import { verifyPassword } from "$lib/server/auth/credentials";
import { loadOrganization } from "$lib/server/context";
import { config } from "$lib/server/config";
import { pseudonymize } from "$lib/server/crypto";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { deleteOrganization, updateOrganization } from "$lib/server/services/organizations";

export const load: PageServerLoad = async ({ locals, params }) => {
    await loadOrganization(locals, params.org, "organization.update");
    return { countries: countryOptions(locals.locale) };
};

const UpdateForm = z.object({
    name: requiredText(200),
    countryCode: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^([A-Z]{2})?$/)
        .transform((v) => v || null),
    defaultLocale: z.string().refine((v) => isLocale(v)),
    contactEmail: optionalText(320).pipe(z.string().email().optional()),
});

export const actions: Actions = {
    update: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.update");
        const parsed = parseForm(await request.formData(), UpdateForm);
        if (!parsed.ok) return parsed.failure;
        const input = parsed.data;
        const fields = {
            name: input.name,
            countryCode: input.countryCode,
            defaultLocale: isLocale(input.defaultLocale) ? input.defaultLocale : DEFAULT_LOCALE,
            contactEmail: input.contactEmail ?? null,
        };
        await updateOrganization(access.organization.id, fields);
        await audit({
            action: "organization.update",
            account,
            organizationId: access.organization.id,
            targetType: "organization",
            targetId: access.organization.id,
            ipAddress: locals.clientIp ?? null,
            details: fields,
        });
        return { success: true };
    },
    delete: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.delete");
        // Irreversible: the owner's password is asked again (a session alone cannot delete the organization).
        const limit = await checkRateLimit(
            `sensitive:account:${pseudonymize(account.id, "sensitive")}`,
            config().RATE_LIMIT_SENSITIVE_PER_ACCOUNT,
            900,
        );
        if (!limit.allowed) return fail(429, { message: "rateLimited" as const });
        const password = String((await request.formData()).get("password") ?? "");
        if (!password || !(await verifyPassword(account.passwordHash, password))) {
            return fail(400, { message: "wrongPassword" as const });
        }
        // Logged before the deletion: the entry keeps the slug once the organization is gone.
        await audit({
            action: "organization.delete",
            account,
            targetType: "organization",
            targetId: access.organization.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: access.organization.slug, name: access.organization.name },
        });
        await deleteOrganization(access.organization.id);
        redirect(303, "/organizations");
    },
};
