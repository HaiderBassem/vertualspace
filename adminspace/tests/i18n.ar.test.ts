/**
 * Arabic uses all six CLDR plural categories (zero, one, two, few, many, other): every plural
 * message of the Arabic dictionary must provide each of them.
 */
import { describe, expect, it } from "vitest";
import { ar } from "../src/lib/i18n/locales/ar";
import { en } from "../src/lib/i18n/locales/en";
import { plural } from "../src/lib/i18n";

const CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;

function isPluralMessage(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && typeof (value as { other?: unknown }).other === "string";
}

function collectPlurals(node: unknown, path: string[] = [], found: [string, Record<string, unknown>][] = []) {
    if (isPluralMessage(node)) {
        found.push([path.join("."), node]);
    } else if (typeof node === "object" && node !== null) {
        for (const [key, value] of Object.entries(node)) {
            collectPlurals(value, [...path, key], found);
        }
    }
    return found;
}

describe("Arabic dictionary", () => {
    const plurals = collectPlurals(ar);

    it("has as many plural messages as English", () => {
        expect(plurals.length).toBe(collectPlurals(en).length);
        expect(plurals.length).toBeGreaterThan(0);
    });

    it.each(plurals)("%s provides every Arabic plural category", (_path, forms) => {
        for (const category of CATEGORIES) {
            expect(typeof forms[category], category).toBe("string");
        }
    });

    it("selects the right forms", () => {
        const rooms = ar.worlds.rooms;
        expect(plural(rooms, 0, "ar-SA")).toBe("لا توجد غرف");
        expect(plural(rooms, 2, "ar-SA")).toBe("غرفتان");
        expect(plural(rooms, 5, "ar-SA")).toContain("غرف");
    });
});
