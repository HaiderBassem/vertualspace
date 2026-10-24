/**
 * Performance measurements against the production build of an end-to-end environment (read-only GETs):
 *
 *   E2E_KEEP=1 npm run test:e2e          # leaves the servers, the fakes and the database running
 *   npx tsx scripts/perf-measure.ts      # prints the measurements as JSON
 *   npx tsx scripts/e2e-teardown.ts      # stops them and drops the run's database
 *
 * 1. server latency, sequential (10 warm-up requests, then 100): p50, p95, max per endpoint;
 * 2. under concurrency (20 clients, 400 requests): throughput and p95 for the endpoints WorkAdventure calls;
 * 3. front-end in Chromium with an empty cache: requests, JS/CSS bytes on the wire, DOMContentLoaded, load.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const STATE = path.resolve("node_modules/.cache/adminspace-e2e/state.json");
const state = JSON.parse(readFileSync(STATE, "utf8")) as {
    enterpriseURL: string;
    adminApiToken: string;
    password: string;
    playUrl: string;
    componentId: string;
    accounts: Record<string, { email: string }>;
    orgE: { slug: string; worlds: { hq: { id: string; slug: string } } };
};
const BASE = state.enterpriseURL;

async function login(email: string): Promise<string> {
    const response = await fetch(`${BASE}/login`, {
        method: "POST",
        headers: { origin: BASE, "content-type": "application/x-www-form-urlencoded", accept: "text/html" },
        body: new URLSearchParams({ email, password: state.password, redirectTo: "/" }),
        redirect: "manual",
    });
    const cookie = response.headers.getSetCookie().find((c) => c.includes("adminspace_session"));
    if (!cookie) throw new Error(`login failed for ${email}: ${response.status}`);
    return cookie.split(";")[0]!;
}

function percentile(sorted: number[], p: number): number {
    return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

const round = (ms: number) => Math.round(ms * 10) / 10;

async function timed(url: string, headers: Record<string, string>): Promise<number> {
    const start = performance.now();
    const response = await fetch(url, { headers, redirect: "manual" });
    await response.arrayBuffer();
    if (response.status !== 200) throw new Error(`${url}: HTTP ${response.status}`);
    return performance.now() - start;
}

async function sequential(url: string, headers: Record<string, string> = {}) {
    for (let i = 0; i < 10; i++) await timed(url, headers);
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) samples.push(await timed(url, headers));
    samples.sort((a, b) => a - b);
    return { p50: round(percentile(samples, 50)), p95: round(percentile(samples, 95)), max: round(samples.at(-1)!) };
}

async function concurrent(url: string, headers: Record<string, string> = {}, clients = 20, total = 400) {
    const samples: number[] = [];
    let next = 0;
    const start = performance.now();
    await Promise.all(
        Array.from({ length: clients }, async () => {
            while (next < total) {
                next++;
                samples.push(await timed(url, headers));
            }
        }),
    );
    const seconds = (performance.now() - start) / 1000;
    samples.sort((a, b) => a - b);
    return { requestsPerSecond: Math.round(total / seconds), p95: round(percentile(samples, 95)) };
}

const admin = { cookie: await login(state.accounts.entAdmin!.email) };
const org = `${BASE}/o/${state.orgE.slug}`;
const collection = `${BASE}/wa/worlds/${state.orgE.worlds.hq.id}/collection.json`;
const prefabs = (await (await fetch(collection)).json()) as { collection: { imagePath: string }[] };
const asset = prefabs.collection[0]?.imagePath;
const api = { authorization: `Bearer ${state.adminApiToken}` };
const playUri = `${state.playUrl}/@/${state.orgE.slug}/${state.orgE.worlds.hq.slug}/office`;
const mapUrl = `${BASE}/api/map?playUri=${encodeURIComponent(playUri)}`;
const accessUrl =
    `${BASE}/api/room/access?playUri=${encodeURIComponent(playUri)}` +
    `&userIdentifier=${encodeURIComponent(state.accounts.entEmployee!.email)}&ipAddress=203.0.113.9`;

const results: Record<string, unknown> = {};
results.sequential = {
    "page /o/{org} (overview)": await sequential(org, admin),
    "page /o/{org}/components?q=desk": await sequential(`${org}/components?q=desk`, admin),
    "page /o/{org}/components/{id}": await sequential(`${org}/components/${state.componentId}`, admin),
    "page /o/{org}/team": await sequential(`${org}/team`, admin),
    "GET /wa/worlds/{id}/collection.json": await sequential(collection),
    ...(asset ? { "GET /wa/assets/… (PNG)": await sequential(asset) } : {}),
    "Admin API GET /api/map": await sequential(mapUrl, api),
    "Admin API GET /api/room/access (employee)": await sequential(accessUrl, api),
};
results.concurrent = {
    "GET /wa/worlds/{id}/collection.json": await concurrent(collection),
    "Admin API GET /api/map": await concurrent(mapUrl, api),
    "Admin API GET /api/room/access (employee)": await concurrent(accessUrl, api),
};

const IN_PAGE = `(() => {
    const resources = performance.getEntriesByType("resource");
    const navigation = performance.getEntriesByType("navigation")[0];
    const bytes = (kind) =>
        resources.filter((r) => r.name.split("?")[0].endsWith(kind)).reduce((sum, r) => sum + r.transferSize, 0);
    return {
        requests: resources.length + 1,
        htmlBytes: navigation.transferSize,
        jsBytes: bytes(".js"),
        cssBytes: bytes(".css"),
        domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
        loadMs: Math.round(navigation.loadEventEnd),
    };
})()`;

const browser = await chromium.launch();
const frontEnd: Record<string, unknown> = {};
const [cookieName, cookieValue] = admin.cookie.split("=") as [string, string];
for (const page of ["", "/components", `/components/${state.componentId}`, "/team"]) {
    const context = await browser.newContext({ baseURL: BASE });
    // A __Host- cookie: Secure, path /, no Domain (Chromium treats http://localhost as a secure origin).
    await context.addCookies([
        { name: cookieName, value: cookieValue, domain: new URL(BASE).hostname, path: "/", secure: true },
    ]);
    const tab = await context.newPage();
    await tab.goto(`${org}${page}`, { waitUntil: "load" });
    // A string, not a function: tsx would add helpers (__name) that do not exist in the page.
    frontEnd[`/o/{org}${page.replace(state.componentId, "{id}")}`] = await tab.evaluate(IN_PAGE);
    await context.close();
}
await browser.close();
results.frontEnd = frontEnd;
results.environment = { node: process.version, platform: `${process.platform} ${process.arch}`, server: BASE };
console.info(JSON.stringify(results, null, 2));
