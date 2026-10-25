/**
 * Database tests of the enterprise flows, with the real services and PostgreSQL (.env database):
 * registration, invitations, team rules, tenant isolation and support access, organization people
 * entering worlds through the Admin API, and components reaching a (local, fake) map-storage with a
 * failure, a retry and a reconciliation. Everything is created under "ent-test-*" and deleted after.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { eq, like, sql } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { config } from "../src/lib/server/config";
import { randomToken, sha256Hex } from "../src/lib/server/crypto";
import { activeSupportGrant, organizationAccess } from "../src/lib/server/auth/rbac";
import type { Account } from "../src/lib/server/auth/session";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import {
    createOrganization,
    changeTeamRole,
    transferOwnership,
    setMembershipSuspended,
} from "../src/lib/server/services/organizations";
import {
    acceptInvitation,
    acceptInvitationWithNewAccount,
    createInvitations,
    revokeInvitation,
} from "../src/lib/server/services/invitations";
import { completeRegistration } from "../src/lib/server/services/registration";
import { startSupportAccess } from "../src/lib/server/services/support";
import { saveInstanceSettings } from "../src/lib/server/services/instance";
import { readInstanceSettings } from "../src/lib/settings/instanceSettings";
import { importCatalogDirectory } from "../src/lib/server/catalog/builtin";
import {
    buildWorldCollection,
    installComponent,
    linkNewRoom,
    reconcileWorld,
    uninstallComponent,
} from "../src/lib/server/catalog/install";
import { createRoom, updateRoom } from "../src/lib/server/services/rooms";
import { retryJob, runDueJobs } from "../src/lib/server/services/jobs";
import "../src/lib/server/services/jobHandlers";

/**
 * Copy of WorkAdventure's `EntityRawPrefab` and `EntityCollectionRaw` (libs/map-editor/src/types.ts, lines
 * 293-332 at commit b57916667f0f, plus `modelPath` and `seats`, which the 3D models of AdminSpace add):
 * what play/src/front/Phaser/Game/MapEditor/EntitiesCollectionsManager.ts fetches and spreads into prefabs.
 * Strict here, so that an unexpected field is noticed too.
 */
const WorkAdventureEntityRawPrefab = z
    .object({
        id: z.string(),
        name: z.string(),
        tags: z.array(z.string()),
        imagePath: z.string(),
        direction: z.enum(["Left", "Up", "Down", "Right"]),
        color: z.string(),
        collisionGrid: z.array(z.array(z.number())).optional(),
        depthOffset: z.number().optional(),
        modelPath: z.string().optional(),
        seats: z
            .array(z.object({ x: z.number(), y: z.number(), direction: z.enum(["Left", "Up", "Down", "Right"]) }))
            .optional(),
        ownerId: z.string().optional(),
    })
    .strict();
const WorkAdventureEntityCollectionRaw = z
    .object({
        collectionName: z.string(),
        tags: z.array(z.string()),
        collection: z.array(WorkAdventureEntityRawPrefab),
        version: z.string().optional(),
    })
    .strict();

const SUFFIX = Date.now().toString(36);
const PREFIX = `ent-test-${SUFFIX}`;
const PLAY = "https://play.ent-test.example";

async function account(name: string, superadmin = false): Promise<Account> {
    const [row] = await db()
        .insert(schema.accounts)
        .values({
            email: `${name}-${SUFFIX}@ent.test`,
            name,
            passwordHash: "x",
            isSuperadmin: superadmin,
            emailVerifiedAt: new Date(),
        })
        .returning();
    return row!;
}

/** The HTTP status of a SvelteKit error or redirect thrown by `fn`. */
async function statusOf(fn: () => Promise<unknown>): Promise<number | "ok"> {
    try {
        await fn();
        return "ok";
    } catch (thrown) {
        return (thrown as { status?: number }).status ?? -1;
    }
}

// ---------------------------------------------------------------------------------------------
// A fake map-storage: serves one WAM file, accepts JSON Patch with the bearer token, can be "down".
// ---------------------------------------------------------------------------------------------
const TOKEN = "map-storage-token-for-tests-0123456789";
const wam = {
    version: "2.1.0",
    mapUrl: "./office.tmj",
    entities: {} as Record<string, unknown>,
    areas: [],
    entityCollections: [] as { url: string; type: string }[],
};
let down = false;
const calls: string[] = [];
let server: Server;
let base = "";

function handler(req: IncomingMessage, res: ServerResponse): void {
    calls.push(`${req.method} ${req.url}`);
    if (down) {
        res.writeHead(503).end();
        return;
    }
    if (req.url !== "/office/map.wam") {
        res.writeHead(404).end();
        return;
    }
    if (req.method === "GET") {
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(wam));
        return;
    }
    if (req.method === "PATCH") {
        if (req.headers.authorization !== `Bearer ${TOKEN}`) {
            res.writeHead(401).end();
            return;
        }
        let body = "";
        req.on("data", (c: Buffer) => (body += c.toString()));
        req.on("end", () => {
            const ops = JSON.parse(body) as { op: string; path: string; value: unknown }[];
            const test = ops.find((o) => o.op === "test");
            if (test && JSON.stringify(test.value) !== JSON.stringify(wam.entityCollections)) {
                res.writeHead(400).end();
                return;
            }
            for (const op of ops.filter((o) => o.op === "add"))
                wam.entityCollections.push(op.value as { url: string; type: string });
            res.writeHead(200, { "content-type": "application/json" }).end('{"success":true}');
        });
        return;
    }
    res.writeHead(405).end();
}

let savedSettings: unknown;
const ids = { owner: "", admin: "", employee: "", other: "", superadmin: "" };
let organization: { id: string; slug: string };
let otherOrganization: { id: string; slug: string };
let workspaceA = "";
let workspaceB = "";
let worldId = "";

beforeAll(async () => {
    server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    savedSettings = row?.settings ?? {};
    await saveInstanceSettings({
        ...readInstanceSettings(savedSettings),
        playUrl: PLAY,
        mapStoragePublicUrl: base,
        mapStorageInternalUrl: base,
        mapStorageApiToken: TOKEN,
    });

    const owner = await account("owner");
    const admin = await account("admin");
    const other = await account("other-owner");
    const superadmin = await account("platform", true);
    Object.assign(ids, { owner: owner.id, admin: admin.id, other: other.id, superadmin: superadmin.id });
    const created = await createOrganization(
        { name: "Ent", slug: PREFIX, countryCode: null, defaultLocale: "en-US", contactEmail: null },
        owner.id,
    );
    const createdOther = await createOrganization(
        { name: "Ent other", slug: `${PREFIX}-b`, countryCode: null, defaultLocale: "en-US", contactEmail: null },
        other.id,
    );
    if (created === "slugTaken" || createdOther === "slugTaken") throw new Error("slug taken");
    organization = created.organization;
    otherOrganization = createdOther.organization;
    workspaceA = created.workspace.id;
    const [b] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organization.id, slug: "b", name: "B" })
        .returning();
    workspaceB = b!.id;
    await db()
        .insert(schema.organizationMemberships)
        .values({ organizationId: organization.id, accountId: admin.id, role: "admin" });
    const [world] = await db()
        .insert(schema.worlds)
        .values({
            organizationId: organization.id,
            workspaceId: workspaceA,
            slug: "hq",
            name: "HQ",
            accessPolicy: "members",
        })
        .returning();
    worldId = world!.id;
    await db()
        .insert(schema.rooms)
        .values({
            worldId,
            slug: "lobby",
            name: "Lobby",
            mapKind: "wam",
            wamUrl: `${base}/office/map.wam`,
            isDefault: true,
        });
    await importCatalogDirectory("catalog/builtin");
});

afterAll(async () => {
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${PREFIX}%`));
    await db()
        .delete(schema.accounts)
        .where(like(schema.accounts.email, `%-${SUFFIX}@ent.test`));
    await db()
        .delete(schema.jobs)
        .where(sql`${schema.jobs.payload}->>'worldId' = ${worldId}`);
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: savedSettings as object })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: savedSettings as object } });
    server.close();
    await closeDb();
});

describe("registration", () => {
    it("creates account, organization, owner and workspace once, from a single-use link", async () => {
        const token = randomToken();
        await db()
            .insert(schema.signupRequests)
            .values({
                email: `founder-${SUFFIX}@ent.test`,
                name: "Founder",
                passwordHash: "x",
                organizationName: "Founded",
                organizationSlug: `${PREFIX}-founded`,
                tokenHash: sha256Hex(token),
                expiresAt: new Date(Date.now() + 3_600_000),
            });
        // A double click: both confirmations race, one creates, the other finds the link used.
        const results = await Promise.all([completeRegistration(token), completeRegistration(token)]);
        expect(results.map((r) => r.result).sort()).toEqual(["created", "invalid"]);
        const created = results.find((r) => r.result === "created");
        if (created?.result !== "created") throw new Error("not created");
        const memberships = await db().query.organizationMemberships.findMany({
            where: eq(schema.organizationMemberships.organizationId, created.organization.id),
        });
        expect(memberships).toEqual([expect.objectContaining({ accountId: created.accountId, role: "owner" })]);
        const workspaces = await db().query.workspaces.findMany({
            where: eq(schema.workspaces.organizationId, created.organization.id),
        });
        expect(workspaces).toHaveLength(1);
        const [founder] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, created.accountId));
        expect(founder?.emailVerifiedAt).not.toBeNull();
    });

    it("rolls back the account when the slug was taken meanwhile, and the link stays usable", async () => {
        const token = randomToken();
        await db()
            .insert(schema.signupRequests)
            .values({
                email: `late-${SUFFIX}@ent.test`,
                name: "Late",
                passwordHash: "x",
                organizationName: "Late",
                organizationSlug: PREFIX,
                tokenHash: sha256Hex(token),
                expiresAt: new Date(Date.now() + 3_600_000),
            });
        expect((await completeRegistration(token)).result).toBe("slugTaken");
        const accounts = await db()
            .select()
            .from(schema.accounts)
            .where(eq(schema.accounts.email, `late-${SUFFIX}@ent.test`));
        expect(accounts).toHaveLength(0);
        expect((await completeRegistration(token, `${PREFIX}-late`)).result).toBe("created");
    });
});

describe("invitations", () => {
    const context = () => ({
        organization: { id: organization.id, name: "Ent" },
        inviter: { accountId: ids.owner, role: "owner" as const, name: "Owner" },
        locale: "en-US" as const,
        origin: "https://admin.ent-test.example",
    });

    it("invites without email delivery honestly, then accepts once with a new account", async () => {
        const [outcome] = await createInvitations(context(), {
            emails: [`Employee-${SUFFIX}@ent.test`],
            role: "employee",
            workspaces: [{ workspaceId: workspaceA, role: "member" }],
        });
        expect(outcome?.result).toBe("invited");
        expect(outcome?.delivery).toBe("not_configured");
        const token = new URL(outcome!.link!).searchParams.get("token")!;
        const accepted = await acceptInvitationWithNewAccount(token, {
            name: "Emma",
            password: "a-long-password-1",
            locale: "en-US",
        });
        expect(accepted.result).toBe("accepted");
        if (accepted.result !== "accepted") throw new Error();
        ids.employee = accepted.accountId;
        const again = await acceptInvitationWithNewAccount(token, {
            name: "Eve",
            password: "a-long-password-1",
            locale: "en-US",
        });
        expect(again.result).toBe("invalid");
        const roles = await db().query.workspaceMemberships.findMany({
            where: eq(schema.workspaceMemberships.accountId, ids.employee),
        });
        expect(roles).toEqual([expect.objectContaining({ workspaceId: workspaceA, role: "member" })]);
    });

    it("refuses revoked invitations, other accounts, and roles the inviter may not give", async () => {
        const [first] = await createInvitations(context(), {
            emails: [`x-${SUFFIX}@ent.test`],
            role: "viewer",
            workspaces: [],
        });
        const token = new URL(first!.link!).searchParams.get("token")!;
        expect(
            await revokeInvitation(organization.id, { accountId: ids.owner, role: "owner" }, first!.invitationId!),
        ).toBe("ok");
        const [owner] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, ids.owner));
        expect((await acceptInvitation(token, owner!)).result).toBe("invalid");

        const [second] = await createInvitations(context(), {
            emails: [`y-${SUFFIX}@ent.test`],
            role: "viewer",
            workspaces: [],
        });
        const other = new URL(second!.link!).searchParams.get("token")!;
        expect((await acceptInvitation(other, owner!)).result).toBe("emailMismatch");

        const refused = await createInvitations(
            { ...context(), inviter: { accountId: ids.admin, role: "admin", name: "Admin" } },
            { emails: [`z-${SUFFIX}@ent.test`], role: "owner", workspaces: [] },
        );
        expect(refused[0]?.result).toBe("forbiddenRole");
    });
});

describe("team rules", () => {
    it("keeps admins away from owners and everyone away from their own role", async () => {
        expect(
            await changeTeamRole(organization.id, { accountId: ids.admin, role: "admin" }, ids.owner, "viewer"),
        ).toBe("forbiddenRole");
        expect(await changeTeamRole(organization.id, { accountId: ids.admin, role: "admin" }, ids.admin, "owner")).toBe(
            "self",
        );
    });

    it("transfers ownership atomically, and a suspended person loses access at once", async () => {
        expect(await transferOwnership(organization.id, ids.owner, ids.admin)).toBe("ok");
        const roles = await db().query.organizationMemberships.findMany({
            where: eq(schema.organizationMemberships.organizationId, organization.id),
        });
        expect(roles.find((m) => m.accountId === ids.admin)?.role).toBe("owner");
        expect(roles.find((m) => m.accountId === ids.owner)?.role).toBe("admin");
        expect(await transferOwnership(organization.id, ids.admin, ids.owner)).toBe("ok");

        const [employee] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, ids.employee));
        expect(await statusOf(() => organizationAccess(employee!, organization.slug))).toBe("ok");
        expect(
            await setMembershipSuspended(organization.id, { accountId: ids.owner, role: "owner" }, ids.employee, true),
        ).toBe("ok");
        expect(await statusOf(() => organizationAccess(employee!, organization.slug))).toBe(404);
        expect(
            await setMembershipSuspended(organization.id, { accountId: ids.owner, role: "owner" }, ids.employee, false),
        ).toBe("ok");
    });
});

describe("tenant isolation and support access", () => {
    it("answers 404 for another organization, whatever the role", async () => {
        const [owner] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, ids.owner));
        expect(await statusOf(() => organizationAccess(owner!, otherOrganization.slug))).toBe(404);
        expect(await statusOf(() => organizationAccess(owner!, "does-not-exist"))).toBe(404);
    });

    it("gives platform administrators nothing without a support grant, and limited rights with one", async () => {
        const [platform] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, ids.superadmin));
        expect(await statusOf(() => organizationAccess(platform!, organization.slug))).toBe(303);
        await startSupportAccess({
            organizationId: organization.id,
            accountId: ids.superadmin,
            reason: "ticket ENT-1",
            minutes: 15,
        });
        expect(await activeSupportGrant(ids.superadmin, organization.id)).toBeDefined();
        const access = await organizationAccess(platform!, organization.slug);
        expect(access.can("world.update")).toBe(true);
        expect(access.can("team.manage")).toBe(false);
        expect(access.can("ownership.transfer")).toBe(false);
    });
});

describe("Admin API: organization people enter their worlds", () => {
    async function access(email: string) {
        const url = `/api/room/access?playUri=${encodeURIComponent(`${PLAY}/@/${PREFIX}/hq/lobby`)}&userIdentifier=${encodeURIComponent(email)}&isLogged=1`;
        const response = await dispatchAdminApi(
            new Request(`http://admin.test${url}`, { headers: { authorization: config().ADMIN_API_TOKEN } }),
            "198.51.100.20",
        );
        return (await response.json()) as { status: string; code?: string };
    }

    it("admits an employee of the world's workspace and refuses one of another workspace", async () => {
        const email = `employee-${SUFFIX}@ent.test`;
        expect((await access(email)).status).toBe("ok");
        await db()
            .update(schema.workspaceMemberships)
            .set({ workspaceId: workspaceB })
            .where(eq(schema.workspaceMemberships.accountId, ids.employee));
        // The members-only refusal (unauthorizedData("membersOnly")).
        expect((await access(email)).code).toBe("USER_ACCESS_FORBIDDEN");
        await db()
            .update(schema.workspaceMemberships)
            .set({ workspaceId: workspaceA })
            .where(eq(schema.workspaceMemberships.accountId, ids.employee));
    });

    it("refuses everyone when the organization is suspended", async () => {
        await db()
            .update(schema.organizations)
            .set({ status: "suspended" })
            .where(eq(schema.organizations.id, organization.id));
        expect((await access(`employee-${SUFFIX}@ent.test`)).code).toBe("ORGANIZATION_SUSPENDED");
        await db()
            .update(schema.organizations)
            .set({ status: "active" })
            .where(eq(schema.organizations.id, organization.id));
    });
});

describe("components reach map-storage, survive an outage and are reconciled", () => {
    async function desk() {
        const [row] = await db()
            .select()
            .from(schema.components)
            .where(sql`${schema.components.key} = 'desk-classic' and ${schema.components.organizationId} is null`);
        return row!;
    }
    async function room() {
        const [row] = await db().select().from(schema.rooms).where(eq(schema.rooms.worldId, worldId));
        return row!;
    }
    async function world() {
        const [row] = await db().select().from(schema.worlds).where(eq(schema.worlds.id, worldId));
        return row!;
    }

    it("links the world collection into the room's WAM through a job", async () => {
        const result = await installComponent({
            world: await world(),
            componentId: (await desk()).id,
            actorId: ids.owner,
        });
        expect(result.result).toBe("installed");
        await runDueJobs();
        const url = `${new URL(config().ORIGIN!).origin}/wa/worlds/${worldId}/collection.json`;
        expect(wam.entityCollections).toEqual([{ url, type: "file" }]);
        expect((await room()).collectionLinkedAt).not.toBeNull();
        const collection = await buildWorldCollection(worldId);
        // The shape WorkAdventure's map editor reads (it casts the JSON without validating it, so any
        // mismatch would break silently in the editor): parsed with a copy of WorkAdventure's own schema.
        expect(() => WorkAdventureEntityCollectionRaw.parse(collection)).not.toThrow();
        expect(collection?.collection.map((p) => p.id)).toContain(`adminspace:${(await desk()).id}:oak`);
        expect(collection?.collection[0]?.imagePath).toMatch(
            /^https?:\/\/.+\/wa\/assets\/[0-9a-f-]{36}\/[0-9a-f]{64}\.png$/,
        );
        // The model the game draws the desk from is published with it (a desk is not something to sit on).
        const oakDesk = `adminspace:${(await desk()).id}:oak`;
        const prefab = collection?.collection.find((p) => p.id === oakDesk);
        expect(prefab?.modelPath).toMatch(/^https?:\/\/.+\/wa\/assets\/[0-9a-f-]{36}\/[0-9a-f]{64}\.json$/);
        expect(prefab?.seats).toBeUndefined();
    });

    it("surfaces an outage, retries, and repairs without duplicating the collection", async () => {
        wam.entityCollections = [];
        down = true;
        await reconcileWorld(await world(), ids.owner);
        await runDueJobs();
        const failed = await room();
        expect(failed.syncState).toBe("pending");
        // A code the pages translate (catalog.world.problems); the HTTP detail stays on the job.
        expect(failed.syncError).toBe("unavailable");
        down = false;
        const [job] = await db()
            .select()
            .from(schema.jobs)
            .where(sql`${schema.jobs.payload}->>'roomId' = ${failed.id}`);
        await retryJob(job!.id);
        await runDueJobs();
        expect((await room()).syncState).toBe("ready");
        expect(wam.entityCollections).toHaveLength(1);
        // Running it again changes nothing: the URL is already there.
        await reconcileWorld(await world(), ids.owner);
        await runDueJobs();
        expect(wam.entityCollections).toHaveLength(1);
        expect(calls.filter((c) => c.startsWith("PATCH")).length).toBe(2);
    });

    it("links a room added later, and links again a room whose map changes", async () => {
        const input = {
            slug: "annex",
            name: "Annex",
            mapKind: "wam" as const,
            wamUrl: `${base}/office/map.wam`,
            requiredTags: [],
            isDefault: false,
        };
        const annex = await createRoom(worldId, input);
        if (annex === "slugTaken") throw new Error("slug taken");
        const linkedAt = async () =>
            (await db().select().from(schema.rooms).where(eq(schema.rooms.id, annex.id)))[0]!.collectionLinkedAt;
        expect(await linkedAt()).toBeNull();
        await linkNewRoom(await world(), ids.owner);
        await runDueJobs();
        expect(await linkedAt()).not.toBeNull();
        // Same map: still linked. Another map: not linked until the job has checked it.
        await updateRoom(worldId, annex.id, { ...input, name: "Annex 2" });
        expect(await linkedAt()).not.toBeNull();
        await updateRoom(worldId, annex.id, { ...input, wamUrl: `${base}/office/map.wam?v=2` });
        expect(await linkedAt()).toBeNull();
        await linkNewRoom(await world(), ids.owner);
        await runDueJobs();
        expect(await linkedAt()).not.toBeNull();
        expect(wam.entityCollections).toHaveLength(1);
    });

    it("refuses to remove a component whose pieces are placed in a room", async () => {
        const componentId = (await desk()).id;
        wam.entities = {
            e1: { x: 64, y: 64, prefabRef: { collectionName: "x", id: `adminspace:${componentId}:oak` } },
        };
        expect((await uninstallComponent(await world(), componentId)).result).toBe("inUse");
        wam.entities = {};
        expect((await uninstallComponent(await world(), componentId)).result).toBe("removed");
    });
});
