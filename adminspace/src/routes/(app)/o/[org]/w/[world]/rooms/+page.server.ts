import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import {
    allWorldRoomUrls,
    checkMapReachable,
    deleteRoom,
    getRoom,
    moveRoom,
    roomMapUrl,
    roomUrls,
    setDefaultRoom,
} from "$lib/server/services/rooms";
import { buildRoomUrl } from "$lib/server/workadventure/playUri";
import { refreshRoom, worldOccupancy } from "$lib/server/services/pusher";
import { listRooms } from "$lib/server/services/worlds";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world, worldUrl } = await loadWorld(locals, params.org, params.world, "world.read");
    const rooms = await listRooms(world.id);
    const urls = await roomUrls(params.org, world.slug, rooms);
    let occupancy: Record<string, number> | null = null;
    if (worldUrl) {
        try {
            occupancy = (await worldOccupancy(worldUrl)).rooms;
        } catch {
            occupancy = null;
        }
    }
    return {
        rooms: rooms.map((room) => {
            const url = urls.get(room.id);
            return {
                id: room.id,
                slug: room.slug,
                name: room.name,
                mapKind: room.mapKind,
                map: room.mapKind === "wam" ? room.wamUrl : room.mapUrl,
                isDefault: room.isDefault,
                requiredTags: room.requiredTags,
                syncState: room.syncState,
                syncError: room.syncError,
                url: url ?? null,
                online: url && occupancy ? (occupancy[url] ?? 0) : null,
            };
        }),
        occupancyAvailable: occupancy !== null,
    };
};

function roomId(formData: FormData): string {
    return String(formData.get("roomId") ?? "");
}

export const actions: Actions = {
    setDefault: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const id = roomId(await request.formData());
        if (!(await setDefaultRoom(world.id, id))) return fail(404, { message: "notFound" as const });
        await audit({
            action: "room.set_default",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: id,
            ipAddress: locals.clientIp ?? null,
        });
        return { success: true, op: "setDefault" };
    },

    move: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const formData = await request.formData();
        const id = roomId(formData);
        const direction = formData.get("direction") === "up" ? "up" : "down";
        const outcome = await moveRoom(world.id, id, direction);
        // A room of another world (or an unknown id) is refused like in the other actions, and not audited.
        if (outcome === "notFound") return fail(404, { message: "notFound" as const });
        // Already first or last: nothing changed, so there is nothing to audit.
        if (outcome === "unchanged") return { op: "move" };
        await audit({
            action: "room.move",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: id,
            ipAddress: locals.clientIp ?? null,
            details: { direction },
        });
        return { op: "move" };
    },

    /** Checks on demand that the map of a room answers (status code only). */
    checkMap: async ({ locals, params, request }) => {
        const { world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const room = await getRoom(world.id, roomId(await request.formData()));
        if (!room) return fail(404, { message: "notFound" as const });
        const url = roomMapUrl(room);
        const result = url ? await checkMapReachable(url) : { status: "unreachable" as const };
        return { op: "checkMap", mapCheck: { roomId: room.id, ...result } };
    },

    delete: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "room.manage");
        const deleted = await deleteRoom(world.id, roomId(await request.formData()));
        if (!deleted) return fail(404, { message: "notFound" as const });
        await audit({
            action: "room.delete",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: deleted.id,
            ipAddress: locals.clientIp ?? null,
            details: { slug: deleted.slug, name: deleted.name },
        });
        return { success: true, op: "delete" };
    },

    reload: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "live.manage");
        const room = await getRoom(world.id, roomId(await request.formData()));
        if (!room) return fail(404, { message: "notFound" as const });
        // The room may be open on the play URL and on custom domains: ask the pusher for each of them.
        const prefix = buildRoomUrl("", access.organization.slug, world.slug, room.slug);
        const urls = (await allWorldRoomUrls(access.organization, world)).filter((u) => u.endsWith(prefix));
        if (urls.length === 0) return fail(503, { message: "workadventureUnreachable" as const });
        try {
            for (const url of urls) await refreshRoom(url);
        } catch {
            return fail(503, { message: "workadventureUnreachable" as const });
        }
        await audit({
            action: "room.reload",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "room",
            targetId: room.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { success: true, op: "reload" };
    },
};
