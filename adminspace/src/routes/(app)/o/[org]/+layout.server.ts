import type { LayoutServerLoad } from "./$types";
import { loadOrganization, organizationPageData } from "$lib/server/context";

export const load: LayoutServerLoad = async ({ locals, params }) => {
    const { access } = await loadOrganization(locals, params.org);
    return organizationPageData(access);
};
