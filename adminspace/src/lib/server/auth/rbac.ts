/**
 * Authorization: the single policy decision point of the back office (least privilege, ISO/IEC 27001
 * Annex A 5.15 / 8.2). Pages and actions enforce it through src/lib/server/context.ts; services never
 * decide on their own who may do what.
 *
 * Three sources of rights, evaluated per request from the database (a change applies at once):
 *
 * 1. Organization-wide role (organization_memberships.role, only while the membership is active):
 *      employee   no administration: the employee workspace (offices, teammates, components)
 *      viewer     + read-only administration of every workspace, world, member and log
 *      moderator  + people management and moderation (bans, reports, live messages)
 *      admin      + workspaces, worlds, rooms, settings, components, integrations; manages the roles
 *                   below admin
 *      owner      + every role, ownership transfer, deletion of the organization
 * 2. Workspace roles (workspace_memberships.role), which add rights on the worlds of one workspace only:
 *      manager    delegated administration of the workspace's worlds
 *      member     lets an employee enter the workspace's worlds in WorkAdventure (no back-office right)
 * 3. Support access (support_access_grants): a platform administrator holds NO right inside an
 *    organization they are not a member of, except during a justified, time-limited, audited grant,
 *    which gives SUPPORT_PERMISSIONS (never team, ownership, integrations or secrets).
 */
import { error, redirect } from "@sveltejs/kit";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { Account } from "./session";
import { requestContext } from "../requestContext";

export type OrganizationRole = (typeof schema.organizationRole.enumValues)[number];
export type WorkspaceRole = (typeof schema.workspaceRole.enumValues)[number];

const EVERYONE = ["employee", "viewer", "moderator", "admin", "owner"] as const;
const STAFF = ["viewer", "moderator", "admin", "owner"] as const;
const MODERATORS = ["moderator", "admin", "owner"] as const;
const ADMINS = ["admin", "owner"] as const;
const OWNERS = ["owner"] as const;

/** Organization-wide permissions of each role. The e2e authorization suite asserts this exact matrix. */
export const PERMISSIONS = {
    "organization.read": EVERYONE,
    "organization.update": ADMINS,
    "organization.delete": OWNERS,
    "directory.read": EVERYONE,
    "team.read": STAFF,
    "team.invite": ADMINS,
    /** Role changes, suspension and removal; admins only for the roles below admin (see grantableRoles). */
    "team.manage": ADMINS,
    "ownership.transfer": OWNERS,
    "workspace.read": STAFF,
    "workspace.create": ADMINS,
    "workspace.update": ADMINS,
    "workspace.archive": ADMINS,
    "world.read": STAFF,
    "world.create": ADMINS,
    "world.update": ADMINS,
    "world.delete": OWNERS,
    "room.manage": ADMINS,
    "member.read": STAFF,
    "member.manage": MODERATORS,
    "tag.manage": ADMINS,
    "moderation.manage": MODERATORS,
    "live.manage": MODERATORS,
    "secrets.read": ADMINS,
    "apiKey.manage": ADMINS,
    "domain.manage": ADMINS,
    "audit.read": STAFF,
    "component.read": EVERYONE,
    "component.install": ADMINS,
    "component.manage": ADMINS,
    /** Integration Center: organization-wide connections, notification endpoints, deliveries, automation tokens. */
    "integration.manage": ADMINS,
    /** "My integrations": a person connects their own calendar, developer and music accounts. */
    "integration.personal": EVERYONE,
    /** "Who's in": who is connected to the organization's worlds right now (live, from WorkAdventure). */
    "presence.view": STAFF,
} as const satisfies Record<string, readonly OrganizationRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Rights a workspace role adds on that workspace and its worlds. They never apply to
 * organization-wide pages (team, integrations, organization audit log, settings).
 */
export const WORKSPACE_PERMISSIONS = {
    manager: [
        "workspace.read",
        "workspace.update",
        "world.read",
        "world.create",
        "world.update",
        "room.manage",
        "member.read",
        "member.manage",
        "tag.manage",
        "moderation.manage",
        "live.manage",
        "audit.read",
        "component.install",
        "presence.view",
    ],
    member: [],
} as const satisfies Record<WorkspaceRole, readonly Permission[]>;

/**
 * Rights of a platform administrator during a support access grant: enough to diagnose and repair
 * an organization's configuration, nothing that changes who holds power in it or reveals secrets.
 */
export const SUPPORT_PERMISSIONS: readonly Permission[] = [
    "organization.read",
    "directory.read",
    "team.read",
    "workspace.read",
    "workspace.update",
    "world.read",
    "world.update",
    "room.manage",
    "member.read",
    "tag.manage",
    "moderation.manage",
    "live.manage",
    "audit.read",
    "component.read",
    "component.install",
];

/** From least to most privileged. */
export const ROLE_ORDER: readonly OrganizationRole[] = ["employee", "viewer", "moderator", "admin", "owner"];
export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ["manager", "member"];

export function roleHas(role: OrganizationRole | undefined, permission: Permission): boolean {
    return role !== undefined && (PERMISSIONS[permission] as readonly OrganizationRole[]).includes(role);
}

export function workspaceRoleHas(role: WorkspaceRole | undefined, permission: Permission): boolean {
    return role !== undefined && (WORKSPACE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

/**
 * Roles an actor may give, and memberships an actor may change: owners manage everyone; admins manage
 * the roles below admin only (they can neither create nor touch another admin or an owner). Nobody
 * else manages roles. Changing one's own role is refused separately (no self-escalation or lock-out).
 */
/**
 * Roles an actor may give, and of the people they may manage. Ownership is never given or taken through
 * team actions (role change, bulk, invitation, suspension, removal): only through the transfer, which
 * asks for the owner's password, or the platform's invitation of the first owner. So a session alone
 * cannot add an owner or remove one.
 */
export function grantableRoles(actorRole: OrganizationRole | undefined): readonly OrganizationRole[] {
    if (actorRole === "owner") return ["employee", "viewer", "moderator", "admin"];
    if (actorRole === "admin") return ["employee", "viewer", "moderator"];
    return [];
}

export function canManageMember(actorRole: OrganizationRole | undefined, targetRole: OrganizationRole): boolean {
    return grantableRoles(actorRole).includes(targetRole);
}

export type Organization = typeof schema.organizations.$inferSelect;

/** Where a permission is checked: a workspace (and the worlds it holds), or organization-wide. */
export interface PermissionScope {
    workspaceId: string;
}

export interface SupportGrant {
    id: string;
    reason: string;
    expiresAt: Date;
}

export interface OrganizationAccess {
    organization: Organization;
    /** The account's organization-wide role; undefined during support access. */
    role: OrganizationRole | undefined;
    /** Workspace roles of the account in this organization, by workspace id. */
    workspaceRoles: ReadonlyMap<string, WorkspaceRole>;
    /** Set when the access comes from a platform administrator's support grant. */
    support: SupportGrant | undefined;
    /** Organization-wide permission, or permission on one workspace (and its worlds) when `scope` is given. */
    can: (permission: Permission, scope?: PermissionScope) => boolean;
    /** True when the permission holds organization-wide or in at least one workspace (navigation). */
    canSomewhere: (permission: Permission) => boolean;
}

/** Builds an access from its parts. Pure: the policy itself, unit tested without a database. */
export function buildAccess(input: {
    organization: Organization;
    role: OrganizationRole | undefined;
    workspaceRoles: ReadonlyMap<string, WorkspaceRole>;
    support: SupportGrant | undefined;
}): OrganizationAccess {
    const { role, workspaceRoles, support } = input;
    const organizationWide = (permission: Permission) =>
        support ? SUPPORT_PERMISSIONS.includes(permission) : roleHas(role, permission);
    return {
        ...input,
        can: (permission, scope) =>
            organizationWide(permission) ||
            (scope !== undefined && workspaceRoleHas(workspaceRoles.get(scope.workspaceId), permission)),
        canSomewhere: (permission) =>
            organizationWide(permission) ||
            [...workspaceRoles.values()].some((workspaceRole) => workspaceRoleHas(workspaceRole, permission)),
    };
}

/** The active support grant of an account on an organization, if any. */
export async function activeSupportGrant(accountId: string, organizationId: string): Promise<SupportGrant | undefined> {
    const row = await db()
        .select({
            id: schema.supportAccessGrants.id,
            reason: schema.supportAccessGrants.reason,
            expiresAt: schema.supportAccessGrants.expiresAt,
        })
        .from(schema.supportAccessGrants)
        .where(
            and(
                eq(schema.supportAccessGrants.accountId, accountId),
                eq(schema.supportAccessGrants.organizationId, organizationId),
                isNull(schema.supportAccessGrants.endedAt),
                gt(schema.supportAccessGrants.expiresAt, new Date()),
            ),
        )
        .limit(1);
    return row[0];
}

async function workspaceRolesOf(organizationId: string, accountId: string): Promise<Map<string, WorkspaceRole>> {
    const rows = await db()
        .select({ workspaceId: schema.workspaceMemberships.workspaceId, role: schema.workspaceMemberships.role })
        .from(schema.workspaceMemberships)
        .where(
            and(
                eq(schema.workspaceMemberships.organizationId, organizationId),
                eq(schema.workspaceMemberships.accountId, accountId),
            ),
        );
    return new Map(rows.map((r) => [r.workspaceId, r.role]));
}

/**
 * Loads an organization by slug and the account's rights on it.
 *
 * - The tenant comes from the URL but only selects; the rights come from the account's own membership.
 * - Not a member (or a suspended member): 404, so that organization slugs cannot be enumerated.
 * - A platform administrator who is not a member is sent to the platform page of the organization,
 *   where support access can be requested; with an active grant they get SUPPORT_PERMISSIONS.
 * - A suspended organization is closed to its members (403), not to support access.
 */
export async function organizationAccess(account: Account, organizationSlug: string): Promise<OrganizationAccess> {
    const row = await db()
        .select({
            organization: schema.organizations,
            role: schema.organizationMemberships.role,
            status: schema.organizationMemberships.status,
        })
        .from(schema.organizations)
        .leftJoin(
            schema.organizationMemberships,
            and(
                eq(schema.organizationMemberships.organizationId, schema.organizations.id),
                eq(schema.organizationMemberships.accountId, account.id),
            ),
        )
        .where(eq(schema.organizations.slug, organizationSlug))
        .limit(1)
        .then((rows) => rows[0]);

    if (!row) error(404, "Not found");
    const { organization } = row;

    if (row.role && row.status === "active") {
        if (organization.status === "suspended") error(403, { message: "organizationSuspended" });
        return buildAccess({
            organization,
            role: row.role,
            workspaceRoles: await workspaceRolesOf(organization.id, account.id),
            support: undefined,
        });
    }

    if (account.isSuperadmin) {
        const support = await activeSupportGrant(account.id, organization.id);
        if (!support) redirect(303, `/admin/organizations/${organization.id}`);
        // Every audit entry of this request then names the grant (src/lib/server/audit.ts).
        const context = requestContext();
        if (context) context.supportGrantId = support.id;
        return buildAccess({ organization, role: undefined, workspaceRoles: new Map(), support });
    }

    error(404, "Not found");
}

/** Permissions of an access (organization-wide, or on one workspace), as an object for pages. */
export function permissionMap(access: OrganizationAccess, scope?: PermissionScope): Record<Permission, boolean> {
    return Object.fromEntries(
        (Object.keys(PERMISSIONS) as Permission[]).map((p) => [p, access.can(p, scope)]),
    ) as Record<Permission, boolean>;
}

/** Permissions held organization-wide or in at least one workspace (for navigation). */
export function somewherePermissionMap(access: OrganizationAccess): Record<Permission, boolean> {
    return Object.fromEntries(
        (Object.keys(PERMISSIONS) as Permission[]).map((p) => [p, access.canSomewhere(p)]),
    ) as Record<Permission, boolean>;
}

export function requirePermission(access: OrganizationAccess, permission: Permission, scope?: PermissionScope): void {
    if (!access.can(permission, scope)) {
        error(403, "Forbidden");
    }
}

export function requireSuperadmin(account: Account): void {
    if (!account.isSuperadmin) {
        error(403, "Forbidden");
    }
}
