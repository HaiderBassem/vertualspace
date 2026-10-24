import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { linkNewRoom, mapOfAnotherOrganization } from "$lib/server/catalog/install";
import { loadWorld } from "$lib/server/context";
import { formError, formValues, parseForm } from "$lib/server/http/forms";
import { worldTagNames } from "$lib/server/services/members";
import { checkMapReachable, createRoom, listMapStorageMaps, mapExtensionOk } from "$lib/server/services/rooms";
import { RoomForm } from "../roomInput.server";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "room.manage");
    const [maps, tagNames] = await Promise.all([listMapStorageMaps(world.organizationId), worldTagNames(world.id)]);
    return { maps, tagNames };
};

export const actions: Actions = {
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
        if (parsed.data.mapKind === "wam" && mapUrl && (await mapOfAnotherOrganization(world.organizationId, mapUrl))) {
            return fail(400, {
                errors: { wamUrl: "validation" as const },
                values: formValues(formData),
                mapProblem: "otherOrganization" as const,
            });
        }
        const room = await createRoom(world.id, parsed.data);
        if (room === "slugTaken") return formError(formValues(formData), "slugTaken", "slug");
        await audit({
            action: "room.create",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: room.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: room.slug, mapKind: room.mapKind },
        });
        // A map-storage room of a world with components gets the world's collection (a background job).
        await linkNewRoom(world, account.id);
        // Saved either way; an unanswering map is reported on the rooms page (WorkAdventure would fail to load it).
        const reachable = mapUrl ? await checkMapReachable(mapUrl) : { status: "notChecked" as const };
        const warning =
            reachable.status === "unreachable" || reachable.status === "httpError"
                ? `?mapWarning=${encodeURIComponent(room.slug)}`
                : "";
        redirect(303, `/o/${params.org}/w/${params.world}/rooms${warning}`);
    },
};
