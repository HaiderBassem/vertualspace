/**
 * Database tests of the enterprise services that enterprise.db.test.ts does not cover: bulk team operations
 * and their per-person report, removal and leaving, workspace lifecycle, organization suspension, password
 * reset links, invitation resend, platform owner invitations, catalog search and favorites, organization
 * uploads (visibility, versions) and component updates. Everything is created under "ent-svc-*" and
 * deleted after; instance settings are restored.
 */
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull, like } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { randomToken, sha256Hex } from "../src/lib/server/crypto";
import { organizationAccess } from "../src/lib/server/auth/rbac";
import type { Account } from "../src/lib/server/auth/session";
import {
    bulkTeamOperation,
    createOrganization,
    leaveOrganization,
    removeTeamMember,
    setOrganizationSuspended,
} from "../src/lib/server/services/organizations";
import {
    archiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    restoreWorkspace,
    setWorkspaceRole,
} from "../src/lib/server/services/workspaces";
import { isResetTokenValid, resetPassword } from "../src/lib/server/services/passwordReset";
import {
    acceptInvitation,
    createInvitations,
    createPlatformOwnerInvitation,
    findInvitationByToken,
    resendInvitation,
} from "../src/lib/server/services/invitations";
import { saveInstanceSettings } from "../src/lib/server/services/instance";
import { readInstanceSettings } from "../src/lib/settings/instanceSettings";
import { importCatalogDirectory, readPackage } from "../src/lib/server/catalog/builtin";
import { validatePackage } from "../src/lib/server/catalog/validate";
import { publishedAsset, searchCatalog, setFavorite, storeComponentVersion } from "../src/lib/server/catalog/store";
import {
    buildWorldCollection,
    installComponent,
    mapOfAnotherOrganization,
    roomStatuses,
    templateDirectory,
    wamWritableBy,
} from "../src/lib/server/catalog/install";
import { organizationDirectory, wamTarget } from "../src/lib/server/catalog/mapStorage";
import { bulkInstallSucceeded, installPlatformComponents } from "../src/lib/server/catalog/bulkInstall";
import { enqueueJob, runDueJobs } from "../src/lib/server/services/jobs";
import { checkRateLimit } from "../src/lib/server/security/rateLimit";
import "../src/lib/server/services/jobHandlers";

const SUFFIX = Date.now().toString(36);
const PREFIX = `ent-svc-${SUFFIX}`;
// Unroutable on purpose: rooms under it count as map-storage rooms; no job is run in this file.
const MAP_STORAGE = "http://127.0.0.1:9";

async function account(name: string, superadmin = false): Promise<Account> {
    const [row] = await db()
        .insert(schema.accounts)
        .values({
            email: `${name}-${SUFFIX}@svc.test`,
            name,
            passwordHash: "x",
            isSuperadmin: superadmin,
            emailVerifiedAt: new Date(),
        })
        .returning();
    return row!;
}

async function statusOf(fn: () => Promise<unknown>): Promise<number | "ok"> {
    try {
        await fn();
        return "ok";
    } catch (thrown) {
        return (thrown as { status?: number }).status ?? -1;
    }
}

async function roleOf(organizationId: string, accountId: string) {
    const [row] = await db()
        .select({ role: schema.organizationMemberships.role, status: schema.organizationMemberships.status })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.accountId, accountId),
            ),
        );
    return row;
}

const people: Record<"owner" | "admin" | "employee" | "employee2" | "leaver" | "platform", Account> = {} as never;
let organization: { id: string; slug: string; name: string };
let orphan: { id: string; slug: string; name: string };
let mainWorkspace = "";
let savedSettings: unknown;

async function orphanWorkspace() {
    const [row] = await db().select().from(schema.workspaces).where(eq(schema.workspaces.organizationId, orphan.id));
    return row!;
}

beforeAll(async () => {
    const row = await db().query.instanceSettings.findFirst({ where: eq(schema.instanceSettings.id, 1) });
    savedSettings = row?.settings ?? {};
    await saveInstanceSettings({
        ...readInstanceSettings(savedSettings),
        mapStoragePublicUrl: MAP_STORAGE,
        mapStorageInternalUrl: MAP_STORAGE,
    });
    for (const key of ["owner", "admin", "employee", "employee2", "leaver"] as const) people[key] = await account(key);
    people.platform = await account("platform", true);
    const created = await createOrganization(
        { name: "Svc", slug: PREFIX, countryCode: null, defaultLocale: "en-US", contactEmail: null },
        people.owner.id,
    );
    const createdOrphan = await createOrganization(
        { name: "Svc orphan", slug: `${PREFIX}-o`, countryCode: null, defaultLocale: "en-US", contactEmail: null },
        null,
    );
    if (created === "slugTaken" || createdOrphan === "slugTaken") throw new Error("slug taken");
    organization = created.organization;
    orphan = createdOrphan.organization;
    mainWorkspace = created.workspace.id;
    for (const [key, role] of [
        ["admin", "admin"],
        ["employee", "employee"],
        ["employee2", "employee"],
        ["leaver", "employee"],
    ] as const) {
        await db()
            .insert(schema.organizationMemberships)
            .values({ organizationId: organization.id, accountId: people[key].id, role });
    }
    await importCatalogDirectory(path.resolve("catalog/builtin"));
});

afterAll(async () => {
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${PREFIX}%`));
    await db()
        .delete(schema.accounts)
        .where(like(schema.accounts.email, `%-${SUFFIX}@svc.test`));
    await db()
        .insert(schema.instanceSettings)
        .values({ id: 1, settings: savedSettings as never })
        .onConflictDoUpdate({ target: schema.instanceSettings.id, set: { settings: savedSettings as never } });
    await closeDb();
});

describe("team operations", () => {
    it("applies a bulk operation to each person and reports every refusal", async () => {
        const admin = { accountId: people.admin.id, role: "admin" as const };
        const report = await bulkTeamOperation(
            organization.id,
            admin,
            [people.employee.id, people.owner.id, people.admin.id, people.employee.id, people.platform.id],
            { kind: "suspend" },
        );
        // Duplicates are applied once; the owner is out of an admin's reach; self and strangers are refused.
        expect(report).toEqual([
            { accountId: people.employee.id, result: "ok" },
            { accountId: people.owner.id, result: "forbiddenRole" },
            { accountId: people.admin.id, result: "self" },
            { accountId: people.platform.id, result: "notMember" },
        ]);
        expect((await roleOf(organization.id, people.employee.id))?.status).toBe("suspended");
        expect((await roleOf(organization.id, people.owner.id))?.status).toBe("active");

        const reactivated = await bulkTeamOperation(organization.id, admin, [people.employee.id], {
            kind: "reactivate",
        });
        expect(reactivated).toEqual([{ accountId: people.employee.id, result: "ok" }]);
        // An admin cannot give a role above their own, even in bulk.
        const promoted = await bulkTeamOperation(organization.id, admin, [people.employee2.id], {
            kind: "role",
            role: "admin",
        });
        expect(promoted).toEqual([{ accountId: people.employee2.id, result: "forbiddenRole" }]);
        expect((await roleOf(organization.id, people.employee2.id))?.role).toBe("employee");
    });

    it("removes a person with their workspace roles, and never the last owner", async () => {
        expect(
            await setWorkspaceRole(organization.id, mainWorkspace, people.employee2.id, "manager", people.owner.id),
        ).toBe("ok");
        const owner = { accountId: people.owner.id, role: "owner" as const };
        expect(await removeTeamMember(organization.id, owner, people.employee2.id)).toBe("ok");
        expect(await roleOf(organization.id, people.employee2.id)).toBeUndefined();
        const roles = await db()
            .select()
            .from(schema.workspaceMemberships)
            .where(eq(schema.workspaceMemberships.accountId, people.employee2.id));
        expect(roles).toEqual([]);

        expect(await leaveOrganization(organization.id, people.owner.id)).toBe("lastOwner");
        expect(await leaveOrganization(organization.id, people.leaver.id)).toBe("ok");
        expect(await roleOf(organization.id, people.leaver.id)).toBeUndefined();
    });

    it("refuses the whole organization to its people while it is suspended", async () => {
        expect(await setOrganizationSuspended(organization.id, true)).toBe(true);
        expect(await statusOf(() => organizationAccess(people.owner, organization.slug))).toBe(403);
        await setOrganizationSuspended(organization.id, false);
        expect(await statusOf(() => organizationAccess(people.owner, organization.slug))).toBe("ok");
    });
});

describe("workspaces", () => {
    it("archives, restores and deletes only what can safely go", async () => {
        // The only active workspace cannot be archived nor deleted.
        expect((await archiveWorkspace(organization.id, mainWorkspace)).result).toBe("lastActive");
        expect(await deleteWorkspace(organization.id, mainWorkspace)).toBe("lastWorkspace");

        const second = await createWorkspace(organization.id, { name: "Annex", slug: "annex", description: null });
        if (second === "slugTaken") throw new Error("slug taken");
        expect(await createWorkspace(organization.id, { name: "Again", slug: "annex", description: null })).toBe(
            "slugTaken",
        );
        await db()
            .insert(schema.worlds)
            .values({ organizationId: organization.id, workspaceId: second.id, slug: "annex-world", name: "W" });
        expect(await archiveWorkspace(organization.id, second.id)).toEqual({ result: "ok", worlds: 1 });
        const [archived] = await db().select().from(schema.worlds).where(eq(schema.worlds.workspaceId, second.id));
        expect(archived?.archivedAt).not.toBeNull();
        expect(await restoreWorkspace(organization.id, second.id)).toEqual({ result: "ok", worlds: 1 });
        // A workspace with worlds is not deleted; once empty, it is.
        expect(await deleteWorkspace(organization.id, second.id)).toBe("notEmpty");
        await db().delete(schema.worlds).where(eq(schema.worlds.workspaceId, second.id));
        expect(await deleteWorkspace(organization.id, second.id)).toBe("ok");
        // Another organization's workspace is not found from here.
        expect(await deleteWorkspace(orphan.id, mainWorkspace)).toBe("notFound");
    });
});

describe("password reset links", () => {
    async function link(accountId: string, minutes = 30) {
        const token = randomToken();
        await db()
            .insert(schema.passwordResets)
            .values({ accountId, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + minutes * 60_000) });
        return token;
    }

    it("sets the password once, ends every session, and refuses expired links", async () => {
        await db()
            .insert(schema.sessions)
            .values({
                id: sha256Hex(randomToken()),
                accountId: people.admin.id,
                expiresAt: new Date(Date.now() + 3_600_000),
            });
        const token = await link(people.admin.id);
        expect(await isResetTokenValid(token)).toBe(true);
        expect((await resetPassword(token, "short", "en-US")).result).toBe("tooShort");
        expect(await resetPassword(token, "A-new-password-long-enough", "en-US")).toEqual({
            result: "ok",
            accountId: people.admin.id,
        });
        expect((await resetPassword(token, "Another-password-long-enough", "en-US")).result).toBe("invalid");
        expect(await isResetTokenValid(token)).toBe(false);
        const sessions = await db()
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.accountId, people.admin.id));
        expect(sessions).toEqual([]);
        const [updated] = await db().select().from(schema.accounts).where(eq(schema.accounts.id, people.admin.id));
        expect(updated?.passwordHash).not.toBe("x");

        const expired = await link(people.admin.id, -1);
        expect(await isResetTokenValid(expired)).toBe(false);
        expect((await resetPassword(expired, "A-new-password-long-enough", "en-US")).result).toBe("invalid");
    });
});

describe("invitations", () => {
    const context = () => ({
        organization: { id: organization.id, name: organization.name },
        inviter: { accountId: people.owner.id, role: "owner" as const, name: "Owner" },
        locale: "en-US" as const,
        origin: "https://admin.svc.test",
    });

    it("invalidates the previous link when an invitation is sent again", async () => {
        const [first] = await createInvitations(context(), {
            emails: [`resend-${SUFFIX}@svc.test`],
            role: "viewer",
            workspaces: [],
        });
        const firstToken = new URL(first!.link!).searchParams.get("token")!;
        const resent = await resendInvitation(context(), first!.invitationId!);
        if (resent.result !== "ok") throw new Error(resent.result);
        const secondToken = new URL(resent.link!).searchParams.get("token")!;
        expect(secondToken).not.toBe(firstToken);
        expect(await findInvitationByToken(firstToken)).toBeUndefined();
        expect((await findInvitationByToken(secondToken))?.state).toBe("pending");
    });

    it("lets a platform administrator invite the first owner of an organization without one", async () => {
        const invite = (email: string) =>
            createPlatformOwnerInvitation(
                {
                    organization: { id: orphan.id, name: orphan.name },
                    inviter: { accountId: people.platform.id, name: "Platform" },
                    locale: "en-US",
                    origin: "https://admin.svc.test",
                },
                email,
            );
        const outcome = await invite(people.employee2.email);
        if (outcome.result !== "invited") throw new Error(outcome.result);
        const token = new URL(outcome.link!).searchParams.get("token")!;
        expect((await acceptInvitation(token, people.employee2)).result).toBe("accepted");
        expect((await roleOf(orphan.id, people.employee2.id))?.role).toBe("owner");
        // Once it has an owner, platform administrators no longer hand out ownership.
        expect((await invite(`late-${SUFFIX}@svc.test`)).result).toBe("hasOwner");
    });
});

describe("component catalog", () => {
    const viewer = () => ({
        organizationId: organization.id,
        accountId: people.owner.id,
        locale: "en-US" as const,
        canManage: true,
    });

    function upload(version: string) {
        const { manifest, files } = readPackage(path.resolve("catalog/builtin/desk-classic"));
        Object.assign(manifest as Record<string, unknown>, {
            key: `${PREFIX}-desk`,
            name: `Svc desk ${SUFFIX}`,
            version,
            translations: {},
        });
        return storeComponentVersion({
            organizationId: organization.id,
            publisher: organization.name,
            createdBy: people.owner.id,
            publish: true,
            validation: validatePackage(manifest, files),
        });
    }

    it("finds published components by text, category and favorites", async () => {
        const found = await searchCatalog(viewer(), { query: "desk", sort: "name", limit: 50, offset: 0 });
        expect(found.items.length).toBeGreaterThan(0);
        expect(found.items.every((item) => /desk/i.test(`${item.name} ${item.description ?? ""}`))).toBe(true);
        const plants = await searchCatalog(viewer(), { category: "plants", sort: "name", limit: 50, offset: 0 });
        expect(plants.items.length).toBeGreaterThan(0);
        expect(plants.items.every((item) => item.category === "plants")).toBe(true);

        const first = found.items[0]!;
        expect(await setFavorite(viewer(), first.id, true)).toBe(true);
        const favorites = await searchCatalog(viewer(), {
            favoritesOf: people.owner.id,
            sort: "name",
            limit: 50,
            offset: 0,
        });
        expect(favorites.items.map((item) => item.id)).toEqual([first.id]);
        await setFavorite(viewer(), first.id, false);
        const none = await searchCatalog(viewer(), {
            favoritesOf: people.owner.id,
            sort: "name",
            limit: 50,
            offset: 0,
        });
        expect(none.total).toBe(0);
    });

    it("keeps an organization's upload to itself, with immutable versions", async () => {
        const stored = await upload("1.0.0");
        if (stored.result !== "created") throw new Error(stored.result);
        expect((await upload("1.0.0")).result).toBe("unchanged");
        // Found by a word of its name only (a query of several words matches any of their tags).
        const mine = await searchCatalog(viewer(), { query: SUFFIX, sort: "name", limit: 10, offset: 0 });
        expect(mine.total).toBe(1);
        const outsider = { organizationId: orphan.id, accountId: people.employee2.id };
        const elsewhere = await searchCatalog(
            { ...outsider, locale: "en-US", canManage: true },
            { query: SUFFIX, sort: "name", limit: 10, offset: 0 },
        );
        expect(elsewhere.total).toBe(0);
        // Favorites cannot reach a component the organization does not see.
        expect(await setFavorite(outsider, stored.componentId, true)).toBe(false);
    });

    it("updates an installation to the newest version", async () => {
        const [world] = await db()
            .insert(schema.worlds)
            .values({ organizationId: organization.id, workspaceId: mainWorkspace, slug: "office", name: "Office" })
            .returning();
        await db()
            .insert(schema.rooms)
            .values({
                worldId: world!.id,
                slug: "lobby",
                name: "Lobby",
                mapKind: "wam",
                wamUrl: `${MAP_STORAGE}/svc/map.wam`,
            });
        const [component] = await db()
            .select()
            .from(schema.components)
            .where(eq(schema.components.key, `${PREFIX}-desk`));
        const install = () => installComponent({ world: world!, componentId: component!.id, actorId: people.owner.id });
        expect((await install()).result).toBe("installed");
        expect((await install()).result).toBe("unchanged");
        expect((await upload("1.1.0")).result).toBe("created");
        expect((await install()).result).toBe("updated");
        const [installation] = await db()
            .select({ version: schema.componentVersions.version })
            .from(schema.componentInstallations)
            .innerJoin(
                schema.componentVersions,
                eq(schema.componentVersions.id, schema.componentInstallations.versionId),
            )
            .where(eq(schema.componentInstallations.worldId, world!.id));
        expect(installation?.version).toBe("1.1.0");
        // Each change re-armed the same link job of the room (idempotency key per room).
        const jobs = await db().select().from(schema.jobs).where(eq(schema.jobs.organizationId, organization.id));
        expect(jobs).toHaveLength(1);
    });
});

describe("maps of other organizations", () => {
    it("addresses only plain paths of the configured map-storage", async () => {
        expect((await wamTarget(`${MAP_STORAGE}/office/map.wam`))?.path).toBe("office/map.wam");
        for (const url of [
            `${MAP_STORAGE}/%2e%2e/%2E%2e/other.wam`,
            `${MAP_STORAGE}/a/../other.wam`,
            `${MAP_STORAGE}/a//other.wam`,
            `${MAP_STORAGE}/a%2fb.wam`,
            `${MAP_STORAGE}/a\\b.wam`,
            `${MAP_STORAGE}/office/map.json`,
            `http://elsewhere.test/office/map.wam`,
        ]) {
            expect(await wamTarget(url), url).toBeUndefined();
        }
    });

    it("never lets AdminSpace write a map of another organization", async () => {
        const mine = await wamTarget(`${MAP_STORAGE}/${organizationDirectory(organization.id)}/w/r/map.wam`);
        const theirs = await wamTarget(`${MAP_STORAGE}/${organizationDirectory(orphan.id)}/w/r/map.wam`);
        const shared = await wamTarget(`${MAP_STORAGE}/shared-${SUFFIX}/map.wam`);
        expect(await wamWritableBy(organization.id, mine!)).toBe(true);
        expect(await wamWritableBy(organization.id, theirs!)).toBe(false);
        expect(await wamWritableBy(organization.id, shared!)).toBe(true);

        // Once a room of another organization uses a map outside AdminSpace's directories, it is theirs.
        const [world] = await db()
            .insert(schema.worlds)
            .values({ organizationId: orphan.id, workspaceId: (await orphanWorkspace()).id, slug: "o", name: "O" })
            .returning();
        await db()
            .insert(schema.rooms)
            .values({
                worldId: world!.id,
                slug: "r",
                name: "R",
                mapKind: "wam",
                wamUrl: `${MAP_STORAGE}/shared-${SUFFIX}/map.wam`,
            });
        expect(await wamWritableBy(organization.id, shared!)).toBe(false);
        expect(await mapOfAnotherOrganization(organization.id, `${MAP_STORAGE}/shared-${SUFFIX}/map.wam`)).toBe(true);
        expect(await mapOfAnotherOrganization(orphan.id, `${MAP_STORAGE}/shared-${SUFFIX}/map.wam`)).toBe(false);

        // A room of this organization pointing at it is shown as such, and its link job refuses to write.
        const [myWorld] = await db()
            .insert(schema.worlds)
            .values({ organizationId: organization.id, workspaceId: mainWorkspace, slug: "spy", name: "Spy" })
            .returning();
        const [room] = await db()
            .insert(schema.rooms)
            .values({
                worldId: myWorld!.id,
                slug: "r",
                name: "R",
                mapKind: "wam",
                wamUrl: `${MAP_STORAGE}/shared-${SUFFIX}/map.wam`,
            })
            .returning();
        expect((await roomStatuses(myWorld!))[0]?.compatibility).toBe("otherOrganization");
        await db().transaction((tx) =>
            enqueueJob(tx, {
                kind: "wam.link_collection",
                organizationId: organization.id,
                payload: { roomId: room!.id, worldId: myWorld!.id },
            }),
        );
        await runDueJobs();
        const [after] = await db().select().from(schema.rooms).where(eq(schema.rooms.id, room!.id));
        expect(after?.syncState).toBe("failed");
        expect(after?.syncError).toBe("otherOrganization");
    });

    it("re-derives a template job's directory instead of trusting its payload", async () => {
        const [world] = await db()
            .insert(schema.worlds)
            .values({ organizationId: organization.id, workspaceId: mainWorkspace, slug: "tpl", name: "Tpl" })
            .returning();
        const [room] = await db()
            .insert(schema.rooms)
            .values({ worldId: world!.id, slug: "r", name: "R", mapKind: "wam", syncState: "pending" })
            .returning();
        const [template] = await db()
            .select({ id: schema.componentVersions.id })
            .from(schema.componentVersions)
            .innerJoin(schema.components, eq(schema.components.id, schema.componentVersions.componentId))
            .where(eq(schema.components.key, "meeting-room"));
        expect(templateDirectory(world!, room!.id)).toBe(`adminspace/${organization.id}/${world!.id}/${room!.id}`);
        await db().transaction((tx) =>
            enqueueJob(tx, {
                kind: "room.provision_template",
                organizationId: organization.id,
                payload: {
                    roomId: room!.id,
                    worldId: world!.id,
                    versionId: template!.id,
                    // Someone else's directory: map-storage empties the target directory on upload.
                    directory: `${organizationDirectory(orphan.id)}/x/${room!.id}`,
                    components: {},
                },
            }),
        );
        await runDueJobs();
        const [after] = await db().select().from(schema.rooms).where(eq(schema.rooms.id, room!.id));
        expect(after?.syncState).toBe("failed");
        expect(after?.syncError).toBe("unexpected");
    });
});

describe("public component files", () => {
    it("are not served for drafts nor for suspended organizations", async () => {
        const [file] = await db()
            .select({
                versionId: schema.componentVersionAssets.versionId,
                sha256: schema.componentVersionAssets.sha256,
            })
            .from(schema.componentVersionAssets)
            .innerJoin(
                schema.componentVersions,
                eq(schema.componentVersions.id, schema.componentVersionAssets.versionId),
            )
            .innerJoin(schema.components, eq(schema.components.id, schema.componentVersions.componentId))
            .where(eq(schema.components.key, `${PREFIX}-desk`))
            .limit(1);
        expect(await publishedAsset(file!.versionId, file!.sha256)).toBeDefined();
        await setOrganizationSuspended(organization.id, true);
        expect(await publishedAsset(file!.versionId, file!.sha256)).toBeUndefined();
        await setOrganizationSuspended(organization.id, false);
        await db()
            .update(schema.components)
            .set({ status: "draft" })
            .where(eq(schema.components.key, `${PREFIX}-desk`));
        expect(await publishedAsset(file!.versionId, file!.sha256)).toBeUndefined();
        await db()
            .update(schema.components)
            .set({ status: "published" })
            .where(eq(schema.components.key, `${PREFIX}-desk`));
    });
});

describe("rate limits", () => {
    it("count every unit of a weighted request", async () => {
        const key = `${PREFIX}:weighted`;
        expect((await checkRateLimit(key, 6, 3600, new Date(), 5)).allowed).toBe(true);
        expect((await checkRateLimit(key, 6, 3600, new Date(), 2)).allowed).toBe(false);
    });
});

describe("installing the platform's furniture in worlds", () => {
    it("installs a category in one world, again without change, and lists it in the world's collection", async () => {
        const [world] = await db()
            .insert(schema.worlds)
            .values({ organizationId: organization.id, workspaceId: mainWorkspace, slug: "garden", name: "Garden" })
            .returning();
        await db()
            .insert(schema.rooms)
            .values({
                worldId: world!.id,
                slug: "lawn",
                name: "Lawn",
                mapKind: "wam",
                wamUrl: `${MAP_STORAGE}/svc/garden.wam`,
            });
        const platformSeating = await db()
            .select({ key: schema.components.key })
            .from(schema.components)
            .where(
                and(
                    isNull(schema.components.organizationId),
                    eq(schema.components.kind, "entity"),
                    eq(schema.components.category, "seating"),
                ),
            );
        expect(platformSeating.map((c) => c.key)).toEqual(
            expect.arrayContaining(["beanbag", "garden-bench", "hammock"]),
        );

        const scope = { organizationSlug: organization.slug, worldSlug: "garden", category: "seating" };
        const first = await installPlatformComponents(scope);
        expect(first.worlds).toEqual([{ organizationSlug: organization.slug, worldSlug: "garden" }]);
        expect(first.results).toEqual({ installed: platformSeating.length });
        expect(bulkInstallSucceeded(first)).toBe(true);
        expect((await installPlatformComponents(scope)).results).toEqual({ unchanged: platformSeating.length });

        // Nothing is installed in worlds the scope does not name.
        const none = await installPlatformComponents({ ...scope, worldSlug: "elsewhere" });
        expect(none.worlds).toEqual([]);
        expect(bulkInstallSucceeded(none)).toBe(false);
        await expect(installPlatformComponents({})).rejects.toThrow();

        // The collection a world serves to WorkAdventure names its furniture, which is how seats are recognised.
        const collection = await buildWorldCollection(world!.id);
        const names = new Set(collection?.collection.map((prefab) => prefab.name));
        for (const name of ["Beanbag", "Garden bench", "Tree stump stool", "Log bench", "Rattan chair", "Hammock"]) {
            expect(names.has(name), name).toBe(true);
        }
    });
});
