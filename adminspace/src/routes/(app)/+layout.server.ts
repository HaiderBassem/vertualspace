import { and, eq, gt, isNull } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";
import { db, schema } from "$lib/server/db/client";
import { requireAccount } from "$lib/server/context";
import { organizationsOf } from "$lib/server/services/organizations";
import { roleHas } from "$lib/server/auth/rbac";

export const load: LayoutServerLoad = async ({ locals }) => {
    const account = requireAccount(locals);
    // The switcher lists the organizations the account belongs to (active memberships only). Platform
    // administrators hold no right elsewhere, except through an active support grant, listed apart.
    const [memberships, supportGrants] = await Promise.all([
        organizationsOf(account.id),
        account.isSuperadmin
            ? db()
                  .select({
                      slug: schema.organizations.slug,
                      name: schema.organizations.name,
                      expiresAt: schema.supportAccessGrants.expiresAt,
                  })
                  .from(schema.supportAccessGrants)
                  .innerJoin(
                      schema.organizations,
                      eq(schema.organizations.id, schema.supportAccessGrants.organizationId),
                  )
                  .where(
                      and(
                          eq(schema.supportAccessGrants.accountId, account.id),
                          isNull(schema.supportAccessGrants.endedAt),
                          gt(schema.supportAccessGrants.expiresAt, new Date()),
                      ),
                  )
            : Promise.resolve([]),
    ]);
    const active = memberships.filter((m) => m.status === "active");
    // "My worlds" lists the worlds the account administers: staff roles, or a workspace it manages.
    const administersWorlds =
        active.some((m) => roleHas(m.role, "world.read")) ||
        (active.length > 0 &&
            (
                await db()
                    .select({ role: schema.workspaceMemberships.role })
                    .from(schema.workspaceMemberships)
                    .where(
                        and(
                            eq(schema.workspaceMemberships.accountId, account.id),
                            eq(schema.workspaceMemberships.role, "manager"),
                        ),
                    )
                    .limit(1)
            ).length > 0);
    return {
        administersWorlds,
        organizations: memberships
            .filter((m) => m.status === "active")
            .map((m) => ({
                slug: m.slug,
                name: m.name,
                logoUrl: m.logoUrl,
                role: m.role,
                suspended: m.organizationStatus === "suspended",
            })),
        supportOrganizations: supportGrants.map((g) => ({ ...g, expiresAt: g.expiresAt.toISOString() })),
    };
};
