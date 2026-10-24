/**
 * Messages received by the SMTP sink of tests/e2e/support/fakes.ts, as a person's inbox: one JSON file
 * per message ({ to, data }) in state().mailDir. Bodies are MIME as nodemailer sends them (quoted-printable
 * or base64 parts), decoded just enough to read the links.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { state } from "./state";

function decodeQuotedPrintable(text: string): string {
    return text
        .replace(/=\r?\n/g, "")
        .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** The message as text: quoted-printable decoded, plus every base64 block decoded. */
function readable(raw: string): string[] {
    const texts = [decodeQuotedPrintable(raw)];
    for (const block of raw.split(/\r?\n\r?\n/)) {
        const compact = block.replace(/\s+/g, "");
        if (compact.length >= 16 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
            texts.push(Buffer.from(compact, "base64").toString("utf8"));
        }
    }
    return texts;
}

/** Messages sent to an address, newest first. */
export function mailsTo(email: string): { data: string; texts: string[] }[] {
    const dir = state().mailDir;
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .sort()
        .reverse()
        .map((file) => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { to: string[]; data: string })
        .filter((mail) => mail.to.includes(email.toLowerCase()))
        .map((mail) => ({ data: mail.data, texts: readable(mail.data) }));
}

/** The newest link to `pathname` with a token, in a message sent to `email` (undefined until one arrives). */
export function linkInMail(email: string, pathname: string): string | undefined {
    const pattern = new RegExp(`https?://[^\\s"'<>]+${pathname.replace(/[/?.]/g, "\\$&")}\\?token=[A-Za-z0-9_-]+`);
    for (const mail of mailsTo(email)) {
        for (const text of mail.texts) {
            const match = pattern.exec(text);
            if (match) return match[0];
        }
    }
    return undefined;
}
