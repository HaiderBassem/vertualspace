import type { RequestHandler } from "./$types";

/** Liveness probe: the process answers. */
export const GET: RequestHandler = () => new Response("ok", { headers: { "content-type": "text/plain" } });
