import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { linkNewRoom, mapOfAnotherOrganization } from "$lib/server/catalog/install";
import { loadWorld } from "$lib/server/context";
import { formError, formValues, parseForm } from "$lib/server/http/forms";
import { worldTagNames } from "$lib/server/services/members";
import { checkMapReachable, getRoom, listMapStorageMaps, mapExtensionOk, updateRoom } from "$lib/server/services/rooms";
import { currentRoomSize, resizeRoom, ResizeOptionsSchema } from "$lib/server/services/roomSize";
import type { RoomSizeProblem, SizeReading } from "$lib/rooms/size";
import { RoomForm } from "../roomInput.server";

/** HTTP status of an action refused for a size problem. */
function sizeStatus(problem: RoomSizeProblem): number {
    switch (problem) {
        case "invalid":
            return 400;
        case "notFound":
            return 404;
        case "unresizable":
            return 422;
        case "unauthorized":
            return 502;
        case "unavailable":
            return 503;
        default:
            return 409;
    }
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "room.manage");
    const room = await getRoom(world.id, params.roomId);
    if (!room) error(404, "Not found");
    const [maps, tagNames] = await Promise.all([listMapStorageMaps(world.organizationId), worldTagNames(world.id)]);
    // Streamed: the page shows at once, the size follows when map-storage answers.
    const size: Promise<SizeReading> = currentRoomSize(world, room).catch(() => ({
        status: "problem" as const,
        problem: "unavailable" as const,
    }));
    return {
        size,
        room: {
            id: room.id,
            name: room.name,
            slug: room.slug,
            description: room.description ?? undefined,
            mapKind: room.mapKind,
            wamUrl: room.wamUrl ?? undefined,
            mapUrl: room.mapUrl ?? undefined,
            thumbnailUrl: room.thumbnailUrl ?? undefined,
            requiredTags: room.requiredTags.join(", "),
            isDefault: room.isDefault,
            syncState: room.syncState,
            syncError: room.syncError,
        },
        maps,
        tagNames,
    };
};

export const actions: Actions = {
    /** Resizes the room's map through map-storage (people in the room move with it). */
    resize: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const room = await getRoom(world.id, params.roomId);
        if (!room) error(404, "Not found");
        const parsed = ResizeOptionsSchema.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "resize" as const, sizeProblem: "invalid" as const });
        const result = await resizeRoom(world, room, parsed.data, false);
        if (result.status === "problem") {
            return fail(sizeStatus(result.problem), {
                op: "resize" as const,
                sizeProblem: result.problem,
                reason: result.reason ?? null,
                detail: result.detail ?? null,
            });
        }
        const { summary } = result;
        await audit({
            action: "room.resize",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: room.id,
            ipAddress: locals.clientIp ?? null,
            details: {
                from: `${summary.from.width}x${summary.from.height}`,
                to: `${summary.to.width}x${summary.to.height}`,
                anchor: parsed.data.anchor,
                fill: parsed.data.fill,
                movedObjects: summary.movedObjects,
                movedAreas: summary.movedAreas,
            },
        });
        return { op: "resize" as const, resized: summary };
    },

    save: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const formData = await request.formData();
        const parsed = parseForm(formData, RoomForm);
        if (!parsed.ok) return parsed.failure;
        const mapField = parsed.data.mapKind === "wam" ? "wamUrl" : "mapUrl";
        const mapUrl = parsed.data.mapKind === "wam" ? parsed.data.wamUrl : parsed.data.mapUrl;
        if (mapUrl && !mapExtensionOk(parsed.data.mapKind, mapUrl)) {
            return fail(400, {
                errors: { [mapField]: "validation" as const },
                values: formValues(formData),
                mapProblem: parsed.data.mapKind === "wam" ? ("extensionWam" as const) : ("extensionTmj" as const),
            });
        }
        // A map of another organization (its rooms from templates, or a map one of its rooms uses) is refused:
        // the room would show and edit that organization's office.
        if (
            parsed.data.mapKind === "wam" &&
            mapUrl &&
            mapUrl !== (await getRoom(world.id, params.roomId))?.wamUrl &&
            (await mapOfAnotherOrganization(world.organizationId, mapUrl))
        ) {
            return fail(400, {
                errors: { wamUrl: "validation" as const },
                values: formValues(formData),
                mapProblem: "otherOrganization" as const,
            });
        }
        const room = await updateRoom(world.id, params.roomId, parsed.data);
        if (room === "notFound") error(404, "Not found");
        if (room === "slugTaken") return formError(formValues(formData), "slugTaken", "slug");
        await audit({
            action: "room.update",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: room.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: room.slug, mapKind: room.mapKind, requiredTags: room.requiredTags },
        });
        // A map-storage room of a world with components gets the world's collection (a background job).
        await linkNewRoom(world, account.id);
        const reachable = mapUrl ? await checkMapReachable(mapUrl) : { status: "notChecked" as const };
        const warning =
            reachable.status === "unreachable" || reachable.status === "httpError"
                ? `?mapWarning=${encodeURIComponent(room.slug)}`
                : "";
        redirect(303, `/o/${params.org}/w/${params.world}/rooms${warning}`);
    },
};
