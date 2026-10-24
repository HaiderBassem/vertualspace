/**
 * Workspaces: AdminSpace-only groupings of an organization's worlds (a department, a site), the unit
 * of delegated administration (workspace managers) and of employee access (workspace members).
 *
 * Every query takes the organization id and filters on it: a workspace id coming from a form is never
 * trusted on its own. The composite foreign keys (organization_id, workspace_id) of worlds and
 * assignments enforce the same rule in the database.
 */
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { DEFAULT_LOCALE, isLocale, messagesFor } from "../../i18n";
import type { WorkspaceRole } from "../auth/rbac";
import { isForeignKeyViolation, isUniqueViolation } from "../db/errors";

export type Workspace = typeof schema.workspaces.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const DEFAULT_WORKSPACE_SLUG = "main";
/** Slugs that would collide with back-office routes under /o/{org}/workspaces/. */
export const RESERVED_WORKSPACE_SLUGS = new Set(["new"]);

/** Name of the workspace every new organization starts with, in the organization's language. */
export function defaultWorkspaceName(locale: string): string {
    return messagesFor(isLocale(locale) ? locale : DEFAULT_LOCALE).workspaces.defaultName;
}

/** Inserts the first workspace of a new organization (inside the organization's creation transaction). */
export async function insertDefaultWorkspace(
    tx: Transaction,
    organizationId: string,
    locale: string,
): Promise<Workspace> {
    const [workspace] = await tx
        .insert(schema.workspaces)
        .values({ organizationId, slug: DEFAULT_WORKSPACE_SLUG, name: defaultWorkspaceName(locale) })
        .returning();
    if (!workspace) throw new Error("Workspace creation returned no row");
    return workspace;
}

export interface WorkspaceSummary extends Workspace {
    worldCount: number;
    memberCount: number;
}

/** Workspaces of an organization with their world and people counts, in display order. */
export async function listWorkspaces(
    organizationId: string,
    options: { includeArchived?: boolean; onlyIds?: string[] } = {},
): Promise<WorkspaceSummary[]> {
    if (options.onlyIds && options.onlyIds.length === 0) return [];
    const rows = await db()
        .select()
        .from(schema.workspaces)
        .where(
            and(
                eq(schema.workspaces.organizationId, organizationId),
                options.includeArchived ? undefined : isNull(schema.workspaces.archivedAt),
                options.onlyIds ? inArray(schema.workspaces.id, options.onlyIds) : undefined,
            ),
        )
        .orderBy(asc(schema.workspaces.position), asc(schema.workspaces.name));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [worldCounts, memberCounts] = await Promise.all([
        db()
            .select({ workspaceId: schema.worlds.workspaceId, value: count() })
            .from(schema.worlds)
            .where(and(eq(schema.worlds.organizationId, organizationId), inArray(schema.worlds.workspaceId, ids)))
            .groupBy(schema.worlds.workspaceId),
        db()
            .select({ workspaceId: schema.workspaceMemberships.workspaceId, value: count() })
            .from(schema.workspaceMemberships)
            .where(
                and(
                    eq(schema.workspaceMemberships.organizationId, organizationId),
                    inArray(schema.workspaceMemberships.workspaceId, ids),
                ),
            )
            .groupBy(schema.workspaceMemberships.workspaceId),
    ]);
    const worlds = new Map(worldCounts.map((r) => [r.workspaceId, r.value]));
    const members = new Map(memberCounts.map((r) => [r.workspaceId, r.value]));
    return rows.map((r) => ({ ...r, worldCount: worlds.get(r.id) ?? 0, memberCount: members.get(r.id) ?? 0 }));
}

export function findWorkspace(organizationId: string, slug: string): Promise<Workspace | undefined> {
    return db().query.workspaces.findFirst({
        where: and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.slug, slug)),
    });
}

export function findWorkspaceById(organizationId: string, id: string): Promise<Workspace | undefined> {
    return db().query.workspaces.findFirst({
        where: and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, id)),
    });
}

/** The workspace new worlds go to when none is chosen: the first active one. */
export async function firstActiveWorkspace(organizationId: string): Promise<Workspace | undefined> {
    return db().query.workspaces.findFirst({
        where: and(eq(schema.workspaces.organizationId, organizationId), isNull(schema.workspaces.archivedAt)),
        orderBy: [asc(schema.workspaces.position), asc(schema.workspaces.createdAt)],
    });
}

export interface WorkspaceInput {
    name: string;
    slug: string;
    description: string | null;
}

export async function createWorkspace(organizationId: string, input: WorkspaceInput): Promise<Workspace | "slugTaken"> {
    if (RESERVED_WORKSPACE_SLUGS.has(input.slug)) return "slugTaken";
    try {
        const [workspace] = await db()
            .insert(schema.workspaces)
            .values({
                organizationId,
                ...input,
                position: sql`(select coalesce(max(position), -1) + 1 from workspaces where organization_id = ${organizationId})`,
            })
            .returning();
        if (!workspace) throw new Error("Workspace creation returned no row");
        return workspace;
    } catch (error) {
        if (isUniqueViolation(error)) return "slugTaken";
        throw error;
    }
}

export async function updateWorkspace(
    organizationId: string,
    workspaceId: string,
    input: Omit<WorkspaceInput, "slug">,
): Promise<boolean> {
    const rows = await db()
        .update(schema.workspaces)
        .set(input)
        .where(and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, workspaceId)))
        .returning({ id: schema.workspaces.id });
    return rows.length > 0;
}

export type ArchiveResult = { result: "ok"; worlds: number } | { result: "notFound" | "lastActive" };

/**
 * Archives a workspace and every active world in it, with one shared timestamp so that restoring the
 * workspace restores exactly those worlds (worlds archived earlier on their own stay archived).
 * The last active workspace cannot be archived: new worlds need somewhere to go.
 */
export async function archiveWorkspace(organizationId: string, workspaceId: string): Promise<ArchiveResult> {
    return db().transaction(async (tx) => {
        const active = await tx
            .select({ id: schema.workspaces.id })
            .from(schema.workspaces)
            .where(and(eq(schema.workspaces.organizationId, organizationId), isNull(schema.workspaces.archivedAt)))
            .for("update");
        if (!active.some((w) => w.id === workspaceId)) return { result: "notFound" };
        if (active.length <= 1) return { result: "lastActive" };
        const now = new Date();
        await tx
            .update(schema.workspaces)
            .set({ archivedAt: now })
            .where(and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, workspaceId)));
        const worlds = await tx
            .update(schema.worlds)
            .set({ archivedAt: now })
            .where(
                and(
                    eq(schema.worlds.organizationId, organizationId),
                    eq(schema.worlds.workspaceId, workspaceId),
                    isNull(schema.worlds.archivedAt),
                ),
            )
            .returning({ id: schema.worlds.id });
        return { result: "ok", worlds: worlds.length };
    });
}

export async function restoreWorkspace(
    organizationId: string,
    workspaceId: string,
): Promise<{ result: "ok"; worlds: number } | { result: "notFound" }> {
    return db().transaction(async (tx) => {
        const [workspace] = await tx
            .select()
            .from(schema.workspaces)
            .where(and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, workspaceId)))
            .for("update");
        if (!workspace?.archivedAt) return { result: "notFound" };
        const worlds = await tx
            .update(schema.worlds)
            .set({ archivedAt: null })
            .where(
                and(
                    eq(schema.worlds.organizationId, organizationId),
                    eq(schema.worlds.workspaceId, workspaceId),
                    eq(schema.worlds.archivedAt, workspace.archivedAt),
                ),
            )
            .returning({ id: schema.worlds.id });
        await tx.update(schema.workspaces).set({ archivedAt: null }).where(eq(schema.workspaces.id, workspaceId));
        return { result: "ok", worlds: worlds.length };
    });
}

/** Deletes an empty workspace. Worlds must be moved or deleted first (the foreign key refuses it anyway). */
export async function deleteWorkspace(
    organizationId: string,
    workspaceId: string,
): Promise<"ok" | "notFound" | "notEmpty" | "lastWorkspace"> {
    return db().transaction(async (tx) => {
        const all = await tx
            .select({ id: schema.workspaces.id })
            .from(schema.workspaces)
            .where(eq(schema.workspaces.organizationId, organizationId))
            .for("update");
        if (!all.some((w) => w.id === workspaceId)) return "notFound";
        if (all.length <= 1) return "lastWorkspace";
        const [worlds] = await tx
            .select({ value: count() })
            .from(schema.worlds)
            .where(and(eq(schema.worlds.organizationId, organizationId), eq(schema.worlds.workspaceId, workspaceId)));
        if ((worlds?.value ?? 0) > 0) return "notEmpty";
        await tx
            .delete(schema.workspaces)
            .where(and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, workspaceId)));
        return "ok";
    });
}

/** Moves a world to another workspace of the same organization. Its WorkAdventure URL does not change. */
export async function moveWorld(
    organizationId: string,
    worldId: string,
    workspaceId: string,
): Promise<"ok" | "notFound"> {
    const target = await findWorkspaceById(organizationId, workspaceId);
    if (!target) return "notFound";
    const rows = await db()
        .update(schema.worlds)
        .set({ workspaceId: target.id })
        .where(and(eq(schema.worlds.organizationId, organizationId), eq(schema.worlds.id, worldId)))
        .returning({ id: schema.worlds.id });
    return rows.length > 0 ? "ok" : "notFound";
}

// ---------------------------------------------------------------------------------------------
// Workspace roles
// ---------------------------------------------------------------------------------------------

export interface WorkspacePerson {
    accountId: string;
    name: string;
    email: string;
    role: WorkspaceRole;
    organizationRole: (typeof schema.organizationRole.enumValues)[number];
    suspended: boolean;
}

export function listWorkspacePeople(organizationId: string, workspaceId: string): Promise<WorkspacePerson[]> {
    return db()
        .select({
            accountId: schema.accounts.id,
            name: schema.accounts.name,
            email: schema.accounts.email,
            role: schema.workspaceMemberships.role,
            organizationRole: schema.organizationMemberships.role,
            suspended: sql<boolean>`${schema.organizationMemberships.status} = 'suspended'`,
        })
        .from(schema.workspaceMemberships)
        .innerJoin(schema.accounts, eq(schema.accounts.id, schema.workspaceMemberships.accountId))
        .innerJoin(
            schema.organizationMemberships,
            and(
                eq(schema.organizationMemberships.organizationId, schema.workspaceMemberships.organizationId),
                eq(schema.organizationMemberships.accountId, schema.workspaceMemberships.accountId),
            ),
        )
        .where(
            and(
                eq(schema.workspaceMemberships.organizationId, organizationId),
                eq(schema.workspaceMemberships.workspaceId, workspaceId),
            ),
        )
        .orderBy(asc(schema.workspaceMemberships.role), asc(schema.accounts.name));
}

/**
 * Gives (or changes) the workspace role of a person of the organization, or removes it with `null`.
 * "notMember" when the account is not a member of the organization (enforced by a foreign key).
 */
export async function setWorkspaceRole(
    organizationId: string,
    workspaceId: string,
    accountId: string,
    role: WorkspaceRole | null,
    actorId: string | null,
    tx: Transaction | Database = db(),
): Promise<"ok" | "notMember" | "notFound"> {
    const workspace = await tx
        .select({ id: schema.workspaces.id })
        .from(schema.workspaces)
        .where(and(eq(schema.workspaces.organizationId, organizationId), eq(schema.workspaces.id, workspaceId)))
        .limit(1);
    if (workspace.length === 0) return "notFound";
    if (role === null) {
        await tx
            .delete(schema.workspaceMemberships)
            .where(
                and(
                    eq(schema.workspaceMemberships.organizationId, organizationId),
                    eq(schema.workspaceMemberships.workspaceId, workspaceId),
                    eq(schema.workspaceMemberships.accountId, accountId),
                ),
            );
        return "ok";
    }
    try {
        await tx
            .insert(schema.workspaceMemberships)
            .values({ organizationId, workspaceId, accountId, role, createdBy: actorId })
            .onConflictDoUpdate({
                target: [schema.workspaceMemberships.workspaceId, schema.workspaceMemberships.accountId],
                set: { role },
            });
        return "ok";
    } catch (error) {
        if (isForeignKeyViolation(error)) return "notMember";
        throw error;
    }
}

/** Workspace roles of several people, by account id (for the team page). */
export async function workspaceRolesByAccount(
    organizationId: string,
    accountIds: string[],
): Promise<Map<string, { workspaceId: string; role: WorkspaceRole }[]>> {
    const result = new Map<string, { workspaceId: string; role: WorkspaceRole }[]>();
    if (accountIds.length === 0) return result;
    const rows = await db()
        .select({
            accountId: schema.workspaceMemberships.accountId,
            workspaceId: schema.workspaceMemberships.workspaceId,
            role: schema.workspaceMemberships.role,
        })
        .from(schema.workspaceMemberships)
        .where(
            and(
                eq(schema.workspaceMemberships.organizationId, organizationId),
                inArray(schema.workspaceMemberships.accountId, accountIds),
            ),
        );
    for (const row of rows) {
        const list = result.get(row.accountId) ?? [];
        list.push({ workspaceId: row.workspaceId, role: row.role });
        result.set(row.accountId, list);
    }
    return result;
}
