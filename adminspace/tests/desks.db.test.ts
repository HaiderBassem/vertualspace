/**
 * The desk service against the real database and a local fake map-storage (tests/support/fakeMapStorage.ts): the
 * inventory with every state, assigning (with the name shown on the desk) and freeing (what employees put on a desk
 * stays), hot and shared desks, co-owners, reservations, who a desk is open to, taking out of service, renaming, adding
 * and removing desks, who may do what, a change built on a view that is out of date, the audit log, the email to the
 * people concerned, the events announced to integrations, and the desks freed when a person leaves (also when
 * map-storage is down). Everything is created under "desk-test-*" and deleted after; instance settings are restored.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, like, sql } from "drizzle-orm";

// The emails are really sent through sendMail (and recorded); the spy lets the tests read what they say.
vi.mock("../src/lib/server/services/mail", async (importOriginal) => {
    const original = await importOriginal<typeof import("../src/lib/server/services/mail")>();
    return { ...original, sendMail: vi.fn(original.sendMail) };
});

import { closeDb, db, schema } from "../src/lib/server/db/client";
import { buildAccess, type OrganizationAccess } from "../src/lib/server/auth/rbac";
import { saveInstanceSettings } from "../src/lib/server/services/instance";
import { sendMail } from "../src/lib/server/services/mail";
import {
    assignDesk,
    assignablePeople,
    cancelDeskReservation,
    clearPastDeskReservations,
    createDesks,
    deleteDesks,
    deskInventory,
    freeDesksOfAccounts,
    freeDesksOfInvitation,
    releaseDesk,
    releaseDesksOfPeople,
    renameDesk,
    reserveDesk,
    setDeskClaimMode,
    setDeskCoOwners,
    setDeskDisabled,
    setDeskTags,
    setDeskType,
    type CreateDesksInput,
    type DeskActor,
} from "../src/lib/server/services/desks";
import { setDeskEventListener, type DeskEvent } from "../src/lib/server/services/deskEvents";
import { readInstanceSettings } from "../src/lib/settings/instanceSettings";
import { formatDateTime } from "../src/lib/i18n/format";
import { startFakeMapStorage, type FakeMapStorage } from "./support/fakeMapStorage";

const SUFFIX = Date.now().toString(36);
const ORG = `desk-test-${SUFFIX}`;
const TOKEN = "map-storage-token-for-desk-tests-0123456789";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

let fake: FakeMapStorage;
let savedSettings: unknown;
let organization: typeof schema.organizations.$inferSelect;
let otherOrganizationId = "";
let workspaceA = "";
let workspaceB = "";
let world: typeof schema.worlds.$inferSelect;
let worldB: typeof schema.worlds.$inferSelect;
let account: typeof schema.accounts.$inferSelect;
let erin: typeof schema.accounts.$inferSelect;
let admin: OrganizationAccess;
let employee: OrganizationAccess;
let managerOfB: OrganizationAccess;
let actor: DeskActor;

interface DeskOptions {
    ownerId?: string | null;
    mode?: "dynamic" | "static";
    disabled?: boolean;
    /** Maps written by tools may have no `ownerId` at all. */
    withoutOwnerKey?: boolean;
    /** More keys of the property: deskType, coOwnerIds, ownerName, reservations, seats... */
    extra?: Record<string, unknown>;
}

function desk(id: string, name: string, x: number, options: DeskOptions = {}) {
    return {
        id,
        name,
        x,
        y: 0,
        width: 64,
        height: 64,
        visible: true,
        properties: [
            {
                id: `${id}-p`,
                type: "personalAreaPropertyData",
                accessClaimMode: options.mode ?? "dynamic",
                allowedTags: [],
                ...(options.withoutOwnerKey ? {} : { ownerId: options.ownerId ?? null }),
                ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
                ...options.extra,
            },
        ],
    };
}

/** A reservation as stored in the WAM file, `fromHours` to `toHours` from now. */
function stored(id: string, userId: string, fromHours: number, toHours: number) {
    return {
        id,
        userId,
        start: new Date(Date.now() + fromHours * HOUR).toISOString(),
        end: new Date(Date.now() + toHours * HOUR).toISOString(),
    };
}

/** A room on the fake map-storage: a 20 × 15 tiles Tiled map (32 px tiles) and a WAM file with the given areas. */
function putRoom(directory: string, areas: unknown[], entities: Record<string, unknown> = {}): string {
    fake.put(`${directory}/map.tmj`, {
        type: "map",
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        infinite: false,
        layers: [{ name: "floor", type: "tilelayer", width: 20, height: 15, data: Array(300).fill(0) }],
        tilesets: [],
    });
    fake.put(`${directory}/map.wam`, { version: "2.1.0", mapUrl: "./map.tmj", entities, areas, entityCollections: [] });
    return `${fake.url}/${directory}/map.wam`;
}

interface StoredArea {
    id: string;
    name: string;
    x: number;
    width: number;
    properties: Record<string, unknown>[];
}

const wamOf = (directory: string) =>
    fake.json(`${directory}/map.wam`) as { areas: StoredArea[]; entities: Record<string, unknown> };

const propertyOf = (directory: string, deskId: string) =>
    wamOf(directory).areas.find((area) => area.id === deskId)?.properties[0];

const ownerOf = (directory: string, deskId: string): unknown => propertyOf(directory, deskId)?.ownerId;

const reservationsOf = (directory: string, deskId: string) =>
    (propertyOf(directory, deskId)?.reservations ?? []) as { id: string; userId: string; userName?: string }[];

/** Finds the room of the slug in the world, or adds it: the files are rewritten before each test, the rooms are not. */
async function roomOf(targetWorld: typeof world, slug: string, directory: string, name = slug) {
    const existing = await db().query.rooms.findFirst({
        where: and(eq(schema.rooms.worldId, targetWorld.id), eq(schema.rooms.slug, slug)),
    });
    if (existing) return existing;
    return insertRoom(targetWorld, slug, `${fake.url}/${directory}/map.wam`, name);
}

async function insertRoom(targetWorld: typeof world, slug: string, wamUrl: string | null, name = slug) {
    const [room] = await db()
        .insert(schema.rooms)
        .values({ worldId: targetWorld.id, slug, name, mapKind: "wam", wamUrl })
        .returning();
    return room!;
}

async function auditActions(): Promise<string[]> {
    const rows = await db()
        .select({ action: schema.auditLogs.action })
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.organizationId, organization.id))
        .orderBy(schema.auditLogs.occurredAt);
    return rows.map((row) => row.action);
}

/** The last audit entry of this action on this desk. */
async function lastAudit(action: string, deskId: string) {
    const [entry] = await db()
        .select()
        .from(schema.auditLogs)
        .where(
            and(
                eq(schema.auditLogs.organizationId, organization.id),
                eq(schema.auditLogs.action, action),
                eq(schema.auditLogs.targetId, deskId),
            ),
        )
        .orderBy(sql`${schema.auditLogs.occurredAt} desc`)
        .limit(1);
    return entry;
}

/** Emails sent before the current test (see the beforeEach below). */
let mailsBefore = 0;

/**
 * The email with this subject that the desk service sent to this person during the current test. Emails are sent after
 * the answer: waits for it.
 */
async function mailTo(recipient: string, subject: string) {
    let found: Parameters<typeof sendMail>[0] | undefined;
    await vi.waitFor(
        () => {
            found = vi
                .mocked(sendMail)
                .mock.calls.slice(mailsBefore)
                .map(([input]) => input)
                .filter((input) => input.to === recipient && input.purpose === "desk_changed")
                .findLast((input) => input.message.subject === subject);
            expect(found).toBeDefined();
        },
        { timeout: 3000, interval: 25 },
    );
    return found!;
}

const free = { moveFromOtherDesk: false, takeFromCurrentOwner: false };

const grid: Omit<CreateDesksInput, "roomId"> = {
    columns: 3,
    rows: 2,
    deskWidth: 2,
    deskHeight: 2,
    gapX: 1,
    gapY: 1,
    originX: 1,
    originY: 1,
    namePrefix: "Seat",
    startNumber: 1,
    claimMode: "dynamic",
    allowedTags: [],
};

beforeAll(async () => {
    fake = await startFakeMapStorage(TOKEN);
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    savedSettings = row?.settings ?? {};
    await saveInstanceSettings({
        ...readInstanceSettings(savedSettings),
        playUrl: "http://play.desk-test.example",
        mapStoragePublicUrl: fake.url,
        mapStorageInternalUrl: fake.url,
        mapStorageApiToken: TOKEN,
    });
    const [org] = await db().insert(schema.organizations).values({ slug: ORG, name: "Desk test" }).returning();
    const [other] = await db()
        .insert(schema.organizations)
        .values({ slug: `${ORG}-other`, name: "Desk other" })
        .returning();
    organization = org!;
    otherOrganizationId = other!.id;
    const [a] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "a", name: "A" })
        .returning();
    const [b] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "b", name: "B" })
        .returning();
    workspaceA = a!.id;
    workspaceB = b!.id;
    const [w] = await db()
        .insert(schema.worlds)
        .values({ organizationId: organization.id, workspaceId: workspaceA, slug: "hq", name: "HQ" })
        .returning();
    const [wb] = await db()
        .insert(schema.worlds)
        .values({ organizationId: organization.id, workspaceId: workspaceB, slug: "lab", name: "Lab" })
        .returning();
    world = w!;
    worldB = wb!;
    const [created] = await db()
        .insert(schema.accounts)
        .values({ email: `admin-${SUFFIX}@desk.test`, name: "Admin", passwordHash: "x", emailVerifiedAt: new Date() })
        .returning();
    account = created!;
    // Erin has an account in the organization: the name of her account is the one shown on her desk.
    const [erinAccount] = await db()
        .insert(schema.accounts)
        .values({
            email: `erin-${SUFFIX}@desk.test`,
            name: "Erin Example",
            passwordHash: "x",
            emailVerifiedAt: new Date(),
            timeZone: "Asia/Tokyo",
        })
        .returning();
    erin = erinAccount!;
    await db()
        .insert(schema.organizationMemberships)
        .values({ organizationId: organization.id, accountId: erin.id, role: "employee" });
    actor = { account: { id: account.id, email: account.email }, ipAddress: "203.0.113.7" };
    admin = buildAccess({ organization, role: "admin", workspaceRoles: new Map(), support: undefined });
    employee = buildAccess({ organization, role: "employee", workspaceRoles: new Map(), support: undefined });
    managerOfB = buildAccess({
        organization,
        role: "employee",
        workspaceRoles: new Map([[workspaceB, "manager" as const]]),
        support: undefined,
    });
    // Alice has been in the office. Nobody knows Carol yet.
    await db().insert(schema.members).values({
        worldId: world.id,
        uuid: "alice@desk.test",
        kind: "member",
        email: "alice@desk.test",
        name: "Alice Martin",
        lastSeenAt: new Date(),
    });
    // Victor belongs to the organization and has entered the office once: WorkAdventure recorded him as a visitor.
    await db().insert(schema.members).values({
        worldId: world.id,
        uuid: "victor@desk.test",
        kind: "guest",
        email: "victor@desk.test",
        name: "Victor Visitor",
        lastSeenAt: new Date(),
    });
    await db().insert(schema.tags).values({ worldId: world.id, name: "design" });
});

afterAll(async () => {
    setDeskEventListener(undefined);
    // Emails are sent after the answer: let the last ones be recorded before cleaning up.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await db().delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, organization.id));
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${ORG}%`));
    await db().delete(schema.emailDeliveries).where(like(schema.emailDeliveries.recipient, "%@desk.test"));
    await db()
        .delete(schema.accounts)
        .where(inArray(schema.accounts.id, [account.id, erin.id]));
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: savedSettings as object })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: savedSettings as object } });
    await fake.close();
    await closeDb();
});

beforeEach(() => {
    fake.down = undefined;
    fake.beforePatch = undefined;
    setDeskEventListener(undefined);
    mailsBefore = vi.mocked(sendMail).mock.calls.length;
});

describe("the inventory", () => {
    it("lists every desk with its state, who has it and the size of the map", async () => {
        const url = putRoom("rooms/inventory", [
            desk("free", "Desk free", 0),
            desk("alice", "Desk Alice", 100, { ownerId: "alice@desk.test" }),
            desk("carol", "Desk Carol", 200, { ownerId: "carol@desk.test", mode: "static" }),
            desk("off", "Desk off", 300, { disabled: true }),
            desk("victor", "Desk Victor", 520, { ownerId: "victor@desk.test" }),
            {
                id: "meeting",
                name: "Meeting room",
                x: 400,
                y: 0,
                width: 128,
                height: 128,
                visible: true,
                properties: [],
            },
        ]);
        const room = await insertRoom(world, "inventory", url, "Inventory room");

        const inventory = await deskInventory(admin, workspaceA);

        const view = inventory.rooms.find((candidate) => candidate.room.id === room.id)!;
        expect(view.problem).toBeNull();
        expect(view.map).toEqual({ widthPx: 640, heightPx: 480, tileWidth: 32, tileHeight: 32 });
        expect(view.desks.map((entry) => [entry.id, entry.status])).toEqual([
            ["free", "available"],
            ["alice", "claimed"],
            ["carol", "reserved"],
            ["off", "disabled"],
            // Recorded as a visitor on his first entry, he has been in the office all the same.
            ["victor", "claimed"],
        ]);
        expect(view.desks[1]!.owner).toMatchObject({ name: "Alice Martin", hasJoined: true });
        expect(view.desks[2]!.owner).toBeNull();
        expect(view.desks[4]!.owner).toMatchObject({ name: "Victor Visitor", hasJoined: true });
        expect(view.counts).toEqual({
            available: 1,
            hot: 0,
            kept: 0,
            claimed: 2,
            reserved: 1,
            shared: 0,
            disabled: 1,
            total: 5,
        });
    });

    it("shows hot desks, desks reserved now and shared desks, with the people they are about", async () => {
        const url = putRoom("rooms/kinds", [
            desk("hot", "Hot 1", 0, { extra: { deskType: "hot" } }),
            desk("kept", "Hot 2", 100, {
                extra: { deskType: "hot", reservations: [stored("r-now", "alice@desk.test", -1, 2)] },
            }),
            desk("later", "Hot 3", 200, {
                extra: {
                    deskType: "hot",
                    reservations: [
                        stored("r-later", "zed@desk.test", 48, 50),
                        stored("r-old", "zed@desk.test", -9, -8),
                    ],
                },
            }),
            desk("shared", "Team desk", 300, {
                extra: { deskType: "shared", coOwnerIds: ["alice@desk.test", "zed@desk.test"] },
            }),
            desk("seated", "Seated", 400, { extra: { seats: [{ x: 410, y: 30, direction: "Up" }] } }),
        ]);
        const room = await insertRoom(world, "kinds", url, "Kinds room");

        const inventory = await deskInventory(admin, workspaceA);

        const view = inventory.rooms.find((candidate) => candidate.room.id === room.id)!;
        expect(view.desks.map((entry) => [entry.id, entry.status])).toEqual([
            ["hot", "hot"],
            ["kept", "kept"],
            ["later", "hot"],
            ["shared", "shared"],
            ["seated", "available"],
        ]);
        const kept = view.desks[1]!;
        expect(kept.reservations).toEqual([
            expect.objectContaining({
                id: "r-now",
                userId: "alice@desk.test",
                phase: "active",
                person: expect.objectContaining({ name: "Alice Martin" }),
            }),
        ]);
        expect(view.desks[2]!.reservations.map((r) => [r.id, r.phase])).toEqual([
            ["r-old", "past"],
            ["r-later", "upcoming"],
        ]);
        expect(view.desks[3]!.coOwners).toEqual([
            { id: "alice@desk.test", info: expect.objectContaining({ name: "Alice Martin" }) },
            { id: "zed@desk.test", info: null },
        ]);
        expect(view.desks[4]!.seats).toEqual([{ x: 410, y: 30, direction: "Up" }]);
        expect(view.upcoming).toBe(1);
        expect(view.worldTags).toEqual(["design"]);
        expect(view.counts).toMatchObject({ hot: 2, kept: 1, shared: 1, available: 1, total: 5 });
    });

    it("says why the desks of a room cannot be read, and carries on with the others", async () => {
        const noMap = await insertRoom(world, "noMap", null, "No map");
        const elsewhere = await insertRoom(world, "elsewhere", "https://maps.elsewhere.test/a.wam", "Elsewhere");

        const inventory = await deskInventory(admin, workspaceA);

        expect(inventory.rooms.find((view) => view.room.id === noMap.id)?.problem).toBe("noMap");
        expect(inventory.rooms.find((view) => view.room.id === elsewhere.id)?.problem).toBe("notOnMapStorage");
        expect(inventory.rooms.some((view) => view.problem === null && view.desks.length > 0)).toBe(true);
    });

    it("shows nothing to an employee, and only their workspace to the manager of one workspace", async () => {
        const url = putRoom("rooms/lab", [desk("l1", "Lab 1", 0)]);
        const lab = await insertRoom(worldB, "lab", url, "Lab room");

        expect((await deskInventory(employee)).rooms).toEqual([]);
        const seenByManager = await deskInventory(managerOfB);
        expect(seenByManager.rooms.map((view) => view.room.id)).toContain(lab.id);
        expect(seenByManager.rooms.every((view) => view.workspace.id === workspaceB)).toBe(true);
    });

    it("offers the people who were invited and the visitors already known, as lower-case emails", async () => {
        await db()
            .insert(schema.invitations)
            .values({
                organizationId: organization.id,
                email: "Dana@Desk.test",
                role: "employee",
                tokenHash: `hash-dana-${SUFFIX}`,
                expiresAt: new Date(Date.now() + 86_400_000),
            });

        const people = await assignablePeople(admin);

        expect(people.find((person) => person.value === "dana@desk.test")).toMatchObject({ kind: "invited" });
        expect(people.find((person) => person.value === "alice@desk.test")).toMatchObject({ kind: "visitor" });
    });
});

describe("assigning a desk", () => {
    const directory = "rooms/assign";
    let roomId = "";

    beforeEach(async () => {
        putRoom(
            directory,
            [
                desk("d1", "Desk 1", 0),
                desk("d2", "Desk 2", 100),
                desk("d3", "Desk 3", 200, { ownerId: "bob@desk.test", extra: { ownerName: "Bob Durand" } }),
            ],
            { lamp: { x: 10, y: 10, prefabRef: { collectionName: "office", id: "lamp" } } },
        );
        roomId = (await roomOf(world, "assign", directory, "Assign room")).id;
    });

    it("gives a free desk to a person, in lower case, and writes it in the audit log", async () => {
        const result = await assignDesk(admin, actor, { roomId, deskId: "d1", owner: " Erin@Desk.TEST ", ...free });

        expect(result).toEqual({ status: "ok", value: { previousOwner: null } });
        expect(ownerOf(directory, "d1")).toBe("erin@desk.test");
        const entry = await lastAudit("desk.assign", "d1");
        expect(entry).toMatchObject({
            accountId: account.id,
            organizationId: organization.id,
            targetType: "desk",
            ipAddress: "203.0.113.7",
        });
        expect(entry!.details).toMatchObject({ owner: "erin@desk.test", desk: "Desk 1", previousOwner: null });
    });

    it("changes nothing else in the map: the objects and the other desks stay as they were", async () => {
        const before = wamOf(directory);

        await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free });

        const after = wamOf(directory);
        expect(after.entities).toEqual(before.entities);
        expect(after.areas.map((area) => area.id)).toEqual(["d1", "d2", "d3"]);
        expect(after.areas[1]).toEqual(before.areas[1]);
        expect(after.areas[2]).toEqual(before.areas[2]);
    });

    it("works on a desk whose map has no ownerId at all, as written by tools", async () => {
        putRoom(directory, [desk("bare", "Bare desk", 0, { withoutOwnerKey: true })]);

        const assigned = await assignDesk(admin, actor, { roomId, deskId: "bare", owner: "frank@desk.test", ...free });
        const released = await releaseDesk(admin, actor, { roomId, deskId: "bare" });

        expect(assigned.status).toBe("ok");
        expect(released.status).toBe("ok");
        expect(ownerOf(directory, "bare")).toBeNull();
    });

    it("refuses a desk that has somebody until the administrator confirms that it is taken from them", async () => {
        const refused = await assignDesk(admin, actor, { roomId, deskId: "d3", owner: "frank@desk.test", ...free });
        expect(refused).toEqual({ status: "occupied", deskName: "Desk 3" });
        expect(ownerOf(directory, "d3")).toBe("bob@desk.test");

        const confirmed = await assignDesk(admin, actor, {
            roomId,
            deskId: "d3",
            owner: "frank@desk.test",
            moveFromOtherDesk: false,
            takeFromCurrentOwner: true,
        });
        expect(confirmed).toEqual({ status: "ok", value: { previousOwner: "bob@desk.test" } });
        expect(ownerOf(directory, "d3")).toBe("frank@desk.test");
    });

    it("gives one desk per person: a second one is refused unless the first is freed in the same step", async () => {
        await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free });

        const refused = await assignDesk(admin, actor, { roomId, deskId: "d2", owner: "FRANK@desk.test", ...free });
        expect(refused).toEqual({ status: "alreadyHasDesk", deskName: "Desk 1" });
        expect(ownerOf(directory, "d2")).toBeNull();

        const moved = await assignDesk(admin, actor, {
            roomId,
            deskId: "d2",
            owner: "frank@desk.test",
            moveFromOtherDesk: true,
            takeFromCurrentOwner: false,
        });
        expect(moved.status).toBe("ok");
        expect(ownerOf(directory, "d1")).toBeNull();
        expect(ownerOf(directory, "d2")).toBe("frank@desk.test");
    });

    it("tells that a desk that is not there, or nobody, cannot be assigned", async () => {
        expect(await assignDesk(admin, actor, { roomId, deskId: "ghost", owner: "frank@desk.test", ...free })).toEqual({
            status: "notFound",
        });
        expect(await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "   ", ...free })).toEqual({
            status: "invalid",
        });
    });

    it("refuses a change built on a view that is out of date, instead of overwriting what happened since", async () => {
        // The audit log is the organization's, and earlier tests wrote to it: compare what this change adds.
        const assignmentsBefore = (await auditActions()).filter((action) => action === "desk.assign").length;
        // Somebody else (an employee claiming it in the office) takes the desk after the page was loaded.
        fake.beforePatch = () => {
            const wam = wamOf(directory);
            wam.areas[0]!.properties[0]!.ownerId = "frank@desk.test";
            fake.put(`${directory}/map.wam`, wam);
        };

        const result = await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "gina@desk.test", ...free });

        expect(result).toEqual({ status: "changed" });
        expect(ownerOf(directory, "d1")).toBe("frank@desk.test");
        const assignmentsAfter = (await auditActions()).filter((action) => action === "desk.assign").length;
        expect(assignmentsAfter).toBe(assignmentsBefore);
    });

    it("never gives the same desk to two people when two administrators act at the same time", async () => {
        const [first, second] = await Promise.all([
            assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free }),
            assignDesk(admin, actor, { roomId, deskId: "d1", owner: "gina@desk.test", ...free }),
        ]);

        const statuses = [first.status, second.status];
        expect(statuses.filter((status) => status === "ok")).toHaveLength(1);
        expect(statuses.find((status) => status !== "ok")).toMatch(/^(changed|occupied)$/);
        expect(ownerOf(directory, "d1")).toBe(first.status === "ok" ? "frank@desk.test" : "gina@desk.test");
    });

    it("does not touch the map when map-storage cannot be reached", async () => {
        fake.down = 503;

        const result = await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free });

        expect(result.status).toMatch(/^(mapProblem|unavailable)$/);
        fake.down = undefined;
        expect(ownerOf(directory, "d1")).toBeNull();
    });

    it("emails the new owner and the person who lost the desk (recorded, even when no mail server is set up)", async () => {
        await assignDesk(admin, actor, {
            roomId,
            deskId: "d3",
            owner: "gina@desk.test",
            moveFromOtherDesk: false,
            takeFromCurrentOwner: true,
        });

        // The emails are sent after the answer: wait until both of the people concerned have one on record.
        const concerned = ["gina@desk.test", "bob@desk.test"];
        let recipients: string[] = [];
        for (let attempt = 0; attempt < 60 && !concerned.every((who) => recipients.includes(who)); attempt++) {
            const rows = await db()
                .select({ recipient: schema.emailDeliveries.recipient })
                .from(schema.emailDeliveries)
                .where(
                    and(
                        eq(schema.emailDeliveries.purpose, "desk_changed"),
                        inArray(schema.emailDeliveries.recipient, concerned),
                    ),
                );
            recipients = rows.map((row) => row.recipient);
            if (!concerned.every((who) => recipients.includes(who))) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }
        expect(recipients).toEqual(expect.arrayContaining(concerned));
    });
});

describe("the name shown on a desk", () => {
    const directory = "rooms/names";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [
            desk("d1", "Desk 1", 0),
            desk("d2", "Desk 2", 100, { ownerId: "bob@desk.test", extra: { ownerName: "Bob Durand" } }),
        ]);
        roomId = (await roomOf(world, "names", directory, "Names room")).id;
    });

    it("is the name of the person's account in the organization when they are given the desk", async () => {
        await assignDesk(admin, actor, { roomId, deskId: "d1", owner: erin.email.toUpperCase(), ...free });

        expect(propertyOf(directory, "d1")).toMatchObject({ ownerId: erin.email, ownerName: "Erin Example" });
    });

    it("is otherwise the name WorkAdventure knows them by in the world", async () => {
        await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "alice@desk.test", ...free });

        expect(propertyOf(directory, "d1")).toMatchObject({ ownerId: "alice@desk.test", ownerName: "Alice Martin" });
    });

    it("is cleared when the desk goes to somebody nobody knows yet, rather than showing the previous owner", async () => {
        await assignDesk(admin, actor, {
            roomId,
            deskId: "d2",
            owner: "newcomer@desk.test",
            moveFromOtherDesk: false,
            takeFromCurrentOwner: true,
        });

        expect(propertyOf(directory, "d2")).toMatchObject({ ownerId: "newcomer@desk.test", ownerName: null });
    });

    it("is cleared when the desk is freed", async () => {
        await releaseDesk(admin, actor, { roomId, deskId: "d2" });

        expect(propertyOf(directory, "d2")).toMatchObject({ ownerId: null, ownerName: null });
    });
});

describe("hot and shared desks", () => {
    const directory = "rooms/kinds-change";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [
            desk("own", "Own desk", 0, { ownerId: "bob@desk.test", extra: { ownerName: "Bob Durand" } }),
            desk("hot", "Hot desk", 100, { extra: { deskType: "hot" } }),
            desk("team", "Team desk", 200, {
                ownerId: "owner@desk.test",
                extra: { deskType: "shared", coOwnerIds: ["co@desk.test"] },
            }),
            desk("plain", "Plain desk", 300),
        ]);
        roomId = (await roomOf(world, "kinds-change", directory, "Kinds change room")).id;
    });

    it("makes a desk a hot desk, freeing it only once the administrator agreed, and tells its owner", async () => {
        const asked = await setDeskType(admin, actor, {
            roomId,
            deskId: "own",
            deskType: "hot",
            clearOwner: false,
            dropCoOwners: false,
        });
        expect(asked).toEqual({ status: "occupied", deskName: "Own desk" });
        expect(propertyOf(directory, "own")).toMatchObject({ ownerId: "bob@desk.test" });

        const done = await setDeskType(admin, actor, {
            roomId,
            deskId: "own",
            deskType: "hot",
            clearOwner: true,
            dropCoOwners: false,
        });

        expect(done).toEqual({ status: "ok", value: { previousOwner: "bob@desk.test", removedCoOwners: [] } });
        expect(propertyOf(directory, "own")).toMatchObject({ deskType: "hot", ownerId: null, ownerName: null });
        expect((await lastAudit("desk.type_changed", "own"))!.details).toMatchObject({
            from: "assigned",
            to: "hot",
            previousOwner: "bob@desk.test",
        });
        await mailTo("bob@desk.test", "Your desk assignment changed");
    });

    it("gives a hot desk to nobody", async () => {
        const result = await assignDesk(admin, actor, { roomId, deskId: "hot", owner: "frank@desk.test", ...free });

        expect(result).toEqual({ status: "hotDesk", deskName: "Hot desk" });
        expect(ownerOf(directory, "hot")).toBeNull();
    });

    it("shares a desk with co-owners, written like owners, and tells them", async () => {
        expect(
            (
                await setDeskType(admin, actor, {
                    roomId,
                    deskId: "plain",
                    deskType: "shared",
                    clearOwner: false,
                    dropCoOwners: false,
                })
            ).status,
        ).toBe("ok");

        const result = await setDeskCoOwners(admin, actor, {
            roomId,
            deskId: "plain",
            coOwners: ["Gina@Desk.test", "hank@desk.test", "gina@desk.test"],
            cancelReservations: false,
        });

        expect(result).toEqual({ status: "ok", value: { added: ["gina@desk.test", "hank@desk.test"], removed: [] } });
        expect(propertyOf(directory, "plain")).toMatchObject({
            deskType: "shared",
            coOwnerIds: ["gina@desk.test", "hank@desk.test"],
        });
        expect((await lastAudit("desk.coowners_changed", "plain"))!.details).toMatchObject({
            added: ["gina@desk.test", "hank@desk.test"],
        });
        await mailTo("hank@desk.test", "A desk is shared with you");
    });

    it("refuses co-owners on a desk that is not shared", async () => {
        const result = await setDeskCoOwners(admin, actor, {
            roomId,
            deskId: "own",
            coOwners: ["gina@desk.test"],
            cancelReservations: false,
        });

        expect(result).toEqual({ status: "notShared", deskName: "Own desk" });
        expect("coOwnerIds" in propertyOf(directory, "own")!).toBe(false);
    });

    it("gives each person one desk per room, counting co-owners", async () => {
        // The owner of another desk cannot be a co-owner here...
        expect(
            await setDeskCoOwners(admin, actor, {
                roomId,
                deskId: "team",
                coOwners: ["co@desk.test", "bob@desk.test"],
                cancelReservations: false,
            }),
        ).toEqual({ status: "alreadyHasDesk", deskName: "Own desk", person: "bob@desk.test" });
        // ...and a co-owner of the shared desk cannot be given another one, unless they leave the shared one.
        expect(await assignDesk(admin, actor, { roomId, deskId: "plain", owner: "co@desk.test", ...free })).toEqual({
            status: "alreadyHasDesk",
            deskName: "Team desk",
        });

        const moved = await assignDesk(admin, actor, {
            roomId,
            deskId: "plain",
            owner: "co@desk.test",
            moveFromOtherDesk: true,
            takeFromCurrentOwner: false,
        });

        expect(moved.status).toBe("ok");
        expect(propertyOf(directory, "team")).toMatchObject({ ownerId: "owner@desk.test", coOwnerIds: [] });
        expect(ownerOf(directory, "plain")).toBe("co@desk.test");
    });

    it("removes the co-owners of a desk that stops being shared only once the administrator agreed", async () => {
        const asked = await setDeskType(admin, actor, {
            roomId,
            deskId: "team",
            deskType: "assigned",
            clearOwner: false,
            dropCoOwners: false,
        });
        expect(asked).toEqual({ status: "hasCoOwners", deskName: "Team desk", count: 1 });

        const done = await setDeskType(admin, actor, {
            roomId,
            deskId: "team",
            deskType: "assigned",
            clearOwner: false,
            dropCoOwners: true,
        });

        expect(done).toEqual({ status: "ok", value: { previousOwner: null, removedCoOwners: ["co@desk.test"] } });
        expect(propertyOf(directory, "team")).toMatchObject({ deskType: "assigned", ownerId: "owner@desk.test" });
        expect("coOwnerIds" in propertyOf(directory, "team")!).toBe(false);
        await mailTo("co@desk.test", "Your desk assignment changed");
    });

    it("refuses to change the type of a desk claimed after the page was read", async () => {
        fake.beforePatch = () => {
            const wam = wamOf(directory);
            wam.areas[3]!.properties[0]!.ownerId = "zoe@desk.test";
            fake.put(`${directory}/map.wam`, wam);
        };

        const result = await setDeskType(admin, actor, {
            roomId,
            deskId: "plain",
            deskType: "hot",
            clearOwner: false,
            dropCoOwners: false,
        });

        expect(result).toEqual({ status: "changed" });
        expect(propertyOf(directory, "plain")).toMatchObject({ ownerId: "zoe@desk.test" });
        expect("deskType" in propertyOf(directory, "plain")!).toBe(false);
    });
});

describe("keeping a desk for someone", () => {
    const directory = "rooms/reservations";
    let roomId = "";
    const tomorrow = (hour: number) => new Date(Math.floor(Date.now() / DAY) * DAY + DAY + hour * HOUR);

    beforeEach(async () => {
        putRoom(directory, [
            desk("h1", "Hot 1", 0, { extra: { deskType: "hot" } }),
            desk("h2", "Hot 2", 100, { extra: { deskType: "hot" } }),
            desk("own", "Own desk", 200, { ownerId: "bob@desk.test" }),
            desk("p1", "Personal 1", 300, {
                extra: { reservations: [stored("r-future", "carol@desk.test", 24, 30)] },
            }),
            desk("old", "Old desk", 400, {
                extra: {
                    deskType: "hot",
                    reservations: [
                        stored("r-old", "carol@desk.test", -30, -24),
                        stored("r-next", "zed@desk.test", 2, 3),
                    ],
                },
            }),
        ]);
        roomId = (await roomOf(world, "reservations", directory, "Reservations room")).id;
    });

    it("reserves a desk for a person, with their name, writes it in the audit log, and tells them", async () => {
        const start = tomorrow(9);
        const end = tomorrow(18);

        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "h1",
            person: "Alice@Desk.test",
            start,
            end,
            timeZone: "Europe/Paris",
        });

        expect(result.status).toBe("ok");
        expect(reservationsOf(directory, "h1")).toEqual([
            {
                id: expect.any(String),
                userId: "alice@desk.test",
                userName: "Alice Martin",
                start: start.toISOString(),
                end: end.toISOString(),
            },
        ]);
        expect((await lastAudit("desk.reserved", "h1"))!.details).toMatchObject({
            person: "alice@desk.test",
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const mail = await mailTo("alice@desk.test", "A desk is reserved for you");
        // Alice has no account, hence no time zone: the times are written in the administrator's.
        const local = (date: Date) => formatDateTime(date, { locale: "en-US", timeZone: "Europe/Paris" });
        expect(mail.message.paragraphs[0]).toContain(`from ${local(start)} to ${local(end)} (Europe/Paris)`);
    });

    it("writes the times of the email in the time zone of the person when their account has one", async () => {
        const start = tomorrow(9);
        const end = tomorrow(17);

        await reserveDesk(admin, actor, { roomId, deskId: "h2", person: erin.email, start, end, timeZone: "UTC" });

        const mail = await mailTo(erin.email, "A desk is reserved for you");
        const local = (date: Date) => formatDateTime(date, { locale: "en-US", timeZone: "Asia/Tokyo" });
        expect(mail.message.paragraphs[0]).toContain(`from ${local(start)} to ${local(end)} (Asia/Tokyo)`);
        expect(reservationsOf(directory, "h2")[0]).toMatchObject({ userName: "Erin Example" });
    });

    it("refuses a reservation that overlaps another one of the desk, and keeps the first", async () => {
        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "p1",
            person: "dave@desk.test",
            start: new Date(Date.now() + 26 * HOUR),
            end: new Date(Date.now() + 40 * HOUR),
        });

        expect(result).toMatchObject({
            status: "reservation",
            problem: { kind: "overlap", with: { id: "r-future", userId: "carol@desk.test" } },
        });
        expect(reservationsOf(directory, "p1").map((r) => r.id)).toEqual(["r-future"]);
    });

    it("refuses a reservation on a desk that belongs to someone", async () => {
        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "own",
            person: "dave@desk.test",
            start: tomorrow(9),
            end: tomorrow(10),
        });

        expect(result).toEqual({ status: "reservation", problem: { kind: "hasHolders" } });
        expect("reservations" in propertyOf(directory, "own")!).toBe(false);
    });

    it("refuses to keep two desks of the room for the same person at the same time", async () => {
        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "h1",
            person: "carol@desk.test",
            start: new Date(Date.now() + 25 * HOUR),
            end: new Date(Date.now() + 27 * HOUR),
        });

        expect(result).toMatchObject({
            status: "reservation",
            problem: { kind: "personBusy", deskName: "Personal 1" },
        });
    });

    it("refuses times that make no sense, are over, or are too long", async () => {
        const reserve = (start: Date, end: Date) =>
            reserveDesk(admin, actor, { roomId, deskId: "h1", person: "dave@desk.test", start, end });

        expect(await reserve(tomorrow(10), tomorrow(9))).toMatchObject({ problem: { kind: "invalidPeriod" } });
        expect(await reserve(new Date("nonsense"), tomorrow(9))).toMatchObject({ problem: { kind: "invalidPeriod" } });
        expect(await reserve(new Date(Date.now() - 3 * HOUR), new Date(Date.now() - HOUR))).toMatchObject({
            problem: { kind: "past" },
        });
        expect(await reserve(tomorrow(9), new Date(tomorrow(9).getTime() + 31 * DAY))).toMatchObject({
            problem: { kind: "tooLong", maxDays: 30 },
        });
        expect(reservationsOf(directory, "h1")).toEqual([]);
    });

    it("refuses a person that is not one identifier", async () => {
        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "h1",
            person: "two people",
            start: tomorrow(9),
            end: tomorrow(10),
        });

        expect(result).toEqual({ status: "invalid" });
    });

    it("cancels a reservation, writes it in the audit log, and tells the person", async () => {
        const result = await cancelDeskReservation(admin, actor, { roomId, deskId: "p1", reservationId: "r-future" });

        expect(result).toMatchObject({ status: "ok", value: { reservation: { id: "r-future" } } });
        expect(reservationsOf(directory, "p1")).toEqual([]);
        expect((await lastAudit("desk.reservation_cancelled", "p1"))!.details).toMatchObject({
            reservationId: "r-future",
            person: "carol@desk.test",
        });
        await mailTo("carol@desk.test", "Your desk reservation was cancelled");
        expect(await cancelDeskReservation(admin, actor, { roomId, deskId: "p1", reservationId: "r-future" })).toEqual({
            status: "notFound",
        });
    });

    it("removes the reservations that are over, and only those", async () => {
        const result = await clearPastDeskReservations(admin, actor, { roomId, deskId: "old" });

        expect(result).toEqual({ status: "ok", value: { removed: 1 } });
        expect(reservationsOf(directory, "old").map((r) => r.id)).toEqual(["r-next"]);
        expect((await lastAudit("desk.reservations_cleared", "old"))!.details).toMatchObject({ count: 1 });
        expect(await clearPastDeskReservations(admin, actor, { roomId, deskId: "old" })).toEqual({
            status: "ok",
            value: { removed: 0 },
        });
    });

    it("asks before giving a desk reserved for someone, then cancels the reservation and tells them", async () => {
        const asked = await assignDesk(admin, actor, { roomId, deskId: "p1", owner: "frank@desk.test", ...free });
        expect(asked).toEqual({ status: "hasReservations", deskName: "Personal 1", count: 1 });
        expect(ownerOf(directory, "p1")).toBeNull();

        const done = await assignDesk(admin, actor, {
            roomId,
            deskId: "p1",
            owner: "frank@desk.test",
            ...free,
            cancelReservations: true,
        });

        expect(done.status).toBe("ok");
        expect(propertyOf(directory, "p1")).toMatchObject({ ownerId: "frank@desk.test", reservations: [] });
        expect((await lastAudit("desk.reservation_cancelled", "p1"))!.details).toMatchObject({
            reservationId: "r-future",
            reason: "assigned",
        });
        await mailTo("carol@desk.test", "Your desk reservation was cancelled");
    });

    it("refuses to remove a desk that has reservations to come", async () => {
        expect(await deleteDesks(admin, actor, { roomId, deskIds: ["p1"] })).toEqual({
            status: "hasReservations",
            deskName: "Personal 1",
            count: 1,
        });
        expect(wamOf(directory).areas.map((area) => area.id)).toContain("p1");
    });

    it("refuses a reservation built on a view that is out of date: two cannot overlap", async () => {
        // Another administrator reserves the same desk at the same time, after this one read it.
        fake.beforePatch = () => {
            const wam = wamOf(directory);
            wam.areas[0]!.properties[0]!.reservations = [
                {
                    id: "r-other",
                    userId: "zed@desk.test",
                    start: tomorrow(8).toISOString(),
                    end: tomorrow(12).toISOString(),
                },
            ];
            fake.put(`${directory}/map.wam`, wam);
        };

        const result = await reserveDesk(admin, actor, {
            roomId,
            deskId: "h1",
            person: "dave@desk.test",
            start: tomorrow(9),
            end: tomorrow(10),
        });

        expect(result).toEqual({ status: "changed" });
        expect(reservationsOf(directory, "h1").map((r) => r.id)).toEqual(["r-other"]);
    });
});

describe("who a desk is open to", () => {
    const directory = "rooms/tags";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [desk("d1", "Desk 1", 0)]);
        roomId = (await roomOf(world, "tags", directory, "Tags room")).id;
    });

    it("sets the tags of a desk, each once and trimmed, and writes it in the audit log", async () => {
        const result = await setDeskTags(admin, actor, {
            roomId,
            deskId: "d1",
            tags: [" design ", "sales", "design", ""],
        });

        expect(result.status).toBe("ok");
        expect(propertyOf(directory, "d1")).toMatchObject({ allowedTags: ["design", "sales"] });
        expect((await lastAudit("desk.tags_changed", "d1"))!.details).toMatchObject({
            tags: ["design", "sales"],
            previousTags: [],
        });
    });

    it("refuses tags that WorkAdventure could not carry, and too many tags", async () => {
        expect(await setDeskTags(admin, actor, { roomId, deskId: "d1", tags: ["a,b"] })).toEqual({
            status: "badTags",
            max: 20,
        });
        expect(await setDeskTags(admin, actor, { roomId, deskId: "d1", tags: ["x".repeat(65)] })).toMatchObject({
            status: "badTags",
        });
        const many = Array.from({ length: 21 }, (_, i) => `tag${i}`);
        expect(await setDeskTags(admin, actor, { roomId, deskId: "d1", tags: many })).toMatchObject({
            status: "badTags",
        });
        expect(propertyOf(directory, "d1")).toMatchObject({ allowedTags: [] });
    });
});

describe("the other changes to a desk", () => {
    const directory = "rooms/changes";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [
            desk("free", "Free desk", 0),
            desk("taken", "Taken desk", 100, { ownerId: "alice@desk.test" }),
        ]);
        roomId = (await roomOf(world, "changes", directory, "Changes room")).id;
    });

    it("frees a desk and keeps what its owner put on it", async () => {
        putRoom(directory, [desk("taken", "Taken desk", 100, { ownerId: "alice@desk.test" })], {
            poster: { x: 110, y: 10, prefabRef: { collectionName: "office", id: "poster" } },
        });

        const result = await releaseDesk(admin, actor, { roomId, deskId: "taken" });

        expect(result).toEqual({ status: "ok", value: { previousOwner: "alice@desk.test" } });
        expect(ownerOf(directory, "taken")).toBeNull();
        expect(Object.keys(wamOf(directory).entities)).toEqual(["poster"]);
        expect(await auditActions()).toContain("desk.release");
    });

    it("takes a desk out of service and back, without taking it from whoever has it", async () => {
        expect((await setDeskDisabled(admin, actor, { roomId, deskId: "taken", disabled: true })).status).toBe("ok");
        expect(propertyOf(directory, "taken")).toMatchObject({ disabled: true, ownerId: "alice@desk.test" });

        expect((await setDeskDisabled(admin, actor, { roomId, deskId: "taken", disabled: false })).status).toBe("ok");
        expect(propertyOf(directory, "taken")).toMatchObject({ disabled: false, ownerId: "alice@desk.test" });
        expect(await auditActions()).toEqual(expect.arrayContaining(["desk.disable", "desk.enable"]));
    });

    it("renames a desk and changes who can claim it", async () => {
        expect((await renameDesk(admin, actor, { roomId, deskId: "free", name: "  Window seat " })).status).toBe("ok");
        expect(wamOf(directory).areas[0]!.name).toBe("Window seat");
        expect((await renameDesk(admin, actor, { roomId, deskId: "free", name: " " })).status).toBe("invalid");

        expect((await setDeskClaimMode(admin, actor, { roomId, deskId: "free", mode: "static" })).status).toBe("ok");
        expect(propertyOf(directory, "free")).toMatchObject({ accessClaimMode: "static" });
    });

    it("removes a free desk, but never one that somebody has, and then removes nothing at all", async () => {
        const refused = await deleteDesks(admin, actor, { roomId, deskIds: ["free", "taken"] });
        expect(refused).toEqual({ status: "occupied", deskName: "Taken desk" });
        expect(wamOf(directory).areas.map((area) => area.id)).toEqual(["free", "taken"]);

        const removed = await deleteDesks(admin, actor, { roomId, deskIds: ["free"] });
        expect(removed).toEqual({ status: "ok", value: { removed: 1 } });
        expect(wamOf(directory).areas.map((area) => area.id)).toEqual(["taken"]);
        expect(await auditActions()).toContain("desk.delete");
    });

    it("says that a desk that is not there any more is not there", async () => {
        expect(await releaseDesk(admin, actor, { roomId, deskId: "vanished" })).toEqual({ status: "notFound" });
        expect(await deleteDesks(admin, actor, { roomId, deskIds: ["vanished"] })).toEqual({ status: "notFound" });
    });
});

describe("adding desks", () => {
    const directory = "rooms/adding";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [desk("old", "Old desk", 14 * 32)]);
        roomId = (await roomOf(world, "adding", directory, "Adding room")).id;
    });

    it("adds a grid of free desks, laid out in tiles of the map", async () => {
        const result = await createDesks(admin, actor, { roomId, ...grid });

        expect(result).toEqual({ status: "ok", value: { created: 6 } });
        const added = wamOf(directory).areas.slice(1);
        expect(wamOf(directory).areas).toHaveLength(7);
        expect(added.map((area) => area.name).sort()).toEqual([
            "Seat 1",
            "Seat 2",
            "Seat 3",
            "Seat 4",
            "Seat 5",
            "Seat 6",
        ]);
        expect([...new Set(added.map((area) => area.x))].sort((a, b) => a - b)).toEqual([32, 128, 224]);
        expect(added.every((area) => area.width === 64)).toBe(true);
        expect(added.every((area) => area.properties[0]?.ownerId === null)).toBe(true);
        expect(added[0]!.properties[0]).toMatchObject({ type: "personalAreaPropertyData", accessClaimMode: "dynamic" });
        expect(await auditActions()).toContain("desk.create");
    });

    it("adds hot desks when asked", async () => {
        const result = await createDesks(admin, actor, { roomId, ...grid, columns: 1, rows: 1, deskType: "hot" });

        expect(result).toEqual({ status: "ok", value: { created: 1 } });
        expect(wamOf(directory).areas[1]!.properties[0]).toMatchObject({ deskType: "hot", ownerId: null });
    });

    it("adds nothing when a desk would leave the map or overlap a desk that is there", async () => {
        const outside = await createDesks(admin, actor, { roomId, ...grid, originX: 17 });
        expect(outside).toMatchObject({ status: "layout" });
        expect(outside.status === "layout" && outside.problems.some((p) => p.kind === "outOfBounds")).toBe(true);

        const overlapping = await createDesks(admin, actor, { roomId, ...grid, originX: 12 });
        expect(overlapping.status === "layout" && overlapping.problems.some((p) => p.kind === "overlaps")).toBe(true);
        expect(wamOf(directory).areas).toHaveLength(1);
    });

    it("refuses too many desks at once", async () => {
        const result = await createDesks(admin, actor, { roomId, ...grid, columns: 100, rows: 100 });

        expect(result.status === "layout" && result.problems.some((p) => p.kind === "tooMany")).toBe(true);
        expect(wamOf(directory).areas).toHaveLength(1);
    });
});

describe("who may change desks", () => {
    const directory = "rooms/rights";
    let roomId = "";

    beforeEach(async () => {
        putRoom(directory, [
            desk("d1", "Desk 1", 0, { extra: { reservations: [stored("r1", "carol@desk.test", 24, 25)] } }),
        ]);
        roomId = (await roomOf(world, "rights", directory, "Rights room")).id;
    });

    it("refuses an employee every change, whatever they send", async () => {
        const target = { roomId, deskId: "d1" };
        expect(await assignDesk(employee, actor, { ...target, owner: "erin@desk.test", ...free })).toEqual({
            status: "forbidden",
        });
        expect((await releaseDesk(employee, actor, target)).status).toBe("forbidden");
        expect((await setDeskDisabled(employee, actor, { ...target, disabled: true })).status).toBe("forbidden");
        expect((await renameDesk(employee, actor, { ...target, name: "Mine" })).status).toBe("forbidden");
        expect((await setDeskClaimMode(employee, actor, { ...target, mode: "static" })).status).toBe("forbidden");
        expect((await deleteDesks(employee, actor, { roomId, deskIds: ["d1"] })).status).toBe("forbidden");
        expect((await createDesks(employee, actor, { roomId, ...grid, originX: 8 })).status).toBe("forbidden");
        expect(
            (
                await setDeskType(employee, actor, {
                    ...target,
                    deskType: "hot",
                    clearOwner: true,
                    dropCoOwners: true,
                })
            ).status,
        ).toBe("forbidden");
        expect(
            (await setDeskCoOwners(employee, actor, { ...target, coOwners: ["x@desk.test"], cancelReservations: true }))
                .status,
        ).toBe("forbidden");
        expect((await setDeskTags(employee, actor, { ...target, tags: ["mine"] })).status).toBe("forbidden");
        expect(
            (
                await reserveDesk(employee, actor, {
                    ...target,
                    person: "erin@desk.test",
                    start: new Date(Date.now() + 2 * DAY),
                    end: new Date(Date.now() + 2 * DAY + HOUR),
                })
            ).status,
        ).toBe("forbidden");
        expect((await cancelDeskReservation(employee, actor, { ...target, reservationId: "r1" })).status).toBe(
            "forbidden",
        );
        expect((await clearPastDeskReservations(employee, actor, target)).status).toBe("forbidden");
        expect(wamOf(directory).areas).toHaveLength(1);
        expect(propertyOf(directory, "d1")).toMatchObject({
            ownerId: null,
            accessClaimMode: "dynamic",
            allowedTags: [],
            reservations: [expect.objectContaining({ id: "r1" })],
        });
        expect(wamOf(directory).areas[0]!.name).toBe("Desk 1");
    });

    it("refuses the manager of another workspace", async () => {
        expect(await assignDesk(managerOfB, actor, { roomId, deskId: "d1", owner: "erin@desk.test", ...free })).toEqual(
            {
                status: "forbidden",
            },
        );
        expect(ownerOf(directory, "d1")).toBeNull();
    });

    it("lets the manager of a workspace manage the desks of that workspace", async () => {
        const url = putRoom("rooms/lab-desks", [desk("l1", "Lab 1", 0)]);
        const labRoom = await insertRoom(worldB, "lab-desks", url);

        const result = await assignDesk(managerOfB, actor, {
            roomId: labRoom.id,
            deskId: "l1",
            owner: "erin@desk.test",
            ...free,
        });

        expect(result.status).toBe("ok");
        expect(ownerOf("rooms/lab-desks", "l1")).toBe("erin@desk.test");
    });

    it("does not reach a room of another organization, even for an administrator", async () => {
        const [foreign] = await db()
            .insert(schema.workspaces)
            .values({ organizationId: otherOrganizationId, slug: "x", name: "X" })
            .returning();
        const [foreignWorld] = await db()
            .insert(schema.worlds)
            .values({ organizationId: otherOrganizationId, workspaceId: foreign!.id, slug: "w", name: "W" })
            .returning();
        const foreignUrl = putRoom("rooms/foreign", [desk("f1", "Foreign", 0)]);
        const foreignRoom = await insertRoom(foreignWorld!, "foreign", foreignUrl);

        const result = await assignDesk(admin, actor, {
            roomId: foreignRoom.id,
            deskId: "f1",
            owner: "erin@desk.test",
            ...free,
        });

        expect(result).toEqual({ status: "notFound" });
        expect(ownerOf("rooms/foreign", "f1")).toBeNull();
        expect(
            (
                await reserveDesk(admin, actor, {
                    roomId: foreignRoom.id,
                    deskId: "f1",
                    person: "erin@desk.test",
                    start: new Date(Date.now() + DAY),
                    end: new Date(Date.now() + DAY + HOUR),
                })
            ).status,
        ).toBe("notFound");
        expect((await deskInventory(admin)).rooms.some((view) => view.room.id === foreignRoom.id)).toBe(false);
    });
});

describe("desk events, for integrations", () => {
    const directory = "rooms/events";
    let roomId = "";
    let events: DeskEvent[] = [];

    beforeEach(async () => {
        putRoom(directory, [desk("d1", "Desk 1", 0), desk("h1", "Hot 1", 100, { extra: { deskType: "hot" } })]);
        roomId = (await roomOf(world, "events", directory, "Events room")).id;
        events = [];
        setDeskEventListener((event) => {
            events.push(event);
        });
    });

    it("announces what was saved: a desk given, freed, reserved, a reservation cancelled", async () => {
        await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free });
        await releaseDesk(admin, actor, { roomId, deskId: "d1" });
        const reserved = await reserveDesk(admin, actor, {
            roomId,
            deskId: "h1",
            person: "frank@desk.test",
            start: new Date(Date.now() + DAY),
            end: new Date(Date.now() + DAY + HOUR),
        });
        const reservationId = reserved.status === "ok" ? reserved.value.reservation.id : "";
        await cancelDeskReservation(admin, actor, { roomId, deskId: "h1", reservationId });

        expect(events.map((event) => event.type)).toEqual([
            "desk.assigned",
            "desk.released",
            "desk.reserved",
            "desk.reservation_cancelled",
        ]);
        expect(events[0]).toMatchObject({
            organizationId: organization.id,
            worldId: world.id,
            roomId,
            deskId: "d1",
            deskName: "Desk 1",
            ownerId: "frank@desk.test",
            previousOwnerId: null,
            actorAccountId: account.id,
        });
        expect(events[1]).toMatchObject({ previousOwnerId: "frank@desk.test", reason: "administrator" });
        expect(events[2]).toMatchObject({ reservation: { id: reservationId, userId: "frank@desk.test" } });
        expect(events[3]).toMatchObject({ reason: "administrator" });
    });

    it("announces nothing for a change that was refused", async () => {
        fake.beforePatch = () => {
            const wam = wamOf(directory);
            wam.areas[0]!.properties[0]!.ownerId = "zoe@desk.test";
            fake.put(`${directory}/map.wam`, wam);
        };

        expect(
            (await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free })).status,
        ).toBe("changed");
        expect(events).toEqual([]);
    });

    it("never lets a listener that fails fail the change", async () => {
        setDeskEventListener(() => {
            throw new Error("the chat is down");
        });
        const failing = setDeskEventListener(async () => {
            throw new Error("the calendar is down");
        });

        const result = await assignDesk(admin, actor, { roomId, deskId: "d1", owner: "frank@desk.test", ...free });

        expect(result.status).toBe("ok");
        expect(ownerOf(directory, "d1")).toBe("frank@desk.test");
        failing();
    });
});

describe("when a person leaves", () => {
    const first = "rooms/leave-one";
    const second = "rooms/leave-two";

    beforeEach(async () => {
        putRoom(
            first,
            [desk("a", "A", 0, { ownerId: "leaver@desk.test" }), desk("b", "B", 100, { ownerId: "stayer@desk.test" })],
            { lamp: { x: 10, y: 10, prefabRef: { collectionName: "office", id: "lamp" } } },
        );
        putRoom(second, [desk("c", "C", 0, { ownerId: "Leaver@Desk.test" })]);
        await roomOf(world, "leave-one", first);
        await roomOf(world, "leave-two", second);
    });

    it("frees every desk of that person in every room, and only theirs, leaving what they put on them", async () => {
        const outcome = await releaseDesksOfPeople(organization.id, ["leaver@desk.test"], actor);

        expect(outcome).toEqual({ released: 2, coOwnershipsRemoved: 0, reservationsCancelled: 0, failed: 0 });
        expect(ownerOf(first, "a")).toBeNull();
        expect(ownerOf(second, "c")).toBeNull();
        expect(ownerOf(first, "b")).toBe("stayer@desk.test");
        expect(Object.keys(wamOf(first).entities)).toEqual(["lamp"]);
        const reasons = await db()
            .select({ details: schema.auditLogs.details })
            .from(schema.auditLogs)
            .where(
                and(eq(schema.auditLogs.organizationId, organization.id), eq(schema.auditLogs.action, "desk.release")),
            );
        expect(
            reasons.filter((row) => (row.details as { reason?: string } | null)?.reason === "person_left"),
        ).toHaveLength(2);
    });

    it("also takes them out of the shared desks they belong to and cancels their reservations to come", async () => {
        putRoom(first, [
            desk("team", "Team", 0, {
                ownerId: "stayer@desk.test",
                extra: { deskType: "shared", coOwnerIds: ["leaver@desk.test", "other@desk.test"] },
            }),
            desk("hot", "Hot", 100, {
                extra: {
                    deskType: "hot",
                    reservations: [
                        stored("theirs", "Leaver@desk.test", 24, 26),
                        stored("other", "other@desk.test", 30, 32),
                        stored("gone", "leaver@desk.test", -30, -28),
                    ],
                },
            }),
        ]);
        putRoom(second, [desk("c", "C", 0)]);

        const outcome = await releaseDesksOfPeople(organization.id, ["leaver@desk.test"], actor);

        expect(outcome).toEqual({ released: 0, coOwnershipsRemoved: 1, reservationsCancelled: 1, failed: 0 });
        expect(propertyOf(first, "team")).toMatchObject({
            ownerId: "stayer@desk.test",
            coOwnerIds: ["other@desk.test"],
        });
        expect(reservationsOf(first, "hot").map((r) => r.id)).toEqual(["other"]);
        expect((await lastAudit("desk.coowners_changed", "team"))!.details).toMatchObject({
            removed: ["leaver@desk.test"],
            reason: "person_left",
        });
        expect((await lastAudit("desk.reservation_cancelled", "hot"))!.details).toMatchObject({
            reservationId: "theirs",
            reason: "person_left",
        });
    });

    it("frees the desks of an account that was suspended, removed or left, found by its email", async () => {
        const [leaver] = await db()
            .insert(schema.accounts)
            .values({
                email: `leaver-${SUFFIX}@desk.test`,
                name: "Leaver",
                passwordHash: "x",
                emailVerifiedAt: new Date(),
            })
            .returning();
        try {
            putRoom(first, [desk("a", "A", 0, { ownerId: leaver!.email })]);

            const outcome = await freeDesksOfAccounts(organization.id, [leaver!.id], actor, "removed");

            expect(outcome).toMatchObject({ released: 1, failed: 0 });
            expect(ownerOf(first, "a")).toBeNull();
        } finally {
            await db().delete(schema.accounts).where(eq(schema.accounts.id, leaver!.id));
        }
    });

    it("frees the desk reserved for somebody whose invitation was revoked", async () => {
        putRoom(first, [desk("a", "A", 0, { ownerId: "newhire@desk.test" })]);
        const [invitation] = await db()
            .insert(schema.invitations)
            .values({
                organizationId: organization.id,
                email: "NewHire@Desk.test",
                role: "employee",
                tokenHash: `hash-newhire-${SUFFIX}`,
                expiresAt: new Date(Date.now() + 86_400_000),
                revokedAt: new Date(),
            })
            .returning();

        const outcome = await freeDesksOfInvitation(organization.id, invitation!.id, actor);

        expect(outcome).toMatchObject({ released: 1, failed: 0 });
        expect(ownerOf(first, "a")).toBeNull();
    });

    it("leaves the desk as it was, and says so in the audit log, when map-storage is down", async () => {
        fake.down = 503;

        const direct = await releaseDesksOfPeople(organization.id, ["leaver@desk.test"], actor);
        const viaAccount = await freeDesksOfAccounts(organization.id, [account.id], actor, "removed");
        fake.down = undefined;

        expect(direct.released).toBe(0);
        expect(direct.failed).toBeGreaterThan(0);
        expect(viaAccount.failed).toBeGreaterThan(0);
        expect(await auditActions()).toContain("desk.release_failed");
        // Nothing was changed: the desk is still theirs, and still shown as theirs, for an administrator to see.
        expect(ownerOf(first, "a")).toBe("leaver@desk.test");
    });

    it("does not fail because of rooms that cannot hold desks (no map, a Tiled map, a map elsewhere)", async () => {
        const outcome = await releaseDesksOfPeople(organization.id, ["nobody@desk.test"], actor);

        expect(outcome).toEqual({ released: 0, coOwnershipsRemoved: 0, reservationsCancelled: 0, failed: 0 });
    });
});
