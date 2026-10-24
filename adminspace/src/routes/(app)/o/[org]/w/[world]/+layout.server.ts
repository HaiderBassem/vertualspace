import type { LayoutServerLoad } from "./$types";
import { loadWorld, organizationPageData } from "$lib/server/context";
import { worldState } from "$lib/server/services/worlds";

/**
 * World summary for every world page. Settings (and their secrets) are loaded by the pages needing them.
 * The organization data is re-exposed here because SvelteKit does not type parent layout data in layouts.
 */
export const load: LayoutServerLoad = async ({ locals, params }) => {
    const { access, world, worldUrl } = await loadWorld(locals, params.org, params.world);
    return {
        ...organizationPageData(access, { workspaceId: world.workspaceId }),
        world: {
            id: world.id,
            slug: world.slug,
            name: world.name,
            description: world.description,
            accessPolicy: world.accessPolicy,
            maxUsers: world.maxUsers,
            expiresAt: world.expiresAt?.toISOString() ?? null,
            archivedAt: world.archivedAt?.toISOString() ?? null,
            createdAt: world.createdAt.toISOString(),
            state: worldState(world),
        },
        worldUrl: worldUrl ?? null,
    };
};
