/**
 * Settings of an Integration Center connection (integration_connections.settings, jsonb), validated here and read
 * with readIntegrationSettings(). Personal choices (what a person shares with the office) and provider bookkeeping
 * (Slack workspace, polling state) live here; credentials never do (they are sealed in their own columns).
 */
import { z } from "zod";

export const CALENDAR_SHARING = ["busy", "details"] as const;
export type CalendarSharing = (typeof CALENDAR_SHARING)[number];

export const IntegrationSettings = z.object({
    /**
     * Personal calendar: what WorkAdventure may show. "busy" (the default) gives free/busy only: no title, place or
     * meeting link ever leaves the provider for the office.
     */
    calendarSharing: z.enum(CALENDAR_SHARING).optional(),
    /** Personal GitHub or GitLab: show recent coding activity (repository and time) in the office. Off by default. */
    shareActivity: z.boolean().optional(),
    /** Personal Spotify: show what is playing in the office. Off by default. */
    shareMusic: z.boolean().optional(),
    /** Personal Slack: set the Slack status "In a meeting" during busy calendar events. Off by default. */
    statusSync: z.boolean().optional(),
    /** Slack workspace (team) of the connection. */
    teamId: z.string().max(40).optional(),
    teamName: z.string().max(200).optional(),
    /** Slack: channel chosen while installing the app (its incoming webhook). */
    webhookChannel: z.string().max(200).optional(),
    /** Calendar event for which the Slack status was last set (set once per meeting). */
    statusSetFor: z.string().max(300).optional(),
    /** GitHub events polling: ETag of the last answer and earliest next poll (X-Poll-Interval). */
    eventsEtag: z.string().max(300).optional(),
    pollAfter: z.string().datetime().optional(),
});
export type IntegrationSettings = z.infer<typeof IntegrationSettings>;

/** Latest activity shared by a personal GitHub/GitLab connection (from polling or from a verified webhook). */
export const IntegrationActivity = z.object({
    provider: z.enum(["github", "gitlab"]),
    /** owner/name; null when the provider does not say (GitLab events read with read_user only). */
    repo: z.string().max(300).nullable(),
    /** ISO 8601. */
    at: z.string().datetime(),
});
export type IntegrationActivity = z.infer<typeof IntegrationActivity>;

/** Settings read from the database: invalid fields are dropped rather than failing the page. */
export function readIntegrationSettings(value: unknown): IntegrationSettings {
    if (!value || typeof value !== "object") return {};
    const parsed = IntegrationSettings.safeParse(value);
    if (parsed.success) return parsed.data;
    const kept: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(IntegrationSettings.shape)) {
        const one = (field as z.ZodTypeAny).safeParse((value as Record<string, unknown>)[key]);
        if (one.success && one.data !== undefined) kept[key] = one.data;
    }
    return kept as IntegrationSettings;
}

export function readIntegrationActivity(value: unknown): IntegrationActivity | null {
    const parsed = IntegrationActivity.safeParse(value);
    return parsed.success ? parsed.data : null;
}
