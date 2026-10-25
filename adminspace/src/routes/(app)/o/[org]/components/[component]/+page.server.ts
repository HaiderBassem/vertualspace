import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import type { OrganizationAccess, Permission } from "$lib/server/auth/rbac";
import { loadOrganization } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formValues, isUuid } from "$lib/server/http/forms";
import { getComponentDetail, setFavorite } from "$lib/server/catalog/store";
import {
    componentChangeAllowed,
    createRoomFromTemplate,
    installationsOf,
    installComponent,
    uninstallComponent,
} from "$lib/server/catalog/install";
import { listOrganizationWorlds, worldState } from "$lib/server/services/worlds";
import { ROOM_SLUG_PATTERN } from "$lib/server/workadventure/playUri";
import { MAX_ROOM_TILES, MIN_ROOM_TILES, ROOM_SIZE_PRESET_KEYS, presetSize } from "$lib/rooms/size";
import { isHostedTemplateMap } from "$lib/catalog/manifest";

/** A world of the organization, with the permission checked in its workspace (404 / 403 otherwise). */
async function worldFor(access: OrganizationAccess, worldId: string, permission: Permission) {
    if (!isUuid(worldId)) error(404, "Not found");
    const world = await db().query.worlds.findFirst({
        where: and(eq(schema.worlds.id, worldId), eq(schema.worlds.organizationId, access.organization.id)),
    });
    if (!world) error(404, "Not found");
    if (!access.can(permission, { workspaceId: world.workspaceId })) error(403, "Forbidden");
    return world;
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access, account } = await loadOrganization(locals, params.org, "component.read");
    if (!isUuid(params.component)) error(404, "Not found");
    const viewer = {
        organizationId: access.organization.id,
        accountId: account.id,
        locale: locals.locale,
        canManage: access.can("component.manage"),
    };
    const detail = await getComponentDetail(viewer, params.component);
    if (!detail) error(404, "Not found");
    const [worlds, installations] = await Promise.all([
        listOrganizationWorlds(access.organization.id),
        installationsOf(access.organization.id, detail.component.id),
    ]);
    const installedVersion = new Map(installations.map((i) => [i.worldId, i.version]));
    const permission: Permission = detail.component.kind === "entity" ? "component.install" : "room.manage";
    const manifest = detail.manifest;
    const translation = manifest.translations?.[locals.locale];
    return {
        component: {
            id: detail.component.id,
            key: detail.component.key,
            kind: detail.component.kind,
            status: detail.component.status,
            name: translation?.name ?? manifest.name,
            description: translation?.description ?? manifest.description ?? null,
            category: manifest.category,
            tags: manifest.tags,
            license: manifest.license,
            attribution: manifest.attribution ?? null,
            provenance: manifest.provenance,
            publisher: detail.component.publisher,
            owned: detail.owned,
            favorite: detail.favorite,
            compatibility: manifest.compatibility,
            template: manifest.template
                ? {
                      width: manifest.template.width,
                      height: manifest.template.height,
                      requires: manifest.template.requires,
                      hostedBase: isHostedTemplateMap(manifest.template.map),
                  }
                : null,
        },
        version: detail.version.version,
        versions: detail.versions,
        previewUrl: detail.previewUrl,
        variants: detail.variants,
        worlds: worlds
            .filter((w) => worldState(w) === "open" && access.can(permission, { workspaceId: w.workspaceId }))
            .map((w) => ({
                id: w.id,
                slug: w.slug,
                name: w.name,
                installedVersion: installedVersion.get(w.id) ?? null,
            })),
    };
};

const WorldForm = z.object({ worldId: z.string().uuid() });
const tiles = z.coerce.number().int().min(MIN_ROOM_TILES).max(MAX_ROOM_TILES);
const RoomForm = WorldForm.extend({
    name: z.string().trim().min(1).max(200),
    slug: z.string().trim().toLowerCase().regex(ROOM_SLUG_PATTERN),
    /** The template's own size, a team-size preset, or a custom width × height (resized after the upload). */
    sizeChoice: z.enum(["template", "custom", ...ROOM_SIZE_PRESET_KEYS] as [string, ...string[]]).default("template"),
    width: tiles.optional(),
    height: tiles.optional(),
}).superRefine((value, ctx) => {
    if (value.sizeChoice === "custom" && (value.width === undefined || value.height === undefined)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["width"] });
    }
});

/** The size a room from a template is created at, or undefined for the template's own size. */
function chosenSize(form: z.infer<typeof RoomForm>): { width: number; height: number } | undefined {
    if (form.sizeChoice === "template") return undefined;
    if (form.sizeChoice === "custom") return { width: form.width!, height: form.height! };
    return presetSize(form.sizeChoice as (typeof ROOM_SIZE_PRESET_KEYS)[number]);
}

export const actions: Actions = {
    install: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "component.read");
        const parsed = WorldForm.safeParse(formValues(await request.formData()));
        if (!parsed.success || !isUuid(params.component)) return fail(400, { message: "validation" as const });
        const world = await worldFor(access, parsed.data.worldId, "component.install");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { message: "rateLimited" as const });
        }
        const outcome = await installComponent({ world, componentId: params.component, actorId: account.id });
        if (outcome.result === "installed" || outcome.result === "updated") {
            await audit({
                action: outcome.result === "installed" ? "component.install" : "component.update",
                account,
                organizationId: access.organization.id,
                worldId: world.id,
                targetType: "component",
                targetId: params.component,
                ipAddress: locals.clientIp ?? null,
                details: { linkedRooms: outcome.linkedRooms },
            });
        }
        if (outcome.result === "installed" || outcome.result === "updated" || outcome.result === "unchanged") {
            return { installResult: outcome.result, worldSlug: world.slug };
        }
        return fail(400, { installError: outcome.result });
    },

    uninstall: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "component.read");
        const parsed = WorldForm.safeParse(formValues(await request.formData()));
        if (!parsed.success || !isUuid(params.component)) return fail(400, { message: "validation" as const });
        const world = await worldFor(access, parsed.data.worldId, "component.install");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { message: "rateLimited" as const });
        }
        const outcome = await uninstallComponent(world, params.component);
        if (outcome.result === "removed") {
            await audit({
                action: "component.uninstall",
                account,
                organizationId: access.organization.id,
                worldId: world.id,
                targetType: "component",
                targetId: params.component,
                ipAddress: locals.clientIp ?? null,
            });
            return { removed: true as const };
        }
        if (outcome.result === "inUse") {
            return fail(409, {
                uninstallError: "inUse" as const,
                rooms: outcome.rooms.map((r) => `${r.name} (${r.count})`),
            });
        }
        if (outcome.result === "cannotVerify") {
            return fail(409, { uninstallError: "cannotVerify" as const, rooms: outcome.rooms });
        }
        return fail(404, { uninstallError: "notInstalled" as const, rooms: [] as string[] });
    },

    createRoom: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "component.read");
        const values = formValues(await request.formData());
        const parsed = RoomForm.safeParse(values);
        if (!parsed.success || !isUuid(params.component))
            return fail(400, { templateError: "validation" as const, values });
        const world = await worldFor(access, parsed.data.worldId, "room.manage");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { message: "rateLimited" as const });
        }
        const outcome = await createRoomFromTemplate({
            world,
            componentId: params.component,
            name: parsed.data.name,
            slug: parsed.data.slug,
            actorId: account.id,
            size: chosenSize(parsed.data),
        });
        if (outcome.result === "dependencyMissing") {
            return fail(400, { templateError: "dependencyMissing" as const, keys: outcome.keys, values });
        }
        if (outcome.result !== "created") return fail(400, { templateError: outcome.result, values });
        await audit({
            action: "room.create",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: outcome.roomId,
            ipAddress: locals.clientIp ?? null,
            details: {
                slug: outcome.roomSlug,
                template: params.component,
                size: chosenSize(parsed.data) ?? null,
            },
        });
        redirect(303, `/o/${access.organization.slug}/w/${world.slug}/components?created=${outcome.roomId}`);
    },

    favorite: async ({ request, locals, params }) => {
        const { access, account } = await loadOrganization(locals, params.org, "component.read");
        const favorite = formValues(await request.formData()).favorite === "true";
        if (!isUuid(params.component)) return fail(404, { message: "notFound" as const });
        await setFavorite(
            { organizationId: access.organization.id, accountId: account.id },
            params.component,
            favorite,
        );
        return { favorited: favorite };
    },
};
