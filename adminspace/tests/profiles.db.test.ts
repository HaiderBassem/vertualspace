/**
 * Employee profiles against the real database (src/lib/server/services/memberProfiles.ts): fields saved and cleared,
 * the manager rules (a person of the same organization: a member of one of its worlds or a team account, never a guest,
 * never someone of another organization, never the person themself, no reporting loop, also under concurrent changes),
 * one profile shared by the person's member rows in every world, reporting lines for the member page, the department
 * filter and columns of the members list, the CSV import and export, and erasure. Everything is created under
 * "profile-test-*" and deleted after.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import {
    getProfile,
    isOrganizationPerson,
    organizationDepartments,
    reportingLines,
    saveMemberProfile,
} from "../src/lib/server/services/memberProfiles";
import {
    eraseMember,
    exportRow,
    getMember,
    importMembers,
    listMembers,
    tagPolicyFor,
} from "../src/lib/server/services/memberAdmin";
import { parseMemberImport } from "../src/lib/server/services/csv";
import { EMPTY_PROFILE, type ProfileInput } from "../src/lib/profiles/model";

const SUFFIX = Date.now().toString(36);
const PREFIX = `profile-test-${SUFFIX}`;
const email = (name: string) => `${name}-${SUFFIX}@profile.test`;

let orgA = "";
let orgB = "";
let world1 = "";
let world2 = "";
let worldB = "";
const members: Record<string, string> = {};
const accountIds: string[] = [];

async function addMember(worldId: string, name: string, kind: "member" | "guest" = "member") {
    const [row] = await db()
        .insert(schema.members)
        .values({ worldId, uuid: email(name), email: email(name), name, kind })
        .returning();
    return row!.id;
}

const profile = (partial: Partial<ProfileInput>): ProfileInput => ({ ...EMPTY_PROFILE, ...partial });

beforeAll(async () => {
    const [a, b] = await db()
        .insert(schema.organizations)
        .values([
            { slug: `${PREFIX}-a`, name: "Profiles A" },
            { slug: `${PREFIX}-b`, name: "Profiles B" },
        ])
        .returning();
    orgA = a!.id;
    orgB = b!.id;
    const [wsA, wsB] = await db()
        .insert(schema.workspaces)
        .values([
            { organizationId: orgA, slug: "main", name: "Main" },
            { organizationId: orgB, slug: "main", name: "Main" },
        ])
        .returning();
    const [w1, w2, wb] = await db()
        .insert(schema.worlds)
        .values([
            { organizationId: orgA, workspaceId: wsA!.id, slug: "one", name: "One" },
            { organizationId: orgA, workspaceId: wsA!.id, slug: "two", name: "Two" },
            { organizationId: orgB, workspaceId: wsB!.id, slug: "one", name: "B one" },
        ])
        .returning();
    world1 = w1!.id;
    world2 = w2!.id;
    worldB = wb!.id;
    for (const name of ["alice", "bob", "carol", "dave", "ivan", "judy"]) members[name] = await addMember(world1, name);
    members.erin = await addMember(world1, "erin", "guest");
    members.alice2 = await addMember(world2, "alice");
    members.outsider = await addMember(worldB, "outsider");
    members.aliceB = await addMember(worldB, "alice");
    // Frank has a team account in organization A, and no member row.
    const [frank] = await db()
        .insert(schema.accounts)
        .values({ email: email("Frank"), name: "Frank Account", passwordHash: "x" })
        .returning();
    accountIds.push(frank!.id);
    await db()
        .insert(schema.organizationMemberships)
        .values({ organizationId: orgA, accountId: frank!.id, role: "viewer" });
});

afterAll(async () => {
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${PREFIX}%`));
    await db().delete(schema.accounts).where(inArray(schema.accounts.id, accountIds));
    await closeDb();
});

describe("who can be a manager", () => {
    it("is a member or a team account of the same organization, never a guest or an outsider", async () => {
        expect(await isOrganizationPerson(orgA, email("bob"))).toBe(true);
        expect(await isOrganizationPerson(orgA, email("FRANK"))).toBe(true);
        expect(await isOrganizationPerson(orgA, email("erin"))).toBe(false);
        expect(await isOrganizationPerson(orgA, email("outsider"))).toBe(false);
        expect(await isOrganizationPerson(orgA, "nobody@profile.test")).toBe(false);
    });

    it("refuses guests, outsiders and the person themself", async () => {
        expect(await saveMemberProfile(orgA, email("alice"), profile({ managerEmail: email("erin") }), null)).toEqual({
            status: "managerNotFound",
        });
        expect(
            await saveMemberProfile(orgA, email("alice"), profile({ managerEmail: email("outsider") }), null),
        ).toEqual({
            status: "managerNotFound",
        });
        expect(await saveMemberProfile(orgA, email("alice"), profile({ managerEmail: email("ALICE") }), null)).toEqual({
            status: "managerIsSelf",
        });
        expect(await getProfile(orgA, email("alice"))).toBeUndefined();
    });
});

describe("saving a profile", () => {
    it("saves the fields, reports what changed, and accepts a team account as manager", async () => {
        const result = await saveMemberProfile(
            orgA,
            email("Alice"),
            profile({
                jobTitle: "Engineer",
                department: "R&D",
                workLocation: "Paris office",
                managerEmail: email("bob"),
            }),
            accountIds[0]!,
        );
        expect(result).toEqual({ status: "ok", changed: ["jobTitle", "department", "workLocation", "managerEmail"] });
        expect(await getProfile(orgA, email("alice"))).toEqual({
            jobTitle: "Engineer",
            department: "R&D",
            workLocation: "Paris office",
            managerEmail: email("bob"),
        });
        expect(await saveMemberProfile(orgA, email("alice"), (await getProfile(orgA, email("alice")))!, null)).toEqual({
            status: "ok",
            changed: [],
        });
        expect(
            await saveMemberProfile(
                orgA,
                email("bob"),
                profile({ department: "R&D", managerEmail: email("frank") }),
                null,
            ),
        ).toEqual({
            status: "ok",
            changed: ["department", "managerEmail"],
        });
    });

    it("refuses a change that closes a reporting loop, directly or through a chain", async () => {
        // alice -> bob -> frank
        expect(await saveMemberProfile(orgA, email("bob"), profile({ managerEmail: email("alice") }), null)).toEqual({
            status: "managerCycle",
        });
        expect(await saveMemberProfile(orgA, email("frank"), profile({ managerEmail: email("alice") }), null)).toEqual({
            status: "managerCycle",
        });
        expect(await saveMemberProfile(orgA, email("carol"), profile({ managerEmail: email("alice") }), null)).toEqual({
            status: "ok",
            changed: ["managerEmail"],
        });
        expect(await saveMemberProfile(orgA, email("frank"), profile({ managerEmail: email("carol") }), null)).toEqual({
            status: "managerCycle",
        });
    });

    it("lets only one of two concurrent changes that would loop together succeed", async () => {
        const results = await Promise.all([
            saveMemberProfile(orgA, email("ivan"), profile({ managerEmail: email("judy") }), null),
            saveMemberProfile(orgA, email("judy"), profile({ managerEmail: email("ivan") }), null),
        ]);
        expect(results.map((r) => r.status).sort()).toEqual(["managerCycle", "ok"]);
    });

    it("keeps one profile per person and organization, shared by every world of it", async () => {
        const { rows } = await listMembers(world2, {
            search: "",
            kind: undefined,
            tag: undefined,
            page: 1,
            pageSize: 50,
        });
        expect(rows.find((r) => r.id === members.alice2)?.profile).toMatchObject({
            jobTitle: "Engineer",
            department: "R&D",
        });
        // The same email in organization B has its own (empty) profile.
        const inB = await getMember(worldB, members.aliceB!);
        expect(inB?.profile).toBeNull();
        expect(await saveMemberProfile(orgB, email("alice"), profile({ department: "Sales" }), null)).toMatchObject({
            status: "ok",
        });
        expect((await getProfile(orgA, email("alice")))?.department).toBe("R&D");
        expect(await organizationDepartments(orgA)).toEqual(["R&D"]);
        expect(await organizationDepartments(orgB)).toEqual(["Sales"]);
    });

    it("clears fields with empty values", async () => {
        await saveMemberProfile(orgA, email("dave"), profile({ jobTitle: "Intern", department: "Ops" }), null);
        expect(await saveMemberProfile(orgA, email("dave"), profile({}), null)).toEqual({
            status: "ok",
            changed: ["jobTitle", "department"],
        });
        expect(await getProfile(orgA, email("dave"))).toBeUndefined();
    });
});

describe("reporting lines and the members list", () => {
    it("shows who a person reports to and who reports to them, with their member pages", async () => {
        const bobLines = await reportingLines(orgA, world1, email("bob"));
        expect(bobLines.manager).toMatchObject({ email: email("frank"), name: "Frank Account", memberId: null });
        expect(bobLines.directReports).toEqual([
            { email: email("alice"), name: "alice", jobTitle: "Engineer", memberId: members.alice },
        ]);
        const aliceLines = await reportingLines(orgA, world1, email("alice"));
        expect(aliceLines.manager).toMatchObject({ email: email("bob"), memberId: members.bob });
        expect(aliceLines.directReports.map((r) => r.email)).toEqual([email("carol")]);
        expect(await reportingLines(orgA, world1, email("nobody"))).toEqual({
            profile: EMPTY_PROFILE,
            manager: null,
            directReports: [],
        });
    });

    it("filters the members list by department and shows title and department", async () => {
        const { rows, total } = await listMembers(world1, {
            search: "",
            kind: undefined,
            tag: undefined,
            department: "R&D",
            page: 1,
            pageSize: 50,
        });
        expect(total).toBe(2);
        expect(rows.map((r) => r.name).sort()).toEqual(["alice", "bob"]);
        expect(rows.find((r) => r.name === "alice")?.profile?.jobTitle).toBe("Engineer");
        const none = await listMembers(world1, {
            search: "",
            kind: undefined,
            tag: undefined,
            department: "Sales",
            page: 1,
            pageSize: 50,
        });
        expect(none.total).toBe(0);
    });
});

describe("CSV", () => {
    it("exports the profile columns", async () => {
        const alice = await getMember(world1, members.alice!);
        expect(exportRow(alice!).slice(-4)).toEqual(["Engineer", "R&D", email("bob"), "Paris office"]);
    });

    it("imports profile columns after the members, refusing bad managers line by line", async () => {
        const policy = await tagPolicyFor({ id: world1, settings: {} }, true);
        const parsed = parseMemberImport(
            [
                "email,name,job_title,department,manager_email",
                `${email("kim")},Kim,Designer,Design,${email("lee")}`,
                `${email("lee")},Lee,Head of design,Design,`,
                `${email("frank")},Frank,,,${email("carol")}`,
                `${email("mia")},Mia,,,${email("outsider")}`,
                `${email("nia")},Nia,,,${email("nia")}`,
            ].join("\n"),
        );
        expect(parsed.errors).toEqual([]);
        const result = await importMembers(world1, parsed.rows, policy, accountIds[0]!);
        expect(result.summary).toEqual({ created: 5, updated: 0 });
        expect(result.errors).toEqual([
            { line: 4, code: "managerCycle" },
            { line: 5, code: "managerNotFound" },
            { line: 6, code: "managerIsSelf" },
        ]);
        // Kim's manager is Lee, added by the same file.
        expect(await getProfile(orgA, email("kim"))).toEqual({
            jobTitle: "Designer",
            department: "Design",
            workLocation: null,
            managerEmail: email("lee"),
        });
        expect((await getProfile(orgA, email("lee")))?.jobTitle).toBe("Head of design");
        // Refused lines keep their member row, without profile.
        expect(await getProfile(orgA, email("mia"))).toBeUndefined();
        const mia = await db().query.members.findFirst({
            where: and(eq(schema.members.worldId, world1), eq(schema.members.email, email("mia"))),
        });
        expect(mia?.kind).toBe("member");
        // Frank keeps his manager-free profile (it exists because Bob reports to him).
        expect((await getProfile(orgA, email("frank")))?.managerEmail).toBeNull();
    });

    it("leaves fields whose column is absent unchanged", async () => {
        const policy = await tagPolicyFor({ id: world1, settings: {} }, true);
        const parsed = parseMemberImport(`email,work_location\n${email("alice")},Remote`);
        const result = await importMembers(world1, parsed.rows, policy);
        expect(result.errors).toEqual([]);
        expect(await getProfile(orgA, email("alice"))).toEqual({
            jobTitle: "Engineer",
            department: "R&D",
            workLocation: "Remote",
            managerEmail: email("bob"),
        });
    });
});

describe("erasure", () => {
    it("keeps the profile while the person is still in another world, deletes it with the last trace", async () => {
        await eraseMember({ id: world1 }, members.alice!);
        expect((await getProfile(orgA, email("alice")))?.jobTitle).toBe("Engineer");
        await eraseMember({ id: world2 }, members.alice2!);
        expect(await getProfile(orgA, email("alice"))).toBeUndefined();
        // Carol reported to Alice: she has no manager anymore. Organization B's Alice is untouched.
        expect((await getProfile(orgA, email("carol")))?.managerEmail).toBeNull();
        expect((await getProfile(orgB, email("alice")))?.department).toBe("Sales");
    });

    it("keeps the profile of a person who still has a team account", async () => {
        await saveMemberProfile(orgA, email("frank"), profile({ jobTitle: "CTO" }), null);
        const [frankMember] = await db()
            .insert(schema.members)
            .values({ worldId: world2, uuid: email("frank"), email: email("frank"), kind: "member" })
            .returning();
        await eraseMember({ id: world2 }, frankMember!.id);
        expect((await getProfile(orgA, email("frank")))?.jobTitle).toBe("CTO");
    });
});
