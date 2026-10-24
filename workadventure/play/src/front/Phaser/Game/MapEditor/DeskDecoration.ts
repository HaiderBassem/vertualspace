import { get } from "svelte/store";
import { mapEditorModeStore } from "../../../Stores/MapEditorStore";
import { personalAreaDataStore } from "../../../Stores/PersonalDeskStore";
import { EditorToolName } from "./MapEditorModeManager";

/** What it takes to decorate a desk: the scene to walk in and the editor to open there. */
export interface DeskDecorationScene {
    walkToPersonalDesk(): Promise<void>;
    getMapEditorModeManager(): { equipTool(toolName: EditorToolName | undefined): void } | undefined;
}

/**
 * Takes the player to their own desk and opens the object picker there, so that decorating the desk takes a single
 * click: pick an object, or drag it onto the desk.
 */
export async function startDecoratingMyDesk(scene: DeskDecorationScene): Promise<void> {
    await scene.walkToPersonalDesk();
    // Without a desk there is nothing to decorate. Walking to it has already told the player why.
    if (get(personalAreaDataStore) === null) {
        return;
    }
    mapEditorModeStore.switchMode(true);
    scene.getMapEditorModeManager()?.equipTool(EditorToolName.EntityEditor);
}
