import * as Sentry from "@sentry/svelte";
import type { AreaData, Command, DeskReservation, MapResizeRequest, RoomTemplate } from "@workadventure/map-editor";
import { UpdateWAMSettingCommand } from "@workadventure/map-editor";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { EditMapCommandMessage } from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";
import debug from "debug";
import { deepmergeInto } from "deepmerge-ts";
import type { RoomConnection } from "../../../Connection/RoomConnection";
import type { GameScene } from "../GameScene";
import {
    mapEditorAskToClaimPersonalAreaStore,
    mapEditorModeStore,
    mapEditorSelectedToolStore,
    mapEditorToolToRestoreStore,
} from "../../../Stores/MapEditorStore";
import { mapEditorActivated, mapEditorActivatedForThematics } from "../../../Stores/MenuStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import LL from "../../../../i18n/i18n-svelte";
import { gameManager } from "../GameManager";
import { isInsidePersonalAreaStore, personalAreaDataStore } from "../../../Stores/PersonalDeskStore";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import { warningMessageStore } from "../../../Stores/ErrorStore";
import { roomResizeStatusStore } from "../../../Stores/RoomResizeStore";
import { roomCreationStatusStore } from "../../../Stores/RoomCreationStore";
import { getEditDenialMessage } from "./EditDenial";
import { AreaEditorTool } from "./Tools/AreaEditorTool";
import type { MapEditorTool } from "./Tools/MapEditorTool";
import { FloorEditorTool } from "./Tools/FloorEditorTool";
import { EntityEditorTool } from "./Tools/EntityEditorTool";
import { WAMSettingsEditorTool } from "./Tools/WAMSettingsEditorTool";
import type { FrontCommandInterface } from "./Commands/FrontCommandInterface";
import type { FrontCommand } from "./Commands/FrontCommand";
import { TrashEditorTool } from "./Tools/TrashEditorTool";
import { ExplorerTool } from "./Tools/ExplorerTool";
import { CloseTool } from "./Tools/CloseTool";
import { UpdateAreaFrontCommand } from "./Commands/Area/UpdateAreaFrontCommand";
import { RoomEditorTool } from "./Tools/RoomEditorTool";
import { CreateAreaFrontCommand } from "./Commands/Area/CreateAreaFrontCommand";

export enum EditorToolName {
    AreaEditor = "AreaEditor",
    FloorEditor = "FloorEditor",
    EntityEditor = "EntityEditor",
    WAMSettingsEditor = "WAMSettingsEditor",
    TrashEditor = "TrashEditor",
    RoomEditor = "RoomEditor",
    ExploreTheRoom = "ExploreTheRoom",
    CloseMapEditor = "CloseMapEditor",
}

const logger = debug("map-editor");

/** How long to wait for a new room to be listed in the world: 15 × 1 second. */
const NEW_ROOM_LISTING_ATTEMPTS = 15;
const NEW_ROOM_LISTING_INTERVAL_MS = 1000;

export class MapEditorModeManager {
    private scene: GameScene;

    /**
     * Is user currently in Editor Mode
     */
    private active: boolean;

    /**
     * Tools that we can work with inside Editor
     */
    private editorTools: Record<EditorToolName, MapEditorTool>;

    /**
     * What tool are we using right now
     */
    private activeTool?: EditorToolName;
    /**
     * Last tool used before closing map editor
     */
    private lastlyUsedTool?: EditorToolName;

    /**
     * We are making use of CommandPattern to implement an Undo-Redo mechanism
     */
    private localCommandsHistory: FrontCommand[];

    /**
     * Commands sent by us that are still to be acknowledged by the server
     */
    private pendingCommands: FrontCommand[];
    /**
     * Which command was called most recently
     */
    private currentCommandIndex: number;

    private mapEditorModeUnsubscriber: Unsubscriber | undefined;

    private isReverting: Promise<void> = Promise.resolve();

    constructor(
        scene: GameScene,
        private _isInsidePersonalAreaStore = isInsidePersonalAreaStore,
        private _personalAreaDataStore = personalAreaDataStore,
    ) {
        this.scene = scene;

        this.localCommandsHistory = [];
        this.pendingCommands = [];
        this.currentCommandIndex = -1;

        this.active = false;

        const areaEditorTool = new AreaEditorTool(this);

        this.editorTools = {
            [EditorToolName.AreaEditor]: areaEditorTool,
            [EditorToolName.EntityEditor]: new EntityEditorTool(this),
            [EditorToolName.FloorEditor]: new FloorEditorTool(this),
            [EditorToolName.WAMSettingsEditor]: new WAMSettingsEditorTool(this),
            [EditorToolName.TrashEditor]: new TrashEditorTool(this, areaEditorTool),
            [EditorToolName.RoomEditor]: new RoomEditorTool(this),
            [EditorToolName.ExploreTheRoom]: new ExplorerTool(this, this.scene),
            [EditorToolName.CloseMapEditor]: new CloseTool(),
        };
        this.activeTool = undefined;
        this.lastlyUsedTool = get(mapEditorToolToRestoreStore);
        mapEditorToolToRestoreStore.set(undefined);

        this.subscribeToStores();
        this.subscribeToGameMapFrontWrapperEvents();

        this.currentRunningCommand = this.scene.getGameMapFrontWrapper().initializedPromise.promise;
    }

    public update(time: number, dt: number): void {
        this.currentlyActiveTool?.update(time, dt);
    }

    private currentRunningCommand: Promise<void>;

    /**
     * Creates new Command object from given command config and executes it
     * @param command what to execute
     *
     */
    public async executeCommand(
        command: (Command & FrontCommandInterface) | (Command & FrontCommandInterface & UpdateWAMSettingCommand),
    ): Promise<void> {
        await this.isReverting;
        // Commands are throttled. Only one at a time.
        return (this.currentRunningCommand = this.currentRunningCommand.then(async () => {
            const delay = 0;
            try {
                await command.execute();
                this.emitMapEditorUpdate(command, delay);

                if (!(command instanceof UpdateWAMSettingCommand)) {
                    // if we are not at the end of commands history and perform an action, get rid of commands later in history than our current point in time
                    if (this.currentCommandIndex !== this.localCommandsHistory.length - 1) {
                        this.localCommandsHistory.splice(this.currentCommandIndex + 1);
                    }
                    this.pendingCommands.push(command);
                    logger("adding command to pendingList : ", command);
                    this.localCommandsHistory.push(command);
                    this.currentCommandIndex += 1;
                }

                this.scene.getGameMap().getWamFile()?.updateLastCommandIdProperty(command.commandId);
                return;
            } catch (error) {
                console.error(error);
                Sentry.captureException(error);
                return;
            }
        }));
    }

    public async executeLocalCommand(command: Command & FrontCommandInterface): Promise<void> {
        await this.isReverting;
        // Commands are throttled. Only one at a time.
        return (this.currentRunningCommand = this.currentRunningCommand.then(async () => {
            try {
                await command.execute();
                this.scene.getGameMap().getWamFile()?.updateLastCommandIdProperty(command.commandId);
                return;
            } catch (error) {
                console.error(error);
                Sentry.captureException(error);
                return;
            }
        }));
    }

    // A simple queue to be sure we run only one undo or redo at once.
    private runningUndoRedoCommand: Promise<void> = Promise.resolve();

    public async undoCommand(): Promise<void> {
        if (this.localCommandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        try {
            const command = this.localCommandsHistory[this.currentCommandIndex];
            const undoCommand = command.getUndoCommand();
            await undoCommand.execute();
            this.pendingCommands.push(undoCommand);
            logger("adding command to pendingList : ", undoCommand);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(undoCommand);
            this.currentCommandIndex -= 1;
        } catch (e) {
            this.localCommandsHistory.splice(this.currentCommandIndex, 1);
            this.currentCommandIndex -= 1;
            console.error(e);
            Sentry.captureException(e);
        }
    }

    public async redoCommand(): Promise<void> {
        if (
            this.localCommandsHistory.length === 0 ||
            this.currentCommandIndex === this.localCommandsHistory.length - 1
        ) {
            return;
        }
        try {
            const command = this.localCommandsHistory[this.currentCommandIndex + 1];
            await command.execute();
            this.pendingCommands.push(command);
            logger("adding command to pendingList : ", command);

            // do any necessary changes for active tool interface
            //this.handleCommandExecutionByTools(commandConfig, true);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(command);
            this.currentCommandIndex += 1;
        } catch (e) {
            this.localCommandsHistory.splice(this.currentCommandIndex, 1);
            this.currentCommandIndex -= 1;
            console.error(e);
            Sentry.captureException(e);
        }
    }

    /**
     * Update local map with missing commands given from the map-storage on RoomJoinedEvent. This commands
     * are applied locally and are not being send further.
     */
    public async updateMapToNewest(commands: EditMapCommandMessage[]): Promise<void> {
        if (commands.length !== 0) {
            logger(`Map is not up to date. Updating by applying ${commands.length} missing commands.`);
            for (const command of commands) {
                for (const tool of Object.values(this.editorTools)) {
                    //eslint-disable-next-line no-await-in-loop
                    await tool.handleIncomingCommandMessage(command);
                }
            }
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public destroy(): void {
        for (const tool of Object.values(this.editorTools)) {
            tool.destroy();
        }
        this.unsubscribeFromStores();
    }

    public handleKeyDownEvent(event: KeyboardEvent): boolean {
        this.currentlyActiveTool?.handleKeyDownEvent(event);
        const mapEditorModeStoreValue = get(mapEditorModeStore);
        if (!mapEditorModeStoreValue) return false;

        const mapEditorModeActivated = get(mapEditorActivated);
        switch (event.key.toLowerCase()) {
            case "dead":
            case "`": {
                this.equipTool(EditorToolName.CloseMapEditor);
                break;
            }
            case "1": {
                this.equipTool(EditorToolName.ExploreTheRoom);
                break;
            }
            case "2": {
                if (!mapEditorModeActivated) {
                    this.equipTool(EditorToolName.CloseMapEditor);
                    break;
                }
                this.equipTool(EditorToolName.AreaEditor);
                break;
            }
            case "3": {
                if (!mapEditorModeActivated) break;
                this.equipTool(EditorToolName.EntityEditor);
                break;
            }
            case "4": {
                if (!mapEditorModeActivated) break;
                this.equipTool(EditorToolName.WAMSettingsEditor);
                break;
            }
            case "5": {
                if (!mapEditorModeActivated) break;
                this.equipTool(EditorToolName.TrashEditor);
                break;
            }
            case "6": {
                if (!mapEditorModeActivated) break;
                this.equipTool(EditorToolName.CloseMapEditor);
                break;
            }
            case "z": {
                if (!mapEditorModeActivated) break;
                // Todo replace with key combo https://photonstorm.github.io/phaser3-docs/Phaser.Input.Keyboard.KeyCombo.html
                if (event.ctrlKey || event.metaKey) {
                    if (event.shiftKey) {
                        this.runningUndoRedoCommand = this.runningUndoRedoCommand
                            .then(() => {
                                return this.redoCommand();
                            })
                            .catch((e) => console.error(e));
                    } else {
                        this.runningUndoRedoCommand = this.runningUndoRedoCommand
                            .then(() => {
                                return this.undoCommand();
                            })
                            .catch((e) => console.error(e));
                    }
                }
                break;
            }
            default: {
                return false;
                break;
            }
        }
        return true;
    }

    public subscribeToRoomConnection(connection: RoomConnection): void {
        const limit = pLimit(1);
        // The editMapCommandMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        connection.editMapCommandMessageStream.subscribe((editMapCommandMessage) => {
            limit(async () => {
                const resizeStatus = get(roomResizeStatusStore);
                const isOurResize =
                    resizeStatus.state === "pending" && resizeStatus.commandId === editMapCommandMessage.id;
                if (editMapCommandMessage.editMapMessage?.message?.$case === "resizeMapMessage") {
                    // The stored map was resized: every client reloads it, keeping its players where they stood.
                    const result = editMapCommandMessage.editMapMessage.message.resizeMapMessage.result;
                    if (isOurResize) {
                        roomResizeStatusStore.set({ state: "idle" });
                    }
                    if (result) {
                        this.scene.reloadAfterMapResize(result, isOurResize);
                    }
                    return;
                }
                const creationStatus = get(roomCreationStatusStore);
                const isOurCreation =
                    creationStatus.state === "pending" && creationStatus.commandId === editMapCommandMessage.id;
                if (editMapCommandMessage.editMapMessage?.message?.$case === "createRoomMessage") {
                    // Another map was created: the map being edited did not change.
                    const result = editMapCommandMessage.editMapMessage.message.createRoomMessage.result;
                    if (isOurCreation && result) {
                        roomCreationStatusStore.set({ state: "linking", name: creationStatus.name });
                        this.linkNewRoom(result.wamUrl, creationStatus.name, creationStatus.addDoor).catch((e) => {
                            console.error("Could not link the new room", e);
                            Sentry.captureException(e);
                            roomCreationStatusStore.set({
                                state: "created",
                                name: creationStatus.name,
                                roomUrl: undefined,
                                doorAdded: false,
                            });
                        });
                    }
                    return;
                }
                if (isOurCreation && editMapCommandMessage.editMapMessage?.message?.$case === "errorCommandMessage") {
                    const reason = editMapCommandMessage.editMapMessage.message.errorCommandMessage.reason;
                    analyticsClient.trackAdminEvent("map_editor.save.failed", { reason });
                    roomCreationStatusStore.set({ state: "failed", reason });
                    return;
                }
                if (isOurResize && editMapCommandMessage.editMapMessage?.message?.$case === "errorCommandMessage") {
                    const reason = editMapCommandMessage.editMapMessage.message.errorCommandMessage.reason;
                    analyticsClient.trackAdminEvent("map_editor.save.failed", { reason });
                    roomResizeStatusStore.set({ state: "failed", reason });
                    return;
                }
                if (editMapCommandMessage.editMapMessage?.message?.$case === "errorCommandMessage") {
                    const reason = editMapCommandMessage.editMapMessage.message.errorCommandMessage.reason;
                    logger("ErrorCommandMessage received", reason);
                    // The only place a map editor edit is known to have failed. The
                    // commands themselves send fire-and-forget, so this is where the
                    // failure analytics belongs — reporting it next to the send would
                    // have counted every rejected edit as a success.
                    analyticsClient.trackAdminEvent("map_editor.save.failed", { reason });
                    const command = this.pendingCommands.find(
                        (command) => command.commandId === editMapCommandMessage.id,
                    );
                    if (command) {
                        // The server refused the command, so the optimistic local state is now wrong.
                        // Roll back every pending command: the ones the server did accept come back
                        // through this same stream and are re-applied as remote commands.
                        // Nothing is reported here: map-storage already logged the cause with its
                        // original stack, and a refusal is also the expected answer to a command the
                        // user was not allowed to run.
                        await this.revertPendingCommands();
                        // A refusal that has a code says why (the desk was just taken, it is not open to this user,
                        // ...): that is far more useful to the user than "your change was not saved".
                        warningMessageStore.addWarningMessage(
                            getEditDenialMessage(reason) ?? get(LL).mapEditor.map.editionFailed(),
                        );
                    }
                    return;
                }

                logger("Received command from server", editMapCommandMessage.id);

                // Local command execution (undo/redo)
                if (this.pendingCommands.length > 0) {
                    if (this.pendingCommands[0].commandId === editMapCommandMessage.id) {
                        logger("removing command of pendingList : ", editMapCommandMessage.id);
                        const command = this.pendingCommands.shift();

                        const message = editMapCommandMessage.editMapMessage?.message;

                        if (
                            command instanceof UpdateAreaFrontCommand &&
                            message &&
                            message.$case === "modifyAreaMessage" &&
                            message.modifyAreaMessage.modifyServerData === true
                        ) {
                            command.setNewConfig(message.modifyAreaMessage);
                            await command.execute();
                        }

                        return;
                    }
                    await this.revertPendingCommands();
                }

                // Remote command execution
                for (const tool of Object.values(this.editorTools)) {
                    //eslint-disable-next-line no-await-in-loop
                    await tool.handleIncomingCommandMessage(editMapCommandMessage);
                }
            }).catch((e) => console.error(e));
        });
    }

    private async revertPendingCommands(): Promise<void> {
        logger("Reverting pending commands");
        // We are blocking the normal execution of commands until we revert all pending commands
        this.isReverting = (async () => {
            while (this.pendingCommands.length > 0) {
                const command = this.pendingCommands.pop();
                if (command) {
                    //eslint-disable-next-line no-await-in-loop
                    await command.getUndoCommand().execute();
                    // also remove from local history of commands as this is invalid
                    const index = this.localCommandsHistory.findIndex(
                        (localCommand) => localCommand.commandId === command.commandId,
                    );
                    if (index !== -1) {
                        this.localCommandsHistory.splice(index, 1);
                        this.currentCommandIndex -= 1;
                    }
                }
            }
        })();
        return this.isReverting;
    }

    public equipTool(tool?: EditorToolName): void {
        if (this.activeTool === tool) {
            return;
        }
        this.clearToNeutralState();
        this.activeTool = tool;

        if (tool !== undefined) {
            this.activateTool();
        }
        mapEditorSelectedToolStore.set(tool);
    }

    public returnToLastMode(): boolean {
        if (!this.active) {
            return false;
        }

        // Only restore exploration when it is the currently active tool. Relying on the
        // last used tool could switch the active editor tool (Area/Floor/Entity...) to
        // exploration mode when the Woka menu is closed, which is not desired.
        if (this.activeTool === EditorToolName.ExploreTheRoom) {
            this.scene.getCameraManager().setExplorationMode();
            return true;
        }

        return false;
    }

    private emitMapEditorUpdate(command: FrontCommandInterface, delay = 0): void {
        const func = () => {
            if (this.scene.connection === undefined) {
                throw new Error("No connection attached to room to emit map editor update");
            }
            command.emitEvent(this.scene.connection);
        };
        if (delay === 0) {
            func();
            return;
        }
        setTimeout(func, delay);
    }

    /**
     * Hide everything related to tools like Area Previews etc
     */
    private clearToNeutralState(): void {
        this.currentlyActiveTool?.clear();
    }

    /**
     * Show things necessary for tool's usage
     */
    private activateTool(): void {
        this.currentlyActiveTool?.activate();
    }

    private subscribeToStores(): void {
        this.mapEditorModeUnsubscriber = mapEditorModeStore.subscribe((active) => {
            this.active = active;
            if (!this.active) {
                this.lastlyUsedTool = get(mapEditorSelectedToolStore);
                this.equipTool(undefined);
                return;
            }
            this.equipTool(
                this.lastlyUsedTool && this.lastlyUsedTool != EditorToolName.CloseMapEditor
                    ? this.lastlyUsedTool
                    : get(mapEditorActivated) || get(mapEditorActivatedForThematics)
                      ? EditorToolName.EntityEditor
                      : EditorToolName.ExploreTheRoom,
            );
        });
    }

    private subscribeToGameMapFrontWrapperEvents(): void {
        for (const tool of Object.values(this.editorTools)) {
            tool.subscribeToGameMapFrontWrapperEvents(this.scene.getGameMapFrontWrapper());
        }
    }

    private unsubscribeFromStores(): void {
        this.mapEditorModeUnsubscriber?.();
    }

    public get currentlyActiveTool(): MapEditorTool | undefined {
        return this.activeTool ? this.editorTools[this.activeTool] : undefined;
    }

    /**
     * Asks map-storage to resize the room. Not part of the undo history: the map reloads once it is resized.
     */
    public requestRoomResize(request: Required<MapResizeRequest>): void {
        if (this.scene.connection === undefined) {
            roomResizeStatusStore.set({ state: "failed", reason: get(LL).mapEditor.roomEditor.notConnected() });
            return;
        }
        const commandId = uuidv4();
        roomResizeStatusStore.set({ state: "pending", commandId });
        this.scene.connection.emitResizeMap(commandId, request);
    }

    /**
     * Asks map-storage to create a room next to this one. With `addDoor`, the two rooms are linked by doors: one in
     * the new room (created by map-storage) and one here, next to the player, once the room is listed in the world.
     */
    public requestRoomCreation(
        request: { name: string; template: RoomTemplate; width: number; height: number },
        addDoor: boolean,
    ): void {
        if (this.scene.connection === undefined) {
            roomCreationStatusStore.set({ state: "failed", reason: get(LL).mapEditor.roomEditor.notConnected() });
            return;
        }
        const commandId = uuidv4();
        roomCreationStatusStore.set({ state: "pending", commandId, name: request.name, addDoor });
        this.scene.connection.emitCreateRoom(commandId, {
            ...request,
            returnUrl: addDoor ? new URL(this.scene.roomUrl, window.location.href).pathname : "",
        });
    }

    /**
     * Waits for a new room to be listed in the world (an administration may register it a moment after map-storage
     * created it), then adds the door to it.
     */
    private async linkNewRoom(wamUrl: string, name: string, addDoor: boolean): Promise<void> {
        const roomUrl = await this.findListedRoom(wamUrl, NEW_ROOM_LISTING_ATTEMPTS);
        if (roomUrl !== undefined && addDoor) {
            await this.addDoorTo(roomUrl, name);
        }
        roomCreationStatusStore.set({ state: "created", name, roomUrl, doorAdded: roomUrl !== undefined && addDoor });
    }

    /** The URL of the room of the world using this WAM file, asking again every second until it is listed. */
    private async findListedRoom(wamUrl: string, attemptsLeft: number): Promise<string | undefined> {
        const rooms = (await this.scene.connection?.queryRoomsFromSameWorld()) ?? [];
        const roomUrl = rooms.find(
            (room) => room.wamUrl !== undefined && decodeURI(room.wamUrl) === decodeURI(wamUrl),
        )?.roomUrl;
        if (roomUrl !== undefined || attemptsLeft <= 1) {
            return roomUrl;
        }
        await new Promise<void>((resolve) => {
            setTimeout(resolve, NEW_ROOM_LISTING_INTERVAL_MS);
        });
        return this.findListedRoom(wamUrl, attemptsLeft - 1);
    }

    /** A door (an exit area) to another room, two tiles away from the player so they do not take it right away. */
    private async addDoorTo(roomUrl: string, name: string): Promise<void> {
        const wamFile = this.scene.getGameMap().getWamFile();
        const areaEditorTool = this.editorTools[EditorToolName.AreaEditor];
        if (!wamFile || !(areaEditorTool instanceof AreaEditorTool)) {
            return;
        }
        const tile = this.scene.getGameMap().getTileDimensions();
        const mapWidth = (this.scene.getGameMap().getMap().width ?? 0) * tile.width;
        const playerX = Math.floor(this.scene.CurrentPlayer.x / tile.width) * tile.width;
        const playerY = Math.floor(this.scene.CurrentPlayer.y / tile.height) * tile.height;
        const doorWidth = 2 * tile.width;
        let x = playerX + 2 * tile.width;
        if (x + doorWidth > mapWidth) {
            x = Math.max(0, playerX - 2 * tile.width - doorWidth);
        }
        await this.executeCommand(
            new CreateAreaFrontCommand(
                wamFile,
                {
                    id: uuidv4(),
                    name: get(LL).mapEditor.roomEditor.doorName({ name }),
                    x,
                    y: playerY,
                    width: doorWidth,
                    height: tile.height,
                    visible: true,
                    properties: [{ id: uuidv4(), type: "exit", url: roomUrl, areaName: "" }],
                },
                undefined,
                areaEditorTool,
                true,
                this.scene.getGameMapFrontWrapper(),
            ),
        );
    }

    public getScene(): GameScene {
        return this.scene;
    }

    /**
     * Claims a desk for this player. Without `areaData` it is the desk the claim dialog asked about; sitting at a free
     * desk passes its area, so that the seat itself is the claim. A desk the player already holds is given back first.
     */
    public claimPersonalArea(userName: string, areaData?: AreaData) {
        const areaDataToClaim = areaData ?? get(mapEditorAskToClaimPersonalAreaStore);
        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (areaDataToClaim === undefined) {
            console.error("No area to claim");
            return;
        }
        if (userUUID === undefined) {
            console.error("Unable to claim the area, your UUID is undefined");
            return;
        }
        const areaPersonalPropertyData = areaDataToClaim.properties.find(
            (property) => property.type === "personalAreaPropertyData",
        );
        if (!areaPersonalPropertyData) {
            console.error("No area property data");
            return;
        }

        // Get and revoke the personal area of the user if it exists
        const gameMapFrontWrapper = gameManager.getCurrentGameScene().getGameMapFrontWrapper();
        for (const area of gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData") ?? []) {
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (!property || (property.type === "personalAreaPropertyData" && property?.ownerId !== userUUID)) continue;

            // The user already has a personal area, revoke it. The desk keeps its name (the one an administrator
            // gave it): who owns it is shown from its owner fields.
            const oldAreaDataToRevok = structuredClone(area.areaData);
            deepmergeInto(property, {
                ownerId: null,
                ownerName: null,
            });

            this.executeCommand(
                new UpdateAreaFrontCommand(
                    this.getScene().getGameMap().getWamFile()!,
                    area.areaData,
                    undefined,
                    oldAreaDataToRevok,
                    this.editorTools.AreaEditor as AreaEditorTool,
                    this.scene.getGameMapFrontWrapper(),
                ),
            ).catch((error) => console.error(error));
        }

        const oldAreaData = structuredClone(areaDataToClaim);
        const property = areaDataToClaim.properties.find((property) => property.type === "personalAreaPropertyData");
        if (property) {
            // The new owner, and their name shown on the desk while they are away. The desk keeps its own name.
            deepmergeInto(property, {
                ownerId: userUUID,
                ownerName: userName.trim().slice(0, 64) || null,
            });
        }

        this.executeCommand(
            new UpdateAreaFrontCommand(
                this.getScene().getGameMap().getWamFile()!,
                areaDataToClaim,
                undefined,
                oldAreaData,
                this.editorTools.AreaEditor as AreaEditorTool,
                this.scene.getGameMapFrontWrapper(),
            ),
        ).catch((error) => console.error(error));
        this._isInsidePersonalAreaStore.set(true);
        this._personalAreaDataStore.set(areaDataToClaim);
    }

    public async unclaimPersonalArea(areaData: AreaData) {
        const property = areaData.properties.find((property) => property.type === "personalAreaPropertyData");
        if (!property) {
            console.error("No area property data");
            return;
        }
        deepmergeInto(property, {
            ownerId: null,
            ownerName: null,
        });
        await this.executeCommand(
            new UpdateAreaFrontCommand(
                this.getScene().getGameMap().getWamFile()!,
                areaData,
                undefined,
                undefined,
                this.editorTools.AreaEditor as AreaEditorTool,
                this.scene.getGameMapFrontWrapper(),
            ),
        );
        this._isInsidePersonalAreaStore.set(false);
        this._personalAreaDataStore.set(null);
    }

    /**
     * Books a hot desk, or cancels a booking: only the reservations of the desk change. The server accepts it from users
     * who cannot edit the map only when it is one booking (or cancellation) of their own (see evaluateDeskBooking); a
     * refusal undoes it here and tells why.
     */
    public async setDeskReservations(areaData: AreaData, reservations: DeskReservation[]): Promise<void> {
        const nextAreaData = structuredClone(areaData);
        const property = nextAreaData.properties.find((candidate) => candidate.type === "personalAreaPropertyData");
        if (!property || property.type !== "personalAreaPropertyData") {
            console.error("No area property data");
            return;
        }
        property.reservations = reservations;
        await this.executeCommand(
            new UpdateAreaFrontCommand(
                this.getScene().getGameMap().getWamFile()!,
                nextAreaData,
                undefined,
                structuredClone(areaData),
                this.editorTools.AreaEditor as AreaEditorTool,
                this.scene.getGameMapFrontWrapper(),
            ),
        );
    }
}
