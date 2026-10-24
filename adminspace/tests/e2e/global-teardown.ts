/**
 * Stops the e2e servers and drops ONLY the database created by global-setup.ts for this run.
 * Set E2E_KEEP=1 to keep both for debugging (the state file then still points at them).
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import postgres from "postgres";
import { STATE_FILE, type E2EState } from "./support/state";

function alive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

export default async function globalTeardown(): Promise<void> {
    if (!existsSync(STATE_FILE) || process.env.E2E_KEEP === "1") return;
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;

    for (const pid of state.serverPids) {
        if (alive(pid)) process.kill(pid, "SIGTERM");
    }
    const end = Date.now() + 10_000;
    while (state.serverPids.some(alive) && Date.now() < end) await new Promise((r) => setTimeout(r, 100));
    for (const pid of state.serverPids.filter(alive)) process.kill(pid, "SIGKILL");

    // Safety: only ever drop a database this setup named.
    if (/^adminspace_e2e_[0-9a-f]{12}$/.test(state.databaseName)) {
        const url = new URL(state.databaseUrl);
        url.pathname = "/postgres";
        const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
        try {
            await sql.unsafe(`drop database if exists "${state.databaseName}" with (force)`);
        } finally {
            await sql.end();
        }
    }
    if (state.mailDir) rmSync(state.mailDir, { recursive: true, force: true });
    rmSync(STATE_FILE, { force: true });
}
