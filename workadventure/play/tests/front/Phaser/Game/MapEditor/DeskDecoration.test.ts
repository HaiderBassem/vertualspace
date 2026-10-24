import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AreaData } from "@workadventure/map-editor";
import { personalAreaDataStore } from "../../../../../src/front/Stores/PersonalDeskStore";
import { startDecoratingMyDesk } from "../../../../../src/front/Phaser/Game/MapEditor/DeskDecoration";

const { switchMode } = vi.hoisted(() => ({ switchMode: vi.fn() }));

// The real ones drag in the whole game: only the part that decides what opens is needed.
vi.mock("../../../../../src/front/Stores/MapEditorStore", () => ({ mapEditorModeStore: { switchMode } }));
vi.mock("../../../../../src/front/Phaser/Game/MapEditor/MapEditorModeManager", () => ({
    EditorToolName: { EntityEditor: "EntityEditor" },
}));

const desk = { id: "desk-1", x: 0, y: 0, width: 64, height: 64, properties: [] } as unknown as AreaData;

describe("startDecoratingMyDesk", () => {
    const equipTool = vi.fn();
    let walkToPersonalDesk: ReturnType<typeof vi.fn<() => Promise<void>>>;
    let scene: Parameters<typeof startDecoratingMyDesk>[0];

    beforeEach(() => {
        vi.clearAllMocks();
        walkToPersonalDesk = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        scene = { walkToPersonalDesk, getMapEditorModeManager: () => ({ equipTool }) };
        personalAreaDataStore.set(desk);
    });

    it("walks to the desk, then opens the object picker there", async () => {
        const calls: string[] = [];
        walkToPersonalDesk.mockImplementation(() => {
            calls.push("walk");
            return Promise.resolve();
        });
        switchMode.mockImplementation(() => calls.push("open editor"));
        equipTool.mockImplementation(() => calls.push("equip picker"));

        await startDecoratingMyDesk(scene);

        // The editor opens on arrival, not while the player is still on the way.
        expect(calls).toEqual(["walk", "open editor", "equip picker"]);
        expect(switchMode).toHaveBeenCalledWith(true);
        expect(equipTool).toHaveBeenCalledWith("EntityEditor");
    });

    it("opens nothing for a player who has no desk", async () => {
        personalAreaDataStore.set(null);

        await startDecoratingMyDesk(scene);

        expect(walkToPersonalDesk).toHaveBeenCalledOnce();
        expect(switchMode).not.toHaveBeenCalled();
        expect(equipTool).not.toHaveBeenCalled();
    });

    it("still opens the editor when the scene has no editor manager to pick the tool", async () => {
        scene = { walkToPersonalDesk, getMapEditorModeManager: () => undefined };

        await expect(startDecoratingMyDesk(scene)).resolves.toBeUndefined();

        expect(switchMode).toHaveBeenCalledWith(true);
    });
});
