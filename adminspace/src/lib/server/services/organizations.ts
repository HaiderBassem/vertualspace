/**
 * Organizations and their people (organization memberships).
 *
 * Role changes, suspensions, removals and ownership transfers run in transactions that first lock the
 * organization's active owner memberships (SELECT ... FOR UPDATE): concurrent changes then run one
 * after the other, so an organization can never end up without an active owner. Whether the actor may
 * touch a membership is decided by the policy (canManageMember, src/lib/server/auth/rbac.ts) inside
 * the same transaction, on the locked current role.
 */
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { canManageMember, type OrganizationRole } from "../auth/rbac";
import { isUniqueViolation } from "../db/errors";
import { endPersonalConnections } from "../integrations/connections";
import { emitOrgEvent, type EventActor, type EventPerson } from "../integrations/events";
import { insertDefaultWorkspace, type Workspace } from "./workspaces";

export { isUniqueViolation };

export type Organization = typeof schema.organizations.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface OrganizationInput {
    name: string;
    slug: string;
    countryCode: string | null;
    defaultLocale: string;
    contactEmail: string | null;
}

/** Slugs that are not organizations (WorkAdventure and back-office paths). */
export const RESERVED_ORGANIZATION_SLUGS = new Set(["new", "admin", "api", "_", "~"]);

/**
 * Creates an organization, its first workspace and its owner membership in one transaction (all or
 * nothing). Returns "slugTaken" when the slug is used. Pass `tx` to run inside a larger transaction
 * (registration creates the owner's account in the same one).
 */
export async function createOrganization(
    input: OrganizationInput,
    /** Null only for platform administrators, who then invite the owner by email. */
    ownerAccountId: string | null,
    tx?: Transaction,
): Promise<{ organization: Organization; workspace: Workspace } | "slugTaken"> {
    if (RESERVED_ORGANIZATION_SLUGS.has(input.slug)) return "slugTaken";
    const run = async (t: Transaction) => {
        const [organization] = await t.insert(schema.organizations).values(input).returning();
        if (!organization) throw new Error("Organization creation returned no row");
        if (ownerAccountId) {
            await t
                .insert(schema.organizationMemberships)
                .values({ organizationId: organization.id, accountId: ownerAccountId, role: "owner" });
        }
        const workspace = await insertDefaultWorkspace(t, organization.id, input.defaultLocale);
        return { organization, workspace };
    };
    if (tx) {
        // Inside a caller's transaction a unique violation aborts it: report it before inserting.
        const taken = await tx
            .select({ id: schema.organizations.id })
            .from(schema.organizations)
            .where(eq(schema.organizations.slug, input.slug))
            .limit(1);
        if (taken.length > 0) return "slugTaken";
        return run(tx);
    }
    try {
        return await db().transaction(run);
    } catch (error) {
        if (isUniqueViolation(error)) return "slugTaken";
        throw error;
    }
}

export async function isOrganizationSlugTaken(slug: string): Promise<boolean> {
    if (RESERVED_ORGANIZATION_SLUGS.has(slug)) return true;
    const rows = await db()
        .select({ id: schema.organizations.id })
        .from(schema.organizations)
        .where(eq(schema.organizations.slug, slug))
        .limit(1);
    return rows.length > 0;
}

export async function updateOrganization(
    organizationId: string,
    fields: Omit<OrganizationInput, "slug"> & { logoUrl?: string | null; brandColor?: string | null },
): Promise<void> {
    await db().update(schema.organizations).set(fields).where(eq(schema.organizations.id, organizationId));
}

export async function deleteOrganization(organizationId: string): Promise<void> {
    await db().delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
}

/** Platform lifecycle: a suspended organization is closed to its members and its worlds refuse everyone. */
export async function setOrganizationSuspended(organizationId: string, suspended: boolean): Promise<boolean> {
    const rows = await db()
        .update(schema.organizations)
        .set({ status: suspended ? "suspended" : "active", suspendedAt: suspended ? new Date() : null })
        .where(eq(schema.organizations.id, organizationId))
        .returning({ id: schema.organizations.id });
    return rows.length > 0;
}

// ---------------------------------------------------------------------------------------------
// People of an organization
// ---------------------------------------------------------------------------------------------

export type MembershipStatus = (typeof schema.membershipStatus.enumValues)[number];

export interface TeamMember {
    accountId: string;
    name: string;
    email: string;
    role: OrganizationRole;
    status: MembershipStatus;
    since: Date;
    lastLoginAt: Date | null;
    accountDisabled: boolean;
}

export interface TeamFilter {
    query?: string;
    role?: OrganizationRole;
    status?: MembershipStatus;
    limit: number;
    offset: number;
}

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** People of an organization, filtered and paginated, with the total for pagination. */
export async function listTeam(
    organizationId: string,
    filter: TeamFilter = { limit: 500, offset: 0 },
): Promise<{ members: TeamMember[]; total: number }> {
    const pattern = filter.query ? `%${escapeLike(filter.query)}%` : undefined;
    const where = and(
        eq(schema.organizationMemberships.organizationId, organizationId),
        filter.role ? eq(schema.organizationMemberships.role, filter.role) : undefined,
        filter.status ? eq(schema.organizationMemberships.status, filter.status) : undefined,
        pattern
            ? sql`(${ilike(schema.accounts.name, pattern)} or ${ilike(schema.accounts.email, pattern)})`
            : undefined,
    );
    const [members, totals] = await Promise.all([
        db()
            .select({
                accountId: schema.accounts.id,
                name: schema.accounts.name,
                email: schema.accounts.email,
                role: schema.organizationMemberships.role,
                status: schema.organizationMemberships.status,
                since: schema.organizationMemberships.createdAt,
                lastLoginAt: schema.accounts.lastLoginAt,
                accountDisabled: sql<boolean>`${schema.accounts.status} <> 'active'`,
            })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(where)
            .orderBy(asc(schema.accounts.name), asc(schema.accounts.email))
            .limit(filter.limit)
            .offset(filter.offset),
        db()
            .select({ value: count() })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(where),
    ]);
    return { members, total: totals[0]?.value ?? 0 };
}

/** Number of people per role and status (team page summary). */
export async function teamCounts(
    organizationId: string,
): Promise<{ role: OrganizationRole; status: MembershipStatus; value: number }[]> {
    return db()
        .select({
            role: schema.organizationMemberships.role,
            status: schema.organizationMemberships.status,
            value: count(),
        })
        .from(schema.organizationMemberships)
        .where(eq(schema.organizationMemberships.organizationId, organizationId))
        .groupBy(schema.organizationMemberships.role, schema.organizationMemberships.status);
}

export type TeamResult = "ok" | "notMember" | "lastOwner" | "self" | "forbiddenRole" | "unchanged" | "targetInactive";

export interface Actor {
    accountId: string;
    /**
     * The actor's organization role when the request started; undefined for support access. Decisions
     * use the role re-read under lock (lockedActorRole), never this value: it may be stale.
     */
    role: OrganizationRole | undefined;
}

/** Locks the active owner memberships of an organization for the rest of the transaction. */
async function lockActiveOwners(tx: Transaction, organizationId: string): Promise<string[]> {
    const rows = await tx
        .select({ accountId: schema.organizationMemberships.accountId })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.role, "owner"),
                eq(schema.organizationMemberships.status, "active"),
            ),
        )
        .for("update");
    return rows.map((r) => r.accountId);
}

async function lockedMembership(
    tx: Transaction,
    organizationId: string,
    accountId: string,
): Promise<{ role: OrganizationRole; status: MembershipStatus } | undefined> {
    const rows = await tx
        .select({ role: schema.organizationMemberships.role, status: schema.organizationMemberships.status })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.accountId, accountId),
            ),
        )
        .for("update");
    return rows[0];
}

/** The actor's current role, read under lock: undefined unless an active member (support has none). */
async function lockedActorRole(
    tx: Transaction,
    organizationId: string,
    actor: Actor,
): Promise<OrganizationRole | undefined> {
    const membership = await lockedMembership(tx, organizationId, actor.accountId);
    return membership?.status === "active" ? membership.role : undefined;
}

function membershipWhere(organizationId: string, accountId: string) {
    return and(
        eq(schema.organizationMemberships.organizationId, organizationId),
        eq(schema.organizationMemberships.accountId, accountId),
    );
}

/** True when removing `accountId`'s owner rights leaves no other active owner. */
function isLastActiveOwner(owners: string[], accountId: string): boolean {
    return owners.includes(accountId) && owners.length <= 1;
}

/** Changes the role of someone else. An organization always keeps at least one active owner. */
export async function changeTeamRole(
    organizationId: string,
    actor: Actor,
    accountId: string,
    role: OrganizationRole,
): Promise<TeamResult> {
    if (accountId === actor.accountId) return "self";
    return db().transaction(async (tx) => {
        const owners = await lockActiveOwners(tx, organizationId);
        const actorRole = await lockedActorRole(tx, organizationId, actor);
        const previous = await lockedMembership(tx, organizationId, accountId);
        if (!previous) return "notMember";
        if (!canManageMember(actorRole, previous.role) || !canManageMember(actorRole, role)) return "forbiddenRole";
        if (previous.role === role) return "unchanged";
        if (previous.role === "owner" && isLastActiveOwner(owners, accountId)) return "lastOwner";
        await tx.update(schema.organizationMemberships).set({ role }).where(membershipWhere(organizationId, accountId));
        return "ok";
    });
}

/**
 * Suspends or reactivates someone else's membership. A suspended person keeps their role and
 * workspace assignments but holds no right, in the back office or in WorkAdventure, until reactivated.
 */
export async function setMembershipSuspended(
    organizationId: string,
    actor: Actor,
    accountId: string,
    suspended: boolean,
): Promise<TeamResult> {
    if (accountId === actor.accountId) return "self";
    return db().transaction(async (tx) => {
        const owners = await lockActiveOwners(tx, organizationId);
        const actorRole = await lockedActorRole(tx, organizationId, actor);
        const previous = await lockedMembership(tx, organizationId, accountId);
        if (!previous) return "notMember";
        if (!canManageMember(actorRole, previous.role)) return "forbiddenRole";
        if ((previous.status === "suspended") === suspended) return "unchanged";
        if (suspended && isLastActiveOwner(owners, accountId)) return "lastOwner";
        await tx
            .update(schema.organizationMemberships)
            .set({ status: suspended ? "suspended" : "active", suspendedAt: suspended ? new Date() : null })
            .where(membershipWhere(organizationId, accountId));
        if (suspended) {
            const { person, by } = await eventPeople(tx, accountId, actor.accountId);
            await emitOrgEvent(tx, organizationId, "member.suspended", { person, by });
        }
        return "ok";
    });
}

/** The person concerned and the one acting, as integration events name them (Integration Center). */
async function eventPeople(
    tx: Transaction,
    accountId: string,
    actorId: string | undefined,
): Promise<{ person: EventPerson; by: EventActor | null }> {
    const ids = [accountId, ...(actorId && actorId !== accountId ? [actorId] : [])];
    const rows = await tx
        .select({ id: schema.accounts.id, name: schema.accounts.name, email: schema.accounts.email })
        .from(schema.accounts)
        .where(inArray(schema.accounts.id, ids));
    const person = rows.find((r) => r.id === accountId);
    const actor = actorId && actorId !== accountId ? rows.find((r) => r.id === actorId) : undefined;
    return {
        person: { id: accountId, name: person?.name ?? null, email: person?.email ?? null },
        by: actor ? { name: actor.name, email: actor.email } : null,
    };
}

/** Integration side of a departure: the event, and the person's own connections stopped and revoked (in `tx`). */
async function membershipEnded(
    tx: Transaction,
    organizationId: string,
    accountId: string,
    actorId: string | undefined,
    reason: "removed" | "left",
): Promise<void> {
    const { person, by } = await eventPeople(tx, accountId, actorId);
    await endPersonalConnections(tx, organizationId, [accountId]);
    await emitOrgEvent(tx, organizationId, "member.removed", { person, by: reason === "left" ? null : by, reason });
}

/** Removes someone else from the organization (their workspace roles go with the membership). */
export async function removeTeamMember(organizationId: string, actor: Actor, accountId: string): Promise<TeamResult> {
    if (accountId === actor.accountId) return "self";
    return db().transaction(async (tx) => {
        const owners = await lockActiveOwners(tx, organizationId);
        const actorRole = await lockedActorRole(tx, organizationId, actor);
        const previous = await lockedMembership(tx, organizationId, accountId);
        if (!previous) return "notMember";
        if (!canManageMember(actorRole, previous.role)) return "forbiddenRole";
        if (previous.role === "owner" && isLastActiveOwner(owners, accountId)) return "lastOwner";
        await tx.delete(schema.organizationMemberships).where(membershipWhere(organizationId, accountId));
        await membershipEnded(tx, organizationId, accountId, actor.accountId, "removed");
        return "ok";
    });
}

/** Leaves an organization. The last active owner must transfer ownership first. */
export async function leaveOrganization(organizationId: string, accountId: string): Promise<TeamResult> {
    return db().transaction(async (tx) => {
        const owners = await lockActiveOwners(tx, organizationId);
        const previous = await lockedMembership(tx, organizationId, accountId);
        if (!previous) return "notMember";
        if (isLastActiveOwner(owners, accountId)) return "lastOwner";
        await tx.delete(schema.organizationMemberships).where(membershipWhere(organizationId, accountId));
        await membershipEnded(tx, organizationId, accountId, accountId, "left");
        return "ok";
    });
}

/**
 * Transfers ownership: the target (an active member with an active account) becomes owner and the
 * current owner becomes admin, atomically. The caller has checked the owner's password.
 */
export async function transferOwnership(
    organizationId: string,
    ownerAccountId: string,
    targetAccountId: string,
): Promise<TeamResult> {
    if (ownerAccountId === targetAccountId) return "self";
    return db().transaction(async (tx) => {
        const owners = await lockActiveOwners(tx, organizationId);
        if (!owners.includes(ownerAccountId)) return "forbiddenRole";
        const target = await lockedMembership(tx, organizationId, targetAccountId);
        if (!target) return "notMember";
        const [targetAccount] = await tx
            .select({ status: schema.accounts.status })
            .from(schema.accounts)
            .where(eq(schema.accounts.id, targetAccountId));
        if (target.status !== "active" || targetAccount?.status !== "active") return "targetInactive";
        await tx
            .update(schema.organizationMemberships)
            .set({ role: "owner" })
            .where(membershipWhere(organizationId, targetAccountId));
        await tx
            .update(schema.organizationMemberships)
            .set({ role: "admin" })
            .where(membershipWhere(organizationId, ownerAccountId));
        return "ok";
    });
}

export type BulkOperation =
    { kind: "role"; role: OrganizationRole } | { kind: "suspend" } | { kind: "reactivate" } | { kind: "remove" };

/**
 * Applies one operation to several people, each in its own transaction, and reports every outcome:
 * a refused change (last owner, role the actor may not manage) does not cancel the others.
 */
export async function bulkTeamOperation(
    organizationId: string,
    actor: Actor,
    accountIds: string[],
    operation: BulkOperation,
): Promise<{ accountId: string; result: TeamResult }[]> {
    const results: { accountId: string; result: TeamResult }[] = [];
    for (const accountId of [...new Set(accountIds)]) {
        let result: TeamResult;
        switch (operation.kind) {
            case "role":
                result = await changeTeamRole(organizationId, actor, accountId, operation.role);
                break;
            case "suspend":
                result = await setMembershipSuspended(organizationId, actor, accountId, true);
                break;
            case "reactivate":
                result = await setMembershipSuspended(organizationId, actor, accountId, false);
                break;
            case "remove":
                result = await removeTeamMember(organizationId, actor, accountId);
                break;
        }
        results.push({ accountId, result });
    }
    return results;
}

export interface AccountOrganization {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    countryCode: string | null;
    role: OrganizationRole;
    status: MembershipStatus;
    organizationStatus: (typeof schema.organizationStatus.enumValues)[number];
}

/** Organizations an account belongs to, for the organization switcher and the home page. */
export function organizationsOf(accountId: string): Promise<AccountOrganization[]> {
    return db()
        .select({
            id: schema.organizations.id,
            slug: schema.organizations.slug,
            name: schema.organizations.name,
            logoUrl: schema.organizations.logoUrl,
            brandColor: schema.organizations.brandColor,
            countryCode: schema.organizations.countryCode,
            role: schema.organizationMemberships.role,
            status: schema.organizationMemberships.status,
            organizationStatus: schema.organizations.status,
        })
        .from(schema.organizationMemberships)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMemberships.organizationId))
        .where(eq(schema.organizationMemberships.accountId, accountId))
        .orderBy(asc(schema.organizations.name));
}

/** Members of an organization among `accountIds` (bulk validation). */
export async function membersAmong(organizationId: string, accountIds: string[]): Promise<Set<string>> {
    if (accountIds.length === 0) return new Set();
    const rows = await db()
        .select({ accountId: schema.organizationMemberships.accountId })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                inArray(schema.organizationMemberships.accountId, accountIds),
            ),
        );
    return new Set(rows.map((r) => r.accountId));
}

// ---------------------------------------------------------------------------------------------
// Audit log queries (organization and world pages)
// ---------------------------------------------------------------------------------------------

export interface AuditEntryView {
    id: string;
    occurredAt: string;
    actorLabel: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    ipAddress: string | null;
    details: Record<string, unknown> | null;
}

/** Audit entries of an organization or a world, newest first, with the total for pagination. */
export async function listAuditEntries(filter: {
    organizationId?: string;
    worldId?: string;
    actionPrefix?: string;
    limit: number;
    offset: number;
}): Promise<{ entries: AuditEntryView[]; total: number }> {
    const where = and(
        filter.organizationId ? eq(schema.auditLogs.organizationId, filter.organizationId) : undefined,
        filter.worldId ? eq(schema.auditLogs.worldId, filter.worldId) : undefined,
        filter.actionPrefix ? ilike(schema.auditLogs.action, `${escapeLike(filter.actionPrefix)}%`) : undefined,
    );
    const [rows, totalRows] = await Promise.all([
        db()
            .select()
            .from(schema.auditLogs)
            .where(where)
            .orderBy(desc(schema.auditLogs.occurredAt))
            .limit(filter.limit)
            .offset(filter.offset),
        db().select({ value: count() }).from(schema.auditLogs).where(where),
    ]);
    return {
        total: totalRows[0]?.value ?? 0,
        entries: rows.map((row) => ({
            id: row.id,
            occurredAt: row.occurredAt.toISOString(),
            actorLabel: row.actorLabel,
            action: row.action,
            targetType: row.targetType,
            targetId: row.targetId,
            ipAddress: row.ipAddress,
            details: row.details ?? null,
        })),
    };
}
