import type { ITiledMap, ITiledMapLayer, ITiledMapTileLayer } from "@workadventure/tiled-map-type-guard";
import { describe, expect, it } from "vitest";
import {
    applyResizeToWam,
    axisMappingFromCells,
    buildAxisMapping,
    MapResizeError,
    mapResizedPosition,
    resizeMap,
} from "../../src/MapResize/MapResize";
import type { AreaData, WAMFileFormat } from "../../src/types";

const TILE = 32;
const W = 1; // wall
const F = 2; // floor
const D = 3; // desk

/** Builds a tile layer from rows of tile ids. */
function tileLayer(name: string, rows: number[][], properties?: ITiledMapTileLayer["properties"]): ITiledMapTileLayer {
    return {
        id: 1,
        name,
        type: "tilelayer",
        opacity: 1,
        visible: true,
        width: rows[0].length,
        height: rows.length,
        data: rows.flat(),
        properties,
    };
}

function tiledMap(layers: ITiledMapLayer[]): ITiledMap {
    const first = layers.find((layer): layer is ITiledMapTileLayer => layer.type === "tilelayer");
    return {
        type: "map",
        tiledversion: "1.10.2",
        orientation: "orthogonal",
        infinite: false,
        width: first?.width ?? 1,
        height: first?.height ?? 1,
        tilewidth: TILE,
        tileheight: TILE,
        tilesets: [],
        layers,
    };
}

function area(id: string, x: number, y: number, width: number, height: number): AreaData {
    return { id, name: id, x, y, width, height, visible: true, properties: [] };
}

function wamFile(entities: Record<string, { x: number; y: number }>, areas: AreaData[] = []): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "./map.tmj",
        entities: Object.fromEntries(
            Object.entries(entities).map(([id, { x, y }]) => [
                id,
                { x, y, prefabRef: { collectionName: "basic office decoration", id: "desk" } },
            ]),
        ),
        areas,
        entityCollections: [],
    };
}

/** Reads back the rows of the first tile layer called `name`. */
function rowsOf(map: ITiledMap, name: string): number[][] {
    const layer = map.layers.find(
        (candidate): candidate is ITiledMapTileLayer => candidate.type === "tilelayer" && candidate.name === name,
    );
    if (!layer || !Array.isArray(layer.data)) {
        throw new Error(`No decoded tile layer "${name}"`);
    }
    const data = layer.data;
    return Array.from({ length: layer.height }, (_, row) => data.slice(row * layer.width, (row + 1) * layer.width));
}

/** A 5×4 room: walls all around, floor inside. */
const room = (): number[][] => [
    [W, W, W, W, W],
    [W, F, F, F, W],
    [W, F, F, F, W],
    [W, W, W, W, W],
];

describe("resizeMap", () => {
    it("keeps the map identical when the size does not change", () => {
        const map = tiledMap([tileLayer("floor", room())]);

        const result = resizeMap(map, wamFile({ a: { x: 40, y: 50 } }), { width: 5, height: 4 });

        expect(rowsOf(result.map, "floor")).toEqual(room());
        expect(result.wam?.entities.a).toMatchObject({ x: 40, y: 50 });
        expect(result.report.displacedEntities).toEqual([]);
    });

    it("grows a room by repeating its floor and keeping the walls at the edges", () => {
        const map = tiledMap([tileLayer("floor", room())]);

        const result = resizeMap(map, undefined, { width: 8, height: 6, anchor: "top-left", fill: "extend" });

        expect(result.map.width).toBe(8);
        expect(result.map.height).toBe(6);
        expect(rowsOf(result.map, "floor")).toEqual([
            [W, W, W, W, W, W, W, W],
            [W, F, F, F, F, F, F, W],
            [W, F, F, F, F, F, F, W],
            [W, F, F, F, F, F, F, W],
            [W, F, F, F, F, F, F, W],
            [W, W, W, W, W, W, W, W],
        ]);
    });

    it("stretches an area that covers the repeated floor and keeps an entity in place", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ desk: { x: TILE, y: TILE } }, [area("meeting", TILE, TILE, 3 * TILE, 2 * TILE)]);

        const result = resizeMap(map, wam, { width: 8, height: 4, anchor: "top-left", fill: "extend" });

        expect(result.wam?.areas[0]).toMatchObject({ x: TILE, y: TILE, width: 6 * TILE, height: 2 * TILE });
        expect(result.wam?.entities.desk).toMatchObject({ x: TILE, y: TILE });
    });

    it("repeats a uniform column rather than one with furniture", () => {
        // The desk stands just inside the right wall: repeating that column would duplicate the desk.
        const rows = [
            [W, W, W, W, W, W],
            [W, F, F, F, D, W],
            [W, F, F, F, D, W],
            [W, W, W, W, W, W],
        ];
        const map = tiledMap([tileLayer("floor", rows)]);

        const result = resizeMap(map, undefined, { width: 8, height: 4, anchor: "top-left", fill: "extend" });

        expect(rowsOf(result.map, "floor")[1]).toEqual([W, F, F, F, F, F, D, W]);
    });

    it("moves the content right when anchored on the right", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ desk: { x: 3 * TILE, y: TILE } });

        const result = resizeMap(map, wam, { width: 7, height: 4, anchor: "right", fill: "extend" });

        expect(rowsOf(result.map, "floor")[1]).toEqual([W, F, F, F, F, F, W]);
        expect(result.wam?.entities.desk).toMatchObject({ x: 5 * TILE, y: TILE });
    });

    it("splits the growth between both sides when centered", () => {
        const mapping = buildAxisMapping(5, 9, "center", "empty");

        expect(mapping.newToOld).toEqual([-1, -1, 0, 1, 2, 3, 4, -1, -1]);
        expect(mapping.oldToFirst).toEqual([2, 3, 4, 5, 6]);
    });

    it("adds empty space outside the edges with the empty fill", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ desk: { x: TILE, y: TILE } });

        const result = resizeMap(map, wam, { width: 7, height: 5, anchor: "bottom-right", fill: "empty" });

        const rows = rowsOf(result.map, "floor");
        expect(rows[0]).toEqual([0, 0, 0, 0, 0, 0, 0]);
        expect(rows[1]).toEqual([0, 0, W, W, W, W, W]);
        expect(rows[2]).toEqual([0, 0, W, F, F, F, W]);
        expect(result.wam?.entities.desk).toMatchObject({ x: 3 * TILE, y: 2 * TILE });
    });

    it("does not repeat spawn points or exits", () => {
        const start = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 9, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ];
        const map = tiledMap([
            tileLayer("floor", room()),
            tileLayer("start", start),
            tileLayer("exit", start, [{ name: "exitUrl", type: "string", value: "other.tmj" }]),
        ]);

        const result = resizeMap(map, undefined, { width: 8, height: 4, anchor: "top-left", fill: "extend" });

        // Column 2 is repeated (column 3 touches the wall): the spawn tile next to the wall moves with it, once.
        expect(rowsOf(result.map, "start")[1]).toEqual([0, 0, 0, 0, 0, 0, 9, 0]);
        expect(rowsOf(result.map, "exit")[1]).toEqual([0, 0, 0, 0, 0, 0, 9, 0]);
    });

    it("keeps a single copy of a spawn point standing on the repeated column", () => {
        const start = [
            [0, 0, 0, 0, 0],
            [0, 0, 9, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ];
        const map = tiledMap([tileLayer("floor", room()), tileLayer("start", start)]);

        const result = resizeMap(map, undefined, { width: 8, height: 4, anchor: "top-left", fill: "extend" });

        expect(rowsOf(result.map, "start")[1]).toEqual([0, 0, 9, 0, 0, 0, 0, 0]);
    });

    it("shrinks a room by removing floor inside the walls and moves what stood there", () => {
        const rows = [
            [W, W, W, W, W, W, W, W],
            [W, F, F, F, F, F, F, W],
            [W, W, W, W, W, W, W, W],
        ];
        const map = tiledMap([tileLayer("floor", rows)]);
        const wam = wamFile({ kept: { x: 2 * TILE, y: TILE }, removed: { x: 6 * TILE, y: TILE } }, [
            area("zone", 5 * TILE, TILE, 2 * TILE, TILE),
        ]);

        const result = resizeMap(map, wam, { width: 5, height: 3, anchor: "top-left", fill: "extend" });

        expect(rowsOf(result.map, "floor")).toEqual([
            [W, W, W, W, W],
            [W, F, F, F, W],
            [W, W, W, W, W],
        ]);
        expect(result.wam?.entities.kept).toMatchObject({ x: 2 * TILE, y: TILE });
        expect(result.wam?.entities.removed.x).toBeLessThanOrEqual(4 * TILE);
        expect(result.report.displacedEntities).toEqual(["removed"]);
        expect(result.report.displacedAreas).toEqual(["zone"]);
        const zone = result.wam?.areas[0];
        expect(zone && zone.x + zone.width).toBeLessThanOrEqual(5 * TILE);
    });

    it("crops the edges with the empty fill and keeps everything inside the map", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ outside: { x: 4 * TILE, y: 3 * TILE } }, [area("big", 0, 0, 5 * TILE, 4 * TILE)]);

        const result = resizeMap(map, wam, { width: 3, height: 2, anchor: "top-left", fill: "empty" });

        expect(rowsOf(result.map, "floor")).toEqual([
            [W, W, W],
            [W, F, F],
        ]);
        expect(result.wam?.entities.outside).toMatchObject({ x: 2 * TILE, y: TILE });
        expect(result.wam?.areas[0]).toMatchObject({ x: 0, y: 0, width: 3 * TILE, height: 2 * TILE });
        expect(result.report.displacedEntities).toEqual(["outside"]);
        expect(result.report.displacedAreas).toEqual(["big"]);
    });

    it("moves and stretches Tiled objects", () => {
        const map = tiledMap([
            tileLayer("floor", room()),
            {
                id: 2,
                name: "floorLayer",
                type: "objectgroup",
                opacity: 1,
                visible: true,
                draworder: "topdown",
                objects: [
                    { id: 1, name: "zone", visible: true, x: TILE, y: TILE, width: 3 * TILE, height: TILE },
                    { id: 2, name: "lamp", visible: true, gid: 5, x: 3 * TILE, y: 2 * TILE, width: TILE, height: TILE },
                ],
            },
        ]);

        const result = resizeMap(map, undefined, { width: 7, height: 4, anchor: "right", fill: "extend" });

        const layer = result.map.layers[1];
        if (layer.type !== "objectgroup") throw new Error("Expected an object layer");
        expect(layer.objects[0]).toMatchObject({ x: TILE, width: 5 * TILE });
        expect(layer.objects[1]).toMatchObject({ x: 5 * TILE, y: 2 * TILE });
    });

    it("decodes uncompressed Base64 layers and writes them back as arrays", () => {
        const tiles = room().flat();
        const bytes = new Uint8Array(new Uint32Array(tiles).buffer);
        const layer = tileLayer("floor", room());
        layer.data = btoa(String.fromCharCode(...bytes));
        layer.encoding = "base64";

        const result = resizeMap(tiledMap([layer]), undefined, { width: 6, height: 4 });

        const resized = result.map.layers[0];
        if (resized.type !== "tilelayer") throw new Error("Expected a tile layer");
        expect(resized.encoding).toBeUndefined();
        expect(rowsOf(result.map, "floor")[1]).toEqual([W, F, F, F, F, W]);
    });

    it("refuses compressed layers and infinite maps", () => {
        const compressed = tileLayer("floor", room());
        compressed.data = "eJxjYGBgAAAABQAB";
        compressed.encoding = "base64";
        compressed.compression = "zlib";
        expect(() => resizeMap(tiledMap([compressed]), undefined, { width: 6, height: 4 })).toThrow(MapResizeError);

        const infinite = tiledMap([tileLayer("floor", room())]);
        infinite.infinite = true;
        expect(() => resizeMap(infinite, undefined, { width: 6, height: 4 })).toThrow(MapResizeError);
    });

    it("refuses sizes outside the allowed range", () => {
        const map = tiledMap([tileLayer("floor", room())]);

        expect(() => resizeMap(map, undefined, { width: 0, height: 4 })).toThrow();
        expect(() => resizeMap(map, undefined, { width: 5, height: 501 })).toThrow();
        expect(() => resizeMap(map, undefined, { width: 5.5, height: 4 })).toThrow();
    });

    it("does not modify its inputs", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ desk: { x: TILE, y: TILE } }, [area("zone", TILE, TILE, TILE, TILE)]);
        const mapBefore = structuredClone(map);
        const wamBefore = structuredClone(wam);

        resizeMap(map, wam, { width: 9, height: 2, anchor: "center", fill: "extend" });

        expect(map).toEqual(mapBefore);
        expect(wam).toEqual(wamBefore);
    });
});

describe("replaying a resize", () => {
    it("moves a copy of the WAM file exactly like the resize did", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const wam = wamFile({ desk: { x: 3 * TILE, y: TILE } }, [area("meeting", TILE, TILE, 3 * TILE, 2 * TILE)]);
        const result = resizeMap(map, wam, { width: 9, height: 6, anchor: "center", fill: "extend" });

        const copy = structuredClone(wam);
        const displaced = applyResizeToWam(copy, result.report);

        expect(copy).toEqual(result.wam);
        expect(displaced).toEqual({ displacedEntities: [], displacedAreas: [] });
    });

    it("keeps a player on the same spot of the room", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const result = resizeMap(map, undefined, { width: 7, height: 4, anchor: "right", fill: "extend" });

        // Standing in the middle of column 3, next to the right wall: the wall moved 2 columns to the right.
        expect(mapResizedPosition({ x: 3 * TILE + 16, y: TILE + 8 }, result.report)).toEqual({
            x: 5 * TILE + 16,
            y: TILE + 8,
        });
    });

    it("keeps a player standing outside the new bounds inside the map", () => {
        const map = tiledMap([tileLayer("floor", room())]);
        const result = resizeMap(map, undefined, { width: 3, height: 2, anchor: "top-left", fill: "empty" });

        expect(mapResizedPosition({ x: 4 * TILE + 5, y: 3 * TILE + 5 }, result.report)).toEqual({
            x: 3 * TILE - 1,
            y: 2 * TILE - 1,
        });
    });

    it("refuses a layout naming cells that do not exist", () => {
        expect(() => axisMappingFromCells(3, [0, 1, 5])).toThrow(MapResizeError);
        expect(() => axisMappingFromCells(3, [])).toThrow(MapResizeError);
        expect(() => axisMappingFromCells(3, [0, 1.5])).toThrow(MapResizeError);
    });
});
