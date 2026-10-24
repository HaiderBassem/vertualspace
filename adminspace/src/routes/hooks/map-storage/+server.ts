/**
 * Webhook of WorkAdventure's map-storage (its WEB_HOOK_URL): rooms created inside WorkAdventure are registered,
 * deleted maps are reported on their rooms. See src/lib/server/services/mapStorageWebhook.ts.
 */
import type { RequestHandler } from "./$types";
import { handleMapStorageWebhook } from "$lib/server/services/mapStorageWebhook";

export const POST: RequestHandler = ({ request }) => handleMapStorageWebhook(request);
