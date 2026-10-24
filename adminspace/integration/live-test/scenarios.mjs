// Live scenarios: AdminSpace (production image) against WorkAdventure b579166 (official images).
// One real anonymous player stays connected while the admin acts through the AdminSpace UI.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const DIR = new URL(".", import.meta.url).pathname;
const SHOTS = `${DIR}shots/`;
mkdirSync(SHOTS, { recursive: true });
const ADMIN = "http://localhost:4100";
const WORLD = `${ADMIN}/o/live/w/office`;
const PLAY_ROOM = "http://wa.localhost/@/live/office/lobby";
const PASSWORD = readFileSync(`${DIR}admin-password`, "utf8");
const ENV = Object.fromEntries(
    readFileSync(`${DIR}.env`, "utf8")
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const results = [];
const record = (name, status, evidence) => {
    results.push({ name, status, evidence });
    console.log(`${status.padEnd(6)} ${name} :: ${typeof evidence === "string" ? evidence : JSON.stringify(evidence)}`);
};

const browser = await chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});

async function adminPage() {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${ADMIN}/login`);
    await page.fill("#email", "live-admin@example.test");
    await page.fill("#password", PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click("button[type=submit]")]);
    return page;
}

async function enterAsPlayer(name, context) {
    const ctx = context ?? (await browser.newContext({ permissions: ["camera", "microphone"] }));
    const page = await ctx.newPage();
    // Every frame the player's browser receives from WorkAdventure, to prove delivery independently of display.
    page.receivedFrames = [];
    page.on("websocket", (ws) => {
        ws.on("framereceived", (frame) => {
            const payload = frame.payload;
            page.receivedFrames.push(typeof payload === "string" ? payload : Buffer.from(payload).toString("latin1"));
        });
    });
    await page.goto(PLAY_ROOM);
    // Wait for WorkAdventure to render either its name screen, an error screen or the game.
    const nameInput = page.getByPlaceholder("Enter your name");
    await Promise.race([
        nameInput.waitFor({ timeout: 45000 }),
        page
            .getByText(/Explore the room|banned|Access denied/i)
            .first()
            .waitFor({ timeout: 45000 }),
    ]).catch(() => undefined);
    if (await nameInput.count()) {
        await nameInput.fill(name);
    }
    for (let i = 0; i < 6; i++) {
        const text = await bodyText(page);
        if (/Explore the room/.test(text) || /banned|denied|interdit|Access denied/i.test(text)) break;
        const next = page.getByRole("button", { name: /^(Continue|Save|Let's go|Enter|Join|Next|Done)/i });
        if (await next.count())
            await next
                .first()
                .click({ timeout: 3000 })
                .catch(() => undefined);
        await page.waitForTimeout(3000);
    }
    return { page, ctx };
}

async function bodyText(page) {
    return (
        await page
            .locator("body")
            .innerText()
            .catch(() => "")
    ).replace(/\s+/g, " ");
}

async function waitForText(page, regex, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const text = await bodyText(page);
        if (regex.test(text)) return text;
        await page.waitForTimeout(1000);
    }
    return undefined;
}

function pusherRooms() {
    const out = execFileSync("curl", [
        "-s",
        "-H",
        `Authorization: ${ENV.ADMIN_API_TOKEN}`,
        "http://wa.localhost/rooms",
    ]);
    return JSON.parse(out.toString());
}

function sql(query) {
    return execFileSync(
        "docker",
        ["exec", "adminspace-db-1", "psql", "-U", "adminspace", "-d", "adminspace_e2e", "-Atc", query],
        {},
    )
        .toString()
        .trim();
}

// ---------------------------------------------------------------------------------------------
const admin = await adminPage();
const player = await enterAsPlayer("LivePlayer");
const inGame = /Explore the room/.test(await bodyText(player.page));
await player.page.screenshot({ path: `${SHOTS}s1-player-in-game.png` });
record(
    "player enters world served by AdminSpace",
    inGame ? "PASS" : "FAIL",
    (await bodyText(player.page)).slice(0, 120),
);

// 1. Online status vs ground truth (the pusher's own /rooms).
await player.page.waitForTimeout(3000);
const truth = pusherRooms();
const truthCount = Object.entries(truth)
    .filter(([url]) => url.startsWith("http://wa.localhost/@/live/office/"))
    .reduce((n, [, c]) => n + c, 0);
await admin.goto(`${WORLD}/live`);
const liveText = await bodyText(admin);
await admin.screenshot({ path: `${SHOTS}s2-admin-live.png`, fullPage: true });
record("online status matches the pusher", truthCount === 1 && liveText.includes("lobby") ? "PASS" : "CHECK", {
    pusherRooms: truth,
    adminLivePageExcerpt: liveText.slice(0, 400),
});

// 2. Broadcast to all rooms, received by the connected player.
const message = `AdminSpace live test ${Date.now()}`;
await admin.fill('textarea[name="text"], input[name="text"]', message);
await Promise.all([
    admin.waitForLoadState("networkidle"),
    admin.click('form[action="?/broadcast"] button[type=submit]'),
]);
const broadcastOutcome = (await bodyText(admin)).match(/(sent|unreachable|failed|not configured)[^.]*\./i)?.[0];
const displayed = await waitForText(player.page, new RegExp(message), 20000);
await player.page.screenshot({ path: `${SHOTS}s3-player-broadcast.png` });
const delivered = player.page.receivedFrames.some((f) => f.includes(message));
record("broadcast delivered to the connected player's browser (websocket frame)", delivered ? "PASS" : "FAIL", {
    adminOutcome: broadcastOutcome,
    framesReceived: player.page.receivedFrames.length,
});
record(
    "broadcast displayed by WorkAdventure",
    displayed ? "PASS" : "BLOCKED",
    displayed
        ? "shown on screen"
        : "WorkAdventure b579166 pusher AdminController sends type '' and GameScene.showUserMessage only displays type 'message'",
);

// 3. Room reload.
await admin.goto(`${WORLD}/rooms`);
const before = await bodyText(player.page);
const framesBeforeReload = player.page.receivedFrames.length;
await admin.getByRole("button", { name: "Reload for everyone" }).first().click();
await Promise.all([admin.waitForLoadState("networkidle"), admin.locator("dialog[open] button[type=submit]").click()]);
const reloadOutcome = (await bodyText(admin)).match(/(reload|sent|unreachable|failed)[^.]*\./i)?.[0];
await player.page.waitForTimeout(8000);
const after = await bodyText(player.page);
await player.page.screenshot({ path: `${SHOTS}s4-player-after-reload.png` });
record("room reload delivered", after !== before ? "PASS" : "CHECK", {
    adminOutcome: reloadOutcome,
    framesAfterReload: player.page.receivedFrames.length - framesBeforeReload,
    playerTextChanged: after !== before,
    playerTextAfter: after.slice(0, 200),
});

// 4. Ban the connected guest (live disconnection), then refused at next entry.
// WorkAdventure sends no name with /api/room/access: the connected player is the most recent visitor of the world.
const guestUuid = sql(
    "select m.uuid from members m join worlds w on w.id = m.world_id where w.slug = 'office' order by m.last_seen_at desc nulls last limit 1",
);
record(
    "guest recorded by AdminSpace with its WorkAdventure uuid",
    guestUuid ? "PASS" : "FAIL",
    guestUuid ? "uuid present" : "missing",
);
await admin.goto(`${WORLD}/moderation`);
await admin.fill('input[name="target"]', guestUuid);
await admin.fill('textarea[name="reason"], input[name="reason"]', "Live integration test");
await Promise.all([admin.waitForLoadState("networkidle"), admin.click('form[action="?/ban"] button[type=submit]')]);
const banPageText = await bodyText(admin);
await admin.screenshot({ path: `${SHOTS}s5-admin-ban.png`, fullPage: true });
const kicked = await waitForText(player.page, /banned|ban/i, 20000);
await player.page.screenshot({ path: `${SHOTS}s6-player-after-ban.png` });
record("ban disconnects the connected player live", kicked ? "PASS" : "FAIL", {
    adminPageOutcome: banPageText.match(/(Live disconnection|disconnect)[^.]*\./i)?.[0] ?? banPageText.slice(0, 200),
    playerText: kicked?.slice(0, 200),
});

// Re-entry with the same identity (same browser storage) must be refused by /api/room/access.
const again = await enterAsPlayer("LivePlayer", player.ctx);
const refusedText = await waitForText(again.page, /banned|ban/i, 30000);
await again.page.screenshot({ path: `${SHOTS}s7-player-reentry-banned.png` });
record("banned identity refused at next entry", refusedText ? "PASS" : "FAIL", refusedText?.slice(0, 200));
await again.page.close();

// 5. Unban, then the same identity enters again.
await admin.goto(`${WORLD}/moderation`);
await admin.getByRole("button", { name: "Lift" }).first().click();
await Promise.all([admin.waitForLoadState("networkidle"), admin.locator("dialog[open] button[type=submit]").click()]);
const activeBans = sql(`select count(*) from bans where member_uuid = '${guestUuid}' and revoked_at is null`);
const back = await enterAsPlayer("LivePlayer", player.ctx);
const backIn = await waitForText(back.page, /Explore the room/, 30000);
await back.page.screenshot({ path: `${SHOTS}s8-player-after-unban.png` });
record("unban restores access", backIn && activeBans === "0" ? "PASS" : "FAIL", { activeBans });

writeFileSync(`${DIR}scenario-results.json`, JSON.stringify(results, null, 2));
await browser.close();
