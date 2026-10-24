// Vendored from WorkAdventure (libs/messages/src/JsonMessages/CapabilitiesData.ts) by scripts/sync-contract.ts.
// Do not edit: run "npm run contract:sync" instead. License: see the WorkAdventure repository.
import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isCapabilities = z.object({
  "api/companion/list": extendApi(z.optional(z.string()), {
    description: "Means the api implements a companion list",
    example: "v1",
  }),
  "api/woka/list": extendApi(z.optional(z.string()), {
    description:
      "Means the api implements woka list, This capability will be added regardless",
    example: "v1",
  }),
  "api/domain/verify": extendApi(z.optional(z.string()), {
    description:
      "Means the api can validate if a domain is a legitimate domain. Needed if you do OAuth login AND your WorkAdventure install supports multiple domains.",
    example: "v1",
  }),
  "api/save-name": extendApi(z.optional(z.string()), {
    description:
      "Means the api can save the name of the Woka when configured in WorkAdventure.",
    example: "v1",
  }),
  "api/save-textures": extendApi(z.optional(z.string()), {
    description:
      "Means the api can save the textures of the Woka when configured in WorkAdventure.",
    example: "v1",
  }),
  "api/livekit/credentials": extendApi(z.optional(z.string()), {
    description: "Means the api implements the livekit credentials",
    example: "v1",
  }),
  "api/ice-servers": extendApi(z.optional(z.string()), {
    description:
      "The API can provide ICE server configurations (including TURN servers and credentials) for WebRTC connections.",
    example: "v1",
  }),
  "api/analytics/events-batch": extendApi(z.optional(z.string()), {
    description: "Means the api accepts generic analytics event batches.",
    example: "v1",
  }),
  "api/ban": extendApi(z.optional(z.string()), {
    description:
      "Means the api can ban users (POST /api/ban). Without it, admins can kick users but not ban them.",
    example: "v1",
  }),
  "api/recordings/events": extendApi(z.optional(z.string()), {
    description:
      "Means the api accepts recording lifecycle events (the end of an egress) from the back.",
    example: "v1",
  }),
  "api/calendar/events": extendApi(z.optional(z.string()), {
    description:
      "Means the api can give the upcoming events of the calendar a user connected (GET /api/calendar/events). WorkAdventure then shows them in its agenda and sets the user busy during their meetings.",
    example: "v1",
  }),
  "api/presence/activity": extendApi(z.optional(z.string()), {
    description:
      "Means the api can give what a user chose to share of their activity (GET /api/presence/activity), such as the music they listen to.",
    example: "v1",
  }),
  "api/presence/report": extendApi(z.optional(z.string()), {
    description:
      "Means the api wants to know who is connected right now: each pusher then sends it the list of its connected users and their status (POST /api/presence/report).",
    example: "v1",
  }),
});

export type Capabilities = z.infer<typeof isCapabilities>;
