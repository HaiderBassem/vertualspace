/**
 * "Create an office" wizard: Name → Layout → Size, then a world with ready-made rooms linked by doors. Needs
 * world.create and room.manage in the chosen workspace (organization administrators, or its managers).
 */
import { error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import type { OrganizationAccess } from "$lib/server/auth/rbac";
import { componentChangeAllowed } from "$lib/server/catalog/install";
import { loadOrganization } from "$lib/server/context";
import { formValues } from "$lib/server/http/forms";
import { logJson } from "$lib/server/security/requestLog";
import { createOffice, officeProblem } from "$lib/server/services/office";
import { listWorkspaces } from "$lib/server/services/workspaces";
import { messagesFor, format } from "$lib/i18n";
import { OFFICE_LAYOUTS, type PlannedRoom } from "$lib/rooms/office";
import { ROOM_SIZE_PRESET_KEYS, type RoomSizePresetKey } from "$lib/rooms/size";

/** Workspaces where the person may create an office (a world and its rooms). */
async function officeWorkspaces(access: OrganizationAccess) {
    const workspaces = await listWorkspaces(access.organization.id);
    return workspaces.filter(
        (w) => access.can("world.create", { workspaceId: w.id }) && access.can("room.manage", { workspaceId: w.id }),
    );
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "organization.read");
    const workspaces = await officeWorkspaces(access);
    if (workspaces.length === 0) error(403, "Forbidden");
    const requested = url.searchParams.get("workspace");
    return {
        workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
        selectedWorkspace: workspaces.find((w) => w.id === requested)?.id ?? workspaces[0]!.id,
        problem: (await officeProblem(access.organization.id)) ?? null,
    };
};

const OfficeForm = z.object({
    workspaceId: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    layout: z.enum(OFFICE_LAYOUTS),
    size: z.enum(ROOM_SIZE_PRESET_KEYS as [RoomSizePresetKey, ...RoomSizePresetKey[]]),
});

export const actions: Actions = {
    default: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        // Authorization before validation: people who may not create offices learn nothing from the form.
        if (!access.canSomewhere("world.create") || !access.canSomewhere("room.manage")) error(403, "Forbidden");
        const values = formValues(await request.formData());
        const parsed = OfficeForm.safeParse(values);
        if (!parsed.success) {
            const nameIssue = parsed.error.issues.find((i) => i.path[0] === "name");
            return fail(400, {
                values,
                errors: nameIssue
                    ? { name: nameIssue.code === "too_big" ? ("tooLong" as const) : ("requiredField" as const) }
                    : {},
                message: "validation" as const,
            });
        }
        const workspace = (await officeWorkspaces(access)).find((w) => w.id === parsed.data.workspaceId);
        if (!workspace) error(403, "Forbidden");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { values, errors: {}, message: "rateLimited" as const });
        }

        const names = messagesFor(locals.locale).office.wizard.roomNames;
        const roomName = (room: PlannedRoom): string => {
            if (room.kind === "meeting") {
                return room.number === undefined
                    ? names.meetingSingle
                    : format(names.meeting, { n: room.number }, locals.locale);
            }
            if (room.kind === "focus") return format(names.focus, { n: room.number ?? 1 }, locals.locale);
            return names[room.kind];
        };
        let outcome: Awaited<ReturnType<typeof createOffice>>;
        try {
            outcome = await createOffice({
                organization: { id: access.organization.id, slug: access.organization.slug },
                workspaceId: workspace.id,
                name: parsed.data.name,
                layout: parsed.data.layout,
                size: parsed.data.size,
                actorId: account.id,
                roomName,
            });
        } catch (cause) {
            logJson("error", "office creation failed", {
                organizationId: access.organization.id,
                error: String(cause),
            });
            return fail(500, { values, errors: {}, message: "generic" as const });
        }
        if (outcome.result !== "created") return fail(409, { values, errors: {}, officeProblem: outcome.result });

        const { world, rooms } = outcome;
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
                via: "officeWizard",
                layout: parsed.data.layout,
                size: parsed.data.size,
            },
        });
        for (const room of rooms) {
            await audit({
                action: "room.create",
                account,
                organizationId: access.organization.id,
                worldId: world.id,
                targetType: "room",
                targetId: room.id,
                ipAddress: locals.clientIp ?? null,
                details: { slug: room.slug, template: room.template, via: "officeWizard" },
            });
        }
        redirect(303, `/o/${access.organization.slug}/w/${world.slug}/ready`);
    },
};
