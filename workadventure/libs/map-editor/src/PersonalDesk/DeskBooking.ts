import type { DeskReservation, PersonalAreaPropertyData } from "../types";
import { deskTypeOf, hasRequiredDeskTag } from "./DeskEligibility";

/**
 * Employees book hot desks by themselves: a booking is a reservation of the desk in their own name. These are the limits
 * of such bookings (an administrator, who edits the map, is not bound by them).
 */
export const DESK_BOOKING_RULES = {
    /** The longest booking. */
    maxHours: 12,
    /** How far ahead a desk can be booked. */
    maxDaysAhead: 14,
    /** How many bookings, going on or to come, one person can hold in a map. */
    maxUpcomingPerPerson: 10,
    /** How far in the past a booking may start: the time it takes a "from now" booking to reach the server. */
    startToleranceMinutes: 5,
} as const;

export type DeskBookingDenialReason =
    /** Only hot desks are booked by employees themselves. */
    | "DESK_NOT_BOOKABLE"
    /** An administrator took the desk out of service. */
    | "DESK_DISABLED"
    /** The user does not have a tag that this desk requires. */
    | "DESK_NOT_ELIGIBLE"
    /** The change is not one booking or one cancellation of the user's own, or its times make no sense. */
    | "BOOKING_INVALID"
    /** Someone already booked the desk for part of that time. */
    | "BOOKING_CONFLICT"
    /** The user already booked another desk for part of that time. */
    | "BOOKING_DOUBLE"
    /** The user holds as many bookings as allowed. */
    | "BOOKING_LIMIT";

export type DeskBookingVerdict =
    | { allowed: true; kind: "book" | "cancel" }
    | { allowed: false; reason: DeskBookingDenialReason };

type BookableDesk = Pick<PersonalAreaPropertyData, "deskType" | "disabled" | "allowedTags" | "reservations">;

export interface DeskBookingRequest {
    desk: BookableDesk;
    /** The reservations of the desk the user wants to store instead of those it has. */
    nextReservations: readonly DeskReservation[];
    userId: string;
    userTags: readonly string[];
    /** The other desks of the map, to keep one person from booking two desks at once. */
    otherDesks: Iterable<Pick<PersonalAreaPropertyData, "reservations">>;
    now: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_ID_LENGTH = 64;

function times(reservation: Pick<DeskReservation, "start" | "end">): { start: number; end: number } {
    return { start: Date.parse(reservation.start), end: Date.parse(reservation.end) };
}

function overlaps(a: Pick<DeskReservation, "start" | "end">, b: Pick<DeskReservation, "start" | "end">): boolean {
    const first = times(a);
    const second = times(b);
    return first.start < second.end && second.start < first.end;
}

function hasEnded(reservation: DeskReservation, now: number): boolean {
    const end = Date.parse(reservation.end);
    return Number.isNaN(end) || end <= now;
}

function sameReservation(a: DeskReservation, b: DeskReservation): boolean {
    return (
        a.id === b.id && a.userId === b.userId && a.userName === b.userName && a.start === b.start && a.end === b.end
    );
}

function isValidBooking(reservation: DeskReservation, userId: string, now: number): boolean {
    const { start, end } = times(reservation);
    return (
        reservation.userId === userId &&
        reservation.id !== "" &&
        reservation.id.length <= MAX_ID_LENGTH &&
        !Number.isNaN(start) &&
        !Number.isNaN(end) &&
        start < end &&
        end - start <= DESK_BOOKING_RULES.maxHours * HOUR &&
        start >= now - DESK_BOOKING_RULES.startToleranceMinutes * 60_000 &&
        start <= now + DESK_BOOKING_RULES.maxDaysAhead * DAY
    );
}

/**
 * Whether an employee may change the reservations of a desk this way: add one booking in their own name, or cancel one
 * of their own. Reservations that are over may be dropped along the way, whoever they were for. Everything else (taking
 * someone's booking away, moving it, booking for someone else...) is refused.
 *
 * The browser uses this to offer only bookings that will be accepted, and map-storage applies the very same rule, inside
 * the lock of the map, so two people booking the same desk at the same time cannot both succeed.
 */
export function evaluateDeskBooking(request: DeskBookingRequest): DeskBookingVerdict {
    const { desk, nextReservations, userId, userTags, otherDesks, now } = request;
    if (userId === "") return { allowed: false, reason: "BOOKING_INVALID" };

    const current = desk.reservations ?? [];
    const currentById = new Map(current.map((reservation) => [reservation.id, reservation]));
    const nextById = new Map(nextReservations.map((reservation) => [reservation.id, reservation]));
    if (nextById.size !== nextReservations.length) return { allowed: false, reason: "BOOKING_INVALID" };

    const added: DeskReservation[] = [];
    for (const reservation of nextReservations) {
        const before = currentById.get(reservation.id);
        if (!before) added.push(reservation);
        else if (!sameReservation(before, reservation)) return { allowed: false, reason: "BOOKING_INVALID" };
    }
    const cancelled: DeskReservation[] = [];
    for (const reservation of current) {
        if (nextById.has(reservation.id) || hasEnded(reservation, now)) continue;
        if (reservation.userId !== userId) return { allowed: false, reason: "BOOKING_INVALID" };
        cancelled.push(reservation);
    }

    if (added.length === 0 && cancelled.length === 1) return { allowed: true, kind: "cancel" };
    if (added.length !== 1 || cancelled.length !== 0) return { allowed: false, reason: "BOOKING_INVALID" };

    const booking = added[0];
    if (deskTypeOf(desk) !== "hot") return { allowed: false, reason: "DESK_NOT_BOOKABLE" };
    if (desk.disabled === true) return { allowed: false, reason: "DESK_DISABLED" };
    if (!hasRequiredDeskTag(desk, userTags)) return { allowed: false, reason: "DESK_NOT_ELIGIBLE" };
    if (!isValidBooking(booking, userId, now)) return { allowed: false, reason: "BOOKING_INVALID" };

    if (
        nextReservations.some((other) => other.id !== booking.id && !hasEnded(other, now) && overlaps(other, booking))
    ) {
        return { allowed: false, reason: "BOOKING_CONFLICT" };
    }

    let upcoming = nextReservations.filter(
        (reservation) => reservation.userId === userId && !hasEnded(reservation, now),
    ).length;
    for (const other of otherDesks) {
        for (const reservation of other.reservations ?? []) {
            if (reservation.userId !== userId || hasEnded(reservation, now)) continue;
            if (overlaps(reservation, booking)) return { allowed: false, reason: "BOOKING_DOUBLE" };
            upcoming++;
        }
    }
    if (upcoming > DESK_BOOKING_RULES.maxUpcomingPerPerson) return { allowed: false, reason: "BOOKING_LIMIT" };

    return { allowed: true, kind: "book" };
}

/** The reservations of the desk once this booking is added, without those that are over. */
export function withBooking(
    desk: Pick<PersonalAreaPropertyData, "reservations">,
    booking: DeskReservation,
    now: number,
): DeskReservation[] {
    return [...(desk.reservations ?? []).filter((reservation) => !hasEnded(reservation, now)), booking];
}

/** The reservations of the desk once this booking is cancelled, without those that are over. */
export function withoutBooking(
    desk: Pick<PersonalAreaPropertyData, "reservations">,
    bookingId: string,
    now: number,
): DeskReservation[] {
    return (desk.reservations ?? []).filter(
        (reservation) => reservation.id !== bookingId && !hasEnded(reservation, now),
    );
}
