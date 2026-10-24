import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { parsePlayUri, type ParsedPlayUri } from "../workadventure/playUri";
import type { Account } from "../auth/session";
import { roleHas, type OrganizationRole } from "../auth/rbac";

export type Organization = typeof schema.organizations.$inferSelect;
export type World = typeof schema.worlds.$inferSelect;
export type Room = typeof schema.rooms.$inferSelect;

export interface WorldContext {
    organization: Organization;
    world: World;
}

export async function findWorld(organizationSlug: string, worldSlug: string): Promise<WorldContext | undefined> {
    const row = await db()
        .select({ organization: schema.organizations, world: schema.worlds })
        .from(schema.worlds)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(and(eq(schema.organizations.slug, organizationSlug), eq(schema.worlds.slug, worldSlug)))
        .limit(1);
    return row[0];
}

export async function findWorldById(worldId: string): Promise<WorldContext | undefined> {
    const row = await db()
        .select({ organization: schema.organizations, world: schema.worlds })
        .from(schema.worlds)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(eq(schema.worlds.id, worldId))
        .limit(1);
    return row[0];
}

export function listRooms(worldId: string): Promise<Room[]> {
    return db().query.rooms.findMany({
        where: eq(schema.rooms.worldId, worldId),
        orderBy: [desc(schema.rooms.isDefault), asc(schema.rooms.position), asc(schema.rooms.name)],
    });
}

export function findRoom(worldId: string, roomSlug: string): Promise<Room | undefined> {
    return db().query.rooms.findFirst({
        where: and(eq(schema.rooms.worldId, worldId), eq(schema.rooms.slug, roomSlug)),
    });
}

/** The room people land in when the URL names the world only: the default room, else the first one. */
export async function findEntryRoom(worldId: string): Promise<Room | undefined> {
    const rooms = await listRooms(worldId);
    return rooms[0];
}

export type WorldState = "open" | "archived" | "expired";

export function worldState(world: World, now = new Date()): WorldState {
    if (world.archivedAt) return "archived";
    if (world.expiresAt && world.expiresAt <= now) return "expired";
    return "open";
}

type WorldUri = Extract<ParsedPlayUri, { kind: "world" }>;

export type ResolvedPlayUri =
    | { kind: "room"; parsed: WorldUri; context: WorldContext; room: Room }
    | { kind: "worldWithoutRoom"; parsed: WorldUri; context: WorldContext }
    | { kind: "roomNotFound"; parsed: WorldUri; context: WorldContext }
    | { kind: "worldNotFound"; parsed: WorldUri }
    | { kind: "other"; parsed: Exclude<ParsedPlayUri, { kind: "world" }> };

/** Resolves a WorkAdventure play URL (or path) to the world and room it designates. */
export async function resolvePlayUri(playUri: string): Promise<ResolvedPlayUri> {
    const parsed = parsePlayUri(playUri);
    if (parsed.kind !== "world") {
        return { kind: "other", parsed };
    }
    const context = await findWorld(parsed.organizationSlug, parsed.worldSlug);
    if (!context) {
        return { kind: "worldNotFound", parsed };
    }
    if (parsed.roomSlug === undefined) {
        return { kind: "worldWithoutRoom", parsed, context };
    }
    const room = await findRoom(context.world.id, parsed.roomSlug);
    if (!room) {
        return { kind: "roomNotFound", parsed, context };
    }
    return { kind: "room", parsed, context, room };
}

/** Resolves only the world of a play URL, whatever the room. */
export async function resolveWorldOfPlayUri(playUri: string): Promise<WorldContext | undefined> {
    const parsed = parsePlayUri(playUri);
    if (parsed.kind !== "world") return undefined;
    return findWorld(parsed.organizationSlug, parsed.worldSlug);
}

export interface AccessibleWorld {
    organization: Organization;
    world: World;
    role: OrganizationRole | undefined;
    roomCount: number;
    memberCount: number;
}

/**
 * Worlds an account administers: in its organizations (active memberships), every world for organization
 * staff, the worlds of their own workspaces for workspace managers. Platform administrators are no
 * exception: they reach other organizations through support access only.
 */
export async function listAccessibleWorlds(account: Account): Promise<AccessibleWorld[]> {
    const memberships = await db().query.organizationMemberships.findMany({
        where: and(
            eq(schema.organizationMemberships.accountId, account.id),
            eq(schema.organizationMemberships.status, "active"),
        ),
    });
    if (memberships.length === 0) return [];
    const roleByOrganization = new Map(memberships.map((m) => [m.organizationId, m.role]));
    const workspaceRoles = await db()
        .select({ workspaceId: schema.workspaceMemberships.workspaceId, role: schema.workspaceMemberships.role })
        .from(schema.workspaceMemberships)
        .where(eq(schema.workspaceMemberships.accountId, account.id));
    const managed = new Set(workspaceRoles.filter((w) => w.role === "manager").map((w) => w.workspaceId));

    const rows = (
        await db()
            .select({ organization: schema.organizations, world: schema.worlds })
            .from(schema.worlds)
            .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
            .where(
                and(
                    inArray(schema.worlds.organizationId, [...roleByOrganization.keys()]),
                    eq(schema.organizations.status, "active"),
                ),
            )
            .orderBy(asc(schema.organizations.name), asc(schema.worlds.name))
    ).filter(
        ({ world }) =>
            roleHas(roleByOrganization.get(world.organizationId), "world.read") || managed.has(world.workspaceId),
    );
    if (rows.length === 0) return [];

    const worldIds = rows.map((r) => r.world.id);
    const [roomCounts, memberCounts] = await Promise.all([
        db()
            .select({ worldId: schema.rooms.worldId, value: count() })
            .from(schema.rooms)
            .where(inArray(schema.rooms.worldId, worldIds))
            .groupBy(schema.rooms.worldId),
        db()
            .select({ worldId: schema.members.worldId, value: count() })
            .from(schema.members)
            .where(and(inArray(schema.members.worldId, worldIds), eq(schema.members.kind, "member")))
            .groupBy(schema.members.worldId),
    ]);
    const rooms = new Map(roomCounts.map((r) => [r.worldId, r.value]));
    const members = new Map(memberCounts.map((r) => [r.worldId, r.value]));

    return rows.map(({ organization, world }) => ({
        organization,
        world,
        role: roleByOrganization.get(organization.id),
        roomCount: rooms.get(world.id) ?? 0,
        memberCount: members.get(world.id) ?? 0,
    }));
}

/** Worlds of an organization, without archived ones unless asked. */
export function listOrganizationWorlds(organizationId: string, includeArchived = false): Promise<World[]> {
    return db().query.worlds.findMany({
        where: includeArchived
            ? eq(schema.worlds.organizationId, organizationId)
            : and(eq(schema.worlds.organizationId, organizationId), isNull(schema.worlds.archivedAt)),
        orderBy: asc(schema.worlds.name),
    });
}
