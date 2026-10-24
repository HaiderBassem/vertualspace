/**
 * Migration lifecycle: fresh install, upgrade with data, idempotency and interrupted migrations.
 *
 * Each test migrates its own temporary database (see helpers.ts). Transaction semantics come from
 * drizzle-orm's PgDialect.migrate (node_modules/drizzle-orm/pg-core/dialect.js, drizzle-orm 0.45): it
 * creates drizzle.__drizzle_migrations outside of any transaction, reads the last applied `created_at`,
 * then runs EVERY pending migration and its bookkeeping insert inside ONE session.transaction(), which
 * postgres-js implements with sql.begin() (node_modules/drizzle-orm/postgres-js/session.js). A failure
 * anywhere rolls back all the pending migrations of that run.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import * as schemaModule from "../../src/lib/server/db/schema";
import {
    createDatabase,
    dropDatabases,
    insertSampleData,
    journal,
    migrateWith,
    migrationHash,
    migrationsFolderWith,
    probeServer,
    ROOT,
    snapshot,
    tempDatabaseName,
    unavailable,
    urlForDatabase,
} from "./helpers";

const probe = await probeServer();
const skip = !probe.ok && unavailable("migrations", probe.reason);
const created = new Set<string>();
const clients: postgres.Sql[] = [];

afterAll(async () => {
    if (!probe.ok) return;
    try {
        await Promise.all(clients.map((client) => client.end({ timeout: 5 })));
    } finally {
        try {
            await dropDatabases(probe.admin, created);
        } finally {
            await probe.admin.end({ timeout: 5 });
        }
    }
});

async function freshDatabase(suffix?: string): Promise<{ url: string; sql: postgres.Sql }> {
    if (!probe.ok) throw new Error("no server");
    const name = tempDatabaseName("mig", suffix);
    created.add(name);
    await createDatabase(probe.admin, name);
    const url = urlForDatabase(probe.url, name);
    const sql = postgres(url, { max: 2, onnotice: () => {} });
    clients.push(sql);
    return { url, sql };
}

/** Runs the real migration script (scripts/migrate.ts), as `npm run db:migrate` does. */
function runMigrateScript(url: string) {
    const result = spawnSync(
        process.execPath,
        [path.join(ROOT, "node_modules/tsx/dist/cli.mjs"), "scripts/migrate.ts"],
        {
            cwd: ROOT,
            env: { ...process.env, DATABASE_URL: url },
            encoding: "utf8",
            timeout: 60_000,
        },
    );
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

async function appliedMigrations(sql: postgres.Sql) {
    return sql<{ id: number; hash: string; created_at: string }[]>`
        select id, hash, created_at from drizzle.__drizzle_migrations order by id`;
}

async function publicTables(sql: postgres.Sql): Promise<string[]> {
    const rows = await sql<{ name: string }[]>`
        select table_name as name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`;
    return rows.map((r) => r.name);
}

/** Columns, indexes and constraints: changes whenever the schema changes. */
async function schemaFingerprint(sql: postgres.Sql): Promise<string> {
    const [row] = await sql<{ fingerprint: string }[]>`
        select concat_ws(E'\n',
            (select string_agg(concat_ws(' ', table_name, column_name, data_type, is_nullable, column_default), E'\n' order by table_name, column_name)
               from information_schema.columns where table_schema = 'public'),
            (select string_agg(indexdef, E'\n' order by indexdef) from pg_indexes where schemaname = 'public'),
            (select string_agg(conname || ' ' || pg_get_constraintdef(c.oid), E'\n' order by conname)
               from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public')
        ) as fingerprint`;
    return row?.fingerprint ?? "";
}

/** Message of the rejection, including drizzle's wrapped database error (DrizzleQueryError.cause). */
async function failureOf(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
    } catch (error) {
        const cause = (error as { cause?: unknown }).cause;
        return `${(error as Error).message} ${cause instanceof Error ? cause.message : ""}`;
    }
    return "resolved without error";
}

const latest = journal.entries[journal.entries.length - 1]!;

describe("migration files", () => {
    it("journal timestamps strictly increase (drizzle skips a migration older than the last applied one)", () => {
        for (let i = 1; i < journal.entries.length; i++) {
            expect(journal.entries[i]!.when).toBeGreaterThan(journal.entries[i - 1]!.when);
            expect(journal.entries[i]!.idx).toBe(i);
        }
    });

    it("schema.ts matches the latest migration snapshot (run npm run db:generate after a schema change)", () => {
        const latestSnapshot = snapshot(latest.idx);
        const fromCode: Record<string, string[]> = {};
        for (const value of Object.values(schemaModule)) {
            if (is(value, PgTable)) {
                const config = getTableConfig(value);
                fromCode[config.name] = config.columns.map((c) => c.name).sort();
            }
        }
        const fromSnapshot: Record<string, string[]> = {};
        for (const table of Object.values(latestSnapshot.tables)) {
            fromSnapshot[table.name] = Object.keys(table.columns).sort();
        }
        expect(fromCode).toEqual(fromSnapshot);
    });
});

describe.skipIf(skip)("migrations", () => {
    it("(a) fresh install: every migration applies to an empty database and gives the snapshot's schema", async () => {
        const { url, sql } = await freshDatabase();
        const run = runMigrateScript(url);
        expect(run.output).toContain("Database migrations applied.");
        expect(run.status).toBe(0);

        const latestSnapshot = snapshot(latest.idx);
        const expectedTables = Object.values(latestSnapshot.tables)
            .map((t) => t.name)
            .sort();
        expect(await publicTables(sql)).toEqual(expectedTables);

        // Columns and nullability of every table.
        const columns = await sql<{ table: string; column: string; nullable: string }[]>`
            select table_name as table, column_name as column, is_nullable as nullable
            from information_schema.columns where table_schema = 'public'`;
        for (const table of Object.values(latestSnapshot.tables)) {
            const actual = columns.filter((c) => c.table === table.name);
            expect(actual.map((c) => c.column).sort(), table.name).toEqual(Object.keys(table.columns).sort());
            for (const column of Object.values(table.columns)) {
                const found = actual.find((c) => c.column === column.name);
                expect(found?.nullable, `${table.name}.${column.name}`).toBe(column.notNull ? "NO" : "YES");
            }
        }

        // Enums and their values, in order.
        const enums = await sql<{ name: string; values: string[] }[]>`
            select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values
            from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
            where n.nspname = 'public' group by t.typname`;
        const expectedEnums = Object.fromEntries(Object.values(latestSnapshot.enums).map((e) => [e.name, e.values]));
        expect(Object.fromEntries(enums.map((e) => [e.name, e.values]))).toEqual(expectedEnums);

        // Bookkeeping: one row per journal entry, recorded the way drizzle does it.
        const applied = await appliedMigrations(sql);
        expect(applied).toHaveLength(journal.entries.length);
        applied.forEach((row, i) => {
            const entry = journal.entries[i]!;
            expect(Number(row.created_at), entry.tag).toBe(entry.when);
            expect(row.hash, entry.tag).toBe(migrationHash(entry.tag));
        });
    }, 90_000);

    it("(c) idempotency: running the migration script again changes nothing", async () => {
        const { url, sql } = await freshDatabase();
        expect(runMigrateScript(url).status).toBe(0);
        await insertSampleData(sql);
        const before = { applied: await appliedMigrations(sql), schema: await schemaFingerprint(sql) };

        const second = runMigrateScript(url);
        expect(second.status).toBe(0);
        expect(await appliedMigrations(sql)).toEqual(before.applied);
        expect(await schemaFingerprint(sql)).toBe(before.schema);

        // The in-process migrator (as used by build/cli/migrate.js) is a no-op too.
        await migrateWith(url);
        expect(await appliedMigrations(sql)).toEqual(before.applied);
    }, 90_000);

    it("(b) upgrade: data written under 0000_init survives the later migrations, new columns get their defaults", async () => {
        const first = journal.entries[0]!;
        expect(first.tag).toBe("0000_init");
        const { url, sql } = await freshDatabase();

        await migrateWith(url, migrationsFolderWith(1));
        expect(await appliedMigrations(sql)).toHaveLength(1);
        await insertSampleData(sql);

        // Every row of every table, as it was under 0000_init.
        const initialSnapshot = snapshot(first.idx);
        const before: Record<string, unknown[]> = {};
        for (const table of Object.values(initialSnapshot.tables)) {
            const columns = Object.keys(table.columns);
            before[table.name] = await sql.unsafe(
                `select ${columns.map((c) => `"${c}"`).join(", ")} from "${table.name}" order by ${columns.map((c) => `"${c}"::text`).join(", ")}`,
            );
        }

        await migrateWith(url);
        expect(await appliedMigrations(sql)).toHaveLength(journal.entries.length);

        // Data preserved: same rows, same values, for every column that existed before.
        for (const table of Object.values(initialSnapshot.tables)) {
            const columns = Object.keys(table.columns);
            const after = await sql.unsafe(
                `select ${columns.map((c) => `"${c}"`).join(", ")} from "${table.name}" order by ${columns.map((c) => `"${c}"::text`).join(", ")}`,
            );
            expect(after, table.name).toEqual(before[table.name]);
        }

        // Columns deliberately backfilled by a migration, checked on their own below.
        const BACKFILLED = new Set(["accounts.email_verified_at", "worlds.workspace_id"]);

        // Columns added after 0000_init: existing rows hold the column default (or NULL without one).
        const latestSnapshot = snapshot(latest.idx);
        let checked = 0;
        for (const table of Object.values(latestSnapshot.tables)) {
            const old = initialSnapshot.tables[`public.${table.name}`];
            if (!old) continue;
            for (const column of Object.values(table.columns)) {
                if (old.columns[column.name] || BACKFILLED.has(`${table.name}.${column.name}`)) continue;
                const fallback = column.default === undefined ? "null" : String(column.default);
                if (/now\(\)|random/i.test(fallback)) continue; // volatile: value depends on the migration time
                const [row] = await sql.unsafe<{ wrong: string }[]>(
                    `select count(*) as wrong from "${table.name}" where "${column.name}" is distinct from (${fallback})`,
                );
                expect(Number(row?.wrong), `${table.name}.${column.name} = ${fallback}`).toBe(0);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(0);

        // 0002: accounts created before email verification count as verified (they were created by
        // administrators), and every world lands in its organization's new "main" workspace.
        const [unverified] = await sql<{ n: string }[]>`
            select count(*) as n from accounts where email_verified_at is distinct from created_at`;
        expect(Number(unverified?.n)).toBe(0);
        const [misplaced] = await sql<{ n: string }[]>`
            select count(*) as n from worlds w left join workspaces s on s.id = w.workspace_id
            where s.id is null or s.organization_id <> w.organization_id or s.slug <> 'main'`;
        expect(Number(misplaced?.n)).toBe(0);
        const [workspaceCount] = await sql<{ n: string }[]>`
            select count(*) as n from workspaces where name = 'Espace principal'`;
        expect(Number(workspaceCount?.n), "named in the organization's language (fr-FR)").toBe(1);

        // Explicit expectations for 0001_auth_hardening.
        const accounts = await sql<
            {
                totp_failed_count: number;
                must_change_password: boolean;
                totp_last_step: number | null;
                totp_locked_until: Date | null;
            }[]
        >`select totp_failed_count, must_change_password, totp_last_step, totp_locked_until from accounts`;
        expect(accounts).toHaveLength(2);
        for (const account of accounts) {
            expect(account).toEqual({
                totp_failed_count: 0,
                must_change_password: false,
                totp_last_step: null,
                totp_locked_until: null,
            });
        }
        expect(await sql`select 1 from rate_limits`).toHaveLength(0);
        expect(await sql`select 1 from recovery_codes`).toHaveLength(0);
        // The new foreign key works against pre-existing accounts, and cascades.
        await sql`insert into recovery_codes (account_id, code_hash) values ('00000000-0000-4000-8000-000000000002', ${"b".repeat(64)})`;
        await sql`delete from accounts where id = '00000000-0000-4000-8000-000000000002'`;
        expect(await sql`select 1 from recovery_codes`).toHaveLength(0);
    }, 90_000);

    it("(d) a migration failing halfway leaves the database at the previous version, and can be retried", async () => {
        const { url, sql } = await freshDatabase();
        await migrateWith(url, migrationsFolderWith(1));
        const schemaAtFirst = await schemaFingerprint(sql);

        // The last migration runs some statements, then fails.
        const broken = migrationsFolderWith(journal.entries.length, "select 1/0;");
        expect(await failureOf(migrateWith(url, broken))).toMatch(/division by zero/);

        expect(await appliedMigrations(sql)).toHaveLength(1);
        expect(await schemaFingerprint(sql)).toBe(schemaAtFirst);
        expect(await publicTables(sql)).not.toContain("rate_limits");

        await migrateWith(url);
        expect(await appliedMigrations(sql)).toHaveLength(journal.entries.length);
        expect(await publicTables(sql)).toContain("rate_limits");
    }, 90_000);

    it("(d) every pending migration of one run shares a single transaction", async () => {
        const { url, sql } = await freshDatabase();
        const broken = migrationsFolderWith(journal.entries.length, "select 1/0;");
        expect(await failureOf(migrateWith(url, broken))).toMatch(/division by zero/);

        // 0000_init succeeded on its own but was rolled back with the failing migration.
        expect(await appliedMigrations(sql)).toHaveLength(0);
        expect(await publicTables(sql)).toEqual([]);

        await migrateWith(url);
        expect(await appliedMigrations(sql)).toHaveLength(journal.entries.length);
    }, 90_000);
});
