// World setting: effective in WorkAdventure, and persistent across restarts of AdminSpace, play and back.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const DIR = new URL(".", import.meta.url).pathname;
const ADMIN = "http://localhost:4100";
const SECTION = `${ADMIN}/o/live/w/office/settings/legal`;
const PLAY_ROOM = "http://wa.localhost/@/live/office/lobby";
const TERMS = `https://example.com/terms-live-test-${Date.now()}`;
const PASSWORD = readFileSync(`${DIR}admin-password`, "utf8");
const ENV = Object.fromEntries(
    readFileSync(`${DIR}.env`, "utf8")
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const compose = (...args) =>
    execFileSync("docker", ["compose", "--env-file", ".env", ...args], { cwd: DIR }).toString();
const mapDetails = () =>
    JSON.parse(
        execFileSync("curl", [
            "-s",
            "-H",
            `Authorization: ${ENV.ADMIN_API_TOKEN}`,
            `${ADMIN}/api/map?playUri=${encodeURIComponent(PLAY_ROOM)}`,
        ]).toString(),
    );

const browser = await chromium.launch();

async function setTerms(value) {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${ADMIN}/login`);
    await page.fill("#email", "live-admin@example.test");
    await page.fill("#password", PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click("button[type=submit]")]);
    await page.goto(SECTION);
    await page.fill('input[name="legal.termsOfUseUrl"]', value);
    await Promise.all([page.waitForLoadState("networkidle"), page.click("main form button[type=submit]")]);
    const notice = (
        await page
            .locator("[aria-live]")
            .first()
            .innerText()
            .catch(() => "")
    ).trim();
    await page.context().close();
    return notice;
}

async function termsLinkOnNameScreen() {
    const page = await (await browser.newContext()).newPage();
    await page.goto(PLAY_ROOM);
    await page.getByPlaceholder("Enter your name").waitFor({ timeout: 45000 });
    const hrefs = await page.locator("a").evaluateAll((links) => links.map((a) => a.href));
    await page.context().close();
    return hrefs.some((h) => h.startsWith(TERMS));
}

async function waitHealthy() {
    for (let i = 0; i < 60; i++) {
        const s = compose("ps", "--format", "{{.Service}}={{.Health}}");
        if (!/starting|unhealthy/.test(s)) return s.trim().replace(/\n/g, " ");
        await new Promise((r) => setTimeout(r, 3000));
    }
    return "timeout";
}

console.log("1. saved in the back office:", await setTerms(TERMS));
console.log(
    "2. /api/map legals.termsOfUseUrl =",
    mapDetails().legals?.termsOfUseUrl === TERMS ? "the new URL" : "MISSING",
);
console.log("3. WorkAdventure name screen links to it:", (await termsLinkOnNameScreen()) ? "yes" : "NO");

compose("restart", "adminspace", "play", "back");
console.log("4. restarted adminspace, play, back:", await waitHealthy());
console.log("5. after restart, /api/map still has it:", mapDetails().legals?.termsOfUseUrl === TERMS ? "yes" : "NO");
console.log("6. after restart, name screen still links to it:", (await termsLinkOnNameScreen()) ? "yes" : "NO");

console.log("7. cleared:", await setTerms(""));
console.log("8. /api/map legals after clearing =", JSON.stringify(mapDetails().legals ?? null));
await browser.close();
