import type { RequestHandler } from "./$types";
import { isUuid } from "$lib/server/http/forms";
import { buildWorldCollection } from "$lib/server/catalog/install";

/**
 * The entity collection of a world, loaded by WorkAdventure's map editor from players' browsers
 * (fetch from the play origin: CORS is open). It lists furniture only, nothing personal. Not cached by
 * browsers for long: installing a component must show up at the next room load.
 */
export const GET: RequestHandler = async ({ params }) => {
    const headers = {
        "access-control-allow-origin": "*",
        "cross-origin-resource-policy": "cross-origin",
        "x-content-type-options": "nosniff",
    };
    if (!isUuid(params.worldId)) return new Response("Not found", { status: 404, headers });
    const collection = await buildWorldCollection(params.worldId);
    if (!collection) return new Response("Not found", { status: 404, headers });
    return new Response(JSON.stringify(collection), {
        headers: {
            ...headers,
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=30, must-revalidate",
        },
    });
};
