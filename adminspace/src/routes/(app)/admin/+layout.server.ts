import type { LayoutServerLoad } from "./$types";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { requireAccount } from "$lib/server/context";

/** Platform pages are for superadmins. Actions re-check it: layout loads do not run before actions. */
export const load: LayoutServerLoad = ({ locals }) => {
    requireSuperadmin(requireAccount(locals));
    return {};
};
