import { describe, expect, it } from "vitest";
import { formatLocalTime, parseTimeZone } from "../../../src/front/Utils/LocalTime";

describe("LocalTime", () => {
    it("accepts real time zones only", () => {
        expect(parseTimeZone("Europe/Paris")).toBe("Europe/Paris");
        expect(parseTimeZone("Asia/Baghdad")).toBe("Asia/Baghdad");
        expect(parseTimeZone("Mars/Olympus")).toBeUndefined();
        expect(parseTimeZone(42)).toBeUndefined();
        expect(parseTimeZone("")).toBeUndefined();
        expect(parseTimeZone("x".repeat(100))).toBeUndefined();
    });

    it("tells what time it is somewhere else", () => {
        const noonUtc = new Date("2026-10-24T12:00:00Z");
        expect(formatLocalTime("Asia/Tokyo", "en-GB", noonUtc)).toBe("21:00");
        expect(formatLocalTime("UTC", "en-GB", noonUtc)).toBe("12:00");
    });
});
