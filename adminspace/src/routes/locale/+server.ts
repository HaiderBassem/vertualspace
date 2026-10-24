import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { isLocale } from "$lib/i18n";
import { LOCALE_COOKIE } from "$lib/i18n/cookie";
import { db, schema } from "$lib/server/db/client";
import { config } from "$lib/server/config";
import { safeRedirectPath } from "$lib/server/http/forms";

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    const form = await request.formData();
    const locale = form.get("locale");
    if (isLocale(locale)) {
        cookies.set(LOCALE_COOKIE, locale, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: config().NODE_ENV === "production",
            maxAge: 365 * 24 * 3600,
        });
        if (locals.account) {
            await db().update(schema.accounts).set({ locale }).where(eq(schema.accounts.id, locals.account.id));
        }
    }
    redirect(303, safeRedirectPath(form.get("redirectTo")));
};
