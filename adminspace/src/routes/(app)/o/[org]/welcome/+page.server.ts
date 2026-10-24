import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { loadOrganization } from "$lib/server/context";

/** Landing page after registration: the overview, with its welcome banner and setup checklist. */
export const load: PageServerLoad = async ({ locals, params }) => {
    const { access } = await loadOrganization(locals, params.org);
    redirect(303, `/o/${access.organization.slug}?welcome=1`);
};
