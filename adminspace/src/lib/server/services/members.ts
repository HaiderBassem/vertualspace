/**
 * Members of a world, as WorkAdventure sees them.
 *
 * WorkAdventure identifies a person by a "userIdentifier": the email for people logged in through
 * OpenID Connect, a random UUID for anonymous people. A member row is matched on its uuid or email.
 * People who enter a world without having been added are recorded as guests, so they can be found,
 * tagged, reported and banned like anybody else.
 */
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { MemberData } from "../../contract/workadventure";
import type { WorldChatMembersData } from "../../contract/adminApi";
import { httpUrlOrUndefined } from "../http/forms";
import { TAG_NAME_PATTERN } from "./tags";

export type Member = typeof schema.members.$inferSelect;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(identifier: string): boolean {
    return EMAIL_PATTERN.test(identifier);
}

export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function identifierCondition(worldId: string, identifier: string) {
    return and(
        eq(schema.members.worldId, worldId),
        or(eq(schema.members.uuid, identifier), sql`lower(${schema.members.email}) = lower(${identifier})`),
    );
}

export function findMember(worldId: string, identifier: string): Promise<Member | undefined> {
    if (!identifier) return Promise.resolve(undefined);
    return db().query.members.findFirst({ where: identifierCondition(worldId, identifier) });
}

/**
 * Records a visit: updates the member, or creates a guest. Visitors without identifier are not
 * recorded. Returns the member row, and whether this is the person's first visit to the world (exactly once,
 * even with concurrent requests: the row's creator, or the update that brings the visit count to 1).
 */
export async function recordVisit(
    worldId: string,
    identifier: string,
    data: { locale?: string; chatId?: string; characterTextureIds?: string[]; companionTextureId?: string },
): Promise<(Member & { firstVisit: boolean }) | undefined> {
    if (!identifier) return undefined;
    const now = new Date();
    const existing = await findMember(worldId, identifier);
    if (existing) {
        const [updated] = await db()
            .update(schema.members)
            .set({
                lastSeenAt: now,
                visitCount: sql`${schema.members.visitCount} + 1`,
                ...(data.locale ? { locale: data.locale } : {}),
                ...(data.chatId ? { chatId: data.chatId } : {}),
            })
            .where(eq(schema.members.id, existing.id))
            .returning();
        return updated ? { ...updated, firstVisit: updated.visitCount === 1 } : { ...existing, firstVisit: false };
    }
    const [created] = await db()
        .insert(schema.members)
        .values({
            worldId,
            uuid: identifier,
            kind: "guest",
            email: looksLikeEmail(identifier) ? identifier : null,
            locale: data.locale ?? null,
            chatId: data.chatId ?? null,
            characterTextureIds: data.characterTextureIds ?? [],
            companionTextureId: data.companionTextureId ?? null,
            lastSeenAt: now,
            visitCount: 1,
        })
        .onConflictDoNothing()
        .returning();
    if (created) return { ...created, firstVisit: true };
    const found = await findMember(worldId, identifier);
    return found ? { ...found, firstVisit: false } : undefined;
}

export async function memberTagNames(memberId: string): Promise<string[]> {
    const rows = await db()
        .select({ name: schema.tags.name })
        .from(schema.memberTags)
        .innerJoin(schema.tags, eq(schema.tags.id, schema.memberTags.tagId))
        .where(eq(schema.memberTags.memberId, memberId))
        .orderBy(asc(schema.tags.name));
    return rows.map((r) => r.name);
}

export async function tagNamesByMember(memberIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (memberIds.length === 0) return result;
    const rows = await db()
        .select({ memberId: schema.memberTags.memberId, name: schema.tags.name })
        .from(schema.memberTags)
        .innerJoin(schema.tags, eq(schema.tags.id, schema.memberTags.tagId))
        .where(inArray(schema.memberTags.memberId, memberIds))
        .orderBy(asc(schema.tags.name));
    for (const row of rows) {
        const list = result.get(row.memberId) ?? [];
        list.push(row.name);
        result.set(row.memberId, list);
    }
    return result;
}

/** Replaces the tags of a member. Unknown tag names are created. */
/** Trims, de-duplicates and keeps only valid tag names (TAG_NAME_PATTERN, at most 64 characters). */
export function normalizeTagNames(names: string[]): string[] {
    return [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 0 && TAG_NAME_PATTERN.test(n)))];
}

/**
 * Replaces the tags of a member. Invalid names are ignored. Unknown tag names are created unless
 * `createMissing` is false (callers without the tag.manage permission), in which case they are ignored.
 */
export async function setMemberTags(
    worldId: string,
    memberId: string,
    names: string[],
    options: { createMissing?: boolean } = {},
): Promise<void> {
    const wanted = normalizeTagNames(names);
    const createMissing = options.createMissing ?? true;
    await db().transaction(async (tx) => {
        if (wanted.length > 0 && createMissing) {
            await tx
                .insert(schema.tags)
                .values(wanted.map((name) => ({ worldId, name })))
                .onConflictDoNothing();
        }
        const tags =
            wanted.length > 0
                ? await tx.query.tags.findMany({
                      where: and(eq(schema.tags.worldId, worldId), inArray(schema.tags.name, wanted)),
                  })
                : [];
        await tx.delete(schema.memberTags).where(eq(schema.memberTags.memberId, memberId));
        if (tags.length > 0) {
            await tx.insert(schema.memberTags).values(tags.map((t) => ({ memberId, tagId: t.id })));
        }
    });
}

export async function worldTagNames(worldId: string, search = ""): Promise<string[]> {
    const rows = await db()
        .select({ name: schema.tags.name })
        .from(schema.tags)
        .where(
            and(
                eq(schema.tags.worldId, worldId),
                search ? ilike(schema.tags.name, `%${escapeLike(search)}%`) : undefined,
            ),
        )
        .orderBy(asc(schema.tags.name))
        .limit(search ? 50 : 1000);
    return rows.map((r) => r.name);
}

function searchCondition(search: string) {
    const pattern = `%${escapeLike(search)}%`;
    return or(
        ilike(schema.members.name, pattern),
        ilike(schema.members.email, pattern),
        ilike(schema.members.uuid, pattern),
    );
}

export function toMemberData(member: Member): MemberData {
    return {
        id: member.uuid,
        name: member.name,
        email: member.email,
        // Only http(s): WorkAdventure loads the visit card in an iframe (no javascript:/data: URLs).
        visitCardUrl: httpUrlOrUndefined(member.visitCardUrl) ?? null,
        chatID: member.chatId,
    };
}

/** Member search used by WorkAdventure (GET /api/members). */
export function searchMembers(worldId: string, search: string, limit = 20): Promise<Member[]> {
    return db().query.members.findMany({
        where: and(eq(schema.members.worldId, worldId), search ? searchCondition(search) : undefined),
        orderBy: [desc(schema.members.lastSeenAt)],
        limit,
    });
}

/** Members listed in WorkAdventure's chat (GET /api/chat/members). */
export async function chatMembers(worldId: string, search: string, limit = 100): Promise<WorldChatMembersData> {
    const where = and(eq(schema.members.worldId, worldId), search ? searchCondition(search) : undefined);
    const [rows, totalRow] = await Promise.all([
        db().query.members.findMany({ where, orderBy: [asc(schema.members.name)], limit }),
        db().select({ value: count() }).from(schema.members).where(where),
    ]);
    const tags = await tagNamesByMember(rows.map((r) => r.id));
    return {
        total: totalRow[0]?.value ?? 0,
        members: rows.map((m) => ({
            uuid: m.uuid,
            wokaName: m.name ?? undefined,
            email: m.email,
            chatId: m.chatId ?? undefined,
            tags: tags.get(m.id) ?? [],
        })),
    };
}

export async function updateMember(
    worldId: string,
    identifier: string,
    fields: Partial<Pick<Member, "name" | "characterTextureIds" | "companionTextureId" | "chatId" | "visitCardUrl">>,
): Promise<boolean> {
    const member = await findMember(worldId, identifier);
    if (!member) return false;
    await db().update(schema.members).set(fields).where(eq(schema.members.id, member.id));
    return true;
}
