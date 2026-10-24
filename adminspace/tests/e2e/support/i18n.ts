/**
 * Dictionary-driven checks of rendered pages: raw keys, placeholders, English leftovers, ISO dates.
 */
import type { Page } from "@playwright/test";
import { LOCALES, messagesFor, type Locale, type Messages } from "../../../src/lib/i18n";

export const LOCALE_TAGS = LOCALES.map((l) => l.tag) as Locale[];

type Tree = { [key: string]: string | Tree };

/** Every leaf of a dictionary as [dotted path, value]; plural objects are flattened too. */
export function leaves(tree: unknown, prefix = ""): [string, string][] {
    if (typeof tree === "string") return [[prefix, tree]];
    if (typeof tree !== "object" || tree === null) return [];
    return Object.entries(tree as Tree).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

export function valueAt(messages: Messages, path: string): string | undefined {
    let node: unknown = messages;
    for (const part of path.split(".")) {
        if (typeof node !== "object" || node === null) return undefined;
        node = (node as Record<string, unknown>)[part];
    }
    return typeof node === "string" ? node : undefined;
}

/** Dotted key paths (and their 2+ segment suffixes) that must never be shown to people. */
export const RAW_KEYS: string[] = (() => {
    const keys = new Set<string>();
    for (const [path] of leaves(messagesFor("en-US"))) {
        const parts = path.split(".");
        for (let i = 0; i <= parts.length - 2; i++) keys.add(parts.slice(i).join("."));
    }
    return [...keys].filter((k) => /[A-Za-z]/.test(k) && k.length >= 8);
})();

/** Visible text of the page (what people read), excluding <code> blocks that show data verbatim. */
export async function visibleText(page: Page): Promise<string> {
    return page.evaluate(() => document.body.innerText);
}

export interface TextProblems {
    rawKeys: string[];
    junk: string[];
    placeholders: string[];
    isoDates: string[];
}

export function textProblems(text: string): TextProblems {
    const rawKeys = RAW_KEYS.filter((key) =>
        new RegExp(`(^|[^\\w.@])${key.replace(/\./g, "\\.")}($|[^\\w.])`).test(text),
    );
    const junk = ["undefined", "[object Object]", "NaN", "null"].filter((word) =>
        new RegExp(`(^|\\W)${word.replace(/[[\]]/g, "\\$&")}($|\\W)`).test(text),
    );
    const placeholders = [...text.matchAll(/\{[a-zA-Z]+\}/g)].map((m) => m[0]);
    const isoDates = [
        ...text.matchAll(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g),
    ].map((m) => m[0]);
    return { rawKeys, junk, placeholders, isoDates };
}

/**
 * English chrome left in a translated page: control labels (buttons, links, table headers, labels,
 * summaries) whose text is the English value of a dictionary entry that the locale translates differently.
 */
export async function englishLeftovers(page: Page, locale: Locale): Promise<string[]> {
    if (locale === "en-US") return [];
    const english = new Map<string, string[]>();
    for (const [path, value] of leaves(messagesFor("en-US"))) {
        if (value.length < 3 || value.length > 60 || value.includes("{")) continue;
        english.set(value, [...(english.get(value) ?? []), path]);
    }
    const localized = messagesFor(locale);
    const localizedValues = new Set(leaves(localized).map(([, v]) => v));
    const labels = await page.evaluate(() =>
        [...document.querySelectorAll("button, a, th, label, summary, h1, h2, h3, legend, option, [role=tab]")]
            // Elements in another language on purpose (the language switcher's endonyms) are skipped.
            .filter((el) => el.closest("[lang]") === document.documentElement)
            .filter((el) => (el as HTMLElement).offsetParent !== null || el.tagName === "OPTION")
            .map((el) => (el as HTMLElement).innerText?.trim() ?? "")
            .filter((t) => t.length > 0),
    );
    const leftovers = new Set<string>();
    for (const label of labels) {
        const paths = english.get(label);
        if (!paths || localizedValues.has(label)) continue;
        // Only a leftover when the locale really translates that entry to something else.
        if (paths.some((p) => valueAt(localized, p) !== undefined && valueAt(localized, p) !== label))
            leftovers.add(label);
    }
    return [...leftovers];
}
