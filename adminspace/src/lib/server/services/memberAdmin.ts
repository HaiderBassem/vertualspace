/**
 * Member management from the back office: listing, creation, edition, GDPR export and erasure, CSV
 * import and export. WorkAdventure-facing member logic lives in members.ts.
 *
 * Tags carrying rights inside WorkAdventure ("admin", "editor", the world's map-editor and recording
 * tags) can only be granted or removed by people allowed to manage tags (tag.manage); others cannot
 * create new tags either. See checkTagChange().
 */
import {
    and,
    count,
    desc,
    eq,
    exists,
    gt,
    ilike,
    inArray,
    isNotNull,
    isNull,
    lte,
    or,
    sql,
    type SQL,
} from "drizzle-orm";
import { db, schema } from "../db/client";
import { pseudonymize } from "../crypto";
import { isUuid } from "../http/forms";
import { privilegedTags, readWorldSettings } from "../../settings/worldSettings";
import { escapeLike, findMember, normalizeTagNames, setMemberTags, tagNamesByMember, type Member } from "./members";
import { TAG_NAME_PATTERN } from "./tags";
import type { ImportErrorCode, ImportRow } from "./csv";
import type { World } from "./worlds";
import type { ProfileInput } from "../../profiles/model";
import { deleteOrphanProfile, importProfiles, profilesForWorld } from "./memberProfiles";

export type MemberKind = (typeof schema.memberKind.enumValues)[number];

export interface MemberListFilters {
    search: string;
    kind: MemberKind | undefined;
    tag: string | undefined;
    /** Department of the person's employee profile in the organization (exact match). */
    department?: string | undefined;
    page: number;
    pageSize: number;
}

export interface MemberRow extends Member {
    tags: string[];
    /** Employee profile in the organization (job title, department...), null when the person has none. */
    profile: ProfileInput | null;
}

function listCondition(worldId: string, filters: Omit<MemberListFilters, "page" | "pageSize">): SQL | undefined {
    const conditions: (SQL | undefined)[] = [eq(schema.members.worldId, worldId)];
    if (filters.search) {
        const pattern = `%${escapeLike(filters.search)}%`;
        conditions.push(
            or(
                ilike(schema.members.name, pattern),
                ilike(schema.members.email, pattern),
                ilike(schema.members.uuid, pattern),
            ),
        );
    }
    if (filters.kind) conditions.push(eq(schema.members.kind, filters.kind));
    if (filters.department) {
        conditions.push(sql`exists (
            select 1 from ${schema.memberProfiles} p
            join ${schema.worlds} w on w.organization_id = p.organization_id
            where w.id = ${worldId} and p.email = lower(${schema.members.email}) and p.department = ${filters.department})`);
    }
    if (filters.tag) {
        conditions.push(
            exists(
                db()
                    .select({ one: sql`1` })
                    .from(schema.memberTags)
                    .innerJoin(schema.tags, eq(schema.tags.id, schema.memberTags.tagId))
                    .where(and(eq(schema.memberTags.memberId, schema.members.id), eq(schema.tags.name, filters.tag))),
            ),
        );
    }
    return and(...conditions);
}

/** Adds tags and employee profiles: two queries for the whole list, whatever its length. */
async function withTags(members: Member[]): Promise<MemberRow[]> {
    const worldId = members[0]?.worldId;
    const emails = members.flatMap((m) => (m.email ? [m.email] : []));
    const [tags, profiles] = await Promise.all([
        tagNamesByMember(members.map((m) => m.id)),
        worldId ? profilesForWorld(worldId, emails) : new Map<string, ProfileInput>(),
    ]);
    return members.map((m) => ({
        ...m,
        tags: tags.get(m.id) ?? [],
        profile: (m.email && profiles.get(m.email.toLowerCase())) || null,
    }));
}

export async function listMembers(
    worldId: string,
    filters: MemberListFilters,
): Promise<{ rows: MemberRow[]; total: number }> {
    const where = listCondition(worldId, filters);
    const [rows, totalRow] = await Promise.all([
        db().query.members.findMany({
            where,
            orderBy: [
                desc(schema.members.kind),
                sql`${schema.members.lastSeenAt} desc nulls last`,
                desc(schema.members.createdAt),
            ],
            limit: filters.pageSize,
            offset: (filters.page - 1) * filters.pageSize,
        }),
        db().select({ value: count() }).from(schema.members).where(where),
    ]);
    return { rows: await withTags(rows), total: totalRow[0]?.value ?? 0 };
}

/** A member of the world. Undefined for an unknown id, or anything that is not a UUID. */
export async function getMember(worldId: string, memberId: string): Promise<MemberRow | undefined> {
    if (!isUuid(memberId)) return undefined;
    const member = await db().query.members.findFirst({
        where: and(eq(schema.members.worldId, worldId), eq(schema.members.id, memberId)),
    });
    return member ? (await withTags([member]))[0] : undefined;
}

// ---------------------------------------------------------------------------------------------
// Tag policy
// ---------------------------------------------------------------------------------------------

export type TagChangeError = "invalidTag" | "reservedTag" | "unknownTag";

export interface TagPolicy {
    /** The actor holds tag.manage. */
    canManageTags: boolean;
    /** Tags carrying rights in WorkAdventure for this world (privilegedTags()). */
    privileged: Set<string>;
    /** Tags that exist in the world. */
    existing: Set<string>;
}

export async function tagPolicyFor(world: Pick<World, "id" | "settings">, canManageTags: boolean): Promise<TagPolicy> {
    const rows = await db()
        .select({ name: schema.tags.name })
        .from(schema.tags)
        .where(eq(schema.tags.worldId, world.id));
    return {
        canManageTags,
        privileged: privilegedTags(readWorldSettings(world.settings)),
        existing: new Set(rows.map((r) => r.name)),
    };
}

/**
 * Checks a change of a member's tags from `before` to `requested`. Invalid names are refused for
 * everyone. Without tag.manage: no privileged tag may be added or removed, and no new tag created.
 */
export function checkTagChange(
    before: string[],
    requested: string[],
    policy: TagPolicy,
): { ok: true; tags: string[] } | { ok: false; error: TagChangeError } {
    const trimmed = requested.map((t) => t.trim()).filter((t) => t.length > 0);
    if (trimmed.some((t) => !TAG_NAME_PATTERN.test(t))) return { ok: false, error: "invalidTag" };
    const after = normalizeTagNames(trimmed);
    if (policy.canManageTags) return { ok: true, tags: after };
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    for (const tag of policy.privileged) {
        if (beforeSet.has(tag) !== afterSet.has(tag)) return { ok: false, error: "reservedTag" };
    }
    if (after.some((t) => !policy.existing.has(t))) return { ok: false, error: "unknownTag" };
    return { ok: true, tags: after };
}

// ---------------------------------------------------------------------------------------------
// Creation and edition
// ---------------------------------------------------------------------------------------------

export type CreateMemberResult =
    | { status: "created"; member: Member }
    | { status: "promoted"; member: Member }
    | { status: "alreadyMember"; member: Member }
    | { status: "tagRefused"; error: TagChangeError };

/**
 * Adds a member, identified by email (the identifier WorkAdventure uses for logged-in people).
 * A guest with the same email becomes a member and keeps their tags, plus the requested ones.
 */
export async function createMember(
    worldId: string,
    input: { email: string; name?: string | undefined; tags: string[] },
    policy: TagPolicy,
): Promise<CreateMemberResult> {
    const existing = await findMember(worldId, input.email);
    const current = existing ? ((await tagNamesByMember([existing.id])).get(existing.id) ?? []) : [];
    const check = checkTagChange(current, [...current, ...input.tags], policy);
    if (!check.ok) return { status: "tagRefused", error: check.error };

    if (existing) {
        if (existing.kind === "member") return { status: "alreadyMember", member: existing };
        const [promoted] = await db()
            .update(schema.members)
            .set({ kind: "member", email: existing.email ?? input.email, name: existing.name ?? input.name ?? null })
            .where(eq(schema.members.id, existing.id))
            .returning();
        await setMemberTags(worldId, existing.id, check.tags, { createMissing: policy.canManageTags });
        return { status: "promoted", member: promoted ?? existing };
    }
    const [member] = await db()
        .insert(schema.members)
        .values({ worldId, uuid: input.email, email: input.email, name: input.name ?? null, kind: "member" })
        .returning();
    if (!member) throw new Error("Member creation returned no row");
    if (check.tags.length > 0) {
        await setMemberTags(worldId, member.id, check.tags, { createMissing: policy.canManageTags });
    }
    return { status: "created", member };
}

export async function editMember(
    worldId: string,
    memberId: string,
    input: {
        name?: string | undefined;
        email?: string | undefined;
        visitCardUrl?: string | undefined;
        kind: MemberKind;
        tags: string[];
    },
    policy: TagPolicy,
): Promise<"ok" | "notFound" | "emailTaken" | TagChangeError> {
    const member = await getMember(worldId, memberId);
    if (!member) return "notFound";
    const check = checkTagChange(member.tags, input.tags, policy);
    if (!check.ok) return check.error;
    if (input.email && input.email.toLowerCase() !== member.email?.toLowerCase()) {
        const other = await db().query.members.findFirst({
            where: and(
                eq(schema.members.worldId, worldId),
                sql`lower(${schema.members.email}) = lower(${input.email})`,
            ),
        });
        if (other && other.id !== memberId) return "emailTaken";
    }
    await db()
        .update(schema.members)
        .set({
            name: input.name ?? null,
            email: input.email ?? null,
            visitCardUrl: input.visitCardUrl ?? null,
            kind: input.kind,
        })
        .where(eq(schema.members.id, memberId));
    await setMemberTags(worldId, memberId, check.tags, { createMissing: policy.canManageTags });
    return "ok";
}

// ---------------------------------------------------------------------------------------------
// GDPR: right of access (art. 15) and right to erasure (art. 17)
// ---------------------------------------------------------------------------------------------

function identifiersOf(member: Member): string[] {
    return [...new Set([member.uuid, ...(member.email ? [member.email] : [])])];
}

function lowerIdentifiers(member: Member): string[] {
    return identifiersOf(member).map((i) => i.toLowerCase());
}

/** Bans of a person, matched case-insensitively on their identifiers. */
export function bansOfMember(worldId: string, member: Member) {
    return db().query.bans.findMany({
        where: and(
            eq(schema.bans.worldId, worldId),
            inArray(sql`lower(${schema.bans.memberUuid})`, lowerIdentifiers(member)),
        ),
        orderBy: desc(schema.bans.createdAt),
    });
}

export function reportsAboutMember(worldId: string, member: Member) {
    return db().query.reports.findMany({
        where: and(eq(schema.reports.worldId, worldId), inArray(schema.reports.reportedUuid, identifiersOf(member))),
        orderBy: desc(schema.reports.createdAt),
        limit: 100,
    });
}

/** Analytics actor hashes of a person (the pusher reports the identifier WorkAdventure knows them by). */
function analyticsHashes(member: Member): string[] {
    return identifiersOf(member).map((id) => pseudonymize(id, "analytics"));
}

function auditAboutCondition(worldId: string, member: Member): SQL | undefined {
    const ids = identifiersOf(member);
    return and(
        eq(schema.auditLogs.worldId, worldId),
        or(
            inArray(schema.auditLogs.targetId, ids),
            inArray(
                schema.auditLogs.actorLabel,
                ids.map((id) => `workadventure:${id}`),
            ),
            inArray(sql`${schema.auditLogs.details} ->> 'email'`, ids),
        ),
    );
}

/** Right of access (GDPR art. 15): everything stored about one person in a world. */
export async function memberDataExport(world: Pick<World, "id" | "organizationId">, member: MemberRow) {
    const ids = identifiersOf(member);
    const [bans, reportsAbout, reportsBy, auditEntries, recordings, analyticsCount, otherWorlds] = await Promise.all([
        bansOfMember(world.id, member),
        reportsAboutMember(world.id, member),
        db().query.reports.findMany({
            where: and(eq(schema.reports.worldId, world.id), inArray(schema.reports.reporterUuid, ids)),
        }),
        db()
            .select()
            .from(schema.auditLogs)
            .where(auditAboutCondition(world.id, member))
            .orderBy(desc(schema.auditLogs.occurredAt))
            .limit(1000),
        db().query.recordingEvents.findMany({
            where: and(eq(schema.recordingEvents.worldId, world.id), inArray(schema.recordingEvents.recorderUuid, ids)),
        }),
        db()
            .select({ value: count() })
            .from(schema.analyticsEvents)
            .where(
                and(
                    eq(schema.analyticsEvents.worldId, world.id),
                    inArray(schema.analyticsEvents.actorHash, analyticsHashes(member)),
                ),
            ),
        // The same person in the other worlds of the organization (the actor manages them all).
        db()
            .select({ world: schema.worlds.name, kind: schema.members.kind, lastSeenAt: schema.members.lastSeenAt })
            .from(schema.members)
            .innerJoin(schema.worlds, eq(schema.worlds.id, schema.members.worldId))
            .where(
                and(
                    eq(schema.worlds.organizationId, world.organizationId),
                    sql`${schema.members.worldId} <> ${world.id}`,
                    or(
                        inArray(schema.members.uuid, ids),
                        member.email ? sql`lower(${schema.members.email}) = lower(${member.email})` : undefined,
                    ),
                ),
            ),
    ]);
    return {
        exportedAt: new Date().toISOString(),
        member: {
            identifier: member.uuid,
            kind: member.kind,
            email: member.email,
            name: member.name,
            tags: member.tags,
            visitCardUrl: member.visitCardUrl,
            chatId: member.chatId,
            locale: member.locale,
            characterTextureIds: member.characterTextureIds,
            companionTextureId: member.companionTextureId,
            visitCount: member.visitCount,
            lastSeenAt: member.lastSeenAt?.toISOString() ?? null,
            createdAt: member.createdAt.toISOString(),
            /** Employee profile in the organization (shared by the person's member rows in every world of it). */
            profile: member.profile,
        },
        bans: bans.map((b) => ({
            reason: b.reason,
            ipAddress: b.ipAddress,
            createdAt: b.createdAt.toISOString(),
            expiresAt: b.expiresAt?.toISOString() ?? null,
            revokedAt: b.revokedAt?.toISOString() ?? null,
        })),
        reportsAbout: reportsAbout.map((r) => ({
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        })),
        reportsMade: reportsBy.map((r) => ({
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        })),
        activityLog: auditEntries.map((a) => ({
            occurredAt: a.occurredAt.toISOString(),
            action: a.action,
            ipAddress: a.ipAddress,
        })),
        recordings: recordings.map((r) => ({
            status: r.status,
            startedAt: r.startedAt?.toISOString() ?? null,
            endedAt: r.endedAt?.toISOString() ?? null,
            files: r.files.length,
        })),
        /** Analytics events are stored under a pseudonym (keyed hash); only their number is exported. */
        analyticsEventCount: analyticsCount[0]?.value ?? 0,
        otherWorldsOfTheOrganization: otherWorlds.map((w) => ({
            world: w.world,
            kind: w.kind,
            lastSeenAt: w.lastSeenAt?.toISOString() ?? null,
        })),
    };
}

/** The pseudonym replacing an erased identifier: stable (same person, same pseudonym), not reversible. */
export function erasedLabel(identifier: string): string {
    return `erased:${pseudonymize(identifier.toLowerCase(), "erasure").slice(0, 24)}`;
}

export interface ErasureSummary {
    member: Member;
    activeBansKept: number;
    bansPseudonymized: number;
    reportsPseudonymized: number;
    auditEntriesPseudonymized: number;
    recordingEventsDeleted: number;
    analyticsEventsDeleted: number;
}

/**
 * Right to erasure (GDPR art. 17), in one transaction, for this world:
 * - the member and their tags are deleted;
 * - their recording events and analytics events are deleted;
 * - inactive bans (revoked or expired), reports and audit entries keep existing (moderation history,
 *   accountability) but their identifiers are replaced by a keyed pseudonym, and the name and IP of
 *   inactive bans are removed;
 * - ACTIVE bans are kept unchanged so that they keep being enforced (legitimate interest: protection
 *   of the other participants). They are counted in the summary so the administrator can tell the person.
 */
export async function eraseMember(world: Pick<World, "id">, memberId: string): Promise<ErasureSummary | undefined> {
    const member = await getMember(world.id, memberId);
    if (!member) return undefined;
    const ids = identifiersOf(member);
    const lower = lowerIdentifiers(member);
    const label = erasedLabel(member.uuid);
    const now = new Date();

    return db().transaction(async (tx) => {
        await tx.delete(schema.members).where(eq(schema.members.id, member.id));
        // The employee profile is the organization's: it goes once nothing of the person is left in it.
        if (member.email) {
            const [owner] = await tx
                .select({ organizationId: schema.worlds.organizationId })
                .from(schema.worlds)
                .where(eq(schema.worlds.id, world.id));
            if (owner) await deleteOrphanProfile(tx, owner.organizationId, member.email);
        }

        const banForPerson = and(
            eq(schema.bans.worldId, world.id),
            inArray(sql`lower(${schema.bans.memberUuid})`, lower),
        );
        const inactive = or(
            isNotNull(schema.bans.revokedAt),
            and(isNotNull(schema.bans.expiresAt), lte(schema.bans.expiresAt, now)),
        );
        const active = and(
            isNull(schema.bans.revokedAt),
            or(isNull(schema.bans.expiresAt), gt(schema.bans.expiresAt, now)),
        );
        const activeBans = await tx.select({ value: count() }).from(schema.bans).where(and(banForPerson, active));
        const bans = await tx
            .update(schema.bans)
            .set({ memberUuid: label, name: null, ipAddress: null })
            .where(and(banForPerson, inactive))
            .returning({ id: schema.bans.id });

        const reportedRows = await tx
            .update(schema.reports)
            .set({ reportedUuid: label })
            .where(and(eq(schema.reports.worldId, world.id), inArray(schema.reports.reportedUuid, ids)))
            .returning({ id: schema.reports.id });
        const reporterRows = await tx
            .update(schema.reports)
            .set({ reporterUuid: label })
            .where(and(eq(schema.reports.worldId, world.id), inArray(schema.reports.reporterUuid, ids)))
            .returning({ id: schema.reports.id });

        const auditTargets = await tx
            .update(schema.auditLogs)
            .set({ targetId: label })
            .where(and(eq(schema.auditLogs.worldId, world.id), inArray(schema.auditLogs.targetId, ids)))
            .returning({ id: schema.auditLogs.id });
        const auditActors = await tx
            .update(schema.auditLogs)
            .set({ actorLabel: `workadventure:${label}` })
            .where(
                and(
                    eq(schema.auditLogs.worldId, world.id),
                    inArray(
                        schema.auditLogs.actorLabel,
                        ids.map((id) => `workadventure:${id}`),
                    ),
                ),
            )
            .returning({ id: schema.auditLogs.id });
        const auditDetails = await tx
            .update(schema.auditLogs)
            .set({ details: sql`jsonb_set(${schema.auditLogs.details}, '{email}', to_jsonb(${label}::text))` })
            .where(
                and(eq(schema.auditLogs.worldId, world.id), inArray(sql`${schema.auditLogs.details} ->> 'email'`, ids)),
            )
            .returning({ id: schema.auditLogs.id });

        const recordings = await tx
            .delete(schema.recordingEvents)
            .where(and(eq(schema.recordingEvents.worldId, world.id), inArray(schema.recordingEvents.recorderUuid, ids)))
            .returning({ id: schema.recordingEvents.id });
        const analytics = await tx
            .delete(schema.analyticsEvents)
            .where(
                and(
                    eq(schema.analyticsEvents.worldId, world.id),
                    inArray(schema.analyticsEvents.actorHash, analyticsHashes(member)),
                ),
            )
            .returning({ id: schema.analyticsEvents.eventId });

        return {
            member,
            activeBansKept: activeBans[0]?.value ?? 0,
            bansPseudonymized: bans.length,
            reportsPseudonymized: new Set([...reportedRows, ...reporterRows].map((r) => r.id)).size,
            auditEntriesPseudonymized: new Set([...auditTargets, ...auditActors, ...auditDetails].map((r) => r.id))
                .size,
            recordingEventsDeleted: recordings.length,
            analyticsEventsDeleted: analytics.length,
        };
    });
}

// ---------------------------------------------------------------------------------------------
// CSV export and import
// ---------------------------------------------------------------------------------------------

export const EXPORT_HEADER = [
    "identifier",
    "kind",
    "email",
    "name",
    "tags",
    "visit_card_url",
    "chat_id",
    "locale",
    "visit_count",
    "last_seen_at",
    "created_at",
    "job_title",
    "department",
    "manager_email",
    "work_location",
];

export function exportRow(member: MemberRow): (string | number | null)[] {
    return [
        member.uuid,
        member.kind,
        member.email,
        member.name,
        member.tags.join(";"),
        member.visitCardUrl,
        member.chatId,
        member.locale,
        member.visitCount,
        member.lastSeenAt?.toISOString() ?? null,
        member.createdAt.toISOString(),
        member.profile?.jobTitle ?? null,
        member.profile?.department ?? null,
        member.profile?.managerEmail ?? null,
        member.profile?.workLocation ?? null,
    ];
}

export const EXPORT_BATCH_SIZE = 1000;

/**
 * Every member of a world, in batches (keyset pagination on id), so exports of large worlds use
 * bounded memory and database work per step.
 */
export async function* membersInBatches(worldId: string, batchSize = EXPORT_BATCH_SIZE): AsyncGenerator<MemberRow[]> {
    let after: string | undefined;
    for (;;) {
        const rows = await db().query.members.findMany({
            where: and(eq(schema.members.worldId, worldId), after ? gt(schema.members.id, after) : undefined),
            orderBy: schema.members.id,
            limit: batchSize,
        });
        if (rows.length === 0) return;
        yield await withTags(rows);
        after = rows[rows.length - 1]?.id;
        if (rows.length < batchSize) return;
    }
}

export interface ImportSummary {
    created: number;
    updated: number;
}

export interface ImportResult {
    summary: ImportSummary;
    /** Rows refused by the tag policy (the others are imported). */
    errors: { line: number; code: ImportErrorCode }[];
}

/**
 * Creates or updates members from parsed CSV rows, in ONE transaction: either every accepted row is
 * written or none (a database failure leaves the world unchanged). Existing members keep their tags
 * and gain the new ones. Rows breaking the tag policy are refused and reported, not imported.
 * Employee profile columns (job_title, department, manager_email, work_location), when the file has them,
 * are applied after the members, in file order; a line whose manager is refused keeps its member row but
 * none of its profile columns, and is reported.
 */
export async function importMembers(
    worldId: string,
    rows: ImportRow[],
    policy: TagPolicy,
    actorAccountId: string | null = null,
): Promise<ImportResult> {
    const errors: ImportResult["errors"] = [];
    const summary: ImportSummary = { created: 0, updated: 0 };
    if (rows.length === 0) return { summary, errors };

    const emails = rows.map((r) => r.email.toLowerCase());
    const existingMembers = await db().query.members.findMany({
        where: and(
            eq(schema.members.worldId, worldId),
            or(
                inArray(sql`lower(${schema.members.email})`, emails),
                inArray(sql`lower(${schema.members.uuid})`, emails),
            ),
        ),
    });
    const byEmail = new Map<string, Member>();
    for (const m of existingMembers) {
        if (m.email) byEmail.set(m.email.toLowerCase(), m);
        byEmail.set(m.uuid.toLowerCase(), m);
    }
    const currentTags = await tagNamesByMember(existingMembers.map((m) => m.id));

    const accepted: { row: ImportRow; existing: Member | undefined; tags: string[] }[] = [];
    for (const row of rows) {
        const existing = byEmail.get(row.email.toLowerCase());
        const before = existing ? (currentTags.get(existing.id) ?? []) : [];
        const check = checkTagChange(before, [...before, ...row.tags], policy);
        if (!check.ok) {
            errors.push({ line: row.line, code: check.error });
            continue;
        }
        accepted.push({ row, existing, tags: check.tags });
    }

    await db().transaction(async (tx) => {
        const wanted = new Set(accepted.flatMap((a) => a.tags));
        if (policy.canManageTags && wanted.size > 0) {
            await tx
                .insert(schema.tags)
                .values([...wanted].map((name) => ({ worldId, name })))
                .onConflictDoNothing();
        }
        const tagRows =
            wanted.size > 0
                ? await tx.query.tags.findMany({
                      where: and(eq(schema.tags.worldId, worldId), inArray(schema.tags.name, [...wanted])),
                  })
                : [];
        const tagId = new Map(tagRows.map((t) => [t.name, t.id]));

        const newRows = accepted.filter((a) => !a.existing);
        const inserted =
            newRows.length > 0
                ? await tx
                      .insert(schema.members)
                      .values(
                          newRows.map(({ row }) => ({
                              worldId,
                              uuid: row.email,
                              email: row.email,
                              name: row.name ?? null,
                              kind: "member" as const,
                          })),
                      )
                      .returning({ id: schema.members.id, email: schema.members.email })
                : [];
        const insertedId = new Map(inserted.map((m) => [m.email?.toLowerCase(), m.id]));
        summary.created = inserted.length;

        const assignments: { memberId: string; tagId: string }[] = [];
        for (const { row, existing, tags } of accepted) {
            let memberId: string | undefined;
            if (existing) {
                await tx
                    .update(schema.members)
                    .set({ kind: "member", name: row.name ?? existing.name, email: existing.email ?? row.email })
                    .where(eq(schema.members.id, existing.id));
                memberId = existing.id;
                summary.updated++;
            } else {
                memberId = insertedId.get(row.email.toLowerCase());
            }
            if (!memberId) continue;
            for (const name of tags) {
                const id = tagId.get(name);
                if (id) assignments.push({ memberId, tagId: id });
            }
        }
        if (assignments.length > 0) {
            await tx.insert(schema.memberTags).values(assignments).onConflictDoNothing();
        }

        const withProfiles = accepted.flatMap(({ row }) =>
            row.profile ? [{ line: row.line, email: row.email, profile: row.profile }] : [],
        );
        if (withProfiles.length > 0) {
            const [owner] = await tx
                .select({ organizationId: schema.worlds.organizationId })
                .from(schema.worlds)
                .where(eq(schema.worlds.id, worldId));
            if (owner) {
                const newPeople = new Set(accepted.map(({ row }) => row.email.toLowerCase()));
                errors.push(
                    ...(await importProfiles(tx, owner.organizationId, withProfiles, newPeople, actorAccountId)),
                );
            }
        }
    });
    errors.sort((a, b) => a.line - b.line);
    return { summary, errors };
}
