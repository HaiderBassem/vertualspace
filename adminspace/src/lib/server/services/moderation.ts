/** Bans and reports of a world. */
import { and, count, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { isIP } from "node:net";
import { db, schema } from "../db/client";
import { isUuid } from "../http/forms";

export type Ban = typeof schema.bans.$inferSelect;
export type Report = typeof schema.reports.$inferSelect;
export type ReportStatus = (typeof schema.reportStatus.enumValues)[number];

function activeBanCondition(worldId: string, now: Date) {
    return and(
        eq(schema.bans.worldId, worldId),
        isNull(schema.bans.revokedAt),
        or(isNull(schema.bans.expiresAt), gt(schema.bans.expiresAt, now)),
    );
}

/** The active ban matching any of the person's identifiers (uuid, email) or their IP address. */
export async function findActiveBan(
    worldId: string,
    identifiers: string[],
    ipAddress: string | undefined,
): Promise<Ban | undefined> {
    const ids = [...new Set(identifiers.filter((i) => i.length > 0).map((i) => i.toLowerCase()))];
    const matchers = [];
    for (const id of ids) {
        matchers.push(sql`lower(${schema.bans.memberUuid}) = ${id}`);
    }
    if (ipAddress && isIP(ipAddress)) {
        matchers.push(sql`${schema.bans.ipAddress} = ${ipAddress}::inet`);
    }
    if (matchers.length === 0) return undefined;
    return db().query.bans.findFirst({
        where: and(activeBanCondition(worldId, new Date()), or(...matchers)),
        orderBy: desc(schema.bans.createdAt),
    });
}

export async function createBan(input: {
    worldId: string;
    memberUuid: string | null;
    ipAddress: string | null;
    name: string | null;
    reason: string;
    bannedBy: string;
    expiresAt?: Date | null;
}): Promise<Ban> {
    const [ban] = await db()
        .insert(schema.bans)
        .values({
            worldId: input.worldId,
            memberUuid: input.memberUuid,
            ipAddress: input.ipAddress && isIP(input.ipAddress) ? input.ipAddress : null,
            name: input.name,
            reason: input.reason,
            bannedBy: input.bannedBy,
            expiresAt: input.expiresAt ?? null,
        })
        .returning();
    if (!ban) throw new Error("Ban creation returned no row");
    return ban;
}

export async function revokeBan(worldId: string, banId: string, accountId: string): Promise<boolean> {
    if (!isUuid(banId)) return false;
    const rows = await db()
        .update(schema.bans)
        .set({ revokedAt: new Date(), revokedBy: accountId })
        .where(and(eq(schema.bans.id, banId), eq(schema.bans.worldId, worldId), isNull(schema.bans.revokedAt)))
        .returning({ id: schema.bans.id });
    return rows.length > 0;
}

export interface Page {
    page: number;
    pageSize: number;
}

/** Bans of a world, newest first, one page at a time with the total (no silent truncation). */
export async function listBans(
    worldId: string,
    includeInactive: boolean,
    { page, pageSize }: Page,
): Promise<{ rows: Ban[]; total: number }> {
    const where = includeInactive ? eq(schema.bans.worldId, worldId) : activeBanCondition(worldId, new Date());
    const [rows, totalRows] = await Promise.all([
        db().query.bans.findMany({
            where,
            orderBy: desc(schema.bans.createdAt),
            limit: pageSize,
            offset: (page - 1) * pageSize,
        }),
        db().select({ value: count() }).from(schema.bans).where(where),
    ]);
    return { rows, total: totalRows[0]?.value ?? 0 };
}

export async function createReport(input: {
    worldId: string;
    roomUrl: string;
    reportedUuid: string;
    reporterUuid: string;
    comment: string;
}): Promise<Report> {
    const [report] = await db()
        .insert(schema.reports)
        .values({ ...input, comment: input.comment.slice(0, 5000) })
        .returning();
    if (!report) throw new Error("Report creation returned no row");
    return report;
}

/** Reports of a world, newest first, one page at a time with the total (no silent truncation). */
export async function listReports(
    worldId: string,
    status: ReportStatus | "all",
    { page, pageSize }: Page,
): Promise<{ rows: Report[]; total: number }> {
    const where =
        status === "all"
            ? eq(schema.reports.worldId, worldId)
            : and(eq(schema.reports.worldId, worldId), eq(schema.reports.status, status));
    const [rows, totalRows] = await Promise.all([
        db().query.reports.findMany({
            where,
            orderBy: desc(schema.reports.createdAt),
            limit: pageSize,
            offset: (page - 1) * pageSize,
        }),
        db().select({ value: count() }).from(schema.reports).where(where),
    ]);
    return { rows, total: totalRows[0]?.value ?? 0 };
}

export async function setReportStatus(
    worldId: string,
    reportId: string,
    status: ReportStatus,
    accountId: string,
    note: string | null,
): Promise<boolean> {
    if (!isUuid(reportId)) return false;
    const rows = await db()
        .update(schema.reports)
        .set({
            status,
            resolutionNote: note,
            handledBy: status === "open" ? null : accountId,
            handledAt: status === "open" ? null : new Date(),
        })
        .where(and(eq(schema.reports.id, reportId), eq(schema.reports.worldId, worldId)))
        .returning({ id: schema.reports.id });
    return rows.length > 0;
}

export async function countOpenReports(worldId: string): Promise<number> {
    const rows = await db()
        .select({ value: sql<number>`count(*)::int` })
        .from(schema.reports)
        .where(and(eq(schema.reports.worldId, worldId), eq(schema.reports.status, "open")));
    return rows[0]?.value ?? 0;
}
