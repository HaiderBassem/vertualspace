/** "Your office is ready": shown after the "Create an office" wizard while the rooms are set up, then to enter. */
import type { PageServerLoad } from "./$types";
import { loadWorld } from "$lib/server/context";
import { roomUrls } from "$lib/server/services/rooms";
import { listRooms } from "$lib/server/services/worlds";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access, world, worldUrl, organizationWide } = await loadWorld(
        locals,
        params.org,
        params.world,
        "world.read",
    );
    const rooms = await listRooms(world.id);
    const urls = await roomUrls(access.organization.slug, world.slug, rooms);
    const main = rooms.find((r) => r.isDefault) ?? rooms[0];
    return {
        rooms: rooms.map((r) => ({ id: r.id, name: r.name, isDefault: r.isDefault, state: r.syncState })),
        officeUrl: (main ? urls.get(main.id) : undefined) ?? worldUrl ?? null,
        canInvite: organizationWide.can("team.invite"),
        canManageRooms: access.can("room.manage"),
    };
};
