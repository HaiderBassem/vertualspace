/**
 * Health checks shown to superadmins: this admin, its database, and its connection to WorkAdventure.
 * Each check has its own timeout so that one unreachable service does not block the page.
 */
import { openSecret } from "./secrets";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { WORKADVENTURE_CONTRACT_COMMIT } from "../../contract/workadventure";
import { dispatchAdminApi } from "../adminApi/routes";
import { db } from "../db/client";
import { getInstanceSettings } from "./instance";
import { adminSocketEnabled, fetchRoomOccupancy, PusherUnavailableError } from "./pusher";
import { describeError, logJson } from "../security/requestLog";
import { version } from "../../../../package.json";

export type CheckState = "ok" | "failed" | "notConfigured";

/**
 * Why a check failed, as a code the page translates (platform.status.problems). The technical detail
 * (URLs, English library messages) only goes to the server log: pages never show server diagnostics.
 */
export type CheckProblem =
    | { code: "timeout"; seconds: number }
    | { code: "http"; status: number }
    | { code: "unreachable" | "invalidAnswer" | "failed" };

export interface SystemStatus {
    version: string;
    contractCommit: string;
    database: { state: CheckState; problem?: CheckProblem };
    migrations: { state: CheckState; applied: number; known: number };
    pusher: { state: CheckState; rooms: number; people: number; problem?: CheckProblem };
    mapStorage: { state: CheckState; url?: string; problem?: CheckProblem };
    adminSocket: { state: CheckState };
    capabilities: Record<string, string>;
}

const TIMEOUT_MS = 4_000;

class CheckTimeoutError extends Error {
    constructor() {
        super(`Timed out after ${TIMEOUT_MS} ms`);
        this.name = "TimeoutError";
    }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new CheckTimeoutError()), TIMEOUT_MS)),
    ]);
}

/** Translatable reason of a failed check; the error itself is logged for operators. */
export function checkProblem(
    check: string,
    error: unknown,
    fallback: "unreachable" | "failed" = "failed",
): CheckProblem {
    logJson("warn", "system status check failed", { check, error: describeError(error) });
    const timeout = { code: "timeout" as const, seconds: TIMEOUT_MS / 1000 };
    if (error instanceof PusherUnavailableError) {
        if (error.reason === "timeout") return timeout;
        if (error.reason === "http" && error.httpStatus !== undefined)
            return { code: "http", status: error.httpStatus };
        if (error.reason === "invalidAnswer") return { code: "invalidAnswer" };
        return { code: "unreachable" };
    }
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return timeout;
    return { code: fallback };
}

async function knownMigrations(): Promise<number> {
    try {
        const journal = JSON.parse(await readFile(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
            entries?: unknown[];
        };
        return journal.entries?.length ?? 0;
    } catch {
        return 0;
    }
}

export async function systemStatus(): Promise<SystemStatus> {
    const instance = await getInstanceSettings();

    const database = withTimeout(db().execute(sql`select 1`))
        .then(() => ({ state: "ok" as CheckState }))
        .catch((error: unknown) => ({ state: "failed" as CheckState, problem: checkProblem("database", error) }));

    const migrations = Promise.all([
        withTimeout(db().execute(sql`select count(*)::int as count from drizzle.__drizzle_migrations`))
            .then((rows) => Number((rows as unknown as { count: number }[])[0]?.count ?? 0))
            .catch(() => 0),
        knownMigrations(),
    ]).then(([applied, known]) => ({
        state: (known > 0 && applied >= known ? "ok" : "failed") as CheckState,
        applied,
        known,
    }));

    const pusher =
        instance.playUrl || instance.pusherInternalUrl
            ? withTimeout(fetchRoomOccupancy(0))
                  .then((rooms) => ({
                      state: "ok" as CheckState,
                      rooms: Object.keys(rooms).length,
                      people: Object.values(rooms).reduce((sum, count) => sum + count, 0),
                  }))
                  .catch((error: unknown) =>
                      error instanceof PusherUnavailableError && error.reason === "notConfigured"
                          ? { state: "notConfigured" as CheckState, rooms: 0, people: 0 }
                          : {
                                state: "failed" as CheckState,
                                rooms: 0,
                                people: 0,
                                problem: checkProblem("pusher", error),
                            },
                  )
            : Promise.resolve({ state: "notConfigured" as CheckState, rooms: 0, people: 0 });

    const mapStorageUrl = (instance.mapStorageInternalUrl ?? instance.mapStoragePublicUrl)?.replace(/\/+$/, "");
    const mapStorageToken = openSecret(instance.mapStorageApiToken);
    const mapStorage = mapStorageUrl
        ? fetch(`${mapStorageUrl}/maps`, {
              headers: mapStorageToken ? { authorization: `Bearer ${mapStorageToken}` } : {},
              signal: AbortSignal.timeout(TIMEOUT_MS),
          })
              .then((response) =>
                  response.ok
                      ? { state: "ok" as CheckState, url: mapStorageUrl }
                      : {
                            state: "failed" as CheckState,
                            url: mapStorageUrl,
                            problem: { code: "http", status: response.status } satisfies CheckProblem,
                        },
              )
              .catch((error: unknown) => ({
                  state: "failed" as CheckState,
                  url: mapStorageUrl,
                  // fetch() rejects with "TypeError: fetch failed" when the server cannot be reached.
                  problem: checkProblem("mapStorage", error, "unreachable"),
              }))
        : Promise.resolve({ state: "notConfigured" as CheckState });

    // Exactly what WorkAdventure receives when it asks.
    const capabilities = dispatchAdminApi(new Request("http://adminspace.internal/api/capabilities"), undefined)
        .then((response) => response.json() as Promise<Record<string, string>>)
        .catch(() => ({}));

    return {
        version,
        contractCommit: WORKADVENTURE_CONTRACT_COMMIT,
        database: await database,
        migrations: await migrations,
        pusher: await pusher,
        mapStorage: await mapStorage,
        adminSocket: { state: adminSocketEnabled() ? "ok" : "notConfigured" },
        capabilities: await capabilities,
    };
}
