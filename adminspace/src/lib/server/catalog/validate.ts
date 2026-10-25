/**
 * Validation of a component package (manifest + files) before it is stored or published. A component is
 * only described as compatible with WorkAdventure once these checks pass; they mirror what WorkAdventure
 * itself requires (libs/map-editor MapValidator and EntityRawPrefab, commit b579166):
 *
 * - images are real PNG/JPEG/WebP (signature + header), within size limits;
 * - a collidable entity measures whole 32 px cells and its collision grid matches them;
 * - a room template is an orthogonal map with 32 px tiles, a "floorLayer" object layer (required by
 *   map-storage) and a "start" layer, whose tilesets are embedded and point at files of the package
 *   (no external URL, no path leaving the package).
 *
 * Issues are codes with a path, translated by the pages (catalog.issues.*); nothing here is English text
 * shown to people.
 */
import { createHash } from "node:crypto";
import {
    ComponentManifest,
    isHostedTemplateMap,
    referencedFiles,
    TILE_SIZE,
    type ComponentManifest as Manifest,
} from "../../catalog/manifest";
import { inspectImage, type ImageInfo } from "./images";

export const LIMITS = {
    imageBytes: 2 * 1024 * 1024,
    entityPixels: 2048,
    tilesetPixels: 4096,
    mapBytes: 5 * 1024 * 1024,
    packageBytes: 16 * 1024 * 1024,
} as const;

export type IssueCode =
    | "manifestInvalid"
    | "fileMissing"
    | "fileUnreferenced"
    | "notAnImage"
    | "imageTooHeavy"
    | "imageTooLarge"
    | "notCellMultiple"
    | "collisionGridShape"
    | "packageTooLarge"
    | "mapInvalid"
    | "mapOrientation"
    | "mapTileSize"
    | "mapSize"
    | "mapFloorLayer"
    | "mapStartLayer"
    | "mapExternalTileset"
    | "mapTilesetFile";

export interface Issue {
    code: IssueCode;
    path: string;
}

export interface ValidatedFile {
    path: string;
    bytes: Buffer;
    sha256: string;
    contentType: string;
    image?: ImageInfo;
}

export interface ValidationResult {
    ok: boolean;
    issues: Issue[];
    manifest?: Manifest;
    files: ValidatedFile[];
}

function sha256(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
}

function contentTypeOf(path: string, image: ImageInfo | undefined): string {
    if (image) return image.contentType;
    return path.endsWith(".tmj") || path.endsWith(".json") || path.endsWith(".wam")
        ? "application/json"
        : "application/octet-stream";
}

interface TiledLayer {
    name?: unknown;
    type?: unknown;
    layers?: unknown;
}

/** Group layers nested deeper than this are refused (a crafted map could otherwise exhaust the stack). */
const MAX_LAYER_DEPTH = 16;

/** Flattens Tiled group layers; undefined when they are nested deeper than MAX_LAYER_DEPTH. */
function allLayers(layers: unknown, depth = 0): TiledLayer[] | undefined {
    if (!Array.isArray(layers)) return [];
    if (depth > MAX_LAYER_DEPTH) return undefined;
    const flat: TiledLayer[] = [];
    for (const layer of layers as TiledLayer[]) {
        if (!layer || typeof layer !== "object") continue;
        flat.push(layer);
        if (layer.type === "group") {
            const nested = allLayers(layer.layers, depth + 1);
            if (!nested) return undefined;
            flat.push(...nested);
        }
    }
    return flat;
}

function validateMap(manifest: Manifest, files: Map<string, Buffer>, issues: Issue[]): void {
    const template = manifest.template!;
    // The allowlisted hosted scenery stays on its original host; only its editable WAM is provisioned.
    if (isHostedTemplateMap(template.map)) return;
    const bytes = files.get(template.map);
    if (!bytes) return; // reported as fileMissing
    if (bytes.length > LIMITS.mapBytes) issues.push({ code: "packageTooLarge", path: template.map });
    let map: Record<string, unknown>;
    try {
        map = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
    } catch {
        issues.push({ code: "mapInvalid", path: template.map });
        return;
    }
    if (typeof map !== "object" || map === null || map.type !== "map" || !Array.isArray(map.layers)) {
        issues.push({ code: "mapInvalid", path: template.map });
        return;
    }
    if (map.orientation !== "orthogonal") issues.push({ code: "mapOrientation", path: template.map });
    if (map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE)
        issues.push({ code: "mapTileSize", path: template.map });
    if (map.width !== template.width || map.height !== template.height)
        issues.push({ code: "mapSize", path: template.map });
    const layers = allLayers(map.layers);
    if (!layers) {
        issues.push({ code: "mapInvalid", path: template.map });
        return;
    }
    if (!layers.some((l) => l.name === "floorLayer" && l.type === "objectgroup")) {
        issues.push({ code: "mapFloorLayer", path: template.map });
    }
    if (!layers.some((l) => l.name === "start")) issues.push({ code: "mapStartLayer", path: template.map });
    const tilesets = Array.isArray(map.tilesets) ? (map.tilesets as Record<string, unknown>[]) : [];
    for (const [index, tileset] of tilesets.entries()) {
        const here = `${template.map}#tilesets/${index}`;
        // External tileset files (.tsj) and URLs could point outside the package: refused.
        if (typeof tileset.source === "string" || typeof tileset.image !== "string") {
            issues.push({ code: "mapExternalTileset", path: here });
            continue;
        }
        const image = tileset.image;
        if (/^[a-z]+:/i.test(image) || image.startsWith("/") || image.includes("..") || image.includes("\\")) {
            issues.push({ code: "mapExternalTileset", path: here });
        } else if (!template.files.includes(image) || !files.has(image)) {
            issues.push({ code: "mapTilesetFile", path: here });
        }
    }
}

/**
 * Validates a package. `files` maps manifest paths to their bytes. The result lists every issue; the
 * package may be stored only when `ok` is true.
 */
export function validatePackage(rawManifest: unknown, files: Map<string, Buffer>): ValidationResult {
    const issues: Issue[] = [];
    const parsed = ComponentManifest.safeParse(rawManifest);
    if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 20)) {
            issues.push({ code: "manifestInvalid", path: issue.path.join(".") || "manifest" });
        }
        return { ok: false, issues, files: [] };
    }
    const manifest = parsed.data;
    const referenced = new Set(referencedFiles(manifest));

    let total = 0;
    for (const bytes of files.values()) total += bytes.length;
    if (total > LIMITS.packageBytes) issues.push({ code: "packageTooLarge", path: "package" });

    for (const path of referenced) if (!files.has(path)) issues.push({ code: "fileMissing", path });
    for (const path of files.keys()) if (!referenced.has(path)) issues.push({ code: "fileUnreferenced", path });

    const validated: ValidatedFile[] = [];
    const images = new Map<string, ImageInfo>();
    for (const [path, bytes] of files) {
        if (!referenced.has(path)) continue;
        const isImage = /\.(png|webp|jpe?g)$/.test(path);
        // Every file is sniffed: the stored media type then depends on the bytes only (assets are shared by
        // hash), and an image never travels under another type.
        const image = inspectImage(bytes);
        if (isImage && !image) issues.push({ code: "notAnImage", path });
        if (image) {
            images.set(path, image);
            if (bytes.length > LIMITS.imageBytes) issues.push({ code: "imageTooHeavy", path });
            const isTileset = manifest.template?.files.includes(path) ?? false;
            const max = isTileset ? LIMITS.tilesetPixels : LIMITS.entityPixels;
            if (image.width > max || image.height > max) issues.push({ code: "imageTooLarge", path });
        }
        validated.push({ path, bytes, sha256: sha256(bytes), contentType: contentTypeOf(path, image), image });
    }

    for (const [index, variant] of (manifest.entity?.variants ?? []).entries()) {
        const image = images.get(variant.image);
        if (!image || !variant.collisionGrid) continue;
        const here = `entity.variants.${index}`;
        // WorkAdventure snaps collidable entities to the grid: whole cells only.
        if (image.width % TILE_SIZE !== 0 || image.height % TILE_SIZE !== 0) {
            issues.push({ code: "notCellMultiple", path: here });
            continue;
        }
        const rows = image.height / TILE_SIZE;
        const columns = image.width / TILE_SIZE;
        if (variant.collisionGrid.length !== rows || variant.collisionGrid.some((row) => row.length !== columns)) {
            issues.push({ code: "collisionGridShape", path: here });
        }
    }

    if (manifest.template) validateMap(manifest, files, issues);

    // Unreferenced files are reported but do not block: they are simply not stored.
    const blocking = issues.filter((i) => i.code !== "fileUnreferenced");
    return { ok: blocking.length === 0, issues, manifest, files: validated };
}
