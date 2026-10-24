/**
 * Client of the admin endpoints WorkAdventure's pusher exposes (play/src/pusher/controllers/AdminController.ts
 * and the /ws/admin/rooms websocket in IoSocketController.ts). Both sides share ADMIN_API_TOKEN, and
 * ADMIN_SOCKETS_TOKEN for the websocket.
 */
import { SignJWT } from "jose";
import { z } from "zod";
import { config } from "../config";
import { pusherBaseUrl } from "./instance";

const TIMEOUT_MS = 5_000;
const ROOMS_CACHE_MS = 10_000;

/** Why the pusher could not be used; pages translate it (the message is for logs only, in English). */
export type PusherProblem = "notConfigured" | "unreachable" | "timeout" | "http" | "invalidAnswer";

export class PusherUnavailableError extends Error {
    constructor(
        message: string,
        readonly reason: PusherProblem = "unreachable",
        readonly httpStatus?: number,
    ) {
        super(message);
        this.name = "PusherUnavailableError";
    }
}

function isTimeout(error: unknown): boolean {
    return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
    const base = await pusherBaseUrl();
    if (!base) throw new PusherUnavailableError("WorkAdventure's play URL is not configured", "notConfigured");
    let response: Response;
    try {
        response = await fetch(`${base}${path}`, {
            ...init,
            headers: {
                authorization: config().ADMIN_API_TOKEN,
                "content-type": "application/json",
                ...(init.headers ?? {}),
            },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        throw new PusherUnavailableError(
            `Pusher unreachable at ${base}: ${String(error)}`,
            isTimeout(error) ? "timeout" : "unreachable",
        );
    }
    if (!response.ok) {
        throw new PusherUnavailableError(`Pusher answered ${response.status} on ${path}`, "http", response.status);
    }
    return response;
}

let roomsCache: { at: number; value: Record<string, number> } | undefined;

/** Number of people in each room currently open on WorkAdventure, keyed by full room URL. */
export async function fetchRoomOccupancy(maxAgeMs = ROOMS_CACHE_MS): Promise<Record<string, number>> {
    if (roomsCache && Date.now() - roomsCache.at < maxAgeMs) return roomsCache.value;
    const response = await call("/rooms");
    // A malformed or unexpected answer is an upstream failure like any other: callers show
    // "WorkAdventure could not be reached" for PusherUnavailableError, and must not crash.
    let value: Record<string, number>;
    try {
        value = z.record(z.number()).parse(await response.json());
    } catch (error) {
        throw new PusherUnavailableError(
            `Pusher answered /rooms with an unexpected body: ${String(error).slice(0, 200)}`,
            "invalidAnswer",
        );
    }
    roomsCache = { at: Date.now(), value };
    return value;
}

/** People currently in the world whose room URLs start with worldUrl, per room. */
export async function worldOccupancy(worldUrl: string): Promise<{ total: number; rooms: Record<string, number> }> {
    const all = await fetchRoomOccupancy();
    const rooms: Record<string, number> = {};
    let total = 0;
    for (const [roomUrl, count] of Object.entries(all)) {
        if (roomUrl.startsWith(worldUrl)) {
            rooms[roomUrl] = count;
            total += count;
        }
    }
    return { total, rooms };
}

/** Shows a message to everyone in the given rooms (full room URLs). */
export async function broadcastMessage(roomUrls: string[], text: string): Promise<void> {
    await call("/message", { method: "POST", body: JSON.stringify({ text, type: "message", targets: roomUrls }) });
}

/** Asks everyone in a room to reload it (e.g. after its map changed). */
export async function refreshRoom(roomUrl: string): Promise<void> {
    await call("/room/refresh", { method: "POST", body: JSON.stringify({ roomId: roomUrl }) });
}

/** Sends a scripting API event to every room of the instance. */
export async function dispatchGlobalEvent(name: string, data: unknown): Promise<void> {
    await call("/global/event", { method: "POST", body: JSON.stringify({ name, data }) });
}

export function adminSocketEnabled(): boolean {
    return Boolean(config().ADMIN_SOCKETS_TOKEN);
}

/** JWT for the pusher's admin websocket, listing the room URLs the holder may listen to (HS256). */
export async function adminSocketToken(authorizedRoomIds: string[]): Promise<string> {
    const secret = config().ADMIN_SOCKETS_TOKEN;
    if (!secret) throw new PusherUnavailableError("ADMIN_SOCKETS_TOKEN is not configured", "notConfigured");
    return new SignJWT({ authorizedRoomIds })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(secret));
}

export async function adminSocketUrl(): Promise<string> {
    const base = await pusherBaseUrl();
    if (!base) throw new PusherUnavailableError("WorkAdventure's play URL is not configured", "notConfigured");
    return `${base.replace(/^http/, "ws")}/ws/admin/rooms`;
}
