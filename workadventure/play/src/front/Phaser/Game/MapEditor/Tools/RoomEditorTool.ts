import type { EditMapCommandMessage } from "@workadventure/messages";
import type { MapResizeReport } from "@workadventure/map-editor";
import type { Unsubscriber } from "svelte/store";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import type { GameScene } from "../../GameScene";
import type { MapEditorModeManager } from "../MapEditorModeManager";
import { DEPTH_MAP_EDITOR_AREAS_INDEX } from "../../DepthIndexes";
import { PHASER_COLOR_DESIGN_SYSTEM_SECONDARY } from "../../../../Utils/DesignSystemPhaserColors";
import { roomResizeDraftStore, roomResizePreviewStore } from "../../../../Stores/RoomResizeStore";
import { MapEditorTool } from "./MapEditorTool";

const REMOVED_COLOR = 0xe5484d;
const REPEATED_COLOR = 0x30a46c;

/**
 * The "Room" tool of the map editor: changing the size of the room. The panel (RoomEditor.svelte) edits the draft
 * size; this tool previews it on the map: slices that will be removed in red, slices that will be repeated in green,
 * the new bounds, and the objects and areas that will have to move.
 */
export class RoomEditorTool extends MapEditorTool {
    private readonly scene: GameScene;
    private graphics: Phaser.GameObjects.Graphics | undefined;
    private unsubscribePreview: Unsubscriber | undefined;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.scene = mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        // Nothing to be done
    }

    public clear(): void {
        this.unsubscribePreview?.();
        this.unsubscribePreview = undefined;
        this.graphics?.destroy();
        this.graphics = undefined;
        roomResizeDraftStore.set(undefined);
    }

    public activate(): void {
        this.graphics = this.scene.add.graphics().setDepth(DEPTH_MAP_EDITOR_AREAS_INDEX);
        this.unsubscribePreview = roomResizePreviewStore.subscribe((preview) => {
            this.graphics?.clear();
            if (preview && "report" in preview) {
                this.draw(preview.report);
            }
            this.scene.markDirty();
        });
    }

    public destroy(): void {
        this.clear();
    }

    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        // Nothing to be done
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        // Nothing to be done
    }

    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        // Resizes are handled by MapEditorModeManager: the whole scene reloads.
        return Promise.resolve();
    }

    private draw(report: MapResizeReport): void {
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }
        const { oldWidth, oldHeight, tileWidth, tileHeight, columns, rows } = report;
        const mapWidth = oldWidth * tileWidth;
        const mapHeight = oldHeight * tileHeight;

        // Slices of the current map: removed (red) or repeated (green).
        countCopies(columns, oldWidth).forEach((copies, column) => {
            if (copies === 1) return;
            graphics.fillStyle(copies === 0 ? REMOVED_COLOR : REPEATED_COLOR, copies === 0 ? 0.45 : 0.3);
            graphics.fillRect(column * tileWidth, 0, tileWidth, mapHeight);
        });
        countCopies(rows, oldHeight).forEach((copies, row) => {
            if (copies === 1) return;
            graphics.fillStyle(copies === 0 ? REMOVED_COLOR : REPEATED_COLOR, copies === 0 ? 0.45 : 0.3);
            graphics.fillRect(0, row * tileHeight, mapWidth, tileHeight);
        });

        // Empty space added outside the map ("empty" fill), drawn where it will appear.
        const leftEmpty = leadingEmpty(columns);
        const rightEmpty = leadingEmpty([...columns].reverse());
        const topEmpty = leadingEmpty(rows);
        const bottomEmpty = leadingEmpty([...rows].reverse());
        const keptWidth = (columns.length - leftEmpty - rightEmpty) * tileWidth;
        const keptHeight = (rows.length - topEmpty - bottomEmpty) * tileHeight;
        const boundsX = -leftEmpty * tileWidth;
        const boundsY = -topEmpty * tileHeight;
        const boundsWidth = columns.length * tileWidth;
        const boundsHeight = rows.length * tileHeight;
        if (leftEmpty + rightEmpty + topEmpty + bottomEmpty > 0) {
            graphics.fillStyle(PHASER_COLOR_DESIGN_SYSTEM_SECONDARY, 0.15);
            graphics.fillRect(boundsX, boundsY, boundsWidth, topEmpty * tileHeight);
            graphics.fillRect(boundsX, keptHeight, boundsWidth, bottomEmpty * tileHeight);
            graphics.fillRect(boundsX, 0, leftEmpty * tileWidth, keptHeight);
            graphics.fillRect(keptWidth, 0, rightEmpty * tileWidth, keptHeight);
        }

        // The size of the room once resized. With the "extend" fill the content stretches, so the outline only
        // marks the new size from the top-left corner of the kept content.
        graphics.lineStyle(3, PHASER_COLOR_DESIGN_SYSTEM_SECONDARY, 1);
        graphics.strokeRect(boundsX, boundsY, boundsWidth, boundsHeight);

        // What will have to move because it stands on removed slices.
        const wam = this.scene.getGameMap().getWamFile()?.getWam();
        graphics.lineStyle(2, REMOVED_COLOR, 1);
        for (const id of report.displacedEntities) {
            const entity = wam?.entities[id];
            if (entity) graphics.strokeRect(entity.x, entity.y, tileWidth, tileHeight);
        }
        for (const id of report.displacedAreas) {
            const area = wam?.areas.find((candidate) => candidate.id === id);
            if (area) graphics.strokeRect(area.x, area.y, area.width, area.height);
        }
    }
}

/** For each cell of the current map, how many cells of the resized map copy it (0 when it is removed). */
function countCopies(newToOld: number[], oldSize: number): number[] {
    const copies = new Array<number>(oldSize).fill(0);
    for (const oldCell of newToOld) {
        if (oldCell >= 0) copies[oldCell]++;
    }
    return copies;
}

function leadingEmpty(cells: number[]): number {
    const firstKept = cells.findIndex((cell) => cell >= 0);
    return firstKept === -1 ? cells.length : firstKept;
}
