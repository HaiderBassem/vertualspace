import type { DeskReservation, DeskType, PersonalAreaPropertyData } from "../types";

/**
 * Whether a user with these tags is among those a desk is open to. A desk that asks for no tag is open to everyone.
 *
 * The browser uses this to offer a desk only to those who can claim it, and the server uses the very same rule to refuse
 * the others: they cannot disagree.
 */
export function hasRequiredDeskTag(
    desk: Pick<PersonalAreaPropertyData, "allowedTags">,
    userTags: readonly string[],
): boolean {
    return desk.allowedTags.length === 0 || desk.allowedTags.some((tag) => userTags.includes(tag));
}

/** How a desk is used. Desks made before desks had a type are personal desks ("assigned"). */
export function deskTypeOf(desk: Pick<PersonalAreaPropertyData, "deskType">): DeskType {
    return desk.deskType ?? "assigned";
}

/** The people a desk belongs to: its owner, and on a shared desk the co-owners too. */
export function deskHolderIds(desk: Pick<PersonalAreaPropertyData, "ownerId" | "coOwnerIds" | "deskType">): string[] {
    const holders: string[] = [];
    if (desk.ownerId) holders.push(desk.ownerId);
    if (deskTypeOf(desk) === "shared") {
        for (const coOwnerId of desk.coOwnerIds ?? []) {
            if (coOwnerId && !holders.includes(coOwnerId)) holders.push(coOwnerId);
        }
    }
    return holders;
}

/** Whether the desk belongs to this user (as its owner, or as a co-owner of a shared desk). */
export function isDeskHolder(
    desk: Pick<PersonalAreaPropertyData, "ownerId" | "coOwnerIds" | "deskType">,
    userId: string | undefined,
): boolean {
    return userId !== undefined && userId !== "" && deskHolderIds(desk).includes(userId);
}

function instant(value: string): number {
    return Date.parse(value);
}

/** Whether a reservation covers this instant. A reservation with an unreadable start or end covers nothing. */
export function isReservationActive(reservation: Pick<DeskReservation, "start" | "end">, now: number): boolean {
    const start = instant(reservation.start);
    const end = instant(reservation.end);
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && now < end;
}

/** The reservation that keeps the desk for someone right now, if any. */
export function activeReservation(
    desk: Pick<PersonalAreaPropertyData, "reservations">,
    now: number,
): DeskReservation | undefined {
    return (desk.reservations ?? []).find((reservation) => isReservationActive(reservation, now));
}

/** The reservation of this user that is going on now or comes next, if any. */
export function reservationFor(
    desk: Pick<PersonalAreaPropertyData, "reservations">,
    userId: string | undefined,
    now: number,
): DeskReservation | undefined {
    if (!userId) return undefined;
    return (desk.reservations ?? [])
        .filter((reservation) => reservation.userId === userId && instant(reservation.end) > now)
        .sort((a, b) => instant(a.start) - instant(b.start))[0];
}

/**
 * Whether a free desk can be claimed by a user with these tags: it is a personal desk open to claiming, in service, open
 * to them, and not kept for somebody else right now. Hot desks are never claimed (nobody owns them) and shared desks are
 * given by an administrator.
 */
export function isDeskClaimableBy(
    desk: Pick<
        PersonalAreaPropertyData,
        "accessClaimMode" | "allowedTags" | "disabled" | "ownerId" | "deskType" | "reservations"
    >,
    userTags: readonly string[],
    userId?: string,
    now: number = Date.now(),
): boolean {
    const reservation = activeReservation(desk, now);
    return (
        (desk.ownerId ?? null) === null &&
        deskTypeOf(desk) === "assigned" &&
        desk.accessClaimMode === "dynamic" &&
        desk.disabled !== true &&
        // The person a desk is kept for was chosen by an administrator: the tags of the desk do not apply to them.
        (reservation === undefined ? hasRequiredDeskTag(desk, userTags) : reservation.userId === userId)
    );
}
