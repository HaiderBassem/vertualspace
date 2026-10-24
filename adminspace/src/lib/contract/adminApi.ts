/**
 * Admin API response shapes that WorkAdventure defines outside of libs/messages, mirrored here.
 * Sources (WorkAdventure repository):
 * - play/src/pusher/services/AdminApi.ts               (isFetchMemberDataByUuidSuccessResponse)
 * - play/src/pusher/services/WorldChatMembersData.ts    (WorldChatMembersData)
 * - play/src/pusher/services/IceServer.ts               (IceServer)
 * - play/src/pusher/services/ShortMapDescription.ts     (ShortMapDescription, metadata kept loose)
 * - back/src/Services/Repository/LivekitCredentialsResponse.ts
 * - play/src/room-api/authentication/AdminAuthenticator.ts
 * - play/src/pusher/models/Websocket/Admin/AdminMessages.ts (admin websocket)
 *
 * tests/contract.test.ts checks these against the WorkAdventure checkout when it is available.
 */
import { z } from "zod";
import { CompanionDetail, ErrorApiData, isApplicationDefinitionInterface, WokaDetail } from "./workadventure";

export const FetchMemberDataByUuidSuccessResponse = z.object({
    status: z.literal("ok"),
    email: z.string().nullable(),
    username: z.string().nullable().optional(),
    userUuid: z.string(),
    tags: z.array(z.string()),
    visitCardUrl: z.string().nullable(),
    isCharacterTexturesValid: z.boolean(),
    characterTextures: z.array(WokaDetail),
    isCompanionTextureValid: z.boolean(),
    companionTexture: CompanionDetail.nullable().optional(),
    userRoomToken: z.string().optional(),
    activatedInviteUser: z.boolean().nullable().optional(),
    applications: z.array(isApplicationDefinitionInterface).nullable().optional(),
    canEdit: z.boolean().nullable().optional(),
    world: z.string(),
    chatID: z.string().optional(),
    canRecord: z.boolean().optional(),
    analyticsEventsEnabled: z.boolean().optional(),
});
export type FetchMemberDataByUuidSuccessResponse = z.infer<typeof FetchMemberDataByUuidSuccessResponse>;

export const FetchMemberDataByUuidResponse = z.union([FetchMemberDataByUuidSuccessResponse, ErrorApiData]);
export type FetchMemberDataByUuidResponse = z.infer<typeof FetchMemberDataByUuidResponse>;

const ChatMemberData = z.object({
    uuid: z.string(),
    wokaName: z.string().optional(),
    email: z.string().nullable(),
    chatId: z.string().optional(),
    tags: z.string().array(),
});

export const WorldChatMembersData = z.object({
    total: z.number().min(0),
    members: z.array(ChatMemberData),
});
export type WorldChatMembersData = z.infer<typeof WorldChatMembersData>;

export const IceServer = z.object({
    urls: z.string().array(),
    username: z.string().optional(),
    credential: z.string().optional(),
    credentialType: z.enum(["password", "oauth"]).optional(),
});
export type IceServer = z.infer<typeof IceServer>;

/** WorkAdventure merges WAMMetadata (name, description, copyright, thumbnail, tags...) into each entry. */
export const ShortMapDescription = z
    .object({
        name: z.string(),
        roomUrl: z.string(),
        wamUrl: z.string().optional(),
    })
    .passthrough();
export const ShortMapDescriptionList = z.array(ShortMapDescription);
export type ShortMapDescription = z.infer<typeof ShortMapDescription>;

export const LivekitCredentialsResponse = z.object({
    livekitHost: z.string(),
    livekitApiKey: z.string(),
    livekitApiSecret: z.string(),
});
export type LivekitCredentialsResponse = z.infer<typeof LivekitCredentialsResponse>;

export const RoomApiAuthorizationResponse = z.union([
    z.object({ success: z.literal(true) }),
    z.object({
        success: z.literal(false),
        error: z.enum(["UNAUTHENTICATED", "NOT_FOUND", "PERMISSION_DENIED", "INTERNAL", "UNKNOWN"]),
        message: z.string(),
    }),
]);
export type RoomApiAuthorizationResponse = z.infer<typeof RoomApiAuthorizationResponse>;

/** Body of POST /api/recordings/events, sent by the back when a LiveKit egress ends. */
export const RecordingEventPayload = z.object({
    phase: z.literal("ended"),
    status: z.string(),
    egressId: z.string(),
    recordingSessionId: z.string(),
    playUri: z.string(),
    recorder: z.object({ uuid: z.string(), spaceUserId: z.string() }),
    startedAt: z.string().datetime().nullable().optional(),
    endedAt: z.string().datetime().nullable().optional(),
    error: z.string().nullable().optional(),
    files: z.array(z.object({ filename: z.string(), sizeBytes: z.number(), durationSeconds: z.number() })),
});
export type RecordingEventPayload = z.infer<typeof RecordingEventPayload>;

/** Messages sent by the pusher on its admin websocket (/ws/admin/rooms). */
export const AdminSocketServerMessage = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("MemberJoin"),
        data: z.object({ uuid: z.string(), name: z.string(), ipAddress: z.string(), roomId: z.string() }),
    }),
    z.object({ type: z.literal("MemberLeave"), data: z.object({ uuid: z.string() }) }),
    z.object({ type: z.literal("Error"), data: z.object({ message: z.string() }) }),
]);
export type AdminSocketServerMessage = z.infer<typeof AdminSocketServerMessage>;
