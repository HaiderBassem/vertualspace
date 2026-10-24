import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { audit } from "$lib/server/audit";
import { destroySession } from "$lib/server/auth/session";

export const POST: RequestHandler = async ({ cookies, locals }) => {
    if (locals.account) {
        await audit({ action: "auth.logout", account: locals.account, ipAddress: locals.clientIp ?? null });
    }
    await destroySession(cookies);
    redirect(303, "/login");
};
