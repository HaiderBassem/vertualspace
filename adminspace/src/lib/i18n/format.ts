/**
 * Locale-aware formatting built on ECMA-402 (Intl). Data stays machine-readable (ISO 8601 dates,
 * ISO 3166-1 country codes, BCP 47 language tags); only its display is localized.
 */
import type { Locale } from "./index";

export interface FormatOptions {
    locale: Locale;
    /** IANA time zone, e.g. "Europe/Paris". Undefined uses the viewer's (browser) or UTC (server). */
    timeZone?: string | undefined;
}

function toDate(value: Date | string | number): Date {
    return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value: Date | string | number, { locale, timeZone }: FormatOptions): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(toDate(value));
}

export function formatDate(value: Date | string | number, { locale, timeZone }: FormatOptions): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(toDate(value));
}

/** "3 hours ago", "in 2 days"... */
export function formatRelative(value: Date | string | number, { locale }: FormatOptions, now = Date.now()): string {
    const seconds = Math.round((toDate(value).getTime() - now) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 31_536_000],
        ["month", 2_592_000],
        ["week", 604_800],
        ["day", 86_400],
        ["hour", 3_600],
        ["minute", 60],
        ["second", 1],
    ];
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size || unit === "second") {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }
    return formatter.format(0, "second");
}

export function formatNumber(value: number, { locale }: FormatOptions): string {
    return new Intl.NumberFormat(locale).format(value);
}

/** Name of an ISO 3166-1 alpha-2 country in the given locale ("FR" -> "France", "Frankreich"...). */
export function countryName(code: string | null | undefined, locale: Locale): string {
    if (!code) return "";
    try {
        return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

/** Name of a BCP 47 language in the given locale. */
export function languageName(tag: string | null | undefined, locale: Locale): string {
    if (!tag) return "";
    try {
        return new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
    } catch {
        return tag;
    }
}

/** Codes that Intl names but that are not countries (EU, UN, private-use and reserved codes). */
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ"]);

/** ISO 3166-1 alpha-2 codes known to the runtime, sorted by their localized name. */
export function countryOptions(locale: Locale): { code: string; name: string }[] {
    const display = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
    const collator = new Intl.Collator(locale);
    const options: { code: string; name: string }[] = [];
    for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
            const code = String.fromCharCode(a, b);
            if (NOT_COUNTRIES.has(code)) continue;
            const name = display.of(code);
            if (name && name !== code) options.push({ code, name });
        }
    }
    return options.sort((x, y) => collator.compare(x.name, y.name));
}

/** IANA time zones supported by the runtime. */
export function timeZoneOptions(): string[] {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf ? intl.supportedValuesOf("timeZone") : ["UTC"];
}
