import { describe, expect, it } from "vitest";
import { nameplateFor } from "../../../../../src/front/Phaser/Game/MapEditor/DeskNameplate";

const texts = {
    free: () => "Free desk",
    hot: () => "Hot desk",
    keptFor: ({ name }: { name: string }) => `Kept for ${name}`,
    outOfService: () => "Out of service",
    taken: () => "Taken",
};
const now = Date.parse("2026-10-24T10:00:00Z");
const away = { ownerName: undefined, ownerHere: false, now };

describe("nameplateFor", () => {
    it("shows whose desk it is while they are away, and that they are at it", () => {
        expect(nameplateFor({ ownerId: "alice", ownerName: "Alice" }, away, texts)).toEqual({
            text: "Alice",
            tone: "owned",
        });
        expect(nameplateFor({ ownerId: "alice" }, { ...away, ownerName: "Alice M.", ownerHere: true }, texts)).toEqual({
            text: "Alice M.",
            tone: "ownerHere",
        });
    });

    it("says a desk is taken when the name of its owner is not known", () => {
        expect(nameplateFor({ ownerId: "alice" }, away, texts).text).toBe("Taken");
    });

    it("keeps an owned desk's sign even out of service: it is still theirs", () => {
        expect(nameplateFor({ ownerId: "alice", ownerName: "Alice", disabled: true }, away, texts).tone).toBe("owned");
        expect(nameplateFor({ ownerId: null, disabled: true }, away, texts)).toEqual({
            text: "Out of service",
            tone: "disabled",
        });
    });

    it("shows who a free desk is kept for, then free again once the reservation ends", () => {
        const kept = {
            ownerId: null,
            reservations: [
                { id: "r", userId: "dan", userName: "Dan", start: "2026-10-24T09:00:00Z", end: "2026-10-24T12:00:00Z" },
            ],
        };
        expect(nameplateFor(kept, away, texts)).toEqual({ text: "Kept for Dan", tone: "reserved" });
        expect(nameplateFor(kept, { ...away, now: Date.parse("2026-10-24T12:30:00Z") }, texts)).toEqual({
            text: "Free desk",
            tone: "free",
        });
    });

    it("tells hot desks apart from free personal desks", () => {
        expect(nameplateFor({ ownerId: null, deskType: "hot" }, away, texts)).toEqual({
            text: "Hot desk",
            tone: "hot",
        });
        expect(nameplateFor({ ownerId: null }, away, texts)).toEqual({ text: "Free desk", tone: "free" });
    });

    it("shows who sits at a desk nobody owns, and keeps the owner's name on an owned one", () => {
        expect(nameplateFor({ ownerId: null, deskType: "hot" }, { ...away, occupantName: "Carol" }, texts)).toEqual({
            text: "Carol",
            tone: "occupied",
        });
        expect(nameplateFor({ ownerId: null }, { ...away, occupantName: "Carol" }, texts).tone).toBe("occupied");
        expect(
            nameplateFor(
                { ownerId: "alice", ownerName: "Alice" },
                { ...away, occupantName: "Alice", ownerHere: true },
                texts,
            ),
        ).toEqual({ text: "Alice", tone: "ownerHere" });
    });

    it("names the owner of a shared desk", () => {
        expect(
            nameplateFor(
                { ownerId: null, deskType: "shared", coOwnerIds: ["bob"] },
                { ...away, ownerName: "Bob" },
                texts,
            ),
        ).toEqual({ text: "Bob", tone: "owned" });
    });
});
