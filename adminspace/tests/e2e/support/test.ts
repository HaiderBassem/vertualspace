/**
 * Shared test API of the e2e specs: `test` with the run's base URL, logged-in contexts per account,
 * a direct database connection for verifications, and helpers to call SvelteKit form actions the way
 * a browser (or an attacker) would.
 */
import {
    test as base,
    expect,
    request as playwrightRequest,
    type APIRequestContext,
    type BrowserContext,
    type Page,
} from "@playwright/test";
import * as devalue from "devalue";
import postgres from "postgres";
import { state, type AccountKey } from "./state";

export { expect };

export interface ActionResult {
    /** HTTP status of the answer. */
    http: number;
    /** SvelteKit action result type: success, failure, redirect or error. */
    type: "success" | "failure" | "redirect" | "error" | "html";
    /** Status carried by the result (failures and redirects are answered 200 with their own status). */
    status: number;
    data: unknown;
    location?: string;
}

/** True when the action refused the request (forbidden, not found or invalid), whatever the channel. */
export function refused(result: ActionResult): boolean {
    return (result.type === "failure" || result.type === "error") && [400, 403, 404].includes(result.status);
}

/** True when the permission check let the request through (it may still fail on its data). */
export function permitted(result: ActionResult): boolean {
    return result.status !== 403 && result.status !== 401 && result.http !== 403 && result.status < 500;
}

/** Posts a form action as a SvelteKit client would (Origin of the site, JSON action answer). */
export async function postAction(
    api: APIRequestContext,
    path: string,
    fields: Record<string, string> = {},
    options: {
        origin?: string | null;
        multipart?: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>;
    } = {},
): Promise<ActionResult> {
    const headers: Record<string, string> = { accept: "application/json", "x-sveltekit-action": "true" };
    const origin = options.origin === undefined ? state().baseURL : options.origin;
    if (origin !== null) headers.origin = origin;
    const response = await api.post(path, {
        headers,
        ...(options.multipart ? { multipart: options.multipart } : { form: fields }),
        maxRedirects: 0,
        failOnStatusCode: false,
    });
    const http = response.status();
    const text = await response.text();
    let body: { type?: ActionResult["type"]; status?: number; data?: string; location?: string; error?: unknown };
    try {
        body = JSON.parse(text) as typeof body;
    } catch {
        return { http, type: "html", status: http, data: text };
    }
    const type = body.type ?? "html";
    let data: unknown = body.error;
    if (typeof body.data === "string") {
        try {
            data = devalue.parse(body.data);
        } catch {
            data = body.data;
        }
    }
    return { http, type, status: body.status ?? http, data, location: body.location };
}

/** Logs in through the real login form endpoint; the returned context carries the session cookie. */
export async function loginRequest(account: AccountKey, baseURL = state().baseURL): Promise<APIRequestContext> {
    const api = await playwrightRequest.newContext({ baseURL });
    const result = await postAction(
        api,
        "/login",
        { email: state().accounts[account].email, password: state().password, redirectTo: "/" },
        { origin: baseURL },
    );
    if (result.type !== "redirect") {
        throw new Error(`login of ${account} failed: ${JSON.stringify(result)}`);
    }
    return api;
}

const sessionCache = new Map<AccountKey, Awaited<ReturnType<APIRequestContext["storageState"]>>>();

/** Session cookies of an account, logged in once per worker. */
export async function sessionState(account: AccountKey) {
    let cached = sessionCache.get(account);
    if (!cached) {
        const api = await loginRequest(account);
        cached = await api.storageState();
        await api.dispose();
        sessionCache.set(account, cached);
    }
    return cached;
}

/** Puts an account's session (and optionally a locale choice) into a browser context. */
export async function signIn(context: BrowserContext, account: AccountKey, locale?: string): Promise<void> {
    const { cookies } = await sessionState(account);
    await context.addCookies(cookies);
    if (locale) await setLocaleCookie(context, locale);
}

export async function setLocaleCookie(context: BrowserContext, locale: string): Promise<void> {
    const url = new URL(state().baseURL);
    await context.addCookies([
        {
            name: "adminspace_locale",
            value: locale,
            domain: url.hostname,
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
        },
    ]);
}

/**
 * Where a login without redirectTo lands: the person's organization when they belong to exactly one,
 * otherwise the list of their organizations (src/routes/+page.server.ts).
 */
export const LANDING = /\/(o\/[a-z0-9-]+|organizations)$/;

/** Opens a page and waits until it is interactive (src/routes/+layout.svelte marks <html data-hydrated>). */
export async function gotoReady(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** Logs in through the login page, as a person would. */
export async function loginWithForm(page: Page, account: AccountKey, password = state().password): Promise<void> {
    await page.locator("#email").fill(state().accounts[account].email);
    await page.locator("#password").fill(password);
    await page.locator("form:has(input[name=password]) button[type=submit]").click();
}

let sqlClient: postgres.Sql | undefined;

/** A connection to the run's database (one per worker), for verifications. */
export function db(): postgres.Sql {
    sqlClient ??= postgres(state().databaseUrl, { max: 2, onnotice: () => {}, connection: { TimeZone: "UTC" } });
    return sqlClient;
}

interface Fixtures {
    /** Request context logged in as the given account (disposed after the test). */
    as: (account: AccountKey) => Promise<APIRequestContext>;
}

export const test = base.extend<Fixtures>({
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures take their dependencies as an object pattern
    baseURL: async ({}, use) => {
        await use(state().baseURL);
    },
    // eslint-disable-next-line no-empty-pattern -- see above
    as: async ({}, use) => {
        const contexts: APIRequestContext[] = [];
        await use(async (account) => {
            const api = await playwrightRequest.newContext({
                baseURL: state().baseURL,
                storageState: await sessionState(account),
            });
            contexts.push(api);
            return api;
        });
        await Promise.all(contexts.map((c) => c.dispose()));
    },
});

/** A random RFC 9562 version 4 UUID that matches nothing. */
export function randomUuid(): string {
    return crypto.randomUUID();
}
