/**
 * What the Desk Manager page and its parts share: the shapes of the page data, how each state looks (badges and floor
 * plan, never by color alone), and the words for the answer of an action.
 */
import type { SubmitFunction } from "@sveltejs/kit";
import type { BulkLine } from "$lib/desks/bulk";
import type { DeskErrorCode, ReservationRefusal } from "$lib/desks/feedback";
import type { DeskStatus, DeskType } from "$lib/desks/model";
import type { I18n } from "$lib/i18n/context";
import type { PageData } from "./$types";

export type RoomView = PageData["rooms"][number];
export type DeskRow = RoomView["desks"][number];
export type ReservationRow = DeskRow["reservations"][number];

/** What the last action answered, read loosely: its shape depends on the action. */
export interface Feedback {
    op?: string;
    roomId?: string;
    deskId?: string;
    deskName?: string;
    person?: string;
    otherDesk?: string;
    count?: number;
    reservedCount?: number;
    max?: number;
    success?: string;
    error?: DeskErrorCode;
    deskType?: DeskType;
    start?: string;
    end?: string;
    layout?: { kind: string; number?: number; max?: number };
    problem?: ReservationRefusal;
    report?: BulkLine[];
}

export const STATUS_BADGE: Record<DeskStatus, string> = {
    available: "badge badge-success",
    hot: "badge badge-success",
    kept: "badge badge-warning",
    claimed: "badge badge-accent",
    reserved: "badge badge-accent",
    shared: "badge badge-accent",
    disabled: "badge",
};

/**
 * How a desk of each state is drawn on the floor plan. Free desks are green, desks that belong to people blue, desks
 * reserved now hatched, out of service grey; the outline (solid, dotted, dashed, dash-dot, double) tells them apart
 * without color, and the legend names each one.
 */
export function planStyle(status: DeskStatus, hatchId: string, strokeWidth = 3): string {
    const stroke = (color: string, dash?: string) =>
        `stroke: var(${color}); stroke-width: ${strokeWidth};${dash ? ` stroke-dasharray: ${dash};` : ""}`;
    switch (status) {
        case "available":
            return `fill: var(--success-soft); ${stroke("--success")}`;
        case "hot":
            return `fill: var(--success-soft); ${stroke("--success", `${strokeWidth * 0.7} ${strokeWidth * 2}`)} stroke-linecap: round;`;
        case "kept":
            return `fill: url(#${hatchId}); ${stroke("--warning")}`;
        case "claimed":
            return `fill: var(--accent-soft); ${stroke("--accent")}`;
        case "reserved":
            return `fill: var(--accent-soft); ${stroke("--accent", `${strokeWidth * 4} ${strokeWidth * 1.5} ${strokeWidth} ${strokeWidth * 1.5}`)}`;
        case "shared":
            return `fill: var(--accent-soft); ${stroke("--accent")}`;
        case "disabled":
            return `fill: var(--surface-muted); ${stroke("--text-subtle", `${strokeWidth * 3} ${strokeWidth * 2.4}`)}`;
    }
}

/** A shared desk gets a second, inner outline: several people. */
export const DOUBLE_OUTLINE: ReadonlySet<DeskStatus> = new Set(["shared"]);

/** The name to show for a person: their name, else their email, else what identifies them. */
export function personName(info: { name: string | null; email: string | null } | null, id: string): string {
    return info?.name || info?.email || id;
}

/** Who a desk belongs to, as shown: its owner. */
export function ownerName(desk: DeskRow): string {
    return desk.ownerId === null ? "" : personName(desk.owner, desk.ownerId);
}

/** How many people a desk belongs to (its owner and, on a shared desk, its co-owners). */
export function holderCount(desk: DeskRow): number {
    return (desk.ownerId ? 1 : 0) + desk.coOwners.length;
}

/** The reservations going on or to come, by start. */
export function liveReservations(desk: DeskRow): ReservationRow[] {
    return desk.reservations.filter((reservation) => reservation.phase !== "past");
}

/** The person a reservation is for, as shown. */
export function reservedFor(reservation: ReservationRow): string {
    return reservation.person?.name || reservation.userName || reservation.person?.email || reservation.userId;
}

/** "Oct 27, 2026, 9:00 AM – Oct 27, 2026, 6:00 PM", in the viewer's language and time zone. */
export function period(i18n: I18n, start: string, end: string): string {
    return i18n.t(i18n.m.desks.reservations.period, { start: i18n.dateTime(start), end: i18n.dateTime(end) });
}

/** Whether the answer of the last action is about this desk. */
export function isAbout(feedback: Feedback | null, roomId: string, deskId: string, ops: readonly string[]): boolean {
    return !!feedback && feedback.roomId === roomId && feedback.deskId === deskId && ops.includes(feedback.op ?? "");
}

/**
 * `use:enhance` with a busy state: `busy(true)` while the action runs, so that its button can say so and not be pressed
 * twice. The page is updated as SvelteKit does by default.
 */
export function tracked(busy: (on: boolean) => void): SubmitFunction {
    return () => {
        busy(true);
        return async ({ update }) => {
            try {
                await update();
            } finally {
                busy(false);
            }
        };
    };
}

/** The words for the answer of an action, or null when there is nothing to say. */
export function feedbackMessage(f: Feedback | null, i18n: I18n): { tone: "success" | "danger"; text: string } | null {
    if (!f) return null;
    const d = i18n.m.desks;
    const desk = f.deskName ?? "";
    const success = (text: string) => ({ tone: "success" as const, text });
    const danger = (text: string) => ({ tone: "danger" as const, text });
    if (f.success) {
        switch (f.success) {
            case "assigned":
                return success(i18n.t(d.success.assigned, { desk, person: f.person ?? "" }));
            case "freed":
                return success(i18n.t(d.success.freed, { desk }));
            case "disabled":
                return success(i18n.t(d.success.disabled, { desk }));
            case "enabled":
                return success(i18n.t(d.success.enabled, { desk }));
            case "renamed":
                return success(i18n.t(d.success.renamed, { desk }));
            case "claim":
                return success(i18n.t(d.success.claim, { desk }));
            case "removed":
                return success(i18n.p(d.success.removed, f.count ?? 0));
            case "created":
                return success(i18n.p(d.success.created, f.count ?? 0));
            case "bulk": {
                const assigned = i18n.p(d.success.bulk, f.count ?? 0);
                return success(
                    f.reservedCount ? `${assigned} ${i18n.p(d.success.bulkReserved, f.reservedCount)}` : assigned,
                );
            }
            case "typeChanged":
                return success(i18n.t(d.success.typeChanged[f.deskType ?? "assigned"], { desk }));
            case "coOwners":
                return success(i18n.t(d.success.coOwners, { desk }));
            case "tags":
                return success(i18n.t(d.success.tags, { desk }));
            case "reserved":
                return success(
                    i18n.t(d.success.reserved, {
                        desk,
                        person: f.person ?? "",
                        period: f.start && f.end ? period(i18n, f.start, f.end) : "",
                    }),
                );
            case "reservationCancelled":
                return success(i18n.t(d.success.reservationCancelled, { desk, person: f.person ?? "" }));
            case "pastCleared":
                return success(i18n.p(d.success.pastCleared, f.count ?? 0));
            default:
                return null;
        }
    }
    switch (f.error) {
        case undefined:
            return null;
        case "layout": {
            const kind = (f.layout?.kind ?? "invalid") as keyof typeof d.errors.layout;
            return danger(
                i18n.t(d.errors.layout[kind] ?? d.errors.layout.invalid, {
                    number: f.layout?.number ?? 0,
                    max: f.layout?.max ?? 0,
                }),
            );
        }
        case "reservation": {
            const problem = f.problem ?? { kind: "invalidPeriod" };
            const texts = d.errors.reservation;
            switch (problem.kind) {
                case "tooLong":
                case "tooFar":
                    return danger(i18n.t(texts[problem.kind], { days: problem.days }));
                case "tooMany":
                    return danger(i18n.t(texts.tooMany, { desk, max: problem.max }));
                case "overlap":
                    return danger(
                        i18n.t(texts.overlap, {
                            desk,
                            person: problem.person,
                            period: period(i18n, problem.start, problem.end),
                        }),
                    );
                case "personBusy":
                    return danger(
                        i18n.t(texts.personBusy, {
                            desk: problem.desk,
                            period: period(i18n, problem.start, problem.end),
                        }),
                    );
                default:
                    return danger(i18n.t(texts[problem.kind], { desk }));
            }
        }
        case "alreadyHasDesk":
        case "coOwnerHasDesk":
            return danger(i18n.t(d.errors[f.error], { desk: f.otherDesk ?? "", person: f.person ?? "" }));
        case "tooManyCoOwners":
        case "badTags":
            return danger(i18n.t(d.errors[f.error], { max: f.max ?? 0 }));
        default:
            return danger(i18n.t(d.errors[f.error], { desk }));
    }
}
