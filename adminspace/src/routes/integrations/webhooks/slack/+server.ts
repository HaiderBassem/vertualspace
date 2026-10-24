/** Slack Events API (Request URL of the Slack app): signed requests only, see integrations/inbound.ts. */
import type { RequestHandler } from "./$types";
import { handleSlackEvents } from "$lib/server/integrations/inbound";

export const POST: RequestHandler = ({ request }) => handleSlackEvents(request);
