import type { AreaData, DeskBookingDenialReason, DeskType, PersonalAreaPropertyData } from "@workadventure/map-editor";
import {
    activeReservation,
    deskHolderIds,
    deskTypeOf,
    evaluateDeskBooking,
    getDeskProperty,
    hasRequiredDeskTag,
    withBooking,
} from "@workadventure/map-editor";
import { deskBookingSlots, type DeskBookingSlot } from "./DeskBookingSlots";

/**
 * What the card of a desk says when somebody clicks it in the office: whose desk it is, whether they are at it right now,
 * and what the viewer can do with it. The decision is made here, without the game, so that it can be tested.
 */

/** Where the owner of a desk is: at their desk, elsewhere in the office, or not in the office. */
export type DeskPresence = "atDesk" | "inOffice" | "away";

export type DeskCardKind =
    /** The viewer's own desk (or a shared desk they are one of the owners of). */
    | "mine"
    /** Somebody else's desk. */
    | "taken"
    /** Free, and the viewer may claim it (unless they already have a desk). */
    | "free"
    /** A hot desk: nobody owns it, anyone it is open to sits at it. */
    | "hot"
    /** Free, but kept for somebody else right now. */
    | "reserved"
    /** Free, but only an administrator gives it. */
    | "assigned"
    /** Free, but out of service. */
    | "outOfService"
    /** Free, but reserved for a team the viewer is not in. */
    | "notForYou";

export interface DeskCardInfo {
    areaId: string;
    deskName: string;
    kind: DeskCardKind;
    deskType: DeskType;
    ownerId: string | null;
    /** Display name of the owner, when known (saved on the desk, or the owner is in the office). */
    ownerName?: string;
    /** Where the owner is now ("mine": where the viewer is). */
    presence?: DeskPresence;
    /** The viewer already has a desk (a free desk can then not be claimed). */
    viewerHasDesk: boolean;
    /** The desk is kept for somebody right now. */
    reservation?: { userId: string; userName?: string; end: string; forViewer: boolean };
    /** Who sits at the desk right now, when it is somebody else than the viewer. */
    occupantName?: string;
    /** A free seat of the desk that the viewer may sit on now. */
    seatId?: string;
    /** The viewer sits at this desk. */
    viewerSitting?: boolean;
    /** On a hot desk the viewer may book: the bookings offered, and whether each one is possible. */
    bookingSlots?: (DeskBookingSlot & { available: boolean; reason?: DeskBookingDenialReason })[];
    /** The bookings of this desk the viewer holds, going on or to come, soonest first. */
    viewerBookings: { id: string; start: string; end: string }[];
}

export interface DeskViewer {
    uuid: string | undefined;
    tags: readonly string[];
    hasDesk: boolean;
    /** The other desks of the map, so that a booking that overlaps one of the viewer's is not offered. */
    otherDesks?: Iterable<Pick<PersonalAreaPropertyData, "reservations">>;
}

/** The bookings a viewer can make on a desk now, each with whether the server will accept it. */
function bookingSlotsFor(
    desk: PersonalAreaPropertyData,
    viewer: DeskViewer,
    now: number,
): DeskCardInfo["bookingSlots"] {
    const userId = viewer.uuid;
    if (!userId || deskTypeOf(desk) !== "hot" || desk.disabled === true || !hasRequiredDeskTag(desk, viewer.tags)) {
        return undefined;
    }
    const otherDesks = [...(viewer.otherDesks ?? [])];
    // A time the viewer already booked this desk for is listed under their bookings, not offered again.
    const own = (desk.reservations ?? []).filter((booking) => booking.userId === userId);
    const alreadyMine = (slot: DeskBookingSlot) =>
        own.some(
            (booking) =>
                Date.parse(booking.start) < Date.parse(slot.end) && Date.parse(slot.start) < Date.parse(booking.end),
        );
    return deskBookingSlots(now)
        .filter((slot) => !alreadyMine(slot))
        .map((slot) => {
            const verdict = evaluateDeskBooking({
                desk,
                nextReservations: withBooking(desk, { id: "new", userId, start: slot.start, end: slot.end }, now),
                userId,
                userTags: viewer.tags,
                otherDesks,
                now,
            });
            return verdict.allowed
                ? { ...slot, available: true }
                : { ...slot, available: false, reason: verdict.reason };
        });
}

/** The card of a desk for a viewer, or undefined when the area is not a desk. */
export function describeDesk(
    area: Pick<AreaData, "id" | "name" | "properties">,
    viewer: DeskViewer,
    now: number = Date.now(),
): DeskCardInfo | undefined {
    const desk = getDeskProperty(area);
    if (!desk) return undefined;
    const holders = deskHolderIds(desk);
    const reservation = activeReservation(desk, now);
    const bookingSlots = bookingSlotsFor(desk, viewer, now);
    const base = {
        ...(bookingSlots ? { bookingSlots } : {}),
        areaId: area.id,
        deskName: area.name,
        deskType: deskTypeOf(desk),
        ownerId: desk.ownerId ?? holders[0] ?? null,
        viewerHasDesk: viewer.hasDesk,
        viewerBookings: (desk.reservations ?? [])
            .filter(
                (booking) =>
                    viewer.uuid !== undefined && booking.userId === viewer.uuid && Date.parse(booking.end) > now,
            )
            .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
            .map(({ id, start, end }) => ({ id, start, end })),
        ...(desk.ownerName ? { ownerName: desk.ownerName } : {}),
        ...(reservation
            ? {
                  reservation: {
                      userId: reservation.userId,
                      ...(reservation.userName ? { userName: reservation.userName } : {}),
                      end: reservation.end,
                      forViewer: viewer.uuid !== undefined && reservation.userId === viewer.uuid,
                  },
              }
            : {}),
    };
    // Whoever has a desk keeps it, even out of service: it is theirs first.
    if (holders.length > 0) {
        return { ...base, kind: viewer.uuid !== undefined && holders.includes(viewer.uuid) ? "mine" : "taken" };
    }
    if (desk.disabled === true) return { ...base, kind: "outOfService" };
    if (reservation && reservation.userId !== viewer.uuid) return { ...base, kind: "reserved" };
    if (base.deskType === "hot") {
        return { ...base, kind: hasRequiredDeskTag(desk, viewer.tags) || reservation ? "hot" : "notForYou" };
    }
    if (desk.accessClaimMode === "static" || base.deskType === "shared") return { ...base, kind: "assigned" };
    if (!reservation && !hasRequiredDeskTag(desk, viewer.tags)) return { ...base, kind: "notForYou" };
    return { ...base, kind: "free" };
}

interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Where somebody is relative to a desk, from their position in the office (undefined: not in the office). */
export function presenceAt(position: { x: number; y: number } | undefined, desk: Rectangle): DeskPresence {
    if (!position) return "away";
    const inside =
        position.x >= desk.x &&
        position.x <= desk.x + desk.width &&
        position.y >= desk.y &&
        position.y <= desk.y + desk.height;
    return inside ? "atDesk" : "inOffice";
}

/** The desk that contains a point of the map, if any. */
export function deskAt<T extends Pick<AreaData, "x" | "y" | "width" | "height" | "properties">>(
    areas: readonly T[],
    point: { x: number; y: number },
): T | undefined {
    return areas.find((area) => getDeskProperty(area) !== undefined && presenceAt(point, area) === "atDesk");
}
