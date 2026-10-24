/**
 * What the actions of the Desk Manager answer, shared by the server (which builds it) and the page (which words it in
 * the language of the administrator). Nothing here is shown as it is: these are codes and data.
 */

/** The actions of the page. */
export type DeskOp =
    | "assign"
    | "free"
    | "toggle"
    | "rename"
    | "claim"
    | "remove"
    | "create"
    | "bulkAssign"
    | "type"
    | "coOwners"
    | "tags"
    | "reserve"
    | "cancelReservation"
    | "clearPast";

/** Why an action was refused: a key of the `errors` of the desks messages. */
export type DeskErrorCode =
    | "notFound"
    | "mapProblem"
    | "changed"
    | "invalid"
    | "alreadyHasDesk"
    | "coOwnerHasDesk"
    | "occupied"
    | "occupiedRemove"
    | "occupiedType"
    | "unavailable"
    | "layout"
    | "hotDesk"
    | "notShared"
    | "hasReservations"
    | "hasReservationsRemove"
    | "hasCoOwners"
    | "tooManyCoOwners"
    | "badTags"
    | "reservation";

/** A refused reservation (a key of `errors.reservation`), with what its message needs. Instants are ISO 8601, UTC. */
export type ReservationRefusal =
    | { kind: "invalidPeriod" | "past" | "hasHolders" }
    | { kind: "tooLong"; days: number }
    | { kind: "tooFar"; days: number }
    | { kind: "tooMany"; max: number }
    | { kind: "overlap"; person: string; start: string; end: string }
    | { kind: "personBusy"; desk: string; start: string; end: string };
