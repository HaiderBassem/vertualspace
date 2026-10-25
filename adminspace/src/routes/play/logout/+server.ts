import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { audit } from "$lib/server/audit";
import { destroySession } from "$lib/server/auth/session";

/**
 * "Sign out" from inside WorkAdventure: the pusher sends the browser here after it dropped its own token. The back
 * office session ends too, and the next person (or the same one) signs in again before entering the room.
 */
export const GET: RequestHandler = async ({ cookies, locals, url }) => {
    if (locals.account) {
        await audit({ action: "auth.logout", account: locals.account, ipAddress: locals.clientIp ?? null });
    }
    await destroySession(cookies);
    const playUri = url.searchParams.get("playUri");
    const next = playUri ? `/play/enter?playUri=${encodeURIComponent(playUri)}` : "/";
    redirect(303, `/login?redirectTo=${encodeURIComponent(next)}`);
};
