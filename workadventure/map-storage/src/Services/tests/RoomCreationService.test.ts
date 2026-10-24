import { CreateRoomRequest } from "@workadventure/map-editor";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const env = vi.hoisted(() => ({ PATH_PREFIX: "", USE_DOMAIN_NAME_IN_PATH: false }));
vi.mock("../../Enum/EnvironmentVariable", () => env);

const files = vi.hoisted(() => new Map<string, string>());
vi.mock("../../fileSystem", () => ({
    fileSystem: {
        exist: (path: string) => Promise.resolve(files.has(path)),
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
vi.mock("../../MapsManager", () => ({ mapsManager: { getWamFile: () => undefined } }));

const { createStoredRoom, newRoomKeys, rebaseUrl } = await import("../RoomCreationService");

const LOBBY_WAM = "adminspace/org-1/world-1/lobby/map.wam";
const LOBBY_TMJ = "adminspace/org-1/world-1/lobby/map.tmj";
const LOBBY_URL = new URL("https://play.example.com/map-storage/adminspace/org-1/world-1/lobby/map.wam");

const StoredRoom = z.object({
    metadata: z.object({ name: z.string() }),
    mapUrl: z.string(),
    areas: z.array(z.object({ name: z.string(), properties: z.array(z.object({ type: z.string() })) })),
});
const StoredMap = z.object({
    width: z.number(),
    height: z.number(),
    tilesets: z.array(z.object({ image: z.string() })),
});

function storeLobby() {
    const wam: WAMFileFormat = {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities: {},
        areas: [],
        entityCollections: [],
        metadata: { name: "Lobby" },
    };
    files.set(LOBBY_WAM, JSON.stringify(wam));
    files.set(
        LOBBY_TMJ,
        JSON.stringify({
            type: "map",
            tiledversion: "1.10.2",
            orientation: "orthogonal",
            infinite: false,
            width: 4,
            height: 3,
            tilewidth: 32,
            tileheight: 32,
            tilesets: [
                {
                    firstgid: 1,
                    name: "office",
                    image: "office tiles.png",
                    imagewidth: 64,
                    imageheight: 32,
                    tilewidth: 32,
                    tileheight: 32,
                    tilecount: 2,
                    columns: 2,
                    tiles: [{ id: 1, properties: [{ name: "collides", type: "bool", value: true }] }],
                },
            ],
            layers: [
                {
                    id: 1,
                    name: "floor",
                    type: "tilelayer",
                    opacity: 1,
                    visible: true,
                    width: 4,
                    height: 3,
                    data: [2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2],
                },
            ],
        }),
    );
}

afterEach(() => {
    files.clear();
});

describe("rebaseUrl", () => {
    it("rebases relative URLs and keeps absolute ones", () => {
        expect(rebaseUrl("office%20tiles.png", "a/lobby/map.tmj", "a/focus/map.tmj")).toBe(
            "../lobby/office%20tiles.png",
        );
        expect(rebaseUrl("../shared/tiles.png?v=2", "a/lobby/map.tmj", "a/focus/map.tmj")).toBe(
            "../shared/tiles.png?v=2",
        );
        expect(rebaseUrl("tiles.png", "maps/lobby.tmj", "maps/focus.tmj")).toBe("tiles.png");
        expect(rebaseUrl("https://cdn.example.org/tiles.png", "a/b.tmj", "c/d.tmj")).toBe(
            "https://cdn.example.org/tiles.png",
        );
        expect(rebaseUrl("/tiles.png", "a/b.tmj", "c/d.tmj")).toBe("/tiles.png");
    });
});

describe("newRoomKeys", () => {
    it("puts a room stored in its own directory in a sibling directory", async () => {
        expect(await newRoomKeys(LOBBY_WAM, "Focus Room")).toEqual({
            wamKey: "adminspace/org-1/world-1/focus-room/map.wam",
            tmjKey: "adminspace/org-1/world-1/focus-room/map.tmj",
            mapUrl: "./map.tmj",
        });
    });

    it("puts other rooms next to the room, and numbers names already taken", async () => {
        files.set("maps/cafe.wam", "{}");
        expect(await newRoomKeys("maps/lobby.wam", "Café")).toEqual({
            wamKey: "maps/cafe-2.wam",
            tmjKey: "maps/cafe-2.tmj",
            mapUrl: "./cafe-2.tmj",
        });
        expect((await newRoomKeys("lobby.wam", "!!!")).wamKey).toBe("room.wam");
    });
});

describe("createStoredRoom", () => {
    it("creates a blank room in the style of the room, with a door back, and lists it", async () => {
        storeLobby();
        const mapListService = { updateWAMFileInCache: vi.fn(() => Promise.resolve()) };

        const { wamUrl } = await createStoredRoom(
            LOBBY_WAM,
            LOBBY_URL,
            CreateRoomRequest.parse({ name: "Focus room", width: 8, height: 6, returnUrl: "/@/acme/hq/lobby" }),
            mapListService,
        );

        expect(wamUrl).toBe("https://play.example.com/map-storage/adminspace/org-1/world-1/focus-room/map.wam");
        const wam = StoredRoom.parse(JSON.parse(files.get("adminspace/org-1/world-1/focus-room/map.wam") ?? "{}"));
        expect(wam.metadata.name).toBe("Focus room");
        expect(wam.areas.map((area) => area.properties[0].type)).toEqual(["start", "exit"]);
        const map = StoredMap.parse(JSON.parse(files.get("adminspace/org-1/world-1/focus-room/map.tmj") ?? "{}"));
        expect(map).toMatchObject({ width: 8, height: 6 });
        expect(map.tilesets[0].image).toBe("../lobby/office%20tiles.png");
        expect(mapListService.updateWAMFileInCache).toHaveBeenCalledWith(
            "play.example.com",
            "adminspace/org-1/world-1/focus-room/map.wam",
            expect.objectContaining({ mapUrl: "./map.tmj" }),
        );
    });

    it("copies a room", async () => {
        storeLobby();

        await createStoredRoom(
            LOBBY_WAM,
            LOBBY_URL,
            CreateRoomRequest.parse({ name: "Lobby copy", template: "copy" }),
            { updateWAMFileInCache: () => Promise.resolve() },
        );

        const map = StoredMap.parse(JSON.parse(files.get("adminspace/org-1/world-1/lobby-copy/map.tmj") ?? "{}"));
        expect(map).toMatchObject({ width: 4, height: 3 });
    });
});
