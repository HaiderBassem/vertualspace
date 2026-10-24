/**
 * Client of the pusher's admin websocket (/ws/admin/rooms, see play/src/pusher/controllers/IoSocketController.ts).
 * The pusher checks a HS256 JWT signed with ADMIN_SOCKETS_TOKEN listing the room URLs the holder may use.
 *
 * - "listen": the pusher streams MemberJoin / MemberLeave for the listed rooms.
 * - "banned": the pusher disconnects a person from the rooms of a world (matched on the world slug,
 *   the 6th segment of the room URLs) and shows them the ban message.
 */
import WebSocket from "ws";
import { AdminSocketServerMessage } from "../../contract/adminApi";
import { adminSocketEnabled, adminSocketToken, adminSocketUrl } from "./pusher";

const CONNECT_TIMEOUT_MS = 5_000;

async function connect(): Promise<WebSocket> {
    const socket = new WebSocket(await adminSocketUrl());
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.terminate();
            reject(new Error("Admin websocket connection timed out"));
        }, CONNECT_TIMEOUT_MS);
        socket.once("open", () => {
            clearTimeout(timer);
            resolve();
        });
        socket.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
    return socket;
}

/**
 * Listens to who joins and leaves the given rooms. Returns a function that closes the connection.
 * `onClose` is called once when the pusher closes the connection (not when the returned function is).
 */
export async function openAdminListener(
    roomIds: string[],
    onMessage: (message: AdminSocketServerMessage) => void,
    onClose: (reason: string) => void,
): Promise<() => void> {
    const socket = await connect();
    let closedByUs = false;
    socket.on("message", (raw) => {
        try {
            const parsed = AdminSocketServerMessage.safeParse(JSON.parse(raw.toString()));
            if (parsed.success) onMessage(parsed.data);
        } catch {
            // Ignore messages that are not JSON.
        }
    });
    socket.on("close", (_code, reason) => {
        if (!closedByUs) onClose(reason.toString() || "closed");
    });
    socket.on("error", () => {
        // A "close" event follows every error.
    });
    socket.send(JSON.stringify({ event: "listen", roomIds, jwt: await adminSocketToken(roomIds) }));
    return () => {
        closedByUs = true;
        socket.close();
    };
}

/**
 * Asks the pusher to disconnect a banned person from every room of a world right away.
 * The ban itself is always enforced at the person's next entry, through /api/room/access: the outcome
 * returned here only concerns the immediate disconnection.
 */
export type LiveActionStatus = "sent" | "notConfigured" | "unreachable" | "rejected" | "notApplicable";

export interface LiveActionResult {
    status: LiveActionStatus;
    /** Technical detail for logs and the audit trail (never shown as-is to people). */
    detail?: string;
}

/** How long to wait for the pusher to refuse a command (it answers errors only, never successes). */
export const ADMIN_SOCKET_REFUSAL_WINDOW_MS = 3_000;

/**
 * Sends one command on an admin websocket and waits for a refusal. The pusher answers an invalid JWT
 * or message with {type: "Error"} and closes the connection (codes 1007 / 1008); it sends nothing on
 * success. So: an error frame or a refusal close within `waitMs` is "rejected", a failed connection
 * "unreachable", and silence after a clean send "sent" (accepted for processing, not a delivery receipt).
 */
export async function sendAdminSocketCommand(
    url: string,
    payload: unknown,
    waitMs = ADMIN_SOCKET_REFUSAL_WINDOW_MS,
): Promise<LiveActionResult> {
    let socket: WebSocket;
    try {
        socket = new WebSocket(url);
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                socket.terminate();
                reject(new Error("connection timed out"));
            }, CONNECT_TIMEOUT_MS);
            socket.once("open", () => {
                clearTimeout(timer);
                resolve();
            });
            socket.once("error", (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    } catch (error) {
        return { status: "unreachable", detail: error instanceof Error ? error.message : String(error) };
    }

    return new Promise<LiveActionResult>((resolve) => {
        let settled = false;
        const finish = (result: LiveActionResult) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000);
            }
            resolve(result);
        };
        const timer = setTimeout(() => finish({ status: "sent" }), waitMs);
        socket.on("message", (raw) => {
            try {
                const parsed = AdminSocketServerMessage.safeParse(JSON.parse(raw.toString()));
                if (parsed.success && parsed.data.type === "Error") {
                    finish({ status: "rejected", detail: parsed.data.data.message.slice(0, 300) });
                }
            } catch {
                // Not JSON: ignore.
            }
        });
        socket.on("close", (code, reason) => {
            if (code === 1007 || code === 1008 || code === 1011) {
                finish({ status: "rejected", detail: `closed ${code} ${reason.toString()}`.trim() });
            } else {
                finish({ status: "sent" });
            }
        });
        socket.on("error", (error) => finish({ status: "unreachable", detail: error.message }));
        socket.send(JSON.stringify(payload), (error) => {
            if (error) finish({ status: "unreachable", detail: error.message });
        });
    });
}

/**
 * Asks the pusher to disconnect a banned person from every room of a world right away, and reports
 * what happened. WorkAdventure's admin socket disconnects people by user uuid only: bans of an IP
 * address alone are "notApplicable" here and enforced at the next connection.
 */
export async function kickBannedPerson(
    worldSlug: string,
    worldRoomUrls: string[],
    userUuid: string | null,
    message: string,
): Promise<LiveActionResult> {
    if (!userUuid) return { status: "notApplicable", detail: "IP-only ban" };
    if (!adminSocketEnabled()) return { status: "notConfigured", detail: "ADMIN_SOCKETS_TOKEN is not set" };
    if (worldRoomUrls.length === 0) return { status: "notConfigured", detail: "play URL unknown or no room" };
    let url: string;
    let jwt: string;
    try {
        url = await adminSocketUrl();
        jwt = await adminSocketToken(worldRoomUrls);
    } catch (error) {
        return { status: "notConfigured", detail: error instanceof Error ? error.message : String(error) };
    }
    return sendAdminSocketCommand(url, { event: "banned", world: worldSlug, message: { userUuid, message }, jwt });
}
