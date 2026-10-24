import { error, redirect } from "@sveltejs/kit";
import { count, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { DEFAULT_LOCALE, isLocale } from "$lib/i18n";
import { countryOptions } from "$lib/i18n/format";
import { audit } from "$lib/server/audit";
import type { Account } from "$lib/server/auth/session";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formError, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { getInstanceSettings } from "$lib/server/services/instance";
import { createOrganization, organizationsOf } from "$lib/server/services/organizations";
import { SLUG_PATTERN } from "$lib/server/workadventure/playUri";

async function canCreate(account: Account): Promise<boolean> {
    if (account.isSuperadmin) return true;
    return (await getInstanceSettings()).selfServiceOrganizations === true;
}

export const load: PageServerLoad = async ({ locals }) => {
    const account = requireAccount(locals);
    // Only the account's own organizations: platform administrators see every organization in
    // Platform > Organizations, and hold no right in one they are not a member of.
    const organizations = await organizationsOf(account.id);
    const ids = organizations.map((o) => o.id);
    const worldCounts =
        ids.length > 0
            ? await db()
                  .select({ organizationId: schema.worlds.organizationId, value: count() })
                  .from(schema.worlds)
                  .where(inArray(schema.worlds.organizationId, ids))
                  .groupBy(schema.worlds.organizationId)
            : [];
    const counts = new Map(worldCounts.map((r) => [r.organizationId, r.value]));

    return {
        organizations: organizations.map(({ id, ...rest }) => ({ ...rest, worldCount: counts.get(id) ?? 0 })),
        canCreate: await canCreate(account),
        countries: countryOptions(locals.locale),
    };
};

const CreateForm = z.object({
    name: requiredText(200),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
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
    create: async ({ request, locals }) => {
        const account = requireAccount(locals);
        if (!(await canCreate(account))) error(403, "Forbidden");
        const parsed = parseForm(await request.formData(), CreateForm);
        if (!parsed.ok) return parsed.failure;
        const input = parsed.data;
        const created = await createOrganization(
            {
                name: input.name,
                slug: input.slug,
                countryCode: input.countryCode,
                defaultLocale: isLocale(input.defaultLocale) ? input.defaultLocale : DEFAULT_LOCALE,
                contactEmail: input.contactEmail ?? null,
            },
            account.id,
        );
        if (created === "slugTaken") {
            return formError({ name: input.name, slug: input.slug }, "slugTaken", "slug");
        }
        const { organization } = created;
        await audit({
            action: "organization.create",
            account,
            organizationId: organization.id,
            targetType: "organization",
            targetId: organization.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: organization.slug, name: organization.name },
        });
        redirect(303, `/o/${organization.slug}`);
    },
};
