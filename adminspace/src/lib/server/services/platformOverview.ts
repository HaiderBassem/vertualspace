/**
 * Figures of the Control Center overview (/admin, platform administrators only): what the platform
 * holds, what failed recently, security events of the last 7 days and the support sessions in progress.
 * Counts only, never people's data beyond the names shown for support sessions.
 */
import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db/client";

/** Audit actions shown as security events, with the key of their label (control.overview.events). */
export const SECURITY_EVENTS = {
    "auth.login_failed": "loginFailed",
    "account.unlock": "unlocked",
    "account.mfa.reset": "mfaReset",
    "account.mfa.disable": "mfaDisabled",
    "account.password.reset": "passwordResetByAdmin",
    "account.password_reset": "passwordResetByEmail",
    "support.start": "supportStarted",
} as const;
export type SecurityEvent = (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];

const WEEK_MS = 7 * 86_400_000;

export interface PlatformOverview {
    organizations: number;
    suspended: number;
    accounts: number;
    worlds: number;
    failedJobs: number;
    failedEmails: number;
    security: { event: SecurityEvent; total: number }[];
    support: {
        id: string;
        organizationId: string;
        organizationName: string;
        accountName: string;
        reason: string;
        expiresAt: string;
    }[];
}

export async function platformOverview(now = new Date()): Promise<PlatformOverview> {
    const since = new Date(now.getTime() - WEEK_MS);
    const [organizations, accounts, worlds, failedJobs, failedEmails, security, support] = await Promise.all([
        db()
            .select({
                total: count(),
                suspended: sql<number>`(count(*) filter (where ${schema.organizations.status} = 'suspended'))::int`,
            })
            .from(schema.organizations),
        db().select({ total: count() }).from(schema.accounts),
        db().select({ total: count() }).from(schema.worlds),
        db().select({ total: count() }).from(schema.jobs).where(eq(schema.jobs.status, "failed")),
        db()
            .select({ total: count() })
            .from(schema.emailDeliveries)
            .where(and(eq(schema.emailDeliveries.status, "failed"), gt(schema.emailDeliveries.createdAt, since))),
        db()
            .select({ action: schema.auditLogs.action, total: count() })
            .from(schema.auditLogs)
            .where(
                and(
                    inArray(schema.auditLogs.action, Object.keys(SECURITY_EVENTS)),
                    gt(schema.auditLogs.occurredAt, since),
                ),
            )
            .groupBy(schema.auditLogs.action)
            .orderBy(desc(count())),
        db()
            .select({
                id: schema.supportAccessGrants.id,
                organizationId: schema.organizations.id,
                organizationName: schema.organizations.name,
                accountName: schema.accounts.name,
                reason: schema.supportAccessGrants.reason,
                expiresAt: schema.supportAccessGrants.expiresAt,
            })
            .from(schema.supportAccessGrants)
            .innerJoin(schema.organizations, eq(schema.organizations.id, schema.supportAccessGrants.organizationId))
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.supportAccessGrants.accountId))
            .where(and(isNull(schema.supportAccessGrants.endedAt), gt(schema.supportAccessGrants.expiresAt, now)))
            .orderBy(schema.supportAccessGrants.expiresAt),
    ]);
    return {
        organizations: organizations[0]?.total ?? 0,
        suspended: organizations[0]?.suspended ?? 0,
        accounts: accounts[0]?.total ?? 0,
        worlds: worlds[0]?.total ?? 0,
        failedJobs: failedJobs[0]?.total ?? 0,
        failedEmails: failedEmails[0]?.total ?? 0,
        security: security.map((row) => ({
            event: SECURITY_EVENTS[row.action as keyof typeof SECURITY_EVENTS],
            total: row.total,
        })),
        support: support.map((s) => ({ ...s, expiresAt: s.expiresAt.toISOString() })),
    };
}
