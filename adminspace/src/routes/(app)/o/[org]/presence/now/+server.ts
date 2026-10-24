/** GET: the "Who's in" view as JSON, polled by the page. Same permission as the page; never cached. */
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadPresence } from "../presence.server";

export const GET: RequestHandler = async ({ locals, params }) => {
    return json(await loadPresence(locals, params.org), { headers: { "cache-control": "no-store" } });
};
