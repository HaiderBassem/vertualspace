// Vendored from WorkAdventure (libs/messages/src/JsonMessages/CalendarEventsData.ts) by scripts/sync-contract.ts.
// Do not edit: run "npm run contract:sync" instead. License: see the WorkAdventure repository.
import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/*
 * Optional endpoints an admin API can offer to bring what people connected (their calendar, what they chose to share)
 * into WorkAdventure. They are only called when /api/capabilities lists them.
 */

export const isCalendarEventData = z.object({
  id: extendApi(z.string(), { example: "evt_123" }),
  title: extendApi(z.string(), {
    description: 'The title, or "Busy" when the user shares only when they are busy.',
    example: "Weekly sync",
  }),
  start: extendApi(z.string(), { description: "ISO 8601", example: "2026-10-24T09:00:00Z" }),
  end: extendApi(z.string(), { description: "ISO 8601", example: "2026-10-24T09:30:00Z" }),
  allDay: z.boolean(),
  busy: extendApi(z.boolean(), {
    description: "Whether the user is busy during the event (accepted, not cancelled, shown as busy).",
  }),
  location: z.string().nullable(),
  joinUrl: extendApi(z.string().nullable(), {
    description: "The link to join the meeting online, if it has one.",
  }),
});

export const isCalendarEventsData = z.object({
  connected: extendApi(z.boolean(), {
    description: "Whether the user connected a calendar (and it can be read).",
  }),
  provider: z.enum(["google", "microsoft"]).nullable(),
  events: z.array(isCalendarEventData),
  fetchedAt: z.string(),
  error: extendApi(z.string().nullable(), {
    description:
      'Why the calendar could not be read, when it could not (for instance "expired": the user must connect it again).',
  }),
});

export const isPresenceActivityData = z.object({
  music: z.object({ title: z.string(), artist: z.string() }).nullable(),
  coding: z
    .object({ provider: z.string(), repo: z.string(), at: z.string() })
    .nullable(),
});

export type CalendarEventData = z.infer<typeof isCalendarEventData>;
export type CalendarEventsData = z.infer<typeof isCalendarEventsData>;
export type PresenceActivityData = z.infer<typeof isPresenceActivityData>;
