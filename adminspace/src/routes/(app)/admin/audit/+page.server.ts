import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { escapeLike } from "$lib/server/services/members";

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals, url }) => {
    requireSuperadmin(requireAccount(locals));
    const action = url.searchParams.get("action")?.trim() ?? "";
    const actor = url.searchParams.get("actor")?.trim() ?? "";
    const organization = url.searchParams.get("organization") ?? "";
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

    const log = schema.auditLogs;
    const conditions: SQL[] = [];
    if (action) conditions.push(ilike(log.action, `${escapeLike(action)}%`));
    if (actor) conditions.push(ilike(log.actorLabel, `%${escapeLike(actor)}%`));
    if (UUID.test(organization)) conditions.push(eq(log.organizationId, organization));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, total, organizations] = await Promise.all([
        db()
            .select({ entry: log, organizationName: schema.organizations.name })
            .from(log)
            .leftJoin(schema.organizations, eq(schema.organizations.id, log.organizationId))
            .where(where)
            .orderBy(desc(log.occurredAt))
            .limit(PAGE_SIZE)
            .offset((page - 1) * PAGE_SIZE),
        db().select({ value: count() }).from(log).where(where),
        db()
            .select({ id: schema.organizations.id, name: schema.organizations.name })
            .from(schema.organizations)
            .orderBy(asc(schema.organizations.name)),
    ]);

    return {
        filters: { action, actor, organization },
        page,
        pageSize: PAGE_SIZE,
        total: total[0]?.value ?? 0,
        organizations,
        entries: rows.map(({ entry, organizationName }) => ({
            id: entry.id,
            occurredAt: entry.occurredAt.toISOString(),
            actor: entry.actorLabel,
            action: entry.action,
            target: entry.targetType ? `${entry.targetType}${entry.targetId ? `: ${entry.targetId}` : ""}` : "",
            organizationName,
            ipAddress: entry.ipAddress,
            details: entry.details ? JSON.stringify(entry.details, null, 2) : null,
        })),
    };
};
