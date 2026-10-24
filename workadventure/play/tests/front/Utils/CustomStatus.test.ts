import { describe, expect, it } from "vitest";
import { customStatusExpiry, formatCustomStatus, parseCustomStatus } from "../../../src/front/Utils/CustomStatus";

describe("parseCustomStatus", () => {
    const now = new Date("2026-10-21T15:00:00").getTime(); // a Wednesday

    it("reads a status", () => {
        expect(parseCustomStatus({ emoji: "🌴", text: "On vacation" }, now)).toEqual({
            emoji: "🌴",
            text: "On vacation",
        });
    });

    it("ignores nothing, invalid, empty and expired statuses", () => {
        expect(parseCustomStatus(undefined, now)).toBeUndefined();
        expect(parseCustomStatus(null, now)).toBeUndefined();
        expect(parseCustomStatus({ emoji: 3, text: "x" }, now)).toBeUndefined();
        expect(parseCustomStatus({ emoji: " ", text: "" }, now)).toBeUndefined();
        expect(parseCustomStatus({ emoji: "📅", text: "Meeting", expiresAt: now - 1 }, now)).toBeUndefined();
        expect(parseCustomStatus({ emoji: "📅", text: "x".repeat(81) }, now)).toBeUndefined();
    });
});

describe("customStatusExpiry", () => {
    const wednesday = new Date("2026-10-21T15:00:00");

    it("computes relative durations", () => {
        expect(customStatusExpiry("never", wednesday)).toBeUndefined();
        expect(customStatusExpiry("30m", wednesday)).toBe(wednesday.getTime() + 30 * 60_000);
        expect(customStatusExpiry("4h", wednesday)).toBe(wednesday.getTime() + 4 * 60 * 60_000);
    });

    it("ends today at midnight and this week on Monday at midnight", () => {
        expect(customStatusExpiry("today", wednesday)).toBe(new Date("2026-10-22T00:00:00").getTime());
        expect(customStatusExpiry("week", wednesday)).toBe(new Date("2026-10-26T00:00:00").getTime());
        expect(customStatusExpiry("week", new Date("2026-10-25T20:00:00"))).toBe(
            new Date("2026-10-26T00:00:00").getTime(),
        );
        expect(customStatusExpiry("week", new Date("2026-10-26T09:00:00"))).toBe(
            new Date("2026-11-02T00:00:00").getTime(),
        );
    });
});

describe("formatCustomStatus", () => {
    it("joins the emoji and the text", () => {
        expect(formatCustomStatus({ emoji: "🎧", text: "Focusing" })).toBe("🎧 Focusing");
        expect(formatCustomStatus({ emoji: "", text: "Focusing" })).toBe("Focusing");
    });
});
