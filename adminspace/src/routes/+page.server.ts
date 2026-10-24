import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAccount } from "$lib/server/context";
import { organizationsOf } from "$lib/server/services/organizations";

/**
 * The back office opens on the person's organization when there is exactly one, on the list of their
 * organizations when there are several (or none), and on the Control Center for platform administrators
 * without organization. hooks.server.ts already sent anonymous visitors to /login.
 */
export const load: PageServerLoad = async ({ locals }) => {
    const account = requireAccount(locals);
    const organizations = (await organizationsOf(account.id)).filter((o) => o.status === "active");
    if (organizations.length === 1) redirect(303, `/o/${organizations[0]!.slug}`);
    if (organizations.length === 0 && account.isSuperadmin) redirect(303, "/admin");
    redirect(303, "/organizations");
};
