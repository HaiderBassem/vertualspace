/**
 * Outgoing email over SMTP (SMTP_URL, MAIL_FROM). Self-hostable: any SMTP relay works, no vendor API.
 *
 * - Honest outcomes: "not_configured" when no server is set (nothing is pretended to be sent),
 *   "failed" when the server refused or timed out, "sent" when it accepted the message.
 * - Every attempt is recorded in email_deliveries without its body: bodies carry secret links.
 * - Links are built from ORIGIN only (see publicOrigin), never from the request's Host header.
 * - Interpolated values (organization and person names are user input) are escaped in the HTML part.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config";
import { db, schema } from "../db/client";
import { logJson } from "../security/requestLog";

export type MailPurpose =
    | "invitation"
    | "signup_verification"
    | "signup_existing_account"
    | "password_reset"
    | "password_changed"
    | "desk_changed";

export type DeliveryOutcome = (typeof schema.emailDeliveryStatus.enumValues)[number];

export interface MailMessage {
    subject: string;
    /** Paragraphs of the message; the link is rendered as a button in HTML and as a line in text. */
    paragraphs: string[];
    action?: { label: string; url: string };
    /** Small print below the action (expiry, "ignore this email if..."). */
    footnote?: string;
    /** Writing direction of the recipient's language (Arabic is right to left). */
    dir?: "ltr" | "rtl";
    lang?: string;
}

export function mailConfigured(): boolean {
    return Boolean(config().SMTP_URL && config().MAIL_FROM);
}

/**
 * Origin used in links sent by email. ORIGIN in production; in development and tests the request's own
 * origin is accepted as a fallback so that the local setup works without configuration.
 */
export function publicOrigin(requestUrl?: URL): string | undefined {
    const configured = config().ORIGIN;
    if (configured) return new URL(configured).origin;
    // Development only, and only on this machine: links must never follow a Host header from outside.
    if (
        config().NODE_ENV !== "production" &&
        requestUrl &&
        /^(localhost|127\.0\.0\.1|\[::1\])$/.test(requestUrl.hostname)
    ) {
        return requestUrl.origin;
    }
    return undefined;
}

let transport: Transporter | undefined;

/** Transport options from SMTP_URL: smtp:// (STARTTLS when offered) or smtps:// (implicit TLS). */
export function smtpOptions(smtpUrl: string) {
    const url = new URL(smtpUrl);
    const secure = url.protocol === "smtps:";
    return {
        host: url.hostname,
        port: url.port ? Number(url.port) : secure ? 465 : 587,
        secure,
        ...(url.username
            ? { auth: { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } }
            : {}),
        // A slow or silent server must not hold a request for long.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        // Messages are built here from fixed templates: never let content read files or URLs.
        disableFileAccess: true,
        disableUrlAccess: true,
    };
}

function getTransport(): Transporter {
    transport ??= nodemailer.createTransport(smtpOptions(config().SMTP_URL!));
    return transport;
}

/** For tests that start their own SMTP server: forget the cached transport. */
export function resetMailTransportForTests(): void {
    transport?.close();
    transport = undefined;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Plain text and HTML versions of a message. Exported for tests. */
export function renderMail(message: MailMessage): { text: string; html: string } {
    const text = [
        ...message.paragraphs,
        ...(message.action ? [`${message.action.label}: ${message.action.url}`] : []),
        ...(message.footnote ? [message.footnote] : []),
    ].join("\n\n");
    const dir = message.dir ?? "ltr";
    const paragraphs = message.paragraphs
        .map((p) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(p)}</p>`)
        .join("");
    const action = message.action
        ? `<p style="margin:24px 0"><a href="${escapeHtml(message.action.url)}" style="display:inline-block;background:#1f3a8a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(message.action.label)}</a></p>` +
          `<p style="margin:0 0 16px;font-size:13px;color:#555c6b;word-break:break-all">${escapeHtml(message.action.url)}</p>`
        : "";
    const footnote = message.footnote
        ? `<p style="margin:24px 0 0;font-size:13px;color:#555c6b;line-height:1.5">${escapeHtml(message.footnote)}</p>`
        : "";
    const html =
        `<!doctype html><html lang="${escapeHtml(message.lang ?? "en")}" dir="${dir}"><body style="margin:0;background:#f5f6f8">` +
        `<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#16181d;text-align:${dir === "rtl" ? "right" : "left"}">` +
        `<div style="background:#ffffff;border:1px solid #d8dce3;border-radius:12px;padding:28px">${paragraphs}${action}${footnote}</div>` +
        `</div></body></html>`;
    return { text, html };
}

async function record(input: {
    to: string;
    purpose: MailPurpose;
    status: DeliveryOutcome;
    errorCode?: string;
    organizationId?: string | null;
}): Promise<void> {
    await db()
        .insert(schema.emailDeliveries)
        .values({
            recipient: input.to.slice(0, 320),
            purpose: input.purpose,
            status: input.status,
            errorCode: input.errorCode?.slice(0, 200) ?? null,
            organizationId: input.organizationId ?? null,
        });
}

/** A short code for a transport error, never its message (it may echo addresses or content). */
function errorCodeOf(error: unknown): string {
    if (typeof error === "object" && error !== null) {
        const { code, responseCode, name } = error as { code?: unknown; responseCode?: unknown; name?: unknown };
        if (typeof responseCode === "number") return `smtp_${responseCode}`;
        if (typeof code === "string") return code;
        if (typeof name === "string") return name;
    }
    return "unknown";
}

/** Sends one message and records the outcome. Never throws for delivery problems. */
export async function sendMail(input: {
    to: string;
    purpose: MailPurpose;
    organizationId?: string | null;
    message: MailMessage;
}): Promise<DeliveryOutcome> {
    if (!mailConfigured()) {
        await record({
            to: input.to,
            purpose: input.purpose,
            status: "not_configured",
            organizationId: input.organizationId,
        });
        return "not_configured";
    }
    const { text, html } = renderMail(input.message);
    try {
        await getTransport().sendMail({
            from: config().MAIL_FROM,
            to: input.to,
            subject: input.message.subject,
            text,
            html,
            disableFileAccess: true,
            disableUrlAccess: true,
        });
        await record({ to: input.to, purpose: input.purpose, status: "sent", organizationId: input.organizationId });
        return "sent";
    } catch (error) {
        const errorCode = errorCodeOf(error);
        logJson("error", "email delivery failed", { purpose: input.purpose, errorCode });
        await record({
            to: input.to,
            purpose: input.purpose,
            status: "failed",
            errorCode,
            organizationId: input.organizationId,
        });
        return "failed";
    }
}
