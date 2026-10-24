/**
 * Upstream failures of WorkAdventure's pusher, against a local fake server: every failure must surface as
 * PusherUnavailableError (which pages turn into "WorkAdventure could not be reached"), never as a crash.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mode: "ok" | "malformed" | "wrongShape" | "error" | "hang" = "ok";
let server: Server;
let baseUrl = "";

vi.mock("../src/lib/server/services/instance", () => ({
    pusherBaseUrl: async () => baseUrl,
    getInstanceSettings: async () => ({}),
}));

const { fetchRoomOccupancy, refreshRoom, PusherUnavailableError } = await import("../src/lib/server/services/pusher");

beforeAll(async () => {
    server = createServer((request, response) => {
        if (mode === "hang") return; // never answers: the client must give up on its own
        if (mode === "error") {
            response.writeHead(500).end("boom");
            return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        if (mode === "malformed") response.end("{not json");
        else if (mode === "wrongShape") response.end(JSON.stringify({ room: "not a number" }));
        else response.end(request.url === "/rooms" ? JSON.stringify({ "http://play.test/@/a/b/c": 2 }) : "ok");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("pusher client", () => {
    it("reads occupancy from a healthy pusher", async () => {
        mode = "ok";
        await expect(fetchRoomOccupancy(0)).resolves.toEqual({ "http://play.test/@/a/b/c": 2 });
    });

    it.each(["malformed", "wrongShape", "error"] as const)("reports a %s answer as unavailable", async (m) => {
        mode = m;
        await expect(fetchRoomOccupancy(0)).rejects.toBeInstanceOf(PusherUnavailableError);
    });

    it("gives up on a pusher that never answers, within its timeout", async () => {
        mode = "hang";
        const started = Date.now();
        await expect(refreshRoom("http://play.test/@/a/b/c")).rejects.toMatchObject({ reason: "timeout" });
        expect(Date.now() - started).toBeLessThan(7_000);
    }, 10_000);

    // Regression: /admin showed the English message of these errors; pages now translate their reason.
    it.each([
        ["malformed", { reason: "invalidAnswer" }],
        ["wrongShape", { reason: "invalidAnswer" }],
        ["error", { reason: "http", httpStatus: 500 }],
    ] as const)("classifies a %s answer for translation", async (m, expected) => {
        mode = m;
        const error: unknown = await fetchRoomOccupancy(0).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(PusherUnavailableError);
        expect(error).toMatchObject(expected);
    });
});

describe("system status problems", () => {
    it("turns errors into translatable codes, never into their English message", async () => {
        const { checkProblem } = await import("../src/lib/server/services/systemStatus");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            expect(
                checkProblem("pusher", new PusherUnavailableError("Pusher answered 502 on /rooms", "http", 502)),
            ).toEqual({ code: "http", status: 502 });
            expect(checkProblem("pusher", new PusherUnavailableError("Pusher unreachable at x: TypeError"))).toEqual({
                code: "unreachable",
            });
            expect(checkProblem("pusher", new PusherUnavailableError("slow", "timeout"))).toEqual({
                code: "timeout",
                seconds: 4,
            });
            expect(checkProblem("mapStorage", new TypeError("fetch failed"), "unreachable")).toEqual({
                code: "unreachable",
            });
            expect(checkProblem("database", new Error("connect ECONNREFUSED"))).toEqual({ code: "failed" });
            // The technical detail is logged for operators.
            expect(warn).toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });
});
