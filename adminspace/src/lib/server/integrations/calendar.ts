/**
 * Calendars for WorkAdventure (GET /api/calendar/events): the meetings of a person who connected Google Calendar or
 * Microsoft 365 in "My integrations", between two dates (at most 7 days), at the detail they chose.
 *
 * - Answers are cached 60 seconds per connection and window (in this process), so WorkAdventure can ask often without
 *   reaching the providers' quotas. When a provider fails, the last answer (if any) is returned with the error.
 * - Never a token, never another person's data: the person is resolved from the room's organization (people.ts).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import { readIntegrationSettings } from "../../settings/integrationSettings";
import { touchConnection, withAccessToken, type Connection } from "./connections";
import { ProviderError } from "./http";
import { resolvePeople } from "./people";
import { listGoogleEvents } from "./providers/google";
import { listMicrosoftEvents } from "./providers/microsoft";
import { CALENDAR_PROVIDERS } from "./registry";
import type { CalendarDetail, CalendarEvent } from "./types";

export const MAX_WINDOW_MS = 7 * 86_400_000;
export const CACHE_TTL_MS = 60_000;
const CACHE_LIMIT = 5_000;

/** Codes of the `error` field (docs/ADMIN_API.md). */
export type CalendarError = "expired" | "rate_limited" | "provider_unavailable" | "permission_missing";

export interface CalendarAnswer {
    connected: boolean;
    provider: "google" | "microsoft" | null;
    events: CalendarEvent[];
    fetchedAt: string;
    error: CalendarError | null;
}

const cache = new Map<string, { at: number; events: CalendarEvent[] }>();

function remember(key: string, events: CalendarEvent[], now: number): void {
    if (cache.size >= CACHE_LIMIT) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: now, events });
}

/** Tests only. */
export function clearCalendarCache(): void {
    cache.clear();
}

function errorCode(error: unknown): CalendarError {
    if (!(error instanceof ProviderError)) return "provider_unavailable";
    if (error.code === "invalidGrant" || error.code === "unauthorized") return "expired";
    if (error.code === "rateLimited") return "rate_limited";
    if (error.code === "forbidden" || error.code === "scopeMissing") return "permission_missing";
    return "provider_unavailable";
}

/** The window WorkAdventure asked for, capped at 7 days. */
export function calendarWindow(from: Date, to: Date): { from: Date; to: Date } {
    return { from, to: new Date(Math.min(to.getTime(), from.getTime() + MAX_WINDOW_MS)) };
}

async function calendarConnection(organizationId: string, accountId: string): Promise<Connection | undefined> {
    const rows = await db()
        .select()
        .from(schema.integrationConnections)
        .where(
            and(
                eq(schema.integrationConnections.organizationId, organizationId),
                eq(schema.integrationConnections.accountId, accountId),
                inArray(schema.integrationConnections.provider, [...CALENDAR_PROVIDERS]),
            ),
        );
    return rows.find((c) => c.status === "connected") ?? rows[0];
}

export async function fetchCalendar(
    connection: Connection,
    detail: CalendarDetail,
    from: Date,
    to: Date,
    busyTitle: string,
) {
    return withAccessToken(connection, (token, current) =>
        current.provider === "google"
            ? listGoogleEvents(token, { from, to, detail, busyTitle }, current.scopes)
            : listMicrosoftEvents(token, { from, to, detail, busyTitle }),
    );
}

export async function calendarEvents(input: {
    userIdentifier: string;
    playUri: string;
    from: Date;
    to: Date;
    busyTitle: string;
    now?: Date;
}): Promise<CalendarAnswer> {
    const now = input.now ?? new Date();
    const fetchedAt = now.toISOString();
    const [person] = await resolvePeople(input.userIdentifier, input.playUri);
    const none: CalendarAnswer = { connected: false, provider: null, events: [], fetchedAt, error: null };
    if (!person) return none;
    const connection = await calendarConnection(person.organizationId, person.accountId);
    if (!connection) return none;
    const provider = connection.provider as "google" | "microsoft";
    if (connection.status !== "connected") {
        return { connected: false, provider, events: [], fetchedAt, error: "expired" };
    }
    await touchConnection(connection.id);
    const detail = readIntegrationSettings(connection.settings).calendarSharing ?? "busy";
    const { from, to } = calendarWindow(input.from, input.to);
    const key = `${connection.id}:${detail}:${Math.floor(from.getTime() / 60_000)}:${Math.floor(to.getTime() / 60_000)}`;
    const cached = cache.get(key);
    if (cached && now.getTime() - cached.at < CACHE_TTL_MS) {
        return {
            connected: true,
            provider,
            events: cached.events,
            fetchedAt: new Date(cached.at).toISOString(),
            error: null,
        };
    }
    try {
        const events = (await fetchCalendar(connection, detail, from, to, input.busyTitle)).sort((a, b) =>
            a.start.localeCompare(b.start),
        );
        remember(key, events, now.getTime());
        await db()
            .update(schema.integrationConnections)
            .set({ lastSyncAt: now, lastError: null })
            .where(eq(schema.integrationConnections.id, connection.id));
        return { connected: true, provider, events, fetchedAt, error: null };
    } catch (error) {
        const code = errorCode(error);
        if (code === "expired") return { connected: false, provider, events: [], fetchedAt, error: code };
        await db()
            .update(schema.integrationConnections)
            .set({ lastError: error instanceof ProviderError ? error.code : "unexpected" })
            .where(eq(schema.integrationConnections.id, connection.id));
        return {
            connected: true,
            provider,
            events: cached?.events ?? [],
            fetchedAt: cached ? new Date(cached.at).toISOString() : fetchedAt,
            error: code,
        };
    }
}
