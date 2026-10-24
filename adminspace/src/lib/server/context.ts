/**
 * Loading helpers for back-office pages and actions: the policy enforcement points of
 * src/lib/server/auth/rbac.ts. Actions must call them too: SvelteKit does not run layout loads before
 * form actions, so every action re-checks access itself.
 */
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db/client";
import {
    organizationAccess,
    permissionMap,
    requirePermission,
    somewherePermissionMap,
    type OrganizationAccess,
    type Permission,
    type PermissionScope,
} from "./auth/rbac";
import type { Account } from "./auth/session";
import { getInstanceSettings } from "./services/instance";
import { buildWorldUrl } from "./workadventure/playUri";
import type { World } from "./services/worlds";

export function requireAccount(locals: App.Locals): Account {
    if (!locals.account) error(401, "Unauthorized");
    return locals.account;
}

/**
 * The account of a fully authenticated session (second factor verified when enabled), for public pages
 * such as /invite, which the hook lets through without its second-factor guard.
 */
export function fullyAuthenticated(locals: App.Locals): Account | undefined {
    const { account, session } = locals;
    if (!account || !session) return undefined;
    if (account.totpEnabledAt && !session.mfaVerified) return undefined;
    return account;
}

export interface OrganizationPageContext {
    account: Account;
    access: OrganizationAccess;
}

export async function loadOrganization(
    locals: App.Locals,
    organizationSlug: string,
    permission: Permission = "organization.read",
): Promise<OrganizationPageContext> {
    const account = requireAccount(locals);
    const access = await organizationAccess(account, organizationSlug);
    requirePermission(access, permission);
    return { account, access };
}

export interface WorldPageContext extends OrganizationPageContext {
    world: World;
    /** The workspace of the world: every permission of a world page is checked in it. */
    scope: PermissionScope;
    /** Public URL of the world in WorkAdventure, e.g. https://play.example.com/@/acme/hq/ */
    worldUrl: string | undefined;
    /** The same access, not bound to the world's workspace: for decisions above the workspace. */
    organizationWide: OrganizationAccess;
}

/**
 * Loads a world of an organization and checks `permission` on it, in the scope of its workspace (so
 * that workspace managers administer their own worlds only). The returned `access.can` is bound to
 * that scope by default. A person who may not even read the world gets 404 (no existence oracle).
 */
export async function loadWorld(
    locals: App.Locals,
    organizationSlug: string,
    worldSlug: string,
    permission: Permission = "world.read",
): Promise<WorldPageContext> {
    const account = requireAccount(locals);
    const organizationWide = await organizationAccess(account, organizationSlug);
    const world = await db().query.worlds.findFirst({
        where: and(
            eq(schema.worlds.organizationId, organizationWide.organization.id),
            eq(schema.worlds.slug, worldSlug),
        ),
    });
    if (!world) error(404, "Not found");
    const scope: PermissionScope = { workspaceId: world.workspaceId };
    if (!organizationWide.can("world.read", scope)) error(404, "Not found");
    requirePermission(organizationWide, permission, scope);
    const access: OrganizationAccess = {
        ...organizationWide,
        can: (p, s = scope) => organizationWide.can(p, s),
    };
    const { playUrl } = await getInstanceSettings();
    const worldUrl = playUrl ? buildWorldUrl(new URL(playUrl).origin, access.organization.slug, world.slug) : undefined;
    return { account, access, world, scope, worldUrl, organizationWide };
}

/** What organization layouts send to pages: the organization, the role and the permissions. */
export function organizationPageData(access: OrganizationAccess, scope?: PermissionScope) {
    return {
        organization: {
            id: access.organization.id,
            slug: access.organization.slug,
            name: access.organization.name,
            countryCode: access.organization.countryCode,
            defaultLocale: access.organization.defaultLocale,
            contactEmail: access.organization.contactEmail,
            logoUrl: access.organization.logoUrl,
            brandColor: access.organization.brandColor,
        },
        role: access.role ?? null,
        /** Permissions organization-wide, or in `scope` (world pages). */
        can: permissionMap(access, scope),
        /** Permissions held organization-wide or in at least one workspace (navigation). */
        canSomewhere: somewherePermissionMap(access),
        workspaceRoles: Object.fromEntries(access.workspaceRoles),
        support: access.support
            ? { reason: access.support.reason, expiresAt: access.support.expiresAt.toISOString() }
            : null,
    };
}
