/**
 * Support access: the only way a platform administrator gets rights inside an organization they are
 * not a member of. A grant names a reason, lasts at most a few hours, can be ended at any time, and is
 * recorded in the organization's own audit log (start and end), so the tenant can see it.
 */
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "../db/client";

export const SUPPORT_DURATIONS_MINUTES = [15, 60, 240] as const;
export type SupportDuration = (typeof SUPPORT_DURATIONS_MINUTES)[number];

export async function startSupportAccess(input: {
    organizationId: string;
    accountId: string;
    reason: string;
    minutes: SupportDuration;
}): Promise<{ id: string; expiresAt: Date }> {
    return db().transaction(async (tx) => {
        await tx
            .update(schema.supportAccessGrants)
            .set({ endedAt: new Date() })
            .where(
                and(
                    eq(schema.supportAccessGrants.organizationId, input.organizationId),
                    eq(schema.supportAccessGrants.accountId, input.accountId),
                    isNull(schema.supportAccessGrants.endedAt),
                ),
            );
        const [grant] = await tx
            .insert(schema.supportAccessGrants)
            .values({
                organizationId: input.organizationId,
                accountId: input.accountId,
                reason: input.reason,
                expiresAt: new Date(Date.now() + input.minutes * 60_000),
            })
            .returning({ id: schema.supportAccessGrants.id, expiresAt: schema.supportAccessGrants.expiresAt });
        if (!grant) throw new Error("Support grant creation returned no row");
        return grant;
    });
}

/** Ends the account's active grant on the organization. Returns the ended grant id, if any. */
export async function endSupportAccess(organizationId: string, accountId: string): Promise<string | undefined> {
    const rows = await db()
        .update(schema.supportAccessGrants)
        .set({ endedAt: new Date() })
        .where(
            and(
                eq(schema.supportAccessGrants.organizationId, organizationId),
                eq(schema.supportAccessGrants.accountId, accountId),
                isNull(schema.supportAccessGrants.endedAt),
                gt(schema.supportAccessGrants.expiresAt, new Date()),
            ),
        )
        .returning({ id: schema.supportAccessGrants.id });
    return rows[0]?.id;
}

export interface SupportGrantView {
    id: string;
    accountName: string | null;
    accountEmail: string | null;
    reason: string;
    createdAt: Date;
    expiresAt: Date;
    endedAt: Date | null;
    active: boolean;
}

export async function listSupportGrants(organizationId: string, limit = 20): Promise<SupportGrantView[]> {
    const rows = await db()
        .select({ grant: schema.supportAccessGrants, name: schema.accounts.name, email: schema.accounts.email })
        .from(schema.supportAccessGrants)
        .leftJoin(schema.accounts, eq(schema.accounts.id, schema.supportAccessGrants.accountId))
        .where(eq(schema.supportAccessGrants.organizationId, organizationId))
        .orderBy(desc(schema.supportAccessGrants.createdAt))
        .limit(limit);
    const now = new Date();
    return rows.map(({ grant, name, email }) => ({
        id: grant.id,
        accountName: name,
        accountEmail: email,
        reason: grant.reason,
        createdAt: grant.createdAt,
        expiresAt: grant.expiresAt,
        endedAt: grant.endedAt,
        active: grant.endedAt === null && grant.expiresAt > now,
    }));
}
