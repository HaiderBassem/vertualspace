/**
 * GET /api/calendar/events and GET /api/presence/activity: what people chose to share with the office from their own
 * calendar, music and code accounts (Integration Center, "My integrations"). Contracts: CalendarEventsData and
 * PresenceActivityData of WorkAdventure (libs/messages, vendored in src/lib/contract/workadventure), documented in
 * docs/ADMIN_API.md. Tokens never appear in an answer.
 */
import type { CalendarEventsData, PresenceActivityData } from "../../../contract/workadventure";
import { json } from "../../http/problem";
import { calendarEvents } from "../../integrations/calendar";
import { presenceActivity } from "../../integrations/presence";
import { query, type ApiContext } from "../router";

const DEFAULT_WINDOW_MS = 86_400_000;

function invalid(): Response {
    return json({ status: "error", message: "Invalid parameters" }, { status: 400 });
}

function dateParam(value: string, fallback: Date): Date | undefined {
    if (!value) return fallback;
    const time = Date.parse(value);
    return Number.isNaN(time) ? undefined : new Date(time);
}

export async function getCalendarEvents({ url }: ApiContext): Promise<Response> {
    const userIdentifier = query(url, "userIdentifier");
    const playUri = query(url, "playUri");
    if (!userIdentifier || userIdentifier.length > 320 || !playUri || playUri.length > 2048) return invalid();
    const now = new Date();
    const from = dateParam(query(url, "from"), now);
    if (!from) return invalid();
    const to = dateParam(query(url, "to"), new Date(from.getTime() + DEFAULT_WINDOW_MS));
    if (!to || to <= from) return invalid();
    const answer: CalendarEventsData = await calendarEvents({
        userIdentifier,
        playUri,
        from,
        to,
        // The contract's own word for entries whose details are not shared (WorkAdventure translates it).
        busyTitle: "Busy",
        now,
    });
    return json(answer);
}

export async function getPresenceActivity({ url }: ApiContext): Promise<Response> {
    const userIdentifier = query(url, "userIdentifier");
    const playUri = query(url, "playUri");
    if (!userIdentifier || userIdentifier.length > 320 || playUri.length > 2048) return invalid();
    const answer: PresenceActivityData = await presenceActivity(userIdentifier, playUri || undefined);
    return json(answer);
}
