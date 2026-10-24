/**
 * Router of the WorkAdventure Admin API (the endpoints WorkAdventure's pusher and back call).
 *
 * Kept independent from SvelteKit so it can be tested with plain Request objects.
 * Authentication: WorkAdventure sends ADMIN_API_TOKEN in the Authorization header on most calls;
 * /api/capabilities, /oauth/logout, /white-label/cf-challenge and /api/room-api/authorization (which
 * carries a Room API key instead) are called without it, as in WorkAdventure.
 */
import type { Locale } from "../../i18n";
import { checkAdminApiToken, json } from "../http/problem";
import { localeFromRequest } from "../workadventure/errors";

export interface ApiContext {
    request: Request;
    url: URL;
    params: Record<string, string>;
    clientIp: string | undefined;
    locale: Locale;
}

export type ApiHandler = (ctx: ApiContext) => Promise<Response>;

export interface ApiRoute {
    method: "GET" | "POST" | "PUT";
    path: string;
    auth: "adminToken" | "none";
    handler: ApiHandler;
}

interface CompiledRoute extends ApiRoute {
    regex: RegExp;
    keys: string[];
}

function compile(route: ApiRoute): CompiledRoute {
    const keys: string[] = [];
    const pattern = route.path.replace(/:(\w+)/g, (_, key: string) => {
        keys.push(key);
        return "([^/]+)";
    });
    return { ...route, regex: new RegExp(`^${pattern}/?$`), keys };
}

/**
 * Every Admin API answer is marked uncacheable. WorkAdventure's pusher caches GET responses of its
 * global axios instance (play/src/room-api/authentication/AdminAuthenticator.ts calls setupCache(axios),
 * 5 minutes by default); without this header a person banned after being let in, or whose tags changed,
 * would get the stale cached answer when reconnecting. axios-cache-interceptor honours no-store.
 */
function uncacheable(response: Response): Response {
    response.headers.set("cache-control", "no-store");
    return response;
}

export function createRouter(routes: ApiRoute[]) {
    const compiled = routes.map(compile);

    return async function dispatch(request: Request, clientIp: string | undefined): Promise<Response> {
        return uncacheable(await route(request, clientIp));
    };

    async function route(request: Request, clientIp: string | undefined): Promise<Response> {
        const url = new URL(request.url);
        const candidates = compiled.filter((r) => r.regex.test(url.pathname));
        if (candidates.length === 0) {
            return json({ status: "error", message: "Not found" }, { status: 404 });
        }
        const route = candidates.find((r) => r.method === request.method);
        if (!route) {
            return new Response("Method not allowed", {
                status: 405,
                headers: { allow: [...new Set(candidates.map((c) => c.method))].join(", ") },
            });
        }
        if (route.auth === "adminToken") {
            const refused = checkAdminApiToken(request);
            if (refused) return refused;
        }
        const match = route.regex.exec(url.pathname);
        const params: Record<string, string> = {};
        try {
            route.keys.forEach((key, index) => {
                params[key] = decodeURIComponent(match?.[index + 1] ?? "");
            });
        } catch {
            return json({ status: "error", message: "Malformed URL" }, { status: 400 });
        }
        try {
            return await route.handler({ request, url, params, clientIp, locale: localeFromRequest(request) });
        } catch (error) {
            if (error instanceof PayloadTooLargeError) {
                return json({ status: "error", message: "Payload too large" }, { status: 413 });
            }
            // Message and SQLSTATE only: database errors carry bound parameters (personal data, hashes).
            console.error(
                JSON.stringify({
                    level: "error",
                    time: new Date().toISOString(),
                    message: "Admin API handler failed",
                    method: request.method,
                    path: url.pathname,
                    error: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
                    code: (error as { code?: unknown } | null)?.code ?? undefined,
                }),
            );
            return json({ status: "error", message: "Internal error" }, { status: 500 });
        }
    }
}

/** Reads a query parameter that axios may send as `name` or `name[]` (arrays). */
export function queryList(url: URL, name: string): string[] {
    const values = [...url.searchParams.getAll(name), ...url.searchParams.getAll(`${name}[]`)];
    return values
        .flatMap((v) => v.split(","))
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
}

export function query(url: URL, name: string): string {
    return url.searchParams.get(name)?.trim() ?? "";
}

/** Thrown by readJson() when the body is above BODY_SIZE_LIMIT; the router answers 413. */
export class PayloadTooLargeError extends Error {
    constructor() {
        super("Payload too large");
        this.name = "PayloadTooLargeError";
    }
}

/**
 * True for the error adapter-node raises (lazily, while the body is read) when a body is above
 * BODY_SIZE_LIMIT: a SvelteKitError with status 413. The stream error may reach us wrapped in `cause`.
 */
export function isBodyTooLarge(error: unknown): boolean {
    for (let current = error, depth = 0; current && depth < 5; depth++) {
        if (typeof current !== "object") return false;
        const { status, message, cause } = current as { status?: unknown; message?: unknown; cause?: unknown };
        if (status === 413) return true;
        if (
            typeof message === "string" &&
            /BODY_SIZE_LIMIT|exceeds limit of \d+ bytes|Payload Too Large/i.test(message)
        ) {
            return true;
        }
        current = cause;
    }
    return false;
}

/**
 * Reads a JSON body; undefined when it is missing or not JSON (handlers answer 400).
 * A body above the platform's size limit is not "invalid": it throws PayloadTooLargeError (413).
 */
export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch (error) {
        if (isBodyTooLarge(error)) throw new PayloadTooLargeError();
        return undefined;
    }
}
