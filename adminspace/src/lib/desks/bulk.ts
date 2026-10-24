/**
 * "Assign or reserve several desks": the lines an administrator pastes, and the report of what became of each.
 *
 *     Desk 1, alice@company.com                          gives Desk 1 to Alice
 *     Desk 2, bob@company.com, 2026-11-02..2026-11-06    keeps Desk 2 for Bob on those days (whole days)
 *     Desk 3, carol@company.com, 2026-11-02              keeps Desk 3 for Carol on that day
 */

export const MAX_BULK_LINES = 100;

export type BulkLineStatus =
    /** The desk was given to the person. */
    | "ok"
    /** The desk is kept for the person on those days. */
    | "reserved"
    | "notFound"
    | "ambiguous"
    | "invalid"
    | "occupied"
    | "alreadyHasDesk"
    | "changed"
    | "failed"
    /** A hot desk is given to nobody. */
    | "hotDesk"
    /** The desk has reservations to come, which a line cannot cancel. */
    | "hasReservations"
    /** The days cannot be read. */
    | "invalidDays"
    // Why a reservation was refused (see ReservationProblem in model.ts).
    | "hasHolders"
    | "overlap"
    | "past"
    | "tooLong"
    | "tooFar"
    | "tooMany"
    /** The person has another desk kept for them at that time. */
    | "personBusy";

export interface BulkLine {
    line: number;
    status: BulkLineStatus;
    desk: string;
    person: string;
    /** The days, as typed, for a reservation. */
    days?: string;
    /** The desk the person already has, for "alreadyHasDesk" and "personBusy". */
    other?: string;
}

export interface BulkDays {
    /** First and last day, "YYYY-MM-DD", both included. */
    first: string;
    last: string;
}

export interface BulkRequest {
    line: number;
    desk: string;
    person: string;
    /** The days typed after the person, as typed ("" when none: the line assigns the desk). */
    daysText: string;
    /** The days, when they could be read. */
    days: BulkDays | null;
}

/** Splits on the first comma, semicolon or tab. */
function cut(text: string): [string, string | null] {
    const at = text.search(/[,;\t]/);
    return at === -1 ? [text.trim(), null] : [text.slice(0, at).trim(), text.slice(at + 1).trim()];
}

/** Whether "YYYY-MM-DD" is a day of the calendar. */
function isDay(text: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return false;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "2026-11-02..2026-11-06" or "2026-11-02", in order; null when they cannot be read. */
export function parseBulkDays(text: string): BulkDays | null {
    const match = /^(\d{4}-\d{2}-\d{2})(?:\s*(?:\.\.|–|—)\s*(\d{4}-\d{2}-\d{2}))?$/.exec(text.trim());
    if (!match) return null;
    const first = match[1]!;
    const last = match[2] ?? first;
    return isDay(first) && isDay(last) && first <= last ? { first, last } : null;
}

/** The day after "YYYY-MM-DD". */
export function nextDay(day: string): string {
    const [year, month, date] = day.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/** "Desk 1, alice@company.com[, days]": the name of the desk, the person, then the days of a reservation if any. */
export function parseBulkLines(text: string): BulkRequest[] {
    return text
        .split(/\r?\n/)
        .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
        .filter(({ raw }) => raw !== "")
        .map(({ raw, line }) => {
            const [desk, rest] = cut(raw);
            const [person, daysText] = rest === null ? ["", null] : cut(rest);
            const days = daysText ?? "";
            return { line, desk, person, daysText: days, days: days === "" ? null : parseBulkDays(days) };
        });
}
