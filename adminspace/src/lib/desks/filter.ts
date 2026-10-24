/** Searching and filtering the desks of the Desk Manager: what the page asks for in its URL, and what matches it. */
import { DESK_STATUSES, DESK_TYPES, type DeskStatus, type DeskType } from "./model";

export interface DeskFilters {
    /** Text to find in the name of a desk, or in the name or email of a person it belongs to or is kept for. */
    q: string;
    status: DeskStatus | null;
    /** Only the desks used this way. */
    type: DeskType | null;
    /** Only the desks of this room. */
    roomId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUERY = 100;

export function parseDeskFilters(params: URLSearchParams): DeskFilters {
    const status = params.get("status");
    const type = params.get("type");
    const room = params.get("room");
    return {
        q: (params.get("q") ?? "").trim().slice(0, MAX_QUERY),
        status: DESK_STATUSES.find((candidate) => candidate === status) ?? null,
        type: DESK_TYPES.find((candidate) => candidate === type) ?? null,
        roomId: room !== null && UUID.test(room) ? room.toLowerCase() : null,
    };
}

/** Somebody a desk is about: a co-owner, or a person it is kept for. */
export interface FilterablePerson {
    id: string;
    name?: string | null;
    email?: string | null;
}

export interface FilterableDesk {
    name: string;
    ownerId: string | null;
    status: DeskStatus;
    owner: { name: string | null; email: string | null } | null;
    /** "assigned" when not given. */
    deskType?: DeskType;
    /** The other people the desk is about, found by the search too. */
    people?: readonly FilterablePerson[];
}

/** Without regard to case or accents: "elodie" finds "Élodie". */
function plain(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

export function matchesDeskFilters(
    desk: FilterableDesk,
    filters: Pick<DeskFilters, "q" | "status"> & Partial<Pick<DeskFilters, "type">>,
): boolean {
    if (filters.status !== null && desk.status !== filters.status) return false;
    if (filters.type && (desk.deskType ?? "assigned") !== filters.type) return false;
    const query = plain(filters.q);
    if (query === "") return true;
    return [
        desk.name,
        desk.ownerId ?? "",
        desk.owner?.name ?? "",
        desk.owner?.email ?? "",
        ...(desk.people ?? []).flatMap((person) => [person.id, person.name ?? "", person.email ?? ""]),
    ].some((text) => plain(text).includes(query));
}
