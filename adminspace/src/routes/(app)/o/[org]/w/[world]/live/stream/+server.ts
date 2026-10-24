/**
 * Server-Sent Events relaying who joins and leaves the rooms of the world, from the pusher's admin
 * websocket. One websocket per open page; it is closed when the browser disconnects.
 *
 * IP addresses are personal data: they are only relayed to people allowed to moderate (to ban by IP).
 */
import type { RequestHandler } from "./$types";
import { loadWorld } from "$lib/server/context";
import { problem } from "$lib/server/http/problem";
import { openAdminListener } from "$lib/server/services/live";
import { adminSocketEnabled } from "$lib/server/services/pusher";
import { worldRoomUrls } from "$lib/server/services/rooms";

const KEEP_ALIVE_MS = 25_000;

export const GET: RequestHandler = async ({ locals, params }) => {
    const { access, world } = await loadWorld(locals, params.org, params.world, "member.read");
    if (!adminSocketEnabled()) {
        return problem({
            status: 503,
            title: "Live list unavailable",
            detail: "ADMIN_SOCKETS_TOKEN is not configured: the admin websocket of the pusher cannot be used.",
        });
    }
    const roomUrls = await worldRoomUrls(params.org, world.id, world.slug);
    const showIp = access.can("moderation.manage");

    let closeSocket: (() => void) | undefined;
    let keepAlive: ReturnType<typeof setInterval> | undefined;
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const encoder = new TextEncoder();
            const write = (chunk: string) => {
                if (!closed) controller.enqueue(encoder.encode(chunk));
            };
            const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            const finish = () => {
                if (closed) return;
                closed = true;
                clearInterval(keepAlive);
                controller.close();
            };

            try {
                closeSocket = await openAdminListener(
                    roomUrls,
                    (message) => {
                        if (message.type === "MemberJoin") {
                            send("join", {
                                uuid: message.data.uuid,
                                name: message.data.name,
                                roomUrl: message.data.roomId,
                                ...(showIp ? { ipAddress: message.data.ipAddress } : {}),
                            });
                        } else if (message.type === "MemberLeave") {
                            send("leave", { uuid: message.data.uuid });
                        } else {
                            send("failure", { message: message.data.message });
                        }
                    },
                    () => {
                        send("closed", {});
                        finish();
                    },
                );
            } catch {
                send("failure", { message: "unreachable" });
                finish();
                return;
            }
            send("ready", {});
            keepAlive = setInterval(() => write(": keep-alive\n\n"), KEEP_ALIVE_MS);
        },
        cancel() {
            closed = true;
            clearInterval(keepAlive);
            closeSocket?.();
        },
    });

    return new Response(stream, {
        headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-store",
            "x-accel-buffering": "no",
        },
    });
};
