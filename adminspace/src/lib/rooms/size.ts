/**
 * Room sizes (client-safe): presets by team size, the options of map-storage's POST /resize, and the
 * summaries the pages show. Sizes are in tiles (WorkAdventure tiles are 32×32 pixels).
 *
 * Map-storage resizes a room's Tiled map and its WAM file together (WorkAdventure libs/map-editor,
 * MapResize.ts): `anchor` is the part of the map that stays in place, `fill` "extend" keeps the walls at the
 * edges and repeats the floor, "empty" adds blank space or crops.
 */

export const MIN_ROOM_TILES = 1;
export const MAX_ROOM_TILES = 500;

export const ROOM_SIZE_PRESETS = [
    { key: "small", people: 10, width: 20, height: 15 },
    { key: "medium", people: 25, width: 32, height: 24 },
    { key: "large", people: 50, width: 48, height: 36 },
    { key: "huge", people: 100, width: 64, height: 48 },
] as const;
export type RoomSizePresetKey = (typeof ROOM_SIZE_PRESETS)[number]["key"];
export const ROOM_SIZE_PRESET_KEYS = ROOM_SIZE_PRESETS.map((p) => p.key) as RoomSizePresetKey[];

/** What a size picker offers: a preset, a custom size, or (rooms from templates) the template's own size. */
export type SizeChoiceValue = RoomSizePresetKey | "custom" | "template";

export function isPresetKey(value: unknown): value is RoomSizePresetKey {
    return typeof value === "string" && (ROOM_SIZE_PRESET_KEYS as string[]).includes(value);
}

/** In reading order of the 3×3 "keep in place" grid (always laid out left to right: map directions are physical). */
export const RESIZE_ANCHORS = [
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
] as const;
export type ResizeAnchor = (typeof RESIZE_ANCHORS)[number];

export const RESIZE_FILLS = ["extend", "empty"] as const;
export type ResizeFill = (typeof RESIZE_FILLS)[number];

export interface RoomSize {
    width: number;
    height: number;
}

export interface ResizeOptions extends RoomSize {
    anchor: ResizeAnchor;
    fill: ResizeFill;
}

export function presetSize(key: RoomSizePresetKey): RoomSize {
    const preset = ROOM_SIZE_PRESETS.find((p) => p.key === key) ?? ROOM_SIZE_PRESETS[0];
    return { width: preset.width, height: preset.height };
}

/** The preset a size is exactly equal to, if any. */
export function presetOf(size: RoomSize): RoomSizePresetKey | undefined {
    return ROOM_SIZE_PRESETS.find((p) => p.width === size.width && p.height === size.height)?.key;
}

export function isRoomTileCount(value: number): boolean {
    return Number.isInteger(value) && value >= MIN_ROOM_TILES && value <= MAX_ROOM_TILES;
}

export function clampTiles(value: number): number {
    if (!Number.isFinite(value)) return MIN_ROOM_TILES;
    return Math.min(MAX_ROOM_TILES, Math.max(MIN_ROOM_TILES, Math.round(value)));
}

/** A bulk target: an exact size, or every room grown or shrunk by the same number of tiles on each axis. */
export type SizeTarget =
    | { mode: "exact"; width: number; height: number }
    | { mode: "grow"; tiles: number }
    | { mode: "shrink"; tiles: number };

/** The size a room gets for a target, or undefined when it leaves the allowed range (1 to 500 tiles). */
export function targetSize(current: RoomSize, target: SizeTarget): RoomSize | undefined {
    const size =
        target.mode === "exact"
            ? { width: target.width, height: target.height }
            : target.mode === "grow"
              ? { width: current.width + target.tiles, height: current.height + target.tiles }
              : { width: current.width - target.tiles, height: current.height - target.tiles };
    return isRoomTileCount(size.width) && isRoomTileCount(size.height) ? size : undefined;
}

/** The two halves of an anchor along each axis: "start" stays put, "end" moves, "center" splits the change. */
export function anchorAxes(anchor: ResizeAnchor): { x: "start" | "center" | "end"; y: "start" | "center" | "end" } {
    const x = anchor.endsWith("left") ? "start" : anchor.endsWith("right") ? "end" : "center";
    const y = anchor.startsWith("top") ? "start" : anchor.startsWith("bottom") ? "end" : "center";
    return { x, y };
}

/**
 * Where the current map sits inside the resized one, in tiles from the top-left corner (negative when it is
 * cropped on that side). Used to draw the preview.
 */
export function anchoredOffset(from: RoomSize, to: RoomSize, anchor: ResizeAnchor): { x: number; y: number } {
    const axes = anchorAxes(anchor);
    const offset = (delta: number, axis: "start" | "center" | "end") =>
        axis === "start" ? 0 : axis === "end" ? delta : Math.trunc(delta / 2);
    return { x: offset(to.width - from.width, axes.x), y: offset(to.height - from.height, axes.y) };
}

/** What a resize changes, as shown to people (computed from map-storage's report). */
export interface ResizeSummary {
    from: RoomSize;
    to: RoomSize;
    tileWidth: number;
    tileHeight: number;
    /** Positive when columns (rows) are added, negative when removed. */
    columns: number;
    rows: number;
    /** WAM entities (furniture) and areas that had to move or be clipped to stay inside the room. */
    movedObjects: number;
    movedAreas: number;
}

export function summarizeReport(report: {
    oldWidth: number;
    oldHeight: number;
    newWidth: number;
    newHeight: number;
    tileWidth: number;
    tileHeight: number;
    displacedEntities: readonly string[];
    displacedAreas: readonly string[];
}): ResizeSummary {
    return {
        from: { width: report.oldWidth, height: report.oldHeight },
        to: { width: report.newWidth, height: report.newHeight },
        tileWidth: report.tileWidth,
        tileHeight: report.tileHeight,
        columns: report.newWidth - report.oldWidth,
        rows: report.newHeight - report.oldHeight,
        movedObjects: report.displacedEntities.length,
        movedAreas: report.displacedAreas.length,
    };
}

/**
 * Why a room's size cannot be read or changed. Translated by the pages (office.problems), never shown raw.
 *
 * - tiled, noMap, notOnMapStorage, otherOrganization, external: AdminSpace cannot resize this map at all
 * - invalid (400), notFound (404), unresizable (422), unauthorized (401/403), unavailable (5xx, network)
 */
export const ROOM_SIZE_PROBLEMS = [
    "tiled",
    "noMap",
    "notOnMapStorage",
    "otherOrganization",
    "external",
    "invalid",
    "notFound",
    "unresizable",
    "unauthorized",
    "unavailable",
] as const;
export type RoomSizeProblem = (typeof ROOM_SIZE_PROBLEMS)[number];

/** Problems a retry will not fix (4xx and configuration): bulk jobs fail at once on them. */
export function isPermanentSizeProblem(problem: RoomSizeProblem): boolean {
    return problem !== "unavailable";
}

/** Why map-storage refused to resize a map (422), read from its message (office.reasons). */
export const RESIZE_REASONS = ["infinite", "compressed", "unreadable", "outside", "unknown"] as const;
export type ResizeReason = (typeof RESIZE_REASONS)[number];

export function resizeReasonOf(detail: string | undefined): ResizeReason {
    if (!detail) return "unknown";
    if (/infinite|chunks/i.test(detail)) return "infinite";
    if (/compress/i.test(detail)) return "compressed";
    if (/outside of its world|address of the tiled map/i.test(detail)) return "outside";
    if (/could not be read|not a valid tiled map|does not declare|layer .* is \d+/i.test(detail)) return "unreadable";
    return "unknown";
}

export interface CurrentSize extends RoomSize {
    tileWidth: number;
    tileHeight: number;
    /** Infinite Tiled maps have no fixed size and cannot be resized. */
    infinite: boolean;
}

/** A room's size as read from map-storage, or why it cannot be read. */
export type SizeReading = { status: "ok"; size: CurrentSize } | { status: "problem"; problem: RoomSizeProblem };

/** The answer of a resize (or of its dry run) as sent to pages. */
export type SizeAnswer =
    | { status: "ok"; summary: ResizeSummary }
    | { status: "problem"; problem: RoomSizeProblem; reason?: ResizeReason | undefined; detail?: string | undefined };
