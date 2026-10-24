import { get } from "svelte/store";
import type { LocalizedString } from "typesafe-i18n";
import LL from "../../../../i18n/i18n-svelte";

/**
 * When the server refuses a command of the map editor, its reason starts with a code, such as "DESK_TAKEN: ...".
 * The codes are those of map-storage (PersonalDeskPolicy and EntityEditPolicy).
 */
const DENIAL_CODE = /^(DESK_[A-Z_]+|BOOKING_[A-Z_]+|ENTITY_OUTSIDE_EDITABLE_AREA): /;

export function parseEditDenialCode(reason: string): string | undefined {
    return DENIAL_CODE.exec(reason)?.[1];
}

/**
 * The message that tells the user why the server refused their change, in their language, or undefined when the reason
 * is not one that has a message of its own (the generic "your change was not saved" is shown then).
 */
export function getEditDenialMessage(reason: string): LocalizedString | undefined {
    const messages = get(LL);
    switch (parseEditDenialCode(reason)) {
        case "DESK_TAKEN":
            return messages.area.personalArea.errors.taken();
        case "DESK_NOT_CLAIMABLE":
            return messages.area.personalArea.errors.notClaimable();
        case "DESK_DISABLED":
            return messages.area.personalArea.errors.disabled();
        case "DESK_NOT_ELIGIBLE":
            return messages.area.personalArea.errors.notEligible();
        case "DESK_ALREADY_OWNED":
            return messages.area.personalArea.errors.alreadyOwned();
        case "DESK_NOT_BOOKABLE":
            return messages.area.personalArea.errors.notBookable();
        case "BOOKING_INVALID":
            return messages.area.personalArea.errors.bookingInvalid();
        case "BOOKING_CONFLICT":
            return messages.area.personalArea.errors.bookingConflict();
        case "BOOKING_DOUBLE":
            return messages.area.personalArea.errors.bookingDouble();
        case "BOOKING_LIMIT":
            return messages.area.personalArea.errors.bookingLimit();
        case "ENTITY_OUTSIDE_EDITABLE_AREA":
            return messages.mapEditor.entityEditor.errors.cannotPlaceHere();
        default:
            return undefined;
    }
}
