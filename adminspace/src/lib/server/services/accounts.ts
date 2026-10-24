import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { hashPassword } from "../auth/credentials";
import type { Account } from "../auth/session";

let anyAccountKnown = false;

/** Whether the platform has been set up. Cached once true: accounts are never all deleted at runtime. */
export async function hasAnyAccount(): Promise<boolean> {
    if (anyAccountKnown) return true;
    const row = await db().select({ id: schema.accounts.id }).from(schema.accounts).limit(1);
    anyAccountKnown = row.length > 0;
    return anyAccountKnown;
}

export function findAccountByEmail(email: string): Promise<Account | undefined> {
    return db().query.accounts.findFirst({ where: sql`lower(${schema.accounts.email}) = lower(${email})` });
}

export function findAccountById(id: string): Promise<Account | undefined> {
    return db().query.accounts.findFirst({ where: eq(schema.accounts.id, id) });
}

export async function createAccount(input: {
    email: string;
    name: string;
    password: string;
    isSuperadmin?: boolean;
    locale?: string;
}): Promise<Account> {
    const [account] = await db()
        .insert(schema.accounts)
        .values({
            email: input.email.trim(),
            name: input.name.trim(),
            passwordHash: await hashPassword(input.password),
            isSuperadmin: input.isSuperadmin ?? false,
            locale: input.locale ?? null,
        })
        .returning();
    if (!account) throw new Error("Account creation returned no row");
    anyAccountKnown = true;
    return account;
}

export function listAccounts(): Promise<Account[]> {
    return db().query.accounts.findMany({ orderBy: asc(schema.accounts.email) });
}
