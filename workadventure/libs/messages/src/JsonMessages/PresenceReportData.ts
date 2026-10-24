import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/*
 * Optional endpoint an admin API can offer to know who is in its worlds right now (POST /api/presence/report).
 * It is only called when /api/capabilities lists "api/presence/report".
 *
 * Each pusher sends the full list of the people connected to it, every few seconds after someone joins, leaves or
 * changes their status, and at least every ttlSeconds / 3. A report replaces the previous report of the same pusher
 * (instanceId). A list that is not renewed within ttlSeconds is out of date: the pusher stopped or lost the admin, and
 * nobody it listed should be shown online anymore.
 */

export const isPresenceReportUser = z.object({
  userIdentifier: extendApi(z.string(), {
    description:
      "The identifier the admin API knows the user by (the one given by /api/room/access): an email for people who signed in, a generated UUID for guests.",
    example: "jane.doe@example.com",
  }),
  name: extendApi(z.string(), {
    description: "The name the user chose in WorkAdventure.",
    example: "Jane",
  }),
  isLogged: extendApi(z.boolean(), {
    description: "Whether the user signed in (false for guests).",
  }),
  playUri: extendApi(z.string(), {
    description: "The room the user is in.",
    example: "https://play.example.com/@/acme/hq/floor-1",
  }),
  availabilityStatus: extendApi(z.string(), {
    description:
      'The availability status of the user, as WorkAdventure names it: "ONLINE", "AWAY", "BUSY", "DO_NOT_DISTURB", "BACK_IN_A_MOMENT", "SILENT", "JITSI", "BBB", "DENY_PROXIMITY_MEETING", "SPEAKER"... New values may come: show an unknown one as online.',
    example: "BUSY",
  }),
  connectedAt: extendApi(z.string(), {
    description: "ISO 8601: when the user entered the room.",
  }),
});

export const isPresenceReportData = z.object({
  instanceId: extendApi(z.string(), {
    description:
      "Which pusher sends the report. A new report from it replaces its previous one.",
    example: "pusher-7f3c2a",
  }),
  reportedAt: extendApi(z.string(), { description: "ISO 8601" }),
  ttlSeconds: extendApi(z.number().int().positive(), {
    description:
      "How long the list holds if no new report comes from this pusher.",
    example: 90,
  }),
  users: z.array(isPresenceReportUser),
});

export type PresenceReportUser = z.infer<typeof isPresenceReportUser>;
export type PresenceReportData = z.infer<typeof isPresenceReportData>;
