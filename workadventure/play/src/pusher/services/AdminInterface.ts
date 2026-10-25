import type {
    CalendarEventsData,
    ErrorApiData,
    IceServer,
    MapDetailsData,
    MemberData,
    OauthRefreshToken,
    PresenceActivityData,
    PresenceReportData,
    RoomRedirect,
    Capabilities,
} from "@workadventure/messages";
import type { FetchMemberDataByUuidResponse } from "./AdminApi";
import type { ShortMapDescriptionList } from "./ShortMapDescription";
import type { WorldChatMembersData } from "./WorldChatMembersData";

export interface AdminInterface {
    /**
     * @var playUri is url of the room
     * @var userIdentifier can to be undefined or email or uuid
     * @var ipAddress
     * @var characterTextures
     * @return MapDetailsData|RoomRedirect
     */
    fetchMemberDataByUuid(
        userIdentifier: string,
        accessToken: string | undefined,
        playUri: string,
        ipAddress: string,
        characterTextureIds: string[],
        companionTextureId?: string,
        locale?: string,
        tags?: string[],
        chatID?: string,
        backofficeSession?: boolean,
    ): Promise<FetchMemberDataByUuidResponse>;

    /**
     * @var playUri is url of the room
     * @var userId can to be undefined or email or uuid
     * @return MapDetailsData|RoomRedirect
     */
    fetchMapDetails(
        playUri: string,
        authToken?: string,
        locale?: string,
    ): Promise<MapDetailsData | RoomRedirect | ErrorApiData>;

    /**
     * @var host Request hostname
     * @return string
     */
    fetchWellKnownChallenge(host: string): Promise<string>;

    /**
     * @param locale
     * @param reportedUserUuid
     * @param reportedUserComment
     * @param reporterUserUuid
     * @param roomUrl
     */
    reportPlayer(
        reportedUserUuid: string,
        reportedUserComment: string,
        reporterUserUuid: string,
        roomUrl: string,
        locale?: string,
    ): Promise<unknown>;

    /**
     * @param locale
     * @param roomUrl
     * @param tags
     * @param bypassTagFilter
     * @return string[]
     */
    getUrlRoomsFromSameWorld(
        roomUrl: string,
        locale?: string,
        tags?: string[],
        bypassTagFilter?: boolean,
    ): Promise<ShortMapDescriptionList>;

    /**
     * Renames a room of a world, for an administrator of that world. The admin checks the permission again.
     */
    renameRoom(roomUrl: string, userIdentifier: string, name: string): Promise<void>;

    /**
     * @param accessToken
     * @param playUri
     * @return string
     */
    getProfileUrl(accessToken: string, playUri: string): string;

    /**
     * @param token
     */
    logoutOauth(token: string): Promise<void>;

    /**
     * @param ipAddress the IP the user connects from, to ban it too; undefined to ban their account only
     */
    banUserByUuid(
        uuidToBan: string,
        playUri: string,
        name: string,
        message: string,
        byUserUuid: string,
        ipAddress: string | undefined,
    ): Promise<void>;

    getTagsList(roomUrl: string): Promise<string[]>;

    /**
     * Saves the name of the user in the (admin) database
     */
    saveName(userIdentifier: string, name: string, roomUrl: string): Promise<void>;

    saveTextures(userIdentifier: string, textures: string[], roomUrl: string): Promise<void>;

    saveCompanionTexture(userIdentifier: string, texture: string | null, roomUrl: string): Promise<void>;

    getCapabilities(): Promise<Capabilities>;

    searchMembers(roomUrl: string, searchText: string): Promise<MemberData[]>;

    searchTags(world: string, searchText: string): Promise<string[]>;

    getMember(memberUUID: string): Promise<MemberData>;

    /**
     * The upcoming events of the calendar the user connected in the admin back office, or undefined when the admin
     * offers no calendars (capability "api/calendar/events").
     */
    fetchCalendarEvents(
        userIdentifier: string,
        playUri: string,
        from: string,
        to: string,
    ): Promise<CalendarEventsData | undefined>;

    /**
     * What the user chose to share of their activity in the admin back office, or undefined when the admin offers no
     * shared activity (capability "api/presence/activity").
     */
    fetchPresenceActivity(userIdentifier: string, playUri: string): Promise<PresenceActivityData | undefined>;

    /**
     * Tells the admin who is connected to this pusher (capability "api/presence/report"). Resolves false when the admin
     * does not want these reports.
     */
    reportPresence(report: PresenceReportData): Promise<boolean>;

    getWorldChatMembers(playUri: string, searchText: string): Promise<WorldChatMembersData>;

    updateChatId(userIdentifier: string, chatId: string, roomUrl: string): Promise<void>;

    refreshOauthToken(token: string, provider?: string, userIdentifier?: string): Promise<OauthRefreshToken>;

    getIceServers(userId: number, userIdentifier: string, roomUrl: string): Promise<IceServer[]>;
}
