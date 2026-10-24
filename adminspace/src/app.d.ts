import type { Locale } from "$lib/i18n";
import type { Account, Session } from "$lib/server/auth/session";

declare global {
    namespace App {
        interface Locals {
            locale: Locale;
            /** IANA time zone used to display dates, when the account chose one. */
            timeZone: string | undefined;
            account: Account | undefined;
            session: Session | undefined;
            clientIp: string | undefined;
            /** Correlation id of the request (X-Request-Id), also written in logs. */
            requestId: string;
        }
        interface Error {
            message: string;
            /** Correlation id to quote when reporting the problem. */
            requestId?: string;
        }
    }
}

export {};
