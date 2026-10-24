/**
 * Client of WorkAdventure's map-storage HTTP API, limited to what the component features need. Verified
 * against map-storage at commit b579166 (map-storage/src/Upload/UploadController.ts):
 *
 * - GET  /<path>.wam                 public, the WAM file as JSON
 * - PATCH /<path>.wam                JSON Patch (application/json-patch+json), validated against the WAM
 *                                    schema, then saved; connected rooms are refreshed. Needs the bearer
 *                                    token (AUTHENTICATION_TOKEN with ENABLE_BEARER_AUTHENTICATION).
 * - POST /upload                     multipart: `file` = ZIP, `directory`. Deletes everything under
 *                                    `directory` first, then writes the archive. Needs the token.
 * - POST /resize                     JSON { wamUrl, width, height, anchor, fill, dryRun }: resizes a room's
 *                                    Tiled map and WAM file together (or only reports, with dryRun) and
 *                                    moves the people in the room with the map. Needs the token.
 *
 * map-storage picks the "domain" (world of files) from X-Map-Storage-Host, then X-Forwarded-Host, then the
 * host name; requests to its internal URL therefore name the public host explicitly.
 *
 * `PUT` is not used: it reads uploads as text and corrupts binary files (images).
 */
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import { z } from "zod";
import { getInstanceSettings } from "../services/instance";
import { openSecret } from "../services/secrets";

export interface MapStorageTarget {
    /** URL this server calls (internal URL when configured). */
    url: string;
    /** Path inside map-storage, without leading slash, e.g. "office/map.wam". */
    path: string;
    headers: Record<string, string>;
}

function trimSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

/** Base URLs and headers of the configured map-storage, or undefined when it is not configured. */
async function connection(): Promise<
    { publicUrl: string; internalUrl: string; headers: Record<string, string> } | undefined
> {
    const settings = await getInstanceSettings();
    const publicUrl = settings.mapStoragePublicUrl ?? settings.mapStorageInternalUrl;
    const internalUrl = settings.mapStorageInternalUrl ?? settings.mapStoragePublicUrl;
    if (!publicUrl || !internalUrl) return undefined;
    const token = openSecret(settings.mapStorageApiToken);
    return {
        publicUrl: trimSlash(publicUrl),
        internalUrl: trimSlash(internalUrl),
        headers: {
            "x-map-storage-host": new URL(publicUrl).host,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
    };
}

/** Map-storage directory of an organization's AdminSpace rooms (rooms from templates): only it writes there. */
export function organizationDirectory(organizationId: string): string {
    return `adminspace/${organizationId}`;
}

/** A map-storage path when it is a plain path: no dot segments, nothing percent-encoded that URL parsing would turn into one. */
function plainPath(raw: string, extension: RegExp): string | undefined {
    if (!extension.test(raw) || /%2e|%2f|%5c|\\/i.test(raw)) return undefined;
    const segments = raw.split("/");
    if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return undefined;
    return raw;
}

/** The map-storage path of a WAM file ("adminspace/…/map.wam"), when it is a plain path. */
export function plainWamPath(raw: string): string | undefined {
    return plainPath(raw, /\.wam$/);
}

/** Where to reach a file of the configured map-storage from its public URL, or undefined when it is elsewhere. */
function fileTarget(
    c: { publicUrl: string; internalUrl: string; headers: Record<string, string> },
    publicFileUrl: string,
    extension: RegExp,
): MapStorageTarget | undefined {
    if (!publicFileUrl.startsWith(`${c.publicUrl}/`)) return undefined;
    const path = plainPath(publicFileUrl.slice(c.publicUrl.length + 1).split(/[?#]/)[0]!, extension);
    if (!path) return undefined;
    // Belt and braces: the URL actually requested stays under the internal base.
    const base = new URL(`${c.internalUrl}/`);
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return undefined;
    return { url: url.toString(), path, headers: c.headers };
}

/**
 * Where to reach a room's WAM file, when it is hosted on the configured map-storage. Rooms whose WAM is
 * elsewhere cannot be changed by this server (no credentials): undefined. Whether the organization may
 * change that file is decided by `wamWritableBy` (catalog/install.ts).
 */
export async function wamTarget(wamUrl: string | null): Promise<MapStorageTarget | undefined> {
    if (!wamUrl) return undefined;
    const c = await connection();
    return c ? fileTarget(c, wamUrl, /\.wam$/) : undefined;
}

/** Public base URL of the configured map-storage (no trailing slash), or undefined when it is not configured. */
export async function mapStoragePublicBase(): Promise<string | undefined> {
    return (await connection())?.publicUrl;
}

/** The fields of a WAM file this server reads (map-storage validates the rest). */
export const WamFile = z
    .object({
        version: z.string(),
        mapUrl: z.string(),
        entityCollections: z.array(z.object({ url: z.string(), type: z.string() }).passthrough()),
        entities: z.record(
            z.string(),
            z.object({ prefabRef: z.object({ collectionName: z.string(), id: z.string() }) }).passthrough(),
        ),
    })
    .passthrough();
export type WamFile = z.infer<typeof WamFile>;

export type MapStorageFailure = "notFound" | "unauthorized" | "rejected" | "unavailable";

export type MapStorageOutcome<T = undefined> =
    { status: "ok"; value: T } | { status: MapStorageFailure; httpStatus?: number };

function outcomeOf(response: Response): MapStorageFailure {
    if (response.status === 404) return "notFound";
    if (response.status === 401 || response.status === 403) return "unauthorized";
    if (response.status >= 400 && response.status < 500) return "rejected";
    return "unavailable";
}

export async function getWam(target: MapStorageTarget): Promise<MapStorageOutcome<WamFile>> {
    try {
        const response = await fetch(target.url, {
            headers: { ...target.headers, accept: "application/json" },
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return { status: outcomeOf(response), httpStatus: response.status };
        const parsed = WamFile.safeParse(await response.json());
        return parsed.success ? { status: "ok", value: parsed.data } : { status: "rejected", httpStatus: 200 };
    } catch {
        return { status: "unavailable" };
    }
}

export type JsonPatchOperation =
    | { op: "test"; path: string; value: unknown }
    | { op: "add"; path: string; value: unknown }
    | { op: "remove"; path: string };

export async function patchWam(target: MapStorageTarget, operations: JsonPatchOperation[]): Promise<MapStorageOutcome> {
    try {
        const response = await fetch(target.url, {
            method: "PATCH",
            headers: { ...target.headers, "content-type": "application/json-patch+json" },
            body: JSON.stringify(operations),
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return { status: outcomeOf(response), httpStatus: response.status };
        return { status: "ok", value: undefined };
    } catch {
        return { status: "unavailable" };
    }
}

// ---------------------------------------------------------------------------------------------
// Room maps: reading the Tiled map of a WAM room, and resizing it
// ---------------------------------------------------------------------------------------------

/** The fields of a Tiled map this server reads (the size, and what the door placement needs). */
export const TiledMap = z
    .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        tilewidth: z.number().int().positive(),
        tileheight: z.number().int().positive(),
        infinite: z.boolean().optional(),
        layers: z.array(z.object({ type: z.string(), name: z.string().optional() }).passthrough()).default([]),
        tilesets: z.array(z.object({ firstgid: z.number().int() }).passthrough()).default([]),
    })
    .passthrough();
export type TiledMap = z.infer<typeof TiledMap>;

const LooseWam = z.object({ mapUrl: z.string(), areas: z.array(z.unknown()).default([]) }).passthrough();

/** Tiled maps of very large rooms are a few megabytes; anything far bigger is not read. */
const MAX_MAP_BYTES = 64 * 1024 * 1024;

export type RoomMapFailure = "notOnMapStorage" | "external" | "notFound" | "unauthorized" | "unavailable" | "invalid";

export type RoomMapOutcome =
    | { status: "ok"; value: { wam: z.infer<typeof LooseWam>; map: TiledMap; mapPath: string } }
    | { status: RoomMapFailure; httpStatus?: number };

type JsonRead = { ok: true; value: unknown } | { ok: false; status: RoomMapFailure; httpStatus?: number };

async function getJson(target: MapStorageTarget, timeoutMs: number): Promise<JsonRead> {
    try {
        const response = await fetch(target.url, {
            headers: { ...target.headers, accept: "application/json" },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
            await response.body?.cancel();
            const failure = outcomeOf(response);
            return { ok: false, status: failure === "rejected" ? "invalid" : failure, httpStatus: response.status };
        }
        if (Number(response.headers.get("content-length") ?? 0) > MAX_MAP_BYTES) {
            await response.body?.cancel();
            return { ok: false, status: "invalid", httpStatus: response.status };
        }
        const text = await response.text();
        if (text.length > MAX_MAP_BYTES) return { ok: false, status: "invalid", httpStatus: response.status };
        return { ok: true, value: JSON.parse(text) as unknown };
    } catch (error) {
        return error instanceof SyntaxError ? { ok: false, status: "invalid" } : { ok: false, status: "unavailable" };
    }
}

function failureOf(read: Extract<JsonRead, { ok: false }>): { status: RoomMapFailure; httpStatus?: number } {
    return read.httpStatus ? { status: read.status, httpStatus: read.httpStatus } : { status: read.status };
}

/**
 * Reads a room's WAM file and its Tiled map (resolved relative to the WAM URL, as WorkAdventure does). Both must
 * be on the configured map-storage: a Tiled map hosted elsewhere is "external" (never fetched: no SSRF).
 */
export async function readRoomMap(wamUrl: string | null, timeoutMs = 8_000): Promise<RoomMapOutcome> {
    const c = await connection();
    const target = c && wamUrl ? fileTarget(c, wamUrl, /\.wam$/) : undefined;
    if (!c || !wamUrl || !target) return { status: "notOnMapStorage" };
    const wamJson = await getJson(target, timeoutMs);
    if (!wamJson.ok) return failureOf(wamJson);
    const wam = LooseWam.safeParse(wamJson.value);
    if (!wam.success) return { status: "invalid" };
    let mapUrl: URL;
    try {
        mapUrl = new URL(wam.data.mapUrl, wamUrl);
    } catch {
        return { status: "invalid" };
    }
    const mapTarget = fileTarget(c, mapUrl.toString(), /\.(tmj|json)$/i);
    if (!mapTarget) return { status: "external" };
    const mapJson = await getJson(mapTarget, timeoutMs);
    if (!mapJson.ok) return failureOf(mapJson);
    const map = TiledMap.safeParse(mapJson.value);
    if (!map.success) return { status: "invalid" };
    return { status: "ok", value: { wam: wam.data, map: map.data, mapPath: mapTarget.path } };
}

/** A WAM file read loosely (only `mapUrl` is required), or undefined when it cannot be read. */
export async function readWamFile(
    wamUrl: string,
    timeoutMs = 8_000,
): Promise<{ status: "ok"; value: z.infer<typeof LooseWam> } | { status: RoomMapFailure; httpStatus?: number }> {
    const c = await connection();
    const target = c ? fileTarget(c, wamUrl, /\.wam$/) : undefined;
    if (!target) return { status: "notOnMapStorage" };
    const read = await getJson(target, timeoutMs);
    if (!read.ok) return failureOf(read);
    const wam = LooseWam.safeParse(read.value);
    return wam.success ? { status: "ok", value: wam.data } : { status: "invalid" };
}

/** Map-storage's resize report (map-storage/src/Upload/MapResizeController.ts, libs/map-editor MapResizeReport). */
export const ResizeReport = z
    .object({
        oldWidth: z.number().int(),
        oldHeight: z.number().int(),
        newWidth: z.number().int(),
        newHeight: z.number().int(),
        tileWidth: z.number().int(),
        tileHeight: z.number().int(),
        columns: z.array(z.number().int()),
        rows: z.array(z.number().int()),
        displacedEntities: z.array(z.string()),
        displacedAreas: z.array(z.string()),
    })
    .passthrough();
export type ResizeReport = z.infer<typeof ResizeReport>;

const ResizeAnswer = z.object({ dryRun: z.boolean(), report: ResizeReport });

export interface ResizeRequest {
    width: number;
    height: number;
    anchor: string;
    fill: string;
    dryRun: boolean;
}

export type ResizeFailure = "notConfigured" | "invalid" | "notFound" | "unresizable" | "unauthorized" | "unavailable";

export type ResizeOutcome =
    | { status: "ok"; value: { dryRun: boolean; report: ResizeReport } }
    | { status: ResizeFailure; httpStatus?: number; detail?: string };

/** The `error` text of a map-storage error answer: kept short, for logs and as a technical detail. */
async function errorDetail(response: Response): Promise<string | undefined> {
    try {
        const body = (await response.json()) as { error?: unknown };
        return typeof body.error === "string" ? body.error.replace(/\s+/g, " ").slice(0, 300) : undefined;
    } catch {
        return undefined;
    }
}

function resizeFailureOf(status: number): ResizeFailure {
    if (status === 404) return "notFound";
    if (status === 422) return "unresizable";
    if (status === 401 || status === 403) return "unauthorized";
    if (status >= 400 && status < 500) return "invalid";
    return "unavailable";
}

/**
 * POST /resize. The caller decides whether the organization may change this map (`wamWritableBy`); the WAM URL
 * is sent exactly as stored, map-storage checks it belongs to the host named in X-Map-Storage-Host.
 */
export async function resizeRoomMap(wamUrl: string, request: ResizeRequest): Promise<ResizeOutcome> {
    const c = await connection();
    if (!c) return { status: "notConfigured" };
    try {
        const response = await fetch(`${c.internalUrl}/resize`, {
            method: "POST",
            headers: { ...c.headers, "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ wamUrl, ...request }),
            signal: AbortSignal.timeout(request.dryRun ? 15_000 : 30_000),
        });
        if (!response.ok) {
            const detail = await errorDetail(response);
            return {
                status: resizeFailureOf(response.status),
                httpStatus: response.status,
                ...(detail ? { detail } : {}),
            };
        }
        const parsed = ResizeAnswer.safeParse(await response.json());
        if (!parsed.success) return { status: "unavailable", httpStatus: response.status };
        return { status: "ok", value: parsed.data };
    } catch {
        return { status: "unavailable" };
    }
}

/** Uploads a ZIP archive into `directory` (which map-storage empties first). */
export async function uploadArchive(
    directory: string,
    archive: Buffer,
): Promise<MapStorageOutcome<{ publicBase: string }>> {
    const c = await connection();
    if (!c) return { status: "unavailable" };
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(archive)], { type: "application/zip" }), "room.zip");
    form.append("directory", directory);
    try {
        const response = await fetch(`${c.internalUrl}/upload`, {
            method: "POST",
            headers: c.headers,
            body: form,
            signal: AbortSignal.timeout(60_000),
        });
        if (!response.ok) return { status: outcomeOf(response), httpStatus: response.status };
        return { status: "ok", value: { publicBase: c.publicUrl } };
    } catch {
        return { status: "unavailable" };
    }
}

/** Public URL of a file of map-storage (as WorkAdventure players fetch it). */
export async function mapStoragePublicUrl(path: string): Promise<string | undefined> {
    const c = await connection();
    return c ? `${c.publicUrl}/${path.replace(/^\/+/, "")}` : undefined;
}

// ---------------------------------------------------------------------------------------------
// ZIP archives (PKWARE APPNOTE 6.3.x): deflated entries, UTF-8 names, fixed timestamps so that the same
// content always gives the same bytes (an upload retried after a failure is identical).
// ---------------------------------------------------------------------------------------------

const DOS_DATE_1980_01_01 = (0 << 9) | (1 << 5) | 1;

export function buildZip(entries: { name: string; data: Buffer }[]): Buffer {
    const locals: Buffer[] = [];
    const centrals: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
        const name = Buffer.from(entry.name, "utf8");
        const compressed = deflateRawSync(entry.data);
        const crc = crc32(entry.data) >>> 0;
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6); // UTF-8 names
        local.writeUInt16LE(8, 8); // deflate
        local.writeUInt16LE(0, 10);
        local.writeUInt16LE(DOS_DATE_1980_01_01, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, name, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(DOS_DATE_1980_01_01, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(entry.data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, name);
        offset += local.length + name.length + compressed.length;
    }
    const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, ...centrals, end]);
}

export class ZipError extends Error {
    override name = "ZipError";
}

/**
 * Reads a ZIP archive uploaded by a person (component packages). Defensive: at most `maxEntries`
 * files, each inflated with a hard output limit, `maxTotal` bytes in all (zip bombs), only "stored"
 * and "deflate" entries, and names that stay inside the package (no absolute path, "..", backslash
 * or drive letter). Directories are skipped. Throws ZipError on anything else.
 */
export function readZip(
    archive: Buffer,
    limits: { maxEntries: number; maxEntryBytes: number; maxTotal: number },
): Map<string, Buffer> {
    const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (end < 0 || end + 22 > archive.length) throw new ZipError("no end of central directory");
    const entries = archive.readUInt16LE(end + 10);
    if (entries > limits.maxEntries) throw new ZipError("too many entries");
    let offset = archive.readUInt32LE(end + 16);
    const files = new Map<string, Buffer>();
    let total = 0;
    for (let i = 0; i < entries; i++) {
        if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50)
            throw new ZipError("bad central entry");
        const method = archive.readUInt16LE(offset + 10);
        const expectedCrc = archive.readUInt32LE(offset + 16);
        const compressedSize = archive.readUInt32LE(offset + 20);
        const size = archive.readUInt32LE(offset + 24);
        const nameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const localOffset = archive.readUInt32LE(offset + 42);
        const name = archive.toString("utf8", offset + 46, offset + 46 + nameLength);
        offset += 46 + nameLength + extraLength + commentLength;
        if (name.endsWith("/")) continue;
        if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..") || /^[a-z]:/i.test(name)) {
            throw new ZipError("unsafe entry name");
        }
        if (size > limits.maxEntryBytes) throw new ZipError("entry too large");
        total += size;
        if (total > limits.maxTotal) throw new ZipError("archive too large");
        if (localOffset + 30 > archive.length || archive.readUInt32LE(localOffset) !== 0x04034b50) {
            throw new ZipError("bad local entry");
        }
        const dataStart =
            localOffset + 30 + archive.readUInt16LE(localOffset + 26) + archive.readUInt16LE(localOffset + 28);
        const raw = archive.subarray(dataStart, dataStart + compressedSize);
        let data: Buffer;
        if (method === 0) data = Buffer.from(raw);
        else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: limits.maxEntryBytes });
        else throw new ZipError("unsupported compression");
        // The central directory's size and CRC must match the data: otherwise corrupt or crafted.
        if (data.length !== size) throw new ZipError("size mismatch");
        if (crc32(data) >>> 0 !== expectedCrc) throw new ZipError("checksum mismatch");
        files.set(name, data);
    }
    return files;
}
