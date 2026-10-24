/** Tags of a world, managed from the back office. Renaming keeps memberships (they reference the tag id). */
import { and, asc, count, eq, ne } from "drizzle-orm";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";

export type Tag = typeof schema.tags.$inferSelect;

/** Tags travel comma-separated in WorkAdventure URLs (/api/room/sameWorld): no comma allowed. */
export const TAG_NAME_PATTERN = /^[^,\s](?:[^,]{0,62}[^,\s])?$/;

/** Tags WorkAdventure gives a meaning to. */
export const BUILT_IN_TAGS = ["admin", "editor"];

export interface TagWithCount extends Tag {
    memberCount: number;
}

export async function listTagsWithCounts(worldId: string): Promise<TagWithCount[]> {
    const [tags, counts] = await Promise.all([
        db().query.tags.findMany({ where: eq(schema.tags.worldId, worldId), orderBy: asc(schema.tags.name) }),
        db()
            .select({ tagId: schema.memberTags.tagId, value: count() })
            .from(schema.memberTags)
            .innerJoin(schema.tags, eq(schema.tags.id, schema.memberTags.tagId))
            .where(eq(schema.tags.worldId, worldId))
            .groupBy(schema.memberTags.tagId),
    ]);
    const byId = new Map(counts.map((c) => [c.tagId, c.value]));
    return tags.map((t) => ({ ...t, memberCount: byId.get(t.id) ?? 0 }));
}

export interface TagInput {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
}

async function nameTaken(worldId: string, name: string, exceptId?: string): Promise<boolean> {
    const existing = await db().query.tags.findFirst({
        where: and(
            eq(schema.tags.worldId, worldId),
            eq(schema.tags.name, name),
            exceptId ? ne(schema.tags.id, exceptId) : undefined,
        ),
    });
    return existing !== undefined;
}

export async function createTag(worldId: string, input: TagInput): Promise<Tag | "nameTaken"> {
    if (await nameTaken(worldId, input.name)) return "nameTaken";
    const [tag] = await db()
        .insert(schema.tags)
        .values({ worldId, name: input.name, description: input.description ?? null, color: input.color ?? null })
        .onConflictDoNothing()
        .returning();
    return tag ?? "nameTaken";
}

export async function updateTag(
    worldId: string,
    tagId: string,
    input: TagInput,
): Promise<{ before: Tag; after: Tag } | "notFound" | "nameTaken"> {
    if (!isUuid(tagId)) return "notFound";
    const before = await db().query.tags.findFirst({
        where: and(eq(schema.tags.worldId, worldId), eq(schema.tags.id, tagId)),
    });
    if (!before) return "notFound";
    if (await nameTaken(worldId, input.name, tagId)) return "nameTaken";
    const [after] = await db()
        .update(schema.tags)
        .set({ name: input.name, description: input.description ?? null, color: input.color ?? null })
        .where(eq(schema.tags.id, tagId))
        .returning();
    return after ? { before, after } : "notFound";
}

export async function deleteTag(worldId: string, tagId: string): Promise<Tag | undefined> {
    if (!isUuid(tagId)) return undefined;
    const [deleted] = await db()
        .delete(schema.tags)
        .where(and(eq(schema.tags.worldId, worldId), eq(schema.tags.id, tagId)))
        .returning();
    return deleted;
}
