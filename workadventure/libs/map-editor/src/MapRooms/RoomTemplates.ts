import type {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapProperty,
    ITiledMapTileLayer,
    ITiledMapTileset,
} from "@workadventure/tiled-map-type-guard";
import { z } from "zod";
import type { AreaData, CollectionUrl, WAMFileFormat } from "../types";
import { GameMapProperties } from "../types";
import { MAP_RESIZE_MAX_TILES } from "../MapResize/MapResize";

/**
 * New rooms for a world, built from one of its rooms so they share its look:
 * - "blank": the floor of the room everywhere, its walls all around, and nothing else;
 * - "copy": the room as it is (map, furniture and areas).
 * Both get a start area and, when given, a door back to the room they were made from.
 */
export const RoomTemplate = z.enum(["blank", "copy"]);
export type RoomTemplate = z.infer<typeof RoomTemplate>;

/** Smallest room with a floor inside its walls. */
export const ROOM_MIN_TILES = 3;

export const CreateRoomRequest = z.object({
    name: z.string().trim().min(1).max(100),
    template: RoomTemplate.default("blank"),
    /** Size of a blank room, in tiles. A copy keeps the size of the room it copies. */
    width: z.number().int().min(ROOM_MIN_TILES).max(MAP_RESIZE_MAX_TILES).default(20),
    height: z.number().int().min(ROOM_MIN_TILES).max(MAP_RESIZE_MAX_TILES).default(15),
    /**
     * Where the door of the new room leads (the room it was made from), as a path of this WorkAdventure, e.g.
     * "/@/acme/office/lobby" or "/~/maps/lobby.wam". No door when undefined.
     */
    returnUrl: z
        .string()
        .regex(/^\/[^/\\]/, "The return URL must be a path of this WorkAdventure (it starts with a single /).")
        .max(2000)
        .optional(),
});
export type CreateRoomRequest = z.input<typeof CreateRoomRequest>;

export interface RoomStyle {
    /** The tile covering most of the floor. */
    floorGid: number;
    /** The colliding tile used the most (the walls), if the map has one. */
    wallGid: number | undefined;
}

export interface NewRoom {
    map: ITiledMap;
    wam: WAMFileFormat;
}

export interface NewRoomOptions {
    /** Turns a URL relative to the source map into one relative to the new map (absolute URLs are kept). */
    rebaseUrl: (url: string) => string;
    /** The mapUrl of the new WAM file (relative to it), e.g. "./map.tmj". */
    mapUrl: string;
    /** Version of the WAM format to write. */
    wamVersion: string;
    /** Creates the ids of the new areas and properties. */
    newId: () => string;
}

// Tiled stores the flip flags in the 3 high bits of the GIDs (plus a 4th one for hexagonal maps).
const GID_MASK = 0x0fffffff;

/** Finds the floor and the walls of a map, to build new rooms that look the same. */
export function detectRoomStyle(map: ITiledMap): RoomStyle {
    const collidingGids = new Set<number>();
    for (const tileset of map.tilesets) {
        if (!("tiles" in tileset) || tileset.firstgid === undefined) continue;
        for (const tile of tileset.tiles ?? []) {
            if (tile.properties?.some((p) => p.name === GameMapProperties.COLLIDES && p.value === true)) {
                collidingGids.add(tileset.firstgid + tile.id);
            }
        }
    }

    const tileLayers = collectTileLayers(map.layers).filter((layer) => Array.isArray(layer.data));
    const floorCounts = new Map<number, number>();
    const wallCounts = new Map<number, number>();
    // The floor is the most common walkable tile of the lowest layer that covers most of the map.
    const floorLayer =
        tileLayers.find((layer) => countNonEmpty(layer) >= (layer.width * layer.height) / 2) ?? tileLayers[0];
    for (const layer of tileLayers) {
        for (const value of tileData(layer)) {
            const gid = value & GID_MASK;
            if (gid === 0) continue;
            if (collidingGids.has(gid)) {
                wallCounts.set(gid, (wallCounts.get(gid) ?? 0) + 1);
            } else if (layer === floorLayer) {
                floorCounts.set(gid, (floorCounts.get(gid) ?? 0) + 1);
            }
        }
    }
    const floorGid = mostCommon(floorCounts) ?? mostCommon(wallCounts) ?? 0;
    return { floorGid, wallGid: mostCommon(wallCounts) };
}

/** A blank room in the style of `styleMap`: floor everywhere, walls all around, a start area and a door. */
export function createBlankRoom(
    styleMap: ITiledMap,
    sourceWam: WAMFileFormat | undefined,
    request: z.output<typeof CreateRoomRequest>,
    options: NewRoomOptions,
): NewRoom {
    const { width, height } = request;
    const tileWidth = styleMap.tilewidth ?? 32;
    const tileHeight = styleMap.tileheight ?? 32;
    const style = detectRoomStyle(styleMap);

    const floor = new Array<number>(width * height).fill(style.floorGid);
    const layers: ITiledMapLayer[] = [tileLayer(1, "floor", width, height, floor)];
    if (style.wallGid !== undefined) {
        const walls = new Array<number>(width * height).fill(0);
        for (let x = 0; x < width; x++) {
            walls[x] = style.wallGid;
            walls[(height - 1) * width + x] = style.wallGid;
        }
        for (let y = 0; y < height; y++) {
            walls[y * width] = style.wallGid;
            walls[y * width + width - 1] = style.wallGid;
        }
        // The door back needs a gap in the bottom wall.
        if (request.returnUrl !== undefined) {
            for (const x of doorColumns(width)) walls[(height - 1) * width + x] = 0;
        }
        layers.push(tileLayer(2, "walls", width, height, walls));
    }
    layers.push({
        id: 3,
        name: "floorLayer",
        type: "objectgroup",
        opacity: 1,
        visible: true,
        draworder: "topdown",
        objects: [],
    });

    const usedGids = [style.floorGid, style.wallGid].filter((gid): gid is number => gid !== undefined && gid > 0);
    const map: ITiledMap = {
        type: "map",
        version: styleMap.version,
        tiledversion: styleMap.tiledversion,
        orientation: "orthogonal",
        renderorder: "right-down",
        infinite: false,
        width,
        height,
        tilewidth: tileWidth,
        tileheight: tileHeight,
        nextlayerid: 4,
        nextobjectid: 1,
        tilesets: rebaseTilesets(tilesetsFor(styleMap.tilesets, usedGids), options.rebaseUrl),
        layers,
        properties: creditProperties(styleMap.properties),
    };

    const areas: AreaData[] = [
        startArea(options.newId, Math.floor(width / 2) - 1, Math.floor(height / 2) - 1, 2, 2, tileWidth, tileHeight),
    ];
    if (request.returnUrl !== undefined) {
        const [doorX] = doorColumns(width);
        areas.push(
            exitArea(
                options.newId,
                request.returnUrl,
                doorX,
                height - 1,
                doorColumns(width).length,
                tileWidth,
                tileHeight,
            ),
        );
    }

    return {
        map,
        wam: {
            version: options.wamVersion,
            mapUrl: options.mapUrl,
            entities: {},
            areas,
            entityCollections: entityCollectionsOf(sourceWam),
            metadata: { name: request.name },
        },
    };
}

/**
 * A copy of a room (its Tiled map and its WAM file), renamed. Personal desks are released, and a door back to the
 * original room is added at the default start area when a return URL is given.
 */
export function copyRoom(
    sourceMap: ITiledMap,
    sourceWam: WAMFileFormat,
    request: z.output<typeof CreateRoomRequest>,
    options: NewRoomOptions,
): NewRoom {
    const map = structuredClone(sourceMap);
    map.tilesets = rebaseTilesets(map.tilesets, options.rebaseUrl);
    rebaseImageLayers(map.layers, options.rebaseUrl);
    // A map script belongs to its own room; copied rooms start without one.
    map.properties = map.properties?.filter((property) => property.name !== "script");

    const wam = structuredClone(sourceWam);
    wam.mapUrl = options.mapUrl;
    wam.metadata = { ...wam.metadata, name: request.name };
    wam.lastCommandId = undefined;
    for (const area of wam.areas) {
        area.id = options.newId();
        for (const property of area.properties) {
            property.id = options.newId();
            if (property.type === "personalAreaPropertyData") {
                property.ownerId = null;
            }
        }
    }
    if (request.returnUrl !== undefined) {
        const tileWidth = map.tilewidth ?? 32;
        const tileHeight = map.tileheight ?? 32;
        const start =
            wam.areas.find((area) => area.properties.some((p) => p.type === "start" && p.isDefault === true)) ??
            wam.areas.find((area) => area.properties.some((p) => p.type === "start"));
        const x = start ? Math.floor(start.x / tileWidth) : 0;
        const y = start ? Math.floor((start.y + start.height) / tileHeight) : 0;
        wam.areas.push(exitArea(options.newId, request.returnUrl, x, y, 2, tileWidth, tileHeight));
    }
    return { map, wam };
}

/** The (two, or one on narrow rooms) columns of the door in the middle of the bottom wall. */
function doorColumns(width: number): number[] {
    const middle = Math.floor(width / 2);
    return width >= 5 ? [middle - 1, middle] : [middle];
}

function startArea(
    newId: () => string,
    x: number,
    y: number,
    width: number,
    height: number,
    tileWidth: number,
    tileHeight: number,
): AreaData {
    return {
        id: newId(),
        name: "start",
        x: Math.max(0, x) * tileWidth,
        y: Math.max(0, y) * tileHeight,
        width: width * tileWidth,
        height: height * tileHeight,
        visible: true,
        properties: [{ id: newId(), type: "start", isDefault: true }],
    };
}

function exitArea(
    newId: () => string,
    url: string,
    x: number,
    y: number,
    width: number,
    tileWidth: number,
    tileHeight: number,
): AreaData {
    return {
        id: newId(),
        name: "door",
        x: x * tileWidth,
        y: y * tileHeight,
        width: width * tileWidth,
        height: tileHeight,
        visible: true,
        properties: [{ id: newId(), type: "exit", url, areaName: "" }],
    };
}

function entityCollectionsOf(wam: WAMFileFormat | undefined): CollectionUrl[] {
    return structuredClone(wam?.entityCollections ?? []);
}

/** The credits of the tilesets travel with them. */
function creditProperties(properties: ITiledMapProperty[] | undefined): ITiledMapProperty[] {
    return (properties ?? []).filter(
        (property) => property.name === "mapCopyright" || property.name === "tilesetCopyright",
    );
}

/** The tilesets that hold the given GIDs (each GID belongs to the tileset with the highest firstgid below it). */
function tilesetsFor(tilesets: ITiledMapTileset[], gids: number[]): ITiledMapTileset[] {
    const sorted = [...tilesets].sort((a, b) => (a.firstgid ?? 0) - (b.firstgid ?? 0));
    const kept = new Set<ITiledMapTileset>();
    for (const gid of gids) {
        const owner = sorted.filter((tileset) => (tileset.firstgid ?? 0) <= gid).pop();
        if (owner) kept.add(owner);
    }
    return structuredClone(sorted.filter((tileset) => kept.has(tileset)));
}

function rebaseTilesets(tilesets: ITiledMapTileset[], rebaseUrl: (url: string) => string): ITiledMapTileset[] {
    return tilesets.map((tileset) => {
        const copy = structuredClone(tileset);
        if ("source" in copy) {
            copy.source = rebaseUrl(copy.source);
        } else if ("image" in copy) {
            copy.image = rebaseUrl(copy.image);
        } else {
            for (const tile of copy.tiles ?? []) {
                if (tile.image !== undefined) tile.image = rebaseUrl(tile.image);
            }
        }
        return copy;
    });
}

function rebaseImageLayers(layers: ITiledMapLayer[], rebaseUrl: (url: string) => string): void {
    for (const layer of layers) {
        if (layer.type === "imagelayer") {
            layer.image = rebaseUrl(layer.image);
        } else if (layer.type === "group") {
            rebaseImageLayers(layer.layers, rebaseUrl);
        }
    }
}

function tileLayer(id: number, name: string, width: number, height: number, data: number[]): ITiledMapTileLayer {
    return { id, name, type: "tilelayer", opacity: 1, visible: true, width, height, data, x: 0, y: 0 };
}

function collectTileLayers(layers: ITiledMapLayer[]): ITiledMapTileLayer[] {
    return layers.flatMap((layer) =>
        layer.type === "tilelayer" ? [layer] : layer.type === "group" ? collectTileLayers(layer.layers) : [],
    );
}

function tileData(layer: ITiledMapTileLayer): number[] {
    return Array.isArray(layer.data) ? layer.data : [];
}

function countNonEmpty(layer: ITiledMapTileLayer): number {
    return tileData(layer).filter((gid) => gid !== 0).length;
}

function mostCommon(counts: Map<number, number>): number | undefined {
    let best: number | undefined;
    let bestCount = 0;
    for (const [gid, count] of counts) {
        if (count > bestCount) {
            best = gid;
            bestCount = count;
        }
    }
    return best;
}
