/**
 * "Who's in" against the real database: POST /api/presence/report through the Admin API router (authentication,
 * contract validation, size limits, capability), a report replacing the previous one of the same pusher (and an older
 * one never replacing a newer one), staleness and the purge, play URLs resolved to rooms with the shared resolver
 * (rooms, worlds without room, maps outside AdminSpace), people linked to their member page and account, isolation
 * between organizations and between workspaces, and the "online now" lookup of the members list.
 * Everything is created under "presence-test-*" and deleted after.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inArray, like } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { config } from "../src/lib/server/config";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { buildAccess, type OrganizationAccess } from "../src/lib/server/auth/rbac";
import {
    clearPresenceRoomCache,
    onlineIdentifiers,
    organizationPresence,
    presenceEntries,
    purgeStalePresence,
    storePresenceReport,
} from "../src/lib/server/services/presence";
import { MAX_REPORT_USERS } from "../src/lib/presence/model";
import type { PresenceReportUser } from "../src/lib/contract/workadventure";

const SUFFIX = Date.now().toString(36);
const PREFIX = `presence-test-${SUFFIX}`;
const PLAY = "http://play.presence-test.example";

interface Fixture {
    organization: typeof schema.organizations.$inferSelect;
    workspaceId: string;
    otherWorkspaceId: string;
    world: typeof schema.worlds.$inferSelect;
    lobby: typeof schema.rooms.$inferSelect;
    floor: typeof schema.rooms.$inferSelect;
    annex: typeof schema.worlds.$inferSelect;
    annexRoom: typeof schema.rooms.$inferSelect;
}

async function organization(slug: string): Promise<Fixture> {
    const [org] = await db()
        .insert(schema.organizations)
        .values({ slug, name: `Org ${slug}` })
        .returning();
    const [workspace, other] = await db()
        .insert(schema.workspaces)
        .values([
            { organizationId: org!.id, slug: "main", name: "Main" },
            { organizationId: org!.id, slug: "other", name: "Other" },
        ])
        .returning();
    const [world, annex] = await db()
        .insert(schema.worlds)
        .values([
            { organizationId: org!.id, workspaceId: workspace!.id, slug: "office", name: "Office" },
            { organizationId: org!.id, workspaceId: other!.id, slug: "annex", name: "Annex" },
        ])
        .returning();
    const [lobby, floor, annexRoom] = await db()
        .insert(schema.rooms)
        .values([
            {
                worldId: world!.id,
                slug: "lobby",
                name: "Lobby",
                mapKind: "tmj",
                mapUrl: "https://maps.test/a.tmj",
                isDefault: true,
            },
            { worldId: world!.id, slug: "floor-1", name: "Floor 1", mapKind: "tmj", mapUrl: "https://maps.test/b.tmj" },
            { worldId: annex!.id, slug: "garden", name: "Garden", mapKind: "tmj", mapUrl: "https://maps.test/c.tmj" },
        ])
        .returning();
    return {
        organization: org!,
        workspaceId: workspace!.id,
        otherWorkspaceId: other!.id,
        world: world!,
        lobby: lobby!,
        floor: floor!,
        annex: annex!,
        annexRoom: annexRoom!,
    };
}

let A: Fixture;
let B: Fixture;
let viewerA: OrganizationAccess;
let viewerB: OrganizationAccess;
const accountIds: string[] = [];
const instance = (name: string) => `${PREFIX}-${name}`;
const url = (org: Fixture, path: string) => `${PLAY}/@/${org.organization.slug}/${path}`;

function user(partial: Partial<PresenceReportUser>): PresenceReportUser {
    return {
        userIdentifier: `jane-${SUFFIX}@presence.test`,
        name: "Jane",
        isLogged: true,
        playUri: url(A, "office/lobby"),
        availabilityStatus: "ONLINE",
        connectedAt: "2026-10-24T09:00:00.000Z",
        ...partial,
    };
}

function report(name: string, users: PresenceReportUser[], reportedAt = new Date(), ttlSeconds = 90) {
    return { instanceId: instance(name), reportedAt: reportedAt.toISOString(), ttlSeconds, users };
}

function post(body: unknown, token: string | null = config().ADMIN_API_TOKEN): Promise<Response> {
    const headers = new Headers({ "content-type": "application/json" });
    if (token !== null) headers.set("authorization", token);
    return dispatchAdminApi(
        new Request("http://adminspace.test/api/presence/report", {
            method: "POST",
            headers,
            body: typeof body === "string" ? body : JSON.stringify(body),
        }),
        "198.51.100.20",
    );
}

const namesIn = async (access: OrganizationAccess) =>
    (await organizationPresence(access)).worlds.flatMap((w) =>
        w.rooms.flatMap((r) => r.people.map((p) => `${w.name}/${r.name}/${p.name}`)),
    );

beforeAll(async () => {
    A = await organization(`${PREFIX}-a`);
    B = await organization(`${PREFIX}-b`);
    viewerA = buildAccess({
        organization: A.organization,
        role: "viewer",
        workspaceRoles: new Map(),
        support: undefined,
    });
    viewerB = buildAccess({
        organization: B.organization,
        role: "viewer",
        workspaceRoles: new Map(),
        support: undefined,
    });
    const [jane] = await db()
        .insert(schema.accounts)
        .values({ email: `Jane-${SUFFIX}@presence.test`, name: "Jane Doe", passwordHash: "x" })
        .returning();
    accountIds.push(jane!.id);
    await db()
        .insert(schema.organizationMemberships)
        .values({ organizationId: A.organization.id, accountId: jane!.id, role: "employee" });
});

beforeEach(async () => {
    clearPresenceRoomCache();
    await db()
        .delete(schema.presenceReports)
        .where(like(schema.presenceReports.instanceId, `${PREFIX}%`));
});

afterAll(async () => {
    await db()
        .delete(schema.presenceReports)
        .where(like(schema.presenceReports.instanceId, `${PREFIX}%`));
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${PREFIX}%`));
    await db().delete(schema.accounts).where(inArray(schema.accounts.id, accountIds));
    await closeDb();
});

describe("POST /api/presence/report", () => {
    it("is advertised in the capabilities, without any configuration", async () => {
        const response = await dispatchAdminApi(new Request("http://adminspace.test/api/capabilities"), undefined);
        expect(await response.json()).toMatchObject({ "api/presence/report": "v1" });
    });

    it("requires the Admin API token", async () => {
        expect((await post(report("auth", [user({})]), null)).status).toBe(403);
        expect((await post(report("auth", [user({})]), "not-the-token")).status).toBe(403);
        expect(await presenceEntries(A.organization.id)).toEqual([]);
    });

    it("answers 400 to bodies the contract refuses", async () => {
        const valid = report("invalid", [user({})]);
        for (const body of [
            "not json",
            "",
            {},
            { ...valid, users: "everyone" },
            { ...valid, ttlSeconds: 0 },
            { ...valid, ttlSeconds: 1.5 },
            { ...valid, reportedAt: "yesterday" },
            { ...valid, instanceId: "" },
            { ...valid, instanceId: "x".repeat(201) },
            { ...valid, users: [{ ...user({}), isLogged: "yes" }] },
            { ...valid, users: [{ name: "No identifier" }] },
        ]) {
            expect((await post(body)).status, JSON.stringify(body).slice(0, 80)).toBe(400);
        }
        expect(await presenceEntries(A.organization.id)).toEqual([]);
    });

    it("refuses with 413 a report too large to be real", async () => {
        const many = Array.from({ length: MAX_REPORT_USERS + 1 }, (_, i) => ({ userIdentifier: `g${i}` }));
        expect((await post({ ...report("big", []), users: many })).status).toBe(413);
        expect((await post("x".repeat(3_000_000))).status).toBe(413);
    });

    it("stores the people of AdminSpace's rooms only, resolved with the shared play URL resolver", async () => {
        const response = await post(
            report("one", [
                user({}),
                user({ userIdentifier: "6f2d-guest", name: "Fox", isLogged: false, playUri: url(A, "office") }),
                user({
                    userIdentifier: "x@presence.test",
                    name: "Elsewhere",
                    playUri: `${PLAY}/_/global/maps.test/m.tmj`,
                }),
                user({ userIdentifier: "y@presence.test", name: "Ghost", playUri: url(A, "no-such-world/lobby") }),
                user({ userIdentifier: "z@presence.test", name: "Lost", playUri: url(A, "office/no-such-room") }),
            ]),
        );
        expect(response.status).toBe(204);
        const entries = await presenceEntries(A.organization.id);
        expect(entries.map((e) => [e.name, e.roomId]).sort()).toEqual(
            [
                ["Fox", A.lobby.id], // A world URL without room: its entry room.
                ["Jane", A.lobby.id],
            ].sort(),
        );
        // No raw play URL is stored.
        expect(JSON.stringify(entries)).not.toContain(PLAY);
    });
});

describe("replacement and staleness", () => {
    it("replaces the previous report of the same pusher and keeps the other pushers'", async () => {
        const t0 = new Date();
        await storePresenceReport(
            report("p1", [user({ name: "Jane" }), user({ userIdentifier: "bob@presence.test", name: "Bob" })], t0),
        );
        await storePresenceReport(
            report(
                "p2",
                [user({ userIdentifier: "carol@presence.test", name: "Carol", playUri: url(A, "office/floor-1") })],
                t0,
            ),
        );
        expect((await namesIn(viewerA)).sort()).toEqual([
            "Office/Floor 1/Carol",
            "Office/Lobby/Bob",
            "Office/Lobby/Jane",
        ]);

        const t1 = new Date(t0.getTime() + 5_000);
        await storePresenceReport(report("p1", [user({ name: "Jane", availabilityStatus: "BUSY" })], t1), t1);
        expect((await namesIn(viewerA)).sort()).toEqual(["Office/Floor 1/Carol", "Office/Lobby/Jane"]);
        const view = await organizationPresence(viewerA);
        expect(view.worlds[0]!.rooms.find((r) => r.name === "Lobby")!.people[0]!.status).toBe("busy");

        // A late, older report of p1 does not bring Bob back.
        const late = await storePresenceReport(
            report("p1", [user({ name: "Jane" }), user({ userIdentifier: "bob@presence.test", name: "Bob" })], t0),
            new Date(t1.getTime() + 1_000),
        );
        expect(late.applied).toBe(false);
        expect((await namesIn(viewerA)).sort()).toEqual(["Office/Floor 1/Carol", "Office/Lobby/Jane"]);

        // An empty report: nobody is connected to p1 anymore.
        expect((await post(report("p1", [], new Date(t1.getTime() + 2_000)))).status).toBe(204);
        expect(await namesIn(viewerA)).toEqual(["Office/Floor 1/Carol"]);
    });

    it("stops showing a report once its ttl is over, and purges it", async () => {
        const past = new Date(Date.now() - 10 * 60_000);
        await storePresenceReport(report("stale", [user({})], past, 60), past);
        expect(await presenceEntries(A.organization.id)).toEqual([]);
        expect(await namesIn(viewerA)).toEqual([]);
        expect(await purgeStalePresence()).toBeGreaterThanOrEqual(1);
        const left = await db().query.presenceReports.findMany({
            where: like(schema.presenceReports.instanceId, `${PREFIX}%`),
        });
        expect(left).toEqual([]);
    });

    it("lets a fresh report replace an expired one even if it claims an older time", async () => {
        const now = new Date();
        await storePresenceReport(
            report("clock", [user({ name: "Old" })], new Date(now.getTime() + 3_600_000), 15),
            new Date(now.getTime() - 60_000),
        );
        const result = await storePresenceReport(report("clock", [user({ name: "New" })], now), now);
        expect(result.applied).toBe(true);
        expect(await namesIn(viewerA)).toEqual(["Office/Lobby/New"]);
    });
});

describe("who sees whom", () => {
    beforeEach(async () => {
        await storePresenceReport(
            report("mixed", [
                user({}),
                user({ userIdentifier: "annex@presence.test", name: "Annie", playUri: url(A, "annex/garden") }),
                user({ userIdentifier: "b-person@presence.test", name: "Boris", playUri: url(B, "office/lobby") }),
            ]),
        );
    });

    it("never shows an organization the people in another organization's rooms", async () => {
        expect((await namesIn(viewerA)).sort()).toEqual(["Annex/Garden/Annie", "Office/Lobby/Jane"]);
        expect(await namesIn(viewerB)).toEqual(["Office/Lobby/Boris"]);
        expect((await presenceEntries(B.organization.id)).map((e) => e.name)).toEqual(["Boris"]);
    });

    it("shows a workspace manager the worlds of their workspace only, and nothing to an employee", async () => {
        const manager = buildAccess({
            organization: A.organization,
            role: "employee",
            workspaceRoles: new Map([[A.otherWorkspaceId, "manager" as const]]),
            support: undefined,
        });
        expect(manager.canSomewhere("presence.view")).toBe(true);
        expect(await namesIn(manager)).toEqual(["Annex/Garden/Annie"]);
        const employee = buildAccess({
            organization: A.organization,
            role: "employee",
            workspaceRoles: new Map(),
            support: undefined,
        });
        expect(employee.canSomewhere("presence.view")).toBe(false);
        expect(await namesIn(employee)).toEqual([]);
    });

    it("links people to their member page in the world and to their account in the organization", async () => {
        const [member] = await db()
            .insert(schema.members)
            .values({
                worldId: A.world.id,
                uuid: `jane-${SUFFIX}@presence.test`,
                email: `JANE-${SUFFIX}@presence.test`,
                kind: "member",
            })
            .returning();
        const view = await organizationPresence(viewerA);
        const jane = view.worlds.find((w) => w.name === "Office")!.rooms[0]!.people[0]!;
        expect(jane).toMatchObject({ memberId: member!.id, account: { name: "Jane Doe" }, isLogged: true });
        const annie = view.worlds.find((w) => w.name === "Annex")!.rooms[0]!.people[0]!;
        expect(annie).toMatchObject({ memberId: null, account: null });
        // Organization B does not know Jane's account.
        expect(view.counts).toEqual({ total: 2, signedIn: 2, guests: 0 });
    });

    it("tells the members list who is online now, in one world only", async () => {
        const online = await onlineIdentifiers(A.world.id, [
            `JANE-${SUFFIX}@presence.test`,
            "annex@presence.test",
            "nobody@presence.test",
        ]);
        expect([...online]).toEqual([`jane-${SUFFIX}@presence.test`]);
        expect([...(await onlineIdentifiers(A.annex.id, ["annex@presence.test"]))]).toEqual(["annex@presence.test"]);
        expect((await onlineIdentifiers(B.world.id, [`jane-${SUFFIX}@presence.test`])).size).toBe(0);
        expect((await onlineIdentifiers(A.world.id, [])).size).toBe(0);
    });
});
