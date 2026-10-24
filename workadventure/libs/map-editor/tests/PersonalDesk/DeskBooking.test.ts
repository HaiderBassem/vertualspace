import { describe, expect, it } from "vitest";
import type { DeskReservation } from "../../src/types";
import {
    DESK_BOOKING_RULES,
    evaluateDeskBooking,
    withBooking,
    withoutBooking,
    type DeskBookingRequest,
} from "../../src/PersonalDesk/DeskBooking";

const NOW = Date.parse("2026-10-24T08:00:00Z");
const at = (iso: string) => new Date(Date.parse(iso)).toISOString();

const booking = (overrides: Partial<DeskReservation> = {}): DeskReservation => ({
    id: "b1",
    userId: "jane",
    userName: "Jane",
    start: at("2026-10-24T08:00:00Z"),
    end: at("2026-10-24T17:00:00Z"),
    ...overrides,
});

const hotDesk = (reservations: DeskReservation[] = []): DeskBookingRequest["desk"] => ({
    deskType: "hot",
    allowedTags: [],
    reservations,
});

const request = (overrides: Partial<DeskBookingRequest> = {}): DeskBookingRequest => ({
    desk: hotDesk(),
    nextReservations: [booking()],
    userId: "jane",
    userTags: [],
    otherDesks: [],
    now: NOW,
    ...overrides,
});

const INVALID = { allowed: false, reason: "BOOKING_INVALID" };
const BOOKED = { allowed: true, kind: "book" };

describe("evaluateDeskBooking", () => {
    it("lets an employee book a free hot desk in their own name", () => {
        expect(evaluateDeskBooking(request())).toEqual(BOOKED);
    });

    it("lets an employee cancel their own booking", () => {
        expect(evaluateDeskBooking(request({ desk: hotDesk([booking()]), nextReservations: [] }))).toEqual({
            allowed: true,
            kind: "cancel",
        });
    });

    it("never lets anyone take away or change someone else's booking", () => {
        const bob = booking({ id: "b2", userId: "bob" });
        expect(evaluateDeskBooking(request({ desk: hotDesk([bob]), nextReservations: [] }))).toEqual(INVALID);
        const shortened = { ...bob, end: at("2026-10-24T09:00:00Z") };
        expect(evaluateDeskBooking(request({ desk: hotDesk([bob]), nextReservations: [shortened] }))).toEqual(INVALID);
    });

    it("never books for someone else", () => {
        expect(evaluateDeskBooking(request({ nextReservations: [booking({ userId: "bob" })] }))).toEqual(INVALID);
    });

    it("drops the bookings that are over along the way, whoever they were for", () => {
        const past = booking({
            id: "old",
            userId: "bob",
            start: at("2026-10-23T08:00:00Z"),
            end: at("2026-10-23T17:00:00Z"),
        });
        expect(evaluateDeskBooking(request({ desk: hotDesk([past]), nextReservations: [booking()] }))).toEqual(BOOKED);
        expect(withBooking(hotDesk([past]), booking(), NOW)).toEqual([booking()]);
        expect(withoutBooking(hotDesk([past, booking()]), "b1", NOW)).toEqual([]);
    });

    it("refuses one change that books and cancels at once, or that does nothing", () => {
        const mine = booking({ id: "b0", start: at("2026-10-25T08:00:00Z"), end: at("2026-10-25T10:00:00Z") });
        expect(evaluateDeskBooking(request({ desk: hotDesk([mine]), nextReservations: [booking()] }))).toEqual(INVALID);
        expect(evaluateDeskBooking(request({ desk: hotDesk([mine]), nextReservations: [mine] }))).toEqual(INVALID);
        const twice = [booking(), booking({ start: at("2026-10-25T08:00:00Z") })];
        expect(evaluateDeskBooking(request({ nextReservations: twice }))).toEqual(INVALID);
    });

    it("books only hot desks that are in service and open to the user", () => {
        expect(evaluateDeskBooking(request({ desk: { ...hotDesk(), deskType: "assigned" } }))).toEqual({
            allowed: false,
            reason: "DESK_NOT_BOOKABLE",
        });
        expect(evaluateDeskBooking(request({ desk: { ...hotDesk(), deskType: undefined } }))).toEqual({
            allowed: false,
            reason: "DESK_NOT_BOOKABLE",
        });
        expect(evaluateDeskBooking(request({ desk: { ...hotDesk(), disabled: true } }))).toEqual({
            allowed: false,
            reason: "DESK_DISABLED",
        });
        expect(evaluateDeskBooking(request({ desk: { ...hotDesk(), allowedTags: ["design"] } }))).toEqual({
            allowed: false,
            reason: "DESK_NOT_ELIGIBLE",
        });
        expect(
            evaluateDeskBooking(request({ desk: { ...hotDesk(), allowedTags: ["design"] }, userTags: ["design"] })),
        ).toEqual(BOOKED);
    });

    it("refuses bookings whose times make no sense", () => {
        const withTimes = (start: string, end: string) =>
            evaluateDeskBooking(request({ nextReservations: [booking({ start, end })] }));
        // Ends before it starts.
        expect(withTimes(at("2026-10-24T08:00:00Z"), at("2026-10-24T07:00:00Z"))).toEqual(INVALID);
        // Longer than allowed.
        expect(withTimes(at("2026-10-24T08:00:00Z"), at("2026-10-24T20:00:01Z"))).toEqual(INVALID);
        // In the past, beyond the few minutes a request takes to arrive.
        expect(withTimes(at("2026-10-24T07:50:00Z"), at("2026-10-24T17:00:00Z"))).toEqual(INVALID);
        expect(withTimes(at("2026-10-24T07:56:00Z"), at("2026-10-24T17:00:00Z"))).toEqual(BOOKED);
        // Too far ahead.
        expect(withTimes(at("2026-11-07T08:00:01Z"), at("2026-11-07T10:00:00Z"))).toEqual(INVALID);
        // Unreadable.
        expect(withTimes("tomorrow", at("2026-10-24T17:00:00Z"))).toEqual(INVALID);
        expect(evaluateDeskBooking(request({ nextReservations: [booking({ id: "" })] }))).toEqual(INVALID);
    });

    it("refuses a booking that overlaps another one of the desk, but not one that follows it", () => {
        const bob = booking({
            id: "b2",
            userId: "bob",
            start: at("2026-10-24T12:00:00Z"),
            end: at("2026-10-24T18:00:00Z"),
        });
        expect(evaluateDeskBooking(request({ desk: hotDesk([bob]), nextReservations: [bob, booking()] }))).toEqual({
            allowed: false,
            reason: "BOOKING_CONFLICT",
        });
        const morning = booking({ end: at("2026-10-24T12:00:00Z") });
        expect(evaluateDeskBooking(request({ desk: hotDesk([bob]), nextReservations: [bob, morning] }))).toEqual(
            BOOKED,
        );
    });

    it("keeps one person from booking two desks at the same time", () => {
        const deskWith = (start: string, end: string) => ({ reservations: [booking({ id: "x", start, end })] });
        expect(
            evaluateDeskBooking(
                request({ otherDesks: [deskWith(at("2026-10-24T16:00:00Z"), at("2026-10-24T18:00:00Z"))] }),
            ),
        ).toEqual({ allowed: false, reason: "BOOKING_DOUBLE" });
        expect(
            evaluateDeskBooking(
                request({ otherDesks: [deskWith(at("2026-10-25T08:00:00Z"), at("2026-10-25T17:00:00Z"))] }),
            ),
        ).toEqual(BOOKED);
    });

    it("limits how many bookings one person holds", () => {
        const days = Array.from({ length: DESK_BOOKING_RULES.maxUpcomingPerPerson }, (_, day) => ({
            reservations: [
                booking({
                    id: `d${day}`,
                    start: new Date(NOW + (day + 1) * 86_400_000).toISOString(),
                    end: new Date(NOW + (day + 1) * 86_400_000 + 3_600_000).toISOString(),
                }),
            ],
        }));
        expect(evaluateDeskBooking(request({ otherDesks: days }))).toEqual({ allowed: false, reason: "BOOKING_LIMIT" });
        expect(evaluateDeskBooking(request({ otherDesks: days.slice(1) }))).toEqual(BOOKED);
    });
});
