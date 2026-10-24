import type { CalendarEventInterface } from "@workadventure/shared-utils";
import type { CalendarEventsAnswer } from "@workadventure/messages";

/**
 * Brings the calendar a user connected in the admin back office (Google, Microsoft...) into WorkAdventure: its events
 * fill the agenda and the meeting reminders, and the user shows as busy during their meetings. The admin reads the
 * calendar: tokens never reach the browser.
 */

/** How often the calendar is read again. */
export const CALENDAR_REFRESH_MS = 5 * 60 * 1000;

/** How often the meeting going on is checked (meetings start and end between two readings). */
const MEETING_CHECK_MS = 30 * 1000;

export interface CalendarSyncHost {
    query(from: string, to: string): Promise<CalendarEventsAnswer>;
    /** Shows the calendar in the agenda (undefined: the user has none, hide it). */
    setEvents(events: Map<string, CalendarEventInterface> | undefined): void;
    /** The meeting going on now, if any. */
    setMeeting(meeting: { title: string; end: number } | undefined): void;
    /** Whether another source (an extension module) already brings a calendar: it is then left alone. */
    otherSourceActive(): boolean;
    now(): number;
}

/** The events of an answer, as the agenda takes them. Events with unreadable dates are left out. */
export function toCalendarEvents(answer: CalendarEventsAnswer): Map<string, CalendarEventInterface> {
    const events = new Map<string, CalendarEventInterface>();
    for (const event of answer.events) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
        events.set(event.id, {
            id: event.id,
            title: event.title,
            description: event.location,
            start,
            end,
            allDay: event.allDay,
            resource: event.joinUrl ? { onlineMeeting: { joinUrl: event.joinUrl } } : undefined,
        });
    }
    return events;
}

/** The busy meeting going on at this instant (all-day events do not make anyone busy), the one ending last if several. */
export function meetingAt(
    answer: CalendarEventsAnswer | undefined,
    now: number,
): { title: string; end: number } | undefined {
    let current: { title: string; end: number } | undefined;
    for (const event of answer?.events ?? []) {
        if (!event.busy || event.allDay) continue;
        const start = Date.parse(event.start);
        const end = Date.parse(event.end);
        if (Number.isNaN(start) || Number.isNaN(end) || start > now || now >= end) continue;
        if (!current || end > current.end) current = { title: event.title, end };
    }
    return current;
}

export class AdminCalendarSync {
    private lastAnswer: CalendarEventsAnswer | undefined;
    private refreshTimer: ReturnType<typeof setInterval> | undefined;
    private meetingTimer: ReturnType<typeof setInterval> | undefined;
    private stopped = false;

    constructor(private readonly host: CalendarSyncHost) {}

    public start(): void {
        this.refresh().catch((error) => console.warn("Could not read the calendar", error));
        this.refreshTimer = setInterval(() => {
            this.refresh().catch((error) => console.warn("Could not read the calendar", error));
        }, CALENDAR_REFRESH_MS);
        this.meetingTimer = setInterval(() => this.updateMeeting(), MEETING_CHECK_MS);
    }

    public stop(): void {
        this.stopped = true;
        clearInterval(this.refreshTimer);
        clearInterval(this.meetingTimer);
        this.host.setMeeting(undefined);
    }

    /** Reads the calendar again (one week ahead). */
    public async refresh(): Promise<void> {
        if (this.host.otherSourceActive()) return;
        const now = this.host.now();
        const answer = await this.host.query(
            new Date(now).toISOString(),
            new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        );
        if (this.stopped) return;
        if (!answer.supported) {
            // The admin offers no calendars: nothing to show, and no need to ask again.
            clearInterval(this.refreshTimer);
            clearInterval(this.meetingTimer);
            this.lastAnswer = undefined;
            this.host.setEvents(undefined);
            this.host.setMeeting(undefined);
            return;
        }
        this.lastAnswer = answer;
        this.host.setEvents(answer.connected ? toCalendarEvents(answer) : undefined);
        this.updateMeeting();
    }

    private updateMeeting(): void {
        if (this.stopped) return;
        this.host.setMeeting(this.lastAnswer?.connected ? meetingAt(this.lastAnswer, this.host.now()) : undefined);
    }
}
