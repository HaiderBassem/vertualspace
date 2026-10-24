import type {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapProperty,
    ITiledMapTileLayer,
} from "@workadventure/tiled-map-type-guard";
import { z } from "zod";
import type { AreaData, WAMFileFormat } from "../types";
import { GameMapProperties } from "../types";

/**
 * Resizing a map (Tiled TMJ + its WAM file) to new dimensions, in tiles.
 *
 * Each axis is resized independently through an {@link AxisMapping}: for every cell (column or row) of the resized
 * map, the cell of the original map it is copied from. Everything positioned in pixels (WAM entities and areas,
 * Tiled objects, image layers) is moved through the same mapping, so the content and its zones stay aligned.
 *
 * Two fill modes:
 * - "extend" grows or shrinks the map the way a room grows: the outer border (usually the walls) stays at the edge
 *   and the most uniform slice of the map near that edge is repeated (or removed). Areas that span the repeated slice
 *   stretch with it.
 * - "empty" adds empty space outside the current edges (or crops them), like a canvas resize in an image editor.
 */

export const MAP_RESIZE_MIN_TILES = 1;
export const MAP_RESIZE_MAX_TILES = 500;

export const MapResizeAnchor = z.enum([
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
]);
export type MapResizeAnchor = z.infer<typeof MapResizeAnchor>;

export const MapResizeFill = z.enum(["extend", "empty"]);
export type MapResizeFill = z.infer<typeof MapResizeFill>;

const TileCount = z.number().int().min(MAP_RESIZE_MIN_TILES).max(MAP_RESIZE_MAX_TILES);

export const MapResizeRequest = z.object({
    width: TileCount,
    height: TileCount,
    /** The part of the map that stays in place: with "top-left", the map grows (or shrinks) to the right and bottom. */
    anchor: MapResizeAnchor.default("top-left"),
    fill: MapResizeFill.default("extend"),
});
export type MapResizeRequest = z.input<typeof MapResizeRequest>;

export class MapResizeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MapResizeError";
    }
}

export type AxisAnchor = "start" | "center" | "end";

export interface AxisMapping {
    oldSize: number;
    newSize: number;
    /** For each cell of the resized map, the cell of the original map it copies, or -1 when it is empty. */
    newToOld: number[];
    /** For each cell of the original map, the first cell of the resized map copying it, or -1 when it was removed. */
    oldToFirst: number[];
    /** For each cell of the original map, the last cell of the resized map copying it, or -1 when it was removed. */
    oldToLast: number[];
}

export interface MapResizeReport extends DisplacedContent {
    oldWidth: number;
    oldHeight: number;
    newWidth: number;
    newHeight: number;
    tileWidth: number;
    tileHeight: number;
    /** {@link AxisMapping.newToOld} of the columns: lets clients preview the result or move a position. */
    columns: number[];
    /** {@link AxisMapping.newToOld} of the rows. */
    rows: number[];
}

export interface MapResizeResult {
    map: ITiledMap;
    wam: WAMFileFormat | undefined;
    report: MapResizeReport;
}

interface DecodedTileLayer {
    name: string;
    data: number[];
    repeatable: boolean;
}

/**
 * Returns resized copies of a Tiled map and of its WAM file (the inputs are not modified).
 *
 * @throws MapResizeError when the map cannot be resized (infinite map, compressed layers, inconsistent layer sizes).
 */
export function resizeMap(map: ITiledMap, wam: WAMFileFormat | undefined, request: MapResizeRequest): MapResizeResult {
    const { width, height, anchor, fill } = MapResizeRequest.parse(request);

    if (map.infinite) {
        throw new MapResizeError("Infinite maps cannot be resized. Save the map as a fixed-size map in Tiled first.");
    }
    const oldWidth = map.width;
    const oldHeight = map.height;
    const tileWidth = map.tilewidth;
    const tileHeight = map.tileheight;
    if (!oldWidth || !oldHeight || !tileWidth || !tileHeight) {
        throw new MapResizeError("The map does not declare its width, height and tile size.");
    }

    const tileLayers: DecodedTileLayer[] = collectTileLayers(map.layers).map((layer) => {
        if (layer.width !== oldWidth || layer.height !== oldHeight) {
            throw new MapResizeError(
                `The layer "${layer.name}" is ${layer.width}×${layer.height} tiles but the map is ` +
                    `${oldWidth}×${oldHeight}.`,
            );
        }
        return { name: layer.name, data: decodeTileData(layer), repeatable: isRepeatableLayer(layer) };
    });
    const areas = wam?.areas ?? [];

    const columns = buildAxisMapping(oldWidth, width, horizontalAnchor(anchor), fill, (column) =>
        sliceCost(tileLayers, areas, oldWidth, oldHeight, tileWidth, "column", column),
    );
    const rows = buildAxisMapping(oldHeight, height, verticalAnchor(anchor), fill, (row) =>
        sliceCost(tileLayers, areas, oldWidth, oldHeight, tileHeight, "row", row),
    );

    const newMap = structuredClone(map);
    newMap.width = width;
    newMap.height = height;
    collectTileLayers(newMap.layers).forEach((layer, index) => {
        const { data, repeatable } = tileLayers[index];
        layer.data = remapTileData(data, columns, rows, repeatable);
        layer.width = width;
        layer.height = height;
        delete layer.encoding;
        delete layer.compression;
    });
    moveLayerContents(newMap.layers, columns, rows, tileWidth, tileHeight);

    let newWam: WAMFileFormat | undefined;
    let displaced: DisplacedContent = { displacedEntities: [], displacedAreas: [] };
    if (wam) {
        newWam = structuredClone(wam);
        displaced = moveWamContent(newWam, columns, rows, tileWidth, tileHeight);
    }
    const { displacedEntities, displacedAreas } = displaced;

    return {
        map: newMap,
        wam: newWam,
        report: {
            oldWidth,
            oldHeight,
            newWidth: width,
            newHeight: height,
            tileWidth,
            tileHeight,
            columns: columns.newToOld,
            rows: rows.newToOld,
            displacedEntities,
            displacedAreas,
        },
    };
}

/** What a resize did to the map grid: enough to move anything positioned on the original map. */
export type MapResizeLayout = Pick<
    MapResizeReport,
    "oldWidth" | "oldHeight" | "tileWidth" | "tileHeight" | "columns" | "rows"
>;

/**
 * Moves the entities and areas of a WAM file (in place) the way {@link resizeMap} moved them. Used by the services
 * that hold their own copy of a WAM file to replay a resize already applied to the stored map.
 *
 * @throws MapResizeError when the layout is not consistent.
 */
export function applyResizeToWam(wam: WAMFileFormat, layout: MapResizeLayout): DisplacedContent {
    const { columns, rows } = axisMappingsFromLayout(layout);
    return moveWamContent(wam, columns, rows, layout.tileWidth, layout.tileHeight);
}

/** Where a position (in pixels) of the original map is on the resized map, e.g. to keep a player where they stood. */
export function mapResizedPosition(
    position: { x: number; y: number },
    layout: MapResizeLayout,
): { x: number; y: number } {
    const { columns, rows } = axisMappingsFromLayout(layout);
    const maxX = columns.newSize * layout.tileWidth - 1;
    const maxY = rows.newSize * layout.tileHeight - 1;
    return {
        x: clamp(mapPoint(position.x, columns, layout.tileWidth).position, 0, maxX),
        y: clamp(mapPoint(position.y, rows, layout.tileHeight).position, 0, maxY),
    };
}

function axisMappingsFromLayout(layout: MapResizeLayout): { columns: AxisMapping; rows: AxisMapping } {
    if (!(layout.tileWidth > 0) || !(layout.tileHeight > 0)) {
        throw new MapResizeError("Invalid resize layout: the tile size must be positive.");
    }
    return {
        columns: axisMappingFromCells(layout.oldWidth, layout.columns),
        rows: axisMappingFromCells(layout.oldHeight, layout.rows),
    };
}

/**
 * Rebuilds an {@link AxisMapping} from its {@link AxisMapping.newToOld} list.
 *
 * @throws MapResizeError when a cell does not exist on the original map or the sizes are out of range.
 */
export function axisMappingFromCells(oldSize: number, newToOld: number[]): AxisMapping {
    const validSize = (size: number) =>
        Number.isInteger(size) && size >= MAP_RESIZE_MIN_TILES && size <= MAP_RESIZE_MAX_TILES;
    if (!validSize(oldSize) || !validSize(newToOld.length)) {
        throw new MapResizeError("Invalid resize layout: sizes out of range.");
    }
    const oldToFirst = new Array<number>(oldSize).fill(-1);
    const oldToLast = new Array<number>(oldSize).fill(-1);
    newToOld.forEach((oldCell, newCell) => {
        if (!Number.isInteger(oldCell) || oldCell < -1 || oldCell >= oldSize) {
            throw new MapResizeError(`Invalid resize layout: cell ${oldCell} does not exist on the original map.`);
        }
        if (oldCell < 0) return;
        if (oldToFirst[oldCell] === -1) oldToFirst[oldCell] = newCell;
        oldToLast[oldCell] = newCell;
    });
    return { oldSize, newSize: newToOld.length, newToOld: [...newToOld], oldToFirst, oldToLast };
}

export interface DisplacedContent {
    /** WAM entities that stood on removed cells or outside the new bounds, and were moved inside. */
    displacedEntities: string[];
    /** WAM areas that were partly or entirely on removed cells, and were moved or clipped to stay inside. */
    displacedAreas: string[];
}

function moveWamContent(
    wam: WAMFileFormat,
    columns: AxisMapping,
    rows: AxisMapping,
    tileWidth: number,
    tileHeight: number,
): DisplacedContent {
    const displacedEntities: string[] = [];
    const displacedAreas: string[] = [];
    const maxX = columns.newSize * tileWidth;
    const maxY = rows.newSize * tileHeight;
    for (const [id, entity] of Object.entries(wam.entities)) {
        const x = mapPoint(entity.x, columns, tileWidth);
        const y = mapPoint(entity.y, rows, tileHeight);
        entity.x = clamp(x.position, 0, maxX - tileWidth);
        entity.y = clamp(y.position, 0, maxY - tileHeight);
        if (x.displaced || y.displaced || entity.x !== x.position || entity.y !== y.position) {
            displacedEntities.push(id);
        }
    }
    for (const area of wam.areas) {
        if (moveArea(area, columns, rows, tileWidth, tileHeight, maxX, maxY)) {
            displacedAreas.push(area.id);
        }
    }
    return { displacedEntities, displacedAreas };
}

function horizontalAnchor(anchor: MapResizeAnchor): AxisAnchor {
    if (anchor.endsWith("left")) return "start";
    if (anchor.endsWith("right")) return "end";
    return "center";
}

function verticalAnchor(anchor: MapResizeAnchor): AxisAnchor {
    if (anchor.startsWith("top")) return "start";
    if (anchor.startsWith("bottom")) return "end";
    return "center";
}

/**
 * How visible repeating a column (or row) would be: the number of tiles that differ from their neighbours across
 * the slice, plus a heavy penalty when an area edge falls inside it (repeating it would move that edge).
 */
function sliceCost(
    tileLayers: DecodedTileLayer[],
    areas: AreaData[],
    mapWidth: number,
    mapHeight: number,
    tileSize: number,
    axis: "column" | "row",
    cell: number,
): number {
    const length = axis === "column" ? mapHeight : mapWidth;
    const size = axis === "column" ? mapWidth : mapHeight;
    const tileAt = (data: number[], along: number, across: number): number =>
        axis === "column" ? data[along * mapWidth + across] : data[across * mapWidth + along];

    let cost = 0;
    for (const { data, repeatable } of tileLayers) {
        if (!repeatable) {
            continue;
        }
        for (let along = 0; along < length; along++) {
            const tile = tileAt(data, along, cell);
            if (cell > 0 && tile !== tileAt(data, along, cell - 1)) cost++;
            if (cell < size - 1 && tile !== tileAt(data, along, cell + 1)) cost++;
        }
    }
    for (const area of areas) {
        const start = axis === "column" ? area.x : area.y;
        const extent = axis === "column" ? area.width : area.height;
        if (edgeFallsInCell(start, cell, tileSize) || edgeFallsInCell(start + extent, cell, tileSize)) {
            cost += 2 * length;
        }
    }
    return cost;
}

/**
 * Builds the mapping of one axis. `anchor` is the side that stays in place: the change happens on the other side
 * ("center" splits it between both sides). `sliceCost` scores how visible repeating a cell would be (lower is better);
 * it is only used to grow with the "extend" fill.
 */
export function buildAxisMapping(
    oldSize: number,
    newSize: number,
    anchor: AxisAnchor,
    fill: MapResizeFill,
    sliceCost: (cell: number) => number = () => 0,
): AxisMapping {
    const delta = newSize - oldSize;
    const startDelta = anchor === "end" ? delta : anchor === "center" ? Math.trunc(delta / 2) : 0;
    const endDelta = delta - startDelta;

    let newToOld: number[];
    if (delta === 0) {
        newToOld = range(0, oldSize);
    } else if (fill === "empty" || newSize < 2 || (delta > 0 && oldSize < 3)) {
        // Add empty cells outside the edges, or crop them. Also used when the map is too small to have borders to
        // keep: "extend" then repeats the edge cells themselves (see below), or crops.
        if (fill === "extend" && delta > 0) {
            newToOld = [
                ...new Array<number>(startDelta).fill(0),
                ...range(0, oldSize),
                ...new Array<number>(endDelta).fill(oldSize - 1),
            ];
        } else {
            newToOld = [
                ...new Array<number>(Math.max(startDelta, 0)).fill(-1),
                ...range(Math.max(-startDelta, 0), oldSize - Math.max(-endDelta, 0)),
                ...new Array<number>(Math.max(endDelta, 0)).fill(-1),
            ];
        }
    } else if (delta > 0) {
        const half = Math.floor(oldSize / 2);
        const startSeam = startDelta > 0 ? cheapestCell(1, Math.min(half, oldSize - 2), sliceCost, "low") : -1;
        const endSeam = endDelta > 0 ? cheapestCell(Math.max(half, 1), oldSize - 2, sliceCost, "high") : -1;
        newToOld = [];
        for (let cell = 0; cell < oldSize; cell++) {
            newToOld.push(cell);
            if (cell === startSeam) newToOld.push(...new Array<number>(startDelta).fill(cell));
            if (cell === endSeam) newToOld.push(...new Array<number>(endDelta).fill(cell));
        }
    } else {
        // Remove the cells just inside the borders, keeping the first and last cells.
        const removed = new Set<number>([...range(1, 1 - startDelta), ...range(oldSize - 1 + endDelta, oldSize - 1)]);
        newToOld = range(0, oldSize).filter((cell) => !removed.has(cell));
    }

    const oldToFirst = new Array<number>(oldSize).fill(-1);
    const oldToLast = new Array<number>(oldSize).fill(-1);
    newToOld.forEach((oldCell, newCell) => {
        if (oldCell < 0) return;
        if (oldToFirst[oldCell] === -1) oldToFirst[oldCell] = newCell;
        oldToLast[oldCell] = newCell;
    });
    return { oldSize, newSize, newToOld, oldToFirst, oldToLast };
}

/**
 * The cell with the lowest cost between `from` and `to` (inclusive). Ties go to the cell nearest the edge being
 * resized ("low" for the start edge, "high" for the end edge).
 */
function cheapestCell(from: number, to: number, cost: (cell: number) => number, prefer: "low" | "high"): number {
    let best = prefer === "low" ? from : to;
    let bestCost = cost(best);
    for (let cell = from; cell <= to; cell++) {
        const cellCost = cost(cell);
        if (cellCost < bestCost || (cellCost === bestCost && prefer === "high" && cell > best)) {
            best = cell;
            bestCost = cellCost;
        }
    }
    return best;
}

export interface MappedPosition {
    position: number;
    /** True when the original position was on a removed cell. */
    displaced: boolean;
}

/** Moves a position (or the start edge of a rectangle), in pixels, through an axis mapping. */
export function mapPoint(position: number, axis: AxisMapping, tileSize: number): MappedPosition {
    const cell = Math.floor(position / tileSize);
    return mapThroughCell(position, cell, axis.oldToFirst, axis, tileSize);
}

/** Moves the end edge (exclusive) of a rectangle, in pixels, through an axis mapping. */
function mapEndEdge(position: number, axis: AxisMapping, tileSize: number): MappedPosition {
    const cell = Math.ceil(position / tileSize) - 1;
    return mapThroughCell(position, cell, axis.oldToLast, axis, tileSize);
}

function mapThroughCell(
    position: number,
    cell: number,
    oldToNew: number[],
    axis: AxisMapping,
    tileSize: number,
): MappedPosition {
    if (cell < 0) {
        return { position: position + edgeShift(axis, "start", tileSize), displaced: false };
    }
    if (cell >= axis.oldSize) {
        return { position: position + edgeShift(axis, "end", tileSize), displaced: false };
    }
    const newCell = oldToNew[cell];
    if (newCell >= 0) {
        return { position: newCell * tileSize + (position - cell * tileSize), displaced: false };
    }
    return { position: nearestKeptBoundary(axis, cell, tileSize), displaced: true };
}

/** How far content beyond the start (or end) edge of the original map moves. */
function edgeShift(axis: AxisMapping, edge: "start" | "end", tileSize: number): number {
    if (edge === "start") {
        const firstKept = axis.oldToFirst.findIndex((cell) => cell >= 0);
        return firstKept < 0 ? 0 : (axis.oldToFirst[firstKept] - firstKept) * tileSize;
    }
    for (let cell = axis.oldSize - 1; cell >= 0; cell--) {
        if (axis.oldToLast[cell] >= 0) {
            return (axis.oldToLast[cell] - cell) * tileSize;
        }
    }
    return 0;
}

/** Where content standing on a removed cell goes: right after the last kept cell before it. */
function nearestKeptBoundary(axis: AxisMapping, removedCell: number, tileSize: number): number {
    for (let cell = removedCell - 1; cell >= 0; cell--) {
        if (axis.oldToLast[cell] >= 0) {
            return (axis.oldToLast[cell] + 1) * tileSize;
        }
    }
    return 0;
}

function edgeFallsInCell(edge: number, cell: number, tileSize: number): boolean {
    return edge > cell * tileSize && edge < (cell + 1) * tileSize;
}

/** Moves (and stretches) an area. Returns true when it had to be moved or clipped to stay inside the map. */
function moveArea(
    area: AreaData,
    columns: AxisMapping,
    rows: AxisMapping,
    tileWidth: number,
    tileHeight: number,
    maxX: number,
    maxY: number,
): boolean {
    const left = mapPoint(area.x, columns, tileWidth);
    const right = mapEndEdge(area.x + area.width, columns, tileWidth);
    const top = mapPoint(area.y, rows, tileHeight);
    const bottom = mapEndEdge(area.y + area.height, rows, tileHeight);

    const x = clampRange(left.position, right.position, area.width, maxX);
    const y = clampRange(top.position, bottom.position, area.height, maxY);
    const displaced =
        left.displaced ||
        right.displaced ||
        top.displaced ||
        bottom.displaced ||
        x.start !== left.position ||
        x.end !== right.position ||
        y.start !== top.position ||
        y.end !== bottom.position;

    area.x = x.start;
    area.width = x.end - x.start;
    area.y = y.start;
    area.height = y.end - y.start;
    return displaced;
}

/**
 * Keeps a [start, end) range inside [0, max). A range that collapsed (it was entirely on removed cells) gets its
 * original size back, as long as it fits.
 */
function clampRange(start: number, end: number, originalSize: number, max: number): { start: number; end: number } {
    let size = end - start;
    if (size <= 0) {
        size = originalSize;
    }
    size = Math.min(size, max);
    const clampedStart = clamp(start, 0, max - size);
    return { start: clampedStart, end: clampedStart + size };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

function range(from: number, to: number): number[] {
    const values: number[] = [];
    for (let value = from; value < to; value++) {
        values.push(value);
    }
    return values;
}

function collectTileLayers(layers: ITiledMapLayer[]): ITiledMapTileLayer[] {
    const tileLayers: ITiledMapTileLayer[] = [];
    for (const layer of layers) {
        if (layer.type === "tilelayer") {
            tileLayers.push(layer);
        } else if (layer.type === "group") {
            tileLayers.push(...collectTileLayers(layer.layers));
        }
    }
    return tileLayers;
}

/**
 * Spawn points and exits must not be repeated when the map is stretched: these layers only keep their original
 * tiles.
 */
function isRepeatableLayer(layer: ITiledMapTileLayer): boolean {
    if (layer.name === "start") {
        return false;
    }
    const properties: ITiledMapProperty[] = layer.properties ?? [];
    return !properties.some(
        (property) =>
            (property.name === GameMapProperties.START_LAYER && property.value === true) ||
            property.name === GameMapProperties.EXIT_URL ||
            property.name === GameMapProperties.EXIT_SCENE_URL,
    );
}

function decodeTileData(layer: ITiledMapTileLayer): number[] {
    if (layer.chunks) {
        throw new MapResizeError(`The layer "${layer.name}" is made of chunks (infinite map) and cannot be resized.`);
    }
    if (Array.isArray(layer.data)) {
        return layer.data;
    }
    if (layer.compression) {
        throw new MapResizeError(
            `The layer "${layer.name}" is compressed (${layer.compression}). Save the map in Tiled with the CSV ` +
                `or uncompressed Base64 layer format to resize it.`,
        );
    }
    const binary = atob(layer.data);
    const tiles: number[] = [];
    for (let index = 0; index + 3 < binary.length; index += 4) {
        // Tile GIDs are little-endian unsigned 32-bit integers (the high bits carry the flip flags).
        tiles.push(
            (binary.charCodeAt(index) |
                (binary.charCodeAt(index + 1) << 8) |
                (binary.charCodeAt(index + 2) << 16) |
                (binary.charCodeAt(index + 3) << 24)) >>>
                0,
        );
    }
    return tiles;
}

function remapTileData(data: number[], columns: AxisMapping, rows: AxisMapping, repeatable: boolean): number[] {
    const tiles = new Array<number>(columns.newSize * rows.newSize).fill(0);
    rows.newToOld.forEach((oldRow, newRow) => {
        if (oldRow < 0 || (!repeatable && rows.oldToFirst[oldRow] !== newRow)) return;
        columns.newToOld.forEach((oldColumn, newColumn) => {
            if (oldColumn < 0 || (!repeatable && columns.oldToFirst[oldColumn] !== newColumn)) return;
            tiles[newRow * columns.newSize + newColumn] = data[oldRow * columns.oldSize + oldColumn];
        });
    });
    return tiles;
}

/** Moves Tiled objects and image layers through the mappings (tile layers are remapped separately). */
function moveLayerContents(
    layers: ITiledMapLayer[],
    columns: AxisMapping,
    rows: AxisMapping,
    tileWidth: number,
    tileHeight: number,
): void {
    for (const layer of layers) {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                moveObject(object, columns, rows, tileWidth, tileHeight);
            }
        } else if (layer.type === "imagelayer") {
            layer.offsetx = mapPoint(layer.offsetx ?? 0, columns, tileWidth).position;
            layer.offsety = mapPoint(layer.offsety ?? 0, rows, tileHeight).position;
        } else if (layer.type === "group") {
            moveLayerContents(layer.layers, columns, rows, tileWidth, tileHeight);
        }
    }
}

function moveObject(
    object: ITiledMapObject,
    columns: AxisMapping,
    rows: AxisMapping,
    tileWidth: number,
    tileHeight: number,
): void {
    const width = object.width ?? 0;
    const height = object.height ?? 0;
    const isRectangle = !object.point && !object.polygon && !object.polyline && width > 0 && height > 0;
    if (object.gid !== undefined) {
        // Tile objects are anchored at their bottom-left corner: move their top-left corner, keep their size.
        object.x = mapPoint(object.x, columns, tileWidth).position;
        object.y = mapPoint(object.y - height, rows, tileHeight).position + height;
    } else if (isRectangle) {
        const left = mapPoint(object.x, columns, tileWidth).position;
        const top = mapPoint(object.y, rows, tileHeight).position;
        object.width = Math.max(mapEndEdge(object.x + width, columns, tileWidth).position - left, 1);
        object.height = Math.max(mapEndEdge(object.y + height, rows, tileHeight).position - top, 1);
        object.x = left;
        object.y = top;
    } else {
        object.x = mapPoint(object.x, columns, tileWidth).position;
        object.y = mapPoint(object.y, rows, tileHeight).position;
    }
}
