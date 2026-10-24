// Controlled experiment: is a banned identity refused when it comes back?
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const DIR = new URL(".", import.meta.url).pathname;
const PLAY_ROOM = "http://wa.localhost/@/live/office/lobby";
const ENV = Object.fromEntries(
    readFileSync(`${DIR}.env`, "utf8")
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const sql = (q) =>
    execFileSync("docker", ["exec", "adminspace-db-1", "psql", "-U", "adminspace", "-d", "adminspace_e2e", "-Atc", q])
        .toString()
        .trim();
const adminApiCallsSince = (iso) =>
    execFileSync("docker", ["compose", "--env-file", ".env", "logs", "--no-log-prefix", "--since", iso, "adminspace"], {
        cwd: DIR,
    })
        .toString()
        .split("\n")
        .filter((l) => l.includes('"path":"/api/'))
        .map((l) => {
            const j = JSON.parse(l);
            return `${j.time} ${j.path} ${j.status} ip=${j.ip}`;
        });

const browser = await chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const text = async (page) =>
    (
        await page
            .locator("body")
            .innerText()
            .catch(() => "")
    ).replace(/\s+/g, " ");

async function open(ctx, name) {
    const page = await ctx.newPage();
    await page.goto(PLAY_ROOM);
    const nameInput = page.getByPlaceholder("Enter your name");
    await Promise.race([
        nameInput.waitFor({ timeout: 45000 }),
        page
            .getByText(/Explore the room|BANNED|banned/i)
            .first()
            .waitFor({ timeout: 45000 }),
    ]).catch(() => undefined);
    if (await nameInput.count()) await nameInput.fill(name);
    for (let i = 0; i < 8; i++) {
        const t = await text(page);
        if (/Explore the room|BANNED|banned/i.test(t)) break;
        const next = page.getByRole("button", { name: /^(Continue|Save|Let's go|Enter|Join|Next|Done)/i });
        if (await next.count())
            await next
                .first()
                .click({ timeout: 3000 })
                .catch(() => undefined);
        await page.waitForTimeout(3000);
    }
    return page;
}

const ctx = await browser.newContext({ permissions: ["camera", "microphone"] });
const first = await open(ctx, "BanProbe");
console.log(
    "1. first entry:",
    /Explore the room/.test(await text(first)) ? "in game" : (await text(first)).slice(0, 120),
);
const uuid = sql(
    "select m.uuid from members m join worlds w on w.id = m.world_id where w.slug = 'office' order by m.last_seen_at desc nulls last limit 1",
);
const worldId = sql("select id from worlds where slug = 'office'");
console.log("   identity recorded:", uuid.slice(0, 8));

// An active ban, as the moderation page stores it (no expiry).
sql(
    `insert into bans (world_id, member_uuid, reason, banned_by) values ('${worldId}', '${uuid}', 'Re-entry probe', 'probe')`,
);
console.log("2. ban stored (active)");

const direct = execFileSync("curl", [
    "-s",
    "-H",
    `Authorization: ${ENV.ADMIN_API_TOKEN}`,
    `http://localhost:4100/api/room/access?playUri=${encodeURIComponent(PLAY_ROOM)}&userIdentifier=${uuid}&ipAddress=203.0.113.50`,
]).toString();
const parsed = JSON.parse(direct);
console.log("3. AdminSpace /api/room/access for the banned identity:", parsed.status, parsed.type, parsed.code);

await first.close();
await new Promise((r) => setTimeout(r, 3000));
const since = new Date().toISOString();
const second = await open(ctx, "BanProbe");
await second.waitForTimeout(5000);
const secondText = await text(second);
console.log(
    "4. new page, same identity:",
    /BANNED|banned/i.test(secondText)
        ? "REFUSED (ban screen)"
        : /Explore the room/.test(secondText)
          ? "IN GAME"
          : secondText.slice(0, 160),
);
console.log("   Admin API calls during re-entry:", adminApiCallsSince(since));

sql(`update bans set revoked_at = now() where member_uuid = '${uuid}' and revoked_at is null`);
await browser.close();
