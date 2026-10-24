/**
 * First-run bootstrap: creation of the very first (superadmin) account. Race-safe: a transaction-level
 * advisory lock serializes concurrent attempts, and the "no account yet" check runs inside it.
 */
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { config } from "../config";
import { db, schema } from "../db/client";
import { hashPassword } from "./credentials";

type AccountRow = typeof schema.accounts.$inferSelect;

/** Arbitrary constant identifying the bootstrap lock (pg_advisory_xact_lock key). */
const BOOTSTRAP_LOCK_KEY = 4_271_903_015;

export type SetupAvailability = "open" | "token" | "disabled";

/**
 * Whether the web setup (/setup) may be used: with SETUP_TOKEN set, the token is required; without it,
 * setup is open in development and refused in production (use `npm run superadmin:create`).
 */
export function setupAvailability(): SetupAvailability {
    if (config().SETUP_TOKEN) return "token";
    return config().NODE_ENV === "production" ? "disabled" : "open";
}

export function setupTokenMatches(candidate: string): boolean {
    const expected = config().SETUP_TOKEN;
    if (!expected) return true;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/** Creates the first account, or returns undefined when an account already exists. */
export async function createFirstSuperadmin(input: {
    name: string;
    email: string;
    password: string;
    locale?: string;
}): Promise<AccountRow | undefined> {
    const passwordHash = await hashPassword(input.password);
    return db().transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`);
        const existing = await tx.select({ id: schema.accounts.id }).from(schema.accounts).limit(1);
        if (existing.length > 0) return undefined;
        const [account] = await tx
            .insert(schema.accounts)
            .values({
                name: input.name.trim(),
                email: input.email.trim(),
                passwordHash,
                isSuperadmin: true,
                locale: input.locale ?? null,
            })
            .returning();
        return account;
    });
}
