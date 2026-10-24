/**
 * Local stand-ins for the external services of the enterprise journeys, started by global-setup.ts as
 * their own process (killed by global-teardown.ts):
 *
 * - an SMTP sink (no TLS, no auth) that writes every message as JSON into MAIL_DIR, so a test reads the
 *   verification or invitation link a person would receive;
 * - a fake WorkAdventure map-storage: GET and PATCH (RFC 6902 subset: test, add, remove) of WAM files with
 *   the bearer token, POST /upload of a ZIP (multipart, like map-storage), and a control API under
 *   /__control to simulate an outage and to read what AdminSpace wrote.
 *
 * Env: SMTP_PORT, MAP_PORT, MAP_TOKEN, MAIL_DIR.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createTcpServer, type Socket } from "node:net";
import path from "node:path";

const SMTP_PORT = Number(process.env.SMTP_PORT);
const MAP_PORT = Number(process.env.MAP_PORT);
const TOKEN = process.env.MAP_TOKEN ?? "";
const MAIL_DIR = process.env.MAIL_DIR ?? "";
if (!SMTP_PORT || !MAP_PORT || !TOKEN || !MAIL_DIR) {
    throw new Error("SMTP_PORT, MAP_PORT, MAP_TOKEN and MAIL_DIR are required");
}
mkdirSync(MAIL_DIR, { recursive: true });

// --- SMTP sink -------------------------------------------------------------------------------
let mailCount = 0;

function smtpSession(socket: Socket): void {
    let buffer = "";
    let inData = false;
    let rcpt: string[] = [];
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 e2e-smtp ready");
    socket.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        for (;;) {
            if (inData) {
                const end = buffer.indexOf("\r\n.\r\n");
                if (end < 0) return;
                // Dot-unstuffing (RFC 5321 4.5.2).
                const data = buffer.slice(0, end).replace(/\r\n\.\./g, "\r\n.");
                buffer = buffer.slice(end + 5);
                inData = false;
                mailCount += 1;
                writeFileSync(
                    path.join(MAIL_DIR, `${Date.now()}-${mailCount}.json`),
                    JSON.stringify({ to: rcpt, data }),
                );
                rcpt = [];
                reply("250 queued");
                continue;
            }
            const eol = buffer.indexOf("\r\n");
            if (eol < 0) return;
            const line = buffer.slice(0, eol);
            buffer = buffer.slice(eol + 2);
            const verb = line.slice(0, 4).toUpperCase();
            if (verb === "EHLO" || verb === "HELO") reply("250 e2e-smtp");
            else if (verb === "MAIL" || verb === "RSET" || verb === "NOOP") reply("250 ok");
            else if (verb === "RCPT") {
                rcpt.push(line.replace(/^RCPT TO:\s*<?([^>]*)>?.*$/i, "$1").toLowerCase());
                reply("250 ok");
            } else if (verb === "DATA") {
                inData = true;
                reply("354 end with .");
            } else if (verb === "QUIT") {
                reply("221 bye");
                socket.end();
                return;
            } else reply("502 not implemented");
        }
    });
    socket.on("error", () => {});
}

createTcpServer(smtpSession).listen(SMTP_PORT, "127.0.0.1");

// --- map-storage -----------------------------------------------------------------------------
interface Wam {
    version: string;
    mapUrl: string;
    entities: Record<string, unknown>;
    areas: unknown[];
    entityCollections: { url: string; type: string }[];
}

function emptyWam(mapUrl: string): Wam {
    return { version: "2.1.0", mapUrl, entities: {}, areas: [], entityCollections: [] };
}

const wams = new Map<string, Wam>([["office/map.wam", emptyWam("./office.tmj")]]);
const uploads: { directory: string; bytes: number }[] = [];
const calls: string[] = [];
let outage = false;

function readBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

function json(res: ServerResponse, status: number, value: unknown): void {
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

/** Applies the JSON Patch operations AdminSpace sends; false when a "test" fails (optimistic concurrency). */
function applyPatch(wam: Wam, ops: { op: string; path: string; value?: unknown }[]): boolean {
    for (const op of ops) {
        const [, field, index] = op.path.split("/");
        if (field !== "entityCollections") return false;
        if (op.op === "test") {
            const current = index === undefined ? wam.entityCollections : wam.entityCollections[Number(index)];
            if (JSON.stringify(current) !== JSON.stringify(op.value)) return false;
        } else if (op.op === "add") {
            const value = op.value as { url: string; type: string };
            if (index === undefined || index === "-") wam.entityCollections.push(value);
            else wam.entityCollections.splice(Number(index), 0, value);
        } else if (op.op === "remove") {
            wam.entityCollections.splice(Number(index), 1);
        } else return false;
    }
    return true;
}

async function mapStorage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://fake");
    if (url.pathname === "/__control/outage" && req.method === "POST") {
        outage = url.searchParams.get("on") === "1";
        return json(res, 200, { outage });
    }
    if (url.pathname === "/__control/wam") {
        return json(res, 200, wams.get(url.searchParams.get("path") ?? "") ?? null);
    }
    if (url.pathname === "/__control/state") return json(res, 200, { calls, uploads, outage });
    if (url.pathname === "/__control/health") return json(res, 200, { ok: true });

    calls.push(`${req.method} ${url.pathname}`);
    if (outage) return void res.writeHead(503).end();
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return void res.writeHead(401).end();

    if (url.pathname === "/upload" && req.method === "POST") {
        const body = await readBody(req);
        const field = /name="directory"\r\n\r\n([^\r]*)\r\n/.exec(body.toString("latin1"))?.[1];
        const directory = field?.replace(/^\/+|\/+$/g, "");
        if (!directory) return json(res, 400, { error: "directory missing" });
        uploads.push({ directory, bytes: body.length });
        wams.set(`${directory}/map.wam`, emptyWam("./map.tmj"));
        return json(res, 200, { success: true });
    }
    const key = url.pathname.replace(/^\/+/, "");
    const wam = key.endsWith(".wam") ? wams.get(key) : undefined;
    if (!wam) return void res.writeHead(404).end();
    if (req.method === "GET") return json(res, 200, wam);
    if (req.method === "PATCH") {
        const ops = JSON.parse((await readBody(req)).toString("utf8")) as {
            op: string;
            path: string;
            value?: unknown;
        }[];
        const copy = structuredClone(wam);
        if (!applyPatch(copy, ops)) return json(res, 400, { error: "test failed" });
        wams.set(key, copy);
        return json(res, 200, { success: true });
    }
    res.writeHead(405).end();
}

createHttpServer((req, res) => {
    mapStorage(req, res).catch(() => res.writeHead(500).end());
}).listen(MAP_PORT, "127.0.0.1");
