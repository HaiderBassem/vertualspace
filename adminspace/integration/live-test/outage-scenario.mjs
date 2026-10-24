// Upstream outage: WorkAdventure's play service stops, then comes back.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const DIR = new URL(".", import.meta.url).pathname;
const ADMIN = "http://localhost:4100";
const PASSWORD = readFileSync(`${DIR}admin-password`, "utf8");
const compose = (...args) =>
    execFileSync("docker", ["compose", "--env-file", ".env", ...args], { cwd: DIR }).toString();

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(`${ADMIN}/login`);
await page.fill("#email", "live-admin@example.test");
await page.fill("#password", PASSWORD);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click("button[type=submit]")]);

async function look(label) {
    const results = {};
    for (const [name, path, pattern] of [
        ["live page", "/o/live/w/office/live", /person online|people online|unreachable|could not be reached/i],
        [
            "world overview",
            "/o/live/w/office",
            /People online now[^.]*|unreachable[^.]*\.|could not be reached[^.]*\./i,
        ],
        ["system status", "/admin", /WorkAdventure \(pusher\)\s*(OK|Failed|Not configured)?/i],
    ]) {
        const started = Date.now();
        const response = await page.goto(`${ADMIN}${path}`);
        const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
        results[name] = {
            status: response?.status(),
            ms: Date.now() - started,
            excerpt: text.match(pattern)?.[0] ?? text.slice(0, 120),
        };
    }
    console.log(label, JSON.stringify(results));
}

await look("A. WorkAdventure up:");
compose("stop", "play");
await look("B. play stopped (within the 10 s occupancy cache):");
await new Promise((r) => setTimeout(r, 11000));
await look("B2. play stopped, cache expired:");
compose("start", "play");
for (let i = 0; i < 60; i++) {
    if (compose("ps", "play", "--format", "{{.Health}}").trim() === "healthy") break;
    await new Promise((r) => setTimeout(r, 3000));
}
await new Promise((r) => setTimeout(r, 11000)); // the occupancy cache lives 10 s
await look("C. play started again:");
await browser.close();
