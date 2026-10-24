/**
 * Desks of an office, as an administrator manages them.
 *
 * A desk is an area of a room's WAM file (in map-storage) that carries a `personalAreaPropertyData` property: the
 * property of WorkAdventure's personal areas. WorkAdventure itself enforces what employees can do with a desk: who may
 * claim it and who may sit at it (libs/map-editor/src/PersonalDesk/DeskEligibility.ts and SitPolicy.ts, applied by
 * map-storage and the back). What is here is the administrator's side: reading desks from a WAM file, saying what state
 * each one is in, and building the JSON Patch that changes them. There is no second desk database: the WAM file is the
 * only place a desk lives.
 *
 * How a desk is used (`deskType`, absent in the file meaning "assigned"):
 * - "assigned", a personal desk: it belongs to one person, who claims it or is given it by an administrator.
 * - "hot": it belongs to nobody. Anyone it is open to sits at it while a seat is free.
 * - "shared": it belongs to its owner and to co-owners (`coOwnerIds`) that an administrator chooses.
 * The people a desk belongs to (its holders) are the only ones who can sit at it, even while it is out of service. A
 * desk that belongs to nobody can be kept for one person for a while (`reservations`): during that time only they sit
 * at it, and only they can claim it.
 *
 * Every patch starts with `test` operations on what the administrator saw (the desk at that position, its owner, ...):
 * if somebody claimed, released or changed the desk in the meantime, map-storage refuses the whole patch, and nothing is
 * changed on a stale view. A JSON Patch cannot test that a key is absent: when a key that a change depends on is not in
 * the file, the change tests the whole property instead (see `guard`).
 */
import { z } from "zod";

/** A JSON Patch operation, in the subset that desk management needs. */
export type DeskPatchOperation =
    | { op: "test"; path: string; value: unknown }
    | { op: "add"; path: string; value: unknown }
    | { op: "remove"; path: string };

export type DeskClaimMode = "dynamic" | "static";

/** How a desk is used. Desks made before desks had a type are personal desks ("assigned"). */
export type DeskType = "assigned" | "hot" | "shared";

export const DESK_TYPES: readonly DeskType[] = ["assigned", "hot", "shared"];

export type SeatDirection = "Left" | "Up" | "Down" | "Right";

/** A place to sit drawn in the map picture, at a point in pixels of the map. */
export interface DeskSeat {
    x: number;
    y: number;
    /** The way the person sitting faces. */
    direction: SeatDirection;
}

/** A desk kept for one person for a while. Instants are ISO 8601 strings in UTC; the end is not included. */
export interface DeskReservation {
    id: string;
    /** Who it is kept for: their identifier in WorkAdventure (the lower-case email of a signed-in person). */
    userId: string;
    /** Their name, shown on the desk in the office while it is kept for them. */
    userName?: string;
    start: string;
    end: string;
}

export interface DeskRecord {
    /** Position of the area in the `areas` of the WAM file. */
    areaIndex: number;
    /** Position of the personal area property among the properties of the area. */
    propertyIndex: number;
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    /** Identifier of the employee who has the desk (their `userUuid` in WorkAdventure: the email of a signed-in one). */
    ownerId: string | null;
    /** "dynamic": employees claim it themselves. "static": an administrator assigns it. */
    claimMode: DeskClaimMode;
    /** Out of service: nobody can claim it, and only the people it belongs to can sit at it. */
    disabled: boolean;
    /** When not empty, only users holding one of these tags can claim it or sit at it. */
    allowedTags: string[];
    /** How the desk is used: "assigned" when the file does not say. */
    deskType: DeskType;
    /** The other people the desk belongs to, as stored. WorkAdventure only counts them on a shared desk. */
    coOwnerIds: string[];
    /** The name shown on the desk in the office while its owner is away. */
    ownerName: string | null;
    /** The times when the desk is kept for someone, in the order of the file. */
    reservations: DeskReservation[];
    /** Places to sit drawn in the map picture. Chairs placed as objects are found by WorkAdventure itself. */
    seats: DeskSeat[];
    /**
     * The property as stored. The checks of a change test its keys; a key that is not stored at all cannot be tested,
     * so such a desk is guarded by its whole property instead (see `guard`).
     */
    stored: Readonly<Record<string, unknown>>;
}

const ReservationShape = z.object({
    id: z.string(),
    userId: z.string(),
    userName: z.string().optional(),
    start: z.string(),
    end: z.string(),
});

const SeatShape = z.object({
    x: z.number(),
    y: z.number(),
    direction: z.enum(["Left", "Up", "Down", "Right"]),
});

const PersonalAreaProperty = z
    .object({
        type: z.literal("personalAreaPropertyData"),
        accessClaimMode: z.enum(["dynamic", "static"]).catch("dynamic"),
        ownerId: z.string().nullable().optional(),
        disabled: z.boolean().optional(),
        allowedTags: z.array(z.string()).optional(),
        deskType: z.enum(["assigned", "hot", "shared"]).optional().catch(undefined),
        coOwnerIds: z.array(z.string()).optional().catch(undefined),
        ownerName: z.string().nullable().optional().catch(undefined),
        reservations: z.array(z.unknown()).optional().catch(undefined),
        seats: z.array(z.unknown()).optional().catch(undefined),
    })
    .passthrough();

const AreaShape = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        properties: z.array(z.unknown()).optional(),
    })
    .passthrough();

/** The entries of a list that have the given shape; the others are ignored. */
function entriesOf<T>(shape: z.ZodType<T>, entries: readonly unknown[] | undefined): T[] {
    return (entries ?? []).flatMap((entry) => {
        const parsed = shape.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
}

/** The desks among the areas of a WAM file, in the order of the file. Anything that is not a desk is ignored. */
export function extractDesks(areas: readonly unknown[]): DeskRecord[] {
    const desks: DeskRecord[] = [];
    areas.forEach((candidate, areaIndex) => {
        const area = AreaShape.safeParse(candidate);
        if (!area.success) return;
        const properties = area.data.properties ?? [];
        for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
            const stored = properties[propertyIndex];
            const property = PersonalAreaProperty.safeParse(stored);
            if (!property.success) continue;
            const data = property.data;
            desks.push({
                areaIndex,
                propertyIndex,
                id: area.data.id,
                name: area.data.name ?? "",
                x: area.data.x,
                y: area.data.y,
                width: area.data.width,
                height: area.data.height,
                ownerId: data.ownerId ?? null,
                claimMode: data.accessClaimMode,
                disabled: data.disabled === true,
                allowedTags: data.allowedTags ?? [],
                deskType: data.deskType ?? "assigned",
                coOwnerIds: data.coOwnerIds ?? [],
                ownerName: data.ownerName ?? null,
                reservations: entriesOf(ReservationShape, data.reservations),
                seats: entriesOf(SeatShape, data.seats),
                stored: stored as Readonly<Record<string, unknown>>,
            });
            break;
        }
    });
    return desks;
}

// ---------------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------------

/**
 * The identifier under which WorkAdventure knows a person. Signed-in people are identified by their email, which is
 * compared without regard to case: an assignment typed with capitals must still match the person when they sign in.
 */
export function normalizeOwnerId(input: string): string {
    const trimmed = input.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

/** The longest identifier of a person (the longest email address). */
export const MAX_PERSON_ID_LENGTH = 320;

/** Whether two identifiers are the same person. */
export function samePerson(a: string | null | undefined, b: string | null | undefined): boolean {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/** The people a desk belongs to, as WorkAdventure counts them: its owner, and on a shared desk the co-owners too. */
export function deskHolderIds(desk: Pick<DeskRecord, "ownerId" | "deskType" | "coOwnerIds">): string[] {
    const holders: string[] = [];
    if (desk.ownerId) holders.push(desk.ownerId);
    if (desk.deskType === "shared") {
        for (const coOwnerId of desk.coOwnerIds) {
            if (coOwnerId && !holders.some((holder) => samePerson(holder, coOwnerId))) holders.push(coOwnerId);
        }
    }
    return holders;
}

/** Whether the desk belongs to this person (as its owner, or as a co-owner of a shared desk). */
export function isDeskHolder(desk: Pick<DeskRecord, "ownerId" | "deskType" | "coOwnerIds">, person: string): boolean {
    return deskHolderIds(desk).some((holder) => samePerson(holder, person));
}

/** Names shown on a desk in the office are at most this long (WorkAdventure's schema). */
export const MAX_NAME_ON_DESK = 64;

/** A name as it can be shown on a desk: on one line, at most 64 characters, or null when there is none. */
export function nameOnDesk(name: string | null | undefined): string | null {
    const clean = (name ?? "").replace(/\s+/g, " ").trim();
    if (clean === "") return null;
    if (clean.length <= MAX_NAME_ON_DESK) return clean;
    let cut = clean.slice(0, MAX_NAME_ON_DESK);
    // Never cut a character in two (a UTF-16 surrogate pair).
    if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
    return cut.trimEnd();
}

/** At most this many co-owners on a shared desk. */
export const MAX_CO_OWNERS = 20;

export type CoOwnersProblem = { kind: "invalid" } | { kind: "tooMany"; max: number };

/**
 * The co-owners as they are stored: identifiers normalized like an owner, each one once, empty entries and the owner
 * left out (the owner already has the desk).
 */
export function normalizeCoOwnerIds(
    input: readonly string[],
    ownerId: string | null,
): { ok: true; ids: string[] } | { ok: false; problem: CoOwnersProblem } {
    const ids: string[] = [];
    for (const raw of input) {
        const id = normalizeOwnerId(raw);
        if (id === "") continue;
        if (id.length > MAX_PERSON_ID_LENGTH || /\s/.test(id)) return { ok: false, problem: { kind: "invalid" } };
        if (samePerson(id, ownerId) || ids.some((other) => samePerson(other, id))) continue;
        ids.push(id);
    }
    if (ids.length > MAX_CO_OWNERS) return { ok: false, problem: { kind: "tooMany", max: MAX_CO_OWNERS } };
    return { ok: true, ids };
}

// ---------------------------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------------------------

export type ReservationPhase =
    /** It keeps the desk for its person right now. */
    | "active"
    /** It starts later. */
    | "upcoming"
    /** It is over, or its times cannot be read (WorkAdventure then ignores it). */
    | "past";

const DAY_MS = 86_400_000;

/** Where a reservation stands at this instant. Like WorkAdventure: active when start <= now < end. */
export function reservationPhase(reservation: Pick<DeskReservation, "start" | "end">, now: number): ReservationPhase {
    const start = Date.parse(reservation.start);
    const end = Date.parse(reservation.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start || end <= now) return "past";
    return start <= now ? "active" : "upcoming";
}

/** The reservation that keeps the desk for someone right now, if any (the first in the file, as in WorkAdventure). */
export function activeReservation(desk: Pick<DeskRecord, "reservations">, now: number): DeskReservation | undefined {
    return desk.reservations.find((reservation) => reservationPhase(reservation, now) === "active");
}

/** The reservations that are going on or to come, by start. */
export function liveReservations(desk: Pick<DeskRecord, "reservations">, now: number): DeskReservation[] {
    return desk.reservations
        .filter((reservation) => reservationPhase(reservation, now) !== "past")
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Whether two reservations share an instant (one that ends when the other starts does not). */
export function reservationsOverlap(
    a: Pick<DeskReservation, "start" | "end">,
    b: Pick<DeskReservation, "start" | "end">,
): boolean {
    return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

export interface ReservationLimits {
    /** The longest a reservation can last, in days. */
    maxDays: number;
    /** How far ahead a reservation can start, in days. */
    maxAdvanceDays: number;
    /** Reservations going on or to come on one desk. */
    maxPerDesk: number;
}

export const DEFAULT_RESERVATION_LIMITS: Readonly<ReservationLimits> = {
    maxDays: 30,
    maxAdvanceDays: 365,
    maxPerDesk: 50,
};

export type ReservationProblem =
    /** The desk belongs to someone: it is theirs alone, nobody else can be given a time at it. */
    | { kind: "hasHolders" }
    /** The instants cannot be read, or the end does not come after the start. */
    | { kind: "invalidPeriod" }
    /** It would be over already. */
    | { kind: "past" }
    | { kind: "tooLong"; maxDays: number }
    | { kind: "tooFar"; maxAdvanceDays: number }
    /** Another reservation of the desk shares some of that time. */
    | { kind: "overlap"; with: DeskReservation }
    | { kind: "tooMany"; max: number };

/** Why this reservation cannot be added to the desk at this instant, or null when it can. */
export function reservationProblem(
    desk: Pick<DeskRecord, "ownerId" | "deskType" | "coOwnerIds" | "reservations">,
    request: Pick<DeskReservation, "start" | "end">,
    now: number,
    limits: Readonly<ReservationLimits> = DEFAULT_RESERVATION_LIMITS,
): ReservationProblem | null {
    if (deskHolderIds(desk).length > 0) return { kind: "hasHolders" };
    const start = Date.parse(request.start);
    const end = Date.parse(request.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return { kind: "invalidPeriod" };
    if (end <= now) return { kind: "past" };
    if (end - start > limits.maxDays * DAY_MS) return { kind: "tooLong", maxDays: limits.maxDays };
    if (start - now > limits.maxAdvanceDays * DAY_MS) return { kind: "tooFar", maxAdvanceDays: limits.maxAdvanceDays };
    const live = liveReservations(desk, now);
    const clash = live.find((other) => reservationsOverlap(other, request));
    if (clash) return { kind: "overlap", with: clash };
    if (live.length >= limits.maxPerDesk) return { kind: "tooMany", max: limits.maxPerDesk };
    return null;
}

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------

export type DeskStatus =
    /** Free: it belongs to nobody and nobody has it kept now. Employees it is open to can claim it, if it is claimable. */
    | "available"
    /** A free hot desk: anyone it is open to can sit at it while a seat is free. */
    | "hot"
    /** A reservation keeps it for one person right now. */
    | "kept"
    /** An employee who has been in the office has it. */
    | "claimed"
    /** Assigned to somebody who has not been in the office yet, such as an employee who was invited. */
    | "reserved"
    /** A shared desk that belongs to people. */
    | "shared"
    /** Out of service. */
    | "disabled";

export const DESK_STATUSES: readonly DeskStatus[] = [
    "available",
    "hot",
    "kept",
    "claimed",
    "reserved",
    "shared",
    "disabled",
];

/** What is known of the person who has a desk. */
export interface DeskOwnerInfo {
    name: string | null;
    email: string | null;
    /** They have entered the office at least once. */
    hasJoined: boolean;
}

/**
 * The state of a desk at an instant. What a desk belongs to comes first, as in WorkAdventure: a desk that belongs to
 * people is theirs alone, whatever reservation it may carry; a reservation only keeps a desk that belongs to nobody.
 */
export function deskStatus(
    desk: Pick<DeskRecord, "ownerId" | "disabled"> &
        Partial<Pick<DeskRecord, "deskType" | "coOwnerIds" | "reservations">>,
    owner: DeskOwnerInfo | undefined,
    now: number = Date.now(),
): DeskStatus {
    if (desk.disabled) return "disabled";
    const deskType = desk.deskType ?? "assigned";
    const holders = deskHolderIds({ ownerId: desk.ownerId, deskType, coOwnerIds: desk.coOwnerIds ?? [] });
    if (holders.length > 0) {
        if (deskType === "shared") return "shared";
        return owner?.hasJoined ? "claimed" : "reserved";
    }
    if (activeReservation({ reservations: desk.reservations ?? [] }, now)) return "kept";
    return deskType === "hot" ? "hot" : "available";
}

// ---------------------------------------------------------------------------------------------
// Patches
// ---------------------------------------------------------------------------------------------

const areaPath = (desk: Pick<DeskRecord, "areaIndex">) => `/areas/${desk.areaIndex}`;
const propertyPath = (desk: Pick<DeskRecord, "areaIndex" | "propertyIndex">) =>
    `${areaPath(desk)}/properties/${desk.propertyIndex}`;
const test = (path: string, value: unknown): DeskPatchOperation => ({ op: "test", path, value });
const set = (path: string, value: unknown): DeskPatchOperation => ({ op: "add", path, value });

/** Keys of a desk property that a change can depend on. */
type GuardedKey = "ownerId" | "deskType" | "coOwnerIds" | "reservations";

/**
 * What the administrator saw: this desk, at this position, and the keys the change depends on as they were read (and,
 * unless `withDisabled` is false, the desk still out of service when it was). A JSON Patch cannot test that a key is
 * absent: when one of the keys is not stored, the whole property is tested instead, which covers it too.
 */
function guard(
    desk: DeskRecord,
    keys: readonly GuardedKey[] = ["ownerId"],
    { withDisabled = true }: { withDisabled?: boolean } = {},
): DeskPatchOperation[] {
    const whole = keys.some((key) => !(key in desk.stored));
    if (whole) return [test(`${areaPath(desk)}/id`, desk.id), test(propertyPath(desk), desk.stored)];
    return [
        test(`${areaPath(desk)}/id`, desk.id),
        ...keys.map((key) => test(`${propertyPath(desk)}/${key}`, desk.stored[key])),
        ...(withDisabled && desk.disabled ? [test(`${propertyPath(desk)}/disabled`, true)] : []),
    ];
}

/** The stored reservations, each with what it says (null for an entry that is not a reservation). */
function storedReservations(desk: DeskRecord): { raw: unknown; reservation: DeskReservation | null }[] {
    const raw = desk.stored.reservations;
    if (!Array.isArray(raw)) return [];
    return raw.map((entry: unknown) => {
        const parsed = ReservationShape.safeParse(entry);
        return { raw: entry, reservation: parsed.success ? parsed.data : null };
    });
}

/** The stored reservations to keep: those going on or to come. Entries that are not reservations are dropped. */
function keptReservations(desk: DeskRecord, now: number, drop?: (reservation: DeskReservation) => boolean): unknown[] {
    return storedReservations(desk)
        .filter(
            ({ reservation }) =>
                reservation !== null && reservationPhase(reservation, now) !== "past" && !drop?.(reservation),
        )
        .map(({ raw }) => raw);
}

/** Clears the name shown on the desk, when the file has one. */
function clearOwnerName(desk: DeskRecord): DeskPatchOperation[] {
    return "ownerName" in desk.stored ? [set(`${propertyPath(desk)}/ownerName`, null)] : [];
}

export interface AssignOpsOptions {
    /** The name of the person, shown on the desk in the office while they are away. */
    ownerName?: string | null;
    /**
     * Cancel the reservations of the desk in the same change: a desk that belongs to someone is theirs alone, so the
     * reservations would no longer mean anything. The caller asks the administrator first.
     */
    dropReservations?: boolean;
}

/**
 * Gives the desk to a person, with their name to show on it (or no name, rather than the name of whoever had it). It
 * stays theirs until they release it or an administrator takes it back. Checks the owner, the type and the
 * reservations that were read: the decision to give the desk depends on them.
 */
export function assignOps(desk: DeskRecord, ownerId: string, options: AssignOpsOptions = {}): DeskPatchOperation[] {
    const owner = normalizeOwnerId(ownerId);
    const name = nameOnDesk(options.ownerName);
    // The new owner was a co-owner: they are the owner now, and only once.
    const coOwners = desk.coOwnerIds.filter((coOwnerId) => !samePerson(coOwnerId, owner));
    const rewritesCoOwners = coOwners.length !== desk.coOwnerIds.length;
    const dropsReservations = options.dropReservations === true && desk.reservations.length > 0;
    return [
        ...guard(desk, ["ownerId", "deskType", "reservations", ...(rewritesCoOwners ? (["coOwnerIds"] as const) : [])]),
        set(`${propertyPath(desk)}/ownerId`, owner),
        ...(name !== null ? [set(`${propertyPath(desk)}/ownerName`, name)] : clearOwnerName(desk)),
        ...(rewritesCoOwners ? [set(`${propertyPath(desk)}/coOwnerIds`, coOwners)] : []),
        ...(dropsReservations ? [set(`${propertyPath(desk)}/reservations`, [])] : []),
    ];
}

/**
 * Frees the desk, and the name shown on it. What the employee put on it stays on it: only the ownership changes, so
 * that nothing an employee made is destroyed by an ordinary change of desk.
 */
export function releaseOps(desk: DeskRecord): DeskPatchOperation[] {
    return [...guard(desk), set(`${propertyPath(desk)}/ownerId`, null), ...clearOwnerName(desk)];
}

/** Takes the desk out of service, or puts it back. Whoever has it keeps it. */
export function setDisabledOps(desk: DeskRecord, disabled: boolean): DeskPatchOperation[] {
    return [...guard(desk), set(`${propertyPath(desk)}/disabled`, disabled)];
}

export function renameOps(desk: DeskRecord, name: string): DeskPatchOperation[] {
    return [...guard(desk), set(`${areaPath(desk)}/name`, name)];
}

/** Whether employees claim the desk themselves, or an administrator assigns it. */
export function setClaimModeOps(desk: DeskRecord, mode: DeskClaimMode): DeskPatchOperation[] {
    return [...guard(desk), set(`${propertyPath(desk)}/accessClaimMode`, mode)];
}

/** Who the desk is open to: the tags one of which a person needs to claim it or sit at it (none: everyone). */
export function setAllowedTagsOps(desk: DeskRecord, tags: readonly string[]): DeskPatchOperation[] {
    return [...guard(desk), set(`${propertyPath(desk)}/allowedTags`, [...tags])];
}

export interface DeskTypeConfirmations {
    /** The desk becomes a hot desk while it has an owner: the administrator agreed that the owner loses it. */
    clearOwner?: boolean;
    /** The desk stops being shared while it has co-owners: the administrator agreed that they lose it. */
    dropCoOwners?: boolean;
}

export type DeskTypeChangeProblem =
    /** A hot desk belongs to nobody: its owner would lose it. */
    | "ownerMustBeCleared"
    /** Only a shared desk has co-owners: they would lose it. */
    | "coOwnersMustBeDropped";

/** What changing the type would take from people, unless the administrator agreed to it; null when nothing. */
export function deskTypeChangeProblem(
    desk: Pick<DeskRecord, "ownerId" | "deskType" | "coOwnerIds">,
    deskType: DeskType,
    confirmed: DeskTypeConfirmations = {},
): DeskTypeChangeProblem | null {
    if (deskType === desk.deskType) return null;
    if (deskType === "hot" && desk.ownerId !== null && !confirmed.clearOwner) return "ownerMustBeCleared";
    if (desk.deskType === "shared" && desk.coOwnerIds.length > 0 && !confirmed.dropCoOwners) {
        return "coOwnersMustBeDropped";
    }
    return null;
}

/**
 * Changes how the desk is used. A hot desk belongs to nobody: its owner is cleared. A desk that is no longer shared
 * has no co-owners: they are removed. Both only when the administrator agreed (see `deskTypeChangeProblem`).
 */
export function setDeskTypeOps(
    desk: DeskRecord,
    deskType: DeskType,
    confirmed: DeskTypeConfirmations = {},
): DeskPatchOperation[] {
    const problem = deskTypeChangeProblem(desk, deskType, confirmed);
    if (problem) throw new Error(`Changing the type of desk ${desk.id} needs a confirmation: ${problem}`);
    const clearsOwner = deskType === "hot" && desk.ownerId !== null;
    const dropsCoOwners = deskType !== "shared" && "coOwnerIds" in desk.stored;
    const keys: GuardedKey[] = ["ownerId", "deskType", ...(dropsCoOwners ? (["coOwnerIds"] as const) : [])];
    return [
        ...guard(desk, keys),
        set(`${propertyPath(desk)}/deskType`, deskType),
        ...(clearsOwner ? [set(`${propertyPath(desk)}/ownerId`, null), ...clearOwnerName(desk)] : []),
        ...(dropsCoOwners ? [{ op: "remove", path: `${propertyPath(desk)}/coOwnerIds` } as const] : []),
    ];
}

/**
 * Sets the other people a shared desk belongs to (`normalizeCoOwnerIds` gives them as stored). When the desk gets
 * people while reservations are to come, `dropReservations` cancels them in the same change: the desk is theirs alone.
 */
export function setCoOwnersOps(
    desk: DeskRecord,
    coOwnerIds: readonly string[],
    { dropReservations = false }: { dropReservations?: boolean } = {},
): DeskPatchOperation[] {
    if (desk.deskType !== "shared") throw new Error(`Desk ${desk.id} is not shared: it has no co-owners`);
    const keys: GuardedKey[] = [
        "ownerId",
        "deskType",
        "coOwnerIds",
        ...(dropReservations ? (["reservations"] as const) : []),
    ];
    return [
        ...guard(desk, keys),
        set(`${propertyPath(desk)}/coOwnerIds`, [...coOwnerIds]),
        ...(dropReservations && desk.reservations.length > 0 ? [set(`${propertyPath(desk)}/reservations`, [])] : []),
    ];
}

/**
 * Keeps the desk for a person for a while (check it with `reservationProblem` first). The reservations that are over
 * are dropped in the same change. Checks the reservations that were read, so that two reservations added at the same
 * time cannot overlap, and that the desk still belongs to nobody.
 */
export function addReservationOps(desk: DeskRecord, reservation: DeskReservation, now: number): DeskPatchOperation[] {
    const keys: GuardedKey[] = [
        "ownerId",
        "reservations",
        ...(desk.deskType === "shared" ? (["deskType", "coOwnerIds"] as const) : []),
    ];
    return [
        ...guard(desk, keys, { withDisabled: false }),
        set(`${propertyPath(desk)}/reservations`, [...keptReservations(desk, now), { ...reservation }]),
    ];
}

/** Cancels a reservation: removes it, after checking that it is still the one that was read. Null when it is not there. */
export function cancelReservationOps(desk: DeskRecord, reservationId: string): DeskPatchOperation[] | null {
    const index = storedReservations(desk).findIndex(({ reservation }) => reservation?.id === reservationId);
    if (index < 0) return null;
    const path = `${propertyPath(desk)}/reservations/${index}`;
    const raw = (desk.stored.reservations as unknown[])[index];
    return [test(`${areaPath(desk)}/id`, desk.id), test(path, raw), { op: "remove", path }];
}

/** Removes the reservations that are over. Null when there is none. */
export function clearPastReservationsOps(desk: DeskRecord, now: number): DeskPatchOperation[] | null {
    const all = storedReservations(desk);
    const kept = keptReservations(desk, now);
    if (kept.length === all.length) return null;
    return [...guard(desk, ["reservations"], { withDisabled: false }), set(`${propertyPath(desk)}/reservations`, kept)];
}

export interface PeopleRemoval {
    operations: DeskPatchOperation[];
    /** The owner who left, when the desk is free now. */
    releasedOwner: string | null;
    /** The co-owners who left. */
    removedCoOwners: string[];
    /** Their reservations going on or to come, cancelled. */
    cancelled: DeskReservation[];
}

/**
 * Takes people out of a desk when they leave: frees it if one of them owns it, removes them from its co-owners, and
 * cancels their reservations going on or to come (the reservations that are over go too, when the list is rewritten).
 * What they put on the desk stays. Null when the desk has none of them.
 */
export function removePeopleOps(
    desk: DeskRecord,
    isLeaving: (person: string) => boolean,
    now: number,
): PeopleRemoval | null {
    const ownerLeaves = desk.ownerId !== null && isLeaving(desk.ownerId);
    const removedCoOwners = desk.coOwnerIds.filter((coOwnerId) => isLeaving(coOwnerId));
    const leaving = (reservation: DeskReservation) => isLeaving(reservation.userId);
    const cancelled = liveReservations(desk, now).filter(leaving);
    if (!ownerLeaves && removedCoOwners.length === 0 && cancelled.length === 0) return null;
    const keys: GuardedKey[] = [
        ...(ownerLeaves ? (["ownerId"] as const) : []),
        ...(removedCoOwners.length > 0 ? (["coOwnerIds"] as const) : []),
        ...(cancelled.length > 0 ? (["reservations"] as const) : []),
    ];
    const coOwners = desk.coOwnerIds.filter((coOwnerId) => !isLeaving(coOwnerId));
    return {
        operations: [
            ...guard(desk, keys, { withDisabled: false }),
            ...(ownerLeaves ? [set(`${propertyPath(desk)}/ownerId`, null), ...clearOwnerName(desk)] : []),
            ...(removedCoOwners.length > 0 ? [set(`${propertyPath(desk)}/coOwnerIds`, coOwners)] : []),
            ...(cancelled.length > 0
                ? [set(`${propertyPath(desk)}/reservations`, keptReservations(desk, now, leaving))]
                : []),
        ],
        releasedOwner: ownerLeaves ? desk.ownerId : null,
        removedCoOwners,
        cancelled,
    };
}

/**
 * Removes desks from the room. Only desks that belong to nobody and that nobody has kept: the caller has to free them
 * and cancel their reservations first (see `deskRemovalProblem`). Removed from the last to the first, so that the
 * positions of the others stay valid.
 */
export function deleteOps(desks: readonly DeskRecord[]): DeskPatchOperation[] {
    return [...desks]
        .sort((a, b) => b.areaIndex - a.areaIndex)
        .flatMap((desk) => [
            ...guard(desk, [
                "ownerId",
                "reservations",
                ...(desk.deskType === "shared" ? (["coOwnerIds"] as const) : []),
            ]),
            { op: "remove", path: areaPath(desk) } as const,
        ]);
}

/** Why a desk cannot be removed right now, or null when it can. */
export function deskRemovalProblem(
    desk: Pick<DeskRecord, "ownerId"> & Partial<Pick<DeskRecord, "deskType" | "coOwnerIds" | "reservations">>,
    now: number = Date.now(),
): "occupied" | "reservations" | null {
    const holders = deskHolderIds({
        ownerId: desk.ownerId,
        deskType: desk.deskType ?? "assigned",
        coOwnerIds: desk.coOwnerIds ?? [],
    });
    if (holders.length > 0) return "occupied";
    return liveReservations({ reservations: desk.reservations ?? [] }, now).length > 0 ? "reservations" : null;
}

/** Several operations in a row, checked as a whole: they all apply or none does. */
export function combineOps(...groups: DeskPatchOperation[][]): DeskPatchOperation[] {
    return groups.flat();
}

// ---------------------------------------------------------------------------------------------
// Creating desks
// ---------------------------------------------------------------------------------------------

/** At most this many desks in one go. */
export const MAX_DESKS_PER_BATCH = 200;
export const MIN_DESK_SIZE_PX = 16;
export const MAX_DESK_SIZE_PX = 640;

export interface DeskGridRequest {
    /** Top-left corner of the first desk, in pixels of the map. */
    originX: number;
    originY: number;
    columns: number;
    rows: number;
    deskWidth: number;
    deskHeight: number;
    /** Space between two desks, in pixels. */
    gapX: number;
    gapY: number;
    /** "Desk" gives "Desk 1", "Desk 2", ... */
    namePrefix: string;
    startNumber: number;
    claimMode: DeskClaimMode;
    allowedTags: string[];
    /** How the new desks are used (personal desks when not given). */
    deskType?: DeskType;
}

export interface MapBounds {
    width: number;
    height: number;
}

export interface PlacedArea {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type DeskGridProblem =
    | { kind: "invalid" }
    | { kind: "tooMany"; max: number }
    /** The desk (by its position in the new ones, from 0) does not lie in the map. */
    | { kind: "outOfBounds"; index: number }
    /** The desk overlaps a desk that is already there. */
    | { kind: "overlaps"; index: number; with: string };

export interface NewDeskArea {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: true;
    properties: [
        {
            id: string;
            type: "personalAreaPropertyData";
            accessClaimMode: DeskClaimMode;
            allowedTags: string[];
            ownerId: null;
            /** Only for hot and shared desks: a personal desk keeps the shape desks always had. */
            deskType?: "hot" | "shared";
        },
    ];
}

function overlap(a: PlacedArea, b: PlacedArea): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Lays out a grid of new desks. Gives the desks and the problems that make the layout unfit; nothing is created when
 * there is a problem. `newId` gives a fresh identifier each time it is called.
 */
export function planDeskGrid(
    request: DeskGridRequest,
    bounds: MapBounds | null,
    existingDesks: readonly PlacedArea[],
    newId: () => string,
): { desks: NewDeskArea[]; problems: DeskGridProblem[] } {
    const integers = [
        request.originX,
        request.originY,
        request.columns,
        request.rows,
        request.deskWidth,
        request.deskHeight,
        request.gapX,
        request.gapY,
        request.startNumber,
    ];
    const valid =
        integers.every(Number.isInteger) &&
        request.columns >= 1 &&
        request.rows >= 1 &&
        request.originX >= 0 &&
        request.originY >= 0 &&
        request.gapX >= 0 &&
        request.gapY >= 0 &&
        request.deskWidth >= MIN_DESK_SIZE_PX &&
        request.deskWidth <= MAX_DESK_SIZE_PX &&
        request.deskHeight >= MIN_DESK_SIZE_PX &&
        request.deskHeight <= MAX_DESK_SIZE_PX;
    if (!valid) return { desks: [], problems: [{ kind: "invalid" }] };
    if (request.columns * request.rows > MAX_DESKS_PER_BATCH) {
        return { desks: [], problems: [{ kind: "tooMany", max: MAX_DESKS_PER_BATCH }] };
    }

    const deskType = request.deskType === "hot" || request.deskType === "shared" ? request.deskType : undefined;
    const desks: NewDeskArea[] = [];
    const problems: DeskGridProblem[] = [];
    for (let row = 0; row < request.rows; row++) {
        for (let column = 0; column < request.columns; column++) {
            const index = desks.length;
            const x = request.originX + column * (request.deskWidth + request.gapX);
            const y = request.originY + row * (request.deskHeight + request.gapY);
            const placed: PlacedArea = { id: "", x, y, width: request.deskWidth, height: request.deskHeight };
            if (bounds && (x + request.deskWidth > bounds.width || y + request.deskHeight > bounds.height)) {
                problems.push({ kind: "outOfBounds", index });
            }
            const clash = existingDesks.find((desk) => overlap(placed, desk));
            if (clash) problems.push({ kind: "overlaps", index, with: clash.id });
            desks.push({
                id: newId(),
                name: `${request.namePrefix.trim()} ${request.startNumber + index}`.trim(),
                x,
                y,
                width: request.deskWidth,
                height: request.deskHeight,
                visible: true,
                properties: [
                    {
                        id: newId(),
                        type: "personalAreaPropertyData",
                        accessClaimMode: request.claimMode,
                        allowedTags: [...request.allowedTags],
                        ownerId: null,
                        ...(deskType ? { deskType } : {}),
                    },
                ],
            });
        }
    }
    return { desks: problems.length === 0 ? desks : [], problems };
}

/** The operations that add new desks to the end of the areas of the room. */
export function createOps(desks: readonly NewDeskArea[]): DeskPatchOperation[] {
    return desks.map((desk) => ({ op: "add", path: "/areas/-", value: desk }));
}

// ---------------------------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------------------------

export type DeskCounts = Record<DeskStatus, number> & { total: number };

export function countDesks(statuses: readonly DeskStatus[]): DeskCounts {
    const counts = Object.fromEntries(DESK_STATUSES.map((status) => [status, 0])) as Record<DeskStatus, number>;
    for (const status of statuses) counts[status]++;
    return { ...counts, total: statuses.length };
}
