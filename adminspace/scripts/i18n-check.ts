/**
 * Compares every locale with the en-US source dictionary.
 *
 * - Structural mismatch (missing key, extra key, string vs. plural object): error, exit code 1.
 *   The type checker already prevents it; this also catches casts and generated files.
 * - Value identical to English (strings longer than 3 characters): "untranslated" warning only,
 *   since some words are legitimately the same (e.g. "Email", "Tags").
 *
 *   npm run i18n:check
 */
import { LOCALES, messagesFor, type Locale } from "../src/lib/i18n";

type Tree = { [key: string]: string | Tree };

function isTree(value: unknown): value is Tree {
    return typeof value === "object" && value !== null;
}

const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);

/** A PluralMessage: an object with a string `other`. Each locale uses its own CLDR categories (Arabic needs six). */
function isPlural(value: unknown): value is Tree {
    return isTree(value) && typeof value.other === "string";
}

function comparePlural(target: Tree, here: string, errors: string[]): void {
    if (typeof target.other !== "string") errors.push(`plural without "other" at ${here}`);
    for (const [category, value] of Object.entries(target)) {
        if (!PLURAL_CATEGORIES.has(category) || typeof value !== "string") {
            errors.push(`invalid plural category ${here}.${category}`);
        }
    }
}

function compare(source: Tree, target: Tree, path: string[], errors: string[], untranslated: string[]): void {
    for (const [key, sourceValue] of Object.entries(source)) {
        const here = [...path, key].join(".");
        const targetValue = target[key];
        if (isPlural(sourceValue) && isTree(targetValue)) {
            comparePlural(targetValue, here, errors);
        } else if (targetValue === undefined) {
            errors.push(`missing key ${here}`);
        } else if (isTree(sourceValue) !== isTree(targetValue)) {
            errors.push(`type mismatch at ${here}`);
        } else if (isTree(sourceValue) && isTree(targetValue)) {
            compare(sourceValue, targetValue, [...path, key], errors, untranslated);
        } else if (typeof sourceValue === "string" && sourceValue === targetValue && sourceValue.length > 3) {
            untranslated.push(here);
        }
    }
    for (const key of Object.keys(target)) {
        if (!(key in source)) errors.push(`unknown key ${[...path, key].join(".")}`);
    }
}

const source = messagesFor("en-US") as unknown as Tree;
let failed = false;

for (const { tag } of LOCALES) {
    if (tag === "en-US") continue;
    const target = messagesFor(tag as Locale) as unknown as Tree;
    const errors: string[] = [];
    const untranslated: string[] = [];
    if (target === source) {
        console.warn(`${tag}: not translated yet (falls back to English).`);
        continue;
    }
    compare(source, target, [], errors, untranslated);
    if (errors.length > 0) {
        failed = true;
        console.error(`${tag}: ${errors.length} structural error(s)`);
        for (const message of errors) console.error(`  - ${message}`);
    }
    if (untranslated.length > 0) {
        console.warn(`${tag}: ${untranslated.length} value(s) identical to English`);
        for (const key of untranslated.slice(0, 50)) console.warn(`  ~ ${key}`);
        if (untranslated.length > 50) console.warn(`  ~ ... and ${untranslated.length - 50} more`);
    }
    if (errors.length === 0 && untranslated.length === 0) console.info(`${tag}: complete.`);
}

process.exit(failed ? 1 : 0);
