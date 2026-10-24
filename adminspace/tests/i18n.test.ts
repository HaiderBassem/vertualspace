import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, format, isLocale, localeInfo, negotiateLocale, plural } from "../src/lib/i18n";

describe("negotiateLocale (RFC 4647 lookup)", () => {
    it("falls back from a region to the language", () => {
        expect(negotiateLocale("fr-CA,fr;q=0.9")).toBe("fr-FR");
    });

    it("matches a bare language", () => {
        expect(negotiateLocale("ar")).toBe("ar-SA");
    });

    it("honours quality values and ignores q=0", () => {
        expect(negotiateLocale("de;q=0,es;q=0.5,en;q=0.4")).toBe("es-ES");
    });

    it("uses the fallback for wildcards, empty and unknown ranges", () => {
        expect(negotiateLocale("*")).toBe(DEFAULT_LOCALE);
        expect(negotiateLocale(undefined)).toBe(DEFAULT_LOCALE);
        expect(negotiateLocale("tlh-Latn", "fr-FR")).toBe("fr-FR");
    });

    it("is case-insensitive", () => {
        expect(negotiateLocale("ES-mx")).toBe("es-ES");
    });
});

describe("locale metadata", () => {
    it("knows Arabic is right-to-left", () => {
        expect(localeInfo("ar-SA").dir).toBe("rtl");
        expect(localeInfo("en-US").dir).toBe("ltr");
    });

    it("validates locale tags", () => {
        expect(isLocale("de-DE")).toBe(true);
        expect(isLocale("de")).toBe(false);
    });
});

describe("format and plural", () => {
    it("replaces placeholders and formats numbers for the locale", () => {
        expect(format("{n} items for {who}", { n: 1234, who: "Ada" }, "en-US")).toBe("1,234 items for Ada");
        expect(format("{n}", { n: 1234 }, "de-DE")).toBe("1.234");
        expect(format("{missing}", {})).toBe("{missing}");
    });

    it("selects CLDR plural categories, including Arabic ones", () => {
        const forms = {
            zero: "zero",
            one: "one",
            two: "two",
            few: "few {count}",
            many: "many {count}",
            other: "other {count}",
        };
        expect(plural(forms, 0, "ar-SA")).toBe("zero");
        expect(plural(forms, 1, "ar-SA")).toBe("one");
        expect(plural(forms, 2, "ar-SA")).toBe("two");
        expect(plural(forms, 3, "ar-SA")).toMatch(/^few /);
        expect(plural(forms, 11, "ar-SA")).toMatch(/^many /);
        expect(plural(forms, 100, "ar-SA")).toMatch(/^other /);
    });

    it("falls back to `other` when a category is missing", () => {
        expect(plural({ one: "one", other: "{count} things" }, 0, "en-US")).toBe("0 things");
    });
});
