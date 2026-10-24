import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { formError, formValues, optionalText, parseForm, requiredText } from "$lib/server/http/forms";
import {
    deleteWorld,
    isValidTimeZone,
    localDateTimeToUtc,
    setWorldArchived,
    updateWorldGeneral,
    utcToLocalDateTime,
} from "$lib/server/services/worldAdmin";
import { listWorkspaces, moveWorld } from "$lib/server/services/workspaces";

function zoneOf(locals: App.Locals): string {
    return isValidTimeZone(locals.timeZone) ? locals.timeZone : "UTC";
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world, organizationWide } = await loadWorld(locals, params.org, params.world, "world.update");
    const timeZone = zoneOf(locals);
    // Moving a world changes who administers it (the managers of its workspace): organization-wide only.
    const canMove = organizationWide.can("workspace.update");
    return {
        timeZone,
        expiresAtLocal: world.expiresAt ? utcToLocalDateTime(world.expiresAt, timeZone) : "",
        workspaceId: world.workspaceId,
        workspaces: canMove
            ? (await listWorkspaces(organizationWide.organization.id)).map((w) => ({ id: w.id, name: w.name }))
            : [],
    };
};

const MoveForm = z.object({ workspaceId: z.string().uuid() });

const GeneralForm = z.object({
    name: requiredText(200),
    description: optionalText(2000),
    accessPolicy: z.enum(["public", "authenticated", "members"]),
    maxUsers: z.coerce.number().int().min(0).max(1_000_000),
    expiresAt: z
        .string()
        .trim()
        .optional()
        .transform((v) => v || undefined),
});

export const actions: Actions = {
    update: async ({ request, locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        const formData = await request.formData();
        const parsed = parseForm(formData, GeneralForm);
        if (!parsed.ok) return parsed.failure;
        let expiresAt: Date | null = null;
        if (parsed.data.expiresAt) {
            expiresAt = localDateTimeToUtc(parsed.data.expiresAt, zoneOf(locals)) ?? null;
            if (!expiresAt) return formError(formValues(formData), "validation", "expiresAt");
        }
        const fields = {
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            accessPolicy: parsed.data.accessPolicy,
            maxUsers: parsed.data.maxUsers,
            expiresAt,
        };
        await updateWorldGeneral(world.id, fields);
        await audit({
            action: "world.update",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: { ...fields, expiresAt: expiresAt?.toISOString() ?? null },
        });
        return { success: true };
    },
    move: async ({ request, locals, params }) => {
        const { account, organizationWide, world } = await loadWorld(locals, params.org, params.world, "world.update");
        if (!organizationWide.can("workspace.update")) error(403, "Forbidden");
        const parsed = MoveForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return { message: "validation" as const };
        if (parsed.data.workspaceId === world.workspaceId) return { moved: true };
        // The target is looked up in this organization only: a workspace id of another one is not found.
        const result = await moveWorld(organizationWide.organization.id, world.id, parsed.data.workspaceId);
        if (result === "notFound") return { message: "validation" as const };
        await audit({
            action: "world.move",
            account,
            organizationId: organizationWide.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: { from: world.workspaceId, to: parsed.data.workspaceId },
        });
        return { moved: true };
    },
    archive: async ({ locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        await setWorldArchived(world.id, true);
        await audit({
            action: "world.archive",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { archived: true };
    },
    restore: async ({ locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.update");
        await setWorldArchived(world.id, false);
        await audit({
            action: "world.restore",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { restored: true };
    },
    delete: async ({ locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "world.delete");
        // Logged first: the world reference is nulled once it is deleted, the details keep its slug.
        await audit({
            action: "world.delete",
            account,
            organizationId: access.organization.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: world.slug, name: world.name },
        });
        await deleteWorld(world.id);
        redirect(303, `/o/${access.organization.slug}`);
    },
};
