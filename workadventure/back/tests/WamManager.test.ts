import { describe, expect, it } from "vitest";
import type { EditMapCommandMessage } from "@workadventure/messages";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { WamManager } from "../src/Model/Services/WamManager";

function createInitialWam(): WAMFileFormat {
    return {
        version: "1",
        mapUrl: "https://example.com/maps/test.tmj",
        entities: {},
        areas: [
            {
                id: "area-1",
                name: "Area 1",
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                visible: true,
                properties: [
                    {
                        id: "lock-1",
                        type: "lockableAreaPropertyData",
                        allowedTags: ["admin"],
                    },
                ],
            },
        ],
        entityCollections: [],
        settings: {},
    };
}

describe("WamManager", () => {
    it("applies createArea and updateWAMSettings commands", async () => {
        const manager = new WamManager(createInitialWam());

        const createAreaCommand: EditMapCommandMessage = {
            id: "cmd-create-area",
            editMapMessage: {
                message: {
                    $case: "createAreaMessage",
                    createAreaMessage: {
                        id: "area-2",
                        name: "Area 2",
                        x: 100,
                        y: 200,
                        width: 20,
                        height: 30,
                        properties: [],
                    },
                },
            },
        };

        const updateSettingsCommand: EditMapCommandMessage = {
            id: "cmd-update-settings",
            editMapMessage: {
                message: {
                    $case: "updateWAMSettingsMessage",
                    updateWAMSettingsMessage: {
                        message: {
                            $case: "updateRecordingSettingMessage",
                            updateRecordingSettingMessage: {
                                settings: {
                                    rights: ["admin"],
                                },
                            },
                        },
                    },
                },
            },
        };

        await manager.applyCommand(createAreaCommand);
        await manager.applyCommand(updateSettingsCommand);

        const wam = manager.getWam();
        expect(wam).toBeDefined();
        expect(wam?.areas.find((area) => area.id === "area-2")?.visible).toBe(true);
        expect(wam?.settings?.recording?.rights).toEqual(["admin"]);
        expect(wam?.lastCommandId).toBe("cmd-update-settings");
    });

    it("preserves area properties when modifyProperties is false", async () => {
        const manager = new WamManager(createInitialWam());

        const modifyAreaCommand: EditMapCommandMessage = {
            id: "cmd-modify-area",
            editMapMessage: {
                message: {
                    $case: "modifyAreaMessage",
                    modifyAreaMessage: {
                        id: "area-1",
                        x: 42,
                        y: 24,
                        properties: [],
                        modifyProperties: false,
                    },
                },
            },
        };

        await manager.applyCommand(modifyAreaCommand);

        const wam = manager.getWam();
        const area = wam?.areas.find((candidate) => candidate.id === "area-1");
        expect(area?.x).toBe(42);
        expect(area?.y).toBe(24);
        expect(area?.properties).toHaveLength(1);
        expect(area?.properties[0]?.id).toBe("lock-1");
    });
});

describe("WamManager map resize", () => {
    it("replays a map resize on its copy and reports the areas that moved", async () => {
        const wam = createInitialWam();
        wam.areas.push({
            id: "area-2",
            name: "Area 2",
            x: 64,
            y: 32,
            width: 32,
            height: 32,
            visible: true,
            properties: [],
        });
        wam.entities["desk"] = { x: 96, y: 32, prefabRef: { collectionName: "office", id: "desk" } };
        const manager = new WamManager(wam);
        const updates: string[] = [];
        // Completed by manager.destroy() below.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        manager.areaUpdated$.subscribe(({ areaId, area, geometryChanged }) => {
            updates.push(`${areaId}:${area.x}:${String(geometryChanged)}`);
        });

        await manager.applyCommand({
            id: "cmd-resize",
            editMapMessage: {
                message: {
                    $case: "resizeMapMessage",
                    resizeMapMessage: {
                        width: 7,
                        height: 4,
                        anchor: "right",
                        fill: "extend",
                        // Column 1 was repeated twice: everything from column 2 moved 2 columns to the right.
                        result: {
                            oldWidth: 5,
                            oldHeight: 4,
                            tileWidth: 32,
                            tileHeight: 32,
                            columns: [0, 1, 1, 1, 2, 3, 4],
                            rows: [0, 1, 2, 3],
                            displacedEntities: [],
                            displacedAreas: [],
                        },
                    },
                },
            },
        });

        expect(manager.getWam().areas.find((area) => area.id === "area-2")).toMatchObject({ x: 128, width: 32 });
        expect(manager.getWam().entities["desk"]).toMatchObject({ x: 160, y: 32 });
        expect(updates).toEqual(["area-2:128:true"]);
        expect(manager.getWam().lastCommandId).toBe("cmd-resize");
        manager.destroy();
    });

    it("ignores a resize map-storage did not apply", async () => {
        const manager = new WamManager(createInitialWam());

        await manager.applyCommand({
            id: "cmd-resize",
            editMapMessage: {
                message: {
                    $case: "resizeMapMessage",
                    resizeMapMessage: { width: 7, height: 4, anchor: "right", fill: "extend", result: undefined },
                },
            },
        });

        expect(manager.getWam().areas[0]).toMatchObject({ x: 0, width: 10 });
    });
});
