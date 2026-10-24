import { isDeepStrictEqual } from "util";
import type { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import type { AreaData, AtLeast, EntityDataProperties, WAMEntityData } from "@workadventure/map-editor";
import {
    AreaDataProperties,
    CreateAreaCommand,
    CreateEntityCommand,
    CreateRoomRequest,
    EntityPermissions,
    MapResizeRequest,
    UpdateWAMMetadataCommand,
    UpdateWAMSettingCommand,
} from "@workadventure/map-editor";
import type {
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EditMapCommandWithKeyMessage,
    MapStorageClearAfterUploadMessage,
    PingMessage,
    UpdateMapToNewestWithKeyMessage,
} from "@workadventure/messages";
import type { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import type { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { asError } from "catch-unknown";
import type { z } from "zod";
import { DeleteCustomEntityMapStorageCommand } from "./Commands/Entity/DeleteCustomEntityMapStorageCommand";
import { ModifyCustomEntityMapStorageCommand } from "./Commands/Entity/ModifyCustomEntityMapStorageCommand";
import { UploadEntityMapStorageCommand } from "./Commands/Entity/UploadEntityMapStorageCommand";
import { entitiesManager } from "./EntitiesManager";
import { mapsManager } from "./MapsManager";
import { mapPathUsingUrl } from "./Services/PathMapper";
import { DeleteAreaMapStorageCommand } from "./Commands/Area/DeleteAreaMapStorageCommand";
import { UpdateAreaMapStorageCommand } from "./Commands/Area/UpdateAreaMapStorageCommand";
import { DeleteEntityMapStorageCommand } from "./Commands/Entity/DeleteEntityMapStorageCommand";
import { UploadFileMapStorageCommand } from "./Commands/File/UploadFileMapStorageCommand";
import { hookManager } from "./Modules/HookManager";
import { UpdateEntityMapStorageCommand } from "./Commands/Entity/UpdateEntityMapStorageCommand";
import { DeskPolicyError, assertDeskChangeAllowed, normalizeDeskChange } from "./Services/PersonalDeskPolicy";
import {
    EntityEditPolicyError,
    assertCanCreateEntity,
    assertCanDeleteEntity,
    assertCanModifyEntity,
} from "./Services/EntityEditPolicy";
import { canUserEditCustomEntity } from "./Services/canUserEditCustomEntity";
import { CustomEntityCollectionService } from "./Services/CustomEntityCollectionService";
import { resizeStoredMap, toResizeMapResultMessage } from "./Services/MapResizeService";
import { createStoredRoom } from "./Services/RoomCreationService";

/**
 * List of commands that can be executed even if the user does not have edit rights on the map
 * (but have local edit rights on a given area).
 */
const COMMANDS_ACCESSIBLE_WITHOUT_CAN_EDIT = new Set<string>([
    "modifyEntityMessage",
    "createEntityMessage",
    "deleteEntityMessage",
    "uploadEntityMessage",
    "modifyCustomEntityMessage",
    "deleteCustomEntityMessage",
    "uploadFileMessage",
    "modifyAreaMessage",
]);

/**
 * The commands, among those above, that add or change what is stored for objects and files. A user without map edit
 * rights can only run them if they can edit something on this map: their own desk, or an area they have write rights on.
 */
const COMMANDS_NEEDING_AN_EDITABLE_AREA = new Set<string>([
    "uploadEntityMessage",
    "modifyCustomEntityMessage",
    "deleteCustomEntityMessage",
    "uploadFileMessage",
]);

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, Empty>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleClearAfterUpload(
        call: ServerUnaryCall<MapStorageClearAfterUploadMessage, Empty>,
        callback: sendUnaryData<Empty>,
    ): void {
        try {
            const wamUrl = call.request.wamUrl;
            const url = new URL(wamUrl);
            const wamKey = mapPathUsingUrl(url);
            mapsManager.clearAfterUpload(wamKey);
            callback(null);
        } catch (e: unknown) {
            const error = asError(e);
            console.error(`[${new Date().toISOString()}] An error occurred in handleClearAfterUpload`, e);
            Sentry.captureException(e);
            callback({ name: "MapStorageError", message: error.message }, null);
        }
    },
    handleUpdateMapToNewestMessage(
        call: ServerUnaryCall<UpdateMapToNewestWithKeyMessage, Empty>,
        callback: sendUnaryData<EditMapCommandsArrayMessage>,
    ): void {
        try {
            const mapUrl = new URL(call.request.mapKey);
            const mapKey = mapPathUsingUrl(mapUrl);
            const updateMapToNewestMessage = call.request.updateMapToNewestMessage;
            if (!updateMapToNewestMessage) {
                callback({ name: "MapStorageError", message: "UpdateMapToNewest message does not exist" }, null);
                return;
            }
            const clientCommandId = updateMapToNewestMessage.commandId;
            const lastCommandId = mapsManager.getWamFile(mapKey)?.getLastCommandId();
            let commandsToApply: EditMapCommandMessage[] = [];
            if (clientCommandId !== lastCommandId) {
                commandsToApply = mapsManager.getCommandsNewerThan(mapKey, updateMapToNewestMessage.commandId);
            }
            const editMapCommandsArrayMessage: EditMapCommandsArrayMessage = {
                editMapCommands: commandsToApply,
            };
            callback(null, editMapCommandsArrayMessage);
        } catch (e: unknown) {
            const error = asError(e);
            console.error(`[${new Date().toISOString()}] An error occurred in handleClearAfterUpload`, e);
            Sentry.captureException(e);
            callback({ name: "MapStorageError", message: error.message }, null);
        }
    },

    handleEditMapCommandWithKeyMessage(
        call: ServerUnaryCall<EditMapCommandWithKeyMessage, Empty>,
        callback: sendUnaryData<EditMapCommandMessage>,
    ): void {
        (async () => {
            const editMapCommandMessage = call.request.editMapCommandMessage;
            if (!editMapCommandMessage || !editMapCommandMessage.editMapMessage?.message) {
                callback({ name: "MapStorageError", message: "EditMapCommand message does not exist" }, null);
                return;
            }

            // The mapKey is the complete URL to the map. Let's map it to our virtual path.
            const mapUrl = new URL(call.request.mapKey);
            const mapKey = mapPathUsingUrl(mapUrl);

            await mapsManager.waitForLock(mapKey, async () => {
                const editMapCommandMessage = call.request.editMapCommandMessage;
                if (!editMapCommandMessage || !editMapCommandMessage.editMapMessage?.message) {
                    callback({ name: "MapStorageError", message: "EditMapCommand message does not exist" }, null);
                    return;
                }
                const editMapMessage = editMapCommandMessage.editMapMessage.message;
                const wamFile = await mapsManager.getOrLoadWamFile(mapKey);

                const { connectedUserTags, userCanEdit, userUUID } = call.request;

                const gameMapAreas = wamFile.getGameMapAreas();
                const entityCommandPermissions = gameMapAreas
                    ? new EntityPermissions(gameMapAreas, connectedUserTags, userCanEdit, userUUID)
                    : undefined;

                const commandId = editMapCommandMessage.id;

                if (!userCanEdit && !COMMANDS_ACCESSIBLE_WITHOUT_CAN_EDIT.has(editMapMessage.$case)) {
                    // A user tried to bypass security!
                    throw new Error(
                        `User ${userUUID} is not allowed to edit the map but tried to execute command: ${editMapMessage.$case} on map ${mapUrl}`,
                    );
                }
                if (
                    !userCanEdit &&
                    COMMANDS_NEEDING_AN_EDITABLE_AREA.has(editMapMessage.$case) &&
                    !gameMapAreas?.isGameMapContainsSpecificAreas(userUUID, connectedUserTags)
                ) {
                    throw new Error(
                        `User ${userUUID} cannot edit anything on map ${mapUrl} (no desk, no area with write rights) but tried to execute command: ${editMapMessage.$case}`,
                    );
                }

                switch (editMapMessage.$case) {
                    case "modifyAreaMessage": {
                        const message = editMapMessage.modifyAreaMessage;
                        if (!userCanEdit) {
                            // Without map edit rights, a user can only claim a free desk they are eligible for and
                            // release their own. This runs inside the lock of the map, so two claims of one desk at the
                            // same time cannot both succeed.
                            // TODO: Remove this check once we have a proper system for associating data with areas
                            // (e.g., personal area data) or a WAM section accessible to all users.
                            const deskChange = assertDeskChangeAllowed(
                                message,
                                userUUID,
                                connectedUserTags,
                                wamFile.getGameMapAreas().getArea(message.id),
                                wamFile.getGameMapAreas().getAreas().values(),
                            );
                            normalizeDeskChange(message, deskChange);
                        }
                        // NOTE: protobuf does not distinguish between null and empty array, we cannot create optional repeated value.
                        //       Because of that, we send additional "modifyProperties" flag set properties value as "undefined" so they won't get erased
                        //       by [] value which was supposed to be null.
                        const dataToModify: AtLeast<AreaData, "id"> = structuredClone(message);
                        if (!message.modifyProperties) {
                            dataToModify.properties = undefined;
                        }
                        const area = wamFile.getGameMapAreas().getArea(message.id);
                        if (area) {
                            await mapsManager.executeCommand(
                                mapKey,
                                mapUrl.host,
                                new UpdateAreaMapStorageCommand(
                                    wamFile,
                                    dataToModify,
                                    commandId,
                                    area,
                                    hookManager,
                                    mapUrl.hostname,
                                ),
                            );

                            const newAreaData = wamFile.getGameMapAreas().getArea(message.id);

                            if (newAreaData) {
                                const oldPropertiesParsed =
                                    AreaDataProperties.safeParse(editMapMessage.modifyAreaMessage.properties).data ||
                                    [];

                                const oldServerData = oldPropertiesParsed.reduce(
                                    (acc, currProperty) => {
                                        if (currProperty.serverData) {
                                            acc.push({
                                                id: currProperty.id,
                                                serverData: currProperty.serverData,
                                            });
                                        }

                                        return acc;
                                    },
                                    [] as { id: string; serverData: unknown }[],
                                );

                                const newServerData = newAreaData.properties.reduce(
                                    (acc, currProperty) => {
                                        if (currProperty.serverData) {
                                            acc.push({
                                                id: currProperty.id,
                                                serverData: currProperty.serverData,
                                            });
                                        }
                                        return acc;
                                    },
                                    [] as { id: string; serverData: unknown }[],
                                );

                                editMapMessage.modifyAreaMessage = {
                                    ...newAreaData,
                                    modifyServerData: !isDeepStrictEqual(oldServerData, newServerData),
                                };
                            }
                        } else {
                            console.info(`[${new Date().toISOString()}] Could not find area with id: ${message.id}`);
                        }
                        break;
                    }
                    case "createAreaMessage": {
                        const message = editMapMessage.createAreaMessage;
                        const areaObjectConfig: AreaData = {
                            ...message,
                            visible: true,
                        };
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new CreateAreaCommand(wamFile, areaObjectConfig, commandId),
                        );
                        break;
                    }
                    case "deleteAreaMessage": {
                        const message = editMapMessage.deleteAreaMessage;
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new DeleteAreaMapStorageCommand(
                                wamFile,
                                message.id,
                                commandId,
                                mapUrl.hostname,
                                hookManager,
                            ),
                        );
                        break;
                    }
                    case "modifyEntityMessage": {
                        const message = editMapMessage.modifyEntityMessage;

                        // NOTE: protobuf does not distinguish between null and empty array, we cannot create optional repeated value.
                        //       Because of that, we send additional "modifyProperties" flag set properties value as "undefined" so they won't get erased
                        //       by [] value which was supposed to be null.
                        const dataToModify: Partial<WAMEntityData> = structuredClone(message);
                        if (!message.modifyProperties) {
                            dataToModify.properties = undefined;
                        }
                        const entity = wamFile.getGameMapEntities().getEntity(message.id);
                        if (entity) {
                            const { x, y, width, height } = message;
                            // Both where the object is now (as the server has it) and where it would go must be
                            // editable by the user: otherwise they could move objects of others into their own desk.
                            // A refusal must throw: a command that is not applied must not be broadcast as valid.
                            assertCanModifyEntity(
                                entityCommandPermissions,
                                userCanEdit,
                                { x: entity.x, y: entity.y },
                                { x, y, width, height },
                            );
                            await mapsManager.executeCommand(
                                mapKey,
                                mapUrl.host,
                                new UpdateEntityMapStorageCommand(
                                    wamFile,
                                    message.id,
                                    dataToModify,
                                    commandId,
                                    entity,
                                    hookManager,
                                    mapUrl.hostname,
                                ),
                            );
                        } else {
                            if (!userCanEdit) {
                                throw new Error(`The object ${message.id} does not exist on this map`);
                            }
                            console.info(`[${new Date().toISOString()}] Could not find entity with id: ${message.id}`);
                        }
                        break;
                    }
                    case "createEntityMessage": {
                        const message = editMapMessage.createEntityMessage;
                        const { x, y, width, height } = message;
                        // The whole object must lie in an area the user can edit. The size comes from the browser, so
                        // a missing or zero size is refused: it would reduce the check to a single point.
                        assertCanCreateEntity(entityCommandPermissions, userCanEdit, { x, y, width, height });
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new CreateEntityCommand(
                                wamFile,
                                message.id,
                                {
                                    prefabRef: {
                                        id: message.prefabId,
                                        collectionName: message.collectionName,
                                    },
                                    x: message.x,
                                    y: message.y,
                                    properties: message.properties as EntityDataProperties,
                                    name: message.name,
                                },
                                commandId,
                            ),
                        );
                        break;
                    }
                    case "deleteEntityMessage": {
                        const message = editMapMessage.deleteEntityMessage;
                        // Without map edit rights, only the objects inside an area the user can edit (their own
                        // desk) can be deleted: not the objects of other desks, nor the shared ones.
                        if (!userCanEdit) {
                            const entityToDelete = wamFile.getGameMapEntities().getEntity(message.id);
                            if (!entityToDelete) {
                                throw new Error(`The object ${message.id} does not exist on this map`);
                            }
                            assertCanDeleteEntity(entityCommandPermissions, userCanEdit, {
                                x: entityToDelete.x,
                                y: entityToDelete.y,
                            });
                        }
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new DeleteEntityMapStorageCommand(
                                wamFile,
                                message.id,
                                commandId,
                                mapUrl.hostname,
                                hookManager,
                            ),
                        );
                        break;
                    }
                    case "uploadEntityMessage": {
                        const uploadEntityMessage = editMapMessage.uploadEntityMessage;
                        // The uploader owns the entity. We overwrite whatever the client sent, and we do it on the
                        // message itself so that the value is persisted, queued and broadcast to every other client.
                        uploadEntityMessage.ownerId = userUUID;
                        await entitiesManager.executeCommand(
                            new UploadEntityMapStorageCommand(uploadEntityMessage, mapUrl.hostname),
                        );
                        break;
                    }
                    case "modifyCustomEntityMessage": {
                        const modifyCustomEntityMessage = editMapMessage.modifyCustomEntityMessage;
                        await assertUserCanEditCustomEntity(
                            mapUrl,
                            modifyCustomEntityMessage.id,
                            userUUID,
                            userCanEdit,
                            "modify",
                        );
                        await entitiesManager.executeCommand(
                            new ModifyCustomEntityMapStorageCommand(modifyCustomEntityMessage, mapUrl.hostname),
                        );
                        break;
                    }
                    case "deleteCustomEntityMessage": {
                        const deleteCustomEntityMessage = editMapMessage.deleteCustomEntityMessage;
                        // This check must happen before the command runs: DeleteCustomEntityCommand.execute()
                        // mutates the in-memory WAM before touching the collection file, so throwing from
                        // deeper down would leave map-storage with a corrupted WAM.
                        await assertUserCanEditCustomEntity(
                            mapUrl,
                            deleteCustomEntityMessage.id,
                            userUUID,
                            userCanEdit,
                            "delete",
                        );
                        await entitiesManager.executeCommand(
                            new DeleteCustomEntityMapStorageCommand(
                                deleteCustomEntityMessage,
                                wamFile,
                                mapUrl.hostname,
                            ),
                        );
                        break;
                    }
                    case "updateWAMSettingsMessage": {
                        const message = editMapMessage.updateWAMSettingsMessage;
                        const wam = wamFile.getWam();
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new UpdateWAMSettingCommand(wam, message, commandId),
                        );
                        break;
                    }
                    case "errorCommandMessage": {
                        // Nothing to do, this message will never come from client
                        break;
                    }
                    case "modifiyWAMMetadataMessage": {
                        const message = editMapMessage.modifiyWAMMetadataMessage;
                        const wam = wamFile.getWam();
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new UpdateWAMMetadataCommand(wam, message, commandId),
                        );
                        break;
                    }
                    case "uploadFileMessage": {
                        const uploadFileMessage = editMapMessage.uploadFileMessage;
                        await entitiesManager.executeCommand(
                            new UploadFileMapStorageCommand(uploadFileMessage, mapUrl.hostname),
                        );
                        editMapMessage.uploadFileMessage.file = new Uint8Array(0);
                        break;
                    }
                    case "resizeMapMessage": {
                        const message = editMapMessage.resizeMapMessage;
                        const request = parseRequest(MapResizeRequest, {
                            width: message.width,
                            height: message.height,
                            // Protobuf strings default to "": fall back to the defaults of MapResizeRequest.
                            anchor: message.anchor || undefined,
                            fill: message.fill || undefined,
                        });
                        const { report } = await resizeStoredMap(
                            mapKey,
                            mapUrl.hostname,
                            mapKey.replace(mapUrl.hostname, ""),
                            request,
                            mapsManager.getMapListService(),
                        );
                        message.result = toResizeMapResultMessage(report);
                        // The resized map was dropped from memory with its command queue: this command must not
                        // join that queue, it would be replayed on top of the resized map.
                        callback(null, editMapCommandMessage);
                        return;
                    }
                    case "createRoomMessage": {
                        const message = editMapMessage.createRoomMessage;
                        const request = parseRequest(CreateRoomRequest, {
                            name: message.name,
                            template: message.template || undefined,
                            width: message.width || undefined,
                            height: message.height || undefined,
                            returnUrl: message.returnUrl || undefined,
                        });
                        message.result = await createStoredRoom(
                            mapKey,
                            mapUrl,
                            request,
                            mapsManager.getMapListService(),
                        );
                        // The map being edited did not change: nothing to replay to the clients joining later.
                        callback(null, editMapCommandMessage);
                        return;
                    }
                    default: {
                        const _exhaustiveCheck: never = editMapMessage;
                    }
                }
                // send edit map message back as a valid one
                mapsManager.addCommandToQueue(mapKey, editMapCommandMessage);
                callback(null, editMapCommandMessage);
            });
        })().catch((e: unknown) => {
            if (e instanceof DeskPolicyError || e instanceof EntityEditPolicyError) {
                // An expected refusal, not a failure: the sender is told, and the command is neither applied nor
                // broadcast. It is logged so that attempts to go beyond one's rights can be seen.
                console.warn(`[${new Date().toISOString()}] Refused a map edit: ${e.message}`);
            } else {
                console.error(e);
                Sentry.captureException(e);
            }
            callback(null, {
                id: call.request.editMapCommandMessage?.id ?? "Unknown id command error",
                editMapMessage: {
                    message: {
                        $case: "errorCommandMessage",
                        errorCommandMessage: {
                            reason: getMessageFromError(e),
                        },
                    },
                },
            });
        });
    },
};

/**
 * Throws unless the user is allowed to modify or delete the given custom entity.
 *
 * The thrown error is turned into an errorCommandMessage that is sent back to the sender only, and
 * the command is neither applied nor broadcast.
 */
async function assertUserCanEditCustomEntity(
    mapUrl: URL,
    entityId: string,
    userUUID: string,
    userCanEdit: boolean,
    action: "modify" | "delete",
): Promise<void> {
    if (userCanEdit) {
        // Short-circuit so that we do not read the collection file for users who are allowed anyway.
        return;
    }
    const entity = await new CustomEntityCollectionService(mapUrl.hostname).getEntity(entityId);
    if (!canUserEditCustomEntity(entity, userUUID, userCanEdit)) {
        throw new Error(
            `User ${userUUID} is not allowed to ${action} the custom entity ${entityId} on map ${mapUrl.toString()}: only its creator or a user with map edit rights can.`,
        );
    }
}

/** Parses a request, with an error message people can read (a ZodError message is a JSON dump of its issues). */
function parseRequest<Output, Input>(schema: z.ZodType<Output, z.ZodTypeDef, Input>, value: unknown): Output {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw new Error(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    return result.data;
}

function getMessageFromError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === "string") {
        return error;
    } else {
        return "Unknown error";
    }
}

export { mapStorageServer };
