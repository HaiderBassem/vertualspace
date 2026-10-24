/**
 * "Who's in" (docs/PRESENCE.md): people connected to the organization's worlds right now, grouped by world then room.
 * The page refreshes itself from ./now every PRESENCE_REFRESH_MS. Read-only: no action.
 */
import type { PageServerLoad } from "./$types";
import { PRESENCE_REFRESH_MS } from "$lib/presence/model";
import { loadPresence } from "./presence.server";

export const load: PageServerLoad = async ({ locals, params }) => {
    return { presence: await loadPresence(locals, params.org), refreshMs: PRESENCE_REFRESH_MS };
};
