import path from "node:path";
import { fail } from "@sveltejs/kit";
import { asc, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formValues } from "$lib/server/http/forms";
import { importCatalogDirectory } from "$lib/server/catalog/builtin";
import { setComponentStatus } from "$lib/server/catalog/store";

function superadmin(locals: App.Locals) {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

/** Platform components (organization components are their owners' business, listed by count only). */
export const load: PageServerLoad = async ({ locals }) => {
    superadmin(locals);
    const [components, organizationOwned] = await Promise.all([
        db()
            .select({
                id: schema.components.id,
                key: schema.components.key,
                name: schema.components.name,
                kind: schema.components.kind,
                category: schema.components.category,
                status: schema.components.status,
                license: schema.components.license,
                installs: sql<number>`(select count(*)::int from ${schema.componentInstallations} i where i.component_id = ${schema.components.id})`,
            })
            .from(schema.components)
            .where(isNull(schema.components.organizationId))
            .orderBy(asc(schema.components.category), asc(schema.components.name)),
        db()
            .select({ value: sql<number>`count(*)::int` })
            .from(schema.components)
            .where(sql`${schema.components.organizationId} is not null`),
    ]);
    return { components, organizationOwned: organizationOwned[0]?.value ?? 0 };
};

const StatusForm = z.object({ id: z.string().uuid(), status: z.enum(["published", "deprecated"]) });

export const actions: Actions = {
    import: async ({ locals }) => {
        const account = superadmin(locals);
        const report = await importCatalogDirectory(path.resolve(process.cwd(), "catalog/builtin"));
        const failed = report.filter((r) => r.result !== "created" && r.result !== "unchanged");
        await audit({
            action: "catalog.import",
            account,
            targetType: "catalog",
            ipAddress: locals.clientIp ?? null,
            details: { created: report.filter((r) => r.result === "created").length, failed: failed.length },
        });
        return { imported: { ok: report.length - failed.length, failed: failed.length } };
    },

    status: async ({ request, locals }) => {
        const account = superadmin(locals);
        const parsed = StatusForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const ok = await setComponentStatus(parsed.data.id, null, parsed.data.status);
        if (!ok) return fail(404, { message: "notFound" as const });
        await audit({
            action: "component.status",
            account,
            targetType: "component",
            targetId: parsed.data.id,
            ipAddress: locals.clientIp ?? null,
            details: { status: parsed.data.status },
        });
        return { statusChanged: true as const };
    },
};
