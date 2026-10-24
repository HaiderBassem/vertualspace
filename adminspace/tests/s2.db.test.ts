/**
 * Database tests for domain verification, GDPR erasure, the member tag policy and team owner races.
 * Needs the database of .env. Everything is created under a test organization and deleted afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { config } from "../src/lib/server/config";
import { pseudonymize } from "../src/lib/server/crypto";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { addDomain, verifyDomainOwnership } from "../src/lib/server/services/domains";
import { eraseMember, importMembers, tagPolicyFor, createMember } from "../src/lib/server/services/memberAdmin";
import { changeTeamRole, leaveOrganization } from "../src/lib/server/services/organizations";
import { findMember } from "../src/lib/server/services/members";

const SUFFIX = Date.now().toString(36);
const ORG = `s2-test-${SUFFIX}`;
const HOST = `${SUFFIX}.s2-domain.test`;
const OTHER_HOST = `${SUFFIX}.s2-other.test`;
let organizationId = "";
let workspaceId = "";
let otherOrganizationId = "";
let worldId = "";
const accountIds: string[] = [];

beforeAll(async () => {
    const [organization] = await db().insert(schema.organizations).values({ slug: ORG, name: "S2 test" }).returning();
    const [other] = await db()
        .insert(schema.organizations)
        .values({ slug: `${ORG}-other`, name: "S2 other" })
        .returning();
    if (!organization || !other) throw new Error("organizations not created");
    organizationId = organization.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organizationId, slug: "main", name: "Main" })
        .returning();
    if (!workspace) throw new Error("workspace not created");
    workspaceId = workspace.id;
    otherOrganizationId = other.id;
    const [world] = await db()
        .insert(schema.worlds)
        .values({
            organizationId,
            workspaceId,
            slug: "world",
            name: "World",
            settings: { permissions: { mapEditorTags: ["builders"] } },
        })
        .returning();
    if (!world) throw new Error("world not created");
    worldId = world.id;
    await db()
        .insert(schema.tags)
        .values([
            { worldId, name: "vip" },
            { worldId, name: "admin" },
        ]);
});

afterAll(async () => {
    await db().delete(schema.auditLogs).where(eq(schema.auditLogs.worldId, worldId));
    await db()
        .delete(schema.organizations)
        .where(inArray(schema.organizations.id, [organizationId, otherOrganizationId]));
    if (accountIds.length > 0) await db().delete(schema.accounts).where(inArray(schema.accounts.id, accountIds));
    await closeDb();
});

async function verifyCall(host: string): Promise<number> {
    const response = await dispatchAdminApi(
        new Request(`http://admin.test/api/domain/verify?uri=${encodeURIComponent(`https://${host}/x`)}`, {
            headers: { authorization: config().ADMIN_API_TOKEN },
        }),
        undefined,
    );
    return response.status;
}

describe("custom domain verification", () => {
    it("needs the DNS TXT proof, and only then lets WorkAdventure redirect there", async () => {
        const domain = await addDomain(organizationId, HOST);
        if (domain === "taken") throw new Error("taken");
        expect(await verifyCall(HOST)).toBe(403);

        const missing = Object.assign(new Error("no record"), { code: "ENOTFOUND" });
        expect((await verifyDomainOwnership(organizationId, domain.id, () => Promise.reject(missing))).status).toBe(
            "noProof",
        );
        const brokenDns = Object.assign(new Error("servfail"), { code: "ESERVFAIL" });
        expect((await verifyDomainOwnership(organizationId, domain.id, () => Promise.reject(brokenDns))).status).toBe(
            "dnsError",
        );
        expect((await verifyDomainOwnership(organizationId, domain.id, async () => [["wrong-token"]])).status).toBe(
            "noProof",
        );
        expect(await verifyCall(HOST)).toBe(403);

        // Another organization cannot verify (nor see) this domain.
        expect(
            (await verifyDomainOwnership(otherOrganizationId, domain.id, async () => [[domain.challenge ?? ""]]))
                .status,
        ).toBe("notFound");

        let askedFor = "";
        const verified = await verifyDomainOwnership(organizationId, domain.id, async (name) => {
            askedFor = name;
            // TXT records may come split in chunks.
            const token = domain.challenge ?? "";
            return [["unrelated"], [token.slice(0, 5), token.slice(5)]];
        });
        expect(askedFor).toBe(`_adminspace-challenge.${HOST}`);
        expect(verified.status).toBe("verified");
        expect(await verifyCall(HOST)).toBe(204);
    });

    it("refuses a host already claimed by another organization", async () => {
        expect(await addDomain(organizationId, OTHER_HOST)).not.toBe("taken");
        expect(await addDomain(otherOrganizationId, OTHER_HOST)).toBe("taken");
    });

    it("refuses unknown hosts (never accepts every domain)", async () => {
        expect(await verifyCall(`unknown-${SUFFIX}.example.test`)).toBe(403);
    });
});

describe("GDPR erasure", () => {
    it("removes or pseudonymises every identifier, keeping active bans enforced", async () => {
        const email = `erase-${SUFFIX}@example.test`;
        const [member] = await db()
            .insert(schema.members)
            .values({ worldId, uuid: email, email, name: "Erase Me", kind: "member" })
            .returning();
        if (!member) throw new Error("member not created");
        const old = new Date(Date.now() - 86_400_000);
        await db()
            .insert(schema.bans)
            .values([
                {
                    worldId,
                    memberUuid: email,
                    name: "Erase Me",
                    ipAddress: "203.0.113.9",
                    reason: "old",
                    bannedBy: "x",
                    revokedAt: old,
                },
                { worldId, memberUuid: email, name: "Erase Me", reason: "expired", bannedBy: "x", expiresAt: old },
                { worldId, memberUuid: email, name: "Erase Me", reason: "active", bannedBy: "x" },
            ]);
        await db()
            .insert(schema.reports)
            .values([
                { worldId, roomUrl: "/@/a/b/c", reportedUuid: email, reporterUuid: "someone", comment: "about" },
                { worldId, roomUrl: "/@/a/b/c", reportedUuid: "someone", reporterUuid: email, comment: "by" },
            ]);
        await db()
            .insert(schema.auditLogs)
            .values([
                { worldId, actorLabel: "admin", action: "member.create", targetType: "member", targetId: email },
                { worldId, actorLabel: `workadventure:${email}`, action: "report.create" },
                { worldId, actorLabel: "admin", action: "team.add", details: { email, role: "viewer" } },
            ]);
        await db()
            .insert(schema.recordingEvents)
            .values({
                worldId,
                egressId: `eg-${SUFFIX}`,
                status: "EGRESS_COMPLETE",
                playUri: "x",
                recorderUuid: email,
                files: [],
            });
        await db()
            .insert(schema.analyticsEvents)
            .values({
                eventId: `ev-${SUFFIX}`,
                worldId,
                eventName: "x",
                source: "client",
                roomId: "r",
                actorHash: pseudonymize(email, "analytics"),
                occurredAt: new Date(),
                properties: {},
            });

        const summary = await eraseMember({ id: worldId }, member.id);
        expect(summary).toMatchObject({
            activeBansKept: 1,
            bansPseudonymized: 2,
            reportsPseudonymized: 2,
            auditEntriesPseudonymized: 3,
            recordingEventsDeleted: 1,
            analyticsEventsDeleted: 1,
        });

        expect(await findMember(worldId, email)).toBeUndefined();
        const bans = await db().query.bans.findMany({ where: eq(schema.bans.worldId, worldId) });
        const active = bans.find((b) => b.reason === "active");
        expect(active?.memberUuid).toBe(email);
        for (const ban of bans.filter((b) => b.reason !== "active")) {
            expect(ban.memberUuid).toMatch(/^erased:[0-9a-f]{24}$/);
            expect(ban.name).toBeNull();
            expect(ban.ipAddress).toBeNull();
        }
        const leftovers = await db()
            .select({ n: sql<number>`count(*)::int` })
            .from(schema.reports)
            .where(
                and(
                    eq(schema.reports.worldId, worldId),
                    sql`${email} in (${schema.reports.reportedUuid}, ${schema.reports.reporterUuid})`,
                ),
            );
        expect(leftovers[0]?.n).toBe(0);
        const audits = await db().query.auditLogs.findMany({ where: eq(schema.auditLogs.worldId, worldId) });
        expect(JSON.stringify(audits)).not.toContain(email);
        expect(
            await db().query.recordingEvents.findMany({ where: eq(schema.recordingEvents.worldId, worldId) }),
        ).toEqual([]);
        expect(
            await db().query.analyticsEvents.findMany({ where: eq(schema.analyticsEvents.worldId, worldId) }),
        ).toEqual([]);
    });
});

describe("member tag policy", () => {
    it("refuses privileged and unknown tags to people who cannot manage tags, in forms and imports", async () => {
        const world = { id: worldId, settings: { permissions: { mapEditorTags: ["builders"] } } };
        const moderator = await tagPolicyFor(world, false);
        expect(moderator.privileged.has("builders")).toBe(true);

        expect(await createMember(worldId, { email: `m1-${SUFFIX}@x.test`, tags: ["admin"] }, moderator)).toEqual({
            status: "tagRefused",
            error: "reservedTag",
        });
        expect(await createMember(worldId, { email: `m2-${SUFFIX}@x.test`, tags: ["brand-new"] }, moderator)).toEqual({
            status: "tagRefused",
            error: "unknownTag",
        });

        const result = await importMembers(
            worldId,
            [
                { line: 2, email: `i1-${SUFFIX}@x.test`, name: undefined, tags: ["vip"] },
                { line: 3, email: `i2-${SUFFIX}@x.test`, name: undefined, tags: ["builders"] },
                { line: 4, email: `i3-${SUFFIX}@x.test`, name: undefined, tags: ["nope"] },
            ],
            moderator,
        );
        expect(result.summary).toEqual({ created: 1, updated: 0 });
        expect(result.errors).toEqual([
            { line: 3, code: "reservedTag" },
            { line: 4, code: "unknownTag" },
        ]);
        const created = await db().query.members.findMany({
            where: and(eq(schema.members.worldId, worldId), like(schema.members.email, `i_-${SUFFIX}@x.test`)),
        });
        expect(created.map((m) => m.email)).toEqual([`i1-${SUFFIX}@x.test`]);
        const tags = await db().query.tags.findMany({ where: eq(schema.tags.worldId, worldId) });
        expect(tags.map((t) => t.name).sort()).toEqual(["admin", "vip"]);
    });
});

describe("team owners", () => {
    it("never lets co-owners demote each other, nor both leave at once", async () => {
        const accounts = await db()
            .insert(schema.accounts)
            .values([
                { email: `o1-${SUFFIX}@x.test`, name: "O1", passwordHash: "x" },
                { email: `o2-${SUFFIX}@x.test`, name: "O2", passwordHash: "x" },
            ])
            .returning();
        accountIds.push(...accounts.map((a) => a.id));
        await db()
            .insert(schema.organizationMemberships)
            .values(accounts.map((a) => ({ organizationId, accountId: a.id, role: "owner" as const })));

        // Ownership changes hands only through the transfer (password): team actions never touch an owner.
        const [o1, o2] = accounts as [(typeof accounts)[number], (typeof accounts)[number]];
        const demotions = await Promise.all([
            changeTeamRole(organizationId, { accountId: o1.id, role: "owner" }, o2.id, "admin"),
            changeTeamRole(organizationId, { accountId: o2.id, role: "owner" }, o1.id, "admin"),
        ]);
        expect(demotions).toEqual(["forbiddenRole", "forbiddenRole"]);
        // Both leave at the same time: the owners are locked first, so the second one is the last owner.
        const departures = await Promise.all([
            leaveOrganization(organizationId, o1.id),
            leaveOrganization(organizationId, o2.id),
        ]);
        expect(departures.sort()).toEqual(["lastOwner", "ok"]);
        const owners = await db().query.organizationMemberships.findMany({
            where: and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.role, "owner"),
            ),
        });
        expect(owners).toHaveLength(1);
    });
});
