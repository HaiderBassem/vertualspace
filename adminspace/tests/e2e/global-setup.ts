/**
 * Global setup of the end-to-end run:
 *  1. creates a dedicated database adminspace_e2e_<random> in the development PostgreSQL;
 *  2. applies the migrations and imports the avatar catalog from ../workadventure (scripts/*.ts);
 *  3. writes the fixtures (accounts of every role, two organizations with worlds, rooms, members,
 *     tags, a ban, a report, an API key and a domain each);
 *  4. starts the fakes of external services (tests/e2e/support/fakes.ts): an SMTP sink and a map-storage;
 *  5. starts three production servers (NODE_ENV=production, node build/index.js):
 *     - "main": rate limits disabled except where hard-coded, so that tests do not throttle each other;
 *     - "strict": low rate limits and X-Forwarded-For client addresses, so that each rate-limit test
 *       uses its own client address and counters;
 *     - "enterprise": SMTP to the sink, the background job worker and the fake map-storage, for the
 *       enterprise journeys (the other two run no job worker, so that every job meets the fake).
 * Secrets are random for every run. global-teardown.ts stops the servers and drops the database.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import postgres from "postgres";
import { seedFixtures } from "./support/fixtures";
import { OUTPUT_DIR, STATE_FILE, type E2EState } from "./support/state";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BUILD = path.join(OUTPUT_DIR, "build/index.js");
const ADMIN_DATABASE_URL =
    process.env.E2E_ADMIN_DATABASE_URL ?? "postgres://adminspace:adminspace@localhost:5433/postgres";

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            server.close(() =>
                typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port")),
            );
        });
    });
}

function run(script: string, env: NodeJS.ProcessEnv): void {
    const result = spawnSync("npx", ["tsx", script], { cwd: ROOT, env, encoding: "utf8" });
    if (result.status !== 0) {
        throw new Error(`${script} failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
    }
}

async function waitForHealth(url: string, healthPath = "/healthz", timeoutMs = 30_000): Promise<void> {
    const end = Date.now() + timeoutMs;
    let last = "";
    while (Date.now() < end) {
        try {
            const response = await fetch(`${url}${healthPath}`);
            if (response.ok) return;
            last = `HTTP ${response.status}`;
        } catch (error) {
            last = String(error);
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`server ${url} not healthy: ${last}`);
}

export default async function globalSetup(): Promise<void> {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!existsSync(BUILD)) {
        // `npm run test:e2e` builds first; a bare `npx playwright test` reuses the last copy, or makes one.
        const result = spawnSync("npx", ["tsx", "scripts/e2e-build.ts"], { cwd: ROOT, stdio: "inherit" });
        if (result.status !== 0) throw new Error("e2e build failed");
    }

    const databaseName = `adminspace_e2e_${randomBytes(6).toString("hex")}`;
    const adminUrl = new URL(ADMIN_DATABASE_URL);
    const databaseUrl = new URL(ADMIN_DATABASE_URL);
    databaseUrl.pathname = `/${databaseName}`;

    const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
    await admin.unsafe(`create database "${databaseName}"`);
    await admin.end();

    const adminApiToken = randomBytes(32).toString("base64url");
    const appSecret = randomBytes(32).toString("base64url");
    const password = `E2e-${randomBytes(12).toString("base64url")}`;
    const playUrl = "http://play.e2e.test";

    const baseEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        DATABASE_URL: databaseUrl.toString(),
        ADMIN_API_TOKEN: adminApiToken,
        APP_SECRET: appSecret,
        TZ: "UTC",
    };

    try {
        run("scripts/migrate.ts", { ...baseEnv, NODE_ENV: "test" });
        run("scripts/catalog-import.ts", { ...baseEnv, NODE_ENV: "test" });
        run("scripts/seed.ts", {
            ...baseEnv,
            NODE_ENV: "test",
            WORKADVENTURE_REPO: process.env.WORKADVENTURE_REPO ?? path.resolve(ROOT, "../workadventure"),
        });

        const [mainPort, strictPort, enterprisePort, smtpPort, mapPort] = [
            await freePort(),
            await freePort(),
            await freePort(),
            await freePort(),
            await freePort(),
        ];
        const mapStorageURL = `http://127.0.0.1:${mapPort}`;
        const mapToken = randomBytes(24).toString("base64url");
        const mailDir = path.join(OUTPUT_DIR, `mail-${databaseName}`);

        const sql = postgres(databaseUrl.toString(), { max: 1, onnotice: () => {} });
        const fixtures = await seedFixtures(sql, { password, appSecret, playUrl, mapStorageURL });
        await sql.end();

        const serverEnv = (port: number, extra: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({
            ...baseEnv,
            NODE_ENV: "production",
            PORT: String(port),
            HOST: "127.0.0.1",
            ORIGIN: `http://localhost:${port}`,
            BODY_SIZE_LIMIT: "2M",
            LOG_REQUESTS: "true",
            SESSION_MAX_PER_ACCOUNT: "1000",
            DEFAULT_LOCALE: "en-US",
            // Unroutable on purpose: pages that ask WorkAdventure for live data must degrade quickly.
            WORKADVENTURE_PLAY_URL: playUrl,
            WORKADVENTURE_PUSHER_INTERNAL_URL: "http://127.0.0.1:9",
            WORKADVENTURE_MAP_STORAGE_PUBLIC_URL: "http://127.0.0.1:9",
            WORKADVENTURE_MAP_STORAGE_INTERNAL_URL: "http://127.0.0.1:9",
            ...extra,
        });
        const servers = [
            {
                name: "main",
                port: mainPort,
                env: serverEnv(mainPort, {
                    JOB_WORKER: "false",
                    RATE_LIMIT_ADMIN_API_PER_MINUTE: "0",
                    RATE_LIMIT_LOGIN_PER_IP: "0",
                    RATE_LIMIT_LOGIN_PER_ACCOUNT: "0",
                    RATE_LIMIT_MFA_PER_IP: "0",
                    RATE_LIMIT_SENSITIVE_PER_ACCOUNT: "0",
                }),
            },
            {
                name: "strict",
                port: strictPort,
                env: serverEnv(strictPort, {
                    JOB_WORKER: "false",
                    ADDRESS_HEADER: "X-Forwarded-For",
                    XFF_DEPTH: "1",
                    RATE_LIMIT_ADMIN_API_PER_MINUTE: "5",
                    RATE_LIMIT_LOGIN_PER_IP: "3",
                    RATE_LIMIT_LOGIN_PER_ACCOUNT: "1000",
                    RATE_LIMIT_MFA_PER_IP: "3",
                }),
            },
        ];
        servers.push({
            name: "enterprise",
            port: enterprisePort,
            env: serverEnv(enterprisePort, {
                JOB_WORKER: "true",
                SMTP_URL: `smtp://127.0.0.1:${smtpPort}`,
                MAIL_FROM: "AdminSpace <no-reply@e2e.test>",
                WORKADVENTURE_MAP_STORAGE_PUBLIC_URL: mapStorageURL,
                WORKADVENTURE_MAP_STORAGE_INTERNAL_URL: mapStorageURL,
                WORKADVENTURE_MAP_STORAGE_API_TOKEN: mapToken,
                RATE_LIMIT_ADMIN_API_PER_MINUTE: "0",
                RATE_LIMIT_LOGIN_PER_IP: "0",
                RATE_LIMIT_LOGIN_PER_ACCOUNT: "0",
                RATE_LIMIT_MFA_PER_IP: "0",
                RATE_LIMIT_SENSITIVE_PER_ACCOUNT: "0",
                RATE_LIMIT_REGISTRATION_PER_IP: "0",
                RATE_LIMIT_INVITATIONS_PER_ORGANIZATION: "0",
            }),
        });
        const pids: number[] = [];
        {
            const log = openSync(path.join(OUTPUT_DIR, "fakes.log"), "w");
            const child = spawn(process.execPath, ["--import", "tsx", "tests/e2e/support/fakes.ts"], {
                cwd: ROOT,
                env: {
                    PATH: process.env.PATH,
                    SMTP_PORT: String(smtpPort),
                    MAP_PORT: String(mapPort),
                    MAP_TOKEN: mapToken,
                    MAIL_DIR: mailDir,
                },
                stdio: ["ignore", log, log],
            });
            closeSync(log);
            if (!child.pid) throw new Error("fakes did not start");
            child.unref();
            pids.push(child.pid);
        }
        for (const server of servers) {
            const log = openSync(path.join(OUTPUT_DIR, `server-${server.name}.log`), "w");
            const child = spawn(process.execPath, [BUILD], {
                cwd: ROOT,
                env: server.env,
                stdio: ["ignore", log, log],
            });
            closeSync(log);
            if (!child.pid) throw new Error(`server ${server.name} did not start`);
            child.unref();
            pids.push(child.pid);
        }

        const state: E2EState = {
            baseURL: `http://localhost:${mainPort}`,
            strictURL: `http://localhost:${strictPort}`,
            databaseUrl: databaseUrl.toString(),
            databaseName,
            adminApiToken,
            appSecret,
            password,
            playUrl,
            enterpriseURL: `http://localhost:${enterprisePort}`,
            mapStorageURL,
            mailDir,
            ...fixtures,
            serverPids: pids,
        };
        writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
        process.env.E2E_BASE_URL = state.baseURL;

        await Promise.all([
            waitForHealth(state.baseURL),
            waitForHealth(state.strictURL),
            waitForHealth(state.enterpriseURL),
            waitForHealth(state.mapStorageURL, "/__control/health"),
        ]);
    } catch (error) {
        // Leave nothing behind when the setup itself fails.
        const { default: teardown } = await import("./global-teardown");
        await teardown().catch(() => {});
        const cleanup = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
        await cleanup.unsafe(`drop database if exists "${databaseName}" with (force)`).catch(() => {});
        await cleanup.end();
        throw error;
    }
}
