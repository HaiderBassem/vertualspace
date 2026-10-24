import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import { describe, expect, it } from "vitest";
import { diffWam, isSameStoredWam } from "../src/Model/Services/WamDiff";
import { WamManager } from "../src/Model/Services/WamManager";

function desk(id: string, ownerId: string | null, x = 100): AreaData {
    return {
        id,
        name: id,
        visible: true,
        x,
        y: 100,
        width: 64,
        height: 64,
        properties: [
            { id: `${id}-p`, type: "personalAreaPropertyData", accessClaimMode: "dynamic", allowedTags: [], ownerId },
        ],
    };
}

function wam(overrides: Partial<WAMFileFormat> = {}): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "map.tmj",
        areas: [desk("d1", null), desk("d2", "bob", 300)],
        entities: {
            chair: {
                x: 10,
                y: 20,
                prefabRef: { collectionName: "basic furniture", id: "basic furniture:Basic Chair:blue:Up" },
            },
            plant: { x: 50, y: 20, prefabRef: { collectionName: "office", id: "office:Plant:green:Down" } },
        },
        entityCollections: [{ url: "https://example.com/collection.json", type: "file" }],
        ...overrides,
    };
}

describe("diffWam", () => {
    it("finds nothing to do when nothing changed", () => {
        expect(diffWam(wam(), wam())).toEqual({ messages: [], needsReload: false });
    });

    it("turns a desk given to someone into an edit of that area, with its properties", () => {
        const next = wam({ areas: [desk("d1", "alice"), desk("d2", "bob", 300)] });
        const { messages, needsReload } = diffWam(wam(), next);
        expect(needsReload).toBe(false);
        expect(messages).toEqual([
            {
                $case: "modifyAreaMessage",
                modifyAreaMessage: expect.objectContaining({
                    id: "d1",
                    x: 100,
                    modifyProperties: true,
                    properties: [expect.objectContaining({ ownerId: "alice" })],
                }) as unknown,
            },
        ]);
    });

    it("creates, deletes and moves areas and objects; replaces an object whose furniture changed", () => {
        const current = wam();
        const next = wam({
            areas: [desk("d2", "bob", 320), desk("d3", null, 500)],
            entities: {
                chair: {
                    x: 10,
                    y: 20,
                    prefabRef: { collectionName: "basic furniture", id: "basic furniture:Basic Chair:red:Up" },
                },
                plant: { x: 60, y: 20, prefabRef: { collectionName: "office", id: "office:Plant:green:Down" } },
                lamp: { x: 90, y: 20, prefabRef: { collectionName: "office", id: "office:Lamp:white:Down" } },
            },
        });

        const kinds = diffWam(current, next).messages.map((message) => {
            switch (message.$case) {
                case "deleteAreaMessage":
                    return `delete area ${message.deleteAreaMessage.id}`;
                case "modifyAreaMessage":
                    return `modify area ${message.modifyAreaMessage.id}`;
                case "createAreaMessage":
                    return `create area ${message.createAreaMessage.id}`;
                case "deleteEntityMessage":
                    return `delete entity ${message.deleteEntityMessage.id}`;
                case "modifyEntityMessage":
                    return `modify entity ${message.modifyEntityMessage.id}`;
                case "createEntityMessage":
                    return `create entity ${message.createEntityMessage.id} ${message.createEntityMessage.prefabId}`;
                default:
                    return message.$case;
            }
        });

        expect(kinds).toEqual([
            "delete area d1",
            "modify area d2",
            "create area d3",
            "delete entity chair",
            "create entity chair basic furniture:Basic Chair:red:Up",
            "modify entity plant",
            "create entity lamp office:Lamp:white:Down",
        ]);
    });

    it("asks for a reload when the map picture, settings, metadata or collections change", () => {
        expect(diffWam(wam(), wam({ mapUrl: "other.tmj" })).needsReload).toBe(true);
        expect(diffWam(wam(), wam({ metadata: { name: "New name" } })).needsReload).toBe(true);
        expect(diffWam(wam(), wam({ settings: { megaphone: { enabled: true } } })).needsReload).toBe(true);
        expect(diffWam(wam(), wam({ entityCollections: [] })).needsReload).toBe(true);
    });

    it("produces edits that, applied in order to the room's copy, give the new map", async () => {
        const current = wam();
        const next = wam({
            areas: [desk("d2", "alice", 320), desk("d3", null, 500)],
            entities: {
                chair: {
                    x: 10,
                    y: 20,
                    prefabRef: { collectionName: "basic furniture", id: "basic furniture:Basic Chair:red:Up" },
                },
                plant: { x: 60, y: 20, prefabRef: { collectionName: "office", id: "office:Plant:green:Down" } },
            },
        });
        const manager = new WamManager(structuredClone(current));
        let id = 0;
        for (const message of diffWam(current, next).messages) {
            // eslint-disable-next-line no-await-in-loop
            await manager.applyCommand({ id: `c${id++}`, editMapMessage: { message } });
        }
        const result = manager.getWam();
        expect(result.areas.map((area) => [area.id, area.x])).toEqual([
            ["d2", 320],
            ["d3", 500],
        ]);
        expect(result.areas[0].properties[0]).toMatchObject({ ownerId: "alice" });
        expect(Object.keys(result.entities).sort()).toEqual(["chair", "plant"]);
        expect(result.entities.chair.prefabRef.id).toBe("basic furniture:Basic Chair:red:Up");
        expect(result.entities.plant.x).toBe(60);
    });
});

describe("isSameStoredWam", () => {
    const room = "http://play.workadventure.localhost:8088/map-storage/lab/seating-lab.wam";

    it("matches the same file reached at the internal address of map-storage", () => {
        expect(isSameStoredWam(room, "http://127.0.0.1:3001/lab/seating-lab.wam", "/map-storage")).toBe(true);
        expect(isSameStoredWam(room, "http://map-storage:3000/lab/seating-lab.wam", "/map-storage/")).toBe(true);
        expect(isSameStoredWam(room, room, "/map-storage")).toBe(true);
    });

    it("does not match another file, or garbage", () => {
        expect(isSameStoredWam(room, "http://127.0.0.1:3001/lab/other.wam", "/map-storage")).toBe(false);
        expect(isSameStoredWam(room, "http://127.0.0.1:3001/seating-lab.wam", "/map-storage")).toBe(false);
        expect(isSameStoredWam(room, "not a url", "/map-storage")).toBe(false);
    });

    it("compares decoded paths", () => {
        expect(
            isSameStoredWam(
                "http://play.test/map-storage/My%20maps/office.wam",
                "http://127.0.0.1:3001/My maps/office.wam",
                "/map-storage",
            ),
        ).toBe(true);
    });
});
