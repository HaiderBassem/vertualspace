import { fail } from "@sveltejs/kit";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { LOCALES } from "$lib/i18n";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formError, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { findAccountByEmail } from "$lib/server/services/accounts";
import { createOrganization } from "$lib/server/services/organizations";
import { SLUG_PATTERN } from "$lib/server/workadventure/playUri";

function superadmin(locals: App.Locals) {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

export const load: PageServerLoad = async ({ locals }) => {
    superadmin(locals);
    const o = schema.organizations;
    const rows = await db()
        .select({
            id: o.id,
            slug: o.slug,
            name: o.name,
            countryCode: o.countryCode,
            defaultLocale: o.defaultLocale,
            createdAt: o.createdAt,
            status: o.status,
            worlds: sql<number>`(select count(*)::int from ${schema.worlds} w where w.organization_id = organizations.id)`,
            members: sql<number>`(select count(*)::int from ${schema.members} m join ${schema.worlds} w on w.id = m.world_id where w.organization_id = organizations.id and m.kind = 'member')`,
            admins: sql<number>`(select count(*)::int from ${schema.organizationMemberships} om where om.organization_id = organizations.id)`,
        })
        .from(o)
        .orderBy(asc(o.name));
    return {
        organizations: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        locales: LOCALES.map((l) => ({ tag: l.tag, nativeName: l.nativeName })),
    };
};

const CreateOrganization = z.object({
    name: requiredText(200),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
    countryCode: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^([A-Z]{2})?$/)
        .optional()
        .transform((v) => v || undefined),
    defaultLocale: z.enum(LOCALES.map((l) => l.tag) as [string, ...string[]]),
    ownerEmail: optionalText(320).pipe(z.string().email().optional()),
});

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = parseForm(await request.formData(), CreateOrganization);
        if (!parsed.ok) return parsed.failure;
        const { name, slug, countryCode, defaultLocale, ownerEmail } = parsed.data;
        const values = { name, slug, countryCode: countryCode ?? "", defaultLocale, ownerEmail: ownerEmail ?? "" };

        const owner = ownerEmail ? await findAccountByEmail(ownerEmail) : undefined;
        if (ownerEmail && !owner) return fail(400, { ownerNotFound: true, values, errors: {} });

        // Organization, first workspace and owner membership together: never half created.
        const created = await createOrganization(
            { name, slug, countryCode: countryCode ?? null, defaultLocale, contactEmail: null },
            owner?.id ?? null,
        );
        const organization = created === "slugTaken" ? undefined : created.organization;
        if (!organization) return formError(values, "slugTaken", "slug");
        await audit({
            action: "organization.create",
            account,
            organizationId: organization.id,
            targetType: "organization",
            targetId: organization.slug,
            ipAddress: locals.clientIp ?? null,
            details: { owner: owner?.email ?? null },
        });
        return { success: true };
    },

    delete: async ({ request, locals }) => {
        const account = superadmin(locals);
        const id = String((await request.formData()).get("id") ?? "");
        if (!z.string().uuid().safeParse(id).success) return fail(400, { message: "notFound" as const });
        const [organization] = await db()
            .delete(schema.organizations)
            .where(eq(schema.organizations.id, id))
            .returning();
        if (!organization) return fail(404, { message: "notFound" as const });
        // organizationId is not set: the organization no longer exists to reference.
        await audit({
            action: "organization.delete",
            account,
            targetType: "organization",
            targetId: organization.slug,
            ipAddress: locals.clientIp ?? null,
            details: { name: organization.name },
        });
        return { deleted: true };
    },
};
