/**
 * The live disconnection reports what really happened. A local websocket server stands in for the
 * pusher's /ws/admin/rooms: like WorkAdventure, it answers a refused command with {type: "Error"} and
 * closes with 1008, and sends nothing when it accepts one.
 */
import { createServer } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { kickBannedPerson, sendAdminSocketCommand } from "../src/lib/server/services/live";

let server: WebSocketServer;
let url = "";
const received: unknown[] = [];

beforeAll(async () => {
    server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (typeof address === "string" || !address) throw new Error("no port");
    url = `ws://127.0.0.1:${address.port}`;
    server.on("connection", (socket) => {
        socket.on("message", (raw) => {
            const message = JSON.parse(raw.toString()) as { jwt?: string };
            received.push(message);
            if (message.jwt === "bad") {
                socket.send(JSON.stringify({ type: "Error", data: { message: "Admin socket access refused!" } }));
                socket.close(1008, "Access refused");
            }
            // Accepted commands get no answer, as with WorkAdventure.
        });
    });
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function closedPort(): Promise<number> {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", () => resolve()));
    const address = probe.address();
    const port = typeof address === "object" && address ? address.port : 0;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    return port;
}

describe("admin websocket commands", () => {
    it("reports 'rejected' when the pusher refuses the command", async () => {
        const result = await sendAdminSocketCommand(url, { event: "banned", jwt: "bad" }, 2_000);
        expect(result.status).toBe("rejected");
        expect(result.detail).toContain("refused");
    });

    it("reports 'sent' when the pusher accepts it silently", async () => {
        const result = await sendAdminSocketCommand(url, { event: "banned", jwt: "good" }, 200);
        expect(result).toEqual({ status: "sent" });
        expect(received).toContainEqual({ event: "banned", jwt: "good" });
    });

    it("reports 'unreachable' when nothing listens", async () => {
        const result = await sendAdminSocketCommand(`ws://127.0.0.1:${await closedPort()}`, {}, 200);
        expect(result.status).toBe("unreachable");
    });

    it("says an IP-only ban cannot disconnect anyone live", async () => {
        expect((await kickBannedPerson("world", ["https://play.test/@/o/world/r"], null, "x")).status).toBe(
            "notApplicable",
        );
    });
});
