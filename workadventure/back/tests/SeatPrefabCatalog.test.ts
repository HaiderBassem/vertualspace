import type { WAMFileFormat } from "@workadventure/map-editor";
import { describe, expect, it, vi } from "vitest";
import { SeatPrefabCatalog } from "../src/Model/SeatPrefabCatalog";

const wam = (urls: string[]): WAMFileFormat =>
    ({
        version: "1.0.0",
        mapUrl: "map.tmj",
        entities: {},
        areas: [],
        entityCollections: urls.map((url) => ({ url, type: "file" })),
    }) as unknown as WAMFileFormat;

const collection = {
    collectionName: "Acme",
    collection: [
        { id: "adminspace:c1:charcoal-up", name: "Office chair", direction: "Up", imagePath: "x.png" },
        { id: "adminspace:t1:oak", name: "Meeting table", direction: "Down" },
        {
            id: "adminspace:s1:blue-down",
            name: "Lounge sofa",
            direction: "Down",
            seats: [
                { x: 19, y: 42, direction: "Down" },
                { x: 45, y: 42, direction: "Down" },
            ],
        },
        { id: "adminspace:s2:bad", name: "Sofa", seats: [{ x: "left", y: 1, direction: "Down" }] },
        { id: "bad", name: 12 },
    ],
};

describe("SeatPrefabCatalog", () => {
    it("learns names and directions from the collections of the map", async () => {
        const fetch = vi.fn().mockResolvedValue(collection);
        const catalog = new SeatPrefabCatalog(() => 0, fetch);
        expect(catalog.describe("adminspace:c1:charcoal-up")).toBeUndefined();
        await catalog.refresh(wam(["https://a.test/collection.json"]));
        expect(catalog.describe("adminspace:c1:charcoal-up")).toEqual({ name: "Office chair", direction: "Up" });
        expect(catalog.describe("adminspace:t1:oak")?.name).toBe("Meeting table");
        expect(catalog.describe("bad")).toBeUndefined();
    });

    it("learns the places to sit that the model of a piece of furniture draws, and ignores a malformed list", async () => {
        const catalog = new SeatPrefabCatalog(() => 0, vi.fn().mockResolvedValue(collection));
        await catalog.refresh(wam(["https://a.test/collection.json"]));
        expect(catalog.describe("adminspace:s1:blue-down")?.seats).toEqual([
            { x: 19, y: 42, direction: "Down" },
            { x: 45, y: 42, direction: "Down" },
        ]);
        expect(catalog.describe("adminspace:s2:bad")).toMatchObject({ name: "Sofa" });
        expect(catalog.describe("adminspace:s2:bad")?.seats).toBeUndefined();
        expect(catalog.describe("adminspace:c1:charcoal-up")?.seats).toBeUndefined();
    });

    it("reads a collection once per five minutes, and again at once when some furniture is unknown", async () => {
        let now = 0;
        const fetch = vi.fn().mockResolvedValue(collection);
        const catalog = new SeatPrefabCatalog(() => now, fetch);
        const map = wam(["https://a.test/collection.json"]);
        await catalog.refresh(map);
        await catalog.refresh(map);
        expect(fetch).toHaveBeenCalledTimes(1);
        now = 40_000;
        await catalog.refresh(map, ["adminspace:new:one"]);
        expect(fetch).toHaveBeenCalledTimes(2);
        // Unknown furniture does not make the room read the collection at every request.
        now = 41_000;
        await catalog.refresh(map, ["adminspace:new:one"]);
        expect(fetch).toHaveBeenCalledTimes(2);
        now = 6 * 60_000;
        await catalog.refresh(map);
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("survives a collection that cannot be read", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const fetch = vi.fn().mockRejectedValue(new Error("offline"));
        const catalog = new SeatPrefabCatalog(() => 0, fetch);
        await expect(catalog.refresh(wam(["https://a.test/collection.json"]))).resolves.toBeUndefined();
        expect(catalog.describe("adminspace:c1:charcoal-up")).toBeUndefined();
        warn.mockRestore();
    });

    it("ignores marketplace collections and maps without a file", async () => {
        const fetch = vi.fn().mockResolvedValue(collection);
        const catalog = new SeatPrefabCatalog(() => 0, fetch);
        await catalog.refresh(undefined);
        await catalog.refresh({
            ...wam([]),
            entityCollections: [{ url: "https://m.test/", type: "marketplace" }],
        } as unknown as WAMFileFormat);
        expect(fetch).not.toHaveBeenCalled();
    });
});
