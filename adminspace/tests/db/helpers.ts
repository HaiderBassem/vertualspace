/**
 * Shared helpers of the database lifecycle tests (tests/db).
 *
 * They need a PostgreSQL server where the role of DATABASE_URL (or TEST_ADMIN_DATABASE_URL) may
 * CREATE DATABASE. Every test works in its own temporary database named adminspace_<kind>_<random>,
 * and drops only the databases it created. When the server cannot be used, the suites are skipped with
 * the reason, unless REQUIRE_DB_LIFECYCLE_TESTS=true (CI), where they fail instead.
 */
import { createHash, randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const MIGRATIONS_FOLDER = path.join(ROOT, "drizzle");

export interface JournalEntry {
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
}

export const journal: { entries: JournalEntry[] } = JSON.parse(
    readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
);

export interface SnapshotColumn {
    name: string;
    type: string;
    primaryKey: boolean;
    notNull: boolean;
    default?: string | number | boolean;
}
export interface Snapshot {
    tables: Record<string, { name: string; schema: string; columns: Record<string, SnapshotColumn> }>;
    enums: Record<string, { name: string; schema: string; values: string[] }>;
}

/** drizzle-kit's snapshot of the schema after migration `idx`. */
export function snapshot(idx: number): Snapshot {
    const file = path.join(MIGRATIONS_FOLDER, "meta", `${String(idx).padStart(4, "0")}_snapshot.json`);
    return JSON.parse(readFileSync(file, "utf8"));
}

export function migrationSql(tag: string): string {
    return readFileSync(path.join(MIGRATIONS_FOLDER, `${tag}.sql`), "utf8");
}

/** How drizzle identifies an applied migration: SHA-256 of the whole SQL file. */
export function migrationHash(tag: string): string {
    return createHash("sha256").update(migrationSql(tag)).digest("hex");
}

/**
 * A copy of the migrations folder holding only the first `count` migrations, optionally with extra SQL
 * appended to the last one (to simulate a failure in the middle of a migration).
 */
export function migrationsFolderWith(count: number, appendToLast?: string): string {
    const folder = mkdtempSync(path.join(tmpdir(), "adminspace-migrations-"));
    mkdirSync(path.join(folder, "meta"));
    const entries = journal.entries.slice(0, count);
    for (const [index, entry] of entries.entries()) {
        const target = path.join(folder, `${entry.tag}.sql`);
        cpSync(path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), target);
        if (appendToLast && index === entries.length - 1) {
            writeFileSync(target, `${migrationSql(entry.tag)}\n--> statement-breakpoint\n${appendToLast}\n`);
        }
    }
    writeFileSync(path.join(folder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries }, null, 2));
    return folder;
}

/** Runs drizzle's postgres-js migrator (the one scripts/migrate.ts uses) against `url`. */
export async function migrateWith(url: string, folder = MIGRATIONS_FOLDER): Promise<void> {
    const client = postgres(url, { max: 1, onnotice: () => {} });
    try {
        await migrate(drizzle(client), { migrationsFolder: folder });
    } finally {
        await client.end({ timeout: 5 });
    }
}

// --- Server and temporary databases ---------------------------------------------------------

/** URL of a database on the test server, used to create and drop the temporary ones. */
export function serverUrl(): string | undefined {
    return process.env.TEST_ADMIN_DATABASE_URL || process.env.DATABASE_URL || undefined;
}

export function urlForDatabase(base: string, database: string): string {
    const url = new URL(base);
    url.pathname = `/${database}`;
    return url.toString();
}

/** Only names matching this are ever dropped by the tests. */
export const TEMP_DATABASE = /^adminspace_(mig|bkp|rdy)_[a-z0-9]{8}(_[a-z0-9]+)?$/;

export function tempDatabaseName(kind: "mig" | "bkp" | "rdy", suffix?: string): string {
    const name = `adminspace_${kind}_${randomBytes(4).toString("hex")}${suffix ? `_${suffix}` : ""}`;
    if (!TEMP_DATABASE.test(name)) throw new Error(`invalid temporary database name ${name}`);
    return name;
}

export type Probe = { ok: true; url: string; admin: postgres.Sql; serverMajor: number } | { ok: false; reason: string };

/** Connects to the test server and checks that the role may create databases. */
export async function probeServer(): Promise<Probe> {
    const url = serverUrl();
    if (!url) return { ok: false, reason: "DATABASE_URL is not set" };
    const admin = postgres(url, { max: 2, connect_timeout: 5, onnotice: () => {} });
    try {
        const [row] = await admin<{ version: string; can_create: boolean }[]>`
            select current_setting('server_version_num') as version,
                   (select rolcreatedb or rolsuper from pg_roles where rolname = current_user) as can_create`;
        if (!row?.can_create) {
            await admin.end({ timeout: 5 });
            return { ok: false, reason: "the database role may not CREATE DATABASE" };
        }
        return { ok: true, url, admin, serverMajor: Math.floor(Number(row.version) / 10000) };
    } catch (error) {
        await admin.end({ timeout: 1 }).catch(() => {});
        return { ok: false, reason: `PostgreSQL unreachable (${(error as Error).message})` };
    }
}

/** Skips (or, with REQUIRE_DB_LIFECYCLE_TESTS=true, fails) with a clear message. */
export function unavailable(suite: string, reason: string): true {
    if (process.env.REQUIRE_DB_LIFECYCLE_TESTS === "true") {
        throw new Error(`[${suite}] required (REQUIRE_DB_LIFECYCLE_TESTS=true) but unavailable: ${reason}`);
    }
    process.stderr.write(`[${suite}] skipped: ${reason}\n`);
    return true;
}

export async function createDatabase(admin: postgres.Sql, name: string): Promise<void> {
    if (!TEMP_DATABASE.test(name)) throw new Error(`refusing to create ${name}`);
    await admin.unsafe(`create database "${name}"`);
}

/** Drops temporary databases created by the tests, and nothing else. */
export async function dropDatabases(admin: postgres.Sql, names: Iterable<string>): Promise<void> {
    for (const name of names) {
        if (!TEMP_DATABASE.test(name)) throw new Error(`refusing to drop ${name}: not a temporary test database`);
        await admin.unsafe(`drop database if exists "${name}" with (force)`);
    }
}

// --- Data ---------------------------------------------------------------------------------

/**
 * Representative rows, valid for the schema of 0000_init and every later one: accounts, organization,
 * membership, world, rooms, tags, members, ban, report, session, audit entry, instance settings.
 */
export async function insertSampleData(sql: postgres.Sql): Promise<void> {
    // Since 0002, every world belongs to a workspace of its organization.
    const [{ present } = { present: false }] = await sql<{ present: boolean }[]>`
        select to_regclass('public.workspaces') is not null as present`;
    const workspace = present
        ? {
              insert: `insert into workspaces (id, organization_id, slug, name)
                       values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000010', 'main', 'Main');`,
              column: ", workspace_id",
              value: ", '00000000-0000-4000-8000-000000000015'",
          }
        : { insert: "", column: "", value: "" };
    await sql.begin(async (tx) => {
        await tx.unsafe(`
            insert into accounts (id, email, name, password_hash, is_superadmin, locale, time_zone)
            values ('00000000-0000-4000-8000-000000000001', 'owner@example.com', 'Owner', '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA', true, 'fr-FR', 'Europe/Paris'),
                   ('00000000-0000-4000-8000-000000000002', 'mod@example.com', 'Moderator', '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA', false, null, null);
            insert into organizations (id, slug, name, country_code, default_locale, contact_email)
            values ('00000000-0000-4000-8000-000000000010', 'acme', 'Acme', 'FR', 'fr-FR', 'contact@example.com');
            insert into organization_memberships (organization_id, account_id, role)
            values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner'),
                   ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'moderator');
            ${workspace.insert}
            insert into worlds (id, organization_id, slug, name, access_policy, max_users, settings${workspace.column})
            values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'hq', 'Headquarters', 'members', 50,
                    '{"privacy": {"guestRetentionDays": 30}}'${workspace.value});
            insert into rooms (world_id, slug, name, map_kind, wam_url, is_default, required_tags, position)
            values ('00000000-0000-4000-8000-000000000020', 'lobby', 'Lobby', 'wam', 'https://maps.example.com/lobby.wam', true, '{}', 0),
                   ('00000000-0000-4000-8000-000000000020', 'vip', 'VIP', 'tmj', null, false, '{vip}', 1);
            insert into tags (id, world_id, name, color) values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000020', 'vip', '#ff0000');
            insert into members (id, world_id, uuid, kind, email, name, character_texture_ids, visit_count, last_seen_at)
            values ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000020', 'ada@example.com', 'member', 'ada@example.com', 'Ada', '{male1,eyes1}', 3, '2026-01-02T03:04:05Z'),
                   ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000020', 'guest-uuid-1', 'guest', null, 'Guest', '{}', 1, null);
            insert into member_tags (member_id, tag_id) values ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000030');
            insert into bans (world_id, member_uuid, ip_address, name, reason, banned_by, expires_at)
            values ('00000000-0000-4000-8000-000000000020', 'guest-uuid-1', '203.0.113.7', 'Guest', 'spam', 'owner@example.com', '2030-01-01T00:00:00Z');
            insert into reports (world_id, room_url, reported_uuid, reporter_uuid, comment)
            values ('00000000-0000-4000-8000-000000000020', 'https://play.example.com/@/acme/hq/lobby', 'guest-uuid-1', 'ada@example.com', 'rude');
            insert into sessions (id, account_id, expires_at, mfa_verified, ip_address, user_agent)
            values ('${"a".repeat(64)}', '00000000-0000-4000-8000-000000000001', '2030-01-01T00:00:00Z', true, '198.51.100.1', 'test');
            insert into audit_logs (account_id, actor_label, organization_id, world_id, action, target_type, target_id, ip_address, details)
            values ('00000000-0000-4000-8000-000000000001', 'owner@example.com', '00000000-0000-4000-8000-000000000010',
                    '00000000-0000-4000-8000-000000000020', 'ban.create', 'ban', 'guest-uuid-1', '198.51.100.1', '{"reason": "spam"}');
            insert into instance_settings (id, settings) values (1, '{"playUrl": "https://play.example.com"}');
        `);
    });
}

/** Exact row count of every table of the public and drizzle schemas. */
export async function rowCounts(sql: postgres.Sql): Promise<Record<string, number>> {
    const tables = await sql<{ schema: string; name: string }[]>`
        select table_schema as schema, table_name as name from information_schema.tables
        where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
        order by 1, 2`;
    const counts: Record<string, number> = {};
    for (const { schema, name } of tables) {
        const [row] = await sql.unsafe<{ count: string }[]>(`select count(*) as count from "${schema}"."${name}"`);
        counts[`${schema}.${name}`] = Number(row?.count ?? 0);
    }
    return counts;
}
