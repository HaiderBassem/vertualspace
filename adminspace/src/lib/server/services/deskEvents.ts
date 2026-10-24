/**
 * What happens to desks, for whoever wants to hear about it (an integration posting to a chat, a calendar, a webhook).
 *
 * The desk service (desks.ts) calls `onDeskChanged()` after each change that has been saved in map-storage: a desk
 * given to someone, freed, kept for someone, or a reservation cancelled. Nothing listens by default, so this is a no-op
 * until something registers with `setDeskEventListener()`, typically once at start-up:
 *
 *     import { setDeskEventListener } from "$lib/server/services/deskEvents";
 *     setDeskEventListener(async (event) => { ... });
 *
 * A listener can never fail the change that triggered it: it is called once the change is saved, the service does not
 * wait for the promise it returns, and its errors are logged and dropped. It should return quickly and do any slow work
 * (network calls) asynchronously, and it must not rely on running before the page shows the result. Events carry
 * identifiers people are known by (emails), so a listener that sends them elsewhere must respect the organization's
 * data protection choices. This module imports nothing from the integrations on purpose: they depend on it, not the
 * other way round.
 */
import { describeError, logJson } from "../security/requestLog";

/** Where a desk is, and when its change was saved. */
export interface DeskEventBase {
    organizationId: string;
    worldId: string;
    roomId: string;
    deskId: string;
    deskName: string;
    /** ISO 8601, UTC. */
    at: string;
    /** The account of the administrator who made the change, or null when the system did (a person left). */
    actorAccountId: string | null;
}

/** A reservation, as events carry it. Instants are ISO 8601, UTC. */
export interface DeskEventReservation {
    id: string;
    userId: string;
    start: string;
    end: string;
}

export type DeskEvent = DeskEventBase &
    (
        | { type: "desk.assigned"; ownerId: string; previousOwnerId: string | null }
        | {
              type: "desk.released";
              previousOwnerId: string;
              /** "administrator": freed from the Desk Manager; "type_changed": it became a hot desk; "person_left". */
              reason: "administrator" | "type_changed" | "person_left";
          }
        | { type: "desk.reserved"; reservation: DeskEventReservation }
        | {
              type: "desk.reservation_cancelled";
              reservation: DeskEventReservation;
              /** "administrator": cancelled from the Desk Manager; the others: the desk was given to people. */
              reason: "administrator" | "assigned" | "shared" | "person_left";
          }
    );

export type DeskEventListener = (event: DeskEvent) => void | Promise<void>;

let listener: DeskEventListener | undefined;

/**
 * Registers the function called for every desk event (one at a time: a new one replaces the previous one; undefined
 * removes it). Returns a function that removes it again, if it is still the one registered.
 */
export function setDeskEventListener(next: DeskEventListener | undefined): () => void {
    listener = next;
    return () => {
        if (listener === next) listener = undefined;
    };
}

function failed(event: DeskEvent, error: unknown): void {
    logJson("error", "desk event listener failed", {
        type: event.type,
        organizationId: event.organizationId,
        deskId: event.deskId,
        error: describeError(error),
    });
}

/** Tells the listener, if there is one, about a change that was saved. Never throws, never waits for the listener. */
export function onDeskChanged(event: DeskEvent): void {
    const current = listener;
    if (!current) return;
    try {
        const result = current(event);
        if (result instanceof Promise) result.catch((error: unknown) => failed(event, error));
    } catch (error) {
        failed(event, error);
    }
}
