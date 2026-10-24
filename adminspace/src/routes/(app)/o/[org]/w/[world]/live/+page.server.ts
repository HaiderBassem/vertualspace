import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import { emitOrgEventSafely } from "$lib/server/integrations/events";
import { parseForm, requiredText } from "$lib/server/http/forms";
import { adminSocketEnabled, broadcastMessage, worldOccupancy } from "$lib/server/services/pusher";
import { roomUrls } from "$lib/server/services/rooms";
import { listRooms } from "$lib/server/services/worlds";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { world, worldUrl } = await loadWorld(locals, params.org, params.world, "world.read");
    const rooms = await listRooms(world.id);
    const urls = await roomUrls(params.org, world.slug, rooms);
    let occupancy: { total: number; rooms: Record<string, number> } | null = null;
    if (worldUrl) {
        try {
            occupancy = await worldOccupancy(worldUrl);
        } catch {
            occupancy = null;
        }
    }
    return {
        rooms: rooms.map((room) => {
            const url = urls.get(room.id) ?? null;
            return {
                id: room.id,
                name: room.name,
                slug: room.slug,
                url,
                online: url && occupancy ? (occupancy.rooms[url] ?? 0) : null,
            };
        }),
        total: occupancy?.total ?? null,
        checkedAt: new Date(),
        socketEnabled: adminSocketEnabled(),
    };
};

const BroadcastForm = z.object({
    text: requiredText(1000),
    roomId: z.string().optional(),
});

export const actions: Actions = {
    broadcast: async ({ locals, params, request }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "live.manage");
        const parsed = parseForm(await request.formData(), BroadcastForm);
        if (!parsed.ok) return parsed.failure;
        const rooms = await listRooms(world.id);
        const targets = parsed.data.roomId ? rooms.filter((r) => r.id === parsed.data.roomId) : rooms;
        const urls = [...(await roomUrls(params.org, world.slug, targets)).values()];
        if (urls.length === 0) return fail(400, { message: "notFound" as const });
        try {
            await broadcastMessage(urls, parsed.data.text);
        } catch {
            return fail(503, { op: "broadcast", failed: true });
        }
        await audit({
            action: "live.broadcast",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: parsed.data.roomId ? "room" : "world",
            targetId: parsed.data.roomId ?? world.id,
            ipAddress: locals.clientIp ?? null,
            details: { rooms: urls.length, length: parsed.data.text.length },
        });
        // Integration Center: the announcement also reaches the channels subscribed to office.announcement.
        await emitOrgEventSafely(access.organization.id, "office.announcement", {
            message: parsed.data.text,
            world: { id: world.id, slug: world.slug, name: world.name },
            rooms: targets.length,
            by: { name: account.name },
            via: "backOffice",
        });
        return { success: true, op: "broadcast" };
    },
};
