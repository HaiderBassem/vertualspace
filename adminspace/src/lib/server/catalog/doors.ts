/**
 * Doors between rooms: WAM exit areas placed on a room's map (pure functions, tested in tests/office.pure.test.ts).
 *
 * The walkable grid comes from the Tiled map: a cell is blocked when one of its tiles has the `collides` property
 * (inline tilesets, as AdminSpace's templates have) or lies on a layer with `collides: true`. Doors never cover a
 * spawn point (the "start" layer, or a layer with `startLayer: true`), furniture or an existing area:
 *
 * - "entrance": one 2×1 door on the walkable cells nearest the bottom middle, where room templates have their
 *   doorway (bottom row first, then upwards);
 * - "walls": one door per target, 2×1 along the top and bottom walls or 1×2 along the side walls, spread evenly
 *   around the room, away from its entrance and its spawn point.
 */
import { createHash } from "node:crypto";
import type { TiledMap } from "./mapStorage";

export interface CellRect {
    /** Top-left cell and size, in tiles. */
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PixelRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WalkGrid {
    width: number;
    height: number;
    blocked: Uint8Array;
    start: Uint8Array;
}

const GID_MASK = 0x1fffffff;

interface TilesetLike {
    firstgid: number;
    tiles?: { id: number; properties?: { name: string; value: unknown }[] }[];
}

interface LayerLike {
    type: string;
    name?: string;
    data?: unknown;
    layers?: LayerLike[];
    properties?: { name: string; value: unknown }[];
}

function flatTileLayers(layers: LayerLike[]): LayerLike[] {
    return layers.flatMap((layer) =>
        layer.type === "group" ? flatTileLayers(layer.layers ?? []) : layer.type === "tilelayer" ? [layer] : [],
    );
}

function hasProperty(properties: { name: string; value: unknown }[] | undefined, name: string): boolean {
    return (properties ?? []).some((p) => p.name === name && p.value === true);
}

/** The blocked and spawn cells of a map. Layers whose data is not a plain array (encoded) are skipped. */
export function walkGrid(map: Pick<TiledMap, "width" | "height" | "layers" | "tilesets">): WalkGrid {
    const { width, height } = map;
    const blocked = new Uint8Array(width * height);
    const start = new Uint8Array(width * height);
    const tilesets = (map.tilesets as unknown as TilesetLike[]).slice().sort((a, b) => b.firstgid - a.firstgid);
    const collidingGids = new Set<number>();
    for (const tileset of tilesets) {
        for (const tile of tileset.tiles ?? []) {
            if (hasProperty(tile.properties, "collides")) collidingGids.add(tileset.firstgid + tile.id);
        }
    }
    for (const layer of flatTileLayers(map.layers as unknown as LayerLike[])) {
        if (!Array.isArray(layer.data) || layer.data.length !== width * height) continue;
        const isStart = layer.name === "start" || hasProperty(layer.properties, "startLayer");
        const layerCollides = hasProperty(layer.properties, "collides");
        (layer.data as unknown[]).forEach((value, index) => {
            const gid = typeof value === "number" ? value & GID_MASK : 0;
            if (gid === 0) return;
            if (isStart) start[index] = 1;
            else if (layerCollides || collidingGids.has(gid)) blocked[index] = 1;
        });
    }
    return { width, height, blocked, start };
}

/** Marks the cells a pixel rectangle touches. */
function markPixels(mask: Uint8Array, grid: WalkGrid, rect: PixelRect, tileWidth: number, tileHeight: number): void {
    const x0 = Math.max(0, Math.floor(rect.x / tileWidth));
    const y0 = Math.max(0, Math.floor(rect.y / tileHeight));
    const x1 = Math.min(grid.width - 1, Math.ceil((rect.x + rect.width) / tileWidth) - 1);
    const y1 = Math.min(grid.height - 1, Math.ceil((rect.y + rect.height) / tileHeight) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * grid.width + x] = 1;
}

/** Grows a mask by `radius` cells in every direction. */
function dilate(mask: Uint8Array, grid: WalkGrid, radius: number): Uint8Array {
    if (radius <= 0) return mask;
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            if (!mask[y * grid.width + x]) continue;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < grid.width && ny < grid.height) out[ny * grid.width + nx] = 1;
                }
            }
        }
    }
    return out;
}

function overlaps(a: CellRect, b: CellRect, gap: number): boolean {
    return (
        a.x < b.x + b.width + gap &&
        b.x < a.x + a.width + gap &&
        a.y < b.y + b.height + gap &&
        b.y < a.y + a.height + gap
    );
}

export interface DoorPlacementInput {
    map: Pick<TiledMap, "width" | "height" | "tilewidth" | "tileheight" | "layers" | "tilesets">;
    /** Furniture and existing areas, in pixels. */
    obstacles: PixelRect[];
    count: number;
    placement: "entrance" | "walls";
}

/** Cells where doors go (fewer than `count` when the room has no room left along its walls). */
export function placeDoors(input: DoorPlacementInput): CellRect[] {
    const { map, count } = input;
    if (count <= 0) return [];
    const grid = walkGrid(map);
    const { width: w, height: h } = grid;
    const obstacles = new Uint8Array(w * h);
    for (const rect of input.obstacles) markPixels(obstacles, grid, rect, map.tilewidth, map.tileheight);
    const at = (mask: Uint8Array, x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    const wall = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || grid.blocked[y * w + x] === 1;

    if (input.placement === "entrance") {
        const free = (x: number, y: number) =>
            !wall(x, y) && !at(grid.start, x, y) && !at(obstacles, x, y) && x >= 0 && x < w;
        const center = w / 2;
        for (let y = h - 1; y >= 0; y--) {
            let best: CellRect | undefined;
            for (let x = 0; x + 1 < w; x++) {
                if (!free(x, y) || !free(x + 1, y)) continue;
                const door = { x, y, width: 2, height: 1 };
                if (!best || Math.abs(x + 1 - center) < Math.abs(best.x + 1 - center)) best = door;
            }
            if (best) return [best];
        }
        return [];
    }

    // Along the walls: keep the spawn point and the entrance (walkable cells of the bottom row) clear.
    const entrance = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) if (!wall(x, h - 1)) entrance[(h - 1) * w + x] = 1;
    const keepClear = dilate(entrance, grid, 2);
    const spawn = dilate(grid.start, grid, 2);
    const free = (x: number, y: number) =>
        !wall(x, y) && !at(obstacles, x, y) && !at(keepClear, x, y) && !at(spawn, x, y);

    const candidates: CellRect[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (
                free(x, y) &&
                free(x + 1, y) &&
                ((wall(x, y - 1) && wall(x + 1, y - 1)) || (wall(x, y + 1) && wall(x + 1, y + 1)))
            ) {
                candidates.push({ x, y, width: 2, height: 1 });
            }
            if (
                free(x, y) &&
                free(x, y + 1) &&
                ((wall(x - 1, y) && wall(x - 1, y + 1)) || (wall(x + 1, y) && wall(x + 1, y + 1)))
            ) {
                candidates.push({ x, y, width: 1, height: 2 });
            }
        }
    }
    if (candidates.length === 0) return [];
    // Around the room, clockwise from the top-left corner, so that doors spread over every wall.
    const cx = w / 2;
    const cy = h / 2;
    const angle = (r: CellRect) => {
        const a = Math.atan2(r.y + r.height / 2 - cy, r.x + r.width / 2 - cx);
        const fromTopLeft = a - Math.atan2(-cy, -cx);
        return fromTopLeft < 0 ? fromTopLeft + 2 * Math.PI : fromTopLeft;
    };
    candidates.sort((a, b) => angle(a) - angle(b) || a.y - b.y || a.x - b.x);

    const chosen: CellRect[] = [];
    const n = candidates.length;
    for (let i = 0; i < count; i++) {
        const wanted = Math.floor(((i + 0.5) * n) / count);
        for (let step = 0; step < n; step++) {
            // Nearest free candidate to the evenly spaced position, alternating after and before it.
            const index = (wanted + (step % 2 === 0 ? step / 2 : n - (step + 1) / 2)) % n;
            const candidate = candidates[index]!;
            if (chosen.every((c) => !overlaps(c, candidate, 1))) {
                chosen.push(candidate);
                break;
            }
        }
    }
    return chosen;
}

/** A stable UUID (v4 layout) from a seed: the same door gets the same id when a job is retried. */
export function stableUuid(seed: string): string {
    const hex = createHash("sha256").update(seed).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** A WAM exit area (libs/map-editor AreaData with an ExitPropertyData), in pixels. */
export interface ExitArea {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: true;
    properties: { id: string; type: "exit"; url: string; areaName: "" }[];
}

export function exitArea(input: {
    seed: string;
    name: string;
    url: string;
    cells: CellRect;
    tileWidth: number;
    tileHeight: number;
}): ExitArea {
    return {
        id: stableUuid(`door:${input.seed}`),
        name: input.name,
        x: input.cells.x * input.tileWidth,
        y: input.cells.y * input.tileHeight,
        width: input.cells.width * input.tileWidth,
        height: input.cells.height * input.tileHeight,
        visible: true,
        properties: [{ id: stableUuid(`exit:${input.seed}`), type: "exit", url: input.url, areaName: "" }],
    };
}
