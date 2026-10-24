/**
 * Employee profiles without a database (src/lib/profiles/model.ts) and their CSV columns: reporting loops (direct,
 * longer, already broken chains), the manager rules, normalization of the fields, and the profile columns of the
 * member import (only the columns present change anything, an empty cell clears).
 */
import { describe, expect, it } from "vitest";
import {
    MAX_REPORTING_DEPTH,
    changedProfileFields,
    isEmptyProfile,
    managerProblem,
    normalizeProfileInput,
    profileText,
    wouldCreateCycle,
} from "../src/lib/profiles/model";
import { parseMemberImport } from "../src/lib/server/services/csv";
import { EXPORT_HEADER } from "../src/lib/server/services/memberAdmin";

function chain(links: Record<string, string>) {
    return (person: string) => links[person] ?? null;
}

describe("reporting loops", () => {
    it("allows a manager outside the person's reports", () => {
        expect(wouldCreateCycle("alice", "bob", chain({ bob: "carol" }))).toBe(false);
        expect(wouldCreateCycle("alice", null, chain({}))).toBe(false);
    });

    it("refuses the person themself and anyone reporting to them, directly or not", () => {
        expect(wouldCreateCycle("alice", "alice", chain({}))).toBe(true);
        expect(wouldCreateCycle("alice", "bob", chain({ bob: "alice" }))).toBe(true);
        expect(wouldCreateCycle("alice", "dave", chain({ dave: "carol", carol: "bob", bob: "alice" }))).toBe(true);
    });

    it("refuses to build on a chain that already loops, or that is too deep to walk", () => {
        expect(wouldCreateCycle("alice", "bob", chain({ bob: "carol", carol: "bob" }))).toBe(true);
        const deep: Record<string, string> = {};
        for (let i = 0; i <= MAX_REPORTING_DEPTH + 1; i++) deep[`p${i}`] = `p${i + 1}`;
        expect(wouldCreateCycle("alice", "p0", chain(deep))).toBe(true);
    });

    it("names the problem", () => {
        expect(managerProblem("alice", "alice", chain({}))).toBe("managerIsSelf");
        expect(managerProblem("alice", "bob", chain({ bob: "alice" }))).toBe("managerCycle");
        expect(managerProblem("alice", "bob", chain({}))).toBeUndefined();
        expect(managerProblem("alice", null, chain({}))).toBeUndefined();
    });
});

describe("profile fields", () => {
    it("trims, collapses spaces, clears empty values and lower-cases the manager", () => {
        expect(
            normalizeProfileInput({
                jobTitle: "  Lead   developer ",
                department: "",
                workLocation: undefined,
                managerEmail: " Bob@Example.COM ",
            }),
        ).toEqual({
            jobTitle: "Lead developer",
            department: null,
            workLocation: null,
            managerEmail: "bob@example.com",
        });
        expect(profileText("x".repeat(300))).toHaveLength(200);
    });

    it("lists the fields that changed, by name", () => {
        const before = { jobTitle: "Dev", department: "R&D", workLocation: null, managerEmail: null };
        expect(changedProfileFields(before, { ...before, department: "Sales", managerEmail: "bob@x.test" })).toEqual([
            "department",
            "managerEmail",
        ]);
        expect(isEmptyProfile({ jobTitle: null, department: null, workLocation: null, managerEmail: null })).toBe(true);
    });
});

describe("profile columns of the member CSV", () => {
    it("are exported, so that an export can be imported back", () => {
        expect(EXPORT_HEADER).toEqual(
            expect.arrayContaining([
                "email",
                "name",
                "tags",
                "job_title",
                "department",
                "manager_email",
                "work_location",
            ]),
        );
    });

    it("reads only the columns present; an empty cell clears the field", () => {
        const parsed = parseMemberImport(
            "email,job_title,Manager_Email\nada@x.test,Engineer,Bob@X.test\ncyd@x.test,,\n",
        );
        expect(parsed.errors).toEqual([]);
        expect(parsed.rows).toEqual([
            {
                line: 2,
                email: "ada@x.test",
                name: undefined,
                tags: [],
                profile: { jobTitle: "Engineer", managerEmail: "bob@x.test" },
            },
            {
                line: 3,
                email: "cyd@x.test",
                name: undefined,
                tags: [],
                profile: { jobTitle: null, managerEmail: null },
            },
        ]);
    });

    it("adds no profile to files without profile columns", () => {
        expect(parseMemberImport("email,name\nada@x.test,Ada").rows[0]).not.toHaveProperty("profile");
    });

    it("refuses an invalid manager email on its line", () => {
        const parsed = parseMemberImport("email,manager_email\nada@x.test,not-an-email\nbob@x.test,ada@x.test");
        expect(parsed.errors).toEqual([{ line: 2, code: "invalidManagerEmail" }]);
        expect(parsed.rows.map((r) => r.email)).toEqual(["bob@x.test"]);
    });
});
