/**
 * The WorkAdventure Admin API: every endpoint WorkAdventure's pusher (play) and back call when
 * ADMIN_API_URL points at this server. See docs/ADMIN_API.md for the contract of each one.
 */
import { createRouter, type ApiRoute } from "./router";
import {
    getCompanionList,
    getWokaList,
    postSaveCompanionTexture,
    postSaveName,
    postSaveTextures,
} from "./handlers/avatars";
import {
    getChatMembers,
    getMember,
    getMembers,
    getWorldTags,
    postBan,
    postReport,
    putMemberChatId,
} from "./handlers/people";
import {
    getCapabilities,
    getCloudflareChallenge,
    getDomainVerify,
    getIceServers,
    getLivekitCredentials,
    getOauthLogout,
    getRoomApiAuthorization,
    postAnalyticsBatch,
    postOauthRefreshToken,
    postRecordingEvent,
} from "./handlers/platform";
import { getMap, getRoomAccess, getRoomTags, getSameWorldRooms } from "./handlers/rooms";
import { getCalendarEvents, getPresenceActivity } from "./handlers/integrations";
import { postPresenceReport } from "./handlers/presence";
import { postRenameRoom } from "./handlers/roomRename";

export const ADMIN_API_ROUTES: ApiRoute[] = [
    // Called without the admin token by WorkAdventure.
    { method: "GET", path: "/api/capabilities", auth: "none", handler: getCapabilities },
    { method: "GET", path: "/api/room-api/authorization", auth: "none", handler: getRoomApiAuthorization },
    { method: "GET", path: "/oauth/logout", auth: "none", handler: getOauthLogout },
    { method: "GET", path: "/white-label/cf-challenge", auth: "none", handler: getCloudflareChallenge },

    // Rooms and access.
    { method: "GET", path: "/api/map", auth: "adminToken", handler: getMap },
    { method: "GET", path: "/api/room/access", auth: "adminToken", handler: getRoomAccess },
    { method: "GET", path: "/api/room/sameWorld", auth: "adminToken", handler: getSameWorldRooms },
    { method: "GET", path: "/api/room/tags", auth: "adminToken", handler: getRoomTags },
    { method: "POST", path: "/api/room/rename", auth: "adminToken", handler: postRenameRoom },

    // Avatars.
    { method: "GET", path: "/api/woka/list", auth: "adminToken", handler: getWokaList },
    { method: "GET", path: "/api/companion/list", auth: "adminToken", handler: getCompanionList },
    { method: "POST", path: "/api/save-name", auth: "adminToken", handler: postSaveName },
    { method: "POST", path: "/api/save-textures", auth: "adminToken", handler: postSaveTextures },
    { method: "POST", path: "/api/save-companion-texture", auth: "adminToken", handler: postSaveCompanionTexture },

    // People, chat, moderation.
    { method: "GET", path: "/api/members", auth: "adminToken", handler: getMembers },
    { method: "GET", path: "/api/members/:uuid", auth: "adminToken", handler: getMember },
    { method: "PUT", path: "/api/members/:uuid/chatId", auth: "adminToken", handler: putMemberChatId },
    { method: "GET", path: "/api/world/tags", auth: "adminToken", handler: getWorldTags },
    { method: "GET", path: "/api/chat/members", auth: "adminToken", handler: getChatMembers },
    { method: "POST", path: "/api/report", auth: "adminToken", handler: postReport },
    { method: "POST", path: "/api/ban", auth: "adminToken", handler: postBan },

    // Media, domains, events.
    { method: "GET", path: "/api/ice-servers", auth: "adminToken", handler: getIceServers },
    { method: "GET", path: "/api/livekit/credentials", auth: "adminToken", handler: getLivekitCredentials },
    { method: "GET", path: "/api/domain/verify", auth: "adminToken", handler: getDomainVerify },
    { method: "POST", path: "/api/recordings/events", auth: "adminToken", handler: postRecordingEvent },
    { method: "POST", path: "/api/analytics/events-batch", auth: "adminToken", handler: postAnalyticsBatch },
    { method: "POST", path: "/api/oauth/refreshtoken", auth: "adminToken", handler: postOauthRefreshToken },

    // Integration Center: what people share with the office (calendar, music, coding activity).
    { method: "GET", path: "/api/calendar/events", auth: "adminToken", handler: getCalendarEvents },
    { method: "GET", path: "/api/presence/activity", auth: "adminToken", handler: getPresenceActivity },

    // Who's in: each pusher reports who is connected to it right now (docs/PRESENCE.md).
    { method: "POST", path: "/api/presence/report", auth: "adminToken", handler: postPresenceReport },
];

export const dispatchAdminApi = createRouter(ADMIN_API_ROUTES);
