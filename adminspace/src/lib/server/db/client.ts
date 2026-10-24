import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let instance: { db: Database; sql: postgres.Sql } | undefined;

function connect(): { db: Database; sql: postgres.Sql } {
    if (!instance) {
        const sql = postgres(config().DATABASE_URL, {
            max: config().DB_POOL_MAX,
            // Fail fast when the database is unreachable (the default waits 30 s, longer than health checks).
            connect_timeout: 5,
            // Idle connections are closed, so a stopping server is not held open by its pool.
            idle_timeout: 30,
            max_lifetime: 30 * 60,
            // PostgreSQL NOTICE messages (e.g. during migrations) are not errors: keep them out of the logs.
            onnotice: () => undefined,
            connection: {
                // Every timestamp is exchanged in UTC; the session time zone must not shift them.
                TimeZone: "UTC",
                application_name: "adminspace",
                statement_timeout: 30_000,
                lock_timeout: 10_000,
                idle_in_transaction_session_timeout: 60_000,
            },
        });
        instance = { db: drizzle(sql, { schema }), sql };
    }
    return instance;
}

/** The shared Drizzle instance. Lazily connects so that importing this module has no side effect. */
export function db(): Database {
    return connect().db;
}

export async function closeDb(): Promise<void> {
    if (instance) {
        await instance.sql.end({ timeout: 5 });
        instance = undefined;
    }
}

export { schema };
