import type { PageServerLoad } from "./$types";
import { loadOrganization } from "$lib/server/context";
import { catalogFor } from "$lib/server/integrations/catalog";
import { PROVIDER_CATEGORIES } from "$lib/server/integrations/types";

export const load: PageServerLoad = async ({ locals, params }) => {
    const { access } = await loadOrganization(locals, params.org, "integration.manage");
    return { cards: await catalogFor(access.organization.id), categories: [...PROVIDER_CATEGORIES] };
};
