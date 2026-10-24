/**
 * The bookings a hot desk card offers, in the viewer's own time: for the next two hours, for the rest of the working day,
 * and for tomorrow's working day. Each one stays within the limits of DESK_BOOKING_RULES.
 */

export type DeskBookingSlotKind = "nextHours" | "restOfDay" | "tomorrow";

export interface DeskBookingSlot {
    kind: DeskBookingSlotKind;
    start: string;
    end: string;
}

/** The working day, in local hours. */
export const WORKDAY_START_HOUR = 9;
export const WORKDAY_END_HOUR = 19;
const NEXT_HOURS = 2;
const HOUR = 3_600_000;

function atHour(day: Date, hour: number): Date {
    const date = new Date(day);
    date.setHours(hour, 0, 0, 0);
    return date;
}

export function deskBookingSlots(now: number): DeskBookingSlot[] {
    const today = new Date(now);
    const slots: DeskBookingSlot[] = [
        {
            kind: "nextHours",
            start: new Date(now).toISOString(),
            end: new Date(now + NEXT_HOURS * HOUR).toISOString(),
        },
    ];
    // The rest of the working day (all of it, early in the morning). It only means something when it lasts longer than
    // the next hours.
    const start = Math.max(now, atHour(today, WORKDAY_START_HOUR).getTime());
    const endOfDay = atHour(today, WORKDAY_END_HOUR);
    if (endOfDay.getTime() - start > NEXT_HOURS * HOUR) {
        slots.push({ kind: "restOfDay", start: new Date(start).toISOString(), end: endOfDay.toISOString() });
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    slots.push({
        kind: "tomorrow",
        start: atHour(tomorrow, WORKDAY_START_HOUR).toISOString(),
        end: atHour(tomorrow, WORKDAY_END_HOUR).toISOString(),
    });
    return slots;
}
