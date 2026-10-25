import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadWorld } from "$lib/server/context";
import { config } from "$lib/server/config";
import { audit } from "$lib/server/audit";
import { createPlayerLaunchToken, launchPage } from "$lib/server/services/playerLaunch";
import { messagesFor } from "$lib/i18n";

/** POST the identity to WorkAdventure; tokens never appear in URLs, redirect headers, or audit details. */
export const GET: RequestHandler = async ({ locals, params }) => {
    const { account, access, world, worldUrl } = await loadWorld(locals, params.org, params.world, "room.manage");
    const secret = config().WORKADVENTURE_PLAYER_TOKEN_SECRET;
    if (!secret || !worldUrl) error(503, messagesFor(locals.locale).common.errors.generic);
    const token = await createPlayerLaunchToken(account, locals.locale, secret, "1h");
    await audit({
        action: "world.editor_launch",
        account,
        organizationId: access.organization.id,
        worldId: world.id,
        targetType: "world",
        targetId: world.id,
        ipAddress: locals.clientIp ?? null,
    });
    return launchPage(locals.locale, worldUrl, token);
};
