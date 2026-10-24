/**
 * Svelte context giving components the messages of the current locale and formatters bound to it.
 * The root layout calls setI18n(); components call useI18n().
 */
import { getContext, setContext } from "svelte";
import { format, localeInfo, plural, type Locale, type Messages, type PluralMessage } from "./index";
import { countryName, formatDate, formatDateTime, formatNumber, formatRelative, languageName } from "./format";

export interface I18n {
    readonly m: Messages;
    readonly locale: Locale;
    readonly dir: "ltr" | "rtl";
    readonly timeZone: string | undefined;
    /** Replaces {placeholders}. */
    t: (template: string, params?: Record<string, string | number>) => string;
    /** Picks the CLDR plural form for `count`. */
    p: (forms: PluralMessage, count: number, params?: Record<string, string | number>) => string;
    dateTime: (value: Date | string | number) => string;
    date: (value: Date | string | number) => string;
    relative: (value: Date | string | number) => string;
    number: (value: number) => string;
    country: (code: string | null | undefined) => string;
    language: (tag: string | null | undefined) => string;
}

const KEY = Symbol("i18n");

export function createI18n(source: () => { m: Messages; locale: Locale; timeZone: string | undefined }): I18n {
    const options = () => ({ locale: source().locale, timeZone: source().timeZone });
    return {
        get m() {
            return source().m;
        },
        get locale() {
            return source().locale;
        },
        get dir() {
            return localeInfo(source().locale).dir;
        },
        get timeZone() {
            return source().timeZone;
        },
        t: (template, params) => format(template, params, source().locale),
        p: (forms, count, params) => plural(forms, count, source().locale, params),
        dateTime: (value) => formatDateTime(value, options()),
        date: (value) => formatDate(value, options()),
        relative: (value) => formatRelative(value, options()),
        number: (value) => formatNumber(value, options()),
        country: (code) => countryName(code, source().locale),
        language: (tag) => languageName(tag, source().locale),
    };
}

export function setI18n(i18n: I18n): void {
    setContext(KEY, i18n);
}

export function useI18n(): I18n {
    const i18n = getContext<I18n | undefined>(KEY);
    if (!i18n) throw new Error("useI18n() called outside of the root layout");
    return i18n;
}
