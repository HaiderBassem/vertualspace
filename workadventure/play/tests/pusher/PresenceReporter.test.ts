import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresenceReportData } from "@workadventure/messages";
import { PresenceReporter } from "../../src/pusher/services/PresenceReporter";

const ROOM = "https://play.example.com/@/acme/hq/floor-1";
const jane = { userUuid: "jane@example.com", name: "Jane", isLogged: true, roomId: ROOM, availabilityStatus: "ONLINE" };
const guest = { userUuid: "b3c9", name: "Guest", isLogged: false, roomId: ROOM, availabilityStatus: "ONLINE" };

describe("PresenceReporter", () => {
    let reports: PresenceReportData[];
    let send: ReturnType<typeof vi.fn<(report: PresenceReportData) => Promise<boolean>>>;
    let reporter: PresenceReporter;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
        reports = [];
        send = vi.fn((report: PresenceReportData) => {
            reports.push(report);
            return Promise.resolve(true);
        });
        reporter = new PresenceReporter({ send, instanceId: "pusher-1", ttlSeconds: 90, debounceMs: 3000 });
    });

    afterEach(() => {
        reporter.stop();
        vi.useRealTimers();
    });

    it("sends nothing while the admin did not ask for reports", async () => {
        reporter.join({}, jane);
        await vi.advanceTimersByTimeAsync(120_000);
        expect(send).not.toHaveBeenCalled();
    });

    it("sends the whole list a few seconds after people join, in one report", async () => {
        reporter.enable();
        await vi.advanceTimersByTimeAsync(3000);
        reports.length = 0;

        reporter.join({}, jane);
        reporter.join({}, guest);
        await vi.advanceTimersByTimeAsync(2999);
        expect(reports).toEqual([]);
        await vi.advanceTimersByTimeAsync(1);
        expect(reports).toHaveLength(1);
        expect(reports[0]).toEqual({
            instanceId: "pusher-1",
            reportedAt: "2026-10-24T10:00:06.000Z",
            ttlSeconds: 90,
            users: [
                {
                    userIdentifier: "jane@example.com",
                    name: "Jane",
                    isLogged: true,
                    playUri: ROOM,
                    availabilityStatus: "ONLINE",
                    connectedAt: "2026-10-24T10:00:03.000Z",
                },
                expect.objectContaining({ userIdentifier: "b3c9", isLogged: false }),
            ],
        });
    });

    it("reports status changes and departures, but not a status that did not change", async () => {
        const janeSocket = {};
        reporter.enable();
        reporter.join(janeSocket, jane);
        await vi.advanceTimersByTimeAsync(3000);
        reports.length = 0;

        reporter.update(janeSocket, { availabilityStatus: "UNCHANGED" });
        reporter.update(janeSocket, { availabilityStatus: "ONLINE" });
        await vi.advanceTimersByTimeAsync(3000);
        expect(reports).toEqual([]);

        reporter.update(janeSocket, { availabilityStatus: "BUSY" });
        await vi.advanceTimersByTimeAsync(3000);
        expect(reports.at(-1)?.users.map((user) => user.availabilityStatus)).toEqual(["BUSY"]);

        reporter.leave(janeSocket);
        await vi.advanceTimersByTimeAsync(3000);
        expect(reports.at(-1)?.users).toEqual([]);
    });

    it("renews the list before it expires, even when nothing changes", async () => {
        reporter.enable();
        reporter.join({}, jane);
        await vi.advanceTimersByTimeAsync(3000);
        reports.length = 0;
        await vi.advanceTimersByTimeAsync(90_000);
        expect(reports.length).toBeGreaterThanOrEqual(3);
        expect(reports.every((report) => report.users.length === 1)).toBe(true);
    });

    it("keeps one report on the way at a time, and sends the changes made meanwhile right after", async () => {
        let release: (wanted: boolean) => void = () => {};
        send.mockImplementationOnce((report) => {
            reports.push(report);
            return new Promise<boolean>((resolve) => {
                release = resolve;
            });
        });
        reporter.enable();
        const socket = {};
        reporter.join(socket, jane);
        await vi.advanceTimersByTimeAsync(3000);
        expect(send).toHaveBeenCalledTimes(1);

        reporter.leave(socket);
        await vi.advanceTimersByTimeAsync(3000);
        expect(send).toHaveBeenCalledTimes(1);

        release(true);
        await vi.advanceTimersByTimeAsync(3000);
        expect(send).toHaveBeenCalledTimes(2);
        expect(reports.at(-1)?.users).toEqual([]);
    });

    it("stops when the admin says it does not want reports anymore", async () => {
        send.mockResolvedValueOnce(false);
        reporter.enable();
        reporter.join({}, jane);
        await vi.advanceTimersByTimeAsync(3000);
        expect(reporter.isEnabled).toBe(false);
        await vi.advanceTimersByTimeAsync(120_000);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it("keeps going after a failed report, and warns only once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        send.mockRejectedValueOnce(new Error("admin down")).mockRejectedValueOnce(new Error("admin down"));
        reporter.enable();
        reporter.join({}, jane);
        await vi.advanceTimersByTimeAsync(3000);
        await vi.advanceTimersByTimeAsync(30_000);
        await vi.advanceTimersByTimeAsync(30_000);
        expect(send).toHaveBeenCalledTimes(3);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(reports).toHaveLength(1);
        warn.mockRestore();
    });

    it("tells the admin that nobody is here anymore when the pusher shuts down", async () => {
        reporter.enable();
        reporter.join({}, jane);
        await vi.advanceTimersByTimeAsync(3000);
        await reporter.drain();
        expect(reports.at(-1)?.users).toEqual([]);
    });
});
