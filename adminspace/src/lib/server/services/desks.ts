/**
 * Desk management for administrators: which desks an office has, who each belongs to, who each is kept for, and the
 * changes an administrator makes (assign, free, change how a desk is used, share it, keep it for someone, take it out
 * of service, rename it, choose who it is open to, add desks in bulk, remove them).
 *
 * A desk lives in the WAM file of a room, in map-storage, and nowhere else: this service reads those files and changes
 * them with JSON Patches (see src/lib/desks/model.ts), whose `test` operations make a change built on a stale view fail
 * instead of overwriting what employees did in the meantime. WorkAdventure enforces what employees may do with desks
 * (claim one, sit at one); everything here needs `room.manage` in the room's workspace, or is done by the system when
 * a person leaves. Each change is audited, the people it concerns are emailed, and it is announced to whoever listens
 * to desk events (deskEvents.ts).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { OrganizationAccess } from "../auth/rbac";
import type { Account } from "../auth/session";
import { audit } from "../audit";
import {
    patchWam,
    readRoomMap,
    readWamFile,
    type RoomMapFailure,
    type MapStorageTarget,
    wamTarget,
} from "../catalog/mapStorage";
import { DEFAULT_LOCALE, format, isLocale, localeInfo, messagesFor, type Locale } from "../../i18n";
import { formatDateTime } from "../../i18n/format";
import {
    DEFAULT_RESERVATION_LIMITS,
    MAX_DESKS_PER_BATCH,
    MAX_PERSON_ID_LENGTH,
    addReservationOps,
    assignOps,
    cancelReservationOps,
    clearPastReservationsOps,
    combineOps,
    countDesks,
    createOps,
    deleteOps,
    deskRemovalProblem,
    deskStatus,
    deskTypeChangeProblem,
    extractDesks,
    isDeskHolder,
    liveReservations,
    nameOnDesk,
    normalizeCoOwnerIds,
    normalizeOwnerId,
    planDeskGrid,
    releaseOps,
    removePeopleOps,
    renameOps,
    reservationPhase,
    reservationProblem,
    reservationsOverlap,
    samePerson,
    setAllowedTagsOps,
    setClaimModeOps,
    setCoOwnersOps,
    setDeskTypeOps,
    setDisabledOps,
    type DeskClaimMode,
    type DeskCounts,
    type DeskGridProblem,
    type DeskGridRequest,
    type DeskOwnerInfo,
    type DeskPatchOperation,
    type DeskRecord,
    type DeskReservation,
    type DeskSeat,
    type DeskStatus,
    type DeskType,
    type ReservationLimits,
    type ReservationPhase,
    type ReservationProblem,
} from "../../desks/model";
import { listWorkspaces } from "./workspaces";
import { listOrganizationWorlds, worldState, type Room, type World } from "./worlds";
import { mapWithConcurrency, resizableMap } from "./roomSize";
import { sendMail } from "./mail";
import { TAG_NAME_PATTERN } from "./tags";
import { isValidTimeZone } from "./worldAdmin";
import { onDeskChanged, type DeskEventBase, type DeskEventReservation } from "./deskEvents";

/** Rooms read for one inventory: each is a call to map-storage. */
export const MAX_INVENTORY_ROOMS = 200;
const READ_CONCURRENCY = 6;

/**
 * How long and how far ahead a desk can be kept for someone. One place to change them: every reservation made from the
 * Desk Manager (one by one or in bulk) is checked against these.
 */
export const RESERVATION_LIMITS: Readonly<ReservationLimits> = DEFAULT_RESERVATION_LIMITS;

/** At most this many tags on one desk. */
export const MAX_DESK_TAGS = 20;

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

/** Why a reservation was refused: the rules of the desk (model.ts), or the person has another desk at that time. */
export type DeskReservationProblem =
    ReservationProblem | { kind: "personBusy"; deskName: string; start: string; end: string };

export type DeskFailure =
    /** No such room, desk or reservation in this organization. */
    | { status: "notFound" }
    /** The person may not manage the rooms of that workspace. */
    | { status: "forbidden" }
    /** The map of the room cannot be managed from here (Tiled map, not on map-storage, other organization, ...). */
    | { status: "mapProblem"; problem: string }
    /** Somebody changed the desk while the administrator was looking at it: the page must be reloaded. */
    | { status: "changed" }
    | { status: "invalid" }
    /** The person already has another desk in this room (as its owner or one of its co-owners). */
    | { status: "alreadyHasDesk"; deskName: string; person?: string }
    /** The desk has an owner: say so and ask first, or free it first. */
    | { status: "occupied"; deskName: string }
    /** A hot desk belongs to nobody: it cannot be given to someone. */
    | { status: "hotDesk"; deskName: string }
    /** Only a shared desk has co-owners. */
    | { status: "notShared"; deskName: string }
    /** The change would cancel reservations to come: the administrator has to agree first. */
    | { status: "hasReservations"; deskName: string; count: number }
    /** The change would take the desk from its co-owners: the administrator has to agree first. */
    | { status: "hasCoOwners"; deskName: string; count: number }
    | { status: "tooManyCoOwners"; max: number }
    /** A tag has a comma or spaces around it, is too long, or there are too many. */
    | { status: "badTags"; max: number }
    /** The reservation cannot be made. */
    | { status: "reservation"; problem: DeskReservationProblem }
    /** The new desks do not fit. */
    | { status: "layout"; problems: DeskGridProblem[] }
    /** Map-storage cannot be reached, or refused. */
    | { status: "unavailable" };

export type DeskResult<T = undefined> = { status: "ok"; value: T } | DeskFailure;

/** Who does it, for the audit log. */
export interface DeskActor {
    account: Pick<Account, "id" | "email"> | null;
    ipAddress: string | null;
    /** When there is no account: "system", ... */
    actorLabel?: string;
}

/** Lets tests fix the time. */
export interface DeskClock {
    now?: number;
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

export interface MapSize {
    widthPx: number;
    heightPx: number;
    tileWidth: number;
    tileHeight: number;
}

interface LoadedRoom {
    room: Room;
    world: World;
    target: MapStorageTarget;
    desks: DeskRecord[];
    map: MapSize | null;
}

type ReadFailure = RoomMapFailure | "noMap" | "tiled" | "notOnMapStorage" | "otherOrganization";

/** Reads the desks (and the size) of a room's map. */
async function readRoom(
    world: World,
    room: Room,
): Promise<{ ok: true; value: Omit<LoadedRoom, "room" | "world"> } | { ok: false; problem: ReadFailure }> {
    const check = await resizableMap(world, room);
    if (!check.ok) return { ok: false, problem: check.problem as ReadFailure };
    const target = await wamTarget(check.wamUrl);
    if (!target) return { ok: false, problem: "notOnMapStorage" };

    const read = await readRoomMap(check.wamUrl);
    if (read.status === "ok") {
        const { wam, map } = read.value;
        return {
            ok: true,
            value: {
                target,
                desks: extractDesks(wam.areas),
                map: {
                    widthPx: map.width * map.tilewidth,
                    heightPx: map.height * map.tileheight,
                    tileWidth: map.tilewidth,
                    tileHeight: map.tileheight,
                },
            },
        };
    }
    // The desks can be managed without the size of the map; only the layout of new desks needs it.
    const wamOnly = await readWamFile(check.wamUrl);
    if (wamOnly.status === "ok") {
        return { ok: true, value: { target, desks: extractDesks(wamOnly.value.areas), map: null } };
    }
    return { ok: false, problem: wamOnly.status };
}

/** A room of the organization that the caller may manage, with its desks. */
async function loadRoom(
    organizationId: string,
    roomId: string,
    canManage: (workspaceId: string) => boolean,
): Promise<DeskResult<LoadedRoom>> {
    const [row] = await db()
        .select({ room: schema.rooms, world: schema.worlds })
        .from(schema.rooms)
        .innerJoin(schema.worlds, eq(schema.worlds.id, schema.rooms.worldId))
        .where(and(eq(schema.rooms.id, roomId), eq(schema.worlds.organizationId, organizationId)))
        .limit(1);
    if (!row || worldState(row.world) !== "open") return { status: "notFound" };
    if (!canManage(row.world.workspaceId)) return { status: "forbidden" };
    const read = await readRoom(row.world, row.room);
    if (!read.ok) return { status: "mapProblem", problem: read.problem };
    return { status: "ok", value: { room: row.room, world: row.world, ...read.value } };
}

/** A person a desk is about, with what is known of them. */
export interface DeskPersonView {
    id: string;
    info: DeskOwnerInfo | null;
}

export interface ReservationView {
    id: string;
    userId: string;
    /** The name stored with the reservation (shown on the desk in the office). */
    userName: string | null;
    start: string;
    end: string;
    phase: ReservationPhase;
    person: DeskOwnerInfo | null;
}

export interface DeskView {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    claimMode: DeskClaimMode;
    disabled: boolean;
    allowedTags: string[];
    ownerId: string | null;
    status: DeskStatus;
    owner: DeskOwnerInfo | null;
    deskType: DeskType;
    /** The co-owners of a shared desk (none for the other types, whatever the file says: WorkAdventure ignores them). */
    coOwners: DeskPersonView[];
    /** The name shown on the desk in the office while its owner is away. */
    ownerName: string | null;
    /** Every reservation of the desk, by start, those that are over included. */
    reservations: ReservationView[];
    /** Places to sit drawn in the map picture. */
    seats: DeskSeat[];
}

export interface DeskRoomView {
    room: { id: string; name: string; slug: string };
    world: { id: string; slug: string; name: string };
    workspace: { id: string; slug: string; name: string };
    map: MapSize | null;
    /** Why the desks of this room cannot be read or managed, if they cannot. */
    problem: string | null;
    desks: DeskView[];
    counts: DeskCounts;
    /** Reservations to come in the room. */
    upcoming: number;
    /** The tags of the room's world, offered when choosing who a desk is open to. */
    worldTags: string[];
}

export interface DeskInventory {
    rooms: DeskRoomView[];
    counts: DeskCounts;
    /** Reservations to come in all the rooms shown. */
    upcoming: number;
    /** More rooms than `MAX_INVENTORY_ROOMS`: the rest is not listed. */
    truncated: boolean;
}

/** What is known of the people desks are about in a world: by identifier, in lower case. */
async function ownersOfWorld(worldId: string, identifiers: string[]): Promise<Map<string, DeskOwnerInfo>> {
    const lower = [...new Set(identifiers.map((id) => id.toLowerCase()))];
    const owners = new Map<string, DeskOwnerInfo>();
    if (lower.length === 0) return owners;
    const rows = await db()
        .select()
        .from(schema.members)
        .where(
            and(
                eq(schema.members.worldId, worldId),
                or(
                    inArray(sql`lower(${schema.members.uuid})`, lower),
                    inArray(sql`lower(${schema.members.email})`, lower),
                ),
            ),
        );
    for (const row of rows) {
        const info: DeskOwnerInfo = {
            name: row.name,
            email: row.email,
            // A recorded visit is what "has been in the office" means. An employee entering for the first time is
            // recorded as a visitor ("guest"), whatever their place in the organization.
            hasJoined: row.lastSeenAt !== null,
        };
        owners.set(row.uuid.toLowerCase(), info);
        if (row.email) owners.set(row.email.toLowerCase(), info);
    }
    return owners;
}

/** Everybody a desk is about: its owner, its co-owners, the people it is kept for. */
function peopleOfDesk(desk: DeskRecord): string[] {
    return [
        ...(desk.ownerId ? [desk.ownerId] : []),
        ...desk.coOwnerIds,
        ...desk.reservations.map((reservation) => reservation.userId),
    ];
}

const byStart = (a: Pick<DeskReservation, "start">, b: Pick<DeskReservation, "start">) =>
    Date.parse(a.start) - Date.parse(b.start);

function deskView(desk: DeskRecord, known: Map<string, DeskOwnerInfo>, now: number): DeskView {
    const info = (id: string | null): DeskOwnerInfo | null => (id ? (known.get(id.toLowerCase()) ?? null) : null);
    const owner = info(desk.ownerId);
    return {
        id: desk.id,
        name: desk.name,
        x: desk.x,
        y: desk.y,
        width: desk.width,
        height: desk.height,
        claimMode: desk.claimMode,
        disabled: desk.disabled,
        allowedTags: desk.allowedTags,
        ownerId: desk.ownerId,
        status: deskStatus(desk, owner ?? undefined, now),
        owner,
        deskType: desk.deskType,
        coOwners: desk.deskType === "shared" ? desk.coOwnerIds.map((id) => ({ id, info: info(id) })) : [],
        ownerName: desk.ownerName,
        reservations: [...desk.reservations].sort(byStart).map((reservation) => ({
            id: reservation.id,
            userId: reservation.userId,
            userName: reservation.userName ?? null,
            start: reservation.start,
            end: reservation.end,
            phase: reservationPhase(reservation, now),
            person: info(reservation.userId),
        })),
        seats: desk.seats,
    };
}

/** The tags of these worlds, by world. */
async function tagsOfWorlds(worldIds: string[]): Promise<Map<string, string[]>> {
    const byWorld = new Map<string, string[]>();
    if (worldIds.length === 0) return byWorld;
    const rows = await db()
        .select({ worldId: schema.tags.worldId, name: schema.tags.name })
        .from(schema.tags)
        .where(inArray(schema.tags.worldId, worldIds))
        .orderBy(schema.tags.name);
    for (const row of rows) byWorld.set(row.worldId, [...(byWorld.get(row.worldId) ?? []), row.name]);
    return byWorld;
}

/** The desks of every room the person may manage (of one workspace when `workspaceId` is given). */
export async function deskInventory(
    access: OrganizationAccess,
    workspaceId?: string,
    clock: DeskClock = {},
): Promise<DeskInventory> {
    const now = clock.now ?? Date.now();
    const organizationId = access.organization.id;
    const workspaces = (await listWorkspaces(organizationId)).filter(
        (w) => (!workspaceId || w.id === workspaceId) && access.can("room.manage", { workspaceId: w.id }),
    );
    const workspaceById = new Map(workspaces.map((w) => [w.id, w]));
    const worlds = (await listOrganizationWorlds(organizationId)).filter(
        (w) => workspaceById.has(w.workspaceId) && worldState(w) === "open",
    );
    const worldById = new Map(worlds.map((w) => [w.id, w]));
    const allRooms = worlds.length
        ? await db().query.rooms.findMany({
              where: inArray(
                  schema.rooms.worldId,
                  worlds.map((w) => w.id),
              ),
              orderBy: (r, { asc }) => [asc(r.position), asc(r.name)],
          })
        : [];
    const rooms = allRooms.slice(0, MAX_INVENTORY_ROOMS);

    const read = await mapWithConcurrency(rooms, READ_CONCURRENCY, async (room) => ({
        room,
        result: await readRoom(worldById.get(room.worldId)!, room),
    }));

    // One query per world for the people desks are about, not one per desk.
    const peopleByWorld = new Map<string, string[]>();
    for (const { room, result } of read) {
        if (!result.ok) continue;
        const ids = peopleByWorld.get(room.worldId) ?? [];
        for (const desk of result.value.desks) ids.push(...peopleOfDesk(desk));
        peopleByWorld.set(room.worldId, ids);
    }
    const owners = new Map<string, Map<string, DeskOwnerInfo>>();
    for (const [worldId, ids] of peopleByWorld) owners.set(worldId, await ownersOfWorld(worldId, ids));
    const tags = await tagsOfWorlds([...new Set(rooms.map((room) => room.worldId))]);

    const views: DeskRoomView[] = read.map(({ room, result }) => {
        const world = worldById.get(room.worldId)!;
        const workspace = workspaceById.get(world.workspaceId)!;
        const known = owners.get(world.id) ?? new Map<string, DeskOwnerInfo>();
        const desks = result.ok ? result.value.desks.map((desk) => deskView(desk, known, now)) : [];
        return {
            room: { id: room.id, name: room.name, slug: room.slug },
            world: { id: world.id, slug: world.slug, name: world.name },
            workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
            map: result.ok ? result.value.map : null,
            problem: result.ok ? null : result.problem,
            desks,
            counts: countDesks(desks.map((desk) => desk.status)),
            upcoming: desks.reduce(
                (total, desk) => total + desk.reservations.filter((r) => r.phase === "upcoming").length,
                0,
            ),
            worldTags: tags.get(world.id) ?? [],
        };
    });
    return {
        rooms: views,
        counts: countDesks(views.flatMap((view) => view.desks.map((desk) => desk.status))),
        upcoming: views.reduce((total, view) => total + view.upcoming, 0),
        truncated: allRooms.length > rooms.length,
    };
}

export interface PersonChoice {
    /** What identifies the person in WorkAdventure: their lower-case email. */
    value: string;
    label: string;
    /** "member" of the organization, "invited" and has not accepted yet, or "visitor" known in a world. */
    kind: "member" | "invited" | "visitor";
}

const MAX_PEOPLE = 1000;

/** People a desk can be assigned to: the organization's people, the people who were invited, and known visitors. */
export async function assignablePeople(access: OrganizationAccess): Promise<PersonChoice[]> {
    const organizationId = access.organization.id;
    const [accounts, invited, visitors] = await Promise.all([
        db()
            .select({ email: schema.accounts.email, name: schema.accounts.name })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, organizationId),
                    eq(schema.organizationMemberships.status, "active"),
                ),
            )
            .limit(MAX_PEOPLE),
        db()
            .select({ email: schema.invitations.email })
            .from(schema.invitations)
            .where(
                and(
                    eq(schema.invitations.organizationId, organizationId),
                    isNull(schema.invitations.acceptedAt),
                    isNull(schema.invitations.revokedAt),
                ),
            )
            .limit(MAX_PEOPLE),
        db()
            .select({ email: schema.members.email, name: schema.members.name })
            .from(schema.members)
            .innerJoin(schema.worlds, eq(schema.worlds.id, schema.members.worldId))
            .where(
                and(
                    eq(schema.worlds.organizationId, organizationId),
                    eq(schema.members.kind, "member"),
                    sql`${schema.members.email} is not null`,
                ),
            )
            .limit(MAX_PEOPLE),
    ]);
    const choices = new Map<string, PersonChoice>();
    const add = (email: string | null, name: string | null, kind: PersonChoice["kind"]) => {
        if (!email) return;
        const value = normalizeOwnerId(email);
        if (choices.has(value)) return;
        choices.set(value, { value, label: name ? `${name} (${value})` : value, kind });
    };
    for (const account of accounts) add(account.email, account.name, "member");
    for (const invitation of invited) add(invitation.email, null, "invited");
    for (const visitor of visitors) add(visitor.email, visitor.name, "visitor");
    return [...choices.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** What the desk service knows of a person: the name to show on a desk, and how to write to them. */
interface PersonDetails {
    name: string | null;
    locale: Locale | null;
    timeZone: string | null;
}

/**
 * A person of the organization, by the identifier desks know them by: the name of their account in the organization,
 * or else the name WorkAdventure knows them by in the world; the language they use in the world, or else in the back
 * office; the time zone of their account.
 */
async function personDetails(world: Pick<World, "id" | "organizationId">, identifier: string): Promise<PersonDetails> {
    const id = identifier.toLowerCase();
    const [[account], [member]] = await Promise.all([
        db()
            .select({ name: schema.accounts.name, locale: schema.accounts.locale, timeZone: schema.accounts.timeZone })
            .from(schema.accounts)
            .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.accountId, schema.accounts.id))
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, world.organizationId),
                    sql`lower(${schema.accounts.email}) = ${id}`,
                ),
            )
            .limit(1),
        db()
            .select({ name: schema.members.name, locale: schema.members.locale })
            .from(schema.members)
            .where(
                and(
                    eq(schema.members.worldId, world.id),
                    or(sql`lower(${schema.members.uuid}) = ${id}`, sql`lower(${schema.members.email}) = ${id}`),
                ),
            )
            .limit(1),
    ]);
    return {
        name: nameOnDesk(account?.name) ?? nameOnDesk(member?.name),
        locale: isLocale(member?.locale) ? member.locale : isLocale(account?.locale) ? account.locale : null,
        timeZone: account?.timeZone ?? null,
    };
}

// ---------------------------------------------------------------------------------------------
// Changing
// ---------------------------------------------------------------------------------------------

/** Applies the patch, and says what became of it. A refused patch is a change made in the meantime by somebody else. */
async function applyChange(target: MapStorageTarget, operations: DeskPatchOperation[]): Promise<DeskResult> {
    const outcome = await patchWam(target, operations);
    if (outcome.status === "ok") return { status: "ok", value: undefined };
    // A 4xx is either a check that failed or an invalid result: both mean the page showed something out of date.
    if (outcome.status === "rejected") return { status: "changed" };
    if (outcome.status === "notFound") return { status: "notFound" };
    return { status: "unavailable" };
}

interface Scope {
    organizationId: string;
    canManage: (workspaceId: string) => boolean;
}

function scopeOf(access: OrganizationAccess): Scope {
    return {
        organizationId: access.organization.id,
        canManage: (workspaceId) => access.can("room.manage", { workspaceId }),
    };
}

async function auditDesk(
    action: string,
    actor: DeskActor,
    loaded: Pick<LoadedRoom, "room" | "world">,
    desk: Pick<DeskRecord, "id" | "name">,
    details: Record<string, unknown>,
): Promise<void> {
    await audit({
        action,
        account: actor.account,
        actorLabel: actor.actorLabel,
        organizationId: loaded.world.organizationId,
        worldId: loaded.world.id,
        targetType: "desk",
        targetId: desk.id,
        ipAddress: actor.ipAddress,
        details: { room: loaded.room.name, desk: desk.name, ...details },
    });
}

/** Where a desk event happened, and who did it. */
function eventBase(
    loaded: Pick<LoadedRoom, "room" | "world">,
    desk: Pick<DeskRecord, "id" | "name">,
    actor: DeskActor,
): DeskEventBase {
    return {
        organizationId: loaded.world.organizationId,
        worldId: loaded.world.id,
        roomId: loaded.room.id,
        deskId: desk.id,
        deskName: desk.name,
        at: new Date().toISOString(),
        actorAccountId: actor.account?.id ?? null,
    };
}

const eventReservation = (reservation: DeskReservation): DeskEventReservation => ({
    id: reservation.id,
    userId: reservation.userId,
    start: reservation.start,
    end: reservation.end,
});

const auditReservation = (reservation: DeskReservation) => ({
    reservationId: reservation.id,
    person: reservation.userId,
    start: reservation.start,
    end: reservation.end,
});

function findDesk(loaded: LoadedRoom, deskId: string): DeskRecord | undefined {
    return loaded.desks.find((desk) => desk.id === deskId);
}

/** The desk the room is about, in the room the caller may manage. */
async function loadDesk(
    access: OrganizationAccess,
    input: { roomId: string; deskId: string },
): Promise<DeskResult<{ room: LoadedRoom; desk: DeskRecord }>> {
    const scope = scopeOf(access);
    const loaded = await loadRoom(scope.organizationId, input.roomId, scope.canManage);
    if (loaded.status !== "ok") return loaded;
    const desk = findDesk(loaded.value, input.deskId);
    return desk ? { status: "ok", value: { room: loaded.value, desk } } : { status: "notFound" };
}

/** The desk of the room, other than `except`, that already belongs to this person, if any. */
function otherDeskOf(room: LoadedRoom, person: string, except: DeskRecord): DeskRecord | undefined {
    return room.desks.find((candidate) => candidate.id !== except.id && isDeskHolder(candidate, person));
}

/** Takes a person out of a desk they have: frees it if they own it, removes them from its co-owners otherwise. */
function leaveDeskOps(desk: DeskRecord, person: string): DeskPatchOperation[] {
    if (samePerson(desk.ownerId, person)) return releaseOps(desk);
    return setCoOwnersOps(
        desk,
        desk.coOwnerIds.filter((coOwnerId) => !samePerson(coOwnerId, person)),
    );
}

const isPersonId = (id: string) => id !== "" && id.length <= MAX_PERSON_ID_LENGTH && !/\s/.test(id);

/** The desks of a room, by name, for the actions that name them ("assign several desks"). */
export async function listRoomDesks(
    access: OrganizationAccess,
    roomId: string,
): Promise<DeskResult<{ id: string; name: string }[]>> {
    const scope = scopeOf(access);
    const loaded = await loadRoom(scope.organizationId, roomId, scope.canManage);
    if (loaded.status !== "ok") return loaded;
    return { status: "ok", value: loaded.value.desks.map((desk) => ({ id: desk.id, name: desk.name })) };
}

export interface AssignOptions {
    /** Take the person out of the other desk they have in this room, if they have one, in the same change. */
    moveFromOtherDesk: boolean;
    /** The desk has another person: the administrator confirmed that it is taken from them. */
    takeFromCurrentOwner: boolean;
    /** The desk is kept for people later: the administrator confirmed that these reservations are cancelled. */
    cancelReservations?: boolean;
}

/**
 * Gives a desk to a person, an employee or somebody who was invited and has not joined yet. Writes their name on the
 * desk, for the office to show while they are away. A hot desk is given to nobody, and reservations to come are only
 * cancelled when the administrator agreed (a desk that belongs to someone is theirs alone).
 */
export async function assignDesk(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; owner: string } & AssignOptions,
    clock: DeskClock = {},
): Promise<DeskResult<{ previousOwner: string | null }>> {
    const now = clock.now ?? Date.now();
    const owner = normalizeOwnerId(input.owner);
    if (!isPersonId(owner)) return { status: "invalid" };
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (samePerson(desk.ownerId, owner)) return { status: "ok", value: { previousOwner: desk.ownerId } };
    if (desk.deskType === "hot") return { status: "hotDesk", deskName: desk.name };
    if (desk.ownerId !== null && !input.takeFromCurrentOwner) return { status: "occupied", deskName: desk.name };

    const otherDesk = otherDeskOf(room, owner, desk);
    if (otherDesk && !input.moveFromOtherDesk) return { status: "alreadyHasDesk", deskName: otherDesk.name };
    const cancelled = liveReservations(desk, now);
    if (cancelled.length > 0 && !input.cancelReservations) {
        return { status: "hasReservations", deskName: desk.name, count: cancelled.length };
    }

    const person = await personDetails(room.world, owner);
    const operations = combineOps(
        otherDesk ? leaveDeskOps(otherDesk, owner) : [],
        assignOps(desk, owner, { ownerName: person.name, dropReservations: cancelled.length > 0 }),
    );
    const result = await applyChange(room.target, operations);
    if (result.status !== "ok") return result;

    await auditDesk("desk.assign", actor, room, desk, {
        owner,
        previousOwner: desk.ownerId,
        movedFrom: otherDesk?.name ?? null,
    });
    for (const reservation of cancelled) {
        await auditDesk("desk.reservation_cancelled", actor, room, desk, {
            ...auditReservation(reservation),
            reason: "assigned",
        });
        void notifyDeskChange(room, reservation.userId, "reservationCancelled", desk, reservation);
        onDeskChanged({
            ...eventBase(room, desk, actor),
            type: "desk.reservation_cancelled",
            reservation: eventReservation(reservation),
            reason: "assigned",
        });
    }
    if (desk.ownerId !== null) void notifyDeskChange(room, desk.ownerId, "taken", desk);
    void notifyDeskChange(room, owner, "assigned", desk);
    if (otherDesk && samePerson(otherDesk.ownerId, owner)) {
        onDeskChanged({
            ...eventBase(room, otherDesk, actor),
            type: "desk.released",
            previousOwnerId: otherDesk.ownerId!,
            reason: "administrator",
        });
    }
    onDeskChanged({
        ...eventBase(room, desk, actor),
        type: "desk.assigned",
        ownerId: owner,
        previousOwnerId: desk.ownerId,
    });
    return { status: "ok", value: { previousOwner: desk.ownerId } };
}

/** Frees a desk, and the name shown on it. What its owner put on it stays on it. */
export async function releaseDesk(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string },
): Promise<DeskResult<{ previousOwner: string | null }>> {
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.ownerId === null) return { status: "ok", value: { previousOwner: null } };

    const result = await applyChange(room.target, releaseOps(desk));
    if (result.status !== "ok") return result;
    await auditDesk("desk.release", actor, room, desk, { previousOwner: desk.ownerId });
    void notifyDeskChange(room, desk.ownerId, "taken", desk);
    onDeskChanged({
        ...eventBase(room, desk, actor),
        type: "desk.released",
        previousOwnerId: desk.ownerId,
        reason: "administrator",
    });
    return { status: "ok", value: { previousOwner: desk.ownerId } };
}

/** Takes a desk out of service, or puts it back. Whoever has it keeps it. */
export async function setDeskDisabled(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; disabled: boolean },
): Promise<DeskResult> {
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.disabled === input.disabled) return { status: "ok", value: undefined };
    const result = await applyChange(room.target, setDisabledOps(desk, input.disabled));
    if (result.status !== "ok") return result;
    await auditDesk(input.disabled ? "desk.disable" : "desk.enable", actor, room, desk, {});
    return result;
}

export async function renameDesk(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; name: string },
): Promise<DeskResult> {
    const name = input.name.trim();
    if (name === "" || name.length > 200) return { status: "invalid" };
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.name === name) return { status: "ok", value: undefined };
    const result = await applyChange(room.target, renameOps(desk, name));
    if (result.status !== "ok") return result;
    await auditDesk("desk.rename", actor, room, desk, { newName: name });
    return result;
}

/** Whether employees claim the desk themselves ("dynamic") or only an administrator assigns it ("static"). */
export async function setDeskClaimMode(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; mode: DeskClaimMode },
): Promise<DeskResult> {
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.claimMode === input.mode) return { status: "ok", value: undefined };
    const result = await applyChange(room.target, setClaimModeOps(desk, input.mode));
    if (result.status !== "ok") return result;
    await auditDesk("desk.claim_mode", actor, room, desk, { mode: input.mode });
    return result;
}

/**
 * Who a desk is open to: only people holding one of these tags can claim it or sit at it (nobody needs one when there
 * are none). Tags follow the rule of the tags of a world: no comma, no space around, at most 64 characters.
 */
export async function setDeskTags(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; tags: string[] },
): Promise<DeskResult> {
    const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter((tag) => tag !== ""))];
    if (tags.length > MAX_DESK_TAGS || tags.some((tag) => !TAG_NAME_PATTERN.test(tag))) {
        return { status: "badTags", max: MAX_DESK_TAGS };
    }
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (tags.length === desk.allowedTags.length && tags.every((tag, index) => desk.allowedTags[index] === tag)) {
        return { status: "ok", value: undefined };
    }
    const result = await applyChange(room.target, setAllowedTagsOps(desk, tags));
    if (result.status !== "ok") return result;
    await auditDesk("desk.tags_changed", actor, room, desk, { tags, previousTags: desk.allowedTags });
    return result;
}

/**
 * Changes how a desk is used. Becoming a hot desk frees it (a hot desk belongs to nobody), and no longer being shared
 * removes its co-owners: both only when the administrator agreed to it, and the people who lose the desk are told.
 */
export async function setDeskType(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; deskType: DeskType; clearOwner: boolean; dropCoOwners: boolean },
): Promise<DeskResult<{ previousOwner: string | null; removedCoOwners: string[] }>> {
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.deskType === input.deskType) return { status: "ok", value: { previousOwner: null, removedCoOwners: [] } };
    const problem = deskTypeChangeProblem(desk, input.deskType, input);
    if (problem === "ownerMustBeCleared") return { status: "occupied", deskName: desk.name };
    if (problem === "coOwnersMustBeDropped") {
        return { status: "hasCoOwners", deskName: desk.name, count: desk.coOwnerIds.length };
    }

    const result = await applyChange(room.target, setDeskTypeOps(desk, input.deskType, input));
    if (result.status !== "ok") return result;
    const previousOwner = input.deskType === "hot" ? desk.ownerId : null;
    const removedCoOwners = desk.deskType === "shared" && input.deskType !== "shared" ? desk.coOwnerIds : [];
    await auditDesk("desk.type_changed", actor, room, desk, {
        from: desk.deskType,
        to: input.deskType,
        previousOwner,
        removedCoOwners,
    });
    if (previousOwner !== null) {
        void notifyDeskChange(room, previousOwner, "taken", desk);
        onDeskChanged({
            ...eventBase(room, desk, actor),
            type: "desk.released",
            previousOwnerId: previousOwner,
            reason: "type_changed",
        });
    }
    for (const coOwner of removedCoOwners) void notifyDeskChange(room, coOwner, "taken", desk);
    return { status: "ok", value: { previousOwner, removedCoOwners } };
}

/**
 * Sets the other people a shared desk belongs to. A person who already has another desk in the room is refused, and
 * when the desk gets people while reservations are to come, those are cancelled only if the administrator agreed.
 * The people added and removed are told.
 */
export async function setDeskCoOwners(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; coOwners: string[]; cancelReservations: boolean },
    clock: DeskClock = {},
): Promise<DeskResult<{ added: string[]; removed: string[] }>> {
    const now = clock.now ?? Date.now();
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    if (desk.deskType !== "shared") return { status: "notShared", deskName: desk.name };
    const normalized = normalizeCoOwnerIds(input.coOwners, desk.ownerId);
    if (!normalized.ok) {
        return normalized.problem.kind === "tooMany"
            ? { status: "tooManyCoOwners", max: normalized.problem.max }
            : { status: "invalid" };
    }
    const coOwners = normalized.ids;
    const added = coOwners.filter((id) => !desk.coOwnerIds.some((current) => samePerson(current, id)));
    const removed = desk.coOwnerIds.filter((current) => !coOwners.some((id) => samePerson(current, id)));
    if (added.length === 0 && removed.length === 0) return { status: "ok", value: { added, removed } };
    for (const person of added) {
        const other = otherDeskOf(room, person, desk);
        if (other) return { status: "alreadyHasDesk", deskName: other.name, person };
    }
    const live = liveReservations(desk, now);
    const dropReservations = (desk.ownerId !== null || coOwners.length > 0) && live.length > 0;
    if (dropReservations && !input.cancelReservations) {
        return { status: "hasReservations", deskName: desk.name, count: live.length };
    }

    const result = await applyChange(room.target, setCoOwnersOps(desk, coOwners, { dropReservations }));
    if (result.status !== "ok") return result;
    await auditDesk("desk.coowners_changed", actor, room, desk, { coOwners, added, removed });
    if (dropReservations) {
        for (const reservation of live) {
            await auditDesk("desk.reservation_cancelled", actor, room, desk, {
                ...auditReservation(reservation),
                reason: "shared",
            });
            void notifyDeskChange(room, reservation.userId, "reservationCancelled", desk, reservation);
            onDeskChanged({
                ...eventBase(room, desk, actor),
                type: "desk.reservation_cancelled",
                reservation: eventReservation(reservation),
                reason: "shared",
            });
        }
    }
    for (const person of added) void notifyDeskChange(room, person, "shared", desk);
    for (const person of removed) void notifyDeskChange(room, person, "taken", desk);
    return { status: "ok", value: { added, removed } };
}

export interface ReserveInput {
    roomId: string;
    deskId: string;
    /** Who the desk is kept for. */
    person: string;
    start: Date;
    end: Date;
    /** The time zone the administrator chose the times in: the email uses it when the person has none. */
    timeZone?: string;
}

/**
 * Keeps a desk that belongs to nobody for one person for a while: during that time only they sit at it (and claim it,
 * if it is a personal desk open to claiming), whatever its tags. Refused when it overlaps another reservation of the
 * desk, or one of the same person at another desk of the room. The person is told by email.
 */
export async function reserveDesk(
    access: OrganizationAccess,
    actor: DeskActor,
    input: ReserveInput,
    options: DeskClock & { limits?: Readonly<ReservationLimits> } = {},
): Promise<DeskResult<{ reservation: DeskReservation }>> {
    const now = options.now ?? Date.now();
    const person = normalizeOwnerId(input.person);
    if (!isPersonId(person)) return { status: "invalid" };
    if (Number.isNaN(input.start.getTime()) || Number.isNaN(input.end.getTime())) {
        return { status: "reservation", problem: { kind: "invalidPeriod" } };
    }
    const period = { start: input.start.toISOString(), end: input.end.toISOString() };
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    const problem = reservationProblem(desk, period, now, options.limits ?? RESERVATION_LIMITS);
    if (problem) return { status: "reservation", problem };
    for (const other of room.desks) {
        if (other.id === desk.id) continue;
        const busy = liveReservations(other, now).find(
            (reservation) => samePerson(reservation.userId, person) && reservationsOverlap(reservation, period),
        );
        if (busy) {
            return {
                status: "reservation",
                problem: { kind: "personBusy", deskName: other.name, start: busy.start, end: busy.end },
            };
        }
    }

    const details = await personDetails(room.world, person);
    const reservation: DeskReservation = {
        id: randomUUID(),
        userId: person,
        ...(details.name ? { userName: details.name } : {}),
        ...period,
    };
    const result = await applyChange(room.target, addReservationOps(desk, reservation, now));
    if (result.status !== "ok") return result;
    await auditDesk("desk.reserved", actor, room, desk, auditReservation(reservation));
    void notifyDeskChange(room, person, "reserved", desk, { ...reservation, timeZone: input.timeZone });
    onDeskChanged({
        ...eventBase(room, desk, actor),
        type: "desk.reserved",
        reservation: eventReservation(reservation),
    });
    return { status: "ok", value: { reservation } };
}

/** Cancels a reservation. The person is told, unless it was over already. */
export async function cancelDeskReservation(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string; reservationId: string; timeZone?: string },
    clock: DeskClock = {},
): Promise<DeskResult<{ reservation: DeskReservation }>> {
    const now = clock.now ?? Date.now();
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    const reservation = desk.reservations.find((candidate) => candidate.id === input.reservationId);
    const operations = reservation ? cancelReservationOps(desk, reservation.id) : null;
    if (!reservation || !operations) return { status: "notFound" };

    const result = await applyChange(room.target, operations);
    if (result.status !== "ok") return result;
    await auditDesk("desk.reservation_cancelled", actor, room, desk, auditReservation(reservation));
    if (reservationPhase(reservation, now) !== "past") {
        void notifyDeskChange(room, reservation.userId, "reservationCancelled", desk, {
            ...reservation,
            timeZone: input.timeZone,
        });
        onDeskChanged({
            ...eventBase(room, desk, actor),
            type: "desk.reservation_cancelled",
            reservation: eventReservation(reservation),
            reason: "administrator",
        });
    }
    return { status: "ok", value: { reservation } };
}

/** Removes the reservations of a desk that are over: they no longer mean anything, and the file stays small. */
export async function clearPastDeskReservations(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskId: string },
    clock: DeskClock = {},
): Promise<DeskResult<{ removed: number }>> {
    const now = clock.now ?? Date.now();
    const loaded = await loadDesk(access, input);
    if (loaded.status !== "ok") return loaded;
    const { room, desk } = loaded.value;
    const operations = clearPastReservationsOps(desk, now);
    if (!operations) return { status: "ok", value: { removed: 0 } };
    const stored = Array.isArray(desk.stored.reservations) ? desk.stored.reservations.length : 0;
    const removed = stored - liveReservations(desk, now).length;
    const result = await applyChange(room.target, operations);
    if (result.status !== "ok") return result;
    await auditDesk("desk.reservations_cleared", actor, room, desk, { count: removed });
    return { status: "ok", value: { removed } };
}

/**
 * Removes desks that belong to nobody and that nobody has kept. An occupied desk has to be freed first, and its
 * reservations to come cancelled: nothing is removed if one of them is not ready.
 */
export async function deleteDesks(
    access: OrganizationAccess,
    actor: DeskActor,
    input: { roomId: string; deskIds: string[] },
    clock: DeskClock = {},
): Promise<DeskResult<{ removed: number }>> {
    const now = clock.now ?? Date.now();
    const scope = scopeOf(access);
    const loaded = await loadRoom(scope.organizationId, input.roomId, scope.canManage);
    if (loaded.status !== "ok") return loaded;
    const wanted = new Set(input.deskIds);
    const desks = loaded.value.desks.filter((desk) => wanted.has(desk.id));
    if (desks.length === 0 || desks.length !== wanted.size) return { status: "notFound" };
    for (const desk of desks) {
        const problem = deskRemovalProblem(desk, now);
        if (problem === "occupied") return { status: "occupied", deskName: desk.name };
        if (problem === "reservations") {
            return { status: "hasReservations", deskName: desk.name, count: liveReservations(desk, now).length };
        }
    }

    const result = await applyChange(loaded.value.target, deleteOps(desks));
    if (result.status !== "ok") return result;
    for (const desk of desks) await auditDesk("desk.delete", actor, loaded.value, desk, {});
    return { status: "ok", value: { removed: desks.length } };
}

export type CreateDesksInput = Omit<
    DeskGridRequest,
    "originX" | "originY" | "deskWidth" | "deskHeight" | "gapX" | "gapY"
> & {
    roomId: string;
    /** In tiles of the map of the room. */
    originX: number;
    originY: number;
    deskWidth: number;
    deskHeight: number;
    gapX: number;
    gapY: number;
};

/** Adds a grid of free desks to a room. Nothing is added if any of them would not fit. */
export async function createDesks(
    access: OrganizationAccess,
    actor: DeskActor,
    input: CreateDesksInput,
): Promise<DeskResult<{ created: number }>> {
    const scope = scopeOf(access);
    const loaded = await loadRoom(scope.organizationId, input.roomId, scope.canManage);
    if (loaded.status !== "ok") return loaded;
    const room = loaded.value;
    // The administrator thinks in tiles; the map is in pixels. Without the size of its tiles, a layout cannot be made.
    if (!room.map) return { status: "mapProblem", problem: "invalid" };
    const tile = room.map.tileWidth;
    const plan = planDeskGrid(
        {
            ...input,
            originX: input.originX * tile,
            originY: input.originY * room.map.tileHeight,
            deskWidth: input.deskWidth * tile,
            deskHeight: input.deskHeight * room.map.tileHeight,
            gapX: input.gapX * tile,
            gapY: input.gapY * room.map.tileHeight,
        },
        { width: room.map.widthPx, height: room.map.heightPx },
        room.desks,
        randomUUID,
    );
    if (plan.problems.length > 0) return { status: "layout", problems: plan.problems };

    const result = await applyChange(room.target, createOps(plan.desks));
    if (result.status !== "ok") return result;
    await audit({
        action: "desk.create",
        account: actor.account,
        actorLabel: actor.actorLabel,
        organizationId: room.world.organizationId,
        worldId: room.world.id,
        targetType: "room",
        targetId: room.room.id,
        ipAddress: actor.ipAddress,
        details: {
            room: room.room.name,
            count: plan.desks.length,
            firstName: plan.desks[0]?.name,
            deskType: input.deskType ?? "assigned",
        },
    });
    return { status: "ok", value: { created: plan.desks.length } };
}

export { MAX_DESKS_PER_BATCH };

// ---------------------------------------------------------------------------------------------
// When a person leaves
// ---------------------------------------------------------------------------------------------

export interface DeskReleaseOutcome {
    /** Desks freed because their owner left. */
    released: number;
    /** Shared desks that one of the people who left belonged to. */
    coOwnershipsRemoved: number;
    /** Their reservations going on or to come, cancelled. */
    reservationsCancelled: number;
    /** Rooms that could not be read or changed. */
    failed: number;
}

const NOTHING_RELEASED: DeskReleaseOutcome = {
    released: 0,
    coOwnershipsRemoved: 0,
    reservationsCancelled: 0,
    failed: 0,
};

function addOutcomes(a: DeskReleaseOutcome, b: DeskReleaseOutcome): DeskReleaseOutcome {
    return {
        released: a.released + b.released,
        coOwnershipsRemoved: a.coOwnershipsRemoved + b.coOwnershipsRemoved,
        reservationsCancelled: a.reservationsCancelled + b.reservationsCancelled,
        failed: a.failed + b.failed,
    };
}

/**
 * Takes people who no longer have access (an employee removed or suspended, an invitation revoked) out of every desk:
 * the desks they own are freed, they are removed from the shared desks they belong to, and their reservations going on
 * or to come are cancelled. A desk must not stay with somebody who cannot use it. Only that changes; what they put on
 * the desks stays, for the next person or for an administrator to clear. They are not emailed: they left.
 *
 * Runs for every room of the organization whose map is on map-storage, as the system, one change per room. A room that
 * cannot be reached is counted as failed so that the caller can say so: nothing is silently left assigned.
 */
export async function releaseDesksOfPeople(
    organizationId: string,
    people: string[],
    actor: DeskActor,
    clock: DeskClock = {},
): Promise<DeskReleaseOutcome> {
    const now = clock.now ?? Date.now();
    const identifiers = new Set(
        people.map((person) => normalizeOwnerId(person).toLowerCase()).filter((id) => id !== ""),
    );
    if (identifiers.size === 0) return NOTHING_RELEASED;
    const isLeaving = (person: string) => identifiers.has(normalizeOwnerId(person).toLowerCase());
    const worlds = (await listOrganizationWorlds(organizationId)).filter((world) => worldState(world) === "open");
    if (worlds.length === 0) return NOTHING_RELEASED;
    const rooms = await db().query.rooms.findMany({
        where: and(
            inArray(
                schema.rooms.worldId,
                worlds.map((world) => world.id),
            ),
            eq(schema.rooms.mapKind, "wam"),
        ),
    });

    const outcomes = await mapWithConcurrency(rooms, READ_CONCURRENCY, async (room): Promise<DeskReleaseOutcome> => {
        const loaded = await loadRoom(organizationId, room.id, () => true);
        if (loaded.status !== "ok") {
            // A room that has no map to read cannot hold a desk: only a real failure to read counts.
            const harmless =
                loaded.status === "notFound" ||
                (loaded.status === "mapProblem" &&
                    ["noMap", "tiled", "notOnMapStorage", "otherOrganization"].includes(loaded.problem));
            return { ...NOTHING_RELEASED, failed: harmless ? 0 : 1 };
        }
        const removals = loaded.value.desks.flatMap((desk) => {
            const removal = removePeopleOps(desk, isLeaving, now);
            return removal ? [{ desk, removal }] : [];
        });
        if (removals.length === 0) return NOTHING_RELEASED;
        const result = await applyChange(
            loaded.value.target,
            combineOps(...removals.map(({ removal }) => removal.operations)),
        );
        if (result.status !== "ok") return { ...NOTHING_RELEASED, failed: 1 };

        for (const { desk, removal } of removals) {
            if (removal.releasedOwner !== null) {
                await auditDesk("desk.release", actor, loaded.value, desk, {
                    previousOwner: removal.releasedOwner,
                    reason: "person_left",
                });
                onDeskChanged({
                    ...eventBase(loaded.value, desk, actor),
                    type: "desk.released",
                    previousOwnerId: removal.releasedOwner,
                    reason: "person_left",
                });
            }
            if (removal.removedCoOwners.length > 0) {
                await auditDesk("desk.coowners_changed", actor, loaded.value, desk, {
                    removed: removal.removedCoOwners,
                    reason: "person_left",
                });
            }
            for (const reservation of removal.cancelled) {
                await auditDesk("desk.reservation_cancelled", actor, loaded.value, desk, {
                    ...auditReservation(reservation),
                    reason: "person_left",
                });
                onDeskChanged({
                    ...eventBase(loaded.value, desk, actor),
                    type: "desk.reservation_cancelled",
                    reservation: eventReservation(reservation),
                    reason: "person_left",
                });
            }
        }
        return {
            released: removals.filter(({ removal }) => removal.releasedOwner !== null).length,
            coOwnershipsRemoved: removals.filter(({ removal }) => removal.removedCoOwners.length > 0).length,
            reservationsCancelled: removals.reduce((total, { removal }) => total + removal.cancelled.length, 0),
            failed: 0,
        };
    });
    return outcomes.reduce(addOutcomes, NOTHING_RELEASED);
}

/**
 * Takes the accounts that lost their place in the organization (suspended, removed, left) out of their desks. Never
 * throws and never blocks the change that triggered it: if a desk could not be changed (map-storage unreachable, say),
 * that is written to the audit log, where an administrator can see it, and the Desk Manager still shows the desk as
 * theirs.
 */
export async function freeDesksOfAccounts(
    organizationId: string,
    accountIds: string[],
    actor: DeskActor,
    reason: "suspended" | "removed" | "left",
): Promise<DeskReleaseOutcome> {
    try {
        if (accountIds.length === 0) return NOTHING_RELEASED;
        const rows = await db()
            .select({ email: schema.accounts.email })
            .from(schema.accounts)
            .where(inArray(schema.accounts.id, accountIds));
        return await freeDesksOf(
            organizationId,
            rows.map((row) => row.email),
            actor,
            reason,
        );
    } catch {
        return { ...NOTHING_RELEASED, failed: 1 };
    }
}

/** Frees the desks of an invited person whose invitation was revoked, and cancels their reservations. */
export async function freeDesksOfInvitation(
    organizationId: string,
    invitationId: string,
    actor: DeskActor,
): Promise<DeskReleaseOutcome> {
    try {
        const [row] = await db()
            .select({ email: schema.invitations.email })
            .from(schema.invitations)
            .where(and(eq(schema.invitations.organizationId, organizationId), eq(schema.invitations.id, invitationId)))
            .limit(1);
        return row ? await freeDesksOf(organizationId, [row.email], actor, "revoked") : NOTHING_RELEASED;
    } catch {
        return { ...NOTHING_RELEASED, failed: 1 };
    }
}

async function freeDesksOf(
    organizationId: string,
    people: string[],
    actor: DeskActor,
    reason: string,
): Promise<DeskReleaseOutcome> {
    const outcome = await releaseDesksOfPeople(organizationId, people, actor);
    if (outcome.failed > 0) {
        await audit({
            action: "desk.release_failed",
            account: actor.account,
            actorLabel: actor.actorLabel,
            organizationId,
            targetType: "organization",
            targetId: organizationId,
            ipAddress: actor.ipAddress,
            details: {
                reason,
                rooms: outcome.failed,
                released: outcome.released,
                coOwnershipsRemoved: outcome.coOwnershipsRemoved,
                reservationsCancelled: outcome.reservationsCancelled,
            },
        });
    }
    return outcome;
}

// ---------------------------------------------------------------------------------------------
// Telling the person
// ---------------------------------------------------------------------------------------------

type DeskNotice = "assigned" | "taken" | "shared" | "reserved" | "reservationCancelled";

/** The time a reservation keeps a desk, and the time zone of the administrator (used when the person has none). */
interface NoticePeriod {
    start: string;
    end: string;
    timeZone?: string | undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tells a person by email what changed for them: a desk given to them, taken from them, shared with them, kept for
 * them, or no longer kept for them. Times are written in their language and time zone (their account's, else the
 * administrator's, else UTC, always named). Best effort: a failure to send never undoes the change (the delivery is
 * recorded by sendMail), and nothing is sent to an identifier that is not an email.
 */
async function notifyDeskChange(
    loaded: Pick<LoadedRoom, "room" | "world">,
    recipient: string,
    notice: DeskNotice,
    desk: Pick<DeskRecord, "name">,
    period?: NoticePeriod,
): Promise<void> {
    try {
        if (!EMAIL.test(recipient)) return;
        const person = await personDetails(loaded.world, recipient);
        const locale: Locale = person.locale ?? DEFAULT_LOCALE;
        const timeZone =
            [person.timeZone, period?.timeZone].find((zone) => isValidTimeZone(zone ?? undefined)) ?? "UTC";
        const text = messagesFor(locale).desks.mail[notice];
        const info = localeInfo(locale);
        const params: Record<string, string> = {
            desk: desk.name,
            room: loaded.room.name,
            world: loaded.world.name,
            ...(period
                ? {
                      start: formatDateTime(period.start, { locale, timeZone }),
                      end: formatDateTime(period.end, { locale, timeZone }),
                      timeZone,
                  }
                : {}),
        };
        await sendMail({
            to: recipient,
            purpose: "desk_changed",
            organizationId: loaded.world.organizationId,
            message: {
                subject: format(text.subject, params),
                paragraphs: [format(text.body, params)],
                dir: info.dir,
                lang: info.tag,
            },
        });
    } catch {
        // The desk was changed; telling the person is a courtesy.
    }
}
