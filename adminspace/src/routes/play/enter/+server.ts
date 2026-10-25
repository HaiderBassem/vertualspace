import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { audit } from "$lib/server/audit";
import { config } from "$lib/server/config";
import { fullyAuthenticated } from "$lib/server/context";
import { messagesFor } from "$lib/i18n";
import { isWorldPerson } from "$lib/server/services/directory";
import { getInstanceSettings } from "$lib/server/services/instance";
import { createPlayerLaunchToken, launchPage } from "$lib/server/services/playerLaunch";
import { resolveWorldOfPlayUri } from "$lib/server/services/worlds";

/**
 * Where WorkAdventure sends a visitor who is not signed in (the pusher's /login-screen). The visitor signs in here, once;
 * the browser then keeps the signed token WorkAdventure gets and renews, so the next visits go straight in.
 *
 * Only rooms of this installation's own WorkAdventure are accepted, and only for people of the world: the token is
 * never handed to anybody else, and never to another site.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    const account = fullyAuthenticated(locals);
    if (!account) {
        redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
    }

    const playUri = url.searchParams.get("playUri") ?? "";
    const secret = config().WORKADVENTURE_PLAYER_TOKEN_SECRET;
    const { playUrl } = await getInstanceSettings();
    if (!secret || !playUrl) error(503, messagesFor(locals.locale).common.errors.generic);

    let target: URL;
    try {
        target = new URL(playUri);
    } catch {
        error(400, "Invalid room");
    }
    if (target.origin !== new URL(playUrl).origin || (target.protocol !== "https:" && target.protocol !== "http:")) {
        error(400, "Invalid room");
    }
    const context = await resolveWorldOfPlayUri(target.toString());
    if (!context) error(404, "Not found");
    if (!(await isWorldPerson(context.world, account.email))) error(403, "Forbidden");

    const token = await createPlayerLaunchToken(account, locals.locale, secret);
    await audit({
        action: "world.player_launch",
        account,
        organizationId: context.organization.id,
        worldId: context.world.id,
        targetType: "world",
        targetId: context.world.id,
        ipAddress: locals.clientIp ?? null,
    });
    return launchPage(locals.locale, target.toString(), token);
};
