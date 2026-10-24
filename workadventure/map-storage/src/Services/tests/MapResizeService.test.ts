import { MapResizeError, WamFile } from "@workadventure/map-editor";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const env = vi.hoisted(() => ({ PATH_PREFIX: "", USE_DOMAIN_NAME_IN_PATH: true }));
vi.mock("../../Enum/EnvironmentVariable", () => env);

const files = vi.hoisted(() => new Map<string, string>());
vi.mock("../../fileSystem", () => ({
    fileSystem: {
        readFileAsString: (path: string) => {
            const content = files.get(path);
            return content === undefined ? Promise.reject(new Error(`No file ${path}`)) : Promise.resolve(content);
        },
        writeStringAsFile: (path: string, content: string) => {
            files.set(path, content);
            return Promise.resolve();
        },
    },
}));

const memory = vi.hoisted(() => ({ loaded: new Map<string, unknown>(), cleared: [] as string[] }));
vi.mock("../../MapsManager", () => ({
    mapsManager: {
        getWamFile: (key: string) => memory.loaded.get(key),
        clearAfterUpload: (key: string) => memory.cleared.push(key),
    },
}));

const { resizeStoredMap, resolveTiledMapKey } = await import("../MapResizeService");

const DOMAIN = "example.com";
const WAM_KEY = `${DOMAIN}/office/map.wam`;
const TMJ_KEY = `${DOMAIN}/office/map.tmj`;

/** A 4×3 room (walls around one row of floor) with a property the Tiled schema does not know about. */
function storedTiledMap() {
    return {
        type: "map",
        tiledversion: "1.10.2",
        orientation: "orthogonal",
        infinite: false,
        width: 4,
        height: 3,
        tilewidth: 32,
        tileheight: 32,
        editorsettings: { export: { target: "map.tmj" } },
        tilesets: [],
        layers: [
            {
                id: 1,
                name: "floor",
                type: "tilelayer",
                opacity: 1,
                visible: true,
                width: 4,
                height: 3,
                data: [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1],
            },
        ],
    };
}

function storedWam(entityX = 64): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "./map.tmj",
        entities: { desk: { x: entityX, y: 32, prefabRef: { collectionName: "office", id: "desk" } } },
        areas: [],
        entityCollections: [],
    };
}

function store(wam: WAMFileFormat = storedWam()) {
    files.set(WAM_KEY, JSON.stringify(wam));
    files.set(TMJ_KEY, JSON.stringify(storedTiledMap()));
}

/** The parts of the stored files the tests look at. */
const StoredFile = z.object({
    width: z.number().optional(),
    layers: z.array(z.object({ data: z.array(z.number()) })).optional(),
    editorsettings: z.unknown().optional(),
    entities: z.record(z.string(), z.object({ x: z.number() })).optional(),
});

function readStored(key: string) {
    return StoredFile.parse(JSON.parse(files.get(key) ?? "{}"));
}

function mapListService() {
    return { updateWAMFileInCache: vi.fn(() => Promise.resolve()) };
}

afterEach(() => {
    files.clear();
    memory.loaded.clear();
    memory.cleared.length = 0;
});

describe("resolveTiledMapKey", () => {
    it("resolves the Tiled map next to the WAM file", () => {
        expect(resolveTiledMapKey(WAM_KEY, DOMAIN, "./map.tmj")).toBe(TMJ_KEY);
        expect(resolveTiledMapKey(WAM_KEY, DOMAIN, "../shared/My%20map.tmj?v=2")).toBe(`${DOMAIN}/shared/My map.tmj`);
    });

    it("refuses Tiled maps stored elsewhere", () => {
        expect(() => resolveTiledMapKey(WAM_KEY, DOMAIN, "https://cdn.example.org/map.tmj")).toThrow(MapResizeError);
        expect(() => resolveTiledMapKey(WAM_KEY, DOMAIN, "//cdn.example.org/map.tmj")).toThrow(MapResizeError);
        expect(() => resolveTiledMapKey(WAM_KEY, DOMAIN, "/map.tmj")).toThrow(MapResizeError);
        expect(() => resolveTiledMapKey(WAM_KEY, DOMAIN, "../../other.org/map.tmj")).toThrow(MapResizeError);
    });
});

describe("resizeStoredMap", () => {
    it("writes the resized Tiled map and WAM file, then drops the map from memory", async () => {
        store();
        const listService = mapListService();

        const { report } = await resizeStoredMap(
            WAM_KEY,
            DOMAIN,
            "/office/map.wam",
            { width: 6, height: 3 },
            listService,
        );

        const tiledMap = readStored(TMJ_KEY);
        expect(tiledMap.width).toBe(6);
        expect(tiledMap.layers?.[0].data).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
        // Properties the Tiled schema does not know are kept.
        expect(tiledMap.editorsettings).toEqual({ export: { target: "map.tmj" } });
        expect(report).toMatchObject({ oldWidth: 4, newWidth: 6, newHeight: 3 });
        expect(memory.cleared).toEqual([WAM_KEY]);
        expect(listService.updateWAMFileInCache).toHaveBeenCalledWith(
            DOMAIN,
            "/office/map.wam",
            expect.objectContaining({ mapUrl: "./map.tmj" }),
        );
    });

    it("resizes the WAM file held in memory, which may have edits not saved yet", async () => {
        store(storedWam(32));
        memory.loaded.set(WAM_KEY, new WamFile(storedWam(64)));

        await resizeStoredMap(
            WAM_KEY,
            DOMAIN,
            "/office/map.wam",
            { width: 6, height: 3, anchor: "right" },
            mapListService(),
        );

        // The desk of the in-memory WAM file stood on column 2, which moved 2 columns to the right.
        expect(readStored(WAM_KEY).entities?.desk.x).toBe(128);
    });

    it("changes nothing on a dry run", async () => {
        store();
        const before = new Map(files);
        const listService = mapListService();

        const { report } = await resizeStoredMap(
            WAM_KEY,
            DOMAIN,
            "/office/map.wam",
            { width: 8, height: 5 },
            listService,
            { dryRun: true },
        );

        expect(report.newWidth).toBe(8);
        expect(files).toEqual(before);
        expect(memory.cleared).toEqual([]);
        expect(listService.updateWAMFileInCache).not.toHaveBeenCalled();
    });

    it("refuses a Tiled map that is not valid", async () => {
        store();
        files.set(TMJ_KEY, JSON.stringify({ type: "map", layers: "nope" }));

        await expect(
            resizeStoredMap(WAM_KEY, DOMAIN, "/office/map.wam", { width: 6, height: 3 }, mapListService()),
        ).rejects.toThrow(MapResizeError);
    });
});
