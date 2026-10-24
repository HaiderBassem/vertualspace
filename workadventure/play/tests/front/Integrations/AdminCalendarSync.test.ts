import type { CalendarEventsAnswer } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import type { CalendarSyncHost } from "../../../src/front/Integrations/AdminCalendarSync";
import { AdminCalendarSync, meetingAt, toCalendarEvents } from "../../../src/front/Integrations/AdminCalendarSync";

const NOW = Date.parse("2026-10-24T10:15:00Z");

function answer(overrides: Partial<CalendarEventsAnswer> = {}): CalendarEventsAnswer {
    return {
        supported: true,
        connected: true,
        provider: "google",
        error: "",
        events: [
            {
                id: "standup",
                title: "Stand-up",
                start: "2026-10-24T10:00:00Z",
                end: "2026-10-24T10:30:00Z",
                allDay: false,
                busy: true,
                location: "",
                joinUrl: "https://meet.example.com/abc",
            },
            {
                id: "holiday",
                title: "Team day",
                start: "2026-10-24T00:00:00Z",
                end: "2026-10-25T00:00:00Z",
                allDay: true,
                busy: true,
                location: "",
                joinUrl: "",
            },
            {
                id: "lunch",
                title: "Lunch",
                start: "2026-10-24T12:00:00Z",
                end: "2026-10-24T13:00:00Z",
                allDay: false,
                busy: false,
                location: "Cafeteria",
                joinUrl: "",
            },
            {
                id: "broken",
                title: "Broken",
                start: "soon",
                end: "later",
                allDay: false,
                busy: true,
                location: "",
                joinUrl: "",
            },
        ],
        ...overrides,
    };
}

function host(response: CalendarEventsAnswer, overrides: Partial<CalendarSyncHost> = {}) {
    const calls = { events: [] as unknown[], meetings: [] as unknown[] };
    const query = vi.fn((_from: string, _to: string) => Promise.resolve(response));
    const value: CalendarSyncHost = {
        query,
        setEvents: (events) => calls.events.push(events ? [...events.keys()] : undefined),
        setMeeting: (meeting) => calls.meetings.push(meeting),
        otherSourceActive: () => false,
        now: () => NOW,
        ...overrides,
    };
    return { value, calls, query };
}

describe("toCalendarEvents", () => {
    it("keeps the readable events, with their join link", () => {
        const events = toCalendarEvents(answer());
        expect([...events.keys()]).toEqual(["standup", "holiday", "lunch"]);
        expect(events.get("standup")?.resource?.onlineMeeting?.joinUrl).toBe("https://meet.example.com/abc");
        expect(events.get("lunch")?.resource).toBeUndefined();
        expect(events.get("lunch")?.description).toBe("Cafeteria");
    });
});

describe("meetingAt", () => {
    it("is the busy meeting going on, not an all-day event nor a free one", () => {
        expect(meetingAt(answer(), NOW)).toEqual({ title: "Stand-up", end: Date.parse("2026-10-24T10:30:00Z") });
        expect(meetingAt(answer(), Date.parse("2026-10-24T12:30:00Z"))).toBeUndefined();
        expect(meetingAt(answer(), Date.parse("2026-10-24T10:30:00Z"))).toBeUndefined();
        expect(meetingAt(undefined, NOW)).toBeUndefined();
    });
});

describe("AdminCalendarSync", () => {
    it("fills the agenda and sets the meeting going on", async () => {
        const { value, calls, query } = host(answer());
        await new AdminCalendarSync(value).refresh();
        expect(calls.events).toEqual([["standup", "holiday", "lunch"]]);
        expect(calls.meetings).toEqual([{ title: "Stand-up", end: Date.parse("2026-10-24T10:30:00Z") }]);
        expect(query).toHaveBeenCalledWith("2026-10-24T10:15:00.000Z", "2026-10-31T10:15:00.000Z");
    });

    it("hides the agenda of a user who connected no calendar", async () => {
        const { value, calls } = host(answer({ connected: false, events: [] }));
        await new AdminCalendarSync(value).refresh();
        expect(calls.events).toEqual([undefined]);
        expect(calls.meetings).toEqual([undefined]);
    });

    it("stops asking when the admin offers no calendars", async () => {
        vi.useFakeTimers();
        try {
            const { value, query } = host(answer({ supported: false, connected: false, events: [] }));
            const sync = new AdminCalendarSync(value);
            sync.start();
            await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
            expect(query).toHaveBeenCalledTimes(1);
            sync.stop();
        } finally {
            vi.useRealTimers();
        }
    });

    it("leaves the agenda alone when an extension module brings the calendar", async () => {
        const { value, calls, query } = host(answer(), { otherSourceActive: () => true });
        await new AdminCalendarSync(value).refresh();
        expect(query).not.toHaveBeenCalled();
        expect(calls.events).toEqual([]);
    });

    it("clears the meeting when stopped", () => {
        const { value, calls } = host(answer());
        new AdminCalendarSync(value).stop();
        expect(calls.meetings).toEqual([undefined]);
    });
});
