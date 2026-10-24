import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadWorld } from "$lib/server/context";
import {
    componentChangeAllowed,
    listInstalled,
    reconcileWorld,
    roomStatuses,
    worldCollectionUrl,
} from "$lib/server/catalog/install";

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access, world } = await loadWorld(locals, params.org, params.world, "world.read");
    const [installed, rooms] = await Promise.all([listInstalled(world), roomStatuses(world)]);
    return {
        installed,
        rooms,
        collectionUrl: worldCollectionUrl(world.id) ?? null,
        canInstall: access.can("component.install"),
        createdRoomId: url.searchParams.get("created"),
    };
};

export const actions: Actions = {
    reconcile: async ({ locals, params }) => {
        const { account, access, world } = await loadWorld(locals, params.org, params.world, "component.install");
        if (!(await componentChangeAllowed(access.organization.id))) {
            return fail(429, { message: "rateLimited" as const });
        }
        const rooms = await reconcileWorld(world, account.id);
        await audit({
            action: "component.reconcile",
            account,
            organizationId: access.organization.id,
            worldId: world.id,
            targetType: "world",
            targetId: world.id,
            ipAddress: locals.clientIp ?? null,
            details: { rooms },
        });
        if (rooms === 0) return fail(400, { message: "notFound" as const });
        return { reconciled: rooms };
    },
};
