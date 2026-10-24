import { error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import type { OrganizationAccess, PermissionScope } from "$lib/server/auth/rbac";
import { loadOrganization } from "$lib/server/context";
import { formValues, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { listTeam } from "$lib/server/services/organizations";
import { listOrganizationWorlds, worldState } from "$lib/server/services/worlds";
import {
    archiveWorkspace,
    deleteWorkspace,
    findWorkspace,
    listWorkspacePeople,
    restoreWorkspace,
    setWorkspaceRole,
    updateWorkspace,
    type Workspace,
} from "$lib/server/services/workspaces";

/** The workspace of the URL, checked in its own scope; 404 for people who may not see it. */
async function loadWorkspace(
    access: OrganizationAccess,
    slug: string,
): Promise<{ workspace: Workspace; scope: PermissionScope }> {
    const workspace = await findWorkspace(access.organization.id, slug);
    if (!workspace) error(404, "Not found");
    const scope = { workspaceId: workspace.id };
    if (!access.can("workspace.read", scope)) error(404, "Not found");
    return { workspace, scope };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org);
    const { workspace, scope } = await loadWorkspace(access, params.workspace);
    // Who may enter a workspace's worlds is the organization's decision, never support access's.
    const canAssignMembers = access.can("workspace.update", scope) && !access.support;
    const canAssignManagers = access.can("team.manage");
    const [worlds, people, team] = await Promise.all([
        listOrganizationWorlds(access.organization.id, true),
        listWorkspacePeople(access.organization.id, workspace.id),
        canAssignMembers ? listTeam(access.organization.id, { status: "active", limit: 500, offset: 0 }) : null,
    ]);
    const assigned = new Set(people.map((p) => p.accountId));
    return {
        created: url.searchParams.get("created") === "1",
        workspace: {
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            description: workspace.description,
            archivedAt: workspace.archivedAt?.toISOString() ?? null,
        },
        worlds: worlds
            .filter((w) => w.workspaceId === workspace.id)
            .map((w) => ({
                slug: w.slug,
                name: w.name,
                accessPolicy: w.accessPolicy,
                state: worldState(w),
            })),
        people,
        candidates: (team?.members ?? [])
            .filter((m) => !assigned.has(m.accountId))
            .map((m) => ({ accountId: m.accountId, name: m.name, email: m.email })),
        permissions: {
            edit: access.can("workspace.update", scope),
            archive: access.can("workspace.archive"),
            createWorld: access.can("world.create", scope),
            resizeRooms: access.can("room.manage", scope),
            assignMembers: canAssignMembers,
            assignManagers: canAssignManagers,
        },
    };
};

const UpdateForm = z.object({ name: requiredText(200), description: optionalText(2000) });
const AssignForm = z.object({ accountId: z.string().uuid(), role: z.enum(["member", "manager"]) });
const UnassignForm = z.object({ accountId: z.string().uuid() });

export const actions: Actions = {
    update: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org);
        const { workspace, scope } = await loadWorkspace(access, params.workspace);
        if (!access.can("workspace.update", scope)) error(403, "Forbidden");
        const parsed = parseForm(await request.formData(), UpdateForm);
        if (!parsed.ok) return parsed.failure;
        await updateWorkspace(access.organization.id, workspace.id, {
            name: parsed.data.name,
            description: parsed.data.description ?? null,
        });
        await audit({
            action: "workspace.update",
            account,
            organizationId: access.organization.id,
            targetType: "workspace",
            targetId: workspace.id,
            ipAddress: locals.clientIp ?? null,
            details: { name: parsed.data.name },
        });
        return { success: true };
    },

    archive: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "workspace.archive");
        const { workspace } = await loadWorkspace(access, params.workspace);
        const outcome = await archiveWorkspace(access.organization.id, workspace.id);
        if (outcome.result === "lastActive") return fail(400, { workspaceError: "lastActive" as const });
        if (outcome.result !== "ok") return fail(404, { message: "notFound" as const });
        await audit({
            action: "workspace.archive",
            account,
            organizationId: access.organization.id,
            targetType: "workspace",
            targetId: workspace.id,
            ipAddress: locals.clientIp ?? null,
            details: { worlds: outcome.worlds },
        });
        return { archived: outcome.worlds };
    },

    restore: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "workspace.archive");
        const { workspace } = await loadWorkspace(access, params.workspace);
        const outcome = await restoreWorkspace(access.organization.id, workspace.id);
        if (outcome.result !== "ok") return fail(404, { message: "notFound" as const });
        await audit({
            action: "workspace.restore",
            account,
            organizationId: access.organization.id,
            targetType: "workspace",
            targetId: workspace.id,
            ipAddress: locals.clientIp ?? null,
            details: { worlds: outcome.worlds },
        });
        return { restored: outcome.worlds };
    },

    delete: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "workspace.archive");
        const { workspace } = await loadWorkspace(access, params.workspace);
        const result = await deleteWorkspace(access.organization.id, workspace.id);
        if (result === "notEmpty" || result === "lastWorkspace") return fail(400, { workspaceError: result });
        if (result !== "ok") return fail(404, { message: "notFound" as const });
        await audit({
            action: "workspace.delete",
            account,
            organizationId: access.organization.id,
            targetType: "workspace",
            targetId: workspace.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: workspace.slug, name: workspace.name },
        });
        redirect(303, `/o/${access.organization.slug}/workspaces`);
    },

    assign: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org);
        const { workspace, scope } = await loadWorkspace(access, params.workspace);
        const parsed = AssignForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        // Managers may add members to their workspace; only organization administrators appoint managers.
        const allowed =
            parsed.data.role === "manager" ? access.can("team.manage") : access.can("workspace.update", scope);
        if (!allowed || access.support) error(403, "Forbidden");
        const current = (await listWorkspacePeople(access.organization.id, workspace.id)).find(
            (p) => p.accountId === parsed.data.accountId,
        );
        if (current?.role === "manager" && !access.can("team.manage")) error(403, "Forbidden");
        const result = await setWorkspaceRole(
            access.organization.id,
            workspace.id,
            parsed.data.accountId,
            parsed.data.role,
            account.id,
        );
        if (result === "notMember") return fail(400, { workspaceError: "notMember" as const });
        if (result !== "ok") return fail(404, { message: "notFound" as const });
        await audit({
            action: "workspace.assign",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
            details: { workspaceId: workspace.id, role: parsed.data.role },
        });
        return { assigned: true as const };
    },

    unassign: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org);
        const { workspace, scope } = await loadWorkspace(access, params.workspace);
        const parsed = UnassignForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const current = (await listWorkspacePeople(access.organization.id, workspace.id)).find(
            (p) => p.accountId === parsed.data.accountId,
        );
        if (!current) return fail(404, { message: "notFound" as const });
        const allowed = current.role === "manager" ? access.can("team.manage") : access.can("workspace.update", scope);
        if (!allowed || access.support) error(403, "Forbidden");
        await setWorkspaceRole(access.organization.id, workspace.id, parsed.data.accountId, null, account.id);
        await audit({
            action: "workspace.unassign",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
            details: { workspaceId: workspace.id, role: current.role },
        });
        return { unassigned: true as const };
    },
};
