import type { PageServerLoad } from "./$types";
import { loadOrganization } from "$lib/server/context";
import { listAuditEntries } from "$lib/server/services/organizations";
import { getInstanceSettings } from "$lib/server/services/instance";
import { listOffices, listTeammates, organizationStats, setupChecklist } from "$lib/server/services/directory";
import { listOrganizationWorlds, worldState } from "$lib/server/services/worlds";
import { listWorkspaces } from "$lib/server/services/workspaces";
import { buildWorldUrl } from "$lib/server/workadventure/playUri";

/**
 * The organization's home. People who administer worlds (organization staff, workspace managers) get the
 * overview; employees get their workspace: offices they can enter, teammates, components.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access, account } = await loadOrganization(locals, params.org);
    const organization = access.organization;
    const { playUrl } = await getInstanceSettings();
    const playOrigin = playUrl ? new URL(playUrl).origin : undefined;
    const joined = url.searchParams.get("joined") === "1";

    if (!access.canSomewhere("world.read")) {
        const [offices, teammates] = await Promise.all([
            listOffices(organization.id, access.role, access.workspaceRoles),
            listTeammates(organization.id, { limit: 8, offset: 0 }),
        ]);
        return {
            view: "employee" as const,
            joined,
            email: account.email,
            offices: offices.map((office) => ({
                ...office,
                url: playOrigin ? buildWorldUrl(playOrigin, organization.slug, office.worldSlug) : null,
            })),
            teammates: teammates.people,
            teammateCount: teammates.total,
        };
    }

    const showArchived = url.searchParams.get("archived") === "1";
    const [stats, workspaces, worlds, activity] = await Promise.all([
        organizationStats(organization.id),
        listWorkspaces(organization.id, { includeArchived: true }),
        listOrganizationWorlds(organization.id, showArchived),
        access.can("audit.read")
            ? listAuditEntries({ organizationId: organization.id, limit: 8, offset: 0 })
            : Promise.resolve({ entries: [], total: 0 }),
    ]);
    const workspaceNames = new Map(workspaces.map((w) => [w.id, { name: w.name, slug: w.slug }]));
    const checklist = access.can("organization.update") ? await setupChecklist(organization, stats) : [];
    return {
        view: "overview" as const,
        joined,
        welcome: url.searchParams.get("welcome") === "1",
        showArchived,
        stats,
        checklist,
        worlds: worlds
            // Workspace managers see the worlds of their own workspaces only.
            .filter((world) => access.can("world.read", { workspaceId: world.workspaceId }))
            .map((world) => ({
                slug: world.slug,
                name: world.name,
                accessPolicy: world.accessPolicy,
                state: worldState(world),
                createdAt: world.createdAt.toISOString(),
                workspace: workspaceNames.get(world.workspaceId) ?? null,
                url: playOrigin ? buildWorldUrl(playOrigin, organization.slug, world.slug) : null,
            })),
        activity: activity.entries,
        canCreateWorld: access.canSomewhere("world.create"),
    };
};
