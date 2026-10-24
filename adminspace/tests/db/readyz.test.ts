/**
 * /readyz while the database goes away and comes back.
 *
 * The real handler (src/routes/readyz/+server.ts) and database client are loaded with DATABASE_URL
 * pointing at a local TCP relay in front of the test database. Closing the relay (and cutting its open
 * connections) simulates a database outage; reopening it simulates the recovery. The process is never
 * restarted, so the test also proves that the connection pool reconnects by itself.
 */
import net from "node:net";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { serverUrl, unavailable } from "./helpers";

const upstream = serverUrl();

async function reachable(url: string | undefined): Promise<string | undefined> {
    if (!url) return "DATABASE_URL is not set";
    const sql = postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} });
    try {
        await sql`select 1`;
        return undefined;
    } catch (error) {
        return `PostgreSQL unreachable (${(error as Error).message})`;
    } finally {
        await sql.end({ timeout: 1 }).catch(() => {});
    }
}

const reason = await reachable(upstream);
const skip = reason !== undefined && unavailable("readyz", reason);

/** A TCP relay to the database that can be switched off and on, on a fixed port. */
class Relay {
    private server: net.Server | undefined;
    private readonly sockets = new Set<net.Socket>();

    constructor(
        readonly port: number,
        private readonly target: { host: string; port: number },
    ) {}

    async open(): Promise<void> {
        const server = net.createServer((client) => {
            const db = net.connect(this.target.port, this.target.host);
            for (const socket of [client, db]) {
                this.sockets.add(socket);
                socket.on("close", () => this.sockets.delete(socket));
                socket.on("error", () => socket.destroy());
            }
            client.pipe(db).pipe(client);
            client.on("close", () => db.destroy());
            db.on("close", () => client.destroy());
        });
        await new Promise<void>((resolve, reject) => {
            server.once("error", reject);
            server.listen(this.port, "127.0.0.1", () => resolve());
        });
        this.server = server;
    }

    /** Stops listening and cuts every open connection: the database "disappears". */
    async close(): Promise<void> {
        const server = this.server;
        this.server = undefined;
        for (const socket of this.sockets) socket.destroy();
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }
}

async function freePort(): Promise<number> {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const { port } = server.address() as net.AddressInfo;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    return port;
}

let relay: Relay | undefined;
let closeDb: (() => Promise<void>) | undefined;

afterAll(async () => {
    await closeDb?.();
    await relay?.close();
});

describe.skipIf(skip)("/readyz and database connectivity loss", () => {
    it("answers 503 while the database is unreachable and 200 again once it is back, without a restart", async () => {
        const target = new URL(upstream!);
        relay = new Relay(await freePort(), { host: target.hostname, port: Number(target.port || 5432) });

        // Load the handler with a DATABASE_URL that goes through the relay (closed for now).
        const relayed = new URL(upstream!);
        relayed.hostname = "127.0.0.1";
        relayed.port = String(relay.port);
        process.env.DATABASE_URL = relayed.toString();
        const { GET } = await import("../../src/routes/readyz/+server");
        ({ closeDb } = await import("../../src/lib/server/db/client"));

        const probe = async () => {
            const started = performance.now();
            const response = await GET({} as Parameters<typeof GET>[0]);
            return { status: response.status, body: await response.text(), ms: performance.now() - started };
        };

        // 1. Nothing listens on the database port: refused at once.
        const down = await probe();
        expect(down).toMatchObject({ status: 503, body: "database unavailable" });
        expect(down.ms).toBeLessThan(5_000);

        // 2. The database is reachable.
        await relay.open();
        expect(await probe()).toMatchObject({ status: 200, body: "ready" });

        // 3. Outage: established pool connections are cut and new ones refused.
        await relay.close();
        expect(await probe()).toMatchObject({ status: 503, body: "database unavailable" });
        expect(await probe()).toMatchObject({ status: 503 });

        // 4. Recovery: the same process answers ready again.
        await relay.open();
        expect(await probe()).toMatchObject({ status: 200, body: "ready" });
    }, 60_000);
});
