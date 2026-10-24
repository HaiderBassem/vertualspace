import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { formError, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { createWorkspace, listWorkspaces } from "$lib/server/services/workspaces";
import { SLUG_PATTERN } from "$lib/server/workadventure/playUri";

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org);
    if (!access.canSomewhere("workspace.read")) error(403, "Forbidden");
    const organizationWide = access.can("workspace.read");
    const showArchived = organizationWide && url.searchParams.get("archived") === "1";
    const workspaces = await listWorkspaces(access.organization.id, {
        includeArchived: showArchived,
        // Workspace managers see their own workspaces only.
        onlyIds: organizationWide ? undefined : [...access.workspaceRoles.keys()],
    });
    return {
        showArchived,
        canSeeArchived: organizationWide,
        workspaces: workspaces.map((w) => ({
            id: w.id,
            slug: w.slug,
            name: w.name,
            description: w.description,
            archivedAt: w.archivedAt?.toISOString() ?? null,
            worldCount: w.worldCount,
            memberCount: w.memberCount,
            myRole: access.workspaceRoles.get(w.id) ?? null,
        })),
    };
};

const CreateForm = z.object({
    name: requiredText(200),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
    description: optionalText(2000),
});

export const actions: Actions = {
    create: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "workspace.create");
        const formData = await request.formData();
        const parsed = parseForm(formData, CreateForm);
        if (!parsed.ok) return parsed.failure;
        const workspace = await createWorkspace(access.organization.id, {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description ?? null,
        });
        if (workspace === "slugTaken") {
            return formError({ name: parsed.data.name, slug: parsed.data.slug }, "slugTaken", "slug");
        }
        await audit({
            action: "workspace.create",
            account,
            organizationId: access.organization.id,
            targetType: "workspace",
            targetId: workspace.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: workspace.slug, name: workspace.name },
        });
        redirect(303, `/o/${access.organization.slug}/workspaces/${workspace.slug}?created=1`);
    },
};
