import type { PersonalAreaPropertyData } from "../types";
import { activeReservation, deskHolderIds, hasRequiredDeskTag } from "./DeskEligibility";
import type { Seat } from "./Seats";
import { SEAT_REACH } from "./Seats";

/**
 * Who may sit where. The server decides with these rules (the browser only uses them to say in advance what will
 * happen): one person per seat, and the seats of a desk are for the people the desk is for.
 */

export type SitDenialReason =
    /** There is no such seat on this map (any more). */
    | "SEAT_NOT_FOUND"
    /** Somebody else sits there. */
    | "SEAT_TAKEN"
    /** The player is not next to the seat. */
    | "TOO_FAR"
    /** The seat is at a desk that belongs to somebody else. */
    | "DESK_TAKEN"
    /** The desk is kept for somebody else right now. */
    | "DESK_RESERVED"
    /** The desk is out of service. */
    | "DESK_DISABLED"
    /** The desk is only for people with a tag the player does not have. */
    | "DESK_NOT_ELIGIBLE";

export type SitVerdict = { allowed: true } | { allowed: false; reason: SitDenialReason };

export interface Sitter {
    uuid: string;
    tags: readonly string[];
}

export interface SitRequest {
    seat: Pick<Seat, "x" | "y" | "deskAreaId"> | undefined;
    /** The desk property of the desk the seat belongs to, if it belongs to one. */
    desk: Pick<
        PersonalAreaPropertyData,
        "ownerId" | "coOwnerIds" | "deskType" | "disabled" | "allowedTags" | "reservations"
    > | null;
    sitter: Sitter;
    /** Who sits on the seat now, if anybody. */
    occupantUuid: string | undefined;
    /** Where the player stands, when known, to check they are next to the seat. */
    position?: { x: number; y: number };
    now: number;
}

/** Whether a desk lets this person sit at it: the reasons are the same as for a seat of the desk. */
export function evaluateDeskSeating(desk: SitRequest["desk"], sitter: Sitter, now: number): SitVerdict {
    if (!desk) return { allowed: true };
    const holders = deskHolderIds(desk);
    if (holders.length > 0) {
        // A desk that belongs to people is theirs alone, even out of service.
        return holders.includes(sitter.uuid) ? { allowed: true } : { allowed: false, reason: "DESK_TAKEN" };
    }
    if (desk.disabled === true) return { allowed: false, reason: "DESK_DISABLED" };
    const reservation = activeReservation(desk, now);
    if (reservation && reservation.userId !== sitter.uuid) return { allowed: false, reason: "DESK_RESERVED" };
    // The person a desk is kept for may sit at it even without the tags it asks for: an administrator chose them.
    if (!reservation && !hasRequiredDeskTag(desk, sitter.tags)) return { allowed: false, reason: "DESK_NOT_ELIGIBLE" };
    return { allowed: true };
}

/** Whether this person may sit on this seat now. */
export function evaluateSit(request: SitRequest): SitVerdict {
    const { seat, desk, sitter, occupantUuid, position, now } = request;
    if (!seat) return { allowed: false, reason: "SEAT_NOT_FOUND" };
    if (position && Math.hypot(position.x - seat.x, position.y - seat.y) > SEAT_REACH) {
        return { allowed: false, reason: "TOO_FAR" };
    }
    const deskVerdict = evaluateDeskSeating(desk, sitter, now);
    if (!deskVerdict.allowed) return deskVerdict;
    if (occupantUuid !== undefined && occupantUuid !== sitter.uuid) return { allowed: false, reason: "SEAT_TAKEN" };
    return { allowed: true };
}
