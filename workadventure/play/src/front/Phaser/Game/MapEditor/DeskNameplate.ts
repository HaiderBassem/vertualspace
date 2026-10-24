import type { PersonalAreaPropertyData } from "@workadventure/map-editor";
import { activeReservation, deskHolderIds, deskTypeOf } from "@workadventure/map-editor";

/**
 * The little sign shown above each desk in the office: whose desk it is (even while they are away) and whether they are
 * at it, or that it is free, a hot desk, kept for somebody, or out of service. Decided here, without the game, so that it
 * can be tested.
 */

export type NameplateTone =
    /** Somebody's desk, and they are at it. */
    | "ownerHere"
    /** Somebody's desk, while they are not at it. */
    | "owned"
    /** Free: it can be claimed (or given by an administrator). */
    | "free"
    /** A hot desk. */
    | "hot"
    /** Kept for somebody right now. */
    | "reserved"
    /** Nobody owns it, and somebody sits at it now (a hot desk in use, a free desk borrowed). */
    | "occupied"
    /** Out of service. */
    | "disabled";

export interface Nameplate {
    text: string;
    tone: NameplateTone;
}

export interface NameplateTexts {
    free(): string;
    hot(): string;
    keptFor(args: { name: string }): string;
    outOfService(): string;
    taken(): string;
}

export interface NameplateContext {
    /** The name of the owner, when known (saved on the desk, or the owner is in the office). */
    ownerName: string | undefined;
    /** One of the people the desk belongs to is at it. */
    ownerHere: boolean;
    /** The name of whoever sits at the desk now, if anybody does. */
    occupantName?: string;
    now: number;
}

/** The sign of a desk. */
export function nameplateFor(
    desk: Pick<
        PersonalAreaPropertyData,
        "ownerId" | "coOwnerIds" | "ownerName" | "deskType" | "reservations" | "disabled"
    >,
    context: NameplateContext,
    texts: NameplateTexts,
): Nameplate {
    if (deskHolderIds(desk).length > 0) {
        return {
            text: context.ownerName || desk.ownerName || texts.taken(),
            tone: context.ownerHere ? "ownerHere" : "owned",
        };
    }
    if (desk.disabled === true) {
        return { text: texts.outOfService(), tone: "disabled" };
    }
    if (context.occupantName) {
        return { text: context.occupantName, tone: "occupied" };
    }
    const reservation = activeReservation(desk, context.now);
    if (reservation) {
        return { text: texts.keptFor({ name: reservation.userName || texts.taken() }), tone: "reserved" };
    }
    return deskTypeOf(desk) === "hot" ? { text: texts.hot(), tone: "hot" } : { text: texts.free(), tone: "free" };
}

/** The background of a sign, by tone: readable white text on each. */
export const NAMEPLATE_BACKGROUNDS: Record<NameplateTone, string> = {
    ownerHere: "#15803d",
    owned: "#334155",
    free: "#0f766e",
    hot: "#b45309",
    reserved: "#1d4ed8",
    occupied: "#0e7490",
    disabled: "#52525b",
};
