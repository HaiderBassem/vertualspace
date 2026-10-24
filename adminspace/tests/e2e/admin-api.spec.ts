/**
 * C. The WorkAdventure Admin API boundary, over real HTTP against the production server: token checks,
 * uncacheable answers, rate limiting (strict server), body size limit and malformed paths.
 */
import { request as playwrightRequest, type APIResponse } from "@playwright/test";
import { ADMIN_API_ROUTES } from "../../src/lib/server/adminApi/routes";
import { state } from "./support/state";
import { db, expect, test } from "./support/test";

const playUri = () => `${state().playUrl}/@/${state().orgA.slug}/${state().orgA.world.slug}/lobby`;

function concretePath(path: string): string {
    return path.replace(":uuid", encodeURIComponent(state().orgA.members.alice!.uuid));
}

async function call(
    api: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
    method: string,
    path: string,
    headers: Record<string, string>,
    data?: unknown,
): Promise<APIResponse> {
    return api.fetch(path, { method, headers, data, maxRedirects: 0, failOnStatusCode: false });
}

function expectNoStore(response: APIResponse, label: string) {
    expect(response.headers()["cache-control"], `${label} (${response.status()})`).toBe("no-store");
}

test.describe("Admin API authentication", () => {
    const protectedRoutes = ADMIN_API_ROUTES.filter((r) => r.auth === "adminToken");

    test("every token-protected route refuses a missing or wrong token with 403 and no-store", async ({ request }) => {
        expect(protectedRoutes.length).toBeGreaterThan(20);
        const wrong: Record<string, string>[] = [
            {},
            { authorization: "wrong-token" },
            { authorization: `Bearer ${"x".repeat(43)}` },
            { authorization: `${state().adminApiToken}x` },
        ];
        for (const route of protectedRoutes) {
            for (const headers of wrong) {
                const response = await call(
                    request,
                    route.method,
                    `${concretePath(route.path)}?playUri=${encodeURIComponent(playUri())}`,
                    headers,
                    route.method === "GET" ? undefined : {},
                );
                const label = `${route.method} ${route.path} ${JSON.stringify(Object.keys(headers))}`;
                expect(response.status(), label).toBe(403);
                expectNoStore(response, label);
                expect(await response.text(), label).not.toContain("Alice");
            }
        }
    });

    test("the right token is accepted, raw or as a Bearer token", async ({ request }) => {
        for (const authorization of [state().adminApiToken, `Bearer ${state().adminApiToken}`]) {
            const response = await request.get(`/api/map?playUri=${encodeURIComponent(playUri())}`, {
                headers: { authorization },
            });
            expect(response.status()).toBe(200);
            expectNoStore(response, "GET /api/map");
            const body = (await response.json()) as { mapUrl?: string };
            expect(body.mapUrl).toBe("https://maps.e2e.test/lobby.tmj");
        }
    });

    test("routes WorkAdventure calls without the token stay open, and uncacheable", async ({ request }) => {
        const capabilities = await request.get("/api/capabilities");
        expect(capabilities.status()).toBe(200);
        expectNoStore(capabilities, "GET /api/capabilities");
        // Room API checks answer 200 with a refusal body, as WorkAdventure's contract expects.
        const roomApi = await request.get("/api/room-api/authorization", { headers: { "x-api-key": "wa_rk_unknown" } });
        expect(roomApi.status()).toBe(200);
        expect(await roomApi.json()).toMatchObject({ success: false, error: "UNAUTHENTICATED" });
        expectNoStore(roomApi, "GET /api/room-api/authorization");
    });
});

test.describe("Admin API answers", () => {
    // The 413 test counts every report of the database: the report test must not run at the same time.
    test.describe.configure({ mode: "serial" });
    test("every status of the router is marked no-store", async ({ request }) => {
        const token = { authorization: state().adminApiToken };
        const cases: [string, string, Record<string, string>, unknown, number][] = [
            ["GET", `/api/map?playUri=${encodeURIComponent(playUri())}`, token, undefined, 200],
            ["GET", "/api/does-not-exist", token, undefined, 404],
            ["POST", `/api/map?playUri=${encodeURIComponent(playUri())}`, token, {}, 405],
            ["POST", "/api/report", token, { nonsense: true }, 400],
            [
                "GET",
                `/api/members/${encodeURIComponent("nobody@e2e.test")}?playUri=${encodeURIComponent(playUri())}`,
                token,
                undefined,
                404,
            ],
            ["GET", "/api/map", {}, undefined, 403],
        ];
        for (const [method, path, headers, data, status] of cases) {
            const response = await call(request, method, path, headers, data);
            expect(response.status(), `${method} ${path}`).toBe(status);
            expectNoStore(response, `${method} ${path}`);
        }
    });

    test("a malformed path parameter answers 400, not 500", async ({ request }) => {
        for (const path of ["/api/members/%E0%A4%A", "/api/members/%ZZ", "/api/members/%E0%A4%A/chatId"]) {
            const method = path.endsWith("chatId") ? "PUT" : "GET";
            const response = await call(
                request,
                method,
                path,
                { authorization: state().adminApiToken },
                method === "PUT" ? { chatId: "x" } : undefined,
            );
            expect(response.status(), path).toBe(400);
        }
    });

    test("an oversized body answers 413 and is not processed", async ({ request }) => {
        // Regression: readJson() (src/lib/server/adminApi/router.ts) used to swallow adapter-node's lazy 413
        // error, so a body above BODY_SIZE_LIMIT answered 400 'Invalid body'.
        const reportsBefore = await db()`select count(*)::int as n from reports`;
        const comment = "x".repeat(3 * 1024 * 1024);
        const response = await request.post("/api/report", {
            headers: { authorization: state().adminApiToken, "content-type": "application/json" },
            data: JSON.stringify({
                reportedUserUuid: "someone",
                reporterUserUuid: "someone-else",
                reportWorldSlug: playUri(),
                reportedUserComment: comment,
            }),
            failOnStatusCode: false,
        });
        expect(response.status()).toBe(413);
        expectNoStore(response, "413 for an oversized body");
        expect(await db()`select count(*)::int as n from reports`).toEqual(reportsBefore);
    });

    test("a report within limits is recorded", async ({ request }) => {
        const response = await request.post("/api/report", {
            headers: { authorization: state().adminApiToken },
            data: {
                reportedUserUuid: "api-reported@a.e2e.test",
                reporterUserUuid: "api-reporter@a.e2e.test",
                reportWorldSlug: playUri(),
                reportedUserComment: "Reported through the Admin API",
            },
        });
        expect(response.status()).toBe(200);
        expectNoStore(response, "POST /api/report");
        const { id } = (await response.json()) as { id: string };
        const [row] = await db()<
            { world_id: string; status: string }[]
        >`select world_id, status from reports where id = ${id}`;
        expect(row).toEqual({ world_id: state().orgA.world.id, status: "open" });
    });
});

test.describe("Admin API rate limit (strict server: 5 calls per minute and client address)", () => {
    test("the 6th call within a minute answers 429 with Retry-After", async () => {
        const ip = `192.0.2.${Math.floor(Math.random() * 200) + 20}`;
        const api = await playwrightRequest.newContext({
            baseURL: state().strictURL,
            extraHTTPHeaders: { "x-forwarded-for": ip },
        });
        // Align on a fresh fixed window when the current one is about to end.
        const secondsLeft = 60 - (Math.floor(Date.now() / 1000) % 60);
        if (secondsLeft < 5) await new Promise((r) => setTimeout(r, secondsLeft * 1000 + 200));
        const statuses: number[] = [];
        for (let i = 0; i < 5; i++) {
            statuses.push((await api.get("/api/capabilities")).status());
        }
        expect(statuses).toEqual([200, 200, 200, 200, 200]);
        const limited = await api.get("/api/capabilities");
        expect(limited.status()).toBe(429);
        const retryAfter = Number(limited.headers()["retry-after"]);
        expect(Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 60).toBe(true);
        expect(limited.headers()["content-type"]).toContain("application/json");
        // Another client address is not affected.
        const other = await playwrightRequest.newContext({
            baseURL: state().strictURL,
            extraHTTPHeaders: { "x-forwarded-for": "198.18.0.7" },
        });
        expect((await other.get("/api/capabilities")).status()).toBe(200);
        await other.dispose();
        await api.dispose();
    });

    test("the 429 answer is uncacheable like every other Admin API answer", async () => {
        // Regression: the rate limiter in src/hooks.server.ts used to answer 429 without Cache-Control: no-store.
        const ip = `192.0.2.${Math.floor(Math.random() * 19) + 1}`;
        const api = await playwrightRequest.newContext({
            baseURL: state().strictURL,
            extraHTTPHeaders: { "x-forwarded-for": ip },
        });
        let limited: APIResponse | undefined;
        for (let i = 0; i < 12 && !limited; i++) {
            const response = await api.get("/api/capabilities");
            if (response.status() === 429) limited = response;
        }
        expect(limited).toBeDefined();
        expectNoStore(limited!, "429 from the rate limiter");
        await api.dispose();
    });
});

test.describe("back-office body size limit", () => {
    test("a form post above BODY_SIZE_LIMIT answers 413 and imports nothing", async ({ as }) => {
        const api = await as("owner");
        const { orgA } = state();
        const before = await db()`select count(*)::int as n from members where world_id = ${orgA.world.id}`;
        const csv = `email,name\n${"big@a.e2e.test,x\n".repeat(200_000)}`;
        const response = await api.post(`/o/${orgA.slug}/w/${orgA.world.slug}/members?/import`, {
            headers: { origin: state().baseURL, accept: "application/json" },
            multipart: { file: { name: "big.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
            failOnStatusCode: false,
        });
        expect(response.status()).toBe(413);
        expect(await db()`select count(*)::int as n from members where world_id = ${orgA.world.id}`).toEqual(before);
    });
});
