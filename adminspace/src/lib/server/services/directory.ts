/**
 * What people of an organization see of it: their offices (worlds they can enter), their teammates,
 * and the organization's figures for the overview. Every query is scoped by organization id.
 */
import { and, asc, count, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { roleHas, type OrganizationRole, type WorkspaceRole } from "../auth/rbac";

export interface Office {
    worldId: string;
    worldSlug: string;
    worldName: string;
    description: string | null;
    workspaceName: string;
    roomCount: number;
}

/**
 * Worlds a person can enter: every active world for organization-wide roles above employee, the worlds
 * of their workspaces (member or manager) otherwise. Archived worlds and workspaces are left out.
 */
export async function listOffices(
    organizationId: string,
    role: OrganizationRole | undefined,
    workspaceRoles: ReadonlyMap<string, WorkspaceRole>,
): Promise<Office[]> {
    const organizationWide = roleHas(role, "world.read");
    const workspaceIds = [...workspaceRoles.keys()];
    if (!organizationWide && workspaceIds.length === 0) return [];
    const rows = await db()
        .select({
            worldId: schema.worlds.id,
            worldSlug: schema.worlds.slug,
            worldName: schema.worlds.name,
            description: schema.worlds.description,
            workspaceName: schema.workspaces.name,
            position: schema.workspaces.position,
        })
        .from(schema.worlds)
        .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.worlds.workspaceId))
        .where(
            and(
                eq(schema.worlds.organizationId, organizationId),
                isNull(schema.worlds.archivedAt),
                isNull(schema.workspaces.archivedAt),
                or(sql`${schema.worlds.expiresAt} is null`, gt(schema.worlds.expiresAt, new Date())),
                organizationWide ? undefined : inArray(schema.worlds.workspaceId, workspaceIds),
            ),
        )
        .orderBy(asc(schema.workspaces.position), asc(schema.workspaces.name), asc(schema.worlds.name));
    if (rows.length === 0) return [];
    const roomCounts = await db()
        .select({ worldId: schema.rooms.worldId, value: count() })
        .from(schema.rooms)
        .where(
            inArray(
                schema.rooms.worldId,
                rows.map((r) => r.worldId),
            ),
        )
        .groupBy(schema.rooms.worldId);
    const rooms = new Map(roomCounts.map((r) => [r.worldId, r.value]));
    return rows.map(({ position: _position, ...r }) => ({ ...r, roomCount: rooms.get(r.worldId) ?? 0 }));
}

export interface Teammate {
    accountId: string;
    name: string;
    email: string;
    role: OrganizationRole;
}

/** Active people of the organization (active membership and account), for the directory. */
export async function listTeammates(
    organizationId: string,
    filter: { query?: string; limit: number; offset: number },
): Promise<{ people: Teammate[]; total: number }> {
    const pattern = filter.query ? `%${filter.query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
    const where = and(
        eq(schema.organizationMemberships.organizationId, organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.accounts.status, "active"),
        pattern ? or(ilike(schema.accounts.name, pattern), ilike(schema.accounts.email, pattern)) : undefined,
    );
    const [people, totals] = await Promise.all([
        db()
            .select({
                accountId: schema.accounts.id,
                name: schema.accounts.name,
                email: schema.accounts.email,
                role: schema.organizationMemberships.role,
            })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(where)
            .orderBy(asc(schema.accounts.name))
            .limit(filter.limit)
            .offset(filter.offset),
        db()
            .select({ value: count() })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(where),
    ]);
    return { people, total: totals[0]?.value ?? 0 };
}

export interface OrganizationStats {
    workspaces: number;
    worlds: number;
    rooms: number;
    people: number;
    pendingInvitations: number;
}

export async function organizationStats(organizationId: string): Promise<OrganizationStats> {
    const [workspaces, worlds, rooms, people, invitations] = await Promise.all([
        db()
            .select({ value: count() })
            .from(schema.workspaces)
            .where(and(eq(schema.workspaces.organizationId, organizationId), isNull(schema.workspaces.archivedAt))),
        db()
            .select({ value: count() })
            .from(schema.worlds)
            .where(and(eq(schema.worlds.organizationId, organizationId), isNull(schema.worlds.archivedAt))),
        db()
            .select({ value: count() })
            .from(schema.rooms)
            .innerJoin(schema.worlds, eq(schema.worlds.id, schema.rooms.worldId))
            .where(and(eq(schema.worlds.organizationId, organizationId), isNull(schema.worlds.archivedAt))),
        db()
            .select({ value: count() })
            .from(schema.organizationMemberships)
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, organizationId),
                    eq(schema.organizationMemberships.status, "active"),
                ),
            ),
        db()
            .select({ value: count() })
            .from(schema.invitations)
            .where(
                and(
                    eq(schema.invitations.organizationId, organizationId),
                    isNull(schema.invitations.acceptedAt),
                    isNull(schema.invitations.revokedAt),
                    gt(schema.invitations.expiresAt, new Date()),
                ),
            ),
    ]);
    return {
        workspaces: workspaces[0]?.value ?? 0,
        worlds: worlds[0]?.value ?? 0,
        rooms: rooms[0]?.value ?? 0,
        people: people[0]?.value ?? 0,
        pendingInvitations: invitations[0]?.value ?? 0,
    };
}

export interface SetupStep {
    key: "profile" | "workspace" | "world" | "invite" | "components";
    done: boolean;
}

/** The organization's setup checklist (shown to administrators until every step is done). */
export async function setupChecklist(
    organization: { id: string; logoUrl: string | null; contactEmail: string | null; countryCode: string | null },
    stats: OrganizationStats,
): Promise<SetupStep[]> {
    const [installed] = await db()
        .select({ value: count() })
        .from(schema.componentInstallations)
        .where(eq(schema.componentInstallations.organizationId, organization.id));
    return [
        { key: "profile", done: Boolean(organization.logoUrl || organization.countryCode) },
        { key: "workspace", done: stats.workspaces > 1 },
        { key: "world", done: stats.worlds > 0 },
        { key: "invite", done: stats.people > 1 || stats.pendingInvitations > 0 },
        { key: "components", done: (installed?.value ?? 0) > 0 },
    ];
}

/**
 * Whether `email` is a person of the world's organization who may enter it as a member: an active
 * account with an active membership, organization-wide staff role (viewer and above) or a role in the
 * world's workspace. Evaluated at every entry, so suspensions and removals apply at once.
 *
 * WorkAdventure sends the email of people logged in through its OpenID Connect provider; the match is
 * on that email (AdminSpace does not authenticate WorkAdventure players itself).
 */
export async function isWorldPerson(
    world: { organizationId: string; workspaceId: string },
    email: string,
): Promise<boolean> {
    const rows = await db()
        .select({
            role: schema.organizationMemberships.role,
            workspaceRole: schema.workspaceMemberships.role,
        })
        .from(schema.accounts)
        .innerJoin(
            schema.organizationMemberships,
            and(
                eq(schema.organizationMemberships.accountId, schema.accounts.id),
                eq(schema.organizationMemberships.organizationId, world.organizationId),
                eq(schema.organizationMemberships.status, "active"),
            ),
        )
        .leftJoin(
            schema.workspaceMemberships,
            and(
                eq(schema.workspaceMemberships.accountId, schema.accounts.id),
                eq(schema.workspaceMemberships.organizationId, world.organizationId),
                eq(schema.workspaceMemberships.workspaceId, world.workspaceId),
            ),
        )
        // Matched on the address WorkAdventure's identity provider verified, against an address the
        // organization itself admitted (invitation): whether AdminSpace saw that address confirmed by email
        // (it is not, when invitation links are shared by hand) does not change who it designates.
        .where(and(sql`lower(${schema.accounts.email}) = lower(${email})`, eq(schema.accounts.status, "active")))
        .limit(1);
    const row = rows[0];
    return row !== undefined && (roleHas(row.role, "world.read") || row.workspaceRole !== null);
}
