import { describe, expect, it } from "vitest";
import {
    activeReservation,
    deskHolderIds,
    deskTypeOf,
    hasRequiredDeskTag,
    isDeskClaimableBy,
    isDeskHolder,
    isReservationActive,
    reservationFor,
} from "../../src/PersonalDesk/DeskEligibility";

type Desk = Parameters<typeof isDeskClaimableBy>[0];

const freeDesk = (overrides: Partial<Desk> = {}): Desk => ({
    accessClaimMode: "dynamic",
    allowedTags: [],
    ownerId: null,
    ...overrides,
});

describe("hasRequiredDeskTag", () => {
    it("is true for everyone when the desk asks for no tag", () => {
        expect(hasRequiredDeskTag({ allowedTags: [] }, [])).toBe(true);
        expect(hasRequiredDeskTag({ allowedTags: [] }, ["sales"])).toBe(true);
    });

    it("is true when the user has one of the tags the desk asks for", () => {
        expect(hasRequiredDeskTag({ allowedTags: ["design", "product"] }, ["sales", "product"])).toBe(true);
    });

    it("is false when the user has none of the tags the desk asks for", () => {
        expect(hasRequiredDeskTag({ allowedTags: ["design"] }, ["sales"])).toBe(false);
        expect(hasRequiredDeskTag({ allowedTags: ["design"] }, [])).toBe(false);
    });
});

describe("isDeskClaimableBy", () => {
    it("is true for a free desk that is open to claiming, in service, and open to the user", () => {
        expect(isDeskClaimableBy(freeDesk(), [])).toBe(true);
        expect(isDeskClaimableBy(freeDesk({ allowedTags: ["design"] }), ["design"])).toBe(true);
    });

    it("is false for a desk that someone owns", () => {
        expect(isDeskClaimableBy(freeDesk({ ownerId: "bob" }), [])).toBe(false);
    });

    it("is false for a desk that an administrator assigns", () => {
        expect(isDeskClaimableBy(freeDesk({ accessClaimMode: "static" }), [])).toBe(false);
    });

    it("is false for a desk that is out of service", () => {
        expect(isDeskClaimableBy(freeDesk({ disabled: true }), [])).toBe(false);
    });

    it("is true again for a desk that was put back in service", () => {
        expect(isDeskClaimableBy(freeDesk({ disabled: false }), [])).toBe(true);
    });

    it("is false for a user who lacks the tag the desk asks for", () => {
        expect(isDeskClaimableBy(freeDesk({ allowedTags: ["design"] }), ["sales"])).toBe(false);
    });

    it("is false for hot desks (nobody owns them) and shared desks (an administrator gives them)", () => {
        expect(isDeskClaimableBy(freeDesk({ deskType: "hot" }), [])).toBe(false);
        expect(isDeskClaimableBy(freeDesk({ deskType: "shared" }), [])).toBe(false);
        expect(isDeskClaimableBy(freeDesk({ deskType: "assigned" }), [])).toBe(true);
    });

    it("is false while the desk is kept for somebody else, and true for that person", () => {
        const now = Date.parse("2026-10-24T10:00:00Z");
        const kept = freeDesk({
            reservations: [{ id: "r1", userId: "carol", start: "2026-10-24T09:00:00Z", end: "2026-10-24T12:00:00Z" }],
        });
        expect(isDeskClaimableBy(kept, [], "bob", now)).toBe(false);
        expect(isDeskClaimableBy(kept, [], "carol", now)).toBe(true);
        // Once the reservation is over, anybody can claim the desk again.
        expect(isDeskClaimableBy(kept, [], "bob", Date.parse("2026-10-24T12:00:00Z"))).toBe(true);
    });

    it("lets the person a desk is kept for claim it without the tags it asks for, like map-storage does", () => {
        const now = Date.parse("2026-10-24T10:00:00Z");
        const kept = freeDesk({
            allowedTags: ["design"],
            reservations: [{ id: "r1", userId: "carol", start: "2026-10-24T09:00:00Z", end: "2026-10-24T12:00:00Z" }],
        });
        expect(isDeskClaimableBy(kept, [], "carol", now)).toBe(true);
        expect(isDeskClaimableBy(kept, ["design"], "bob", now)).toBe(false);
    });
});

describe("deskTypeOf", () => {
    it("treats desks without a type as personal desks", () => {
        expect(deskTypeOf({})).toBe("assigned");
        expect(deskTypeOf({ deskType: "hot" })).toBe("hot");
    });
});

describe("desk holders", () => {
    it("are the owner, and on a shared desk the co-owners too", () => {
        expect(deskHolderIds({ ownerId: "alice" })).toEqual(["alice"]);
        expect(deskHolderIds({ ownerId: "alice", deskType: "shared", coOwnerIds: ["bob", "alice", ""] })).toEqual([
            "alice",
            "bob",
        ]);
        expect(deskHolderIds({ ownerId: null, deskType: "shared", coOwnerIds: ["bob"] })).toEqual(["bob"]);
    });

    it("ignore co-owners on a desk that is not shared", () => {
        expect(deskHolderIds({ ownerId: "alice", coOwnerIds: ["bob"] })).toEqual(["alice"]);
        expect(isDeskHolder({ ownerId: "alice", coOwnerIds: ["bob"] }, "bob")).toBe(false);
    });

    it("never include an unknown or empty user", () => {
        expect(isDeskHolder({ ownerId: "alice" }, undefined)).toBe(false);
        expect(isDeskHolder({ ownerId: "alice" }, "")).toBe(false);
        expect(isDeskHolder({ ownerId: "alice", deskType: "shared", coOwnerIds: ["bob"] }, "bob")).toBe(true);
    });
});

describe("reservations", () => {
    const reservations = [
        { id: "late", userId: "bob", start: "2026-10-25T09:00:00Z", end: "2026-10-25T17:00:00Z" },
        { id: "now", userId: "carol", start: "2026-10-24T09:00:00Z", end: "2026-10-24T17:00:00Z" },
        { id: "broken", userId: "dan", start: "tomorrow", end: "2026-10-24T17:00:00Z" },
        { id: "soon", userId: "bob", start: "2026-10-24T18:00:00Z", end: "2026-10-24T20:00:00Z" },
    ];
    const now = Date.parse("2026-10-24T10:00:00Z");

    it("cover from their start (included) to their end (excluded)", () => {
        expect(isReservationActive(reservations[1], Date.parse("2026-10-24T09:00:00Z"))).toBe(true);
        expect(isReservationActive(reservations[1], Date.parse("2026-10-24T17:00:00Z"))).toBe(false);
    });

    it("cover nothing when a date cannot be read", () => {
        expect(isReservationActive(reservations[2], now)).toBe(false);
    });

    it("tell who the desk is kept for right now", () => {
        expect(activeReservation({ reservations }, now)?.userId).toBe("carol");
        expect(activeReservation({ reservations: [] }, now)).toBeUndefined();
        expect(activeReservation({}, now)).toBeUndefined();
    });

    it("give the next reservation of a person", () => {
        expect(reservationFor({ reservations }, "bob", now)?.id).toBe("soon");
        expect(reservationFor({ reservations }, "carol", now)?.id).toBe("now");
        expect(reservationFor({ reservations }, "erin", now)).toBeUndefined();
        expect(reservationFor({ reservations }, undefined, now)).toBeUndefined();
    });
});
