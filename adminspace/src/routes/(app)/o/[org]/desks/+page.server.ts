/**
 * The Desk Manager, for administrators: every desk of the organization's offices (or of one workspace, ?workspace=slug),
 * who it belongs to, who it is kept for, and the changes an administrator makes: assign a desk or reserve it for
 * someone, free it, change how it is used (personal, hot, shared), choose its co-owners and who it is open to, take it
 * out of service, rename it, remove it, add desks in bulk, assign or reserve several at once.
 *
 * Every load and every action needs room.manage in the workspace of the room it is about (checked again by the
 * service on each change, from the room itself and not from what the form says). The desks live in the WAM files of
 * the rooms on map-storage: nothing is stored here, and each change is audited by the service. Times typed in a form
 * are in the administrator's time zone (their account's, else UTC), shown next to the form.
 */
import { error, fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import type { OrganizationAccess } from "$lib/server/auth/rbac";
import { loadOrganization } from "$lib/server/context";
import { isUuid } from "$lib/server/http/forms";
import { findWorkspace, listWorkspaces } from "$lib/server/services/workspaces";
import { isValidTimeZone, localDateTimeToUtc } from "$lib/server/services/worldAdmin";
import {
    MAX_DESK_TAGS,
    MAX_INVENTORY_ROOMS,
    RESERVATION_LIMITS,
    assignDesk,
    assignablePeople,
    cancelDeskReservation,
    clearPastDeskReservations,
    createDesks,
    deleteDesks,
    deskInventory,
    listRoomDesks,
    releaseDesk,
    renameDesk,
    reserveDesk,
    setDeskClaimMode,
    setDeskCoOwners,
    setDeskDisabled,
    setDeskTags,
    setDeskType,
    type DeskActor,
    type DeskFailure,
    type DeskReservationProblem,
    type DeskView,
} from "$lib/server/services/desks";
import { matchesDeskFilters, parseDeskFilters, type FilterablePerson } from "$lib/desks/filter";
import { MAX_BULK_LINES, nextDay, parseBulkLines, type BulkLine, type BulkLineStatus } from "$lib/desks/bulk";
import { MAX_CO_OWNERS, MAX_DESKS_PER_BATCH } from "$lib/desks/model";
import type { DeskErrorCode as ErrorCode, DeskOp as Op, ReservationRefusal } from "$lib/desks/feedback";

function requireDeskAccess(access: OrganizationAccess): void {
    if (!access.canSomewhere("room.manage")) error(403, "Forbidden");
}

/** The workspace of ?workspace=slug, when the person may manage its rooms (404 otherwise). */
async function scopedWorkspace(access: OrganizationAccess, slug: string | null) {
    if (!slug) return undefined;
    const workspace = await findWorkspace(access.organization.id, slug);
    if (!workspace || !access.can("room.manage", { workspaceId: workspace.id })) error(404, "Not found");
    return workspace;
}

/** The time zone the administrator types times in: their account's, else UTC. */
function zoneOf(locals: App.Locals): string {
    return isValidTimeZone(locals.timeZone) ? locals.timeZone : "UTC";
}

/** The people a desk is about besides its owner, for the search: its co-owners and who it is kept for. */
function otherPeopleOf(desk: DeskView): FilterablePerson[] {
    return [
        ...desk.coOwners.map((coOwner) => ({
            id: coOwner.id,
            name: coOwner.info?.name ?? null,
            email: coOwner.info?.email ?? null,
        })),
        ...desk.reservations
            .filter((reservation) => reservation.phase !== "past")
            .map((reservation) => ({
                id: reservation.userId,
                name: reservation.person?.name ?? reservation.userName,
                email: reservation.person?.email ?? null,
            })),
    ];
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "organization.read");
    requireDeskAccess(access);
    const workspace = await scopedWorkspace(access, url.searchParams.get("workspace"));
    const filters = parseDeskFilters(url.searchParams);
    const [inventory, people, workspaces] = await Promise.all([
        deskInventory(access, workspace?.id),
        assignablePeople(access),
        listWorkspaces(access.organization.id),
    ]);
    const searching = filters.q !== "" || filters.status !== null || filters.type !== null;
    const rooms = inventory.rooms
        .filter((view) => filters.roomId === null || view.room.id === filters.roomId)
        .map((view) => ({
            ...view,
            // What the filters leave: the plan and the table show the same desks.
            desks: view.desks.filter((desk) => matchesDeskFilters({ ...desk, people: otherPeopleOf(desk) }, filters)),
            deskCount: view.desks.length,
        }))
        .filter((view) => view.problem !== null || !searching || view.desks.length > 0);
    return {
        scope: workspace ? { id: workspace.id, slug: workspace.slug, name: workspace.name } : null,
        scopes: workspaces
            .filter((candidate) => access.can("room.manage", { workspaceId: candidate.id }))
            .map((candidate) => ({ slug: candidate.slug, name: candidate.name })),
        filters,
        roomOptions: inventory.rooms.map((view) => ({ id: view.room.id, name: view.room.name })),
        totals: inventory.counts,
        upcoming: inventory.upcoming,
        truncated: inventory.truncated,
        maxRooms: MAX_INVENTORY_ROOMS,
        maxDesksPerBatch: MAX_DESKS_PER_BATCH,
        maxCoOwners: MAX_CO_OWNERS,
        maxTags: MAX_DESK_TAGS,
        limits: { ...RESERVATION_LIMITS },
        timeZone: zoneOf(locals),
        rooms,
        people,
    };
};

// ---------------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------------

function refusal(problem: DeskReservationProblem): ReservationRefusal {
    switch (problem.kind) {
        case "invalidPeriod":
        case "past":
        case "hasHolders":
            return { kind: problem.kind };
        case "tooLong":
            return { kind: "tooLong", days: problem.maxDays };
        case "tooFar":
            return { kind: "tooFar", days: problem.maxAdvanceDays };
        case "tooMany":
            return { kind: "tooMany", max: problem.max };
        case "overlap":
            return {
                kind: "overlap",
                person: problem.with.userName ?? problem.with.userId,
                start: problem.with.start,
                end: problem.with.end,
            };
        case "personBusy":
            return { kind: "personBusy", desk: problem.deskName, start: problem.start, end: problem.end };
    }
}

const roomId = z.string().refine(isUuid);
/** Ids of areas: usually UUIDs, but any string the map editor made. */
const deskId = z.string().min(1).max(200);
const shownName = z.string().max(200).default("");
/** A checkbox: present when ticked. */
const tick = z
    .string()
    .optional()
    .transform((value) => value !== undefined && value !== "" && value !== "0");
/** An <input type="datetime-local">: "2026-11-02T09:00", seconds left out. */
const localDateTime = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/)
    .transform((value) => value.slice(0, 16));

function formValues(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) if (typeof value === "string") values[key] = value;
    return values;
}

function actorOf(account: { id: string; email: string }, clientIp: string | undefined): DeskActor {
    return { account: { id: account.id, email: account.email }, ipAddress: clientIp ?? null };
}

/** The answer to the page for a change that was refused. */
function refused(
    op: Op,
    target: { roomId: string; deskId?: string; deskName?: string },
    failure: DeskFailure,
): ReturnType<typeof fail> {
    const base = { op, ...target };
    switch (failure.status) {
        case "forbidden":
            return error(403, "Forbidden");
        case "notFound":
            return fail(404, { ...base, error: "notFound" as ErrorCode });
        case "mapProblem":
            return fail(400, { ...base, error: "mapProblem" as ErrorCode });
        case "changed":
            return fail(409, { ...base, error: "changed" as ErrorCode });
        case "invalid":
            return fail(400, { ...base, error: "invalid" as ErrorCode });
        case "alreadyHasDesk":
            return fail(409, {
                ...base,
                error: (failure.person ? "coOwnerHasDesk" : "alreadyHasDesk") as ErrorCode,
                otherDesk: failure.deskName,
                person: failure.person ?? "",
            });
        case "occupied":
            return fail(409, {
                ...base,
                error: (op === "remove" ? "occupiedRemove" : op === "type" ? "occupiedType" : "occupied") as ErrorCode,
                deskName: failure.deskName,
            });
        case "hotDesk":
            return fail(409, { ...base, error: "hotDesk" as ErrorCode, deskName: failure.deskName });
        case "notShared":
            return fail(409, { ...base, error: "notShared" as ErrorCode, deskName: failure.deskName });
        case "hasReservations":
            return fail(409, {
                ...base,
                error: (op === "remove" ? "hasReservationsRemove" : "hasReservations") as ErrorCode,
                deskName: failure.deskName,
                count: failure.count,
            });
        case "hasCoOwners":
            return fail(409, {
                ...base,
                error: "hasCoOwners" as ErrorCode,
                deskName: failure.deskName,
                count: failure.count,
            });
        case "tooManyCoOwners":
            return fail(400, { ...base, error: "tooManyCoOwners" as ErrorCode, max: failure.max });
        case "badTags":
            return fail(400, { ...base, error: "badTags" as ErrorCode, max: failure.max });
        case "reservation":
            return fail(409, { ...base, error: "reservation" as ErrorCode, problem: refusal(failure.problem) });
        case "layout": {
            const problem = failure.problems[0];
            return fail(422, {
                ...base,
                error: "layout" as ErrorCode,
                layout:
                    problem?.kind === "outOfBounds" || problem?.kind === "overlaps"
                        ? { kind: problem.kind, number: problem.index + 1 }
                        : problem?.kind === "tooMany"
                          ? { kind: problem.kind, max: problem.max }
                          : { kind: "invalid" as const },
            });
        }
        case "unavailable":
            return fail(502, { ...base, error: "unavailable" as ErrorCode });
    }
}

const AssignForm = z.object({
    roomId,
    deskId,
    deskName: shownName,
    owner: z.string().trim().min(1).max(320),
    moveFromOtherDesk: tick,
    takeFromCurrentOwner: tick,
    cancelReservations: tick,
});

const DeskForm = z.object({ roomId, deskId, deskName: shownName });
const ToggleForm = DeskForm.extend({ disabled: tick });
const RenameForm = DeskForm.extend({ name: z.string().trim().min(1).max(200) });
const ClaimForm = DeskForm.extend({ mode: z.enum(["dynamic", "static"]) });
const deskTypeField = z.enum(["assigned", "hot", "shared"]);
const TypeForm = DeskForm.extend({ deskType: deskTypeField, clearOwner: tick, dropCoOwners: tick });
const CoOwnersForm = DeskForm.extend({ coOwners: z.string().max(20_000).default(""), cancelReservations: tick });
const TagsForm = DeskForm.extend({ tags: z.string().max(4_000).default("") });
const ReserveForm = DeskForm.extend({
    person: z.string().trim().min(1).max(320),
    start: localDateTime,
    end: localDateTime,
});
const CancelReservationForm = DeskForm.extend({ reservationId: z.string().min(1).max(200) });

const whole = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const CreateForm = z.object({
    roomId,
    columns: whole(1, 100),
    rows: whole(1, 100),
    deskWidth: whole(1, 20),
    deskHeight: whole(1, 20),
    gapX: whole(0, 20),
    gapY: whole(0, 20),
    originX: whole(0, 10_000),
    originY: whole(0, 10_000),
    namePrefix: z.string().trim().min(1).max(100),
    startNumber: whole(0, 100_000),
    claimMode: z.enum(["dynamic", "static"]),
    deskType: deskTypeField.default("assigned"),
});

const BulkForm = z.object({ roomId, lines: z.string().max(40_000) });

/** A list typed in a textarea or an input: one entry per line, or separated by commas or semicolons. */
const listOf = (text: string) =>
    text
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry !== "");

/** What a bulk line became, for a reservation refused by the rules of the desk. */
function bulkStatusOf(problem: DeskReservationProblem): BulkLineStatus {
    return problem.kind === "invalidPeriod" ? "invalidDays" : problem.kind;
}

export const actions: Actions = {
    assign: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = AssignForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "assign" as const, roomId: "", error: "invalid" as ErrorCode });
        const form = parsed.data;
        const result = await assignDesk(access, actorOf(account, locals.clientIp), {
            roomId: form.roomId,
            deskId: form.deskId,
            owner: form.owner,
            moveFromOtherDesk: form.moveFromOtherDesk,
            takeFromCurrentOwner: form.takeFromCurrentOwner,
            cancelReservations: form.cancelReservations,
        });
        if (result.status !== "ok") {
            return refused("assign", { roomId: form.roomId, deskId: form.deskId, deskName: form.deskName }, result);
        }
        return {
            op: "assign" as const,
            roomId: form.roomId,
            deskId: form.deskId,
            success: "assigned" as const,
            deskName: form.deskName,
            person: form.owner.trim(),
        };
    },

    free: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = DeskForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "free" as const, roomId: "", error: "invalid" as ErrorCode });
        const form = parsed.data;
        const result = await releaseDesk(access, actorOf(account, locals.clientIp), form);
        if (result.status !== "ok") return refused("free", form, result);
        return { op: "free" as const, ...form, success: "freed" as const };
    },

    toggle: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = ToggleForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "toggle" as const, roomId: "", error: "invalid" as ErrorCode });
        const { disabled, ...form } = parsed.data;
        const result = await setDeskDisabled(access, actorOf(account, locals.clientIp), { ...form, disabled });
        if (result.status !== "ok") return refused("toggle", form, result);
        return {
            op: "toggle" as const,
            ...form,
            success: (disabled ? "disabled" : "enabled") as "disabled" | "enabled",
        };
    },

    rename: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = RenameForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "rename" as const, roomId: "", error: "invalid" as ErrorCode });
        const { name, ...form } = parsed.data;
        const result = await renameDesk(access, actorOf(account, locals.clientIp), { ...form, name });
        if (result.status !== "ok") return refused("rename", form, result);
        return { op: "rename" as const, ...form, deskName: name, success: "renamed" as const };
    },

    claim: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = ClaimForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "claim" as const, roomId: "", error: "invalid" as ErrorCode });
        const { mode, ...form } = parsed.data;
        const result = await setDeskClaimMode(access, actorOf(account, locals.clientIp), { ...form, mode });
        if (result.status !== "ok") return refused("claim", form, result);
        return { op: "claim" as const, ...form, success: "claim" as const };
    },

    type: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = TypeForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "type" as const, roomId: "", error: "invalid" as ErrorCode });
        const { deskType, clearOwner, dropCoOwners, ...form } = parsed.data;
        const result = await setDeskType(access, actorOf(account, locals.clientIp), {
            ...form,
            deskType,
            clearOwner,
            dropCoOwners,
        });
        if (result.status !== "ok") return refused("type", form, result);
        return { op: "type" as const, ...form, success: "typeChanged" as const, deskType };
    },

    coOwners: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = CoOwnersForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "coOwners" as const, roomId: "", error: "invalid" as ErrorCode });
        const { coOwners, cancelReservations, ...form } = parsed.data;
        const result = await setDeskCoOwners(access, actorOf(account, locals.clientIp), {
            ...form,
            coOwners: listOf(coOwners),
            cancelReservations,
        });
        if (result.status !== "ok") return refused("coOwners", form, result);
        return { op: "coOwners" as const, ...form, success: "coOwners" as const };
    },

    tags: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = TagsForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "tags" as const, roomId: "", error: "invalid" as ErrorCode });
        const { tags, ...form } = parsed.data;
        const result = await setDeskTags(access, actorOf(account, locals.clientIp), {
            ...form,
            tags: tags.split(",").map((tag) => tag.trim()),
        });
        if (result.status !== "ok") return refused("tags", form, result);
        return { op: "tags" as const, ...form, success: "tags" as const };
    },

    reserve: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = ReserveForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "reserve" as const, roomId: "", error: "invalid" as ErrorCode });
        const { person, start, end, ...form } = parsed.data;
        const timeZone = zoneOf(locals);
        const startAt = localDateTimeToUtc(start, timeZone);
        const endAt = localDateTimeToUtc(end, timeZone);
        if (!startAt || !endAt) {
            return fail(400, {
                op: "reserve" as const,
                ...form,
                error: "reservation" as ErrorCode,
                problem: { kind: "invalidPeriod" } as ReservationRefusal,
            });
        }
        const result = await reserveDesk(access, actorOf(account, locals.clientIp), {
            ...form,
            person,
            start: startAt,
            end: endAt,
            timeZone,
        });
        if (result.status !== "ok") return refused("reserve", form, result);
        const reservation = result.value.reservation;
        return {
            op: "reserve" as const,
            ...form,
            success: "reserved" as const,
            person: reservation.userName ?? reservation.userId,
            start: reservation.start,
            end: reservation.end,
        };
    },

    cancelReservation: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = CancelReservationForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) {
            return fail(400, { op: "cancelReservation" as const, roomId: "", error: "invalid" as ErrorCode });
        }
        const { reservationId, ...form } = parsed.data;
        const result = await cancelDeskReservation(access, actorOf(account, locals.clientIp), {
            ...form,
            reservationId,
            timeZone: zoneOf(locals),
        });
        if (result.status !== "ok") return refused("cancelReservation", form, result);
        const reservation = result.value.reservation;
        return {
            op: "cancelReservation" as const,
            ...form,
            success: "reservationCancelled" as const,
            person: reservation.userName ?? reservation.userId,
        };
    },

    clearPast: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = DeskForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "clearPast" as const, roomId: "", error: "invalid" as ErrorCode });
        const form = parsed.data;
        const result = await clearPastDeskReservations(access, actorOf(account, locals.clientIp), form);
        if (result.status !== "ok") return refused("clearPast", form, result);
        return { op: "clearPast" as const, ...form, success: "pastCleared" as const, count: result.value.removed };
    },

    remove: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = DeskForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "remove" as const, roomId: "", error: "invalid" as ErrorCode });
        const form = parsed.data;
        const result = await deleteDesks(access, actorOf(account, locals.clientIp), {
            roomId: form.roomId,
            deskIds: [form.deskId],
        });
        if (result.status !== "ok") return refused("remove", form, result);
        return { op: "remove" as const, roomId: form.roomId, success: "removed" as const, count: result.value.removed };
    },

    create: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = CreateForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "create" as const, roomId: "", error: "invalid" as ErrorCode });
        const form = parsed.data;
        const result = await createDesks(access, actorOf(account, locals.clientIp), {
            ...form,
            allowedTags: [],
        });
        if (result.status !== "ok") return refused("create", { roomId: form.roomId }, result);
        return { op: "create" as const, roomId: form.roomId, success: "created" as const, count: result.value.created };
    },

    bulkAssign: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        requireDeskAccess(access);
        const parsed = BulkForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) {
            return fail(400, { op: "bulkAssign" as const, roomId: "", error: "invalid" as ErrorCode });
        }
        const form = parsed.data;
        const lines = parseBulkLines(form.lines);
        if (lines.length === 0 || lines.length > MAX_BULK_LINES) {
            return fail(400, { op: "bulkAssign" as const, roomId: form.roomId, error: "invalid" as ErrorCode });
        }
        const known = await listRoomDesks(access, form.roomId);
        if (known.status !== "ok") return refused("bulkAssign", { roomId: form.roomId }, known);

        const actor = actorOf(account, locals.clientIp);
        const timeZone = zoneOf(locals);
        const report: BulkLine[] = [];
        for (const { line, desk: wanted, person, daysText, days } of lines) {
            const entry = { line, desk: wanted, person, ...(daysText ? { days: daysText } : {}) };
            const matches = known.value.filter((candidate) => candidate.name.toLowerCase() === wanted.toLowerCase());
            if (person === "" || wanted === "") {
                report.push({ ...entry, status: "invalid" });
            } else if (daysText !== "" && days === null) {
                report.push({ ...entry, status: "invalidDays" });
            } else if (matches.length === 0) {
                report.push({ ...entry, status: "notFound" });
            } else if (matches.length > 1) {
                report.push({ ...entry, status: "ambiguous" });
            } else if (days) {
                // Whole days in the administrator's time zone: from the start of the first to the start of the next.
                const start = localDateTimeToUtc(`${days.first}T00:00`, timeZone);
                const end = localDateTimeToUtc(`${nextDay(days.last)}T00:00`, timeZone);
                if (!start || !end) {
                    report.push({ ...entry, status: "invalidDays" });
                    continue;
                }
                // Each line is its own change, checked on its own: one that cannot be made does not stop the others.
                const result = await reserveDesk(access, actor, {
                    roomId: form.roomId,
                    deskId: matches[0]!.id,
                    person,
                    start,
                    end,
                    timeZone,
                });
                if (result.status === "ok") report.push({ ...entry, status: "reserved" });
                else if (result.status === "forbidden") error(403, "Forbidden");
                else if (result.status === "reservation") {
                    report.push({
                        ...entry,
                        status: bulkStatusOf(result.problem),
                        ...(result.problem.kind === "personBusy" ? { other: result.problem.deskName } : {}),
                    });
                } else if (result.status === "changed") report.push({ ...entry, status: "changed" });
                else if (result.status === "invalid") report.push({ ...entry, status: "invalid" });
                else report.push({ ...entry, status: "failed" });
            } else {
                const result = await assignDesk(access, actor, {
                    roomId: form.roomId,
                    deskId: matches[0]!.id,
                    owner: person,
                    moveFromOtherDesk: false,
                    takeFromCurrentOwner: false,
                });
                if (result.status === "ok") report.push({ ...entry, status: "ok" });
                else if (result.status === "forbidden") error(403, "Forbidden");
                else if (result.status === "occupied") report.push({ ...entry, status: "occupied" });
                else if (result.status === "alreadyHasDesk") {
                    report.push({ ...entry, status: "alreadyHasDesk", other: result.deskName });
                } else if (result.status === "hotDesk") report.push({ ...entry, status: "hotDesk" });
                else if (result.status === "hasReservations") report.push({ ...entry, status: "hasReservations" });
                else if (result.status === "changed") report.push({ ...entry, status: "changed" });
                else if (result.status === "invalid") report.push({ ...entry, status: "invalid" });
                else report.push({ ...entry, status: "failed" });
            }
        }
        return {
            op: "bulkAssign" as const,
            roomId: form.roomId,
            success: "bulk" as const,
            count: report.filter((entry) => entry.status === "ok").length,
            reservedCount: report.filter((entry) => entry.status === "reserved").length,
            report,
        };
    },
};
