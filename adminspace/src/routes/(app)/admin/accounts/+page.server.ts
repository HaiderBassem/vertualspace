import { error, fail } from "@sveltejs/kit";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { hashPassword, resetSecondFactor } from "$lib/server/auth/credentials";
import { requireSuperadmin } from "$lib/server/auth/rbac";
import { destroyAccountSessions, type Account } from "$lib/server/auth/session";
import { requireAccount } from "$lib/server/context";
import { randomToken } from "$lib/server/crypto";
import { db, schema } from "$lib/server/db/client";
import { checkbox, parseForm, requiredText } from "$lib/server/http/forms";
import { createAccount, findAccountByEmail, findAccountById } from "$lib/server/services/accounts";
import { mailConfigured, publicOrigin } from "$lib/server/services/mail";
import { issuePasswordResetLink } from "$lib/server/services/passwordReset";

function superadmin(locals: App.Locals): Account {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

/** A temporary password: 18 random bytes, i.e. 24 characters, above the 12-character policy. */
function temporaryPassword(): string {
    return randomToken(18);
}

type Transaction = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/**
 * Locks every active superadmin row, then counts those other than `exceptId`. Run inside a transaction:
 * two concurrent requests can no longer both remove "the other" last superadmin.
 */
async function lockOtherActiveSuperadmins(tx: Transaction, exceptId: string): Promise<number> {
    const rows = await tx.execute<{ id: string }>(sql`
        select id from accounts
        where is_superadmin and status = 'active' and id <> ${exceptId}
        for update`);
    return rows.length;
}

export const load: PageServerLoad = async ({ locals }) => {
    const me = superadmin(locals);
    const a = schema.accounts;
    const rows = await db()
        .select({
            id: a.id,
            email: a.email,
            name: a.name,
            isSuperadmin: a.isSuperadmin,
            status: a.status,
            totpEnabledAt: a.totpEnabledAt,
            lockedUntil: a.lockedUntil,
            mustChangePassword: a.mustChangePassword,
            lastLoginAt: a.lastLoginAt,
            createdAt: a.createdAt,
            organizations: sql<number>`(select count(*)::int from ${schema.organizationMemberships} om where om.account_id = accounts.id)`,
        })
        .from(a)
        .orderBy(asc(a.email));
    const now = new Date();
    return {
        meId: me.id,
        accounts: rows.map((r) => ({
            id: r.id,
            email: r.email,
            name: r.name,
            isSuperadmin: r.isSuperadmin,
            status: r.status,
            mfa: r.totpEnabledAt !== null,
            locked: r.lockedUntil !== null && r.lockedUntil > now,
            mustChangePassword: r.mustChangePassword,
            organizations: r.organizations,
            lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
        })),
    };
};

const CreateAccount = z.object({
    name: requiredText(200),
    email: z.string().trim().email().max(320),
    isSuperadmin: checkbox,
});

async function target(request: Request): Promise<Account> {
    const id = String((await request.formData()).get("id") ?? "");
    const account = z.string().uuid().safeParse(id).success ? await findAccountById(id) : undefined;
    if (!account) error(404, "Not found");
    return account;
}

/**
 * Records a platform administrator's action on an account in the audit log of every organization the
 * account belongs to as well: the organizations see who reset the password or second factor of one of
 * their people, and when.
 */
async function auditForOrganizations(
    entry: Omit<Parameters<typeof audit>[0], "organizationId">,
    accountId: string,
): Promise<void> {
    await audit(entry);
    const memberships = await db()
        .select({ organizationId: schema.organizationMemberships.organizationId })
        .from(schema.organizationMemberships)
        .where(eq(schema.organizationMemberships.accountId, accountId));
    for (const { organizationId } of memberships) {
        await audit({ ...entry, organizationId, details: { ...(entry.details ?? {}), by: "platform" } });
    }
}

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const me = superadmin(locals);
        const parsed = parseForm(await request.formData(), CreateAccount);
        if (!parsed.ok) return parsed.failure;
        const { name, email, isSuperadmin } = parsed.data;
        if (await findAccountByEmail(email)) {
            return fail(400, { emailTaken: true, values: { name, email }, errors: {} });
        }
        const password = temporaryPassword();
        const account = await createAccount({ name, email, password, isSuperadmin });
        // The person must replace the temporary password at their first login.
        await db().update(schema.accounts).set({ mustChangePassword: true }).where(eq(schema.accounts.id, account.id));
        await audit({
            action: "account.create",
            account: me,
            targetType: "account",
            targetId: account.id,
            ipAddress: locals.clientIp ?? null,
            details: { email: account.email, superadmin: isSuperadmin },
        });
        return { temporaryPassword: password, forEmail: account.email };
    },

    toggleStatus: async ({ request, locals }) => {
        const me = superadmin(locals);
        const account = await target(request);
        if (account.id === me.id) return fail(400, { problem: "notYourself" as const });
        const disabling = account.status === "active";
        const outcome = await db().transaction(async (tx) => {
            if (disabling && account.isSuperadmin && (await lockOtherActiveSuperadmins(tx, account.id)) === 0) {
                return "lastSuperadmin" as const;
            }
            await tx
                .update(schema.accounts)
                .set({ status: disabling ? "disabled" : "active" })
                .where(eq(schema.accounts.id, account.id));
            return "ok" as const;
        });
        if (outcome !== "ok") return fail(400, { problem: outcome });
        if (disabling) await destroyAccountSessions(account.id);
        await auditForOrganizations(
            {
                action: disabling ? "account.disable" : "account.enable",
                account: me,
                targetType: "account",
                targetId: account.id,
                ipAddress: locals.clientIp ?? null,
                details: { email: account.email },
            },
            account.id,
        );
        return { updated: true };
    },

    toggleSuperadmin: async ({ request, locals }) => {
        const me = superadmin(locals);
        const account = await target(request);
        const revoking = account.isSuperadmin;
        const outcome = await db().transaction(async (tx) => {
            if (revoking && (await lockOtherActiveSuperadmins(tx, account.id)) === 0) {
                return "lastSuperadmin" as const;
            }
            await tx.update(schema.accounts).set({ isSuperadmin: !revoking }).where(eq(schema.accounts.id, account.id));
            return "ok" as const;
        });
        if (outcome !== "ok") return fail(400, { problem: outcome });
        await audit({
            action: revoking ? "account.superadmin.revoke" : "account.superadmin.grant",
            account: me,
            targetType: "account",
            targetId: account.id,
            ipAddress: locals.clientIp ?? null,
            details: { email: account.email },
        });
        return { updated: true };
    },

    resetPassword: async ({ request, locals, url }) => {
        const me = superadmin(locals);
        const account = await target(request);
        if (account.id === me.id) return fail(400, { problem: "notYourself" as const });
        const origin = publicOrigin(url);
        if (mailConfigured() && origin) {
            // With email, the administrator never learns a password: the current one stops working and
            // the person chooses a new one from a link sent to their own address.
            await db()
                .update(schema.accounts)
                .set({
                    passwordHash: await hashPassword(randomToken()),
                    passwordChangedAt: new Date(),
                    failedLoginCount: 0,
                    lockedUntil: null,
                })
                .where(eq(schema.accounts.id, account.id));
            await destroyAccountSessions(account.id);
            const sent = await issuePasswordResetLink(account, {
                origin,
                locale: locals.locale,
                ipAddress: locals.clientIp,
            });
            await auditForOrganizations(
                {
                    action: "account.password.reset",
                    account: me,
                    targetType: "account",
                    targetId: account.id,
                    ipAddress: locals.clientIp ?? null,
                    details: { email: account.email, delivery: sent ? "emailLink" : "emailFailed" },
                },
                account.id,
            );
            return sent
                ? { resetLinkSent: true as const, forEmail: account.email }
                : fail(502, { problem: "mailFailed" as const });
        }
        const password = temporaryPassword();
        await db()
            .update(schema.accounts)
            .set({
                passwordHash: await hashPassword(password),
                passwordChangedAt: new Date(),
                mustChangePassword: true,
                failedLoginCount: 0,
                lockedUntil: null,
            })
            .where(eq(schema.accounts.id, account.id));
        await destroyAccountSessions(account.id);
        await auditForOrganizations(
            {
                action: "account.password.reset",
                account: me,
                targetType: "account",
                targetId: account.id,
                ipAddress: locals.clientIp ?? null,
                details: { email: account.email, delivery: "temporaryPassword" },
            },
            account.id,
        );
        return { temporaryPassword: password, forEmail: account.email };
    },

    /** Removes someone's second factor (lost device without recovery codes). They set it up again. */
    resetMfa: async ({ request, locals }) => {
        const me = superadmin(locals);
        const account = await target(request);
        if (account.id === me.id) return fail(400, { problem: "notYourself" as const });
        await resetSecondFactor(account.id);
        await destroyAccountSessions(account.id);
        await auditForOrganizations(
            {
                action: "account.mfa.reset",
                account: me,
                targetType: "account",
                targetId: account.id,
                ipAddress: locals.clientIp ?? null,
                details: { email: account.email },
            },
            account.id,
        );
        return { updated: true };
    },

    unlock: async ({ request, locals }) => {
        const me = superadmin(locals);
        const account = await target(request);
        await db()
            .update(schema.accounts)
            .set({ failedLoginCount: 0, lockedUntil: null, totpFailedCount: 0, totpLockedUntil: null })
            .where(eq(schema.accounts.id, account.id));
        await auditForOrganizations(
            {
                action: "account.unlock",
                account: me,
                targetType: "account",
                targetId: account.id,
                ipAddress: locals.clientIp ?? null,
                details: { email: account.email },
            },
            account.id,
        );
        return { updated: true };
    },
};
