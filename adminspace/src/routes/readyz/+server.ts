import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db/client";

/** Readiness probe: the database answers, within 3 s (orchestrators' probe timeouts are often 5 s). */
export const GET: RequestHandler = async () => {
    try {
        await Promise.race([
            db().execute(sql`select 1`),
            new Promise((_, reject) => setTimeout(() => reject(new Error("readiness timeout")), 3_000).unref()),
        ]);
        return new Response("ready", { headers: { "content-type": "text/plain" } });
    } catch {
        return new Response("database unavailable", { status: 503, headers: { "content-type": "text/plain" } });
    }
};
