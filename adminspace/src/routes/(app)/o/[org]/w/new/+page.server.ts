import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { formError, formValues, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { createWorld } from "$lib/server/services/worldAdmin";
import { listWorkspaces } from "$lib/server/services/workspaces";
import type { OrganizationAccess } from "$lib/server/auth/rbac";
import { ROOM_SLUG_PATTERN, SLUG_PATTERN } from "$lib/server/workadventure/playUri";

/** Workspaces the person may create worlds in (all for organization administrators, their own for managers). */
async function creatableWorkspaces(access: OrganizationAccess) {
    const workspaces = await listWorkspaces(access.organization.id);
    return workspaces.filter((w) => access.can("world.create", { workspaceId: w.id }));
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "organization.read");
    const workspaces = await creatableWorkspaces(access);
    if (workspaces.length === 0) error(403, "Forbidden");
    const requested = url.searchParams.get("workspace");
    return {
        workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
        selectedWorkspace: workspaces.find((w) => w.id === requested)?.id ?? workspaces[0]!.id,
    };
};

const CreateForm = z.object({
    workspaceId: z.string().uuid(),
    name: requiredText(200),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
    description: optionalText(2000),
    accessPolicy: z.enum(["public", "authenticated", "members"]),
});

const RoomForm = z.object({
    roomName: requiredText(200),
    roomSlug: z.string().trim().toLowerCase().regex(ROOM_SLUG_PATTERN),
    mapKind: z.enum(["wam", "tmj"]),
    mapUrl: z.string().trim().url().max(2048),
});

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        // Authorization before validation: people who may not create worlds learn nothing from the form.
        if (!access.canSomewhere("world.create")) error(403, "Forbidden");
        const formData = await request.formData();
        const parsed = parseForm(formData, CreateForm);
        if (!parsed.ok) return parsed.failure;
        // Authorized in the chosen workspace: managers create worlds in their own workspaces only.
        const workspace = (await creatableWorkspaces(access)).find((w) => w.id === parsed.data.workspaceId);
        if (!workspace) error(403, "Forbidden");

        // The first room is optional: only validated when a room name or a map URL is given.
        const values = formValues(formData);
        let firstRoom: { name: string; slug: string; mapKind: "wam" | "tmj"; url: string } | undefined;
        if (values.roomName?.trim() || values.mapUrl?.trim()) {
            const room = parseForm(formData, RoomForm);
            if (!room.ok) return room.failure;
            firstRoom = {
                name: room.data.roomName,
                slug: room.data.roomSlug,
                mapKind: room.data.mapKind,
                url: room.data.mapUrl,
            };
        }

        const world = await createWorld({
            organizationId: access.organization.id,
            workspaceId: workspace.id,
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description ?? null,
            accessPolicy: parsed.data.accessPolicy,
            firstRoom,
        });
        if (world === "slugTaken") return formError(values, "slugTaken", "slug");

        await audit({
            action: "world.create",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: {
                slug: world.slug,
                accessPolicy: world.accessPolicy,
                workspaceId: workspace.id,
                firstRoom: firstRoom?.slug ?? null,
            },
        });
        redirect(303, `/o/${access.organization.slug}/w/${world.slug}`);
    },
};
