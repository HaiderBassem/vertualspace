/**
 * Employee profiles (docs/MEMBERS.md, "Employee profiles"): job title, department, manager and work location of a
 * person in an organization, edited from a member page of any of the organization's worlds by people holding
 * member.manage there, and shown read-only to everyone who can read members.
 *
 * A profile is keyed by the person's email (lower case), so it follows the person across the organization's worlds.
 * Rules (src/lib/profiles/model.ts): the manager must be a person of the same organization (a member, not a guest, of
 * one of its worlds, or an account with an active membership); nobody is their own manager; a change that would close
 * a reporting loop is refused. Changes to the reporting lines of an organization are serialized with a transaction
 * advisory lock, so two concurrent changes cannot build a loop together.
 */
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "../db/client";
import {
    EMPTY_PROFILE,
    changedProfileFields,
    isEmptyProfile,
    managerProblem,
    profileKey,
    type ImportedProfile,
    type ProfileError,
    type ProfileInput,
} from "../../profiles/model";

type Executor = Pick<ReturnType<typeof db>, "select" | "insert" | "update" | "delete" | "execute">;

export type MemberProfile = typeof schema.memberProfiles.$inferSelect;

/** Serializes the changes of reporting lines inside one organization (held until the transaction ends). */
async function lockReportingLines(tx: Executor, organizationId: string): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('member_profiles'), hashtext(${organizationId}))`);
}

/**
 * Is this email a person of the organization: a member (added, not a guest) of one of its worlds, or the account of an
 * active member of its team?
 */
export async function isOrganizationPerson(
    organizationId: string,
    email: string,
    tx: Executor = db(),
): Promise<boolean> {
    const key = profileKey(email);
    const rows = await tx.execute<{ found: boolean }>(sql`
        select exists (
            select 1 from ${schema.members} m
            join ${schema.worlds} w on w.id = m.world_id
            where w.organization_id = ${organizationId} and m.kind = 'member' and lower(m.email) = ${key}
        ) or exists (
            select 1 from ${schema.accounts} a
            join ${schema.organizationMemberships} om on om.account_id = a.id
            where om.organization_id = ${organizationId} and om.status = 'active' and lower(a.email) = ${key}
        ) as found`);
    return [...rows][0]?.found === true;
}

/** Profiles of the given emails (any case), with their manager's email, in one query. Keyed by lower-case email. */
export async function profilesByEmail(
    organizationId: string,
    emails: readonly string[],
): Promise<Map<string, ProfileInput>> {
    const keys = [...new Set(emails.map(profileKey))].filter((key) => key.length > 0);
    if (keys.length === 0) return new Map();
    const manager = alias(schema.memberProfiles, "manager");
    const rows = await db()
        .select({
            email: schema.memberProfiles.email,
            jobTitle: schema.memberProfiles.jobTitle,
            department: schema.memberProfiles.department,
            workLocation: schema.memberProfiles.workLocation,
            managerEmail: manager.email,
        })
        .from(schema.memberProfiles)
        .leftJoin(manager, eq(manager.id, schema.memberProfiles.managerId))
        .where(
            and(eq(schema.memberProfiles.organizationId, organizationId), inArray(schema.memberProfiles.email, keys)),
        )
        .limit(keys.length);
    return new Map(
        rows.map((row) => [
            row.email,
            {
                jobTitle: row.jobTitle,
                department: row.department,
                workLocation: row.workLocation,
                managerEmail: row.managerEmail ?? null,
            },
        ]),
    );
}

/**
 * Profiles of people of a world (by the world's organization), keyed by lower-case email: one query for a page of the
 * members list or a batch of the export.
 */
export async function profilesForWorld(worldId: string, emails: readonly string[]): Promise<Map<string, ProfileInput>> {
    const keys = [...new Set(emails.map(profileKey))].filter((key) => key.length > 0);
    if (keys.length === 0) return new Map();
    const manager = alias(schema.memberProfiles, "manager");
    const rows = await db()
        .select({
            email: schema.memberProfiles.email,
            jobTitle: schema.memberProfiles.jobTitle,
            department: schema.memberProfiles.department,
            workLocation: schema.memberProfiles.workLocation,
            managerEmail: manager.email,
        })
        .from(schema.memberProfiles)
        .innerJoin(schema.worlds, eq(schema.worlds.organizationId, schema.memberProfiles.organizationId))
        .leftJoin(manager, eq(manager.id, schema.memberProfiles.managerId))
        .where(and(eq(schema.worlds.id, worldId), inArray(schema.memberProfiles.email, keys)));
    return new Map(
        rows.map(({ email, ...profile }) => [email, { ...profile, managerEmail: profile.managerEmail ?? null }]),
    );
}

export async function getProfile(organizationId: string, email: string): Promise<ProfileInput | undefined> {
    return (await profilesByEmail(organizationId, [email])).get(profileKey(email));
}

async function distinctValues(organizationId: string, column: "department" | "workLocation"): Promise<string[]> {
    const field = schema.memberProfiles[column];
    const rows = await db()
        .selectDistinct({ value: field })
        .from(schema.memberProfiles)
        .where(and(eq(schema.memberProfiles.organizationId, organizationId), isNotNull(field)))
        .orderBy(asc(field))
        .limit(500);
    return rows.map((row) => row.value).filter((value): value is string => value !== null);
}

/** Departments in use in the organization (filter of the members list, suggestions of the form). */
export function organizationDepartments(organizationId: string): Promise<string[]> {
    return distinctValues(organizationId, "department");
}

export function organizationWorkLocations(organizationId: string): Promise<string[]> {
    return distinctValues(organizationId, "workLocation");
}

/** A person in the reporting lines shown on a member page. */
export interface ReportingPerson {
    email: string;
    name: string | null;
    jobTitle: string | null;
    /** Their member page in the world being viewed, when they are a member or guest there. */
    memberId: string | null;
}

/** Display names and member pages (in `worldId`) of the given emails: member rows first, then accounts. */
async function peopleOf(organizationId: string, worldId: string, emails: string[]) {
    const keys = [...new Set(emails.map(profileKey))];
    if (keys.length === 0) return new Map<string, { name: string | null; memberId: string | null }>();
    const [members, accounts] = await Promise.all([
        db()
            .select({ id: schema.members.id, email: schema.members.email, name: schema.members.name })
            .from(schema.members)
            .where(and(eq(schema.members.worldId, worldId), inArray(sql`lower(${schema.members.email})`, keys))),
        db()
            .select({ email: schema.accounts.email, name: schema.accounts.name })
            .from(schema.accounts)
            .innerJoin(
                schema.organizationMemberships,
                and(
                    eq(schema.organizationMemberships.accountId, schema.accounts.id),
                    eq(schema.organizationMemberships.organizationId, organizationId),
                ),
            )
            .where(inArray(sql`lower(${schema.accounts.email})`, keys)),
    ]);
    const people = new Map<string, { name: string | null; memberId: string | null }>();
    for (const account of accounts) people.set(profileKey(account.email), { name: account.name, memberId: null });
    for (const member of members) {
        if (!member.email) continue;
        const key = profileKey(member.email);
        people.set(key, { name: member.name ?? people.get(key)?.name ?? null, memberId: member.id });
    }
    return people;
}

export interface ReportingLines {
    profile: ProfileInput;
    manager: ReportingPerson | null;
    directReports: ReportingPerson[];
}

/** The profile of a person and their reporting lines ("Reports to", "Direct reports"), for a member page. */
export async function reportingLines(organizationId: string, worldId: string, email: string): Promise<ReportingLines> {
    const key = profileKey(email);
    const self = await db().query.memberProfiles.findFirst({
        where: and(eq(schema.memberProfiles.organizationId, organizationId), eq(schema.memberProfiles.email, key)),
    });
    if (!self) return { profile: { ...EMPTY_PROFILE }, manager: null, directReports: [] };
    const [managerRow, reports] = await Promise.all([
        self.managerId
            ? db().query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.id, self.managerId) })
            : undefined,
        db().query.memberProfiles.findMany({
            where: and(
                eq(schema.memberProfiles.organizationId, organizationId),
                eq(schema.memberProfiles.managerId, self.id),
            ),
            orderBy: asc(schema.memberProfiles.email),
            limit: 500,
        }),
    ]);
    const people = await peopleOf(organizationId, worldId, [
        ...(managerRow ? [managerRow.email] : []),
        ...reports.map((report) => report.email),
    ]);
    const person = (row: MemberProfile): ReportingPerson => ({
        email: row.email,
        name: people.get(row.email)?.name ?? null,
        jobTitle: row.jobTitle,
        memberId: people.get(row.email)?.memberId ?? null,
    });
    return {
        profile: {
            jobTitle: self.jobTitle,
            department: self.department,
            workLocation: self.workLocation,
            managerEmail: managerRow?.email ?? null,
        },
        manager: managerRow ? person(managerRow) : null,
        directReports: reports.map(person),
    };
}

/** Reporting lines of the organization: manager email by email (lower case). */
async function reportingGraph(tx: Executor, organizationId: string): Promise<Map<string, string | null>> {
    const manager = alias(schema.memberProfiles, "manager");
    const rows = await tx
        .select({ email: schema.memberProfiles.email, managerEmail: manager.email })
        .from(schema.memberProfiles)
        .leftJoin(manager, eq(manager.id, schema.memberProfiles.managerId))
        .where(eq(schema.memberProfiles.organizationId, organizationId));
    return new Map(rows.map((row) => [row.email, row.managerEmail ?? null]));
}

/** The id of a person's profile, created empty when missing. */
async function ensureProfile(tx: Executor, organizationId: string, email: string, actorId: string | null) {
    const key = profileKey(email);
    await tx
        .insert(schema.memberProfiles)
        .values({ organizationId, email: key, updatedBy: actorId })
        .onConflictDoNothing({ target: [schema.memberProfiles.organizationId, schema.memberProfiles.email] });
    const [row] = await tx
        .select({ id: schema.memberProfiles.id })
        .from(schema.memberProfiles)
        .where(and(eq(schema.memberProfiles.organizationId, organizationId), eq(schema.memberProfiles.email, key)));
    if (!row) throw new Error("Profile upsert returned no row");
    return row.id;
}

/** Writes one profile inside a transaction holding the organization's lock; the change was checked by the caller. */
async function writeProfile(
    tx: Executor,
    organizationId: string,
    email: string,
    profile: ProfileInput,
    hasReports: boolean,
    actorId: string | null,
): Promise<void> {
    const key = profileKey(email);
    // An empty profile nobody reports to says nothing: it is removed rather than kept empty.
    if (isEmptyProfile(profile) && !hasReports) {
        await tx
            .delete(schema.memberProfiles)
            .where(and(eq(schema.memberProfiles.organizationId, organizationId), eq(schema.memberProfiles.email, key)));
        return;
    }
    const id = await ensureProfile(tx, organizationId, key, actorId);
    const managerId = profile.managerEmail
        ? await ensureProfile(tx, organizationId, profile.managerEmail, actorId)
        : null;
    await tx
        .update(schema.memberProfiles)
        .set({
            jobTitle: profile.jobTitle,
            department: profile.department,
            workLocation: profile.workLocation,
            managerId,
            updatedBy: actorId,
        })
        .where(eq(schema.memberProfiles.id, id));
}

export type SaveProfileResult =
    { status: "ok"; changed: (keyof ProfileInput)[] } | { status: Exclude<ProfileError, "noEmail"> };

/**
 * Sets the profile of the person with this email in the organization. Refuses a manager who is not a person of the
 * organization, the person themself, or one who reports (directly or not) to the person.
 */
export async function saveMemberProfile(
    organizationId: string,
    email: string,
    input: ProfileInput,
    actorId: string | null,
): Promise<SaveProfileResult> {
    const key = profileKey(email);
    const profile: ProfileInput = {
        ...input,
        managerEmail: input.managerEmail ? profileKey(input.managerEmail) : null,
    };
    return db().transaction(async (tx) => {
        await lockReportingLines(tx, organizationId);
        if (profile.managerEmail === key) return { status: "managerIsSelf" as const };
        if (profile.managerEmail && !(await isOrganizationPerson(organizationId, profile.managerEmail, tx))) {
            return { status: "managerNotFound" as const };
        }
        const graph = await reportingGraph(tx, organizationId);
        const problem = managerProblem(key, profile.managerEmail, (person) => graph.get(person));
        if (problem) return { status: problem };
        const before = (await getProfileIn(tx, organizationId, key)) ?? { ...EMPTY_PROFILE };
        const changed = changedProfileFields(before, profile);
        if (changed.length === 0) return { status: "ok" as const, changed };
        const hasReports = [...graph.values()].includes(key);
        await writeProfile(tx, organizationId, key, profile, hasReports, actorId);
        return { status: "ok" as const, changed };
    });
}

async function getProfileIn(tx: Executor, organizationId: string, key: string): Promise<ProfileInput | undefined> {
    const manager = alias(schema.memberProfiles, "manager");
    const [row] = await tx
        .select({
            jobTitle: schema.memberProfiles.jobTitle,
            department: schema.memberProfiles.department,
            workLocation: schema.memberProfiles.workLocation,
            managerEmail: manager.email,
        })
        .from(schema.memberProfiles)
        .leftJoin(manager, eq(manager.id, schema.memberProfiles.managerId))
        .where(and(eq(schema.memberProfiles.organizationId, organizationId), eq(schema.memberProfiles.email, key)));
    return row ? { ...row, managerEmail: row.managerEmail ?? null } : undefined;
}

// ---------------------------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------------------------

/**
 * Applies the profile columns of imported lines, inside the import's transaction and in file order. People added by
 * the same file count as people of the organization (`newPeople`). A line whose manager is refused is reported with
 * its problem and none of its profile columns is applied; returns those lines.
 */
export async function importProfiles(
    tx: Executor,
    organizationId: string,
    rows: { line: number; email: string; profile: ImportedProfile }[],
    newPeople: ReadonlySet<string>,
    actorId: string | null,
): Promise<{ line: number; code: Exclude<ProfileError, "noEmail"> }[]> {
    if (rows.length === 0) return [];
    await lockReportingLines(tx, organizationId);
    const graph = await reportingGraph(tx, organizationId);
    const existing = await profilesIn(
        tx,
        organizationId,
        rows.map((row) => row.email),
    );
    const known = new Map<string, boolean>();
    const errors: { line: number; code: Exclude<ProfileError, "noEmail"> }[] = [];
    for (const row of rows) {
        const key = profileKey(row.email);
        const before = existing.get(key) ?? { ...EMPTY_PROFILE };
        const managerEmail =
            row.profile.managerEmail === undefined
                ? before.managerEmail
                : row.profile.managerEmail && profileKey(row.profile.managerEmail);
        const after: ProfileInput = {
            jobTitle: row.profile.jobTitle === undefined ? before.jobTitle : row.profile.jobTitle,
            department: row.profile.department === undefined ? before.department : row.profile.department,
            workLocation: row.profile.workLocation === undefined ? before.workLocation : row.profile.workLocation,
            managerEmail: managerEmail || null,
        };
        if (after.managerEmail && after.managerEmail !== before.managerEmail) {
            if (after.managerEmail === key) {
                errors.push({ line: row.line, code: "managerIsSelf" });
                continue;
            }
            if (!known.has(after.managerEmail)) {
                known.set(
                    after.managerEmail,
                    newPeople.has(after.managerEmail) ||
                        (await isOrganizationPerson(organizationId, after.managerEmail, tx)),
                );
            }
            if (!known.get(after.managerEmail)) {
                errors.push({ line: row.line, code: "managerNotFound" });
                continue;
            }
            const problem = managerProblem(key, after.managerEmail, (person) => graph.get(person));
            if (problem) {
                errors.push({ line: row.line, code: problem });
                continue;
            }
        }
        if (changedProfileFields(before, after).length === 0) continue;
        const hasReports = [...graph.values()].includes(key);
        await writeProfile(tx, organizationId, key, after, hasReports, actorId);
        graph.set(key, after.managerEmail);
        existing.set(key, after);
    }
    return errors;
}

async function profilesIn(tx: Executor, organizationId: string, emails: string[]): Promise<Map<string, ProfileInput>> {
    const keys = [...new Set(emails.map(profileKey))];
    if (keys.length === 0) return new Map();
    const manager = alias(schema.memberProfiles, "manager");
    const rows = await tx
        .select({
            email: schema.memberProfiles.email,
            jobTitle: schema.memberProfiles.jobTitle,
            department: schema.memberProfiles.department,
            workLocation: schema.memberProfiles.workLocation,
            managerEmail: manager.email,
        })
        .from(schema.memberProfiles)
        .leftJoin(manager, eq(manager.id, schema.memberProfiles.managerId))
        .where(
            and(eq(schema.memberProfiles.organizationId, organizationId), inArray(schema.memberProfiles.email, keys)),
        );
    return new Map(
        rows.map(({ email, ...profile }) => [email, { ...profile, managerEmail: profile.managerEmail ?? null }]),
    );
}

// ---------------------------------------------------------------------------------------------
// Erasure
// ---------------------------------------------------------------------------------------------

/**
 * After a person was erased from a world: their profile goes too once nothing of them is left in the organization (no
 * member row in any of its worlds, no team membership). Their direct reports are left without a manager.
 */
export async function deleteOrphanProfile(tx: Executor, organizationId: string, email: string): Promise<boolean> {
    const key = profileKey(email);
    const deleted = await tx.execute<{ id: string }>(sql`
        delete from ${schema.memberProfiles} p
        where p.organization_id = ${organizationId} and p.email = ${key}
          and not exists (
              select 1 from ${schema.members} m join ${schema.worlds} w on w.id = m.world_id
              where w.organization_id = ${organizationId} and lower(m.email) = ${key})
          and not exists (
              select 1 from ${schema.accounts} a
              join ${schema.organizationMemberships} om on om.account_id = a.id
              where om.organization_id = ${organizationId} and lower(a.email) = ${key})
        returning p.id`);
    return [...deleted].length > 0;
}

/** Emails of the world's members (not guests), as suggestions for the manager field of a member page. */
export async function managerSuggestions(worldId: string, limit = 300): Promise<string[]> {
    const rows = await db()
        .select({ email: schema.members.email })
        .from(schema.members)
        .where(
            and(
                eq(schema.members.worldId, worldId),
                eq(schema.members.kind, "member"),
                isNotNull(schema.members.email),
            ),
        )
        .orderBy(asc(schema.members.email))
        .limit(limit);
    return rows.flatMap((row) => (row.email ? [row.email.toLowerCase()] : []));
}
