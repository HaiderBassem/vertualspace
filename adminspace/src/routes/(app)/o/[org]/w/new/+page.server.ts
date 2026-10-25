import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { formError, formValues, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import { createWorld, WorldTemplateError } from "$lib/server/services/worldAdmin";
import { mapExtensionOk } from "$lib/server/services/rooms";
import { mapOfAnotherOrganization } from "$lib/server/catalog/install";
import { listWorkspaces } from "$lib/server/services/workspaces";
import type { OrganizationAccess } from "$lib/server/auth/rbac";
import { ROOM_SLUG_PATTERN, SLUG_PATTERN } from "$lib/server/workadventure/playUri";
import { searchCatalog } from "$lib/server/catalog/store";
import { DEFAULT_WORLD_TEMPLATE } from "$lib/catalog/manifest";
import type { Locale } from "$lib/i18n";

async function availableTemplates(access: OrganizationAccess, accountId: string, locale: Locale) {
    const catalog = await searchCatalog(
        { organizationId: access.organization.id, accountId, locale, canManage: false },
        { kind: "room_template", limit: 100, offset: 0, sort: "name" },
    );
    return catalog.items;
}

/** Workspaces the person may create worlds in (all for organization administrators, their own for managers). */
async function creatableWorkspaces(access: OrganizationAccess) {
    const workspaces = await listWorkspaces(access.organization.id);
    return workspaces.filter((w) => access.can("world.create", { workspaceId: w.id }));
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { account, access } = await loadOrganization(locals, params.org, "organization.read");
    const workspaces = await creatableWorkspaces(access);
    if (workspaces.length === 0) error(403, "Forbidden");
    const requested = url.searchParams.get("workspace");
    const templates = await availableTemplates(access, account.id, locals.locale);
    return {
        workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
        selectedWorkspace: workspaces.find((w) => w.id === requested)?.id ?? workspaces[0]!.id,
        templates: templates.map(({ id, key, name, description, previewUrl }) => ({
            id,
            key,
            name,
            description,
            previewUrl,
        })),
        defaultTemplateId: templates.find((t) => t.key === DEFAULT_WORLD_TEMPLATE && !t.owned)?.id ?? templates[0]?.id,
    };
};

const CreateForm = z.object({
    workspaceId: z.string().uuid(),
    name: requiredText(200),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
    description: optionalText(2000),
    accessPolicy: z.enum(["public", "authenticated", "members"]),
    mapMode: z.enum(["template", "custom"]).optional(),
    templateId: z
        .string()
        .uuid()
        .optional()
        .or(z.literal("").transform(() => undefined)),
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

        const values = formValues(formData);
        // Older clients sending a first-room URL retain the custom-map workflow.
        const mapMode =
            parsed.data.mapMode ?? (values.roomName?.trim() || values.mapUrl?.trim() ? "custom" : "template");
        let firstRoom: { name: string; slug: string; mapKind: "wam" | "tmj"; url: string } | undefined;
        let firstRoomTemplate: { componentId: string; name: string; actorId: string } | undefined;
        if (mapMode === "template") {
            const templates = await availableTemplates(access, account.id, locals.locale);
            const template = parsed.data.templateId
                ? templates.find((t) => t.id === parsed.data.templateId)
                : (templates.find((t) => t.key === DEFAULT_WORLD_TEMPLATE && !t.owned) ?? templates[0]);
            if (!template) return formError(values, "validation", "templateId");
            firstRoomTemplate = { componentId: template.id, name: template.name, actorId: account.id };
        } else if (values.roomName?.trim() || values.mapUrl?.trim()) {
            const room = parseForm(formData, RoomForm);
            if (!room.ok) return room.failure;
            if (!mapExtensionOk(room.data.mapKind, room.data.mapUrl)) {
                return formError(values, "validation", "mapUrl");
            }
            if (
                room.data.mapKind === "wam" &&
                (await mapOfAnotherOrganization(access.organization.id, room.data.mapUrl))
            ) {
                return formError(values, "validation", "mapUrl");
            }
            firstRoom = {
                name: room.data.roomName,
                slug: room.data.roomSlug,
                mapKind: room.data.mapKind,
                url: room.data.mapUrl,
            };
        }

        let world;
        try {
            world = await createWorld({
                organizationId: access.organization.id,
                workspaceId: workspace.id,
                name: parsed.data.name,
                slug: parsed.data.slug,
                description: parsed.data.description ?? null,
                accessPolicy: parsed.data.accessPolicy,
                firstRoom,
                firstRoomTemplate,
                creator:
                    firstRoomTemplate || firstRoom?.mapKind === "wam"
                        ? { email: account.email, name: account.name }
                        : undefined,
            });
        } catch (error) {
            if (error instanceof WorldTemplateError) return formError(values, "generic", "templateId");
            throw error;
        }
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
                templateId: firstRoomTemplate?.componentId ?? null,
                creatorCanEdit: Boolean(firstRoomTemplate || firstRoom?.mapKind === "wam"),
            },
        });
        redirect(303, `/o/${access.organization.slug}/w/${world.slug}`);
    },
};
