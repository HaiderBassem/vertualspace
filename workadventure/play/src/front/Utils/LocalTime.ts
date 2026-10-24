/**
 * Each user shares the time zone of their browser, so that the others see what time it is for them before they call
 * (Gather shows it on the profile card). It travels as a public player variable of the world.
 */
export const TIMEZONE_VARIABLE = "wa:timezone";

/** The time zone of this browser (an IANA name such as "Europe/Paris"), if it has one. */
export function browserTimeZone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
        return undefined;
    }
}

/** A time zone read from a variable, if it is one this browser knows. */
export function parseTimeZone(value: unknown): string | undefined {
    if (typeof value !== "string" || value === "" || value.length > 64) return undefined;
    try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return value;
    } catch {
        return undefined;
    }
}

/** The time it is now in a time zone, written for the viewer (e.g. "14:32"). */
export function formatLocalTime(timeZone: string, locale: string, now: Date = new Date()): string {
    return now.toLocaleTimeString(locale, { timeZone, hour: "2-digit", minute: "2-digit" });
}
