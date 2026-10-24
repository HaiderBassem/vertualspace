import type { ITiledMap, ITiledMapTileLayer } from "@workadventure/tiled-map-type-guard";
import { describe, expect, it } from "vitest";
import { copyRoom, createBlankRoom, CreateRoomRequest, detectRoomStyle } from "../../src/MapRooms/RoomTemplates";
import type { WAMFileFormat } from "../../src/types";

const W = 7; // wall (collides)
const F = 3; // floor
const R = 12; // rug, from the second tileset

/** A 5×4 room: walls (colliding tile 7) around a floor (tile 3) with a rug. */
function styleMap(): ITiledMap {
    return {
        type: "map",
        tiledversion: "1.10.2",
        orientation: "orthogonal",
        infinite: false,
        width: 5,
        height: 4,
        tilewidth: 32,
        tileheight: 32,
        properties: [
            { name: "mapCopyright", type: "string", value: "CC-BY-SA 3.0 Someone" },
            { name: "script", type: "string", value: "script.js" },
        ],
        tilesets: [
            {
                firstgid: 1,
                name: "office",
                image: "tiles/office.png",
                imagewidth: 256,
                imageheight: 32,
                tilewidth: 32,
                tileheight: 32,
                tilecount: 8,
                columns: 8,
                tiles: [{ id: 6, properties: [{ name: "collides", type: "bool", value: true }] }],
            },
            { firstgid: 9, source: "https://cdn.example.org/rugs.tsx" },
            { firstgid: 100, source: "decor.tsx" },
        ],
        layers: [
            {
                id: 1,
                name: "floor",
                type: "tilelayer",
                opacity: 1,
                visible: true,
                width: 5,
                height: 4,
                data: [W, W, W, W, W, W, F, F, F, W, W, F, R, F, W, W, W, W, W, W],
            },
        ],
    };
}

const options = () => {
    let id = 0;
    return {
        rebaseUrl: (url: string) => (url.includes("://") ? url : `../lobby/${url}`),
        mapUrl: "./map.tmj",
        wamVersion: "2.1.0",
        newId: () => `id-${++id}`,
    };
};

function rows(map: ITiledMap, name: string): number[][] {
    const layer = map.layers.find(
        (candidate): candidate is ITiledMapTileLayer => candidate.type === "tilelayer" && candidate.name === name,
    );
    if (!layer || !Array.isArray(layer.data)) throw new Error(`No layer ${name}`);
    const data = layer.data;
    return Array.from({ length: layer.height }, (_, row) => data.slice(row * layer.width, (row + 1) * layer.width));
}

describe("detectRoomStyle", () => {
    it("finds the floor and the colliding wall tile", () => {
        expect(detectRoomStyle(styleMap())).toEqual({ floorGid: F, wallGid: W });
    });

    it("has no walls when no tile collides", () => {
        const map = styleMap();
        map.tilesets = map.tilesets.filter((tileset) => !("image" in tileset));
        expect(detectRoomStyle(map).wallGid).toBeUndefined();
    });
});

describe("createBlankRoom", () => {
    it("builds a walled room with a door in the bottom wall, a start area and a door back", () => {
        const request = CreateRoomRequest.parse({
            name: "Focus room",
            width: 6,
            height: 5,
            returnUrl: "/@/acme/hq/lobby",
        });

        const { map, wam } = createBlankRoom(styleMap(), undefined, request, options());

        expect(rows(map, "floor")).toEqual(new Array(5).fill(new Array(6).fill(F)));
        expect(rows(map, "walls")).toEqual([
            [W, W, W, W, W, W],
            [W, 0, 0, 0, 0, W],
            [W, 0, 0, 0, 0, W],
            [W, 0, 0, 0, 0, W],
            [W, W, 0, 0, W, W],
        ]);
        expect(map.layers.map((layer) => layer.name)).toEqual(["floor", "walls", "floorLayer"]);
        // Only the tileset holding the floor and the wall, with its image path rebased next to the new map.
        expect(map.tilesets).toEqual([expect.objectContaining({ firstgid: 1, image: "../lobby/tiles/office.png" })]);
        // Credits are kept, the script of the other room is not.
        expect(map.properties).toEqual([{ name: "mapCopyright", type: "string", value: "CC-BY-SA 3.0 Someone" }]);

        expect(wam.metadata?.name).toBe("Focus room");
        expect(wam.areas).toEqual([
            expect.objectContaining({
                name: "start",
                x: 64,
                y: 32,
                properties: [{ id: "id-2", type: "start", isDefault: true }],
            }),
            expect.objectContaining({
                name: "door",
                x: 64,
                y: 128,
                width: 64,
                height: 32,
                properties: [{ id: "id-4", type: "exit", url: "/@/acme/hq/lobby", areaName: "" }],
            }),
        ]);
    });

    it("keeps the entity collections of the room it comes from", () => {
        const sourceWam: WAMFileFormat = {
            version: "2.1.0",
            mapUrl: "./map.tmj",
            entities: {},
            areas: [],
            entityCollections: [{ url: "https://example.com/collection.json", type: "file" }],
        };

        const { wam } = createBlankRoom(styleMap(), sourceWam, CreateRoomRequest.parse({ name: "Room" }), options());

        expect(wam.entityCollections).toEqual(sourceWam.entityCollections);
        expect(wam.areas).toHaveLength(1);
    });

    it("refuses return URLs that leave this WorkAdventure", () => {
        expect(() => CreateRoomRequest.parse({ name: "Room", returnUrl: "https://evil.example/" })).toThrow();
        expect(() => CreateRoomRequest.parse({ name: "Room", returnUrl: "//evil.example/" })).toThrow();
        expect(() => CreateRoomRequest.parse({ name: " ", returnUrl: "/@/a/b/c" })).toThrow();
        expect(() => CreateRoomRequest.parse({ name: "Room", width: 2 })).toThrow();
    });
});

describe("copyRoom", () => {
    it("copies a room with new ids, released desks, rebased tilesets and a door back", () => {
        const sourceWam: WAMFileFormat = {
            version: "2.1.0",
            mapUrl: "./map.tmj",
            lastCommandId: "last",
            entities: { desk: { x: 32, y: 32, prefabRef: { collectionName: "office", id: "desk" } } },
            areas: [
                {
                    id: "start-area",
                    name: "start",
                    x: 32,
                    y: 32,
                    width: 64,
                    height: 32,
                    visible: true,
                    properties: [{ id: "p1", type: "start", isDefault: true }],
                },
                {
                    id: "desk-area",
                    name: "Desk",
                    x: 96,
                    y: 64,
                    width: 32,
                    height: 32,
                    visible: true,
                    properties: [
                        {
                            id: "p2",
                            type: "personalAreaPropertyData",
                            accessClaimMode: "dynamic",
                            allowedTags: [],
                            ownerId: "someone",
                        },
                    ],
                },
            ],
            entityCollections: [],
            metadata: { name: "Lobby", description: "The lobby" },
        };

        const { map, wam } = copyRoom(
            styleMap(),
            sourceWam,
            CreateRoomRequest.parse({ name: "Lobby 2", template: "copy", returnUrl: "/~/lobby.wam" }),
            options(),
        );

        const tilesetUrls = map.tilesets.map((tileset) =>
            "image" in tileset ? tileset.image : "source" in tileset ? tileset.source : undefined,
        );
        expect(tilesetUrls).toEqual([
            "../lobby/tiles/office.png",
            "https://cdn.example.org/rugs.tsx",
            "../lobby/decor.tsx",
        ]);
        expect(map.properties?.map((property) => property.name)).toEqual(["mapCopyright"]);
        expect(wam.metadata).toEqual({ name: "Lobby 2", description: "The lobby" });
        expect(wam.lastCommandId).toBeUndefined();
        expect(wam.entities).toEqual(sourceWam.entities);
        expect(wam.areas.map((area) => area.id)).toEqual(["id-1", "id-3", "id-5"]);
        expect(wam.areas[1].properties[0]).toMatchObject({ type: "personalAreaPropertyData", ownerId: null });
        expect(wam.areas[2]).toMatchObject({ name: "door", x: 32, y: 64 });
        // The original is untouched.
        expect(sourceWam.areas[0].id).toBe("start-area");
    });
});
