import type { AreaData, DeskBookingDenialReason, PersonalAreaPropertyData } from "@workadventure/map-editor";
import {
    activeReservation,
    deskTypeOf,
    evaluateDeskBooking,
    hasRequiredDeskTag,
    isDeskHolder,
} from "@workadventure/map-editor";
import type { ModifyAreaMessage } from "@workadventure/messages";
import { isModifyAreaMessageOnlyClaim } from "./isModifyAreaMessageOnlyClaim";
import { bookingChangeOf } from "./isModifyAreaMessageOnlyBooking";

/**
 * Why a user without map edit rights was refused a change to a personal desk. The codes travel to the browser in the
 * error of the command, which shows the matching message.
 */
export type DeskDenialReason =
    /** Not a claim or a release of a desk: such users cannot edit a desk. */
    | "DESK_CHANGE_NOT_ALLOWED"
    /** Another employee owns the desk. */
    | "DESK_TAKEN"
    /**
     * Nobody can claim the desk by themselves: an administrator assigns it, it is a hot desk (nobody owns it) or a desk
     * shared by people an administrator chose.
     */
    | "DESK_NOT_CLAIMABLE"
    /** The desk is kept for somebody else right now. */
    | "DESK_RESERVED"
    /** An administrator took the desk out of service. */
    | "DESK_DISABLED"
    /** The user does not have a tag that this desk requires. */
    | "DESK_NOT_ELIGIBLE"
    /** The user already has a desk and must release it first. */
    | "DESK_ALREADY_OWNED"
    /** A booking of a hot desk was refused (see evaluateDeskBooking). */
    | DeskBookingDenialReason;

export type DeskChangeKind = "claim" | "release" | "book" | "cancel";

export type DeskChangeVerdict = { allowed: true; kind: DeskChangeKind } | { allowed: false; reason: DeskDenialReason };

export class DeskPolicyError extends Error {
    constructor(
        public readonly reason: DeskDenialReason,
        message: string,
    ) {
        super(`${reason}: ${message}`);
        this.name = "DeskPolicyError";
    }
}

function personalProperty(area: AreaData): PersonalAreaPropertyData | undefined {
    const property = area.properties.find((candidate) => candidate.type === "personalAreaPropertyData");
    return property?.type === "personalAreaPropertyData" ? property : undefined;
}

/**
 * Decides whether a user without map edit rights may make this change to a desk.
 *
 * Such a user can do exactly two things to a desk: claim a free one that they are eligible for and that is open to
 * claiming, and release their own. On a hot desk, they can also book it in their own name and cancel their booking.
 * Everything else is refused, however the request was built. The decision is made where the map is stored, inside the
 * lock of the map, so that two employees claiming (or booking) the same desk at the same time cannot both succeed, and
 * so that nobody can end up with two desks.
 */
export function evaluateDeskChange(
    message: ModifyAreaMessage,
    userUUID: string,
    userTags: readonly string[],
    existingArea: AreaData | undefined,
    allAreas: Iterable<AreaData>,
    now: number = Date.now(),
): DeskChangeVerdict {
    const property = existingArea ? personalProperty(existingArea) : undefined;
    if (!existingArea || !property || userUUID === "") {
        return { allowed: false, reason: "DESK_CHANGE_NOT_ALLOWED" };
    }

    // Booking a hot desk, or cancelling one's booking.
    const nextReservations = bookingChangeOf(message, existingArea);
    if (nextReservations) {
        const otherDesks: PersonalAreaPropertyData[] = [];
        for (const area of allAreas) {
            const other = personalProperty(area);
            if (area.id !== existingArea.id && other) otherDesks.push(other);
        }
        const verdict = evaluateDeskBooking({
            desk: property,
            nextReservations,
            userId: userUUID,
            userTags,
            otherDesks,
            now,
        });
        return verdict.allowed ? verdict : { allowed: false, reason: verdict.reason };
    }

    const ownerId = property.ownerId ?? null;
    if (ownerId !== null && ownerId !== userUUID) {
        return { allowed: false, reason: "DESK_TAKEN" };
    }
    if (!isModifyAreaMessageOnlyClaim(message, userUUID, existingArea)) {
        return { allowed: false, reason: "DESK_CHANGE_NOT_ALLOWED" };
    }
    if (ownerId === userUUID) {
        return { allowed: true, kind: "release" };
    }

    // A claim.
    if (property.accessClaimMode !== "dynamic" || deskTypeOf(property) !== "assigned") {
        return { allowed: false, reason: "DESK_NOT_CLAIMABLE" };
    }
    if (property.disabled === true) {
        return { allowed: false, reason: "DESK_DISABLED" };
    }
    const reservation = activeReservation(property, now);
    if (reservation && reservation.userId !== userUUID) {
        return { allowed: false, reason: "DESK_RESERVED" };
    }
    // The person a desk is kept for was chosen by an administrator: the tags of the desk do not apply to them.
    if (!reservation && !hasRequiredDeskTag(property, userTags)) {
        return { allowed: false, reason: "DESK_NOT_ELIGIBLE" };
    }
    for (const area of allAreas) {
        const other = personalProperty(area);
        // A co-owner of a shared desk already has a desk.
        if (area.id !== existingArea.id && other && isDeskHolder(other, userUUID)) {
            return { allowed: false, reason: "DESK_ALREADY_OWNED" };
        }
    }
    return { allowed: true, kind: "claim" };
}

/**
 * What is stored for a claim or a release of a user without map edit rights, once allowed: a released desk does not
 * keep the name of its former owner, whatever the browser sent.
 */
export function normalizeDeskChange(message: ModifyAreaMessage, kind: DeskChangeKind): void {
    if (kind !== "release" || !message.properties) return;
    message.properties = message.properties.map((property: unknown) =>
        typeof property === "object" &&
        property !== null &&
        (property as { type?: unknown }).type === "personalAreaPropertyData"
            ? { ...property, ownerName: null }
            : property,
    );
}

/** Throws a DeskPolicyError unless the change is allowed. Returns what kind of change it is. */
export function assertDeskChangeAllowed(
    message: ModifyAreaMessage,
    userUUID: string,
    userTags: readonly string[],
    existingArea: AreaData | undefined,
    allAreas: Iterable<AreaData>,
    now: number = Date.now(),
): DeskChangeKind {
    const verdict = evaluateDeskChange(message, userUUID, userTags, existingArea, allAreas, now);
    if (!verdict.allowed) {
        throw new DeskPolicyError(
            verdict.reason,
            `user ${userUUID} may not make this change to the desk ${message.id}`,
        );
    }
    return verdict.kind;
}
