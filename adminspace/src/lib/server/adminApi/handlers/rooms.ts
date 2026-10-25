/**
 * GET /api/map, GET /api/room/access, GET /api/room/sameWorld, GET /api/room/tags.
 */
import path from "node:path";
import type { FetchMemberDataByUuidSuccessResponse } from "../../../contract/adminApi";
import { readWorldSettings, type WorldSettings } from "../../../settings/worldSettings";
import { json } from "../../http/problem";
import { getInstanceSettings } from "../../services/instance";
import { findMember, looksLikeEmail, memberTagNames, recordVisit, worldTagNames } from "../../services/members";
import { accountDisplayName, hasActiveAccount, isWorldPerson } from "../../services/directory";
import { findActiveBan } from "../../services/moderation";
import { verifiedHosts } from "../../services/domains";
import { fetchRoomOccupancy } from "../../services/pusher";
import { httpUrlOrUndefined, isHttpUrl } from "../../http/forms";
import { resolveCompanionTexture, resolveWokaTextures } from "../../services/textures";
import {
    findEntryRoom,
    listRooms,
    resolvePlayUri,
    resolveWorldOfPlayUri,
    worldState,
    type Room,
    type WorldContext,
} from "../../services/worlds";
import { bannedData, errorData, redirectData, unauthorizedData, worldFullData } from "../../workadventure/errors";
import { buildRoomUrl, buildWorldUrl, trimSlash, type ParsedPlayUri } from "../../workadventure/playUri";
import { buildMapDetails } from "../mapDetails";
import { emitOrgEventSafely } from "../../integrations/events";
import { query, queryList, type ApiContext } from "../router";

const DEFAULT_EDITOR_TAGS = ["admin", "editor"];
const DEFAULT_RECORDING_TAGS = ["admin"];
/** WorkAdventure gives in-game administration rights (ban, global messages) to the "admin" tag. */
export const ADMIN_TAG = "admin";

function intersects(a: readonly string[], b: readonly string[]): boolean {
    return a.some((value) => b.includes(value));
}

async function originOf(parsed: ParsedPlayUri): Promise<string> {
    if (parsed.origin) return parsed.origin;
    const { playUrl } = await getInstanceSettings();
    return playUrl ? new URL(playUrl).origin : "";
}

// ---------------------------------------------------------------------------------------------
// GET /api/map
// ---------------------------------------------------------------------------------------------

export async function getMap({ url, locale }: ApiContext): Promise<Response> {
    const playUri = query(url, "playUri");
    const resolved = await resolvePlayUri(playUri);

    if (resolved.kind === "other") {
        const parsed = resolved.parsed;
        const instance = await getInstanceSettings();
        if (parsed.kind === "root") {
            const base = parsed.origin || instance.playUrl;
            if (!instance.startRoomUrl || !base) return json(errorData("invalidUrl", locale));
            return json({ redirectUrl: new URL(instance.startRoomUrl, base).toString() });
        }
        if (parsed.kind === "mapStorage") {
            if (path.extname(parsed.path) === ".tmj") {
                return json({ redirectUrl: playUri.replace(/\.tmj(\?|$)/, ".wam$1") });
            }
            if (!instance.mapStoragePublicUrl) return json(errorData("invalidUrl", locale));
            return json({
                wamUrl: `${trimSlash(instance.mapStoragePublicUrl)}/${parsed.path}`,
                group: "default",
                editable: true,
                canReport: false,
                authenticationMandatory: true,
                contactPage: null,
                showPoweredBy: true,
            });
        }
        if (parsed.kind === "global") {
            return json({
                mapUrl: parsed.mapUrl,
                group: null,
                canReport: false,
                authenticationMandatory: true,
                contactPage: null,
                showPoweredBy: true,
            });
        }
        return json(errorData("invalidUrl", locale));
    }

    if (resolved.kind === "worldNotFound") return json(errorData("worldNotFound", locale));

    const { context } = resolved;
    if (context.organization.status === "suspended") return json(errorData("organizationSuspended", locale));
    const state = worldState(context.world);
    if (state === "archived") return json(errorData("worldArchived", locale));
    if (state === "expired") return json(errorData("worldExpired", locale));

    if (resolved.kind === "worldWithoutRoom") {
        const entry = await findEntryRoom(context.world.id);
        if (!entry) return json(errorData("roomNotFound", locale));
        const origin = await originOf(resolved.parsed);
        return json({
            redirectUrl: buildRoomUrl(origin, context.organization.slug, context.world.slug, entry.slug),
        });
    }
    if (resolved.kind === "roomNotFound") return json(errorData("roomNotFound", locale));
    // A room created from a template has no map until map-storage confirmed the upload.
    if (resolved.room.mapKind === "wam" && !resolved.room.wamUrl) return json(errorData("roomPreparing", locale));

    return json(
        buildMapDetails({
            organization: context.organization,
            world: context.world,
            room: resolved.room,
            settings: readWorldSettings(context.world.settings),
        }),
    );
}

// ---------------------------------------------------------------------------------------------
// GET /api/room/access
// ---------------------------------------------------------------------------------------------

export function canEditMap(settings: WorldSettings, room: Room, tags: string[], isMember: boolean): boolean {
    if (room.mapKind !== "wam") return false;
    const policy = settings.permissions?.mapEditor ?? "tagged";
    switch (policy) {
        case "everyone":
            return true;
        case "members":
            return isMember;
        case "tagged":
            return intersects(tags, settings.permissions?.mapEditorTags ?? DEFAULT_EDITOR_TAGS);
        case "nobody":
            return false;
    }
}

export function canRecord(settings: WorldSettings, tags: string[], isLogged: boolean): boolean {
    const policy = settings.permissions?.recording ?? "disabled";
    switch (policy) {
        case "disabled":
            return false;
        case "authenticated":
            return isLogged;
        case "tagged":
            return intersects(tags, settings.permissions?.recordingTags ?? DEFAULT_RECORDING_TAGS);
    }
}

/**
 * A person seen in the world this recently is moving between rooms or reconnecting: they are already
 * counted in the occupancy, so they must not be refused because of themselves.
 */
export const CAPACITY_GRACE_MS = 5 * 60_000;

/**
 * Capacity rule. The pusher only reports counts per room, not who is connected, so a person seen in the
 * world within CAPACITY_GRACE_MS is let in even at capacity (they are most likely already counted).
 */
export function capacityAllows(input: {
    maxUsers: number;
    online: number;
    lastSeenAt: Date | null | undefined;
    now?: Date;
}): boolean {
    if (input.maxUsers <= 0 || input.online < input.maxUsers) return true;
    const now = input.now ?? new Date();
    return input.lastSeenAt !== null && input.lastSeenAt !== undefined
        ? now.getTime() - input.lastSeenAt.getTime() < CAPACITY_GRACE_MS
        : false;
}

/**
 * People online in the world, counting its rooms on every origin it is served on (the origin of the
 * request, the play URL, the organization's verified custom domains). Undefined when the pusher cannot
 * be asked: capacity then fails open (people get in), as documented.
 */
async function worldOnlineCount(context: WorldContext, requestOrigin: string): Promise<number | undefined> {
    const { playUrl } = await getInstanceSettings();
    const origins = new Set<string>([requestOrigin]);
    if (playUrl) origins.add(new URL(playUrl).origin);
    for (const host of await verifiedHosts(context.organization.id)) {
        origins.add(`https://${host}`);
        origins.add(`http://${host}`);
    }
    const prefixes = [...origins]
        .filter((o) => o.length > 0)
        .map((o) => buildWorldUrl(o, context.organization.slug, context.world.slug));
    try {
        const occupancy = await fetchRoomOccupancy();
        let total = 0;
        for (const [roomUrl, count] of Object.entries(occupancy)) {
            if (prefixes.some((prefix) => roomUrl.startsWith(prefix))) total += count;
        }
        return total;
    } catch {
        return undefined;
    }
}

export async function getRoomAccess({ url, locale }: ApiContext): Promise<Response> {
    const playUri = query(url, "playUri");
    const userIdentifier = query(url, "userIdentifier");
    const ipAddress = query(url, "ipAddress") || undefined;
    const accessToken = query(url, "accessToken");
    const isLogged = accessToken.length > 0 || query(url, "isLogged") === "1";
    const characterTextureIds = queryList(url, "characterTextureIds");
    const companionTextureId = query(url, "companionTextureId");
    const chatID = query(url, "chatID") || undefined;

    const characterTextures = await resolveWokaTextures(characterTextureIds);
    const companionTexture = companionTextureId ? await resolveCompanionTexture(companionTextureId) : undefined;
    const textures = {
        isCharacterTexturesValid: characterTextures !== undefined,
        characterTextures: characterTextures ?? [],
        isCompanionTextureValid: !companionTextureId || companionTexture !== undefined,
        companionTexture: companionTexture ?? null,
    };

    const resolved = await resolvePlayUri(playUri);

    // Rooms outside of any world (/~/ map-storage, /_/ global maps): for the people who have an account here, signed in.
    if (resolved.kind === "other") {
        if (resolved.parsed.kind === "invalid" || resolved.parsed.kind === "root") {
            return json(errorData("invalidUrl", locale));
        }
        if (!isLogged) return json(redirectData("/login"));
        if (!looksLikeEmail(userIdentifier) || !(await hasActiveAccount(userIdentifier))) {
            return json(unauthorizedData("membersOnly", locale));
        }
        const instance = await getInstanceSettings();
        const editors = (instance.globalMapEditors ?? []).map((e) => e.toLowerCase());
        const body: FetchMemberDataByUuidSuccessResponse = {
            status: "ok",
            email: isLogged ? userIdentifier : null,
            userUuid: userIdentifier,
            tags: [],
            visitCardUrl: null,
            ...textures,
            world: resolved.parsed.origin,
            canEdit: resolved.parsed.kind === "mapStorage" && editors.includes(userIdentifier.toLowerCase()),
            activatedInviteUser: true,
            canRecord: false,
            analyticsEventsEnabled: false,
        };
        return json(body);
    }

    if (resolved.kind === "worldNotFound") return json(errorData("worldNotFound", locale));
    const { context } = resolved;
    if (context.organization.status === "suspended") return json(errorData("organizationSuspended", locale));
    const state = worldState(context.world);
    if (state === "archived") return json(errorData("worldArchived", locale));
    if (state === "expired") return json(errorData("worldExpired", locale));

    let room: Room | undefined = resolved.kind === "room" ? resolved.room : undefined;
    if (resolved.kind === "worldWithoutRoom") room = await findEntryRoom(context.world.id);
    if (!room) return json(errorData("roomNotFound", locale));

    const settings = readWorldSettings(context.world.settings);
    const existing = await findMember(context.world.id, userIdentifier);

    const ban = await findActiveBan(
        context.world.id,
        [userIdentifier, existing?.uuid ?? "", existing?.email ?? ""],
        ipAddress,
    );
    if (ban) return json(bannedData(ban.reason, locale));

    if (context.world.accessPolicy === "authenticated" && !isLogged) {
        return json(redirectData("/login"));
    }
    // People of the organization (active account and membership, staff role or a role in the world's
    // workspace) are members of its worlds, matched on the email WorkAdventure's login provides.
    const isPerson =
        isLogged && looksLikeEmail(userIdentifier) ? await isWorldPerson(context.world, userIdentifier) : false;
    if (context.world.accessPolicy === "members" && existing?.kind !== "member" && !isPerson) {
        return json(unauthorizedData("membersOnly", locale));
    }

    const existingTags = existing ? await memberTagNames(existing.id) : [];
    const isWorldAdmin = existingTags.includes(ADMIN_TAG);
    if (room.requiredTags.length > 0 && !isWorldAdmin && !intersects(existingTags, room.requiredTags)) {
        return json(unauthorizedData("tagRequired", locale));
    }

    const origin = await originOf(resolved.parsed);
    if (!isWorldAdmin && context.world.maxUsers > 0) {
        const online = await worldOnlineCount(context, origin);
        if (
            online !== undefined &&
            !capacityAllows({ maxUsers: context.world.maxUsers, online, lastSeenAt: existing?.lastSeenAt })
        ) {
            return json(worldFullData(locale));
        }
    }

    const member = await recordVisit(context.world.id, userIdentifier, {
        locale,
        chatId: chatID,
        characterTextureIds,
        companionTextureId: companionTextureId || undefined,
    });
    // Integration Center: the first visit of a signed-in person (anonymous visitors never produce an event). Never
    // throws: a notification problem must not keep anybody out of the office.
    if (member?.firstVisit && isLogged && member.email) {
        await emitOrgEventSafely(context.organization.id, "member.joined", {
            person: { id: member.id, name: member.name, email: member.email },
            world: {
                id: context.world.id,
                slug: context.world.slug,
                name: context.world.name,
                url:
                    buildWorldUrl(await originOf(resolved.parsed), context.organization.slug, context.world.slug) ||
                    null,
            },
        });
    }
    const tags = member ? await memberTagNames(member.id) : existingTags;
    const isMember = member?.kind === "member" || isPerson;

    const body: FetchMemberDataByUuidSuccessResponse = {
        status: "ok",
        email: member?.email ?? (isLogged ? userIdentifier : null),
        // The name chosen in the office is kept; until one is chosen, the account's name, so nobody types it again.
        username:
            member?.name ||
            (isLogged && looksLikeEmail(userIdentifier) ? await accountDisplayName(userIdentifier) : undefined) ||
            null,
        userUuid: member?.uuid ?? userIdentifier,
        tags,
        visitCardUrl: httpUrlOrUndefined(member?.visitCardUrl) ?? null,
        ...textures,
        world: buildWorldUrl(origin, context.organization.slug, context.world.slug),
        canEdit: canEditMap(settings, room, tags, isMember),
        canRecord: canRecord(settings, tags, isLogged),
        activatedInviteUser: settings.features?.inviteButton ?? true,
        applications: settings.applications ?? [],
        analyticsEventsEnabled: settings.privacy?.analytics ?? false,
        ...(member?.chatId ? { chatID: member.chatId } : {}),
    };
    return json(body);
}

// ---------------------------------------------------------------------------------------------
// GET /api/room/sameWorld and GET /api/room/tags
// ---------------------------------------------------------------------------------------------

export async function getSameWorldRooms({ url, locale }: ApiContext): Promise<Response> {
    const roomUrl = query(url, "roomUrl");
    const bypassTagFilter = query(url, "bypassTagFilter") === "true";
    const tags = queryList(url, "tags");
    const resolved = await resolvePlayUri(roomUrl);
    if (resolved.kind === "other" || resolved.kind === "worldNotFound") {
        return json(errorData("worldNotFound", locale), { status: 404 });
    }
    const { context } = resolved;
    const origin = await originOf(resolved.parsed);
    const rooms = await listRooms(context.world.id);
    return json(
        rooms
            .filter((room) => bypassTagFilter || room.requiredTags.length === 0 || intersects(tags, room.requiredTags))
            .map((room) => ({
                name: room.name,
                roomUrl: buildRoomUrl(origin, context.organization.slug, context.world.slug, room.slug),
                ...(room.mapKind === "wam" && isHttpUrl(room.wamUrl) ? { wamUrl: room.wamUrl } : {}),
                ...(room.description ? { description: room.description } : {}),
                ...(isHttpUrl(room.thumbnailUrl) ? { thumbnail: room.thumbnailUrl } : {}),
            })),
    );
}

export async function getRoomTags({ url }: ApiContext): Promise<Response> {
    const context = await resolveWorldOfPlayUri(query(url, "roomUrl"));
    return json(context ? await worldTagNames(context.world.id) : []);
}
