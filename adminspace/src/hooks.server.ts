import { redirect, type Handle, type HandleServerError, type ServerInit } from "@sveltejs/kit";
import { scheduleRetention } from "$lib/server/services/retention";
import { startJobWorker, stopJobWorker } from "$lib/server/services/jobs";
import { connectDeskEventsToIntegrations } from "$lib/server/integrations/deskBridge";
import "$lib/server/services/jobHandlers";
import { scheduleIntegrationSync, stopIntegrationSync } from "$lib/server/integrations/jobs";
import { closeDb } from "$lib/server/db/client";
import { DEFAULT_LOCALE, isLocale, localeInfo, messagesFor, negotiateLocale, type Locale } from "$lib/i18n";
import { config } from "$lib/server/config";
import { readSession } from "$lib/server/auth/session";
import { hasAnyAccount } from "$lib/server/services/accounts";
import { getInstanceSettings } from "$lib/server/services/instance";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import { describeError, logJson, requestIdFrom } from "$lib/server/security/requestLog";
import { LOCALE_COOKIE } from "$lib/i18n/cookie";
import { runWithRequestContext } from "$lib/server/requestContext";

/** Paths WorkAdventure (or anonymous people) call: no back-office session, no redirect to /login. */
const MACHINE_PATHS = [
    /^\/api\//,
    /^\/oauth\//,
    /^\/white-label\//,
    /^\/healthz$/,
    /^\/readyz$/,
    // Component collections and assets, fetched by WorkAdventure players' browsers (public, read-only).
    /^\/wa\//,
    // Webhooks of WorkAdventure services (map-storage), authenticated by their own token.
    /^\/hooks\//,
    // Integration Center: the automation API (bearer tokens) and providers' webhooks (signed requests).
    /^\/automation\//,
    /^\/integrations\/webhooks\//,
];
/** Machine paths of the WorkAdventure Admin API, rate limited per client IP. */
const ADMIN_API_PATHS = [/^\/api\//, /^\/oauth\//, /^\/white-label\//];
/** Back-office paths that do not need a session. */
const PUBLIC_PATHS = [
    /^\/login$/,
    /^\/setup$/,
    /^\/profile$/,
    /^\/play\/logout$/,
    /^\/locale$/,
    /^\/register(\/verify)?$/,
    /^\/invite$/,
    /^\/forgot-password$/,
    /^\/reset-password$/,
];
/** Pages whose URL carries a secret token: the URL must not leak through the Referer header. */
const TOKEN_PATHS = [/^\/invite$/, /^\/register\/verify$/, /^\/reset-password$/, /^\/integrations\/oauth\//];
/** Paths allowed to a logged-in account whose second factor is not verified yet. */
const MFA_PENDING_PATHS = [/^\/login\/mfa$/, /^\/logout$/, /^\/locale$/];
/** Paths allowed while an account must first set up 2FA or change a temporary password. */
const ACCOUNT_SETUP_PATHS = /^\/(account|logout|locale)(\/|$)/;
/** Not logged: health probes and static assets would drown the useful lines. */
const UNLOGGED_PATHS = [/^\/healthz$/, /^\/readyz$/, /^\/_app\//, /^\/favicon/];

// Fail fast on a broken configuration instead of on the first request.
config();

/** Runs once when the server starts: background jobs, and a clean shutdown. */
export const init: ServerInit = () => {
    if (config().NODE_ENV !== "test") {
        scheduleRetention();
        if (config().JOB_WORKER) {
            startJobWorker();
            scheduleIntegrationSync();
        }
        // Desk Manager changes reach the endpoints subscribed to desk events.
        connectDeskEventsToIntegrations();
    }
    // adapter-node emits this after SIGTERM/SIGINT once in-flight requests are done. Closing the pool lets
    // the process exit at once instead of being killed when the stop grace period ends.
    process.once("sveltekit:shutdown", () => {
        stopJobWorker();
        stopIntegrationSync();
        closeDb().catch((error: unknown) => console.error("Closing the database pool failed", error));
    });
};

/** Replaces the frame-ancestors directive of a CSP header (clickjacking protection). */
function withFrameAncestors(csp: string, value: string): string {
    const directives = csp
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d.length > 0 && !d.toLowerCase().startsWith("frame-ancestors"));
    directives.push(`frame-ancestors ${value}`);
    return directives.join("; ");
}

/** The WorkAdventure play origin, the only site allowed to frame /profile. */
async function playOrigin(): Promise<string | undefined> {
    try {
        const { playUrl } = await getInstanceSettings();
        return playUrl ? new URL(playUrl).origin : undefined;
    } catch {
        return undefined;
    }
}

export const handle: Handle = (input) => runWithRequestContext(() => handleRequest(input));

const handleRequest: Handle = async ({ event, resolve }) => {
    const started = performance.now();
    const path = event.url.pathname;
    const isMachine = MACHINE_PATHS.some((p) => p.test(path));

    event.locals.requestId = requestIdFrom(event.request.headers.get("x-request-id"));
    let clientIp: string | undefined;
    try {
        clientIp = event.getClientAddress();
    } catch {
        clientIp = undefined;
    }
    event.locals.clientIp = clientIp;
    event.locals.account = undefined;
    event.locals.session = undefined;
    event.locals.timeZone = undefined;

    // Locale first, so that every answer (errors included) can be localized.
    const configured = config().DEFAULT_LOCALE;
    const fallback: Locale = isLocale(configured) ? configured : DEFAULT_LOCALE;
    const cookieLocale = event.cookies.get(LOCALE_COOKIE);

    let response: Response;
    const isAdminApi = ADMIN_API_PATHS.some((p) => p.test(path));
    if (isAdminApi && config().RATE_LIMIT_ADMIN_API_PER_MINUTE > 0) {
        const limit = await checkRateLimit(
            `adminapi:ip:${clientIp ?? "unknown"}`,
            config().RATE_LIMIT_ADMIN_API_PER_MINUTE,
            60,
        );
        if (!limit.allowed) {
            response = new Response(JSON.stringify({ status: "error", message: "Too many requests" }), {
                status: 429,
                headers: {
                    "content-type": "application/json",
                    "retry-after": String(limit.retryAfterSec),
                    // Like every Admin API answer: WorkAdventure's pusher caches GET answers (see adminApi/router.ts).
                    "cache-control": "no-store",
                },
            });
            return finish(event, response, started);
        }
    }

    if (!isMachine) {
        const found = await readSession(event.cookies);
        if (found) {
            event.locals.account = found.account;
            event.locals.session = found.session;
            event.locals.timeZone = found.account.timeZone ?? undefined;
        }
    }

    // Locale: explicit choice (cookie) > account preference > Accept-Language (RFC 4647) > default.
    const accountLocale = event.locals.account?.locale;
    event.locals.locale = isLocale(cookieLocale)
        ? cookieLocale
        : isLocale(accountLocale)
          ? accountLocale
          : negotiateLocale(event.request.headers.get("accept-language"), fallback);

    // Guard here rather than in a layout: layout loads do not run before form actions.
    if (!isMachine && !PUBLIC_PATHS.some((p) => p.test(path)) && !path.startsWith("/_app/")) {
        const { account, session } = event.locals;
        if (!account || !session) {
            if (!(await hasAnyAccount())) {
                redirect(303, "/setup");
            }
            const target = path === "/" ? "" : `?redirectTo=${encodeURIComponent(path + event.url.search)}`;
            redirect(303, `/login${target}`);
        }
        if (account.totpEnabledAt && !session.mfaVerified && !MFA_PENDING_PATHS.some((p) => p.test(path))) {
            redirect(303, "/login/mfa");
        }
        if (account.mustChangePassword && !ACCOUNT_SETUP_PATHS.test(path)) {
            redirect(303, "/account?password=required");
        }
        if (config().REQUIRE_MFA && !account.totpEnabledAt && !ACCOUNT_SETUP_PATHS.test(path)) {
            redirect(303, "/account?mfa=required");
        }
    }

    const { tag, dir } = localeInfo(event.locals.locale);
    response = await resolve(event, {
        transformPageChunk: ({ html }) => html.replace("%adminspace.lang%", tag).replace("%adminspace.dir%", dir),
    });

    if (isAdminApi) {
        // Answers not produced by the Admin API router (SvelteKit errors such as 413, /oauth, /white-label)
        // must not be cached by WorkAdventure's pusher either.
        response.headers.set("cache-control", "no-store");
    }
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set(
        "Referrer-Policy",
        TOKEN_PATHS.some((p) => p.test(path)) ? "no-referrer" : "strict-origin-when-cross-origin",
    );
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (config().NODE_ENV === "production") {
        response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    if (!isMachine) {
        // /profile is opened by WorkAdventure inside an iframe: only the play origin may frame it.
        // Every other page refuses framing entirely (CSP frame-ancestors and X-Frame-Options agree).
        const csp = response.headers.get("content-security-policy");
        if (path === "/profile") {
            const origin = await playOrigin();
            const ancestors = origin ? `'self' ${origin}` : "'self'";
            response.headers.set("content-security-policy", withFrameAncestors(csp ?? "default-src 'self'", ancestors));
            response.headers.delete("X-Frame-Options");
        } else {
            if (csp) response.headers.set("content-security-policy", withFrameAncestors(csp, "'none'"));
            response.headers.set("X-Frame-Options", "DENY");
        }
    }
    return finish(event, response, started);
};

function finish(event: Parameters<Handle>[0]["event"], response: Response, started: number): Response {
    try {
        response.headers.set("X-Request-Id", event.locals.requestId);
    } catch {
        // Immutable headers (rare, e.g. fetch passthrough): the id is still in the log line.
    }
    const path = event.url.pathname;
    if (config().LOG_REQUESTS && !UNLOGGED_PATHS.some((p) => p.test(path))) {
        // Path only: query strings may carry tokens (accessToken, redirectTo...).
        logJson("info", "request", {
            requestId: event.locals.requestId,
            method: event.request.method,
            path,
            route: event.route.id,
            status: response.status,
            durationMs: Math.round(performance.now() - started),
            accountId: event.locals.account?.id,
            ip: event.locals.clientIp,
        });
    }
    return response;
}

export const handleError: HandleServerError = ({ error, event, status }) => {
    const requestId = event.locals.requestId ?? requestIdFrom(null);
    if (status !== 404) {
        logJson("error", "unhandled error", {
            requestId,
            method: event.request.method,
            path: event.url.pathname,
            route: event.route.id,
            status,
            error: describeError(error),
        });
    }
    const locale: Locale = isLocale(event.locals.locale)
        ? event.locals.locale
        : negotiateLocale(event.request.headers.get("accept-language"));
    const errors = messagesFor(locale).common.errors;
    return { message: status === 404 ? errors.notFound : errors.generic, requestId };
};
