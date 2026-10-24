import { isDeepStrictEqual } from "util";
import { AreaDataProperties, type AreaData, type DeskReservation } from "@workadventure/map-editor";
import type { ModifyAreaMessage } from "@workadventure/messages";

/**
 * When the given modifyAreaMessage changes nothing of a desk but its reservations, returns the reservations it wants to
 * store. Returns undefined for any other change (geometry, another property, another field of the desk...).
 *
 * Like isModifyAreaMessageOnlyClaim, this lets users without map edit rights book a hot desk, and nothing else; which
 * bookings they may make is decided by evaluateDeskBooking.
 */
export function bookingChangeOf(
    message: ModifyAreaMessage,
    existingArea: AreaData | undefined,
): DeskReservation[] | undefined {
    if (!existingArea || !message.modifyProperties || !message.properties) return undefined;
    if (
        (message.x !== undefined && message.x !== existingArea.x) ||
        (message.y !== undefined && message.y !== existingArea.y) ||
        (message.width !== undefined && message.width !== existingArea.width) ||
        (message.height !== undefined && message.height !== existingArea.height)
    ) {
        return undefined;
    }
    const nextProperties = AreaDataProperties.safeParse(message.properties).data;
    if (!nextProperties || nextProperties.length !== existingArea.properties.length) return undefined;

    let nextReservations: DeskReservation[] | undefined;
    for (const existingProperty of existingArea.properties) {
        const nextProperty = nextProperties.find((candidate) => candidate.id === existingProperty.id);
        if (!nextProperty || nextProperty.type !== existingProperty.type) return undefined;
        if (existingProperty.type === "personalAreaPropertyData" && nextProperty.type === "personalAreaPropertyData") {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { reservations: _, ...existingWithoutReservations } = existingProperty;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { reservations: __, ...nextWithoutReservations } = nextProperty;
            if (!isDeepStrictEqual(existingWithoutReservations, nextWithoutReservations)) return undefined;
            if (isDeepStrictEqual(existingProperty.reservations ?? [], nextProperty.reservations ?? [])) {
                return undefined;
            }
            nextReservations = nextProperty.reservations ?? [];
        } else if (!isDeepStrictEqual(existingProperty, nextProperty)) {
            return undefined;
        }
    }
    return nextReservations;
}
