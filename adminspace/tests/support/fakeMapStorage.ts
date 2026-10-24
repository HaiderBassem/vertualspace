/**
 * A local stand-in for WorkAdventure's map-storage, implementing only what AdminSpace calls, as documented in
 * src/lib/server/catalog/mapStorage.ts: public GET of files, PATCH of WAM files (JSON Patch subset: test, add,
 * remove at any depth, all-or-nothing), POST /upload (multipart ZIP, the directory emptied first) and POST /resize (the
 * contract of map-storage/src/Upload/MapResizeController.ts: bearer token, X-Map-Storage-Host must match the WAM URL,
 * dryRun, 400/404/422 errors as { error }).
 *
 * The resize keeps the map's edges and repeats inner cells ("extend") or adds empty cells ("empty"), moves WAM
 * entities and areas with the map, and reports what moved, like WorkAdventure (simplified: the repeated cells are
 * fixed instead of the most uniform ones).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { readZip } from "../../src/lib/server/catalog/mapStorage";

export interface FakeMapStorage {
    url: string;
    host: string;
    files: Map<string, string>;
    calls: string[];
    resizes: { wamUrl: string; width: number; height: number; anchor: string; fill: string; dryRun: boolean }[];
    /** Answers every request with this status while set (outage). */
    down: number | undefined;
    /** Forced answers of POST /resize for WAM paths (e.g. 422 with an error text). */
    resizeFailures: Map<string, { status: number; error: string }>;
    /**
     * Runs once, just before the next PATCH is applied: a change made by somebody else after the caller read the file
     * and before its patch arrives.
     */
    beforePatch: ((path: string) => void) | undefined;
    json(path: string): unknown;
    put(path: string, value: unknown): void;
    close(): Promise<void>;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface PatchOperation {
    op: string;
    path: string;
    value?: Json;
}

/**
 * The JSON Patch of map-storage's PATCH route, in the subset AdminSpace uses (RFC 6902: test, add, remove), at any depth.
 * All operations apply to a copy and a failing one (a `test` that does not hold, a path that does not resolve, an
 * operation that is not supported) changes nothing, like the real route, which only saves a patch that applied whole.
 * Like fast-json-patch with validation (what the real route runs), a `test` or an `add` without a value is refused
 * (OPERATION_VALUE_REQUIRED: a `test` cannot check that a key is absent) and so is a `remove` of a path that does not
 * exist (OPERATION_PATH_UNRESOLVABLE).
 */
function applyJsonPatch(
    document: Json,
    operations: PatchOperation[],
): { ok: true; document: Json } | { ok: false; error: string } {
    const result = structuredClone(document);
    const pointer = (path: string): string[] =>
        path
            .split("/")
            .slice(1)
            .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
    const container = (keys: string[]): Json | undefined => {
        let node: Json | undefined = result;
        for (const key of keys.slice(0, -1)) {
            if (node === null || typeof node !== "object") return undefined;
            node = Array.isArray(node) ? node[Number(key)] : node[key];
            if (node === undefined) return undefined;
        }
        return node;
    };
    for (const operation of operations) {
        const keys = pointer(operation.path);
        const parent = container(keys);
        const key = keys[keys.length - 1];
        if (key === undefined || parent === undefined || parent === null || typeof parent !== "object") {
            return { ok: false, error: `cannot resolve ${operation.path}` };
        }
        if ((operation.op === "test" || operation.op === "add") && !("value" in operation)) {
            return { ok: false, error: "value required" };
        }
        if (operation.op === "test") {
            const actual = Array.isArray(parent) ? parent[Number(key)] : parent[key];
            if (JSON.stringify(actual) !== JSON.stringify(operation.value)) return { ok: false, error: "test failed" };
        } else if (operation.op === "add") {
            if (Array.isArray(parent)) {
                if (key === "-") parent.push(operation.value as Json);
                else parent.splice(Number(key), 0, operation.value as Json);
            } else {
                parent[key] = operation.value as Json;
            }
        } else if (operation.op === "remove") {
            const exists = Array.isArray(parent) ? parent[Number(key)] !== undefined : key in parent;
            if (!exists) return { ok: false, error: `cannot remove ${operation.path}: it does not exist` };
            if (Array.isArray(parent)) parent.splice(Number(key), 1);
            else delete parent[key];
        } else {
            return { ok: false, error: "unsupported" };
        }
    }
    return { ok: true, document: result };
}

function send(res: ServerResponse, status: number, value?: unknown): void {
    if (value === undefined) res.writeHead(status).end();
    else res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

/** The parts of a multipart/form-data body: name → raw bytes. */
function multipart(body: Buffer, contentType: string): Map<string, Buffer> {
    const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
    const parts = new Map<string, Buffer>();
    if (!boundary) return parts;
    const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
    let start = body.indexOf(delimiter);
    while (start >= 0) {
        const next = body.indexOf(delimiter, start + delimiter.length);
        if (next < 0) break;
        const part = body.subarray(start + delimiter.length + 2, next - 2);
        const headerEnd = part.indexOf("\r\n\r\n");
        const headers = part.subarray(0, headerEnd).toString("utf8");
        const name = /name="([^"]+)"/.exec(headers)?.[1];
        if (name) parts.set(name, part.subarray(headerEnd + 4));
        start = next;
    }
    return parts;
}

type Axis = "start" | "center" | "end";

/** For each new cell, the old cell it copies (-1: empty), keeping the first and last cells at the edges. */
function axisMapping(old: number, size: number, anchor: Axis, fill: string): number[] {
    const delta = size - old;
    const before = anchor === "start" ? 0 : anchor === "end" ? delta : Math.trunc(delta / 2);
    const after = delta - before;
    if (fill === "empty" || old < 4) {
        const cells: number[] = [];
        for (let i = 0; i < size; i++) {
            const oldCell = i - before;
            cells.push(oldCell >= 0 && oldCell < old ? oldCell : -1);
        }
        return cells;
    }
    if (delta >= 0) {
        const cells: number[] = [];
        for (let cell = 0; cell < old; cell++) {
            cells.push(cell);
            if (cell === 1) cells.push(...Array<number>(before).fill(1));
            if (cell === old - 3) cells.push(...Array<number>(after).fill(old - 3));
        }
        return cells;
    }
    const removed = new Set<number>();
    for (let i = 0; i < -before; i++) removed.add(1 + i);
    for (let i = 0; i < -after; i++) removed.add(old - 2 - i);
    return Array.from({ length: old }, (_, i) => i).filter((c) => !removed.has(c));
}

function axesOf(anchor: string): { x: Axis; y: Axis } {
    const x: Axis = anchor.endsWith("left") ? "start" : anchor.endsWith("right") ? "end" : "center";
    const y: Axis = anchor.startsWith("top") ? "start" : anchor.startsWith("bottom") ? "end" : "center";
    return { x, y };
}

interface Tmj {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    infinite?: boolean;
    layers: { name: string; type: string; width?: number; height?: number; data?: number[] }[];
}

interface Positioned {
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export async function startFakeMapStorage(token: string): Promise<FakeMapStorage> {
    const files = new Map<string, string>();
    const state: Omit<FakeMapStorage, "url" | "host" | "json" | "put" | "close"> = {
        files,
        calls: [],
        resizes: [],
        down: undefined,
        resizeFailures: new Map(),
        beforePatch: undefined,
    };

    function resize(
        body: { wamUrl: string; width: number; height: number; anchor?: string; fill?: string; dryRun?: boolean },
        requestHost: string,
    ): { status: number; value: unknown } {
        const anchor = body.anchor ?? "top-left";
        const fill = body.fill ?? "extend";
        const dryRun = body.dryRun ?? false;
        if (!Number.isInteger(body.width) || !Number.isInteger(body.height) || body.width < 1 || body.height < 1) {
            return { status: 400, value: { error: "Invalid request" } };
        }
        const url = new URL(body.wamUrl);
        if (url.hostname !== requestHost.split(":")[0] || !url.pathname.endsWith(".wam")) {
            return { status: 400, value: { error: "The WAM URL does not belong to this map-storage domain." } };
        }
        const wamPath = url.pathname.replace(/^\/+/, "");
        if (!files.has(wamPath)) return { status: 404, value: { error: "No such map" } };
        const forced = state.resizeFailures.get(wamPath);
        if (forced) return { status: forced.status, value: { error: forced.error } };
        state.resizes.push({ wamUrl: body.wamUrl, width: body.width, height: body.height, anchor, fill, dryRun });
        const wam = JSON.parse(files.get(wamPath)!) as {
            mapUrl: string;
            entities: Record<string, Positioned>;
            areas: (Positioned & { id: string })[];
        };
        const tmjPath = new URL(wam.mapUrl, `http://x/${wamPath}`).pathname.replace(/^\/+/, "");
        if (!files.has(tmjPath)) {
            return { status: 422, value: { error: `The Tiled map "${wam.mapUrl}" of this room could not be read.` } };
        }
        const map = JSON.parse(files.get(tmjPath)!) as Tmj;
        if (map.infinite) {
            return {
                status: 422,
                value: { error: "Infinite maps cannot be resized. Save the map as a fixed-size map in Tiled first." },
            };
        }
        const axes = axesOf(anchor);
        const columns = axisMapping(map.width, body.width, axes.x, fill);
        const rows = axisMapping(map.height, body.height, axes.y, fill);
        const firstOf = (mapping: number[], old: number) => mapping.indexOf(old);
        const move = (value: number, mapping: number[], tile: number) => {
            const cell = Math.floor(value / tile);
            const index = firstOf(mapping, cell);
            return index >= 0 ? index * tile + (value - cell * tile) : -1;
        };
        const displacedEntities: string[] = [];
        for (const [id, entity] of Object.entries(wam.entities)) {
            let x = move(entity.x, columns, map.tilewidth);
            let y = move(entity.y, rows, map.tileheight);
            if (x < 0 || y < 0 || x >= body.width * map.tilewidth || y >= body.height * map.tileheight) {
                displacedEntities.push(id);
                x = Math.max(0, Math.min(Math.max(x, 0), (body.width - 1) * map.tilewidth));
                y = Math.max(0, Math.min(Math.max(y, 0), (body.height - 1) * map.tileheight));
            }
            entity.x = x;
            entity.y = y;
        }
        const displacedAreas: string[] = [];
        for (const area of wam.areas) {
            const x = move(area.x, columns, map.tilewidth);
            const y = move(area.y, rows, map.tileheight);
            if (x < 0 || y < 0) displacedAreas.push(area.id);
            area.x = Math.max(0, x);
            area.y = Math.max(0, y);
        }
        const report = {
            oldWidth: map.width,
            oldHeight: map.height,
            newWidth: body.width,
            newHeight: body.height,
            tileWidth: map.tilewidth,
            tileHeight: map.tileheight,
            columns,
            rows,
            displacedEntities,
            displacedAreas,
        };
        if (!dryRun) {
            for (const layer of map.layers) {
                if (!Array.isArray(layer.data)) continue;
                const repeatable = layer.name !== "start";
                const data: number[] = [];
                for (const [y, oldY] of rows.entries()) {
                    for (const [x, oldX] of columns.entries()) {
                        const repeated = (x > 0 && columns[x - 1] === oldX) || (y > 0 && rows[y - 1] === oldY);
                        data.push(
                            oldX < 0 || oldY < 0 || (!repeatable && repeated)
                                ? 0
                                : layer.data[oldY * map.width + oldX]!,
                        );
                    }
                }
                layer.data = data;
                layer.width = body.width;
                layer.height = body.height;
            }
            map.width = body.width;
            map.height = body.height;
            files.set(tmjPath, JSON.stringify(map));
            files.set(wamPath, JSON.stringify(wam));
        }
        return { status: 200, value: { dryRun, report } };
    }

    async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const url = new URL(req.url ?? "/", "http://fake");
        state.calls.push(`${req.method} ${url.pathname}`);
        if (state.down) return send(res, state.down);
        const path = url.pathname.replace(/^\/+/, "");
        if (req.method === "GET") {
            const file = files.get(decodeURIComponent(path));
            return file === undefined
                ? send(res, 404)
                : void res.writeHead(200, { "content-type": "application/json" }).end(file);
        }
        if (req.headers.authorization !== `Bearer ${token}`) return send(res, 401);
        const body = await readBody(req);
        if (req.method === "POST" && url.pathname === "/upload") {
            const parts = multipart(body, req.headers["content-type"] ?? "");
            const directory = parts
                .get("directory")
                ?.toString("utf8")
                .replace(/^\/+|\/+$/g, "");
            const archive = parts.get("file");
            if (!directory || !archive) return send(res, 400, { error: "directory or file missing" });
            for (const key of [...files.keys()]) if (key.startsWith(`${directory}/`)) files.delete(key);
            const entries = readZip(archive, { maxEntries: 100, maxEntryBytes: 10_000_000, maxTotal: 50_000_000 });
            for (const [name, data] of entries) files.set(`${directory}/${name}`, data.toString("utf8"));
            return send(res, 200, { success: true });
        }
        if (req.method === "POST" && url.pathname === "/resize") {
            const result = resize(JSON.parse(body.toString("utf8")), String(req.headers["x-map-storage-host"] ?? ""));
            return send(res, result.status, result.value);
        }
        if (req.method === "PATCH" && path.endsWith(".wam")) {
            const hook = state.beforePatch;
            state.beforePatch = undefined;
            hook?.(path);
            const current = files.get(path);
            if (current === undefined) return send(res, 404);
            const ops = JSON.parse(body.toString("utf8")) as PatchOperation[];
            const patched = applyJsonPatch(JSON.parse(current) as Json, ops);
            if (!patched.ok) return send(res, 400, { error: patched.error });
            files.set(path, JSON.stringify(patched.document));
            return send(res, 200, { success: true });
        }
        send(res, 405);
    }

    const server: Server = createServer((req, res) => {
        handle(req, res).catch(() => send(res, 500));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const host = `127.0.0.1:${port}`;
    return Object.assign(state, {
        url: `http://${host}`,
        host,
        json: (path: string) => JSON.parse(files.get(path) ?? "null") as unknown,
        put: (path: string, value: unknown) => void files.set(path, JSON.stringify(value)),
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    });
}
