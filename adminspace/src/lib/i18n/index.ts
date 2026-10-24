/**
 * Internationalization.
 *
 * - Locales are BCP 47 tags (RFC 5646): ISO 639-1 language + ISO 3166-1 region.
 * - Negotiation follows the RFC 4647 "lookup" scheme over Accept-Language (RFC 9110 §12.5.4).
 * - Plurals use CLDR plural categories through Intl.PluralRules (Arabic needs all six).
 * - en-US is the source dictionary; every other locale must provide every key (type-checked).
 */
import { en, type Messages } from "./locales/en";
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { es } from "./locales/es";

export type { Messages };

export interface LocaleInfo {
    tag: string;
    /** Name of the language in the language itself (endonym). */
    nativeName: string;
    dir: "ltr" | "rtl";
}

export const LOCALES = [
    { tag: "en-US", nativeName: "English", dir: "ltr" },
    { tag: "fr-FR", nativeName: "Français", dir: "ltr" },
    { tag: "de-DE", nativeName: "Deutsch", dir: "ltr" },
    { tag: "es-ES", nativeName: "Español", dir: "ltr" },
    { tag: "ar-SA", nativeName: "العربية", dir: "rtl" },
] as const satisfies readonly LocaleInfo[];

export type Locale = (typeof LOCALES)[number]["tag"];

export const DEFAULT_LOCALE: Locale = "en-US";

const DICTIONARIES: Record<Locale, Messages> = {
    "en-US": en,
    "fr-FR": fr,
    "de-DE": de,
    "es-ES": es,
    "ar-SA": ar,
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && LOCALES.some((l) => l.tag === value);
}

export function messagesFor(locale: Locale): Messages {
    return DICTIONARIES[locale];
}

export function localeInfo(locale: Locale): LocaleInfo {
    return LOCALES.find((l) => l.tag === locale) ?? LOCALES[0];
}

/**
 * Picks the best supported locale for a list of BCP 47 tags (e.g. an Accept-Language header),
 * using RFC 4647 lookup: "fr-CA" falls back to "fr", which matches "fr-FR".
 */
export function negotiateLocale(acceptLanguage: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
    if (!acceptLanguage) return fallback;
    const ranges = acceptLanguage
        .split(",")
        .map((part) => {
            const [range = "", ...params] = part.trim().split(";");
            const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
            return { range: range.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
        })
        .filter((r) => r.range && r.range !== "*" && r.q > 0 && !Number.isNaN(r.q))
        .sort((a, b) => b.q - a.q);

    for (const { range } of ranges) {
        let candidate = range;
        while (candidate) {
            const exact = LOCALES.find((l) => l.tag.toLowerCase() === candidate);
            if (exact) return exact.tag;
            const byLanguage = LOCALES.find((l) => l.tag.toLowerCase().split("-")[0] === candidate);
            if (byLanguage) return byLanguage.tag;
            const cut = candidate.lastIndexOf("-");
            candidate = cut > 0 ? candidate.slice(0, cut) : "";
        }
    }
    return fallback;
}

/** Replaces {name} placeholders. Numbers are formatted for the locale. */
export function format(template: string, params: Record<string, string | number> = {}, locale?: Locale): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
        const value = params[key];
        if (value === undefined) return match;
        return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : value;
    });
}

/** A message with CLDR plural forms. `other` is mandatory, as in CLDR. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export function plural(
    forms: PluralMessage,
    count: number,
    locale: Locale,
    params: Record<string, string | number> = {},
): string {
    const category = new Intl.PluralRules(locale).select(count);
    const template = forms[category] ?? forms.other;
    return format(template, { count, ...params }, locale);
}
