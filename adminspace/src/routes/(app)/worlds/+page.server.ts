import type { PageServerLoad } from "./$types";
import { requireAccount } from "$lib/server/context";
import { getInstanceSettings } from "$lib/server/services/instance";
import { listAccessibleWorlds, worldState } from "$lib/server/services/worlds";
import { buildWorldUrl } from "$lib/server/workadventure/playUri";

export const load: PageServerLoad = async ({ locals }) => {
    const account = requireAccount(locals);
    const [worlds, instance] = await Promise.all([listAccessibleWorlds(account), getInstanceSettings()]);
    const origin = instance.playUrl ? new URL(instance.playUrl).origin : undefined;
    return {
        worlds: worlds.map(({ organization, world, role, roomCount, memberCount }) => ({
            organization: { slug: organization.slug, name: organization.name },
            world: {
                slug: world.slug,
                name: world.name,
                description: world.description,
                accessPolicy: world.accessPolicy,
                state: worldState(world),
            },
            role: role ?? null,
            roomCount,
            memberCount,
            url: origin ? buildWorldUrl(origin, organization.slug, world.slug) : null,
        })),
    };
};
