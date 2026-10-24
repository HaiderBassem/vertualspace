import type { PageServerLoad } from "./$types";
import { resolveWorldOfPlayUri } from "$lib/server/services/worlds";

/**
 * Opened by WorkAdventure in an iframe (OPID_PROFILE_SCREEN_PROVIDER = <this admin>/profile) with
 * ?accessToken=...&playUri=... . The access token is deliberately ignored: never read, shown or stored.
 */
export const load: PageServerLoad = async ({ url }) => {
    const playUri = url.searchParams.get("playUri") ?? "";
    const context = playUri ? await resolveWorldOfPlayUri(playUri) : undefined;
    return {
        world: context ? { name: context.world.name, organization: context.organization.name } : null,
    };
};
