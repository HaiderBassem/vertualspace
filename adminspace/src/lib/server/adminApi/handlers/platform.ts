/**
 * Instance-level endpoints:
 * GET /api/capabilities, GET /api/ice-servers, GET /api/livekit/credentials, GET /api/domain/verify,
 * GET /white-label/cf-challenge, GET /api/room-api/authorization, POST /api/recordings/events,
 * POST /api/analytics/events-batch, GET /oauth/logout, POST /api/oauth/refreshtoken.
 */
import { eq, sql } from "drizzle-orm";
import type { Capabilities } from "../../../contract/workadventure";
import { analyticsEventsBatch } from "../../../contract/workadventure";
import {
    RecordingEventPayload,
    type LivekitCredentialsResponse,
    type RoomApiAuthorizationResponse,
} from "../../../contract/adminApi";
import { readWorldSettings } from "../../../settings/worldSettings";
import { pseudonymize, sha256Hex } from "../../crypto";
import { db, schema } from "../../db/client";
import { json, noContent } from "../../http/problem";
import { isVerifiedHost } from "../../services/domains";
import { getInstanceSettings } from "../../services/instance";
import { openSecret } from "../../services/secrets";
import { resolveWorldOfPlayUri, type WorldContext } from "../../services/worlds";
import { personalCapabilityAvailable } from "../../integrations/registry";
import { query, readJson, type ApiContext } from "../router";

// ---------------------------------------------------------------------------------------------
// Capabilities, ICE servers, LiveKit
// ---------------------------------------------------------------------------------------------

/**
 * WorkAdventure reads capabilities once, at startup: restart play and back after configuring ICE
 * servers or LiveKit here.
 */
export async function getCapabilities(_: ApiContext): Promise<Response> {
    const instance = await getInstanceSettings();
    const capabilities: Capabilities = {
        "api/woka/list": "v1",
        "api/companion/list": "v1",
        "api/save-name": "v1",
        "api/save-textures": "v1",
        "api/domain/verify": "v1",
        "api/ban": "v1",
        "api/recordings/events": "v1",
        "api/analytics/events-batch": "v1",
        // "Who's in" (docs/PRESENCE.md): needs nothing configured, the pushers report to this server.
        "api/presence/report": "v1",
    };
    if (instance.iceServers && instance.iceServers.length > 0) {
        capabilities["api/ice-servers"] = "v1";
    }
    if (resolveLivekitCredentials(undefined, instance)) {
        capabilities["api/livekit/credentials"] = "v1";
    }
    // Advertised once people can connect a calendar (Google or Microsoft) or a music/code account on this server.
    if (personalCapabilityAvailable("calendar")) {
        capabilities["api/calendar/events"] = "v1";
    }
    if (personalCapabilityAvailable("music") || personalCapabilityAvailable("activity")) {
        capabilities["api/presence/activity"] = "v1";
    }
    return json(capabilities);
}

export async function getIceServers(_: ApiContext): Promise<Response> {
    const instance = await getInstanceSettings();
    return json(instance.iceServers ?? []);
}

interface LivekitSource {
    livekitHost?: string | undefined;
    livekitApiKey?: string | undefined;
    livekitApiSecret?: string | undefined;
}

/**
 * LiveKit credentials for a world: the world's own server when it sets host, key AND secret, else the
 * instance's as a whole. Fields are never mixed: a world setting only a host must not get tokens
 * signed with the instance key for a server it controls. Secrets are stored sealed.
 */
export function resolveLivekitCredentials(
    world: LivekitSource | undefined,
    instance: LivekitSource,
): LivekitCredentialsResponse | undefined {
    for (const source of [world, instance]) {
        const secret = openSecret(source?.livekitApiSecret);
        if (source?.livekitHost && source.livekitApiKey && secret) {
            return { livekitHost: source.livekitHost, livekitApiKey: source.livekitApiKey, livekitApiSecret: secret };
        }
    }
    return undefined;
}

export async function getLivekitCredentials({ url }: ApiContext): Promise<Response> {
    const context = await resolveWorldOfPlayUri(query(url, "playUri"));
    const world = context ? readWorldSettings(context.world.settings).thirdParty : undefined;
    const credentials = resolveLivekitCredentials(world, await getInstanceSettings());
    if (!credentials) {
        return json({ status: "error", message: "LiveKit is not configured" }, { status: 404 });
    }
    return json(credentials);
}

// ---------------------------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------------------------

/** 204 when the domain of `uri` serves this WorkAdventure (play domain or a verified custom domain), else 403. */
export async function getDomainVerify({ url }: ApiContext): Promise<Response> {
    let host: string;
    try {
        host = new URL(query(url, "uri")).hostname.toLowerCase();
    } catch {
        return new Response(null, { status: 403 });
    }
    const instance = await getInstanceSettings();
    if (instance.playUrl && new URL(instance.playUrl).hostname.toLowerCase() === host) return noContent();
    if (await isVerifiedHost(host)) return noContent();
    if (!instance.playUrl) {
        // Fail closed: accepting every domain would let anyone redirect logins to their own site.
        console.warn(
            JSON.stringify({
                level: "warn",
                time: new Date().toISOString(),
                message: "Domain refused: WorkAdventure's play URL is not configured in the instance settings",
            }),
        );
    }
    return new Response(null, { status: 403 });
}

export async function getCloudflareChallenge({ url }: ApiContext): Promise<Response> {
    const host = query(url, "host").toLowerCase();
    const domain = await db().query.domains.findFirst({ where: sql`lower(${schema.domains.host}) = ${host}` });
    if (!domain?.challenge) return new Response("Not found", { status: 404 });
    return json(domain.challenge);
}

// ---------------------------------------------------------------------------------------------
// Room API keys
// ---------------------------------------------------------------------------------------------

function roomApiAnswer(answer: RoomApiAuthorizationResponse): Response {
    return json(answer);
}

export async function getRoomApiAuthorization({ request, url }: ApiContext): Promise<Response> {
    const apiKey = request.headers.get("x-api-key") ?? "";
    if (!apiKey) {
        return roomApiAnswer({ success: false, error: "UNAUTHENTICATED", message: "Missing API key" });
    }
    const key = await db().query.roomApiKeys.findFirst({ where: eq(schema.roomApiKeys.keyHash, sha256Hex(apiKey)) });
    const now = new Date();
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= now)) {
        return roomApiAnswer({ success: false, error: "UNAUTHENTICATED", message: "Invalid API key" });
    }
    let roomUrl = query(url, "roomUrl");
    try {
        roomUrl = decodeURI(roomUrl);
    } catch {
        // Keep the raw value.
    }
    const context = await resolveWorldOfPlayUri(roomUrl);
    if (!context) {
        return roomApiAnswer({ success: false, error: "NOT_FOUND", message: "Room not found" });
    }
    if (context.organization.id !== key.organizationId || (key.worldId && key.worldId !== context.world.id)) {
        return roomApiAnswer({
            success: false,
            error: "PERMISSION_DENIED",
            message: "This key cannot access this room",
        });
    }
    await db().update(schema.roomApiKeys).set({ lastUsedAt: now }).where(eq(schema.roomApiKeys.id, key.id));
    return roomApiAnswer({ success: true });
}

// ---------------------------------------------------------------------------------------------
// Recordings and analytics
// ---------------------------------------------------------------------------------------------

export async function postRecordingEvent({ request }: ApiContext): Promise<Response> {
    const payload = RecordingEventPayload.safeParse(await readJson(request));
    // A 4xx is final for the back (no retry): only answer it for payloads we will never accept.
    if (!payload.success) return json({ status: "error", message: "Invalid payload" }, { status: 400 });
    const event = payload.data;
    const context = await resolveWorldOfPlayUri(event.playUri);
    await db()
        .insert(schema.recordingEvents)
        .values({
            worldId: context?.world.id ?? null,
            egressId: event.egressId,
            status: event.status,
            playUri: event.playUri,
            recorderUuid: event.recorder.uuid,
            startedAt: event.startedAt ? new Date(event.startedAt) : null,
            endedAt: event.endedAt ? new Date(event.endedAt) : null,
            error: event.error ?? null,
            files: event.files,
        })
        .onConflictDoNothing();
    return json({ status: "ok" });
}

const MAX_CLOCK_SKEW_MS = 24 * 3_600_000;

export async function postAnalyticsBatch({ request }: ApiContext): Promise<Response> {
    const batch = analyticsEventsBatch.safeParse(await readJson(request));
    if (!batch.success) {
        return json({ status: "error", message: "Invalid batch" }, { status: 422 });
    }

    const worlds = new Map<string, WorldContext | undefined>();
    const rows: (typeof schema.analyticsEvents.$inferInsert)[] = [];
    let dropped = 0;
    for (const event of batch.data.events) {
        if (!worlds.has(event.world)) {
            worlds.set(event.world, await resolveWorldOfPlayUri(event.world));
        }
        const context = worlds.get(event.world);
        if (!context || !readWorldSettings(context.world.settings).privacy?.analytics) {
            dropped++;
            continue;
        }
        // The client clock is untrusted: clamp it against the time the pusher received the event.
        const received = new Date(event.pusherReceivedAt);
        const claimed = new Date(event.clientEventTime);
        const occurredAt =
            claimed > received || received.getTime() - claimed.getTime() > MAX_CLOCK_SKEW_MS ? received : claimed;
        rows.push({
            eventId: event.eventId,
            worldId: context.world.id,
            eventName: event.eventName,
            source: event.source,
            roomId: event.roomId,
            actorHash: pseudonymize(event.userUuid, "analytics"),
            occurredAt,
            properties: event.properties,
        });
    }
    if (rows.length > 0) {
        await db().insert(schema.analyticsEvents).values(rows).onConflictDoNothing();
    }
    return json({ status: "ok", accepted: rows.length, dropped });
}

// ---------------------------------------------------------------------------------------------
// OAuth (this admin is not an OpenID Connect provider: WorkAdventure handles OpenID itself)
// ---------------------------------------------------------------------------------------------

export async function getOauthLogout(_: ApiContext): Promise<Response> {
    return noContent();
}

export async function postOauthRefreshToken(_: ApiContext): Promise<Response> {
    return json(
        { status: "error", message: "Token refresh is handled by WorkAdventure's OpenID Connect provider" },
        { status: 501 },
    );
}
