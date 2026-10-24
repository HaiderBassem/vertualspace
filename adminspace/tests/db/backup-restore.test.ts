/**
 * Backup and restore round trip with scripts/backup.sh and scripts/restore.sh.
 *
 * A temporary database is migrated with the real migration script, filled with sample rows, dumped,
 * then restored into other temporary databases; row counts and contents must match.
 *
 * Runs the scripts with local PostgreSQL client tools (pg_dump, pg_restore, psql of the server's major
 * version or newer) against DATABASE_URL. Without them, set BACKUP_TEST_CONTAINER=<postgres container>
 * to run the tools inside that container (docker exec), e.g. BACKUP_TEST_CONTAINER=adminspace-db-1 for
 * the development database of docker-compose.yaml. Otherwise the suite is skipped with the reason.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    appendFileSync,
    copyFileSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import {
    createDatabase,
    dropDatabases,
    insertSampleData,
    probeServer,
    ROOT,
    rowCounts,
    tempDatabaseName,
    unavailable,
    urlForDatabase,
} from "./helpers";

const BACKUP = path.join(ROOT, "scripts", "backup.sh");
const RESTORE = path.join(ROOT, "scripts", "restore.sh");

function toolMajor(tool: string): number | undefined {
    const result = spawnSync(tool, ["--version"], { encoding: "utf8" });
    const match = result.status === 0 ? /(\d+)(?:\.\d+)?/.exec(result.stdout) : null;
    return match ? Number(match[1]) : undefined;
}

const probe = await probeServer();
const container = process.env.BACKUP_TEST_CONTAINER || undefined;

function whyUnavailable(): string | undefined {
    if (!probe.ok) return probe.reason;
    if (spawnSync("bash", ["--version"]).status !== 0) return "bash is not available";
    if (container) {
        const inspect = spawnSync("docker", ["exec", container, "pg_dump", "--version"], { encoding: "utf8" });
        return inspect.status === 0
            ? undefined
            : `cannot run pg_dump in container ${container} (${inspect.stderr.trim()})`;
    }
    for (const tool of ["pg_dump", "pg_restore", "psql"]) {
        const major = toolMajor(tool);
        if (major === undefined || major < probe.serverMajor) {
            return (
                `${tool} ${major ?? "not found"} on PATH; PostgreSQL ${probe.serverMajor} client tools are needed ` +
                "(or set BACKUP_TEST_CONTAINER=<postgres container>)"
            );
        }
    }
    return undefined;
}

const reason = whyUnavailable();
const skip = reason !== undefined && unavailable("backup-restore", reason);
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

function connect(name: string): postgres.Sql {
    if (!probe.ok) throw new Error("no server");
    const sql = postgres(urlForDatabase(probe.url, name), { max: 2, onnotice: () => {} });
    clients.push(sql);
    return sql;
}

/** Connection options of the scripts for database `name`, in the selected mode. */
function target(name: string): string[] {
    if (!probe.ok) throw new Error("no server");
    return container
        ? ["--container", container, "--dbname", name]
        : ["--database-url", urlForDatabase(probe.url, name)];
}

function run(script: string, args: string[]) {
    const result = spawnSync("bash", [script, ...args], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function sha256(file: string): string {
    return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Every row of every table, as JSON, in a stable order. */
async function contents(sql: postgres.Sql): Promise<Record<string, string[]>> {
    const tables = await sql<{ schema: string; name: string }[]>`
        select table_schema as schema, table_name as name from information_schema.tables
        where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE' order by 1, 2`;
    const result: Record<string, string[]> = {};
    for (const { schema, name } of tables) {
        const rows = await sql.unsafe<{ row: string }[]>(
            `select to_jsonb(t)::text as row from "${schema}"."${name}" t order by 1`,
        );
        result[`${schema}.${name}`] = rows.map((r) => r.row);
    }
    return result;
}

describe.skipIf(skip)("backup and restore scripts", () => {
    it("dump, checksum, prune, restore into empty and non-empty databases", async () => {
        if (!probe.ok) throw new Error("no server");
        // 1. Source database: migrated with the real migration script, then filled.
        const source = tempDatabaseName("bkp", "src");
        created.add(source);
        await createDatabase(probe.admin, source);
        const migrate = spawnSync(
            process.execPath,
            [path.join(ROOT, "node_modules/tsx/dist/cli.mjs"), "scripts/migrate.ts"],
            {
                cwd: ROOT,
                env: { ...process.env, DATABASE_URL: urlForDatabase(probe.url, source) },
                encoding: "utf8",
                timeout: 60_000,
            },
        );
        expect(migrate.stdout + migrate.stderr).toContain("Database migrations applied.");
        const sourceSql = connect(source);
        await insertSampleData(sourceSql);
        const sourceCounts = await rowCounts(sourceSql);
        expect(sourceCounts["public.accounts"]).toBe(2);
        expect(sourceCounts["public.members"]).toBe(2);
        expect(sourceCounts["drizzle.__drizzle_migrations"]).toBeGreaterThan(0);

        // 2. Backups, with retention. One stale dump (by age) and one extra dump (by count) are pruned.
        const outputDir = mkdtempSync(path.join(tmpdir(), "adminspace-backups-"));
        const stale = path.join(outputDir, "adminspace_20200101T000000Z.dump");
        const extra = path.join(outputDir, "adminspace_20210101T000000Z.dump");
        for (const file of [stale, extra]) {
            writeFileSync(file, "not a real dump");
            writeFileSync(`${file}.sha256`, "x");
        }
        const fortyDaysAgo = new Date(Date.now() - 40 * 86_400_000);
        utimesSync(stale, fortyDaysAgo, fortyDaysAgo);
        writeFileSync(path.join(outputDir, "unrelated.txt"), "kept");

        const first = run(BACKUP, [
            ...target(source),
            "--output-dir",
            outputDir,
            "--keep",
            "5",
            "--max-age-days",
            "35",
        ]);
        expect(first.stderr).toContain("pruned adminspace_20200101T000000Z.dump (older than 35 days)");
        expect(first.status).toBe(0);
        const firstDump = first.stdout.trim();
        expect(path.basename(firstDump)).toMatch(/^adminspace_\d{8}T\d{6}Z\.dump$/);

        await new Promise((resolve) => setTimeout(resolve, 1_100)); // one dump per second at most
        const second = run(BACKUP, [
            ...target(source),
            "--output-dir",
            outputDir,
            "--keep",
            "2",
            "--max-age-days",
            "0",
        ]);
        expect(second.status).toBe(0);
        expect(second.stderr).toContain("pruned adminspace_20210101T000000Z.dump (beyond the 2 newest)");
        const dump = second.stdout.trim();

        expect(readdirSync(outputDir).sort()).toEqual(
            [
                path.basename(firstDump),
                `${path.basename(firstDump)}.sha256`,
                path.basename(dump),
                `${path.basename(dump)}.sha256`,
                "unrelated.txt",
            ].sort(),
        );
        expect(readFileSync(`${dump}.sha256`, "utf8")).toBe(`${sha256(dump)}  ${path.basename(dump)}\n`);

        // 3. Restore into an empty database.
        const restored = tempDatabaseName("bkp", "dst");
        created.add(restored);
        await createDatabase(probe.admin, restored);
        const restore = run(RESTORE, [...target(restored), dump]);
        expect(restore.stderr).toContain("checksum OK");
        expect(restore.status).toBe(0);
        expect(restore.stdout).toContain("public.accounts\t2");
        const restoredSql = connect(restored);
        expect(await rowCounts(restoredSql)).toEqual(sourceCounts);
        expect(await contents(restoredSql)).toEqual(await contents(sourceSql));

        // 4. A non-empty target is refused without --force, and left untouched.
        await restoredSql`delete from reports`;
        const refused = run(RESTORE, [...target(restored), dump]);
        expect(refused.status).not.toBe(0);
        expect(refused.stderr).toContain("is not empty");
        expect((await rowCounts(restoredSql))["public.reports"]).toBe(0);

        // 5. --force replaces everything.
        const forced = run(RESTORE, [...target(restored), "--force", dump]);
        expect(forced.status).toBe(0);
        expect(await rowCounts(restoredSql)).toEqual(sourceCounts);

        // 6. --create makes the target database.
        const createdTarget = tempDatabaseName("bkp", "new");
        created.add(createdTarget);
        const withCreate = run(RESTORE, [...target(createdTarget), "--create", firstDump]);
        expect(withCreate.stderr).toContain(`created database ${createdTarget}`);
        expect(withCreate.status).toBe(0);
        expect(await rowCounts(connect(createdTarget))).toEqual(sourceCounts);

        // 7. A corrupted dump is refused before anything is touched.
        const corrupted = path.join(outputDir, "corrupted.dump");
        copyFileSync(dump, corrupted);
        writeFileSync(`${corrupted}.sha256`, `${sha256(dump)}  corrupted.dump\n`);
        appendFileSync(corrupted, "x");
        const neverCreated = tempDatabaseName("bkp", "bad");
        created.add(neverCreated); // dropped if the script wrongly created it
        const tampered = run(RESTORE, [...target(neverCreated), "--create", corrupted]);
        expect(tampered.status).not.toBe(0);
        expect(tampered.stderr).toContain("checksum mismatch");
    }, 180_000);
});
