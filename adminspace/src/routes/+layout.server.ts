import type { LayoutServerLoad } from "./$types";
import { localeInfo } from "$lib/i18n";

export const load: LayoutServerLoad = ({ locals }) => {
    const { account } = locals;
    return {
        locale: locals.locale,
        dir: localeInfo(locals.locale).dir,
        timeZone: locals.timeZone,
        // Only what pages need: never send the password hash or the TOTP secret to the browser.
        account: account
            ? {
                  id: account.id,
                  email: account.email,
                  name: account.name,
                  isSuperadmin: account.isSuperadmin,
                  mfaEnabled: account.totpEnabledAt !== null,
              }
            : null,
    };
};
