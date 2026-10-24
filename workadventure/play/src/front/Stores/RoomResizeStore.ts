import type { MapResizeReport, MapResizeRequest } from "@workadventure/map-editor";
import { MapResizeError, resizeMap } from "@workadventure/map-editor";
import { asError } from "catch-unknown";
import { derived, writable } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";

/** The size being chosen in the map editor (shown as a preview on the map), or undefined when there is none. */
export const roomResizeDraftStore = writable<Required<MapResizeRequest> | undefined>(undefined);

export type RoomResizePreview = { report: MapResizeReport } | { error: string };

/**
 * What the draft size would do to the map, computed with the same function map-storage runs, on the map of the
 * current scene.
 */
export const roomResizePreviewStore = derived(roomResizeDraftStore, (draft): RoomResizePreview | undefined => {
    if (!draft) {
        return undefined;
    }
    try {
        const gameMap = gameManager.getCurrentGameScene().getGameMap();
        const { report } = resizeMap(gameMap.getMap(), gameMap.getWamFile()?.getWam(), draft);
        return { report };
    } catch (e) {
        return { error: e instanceof MapResizeError ? e.message : asError(e).message };
    }
});

export type RoomResizeStatus =
    | { state: "idle" }
    | { state: "pending"; commandId: string }
    | { state: "failed"; reason: string };

/** The resize this user asked for: map-storage answers with the resize (to everyone) or with an error (to us). */
export const roomResizeStatusStore = writable<RoomResizeStatus>({ state: "idle" });
