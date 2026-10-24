/**
 * Live preview of a room resize (GET ?width&height&anchor&fill): a map-storage dry run, nothing changes. Used by
 * the "Room size" panel of the room page while the person picks a size. Same permission as the resize itself.
 */
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadWorld } from "$lib/server/context";
import { getRoom } from "$lib/server/services/rooms";
import { resizeRoom, ResizeOptionsSchema } from "$lib/server/services/roomSize";
import type { SizeAnswer } from "$lib/rooms/size";

export const GET: RequestHandler = async ({ locals, params, url }) => {
    const { world } = await loadWorld(locals, params.org, params.world, "room.manage");
    const room = await getRoom(world.id, params.roomId);
    if (!room) error(404, "Not found");
    const parsed = ResizeOptionsSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
        return json({ status: "problem", problem: "invalid" } satisfies SizeAnswer, { status: 400 });
    }
    const result = await resizeRoom(world, room, parsed.data, true);
    const answer: SizeAnswer =
        result.status === "ok"
            ? { status: "ok", summary: result.summary }
            : { status: "problem", problem: result.problem, reason: result.reason, detail: result.detail };
    return json(answer, { headers: { "cache-control": "no-store" } });
};
