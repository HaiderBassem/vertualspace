/** Helpers shared by the provider adapters. */
import { isHttpUrl } from "../../http/forms";
import { ProviderError } from "../http";

export function bearer(token: string): Record<string, string> {
    return { authorization: `Bearer ${token}` };
}

/** The client id and secret of a provider, or "notConfigured" when this server does not have them. */
export function clientCredentials(
    provider: string,
    id: string | undefined,
    secret: string | undefined,
): { id: string; secret: string } {
    if (!id || !secret) throw new ProviderError("notConfigured", `${provider} is not configured on this server`);
    return { id, secret };
}

/**
 * Text from a provider shown in WorkAdventure or the back office: control characters removed, whitespace collapsed,
 * length capped. Rendering stays the job of the page (Svelte escapes it).
 */
export function cleanText(value: unknown, max = 300): string | null {
    if (typeof value !== "string") return null;
    const text = value
        // Control (Cc) and format (Cf) characters: zero-width spaces, bidirectional overrides...
        .replace(/[\p{Cc}\p{Cf}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (text.length === 0) return null;
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** An ISO 8601 UTC timestamp, or null for anything that is not a date. */
export function isoOrNull(value: unknown): string | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const time = typeof value === "number" ? value : Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** An http(s) URL (links shown to people must never be javascript: or data:). */
export function httpUrlOrNull(value: unknown): string | null {
    return isHttpUrl(value) ? value : null;
}

/** YYYY-MM-DD of a date, in UTC. */
export function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}
