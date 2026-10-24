/**
 * F. End-to-end workflows through the user interface, as a platform administrator: organization, world
 * with its first room, members (form, CSV import with a duplicate and a formula, CSV export), moderation
 * (ban and lift, report resolution), Room API key lifecycle and world settings. Then one workflow in Arabic.
 */
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { messagesFor } from "../../src/lib/i18n";
import { sha256Hex } from "./support/crypto";
import { state } from "./support/state";
import { db, expect, setLocaleCookie, signIn, test } from "./support/test";

const en = messagesFor("en-US");
const ar = messagesFor("ar-SA");
const suffix = randomBytes(3).toString("hex");
const ORG = { name: `Workflow Org ${suffix}`, slug: `wf-${suffix}` };
const WORLD = { name: "Workflow World", slug: `workflow-world` };
const W = `/o/${ORG.slug}/w/${WORLD.slug}`;
const FORMULA = '=HYPERLINK("http://evil.example","click")';

function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i]!;
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") {
            row.push(cell);
            cell = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else cell += c;
    }
    if (cell || row.length) rows.push([...row, cell]);
    return rows;
}

test.describe.serial("administration workflow (English)", () => {
    test.beforeEach(async ({ context }) => {
        await signIn(context, "super", "en-US");
    });

    test("create an organization", async ({ page }) => {
        await page.goto("/organizations");
        await page.locator("#field-name").fill(ORG.name);
        await page.locator("#field-slug").fill(ORG.slug);
        await page.locator("#field-countryCode").selectOption("FR");
        await page.getByRole("button", { name: en.organizations.create }).click();
        await expect(page).toHaveURL(new RegExp(`/o/${ORG.slug}$`));
        await expect(page.locator("main")).toContainText(ORG.name);
        // The organization switcher, above the navigation, shows the organization just created.
        await expect(page.locator("aside")).toContainText(ORG.name);
        const [row] = await db()<{ role: string }[]>`
            select m.role from organizations o join organization_memberships m on m.organization_id = o.id
            where o.slug = ${ORG.slug} and m.account_id = ${state().accounts.super.id}`;
        expect(row?.role).toBe("owner");
    });

    test("create a world with its first room", async ({ page }) => {
        await page.goto(`/o/${ORG.slug}/w/new`);
        await page.locator("#field-name").fill(WORLD.name);
        await expect(page.locator("#field-slug")).toHaveValue(WORLD.slug);
        await page.locator("#field-roomName").fill("Main Hall");
        await page.locator("#field-roomSlug").fill("main-hall");
        await page.locator("#field-mapKind").selectOption("tmj");
        await page.locator("#field-mapUrl").fill("https://maps.e2e.test/hall.tmj");
        await page.getByRole("button", { name: en.worlds.create.submit }).click();
        await expect(page).toHaveURL(new RegExp(`${W}$`));
        await page.goto(`${W}/rooms`);
        await expect(page.getByText("Main Hall")).toBeVisible();
        const rooms = await db()<{ slug: string; is_default: boolean; map_url: string }[]>`
            select r.slug, r.is_default, r.map_url from rooms r join worlds w on w.id = r.world_id
            join organizations o on o.id = w.organization_id where o.slug = ${ORG.slug}`;
        expect(rooms).toEqual([{ slug: "main-hall", is_default: true, map_url: "https://maps.e2e.test/hall.tmj" }]);
    });

    test("add a member with tags", async ({ page }) => {
        await page.goto(`${W}/members`);
        await page.locator("#field-email").fill(`carol@${ORG.slug}.test`);
        await page.locator("#field-name").fill("Carol Clark");
        await page.locator("#field-tags").fill("vip, staff");
        await page.getByRole("button", { name: en.common.actions.add, exact: true }).click();
        await expect(page.getByText(en.people.members.added)).toBeVisible();
        const row = page.locator("tbody tr").filter({ hasText: "Carol Clark" });
        await expect(row).toContainText("vip");
        await expect(row).toContainText("staff");
    });

    test("import a CSV with a duplicate, an invalid row and a formula", async ({ page }) => {
        await page.goto(`${W}/members`);
        const csv = [
            "email,name,tags",
            `dave@${ORG.slug}.test,Dave Doe,vip`,
            `DAVE@${ORG.slug}.test,Dave Again,`,
            `erin@${ORG.slug}.test,"${FORMULA.replace(/"/g, '""')}",staff`,
            "not-an-email,Nobody,",
        ].join("\r\n");
        await page.locator("input[type=file][name=file]").setInputFiles({
            name: "members.csv",
            mimeType: "text/csv",
            buffer: Buffer.from(`\uFEFF${csv}\r\n`),
        });
        await page.getByRole("button", { name: en.people.members.importSubmit }).click();
        const result = en.people.members.importResult
            .replace("{created}", "2")
            .replace("{updated}", "0")
            .replace("{skipped}", "2");
        await expect(page.getByText(result)).toBeVisible();
        const lineError = (line: number, code: keyof typeof en.people.members.importErrors) =>
            en.people.members.importLineError
                .replace("{line}", String(line))
                .replace("{error}", en.people.members.importErrors[code]);
        await expect(page.getByText(lineError(3, "duplicateEmail"))).toBeVisible();
        await expect(page.getByText(lineError(5, "invalidEmail"))).toBeVisible();
        const [erin] = await db()<
            { name: string }[]
        >`select name from members where email = ${`erin@${ORG.slug}.test`}`;
        // Stored as typed; neutralised on export.
        expect(erin?.name).toBe(FORMULA);
    });

    test("export the members as CSV with formulas neutralised", async ({ page }) => {
        await page.goto(`${W}/members`);
        await page.getByText(en.people.members.export, { exact: true }).click();
        const downloading = page.waitForEvent("download");
        await page.getByRole("link", { name: en.people.members.exportCsv }).click();
        const download = await downloading;
        expect(download.suggestedFilename()).toMatch(
            new RegExp(`^members-${ORG.slug}-${WORLD.slug}-\\d{4}-\\d{2}-\\d{2}\\.csv$`),
        );
        const text = await readFile((await download.path())!, "utf8");
        expect(text.startsWith("\uFEFF")).toBe(true);
        const rows = parseCsv(text.slice(1));
        const header = rows[0]!;
        const emailIndex = header.indexOf("email");
        const nameIndex = header.indexOf("name");
        const erin = rows.find((r) => r[emailIndex] === `erin@${ORG.slug}.test`);
        expect(erin?.[nameIndex]).toBe(`'${FORMULA}`);
        expect(rows.map((r) => r[emailIndex])).toEqual(
            expect.arrayContaining([`carol@${ORG.slug}.test`, `dave@${ORG.slug}.test`, `erin@${ORG.slug}.test`]),
        );
        // No cell of the file starts like a spreadsheet formula.
        expect(rows.flat().filter((cell) => /^[=+\-@\t\r]/.test(cell))).toEqual([]);
        const [audit] = await db()<
            { n: number }[]
        >`select count(*)::int as n from audit_logs where action = 'member.export'
            and account_id = ${state().accounts.super.id}`;
        expect(audit?.n).toBeGreaterThan(0);
    });

    test("ban someone from the moderation page, then lift the ban", async ({ page }) => {
        const b = en.moderation.bans;
        await page.goto(`${W}/moderation`);
        await page.locator("#field-target").fill(`dave@${ORG.slug}.test`);
        await page.locator("#field-reason").fill("Spamming the chat");
        await page.locator("#field-duration").selectOption("day");
        await page.getByRole("button", { name: b.create }).click();
        const row = page.locator("tbody tr").filter({ hasText: "Spamming the chat" });
        await expect(row).toContainText(b.status.active);
        const [ban] = await db()<{ id: string; expires_at: Date | null; revoked_at: Date | null }[]>`
            select b.id, b.expires_at, b.revoked_at from bans b join worlds w on w.id = b.world_id
            join organizations o on o.id = w.organization_id where o.slug = ${ORG.slug} and b.reason = 'Spamming the chat'`;
        expect(ban?.revoked_at).toBeNull();
        expect(ban!.expires_at!.getTime() - Date.now()).toBeGreaterThan(23 * 3600_000);

        await row.getByRole("button", { name: b.revoke }).click();
        await page.getByRole("dialog").getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByText(b.revoked)).toBeVisible();
        await expect(page.locator("tbody tr").filter({ hasText: "Spamming the chat" })).toHaveCount(0);
        await page.goto(`${W}/moderation?status=all`);
        await expect(page.locator("tbody tr").filter({ hasText: "Spamming the chat" })).toContainText(b.status.revoked);
        const [lifted] = await db()<{ revoked_by: string | null }[]>`select revoked_by from bans where id = ${ban!.id}`;
        expect(lifted?.revoked_by).toBe(state().accounts.super.id);
    });

    test("resolve a report sent by WorkAdventure", async ({ page, request }) => {
        const rp = en.moderation.reports;
        const response = await request.post("/api/report", {
            headers: { authorization: state().adminApiToken },
            data: {
                reportedUserUuid: `carol@${ORG.slug}.test`,
                reporterUserUuid: `dave@${ORG.slug}.test`,
                reportWorldSlug: `${state().playUrl}/@/${ORG.slug}/${WORLD.slug}/main-hall`,
                reportedUserComment: "Shouting in the main hall",
            },
        });
        expect(response.status()).toBe(200);
        const { id } = (await response.json()) as { id: string };
        await page.goto(`${W}/moderation/reports`);
        const card = page
            .locator("article, li, section, div.card")
            .filter({ hasText: "Shouting in the main hall" })
            .last();
        await expect(card).toContainText("Carol Clark");
        await card.locator("input[name=note]").fill("Talked to Carol");
        await card.getByRole("button", { name: rp.resolve }).click();
        await expect(page.getByText("Shouting in the main hall")).toHaveCount(0);
        const [report] = await db()<{ status: string; resolution_note: string; handled_by: string }[]>`
            select status, resolution_note, handled_by from reports where id = ${id}`;
        expect(report).toEqual({
            status: "resolved",
            resolution_note: "Talked to Carol",
            handled_by: state().accounts.super.id,
        });
        await page.goto(`${W}/moderation/reports?status=resolved`);
        await expect(page.getByText("Talked to Carol")).toBeVisible();
    });

    test("French: the resolution note label carries its own colon, after a non-breaking space", async ({
        page,
        context,
    }) => {
        // Regression: the reports page hard-coded "{note}:" so French showed "Note de traitement: …".
        const fr = messagesFor("fr-FR");
        expect(fr.moderation.reports.noteLabel).toMatch(/\u00a0:$/);
        await setLocaleCookie(context, "fr-FR");
        await page.goto(`${W}/moderation/reports?status=resolved`);
        await expect(page.locator("html")).toHaveAttribute("lang", "fr-FR");
        await expect(page.getByText("Talked to Carol")).toBeVisible();
        await expect(page.getByText(fr.moderation.reports.noteLabel, { exact: true })).toBeVisible();
        const text = await page.evaluate(() => {
            const clone = document.body.cloneNode(true) as HTMLElement;
            clone
                .querySelectorAll("code, pre, [dir=ltr], input, textarea, select, script, style")
                .forEach((n) => n.remove());
            return clone.textContent ?? "";
        });
        expect([...text.matchAll(/(?<!\d)[\p{L})»]:\s/gu)].map((m) => m[0])).toEqual([]);
    });

    test("create a Room API key, shown once, then revoke it", async ({ page, request }) => {
        const m = en.integrations;
        await page.goto(`/o/${ORG.slug}/api-keys`);
        await page.locator("#field-name").fill("CI key");
        await page.locator("#field-worldId").selectOption({ label: WORLD.name });
        await page.getByRole("button", { name: m.createKey }).click();
        await expect(page.getByText(m.keyCreated)).toBeVisible();
        const key = await page.locator("input[readonly]").inputValue();
        expect(key).toMatch(/^wa_rk_[A-Za-z0-9_-]{43}$/);
        const [stored] = await db()<{ key_hash: string; key_prefix: string }[]>`
            select key_hash, key_prefix from room_api_keys where name = 'CI key'`;
        expect(stored).toEqual({ key_hash: sha256Hex(key), key_prefix: key.slice(0, 12) });

        const roomUrl = `${state().playUrl}/@/${ORG.slug}/${WORLD.slug}/main-hall`;
        const check = () =>
            request.get(`/api/room-api/authorization?roomUrl=${encodeURIComponent(roomUrl)}`, {
                headers: { "x-api-key": key },
            });
        expect(await (await check()).json()).toMatchObject({ success: true });

        // Shown once: not in the page any more after a reload, and never stored in clear.
        await page.reload();
        expect(await page.content()).not.toContain(key);
        const row = page.locator("tbody tr").filter({ hasText: "CI key" });
        await row.getByRole("button", { name: en.common.actions.revoke }).click();
        await page.getByRole("dialog").getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByText(m.keyRevoked)).toBeVisible();
        await expect(page.locator("tbody tr").filter({ hasText: "CI key" })).toContainText(m.keyStatus.revoked);
        expect(await (await check()).json()).toMatchObject({ success: false });
    });

    test("change world settings and find them saved", async ({ page }) => {
        await page.goto(`${W}/settings`);
        await page.locator("#field-description").fill("A world for the workflow test");
        await page.locator("input[name=accessPolicy][value=authenticated]").check();
        await page.locator("#field-maxUsers").fill("42");
        await page.getByRole("button", { name: en.common.actions.saveChanges }).click();
        await expect(page.getByText(en.common.saved)).toBeVisible();
        await page.reload();
        await expect(page.locator("#field-description")).toHaveValue("A world for the workflow test");
        await expect(page.locator("input[name=accessPolicy][value=authenticated]")).toBeChecked();
        await expect(page.locator("#field-maxUsers")).toHaveValue("42");

        await page.goto(`${W}/settings/branding`);
        await page.locator('[name="branding.primaryColor"]').fill("#123456");
        await page.getByRole("button", { name: en.common.actions.saveChanges }).click();
        await expect(page.getByText(en.common.saved)).toBeVisible();
        await page.reload();
        await expect(page.locator('[name="branding.primaryColor"]')).toHaveValue("#123456");
        const [world] = await db()<
            { access_policy: string; max_users: number; settings: { branding?: { primaryColor?: string } } }[]
        >`
            select w.access_policy, w.max_users, w.settings from worlds w join organizations o on o.id = w.organization_id
            where o.slug = ${ORG.slug} and w.slug = ${WORLD.slug}`;
        expect(world?.access_policy).toBe("authenticated");
        expect(world?.max_users).toBe(42);
        expect(world?.settings.branding?.primaryColor).toBe("#123456");
    });
});

test.describe.serial("administration workflow (Arabic)", () => {
    const AR = { org: `ar-${suffix}`, world: "alam" };

    test.beforeEach(async ({ context }) => {
        await signIn(context, "super", "ar-SA");
    });

    test("create an organization and a world, then add a member, in Arabic", async ({ page }) => {
        await page.goto("/organizations");
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        await page.locator("#field-name").fill("منظمة الاختبار");
        await page.locator("#field-slug").fill(AR.org);
        await page.getByRole("button", { name: ar.organizations.create }).click();
        await expect(page).toHaveURL(new RegExp(`/o/${AR.org}$`));
        await expect(page.locator("main")).toContainText("منظمة الاختبار");

        await page.goto(`/o/${AR.org}/w/new`);
        await page.locator("#field-name").fill("عالم الاختبار");
        await page.locator("#field-slug").fill(AR.world);
        await page.getByRole("button", { name: ar.worlds.create.submit }).click();
        await expect(page).toHaveURL(new RegExp(`/o/${AR.org}/w/${AR.world}$`));

        await page.goto(`/o/${AR.org}/w/${AR.world}/members`);
        await expect(page.locator("h1")).toHaveText(ar.people.membersTitle);
        await page.locator("#field-email").fill(`farah@${AR.org}.test`);
        await page.locator("#field-name").fill("فرح");
        await page.locator("#field-tags").fill("vip");
        await page.getByRole("button", { name: ar.common.actions.add, exact: true }).click();
        await expect(page.getByText(ar.people.members.added)).toBeVisible();
        await expect(page.locator("tbody tr").filter({ hasText: "فرح" })).toContainText("vip");
        // The count sentence uses the Arabic "one" form.
        await expect(
            page.getByText(ar.people.members.count.one!.replace("{count}", "١"), { exact: true }),
        ).toBeVisible();
        const [member] = await db()<{ name: string; kind: string }[]>`
            select m.name, m.kind from members m join worlds w on w.id = m.world_id join organizations o on o.id = w.organization_id
            where o.slug = ${AR.org} and m.email = ${`farah@${AR.org}.test`}`;
        expect(member).toEqual({ name: "فرح", kind: "member" });
    });
});
