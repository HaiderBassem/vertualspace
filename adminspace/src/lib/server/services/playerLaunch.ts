import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { escapeHtml } from "./mail";
import { messagesFor, type Locale } from "$lib/i18n";

/** How long a browser stays signed in to WorkAdventure. The pusher renews it while the person keeps coming back. */
export const PLAYER_TOKEN_TTL = "30d";

/** WorkAdventure's signed player-token format. Per-world editor tags stay in the Admin API database. */
export function createPlayerLaunchToken(
    account: { email: string; name: string },
    locale: string,
    secret: string,
    ttl: string = PLAYER_TOKEN_TTL,
): Promise<string> {
    return new SignJWT({ identifier: account.email, username: account.name, locale, backofficeSession: true })
        .setIssuedAt()
        .setExpirationTime(ttl)
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode(secret));
}

/** POSTs the identity to WorkAdventure; tokens never appear in URLs, redirect headers, or audit details. */
export function launchPage(locale: Locale, targetUrl: string, token: string): Response {
    const nonce = randomBytes(18).toString("base64");
    const label = escapeHtml(messagesFor(locale).common.actions.open);
    return new Response(
        `<!doctype html><html lang="${escapeHtml(locale)}"><meta charset="utf-8"><title>${label}</title><form id="launch" method="post" action="${escapeHtml(targetUrl)}"><input type="hidden" name="authToken" value="${escapeHtml(token)}"><button type="submit">${label}</button></form><script nonce="${nonce}">document.getElementById('launch').submit()</script></html>`,
        {
            headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
                "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${new URL(targetUrl).origin}; base-uri 'none'; frame-ancestors 'none'`,
            },
        },
    );
}
