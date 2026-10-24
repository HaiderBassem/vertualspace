/**
 * E. Accessibility: axe-core scans (WCAG 2.0/2.1/2.2 A and AA rules) of the main pages in English and
 * Arabic, keyboard use (skip link, tab order, focus visibility, modal confirmation dialog) and responsive
 * layout without horizontal scrolling at 375x812 and 1280x800.
 *
 * Every violation is attached to the test (axe-<page>.json) and summarized in the annotations; the
 * test fails on serious or critical ones.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locale } from "../../src/lib/i18n";
import { messagesFor } from "../../src/lib/i18n";
import { state } from "./support/state";
import { expect, setLocaleCookie, signIn, test } from "./support/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PAGES: { name: string; path: () => string; anonymous?: boolean }[] = [
    { name: "login", path: () => "/login", anonymous: true },
    { name: "worlds", path: () => "/worlds" },
    { name: "organizations", path: () => "/organizations" },
    { name: "organization", path: () => "/o/orga" },
    { name: "world overview", path: () => "/o/orga/w/worlda" },
    { name: "rooms", path: () => "/o/orga/w/worlda/rooms" },
    { name: "room", path: () => `/o/orga/w/worlda/rooms/${state().orgA.rooms[0]!.id}` },
    { name: "members", path: () => "/o/orga/w/worlda/members" },
    { name: "member", path: () => `/o/orga/w/worlda/members/${state().orgA.members.alice!.id}` },
    { name: "tags", path: () => "/o/orga/w/worlda/tags" },
    { name: "moderation", path: () => "/o/orga/w/worlda/moderation" },
    { name: "reports", path: () => "/o/orga/w/worlda/moderation/reports?status=all" },
    { name: "world settings", path: () => "/o/orga/w/worlda/settings" },
    { name: "settings section", path: () => "/o/orga/w/worlda/settings/integrations" },
    { name: "new world", path: () => "/o/orga/w/new" },
    { name: "team", path: () => "/o/orga/team" },
    { name: "desks", path: () => "/o/orga/desks" },
    { name: "who's in", path: () => "/o/orga/presence" },
    { name: "workspaces", path: () => "/o/orga/workspaces" },
    { name: "workspace", path: () => "/o/orga/workspaces/main" },
    { name: "directory", path: () => "/o/orga/directory" },
    { name: "components", path: () => "/o/orga/components" },
    { name: "component", path: () => `/o/orga/components/${state().componentId}` },
    { name: "component upload", path: () => "/o/orga/components/upload" },
    { name: "world components", path: () => "/o/orga/w/worlda/components" },
    { name: "admin jobs", path: () => "/admin/jobs" },
    { name: "admin email", path: () => "/admin/email" },
    { name: "admin components", path: () => "/admin/components" },
    { name: "api keys", path: () => "/o/orga/api-keys" },
    { name: "domains", path: () => "/o/orga/domains" },
    { name: "integrations", path: () => "/o/orga/integrations" },
    { name: "integration", path: () => "/o/orga/integrations/slack" },
    { name: "notification destinations", path: () => "/o/orga/integrations/notifications" },
    { name: "delivery log", path: () => "/o/orga/integrations/deliveries" },
    { name: "automation api", path: () => "/o/orga/integrations/automation" },
    { name: "my integrations", path: () => "/o/orga/my-integrations" },
    { name: "account", path: () => "/account" },
    { name: "admin status", path: () => "/admin" },
    { name: "admin accounts", path: () => "/admin/accounts" },
];

for (const locale of ["en-US", "ar-SA"] as Locale[]) {
    test.describe(`axe ${locale}`, () => {
        for (const target of PAGES) {
            test(`${target.name}`, async ({ page, context }, testInfo) => {
                if (target.anonymous) await setLocaleCookie(context, locale);
                else await signIn(context, "super", locale);
                await page.goto(target.path());
                await expect(page.locator("main").first()).toBeVisible();
                await expect(page.locator("html")).toHaveAttribute("lang", locale);
                const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
                testInfo.annotations.push({
                    type: "axe summary",
                    description: `${results.passes.length} rules passed, ${results.violations.length} violated, ${results.incomplete.length} need review`,
                });
                for (const item of results.incomplete) {
                    testInfo.annotations.push({
                        type: "axe needs review",
                        description: `${item.id} (${item.nodes.length}): ${item.help}`,
                    });
                }
                const violations = results.violations.map((v) => ({
                    id: v.id,
                    impact: v.impact,
                    help: v.help,
                    nodes: v.nodes.length,
                    targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
                }));
                await testInfo.attach(`axe-${locale}-${target.name}.json`, {
                    body: JSON.stringify(violations, null, 2),
                    contentType: "application/json",
                });
                for (const v of violations) {
                    testInfo.annotations.push({
                        type: `axe ${v.impact}`,
                        description: `${v.id} (${v.nodes}): ${v.targets.join(" | ")}`,
                    });
                }
                const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
                expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
            });
        }
    });
}

test.describe("page structure", () => {
    for (const target of PAGES) {
        test(`${target.name} has exactly one level-one heading`, async ({ page, context }) => {
            if (target.anonymous) await setLocaleCookie(context, "en-US");
            else await signIn(context, "super");
            await page.goto(target.path());
            await expect(page.locator("main").first()).toBeVisible();
            await expect(page.locator("h1")).toHaveCount(1);
            await expect(page).toHaveTitle(/\S/);
        });
    }
});

test.describe("keyboard", () => {
    test("the skip link is the first stop and moves focus to the main content", async ({ page, context }) => {
        await signIn(context, "super");
        await page.goto("/worlds");
        await page.keyboard.press("Tab");
        const skip = page.getByRole("link", { name: messagesFor("en-US").common.skipToContent });
        await expect(skip).toBeFocused();
        const box = await skip.boundingBox();
        expect(box && box.width > 1 && box.height > 1).toBe(true);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#main$/);
        await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("main");
        // The next Tab continues from the main content, not from the top of the page.
        await page.keyboard.press("Tab");
        const inMain = await page.evaluate(() => Boolean(document.activeElement?.closest("main")));
        expect(inMain).toBe(true);
    });

    test("tab order reaches the navigation, the language switcher and the forms, with a visible focus", async ({
        page,
        context,
    }) => {
        await signIn(context, "owner");
        await page.goto("/o/orga/w/worlda/members");
        const m = messagesFor("en-US");
        const reached = new Set<string>();
        const invisibleFocus: string[] = [];
        for (let i = 0; i < 120; i++) {
            await page.keyboard.press("Tab");
            const info = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null;
                if (!el || el === document.body) return null;
                const style = getComputedStyle(el);
                const label = el.getAttribute("name") ?? el.id ?? "";
                return {
                    key: `${el.tagName.toLowerCase()}|${(el.innerText || "").trim().slice(0, 40)}|${label}`,
                    inNav: Boolean(el.closest("nav")),
                    visibleFocus:
                        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
                        style.boxShadow !== "none",
                };
            });
            if (!info) continue;
            reached.add(info.key);
            if (!info.visibleFocus) invisibleFocus.push(info.key);
        }
        const keys = [...reached];
        expect(keys.some((k) => k.startsWith(`a|${m.shell.nav.myWorlds}`))).toBe(true);
        expect(keys.some((k) => k.startsWith(`a|${m.shell.nav.world.members}`))).toBe(true);
        expect(keys.some((k) => k.endsWith("|locale"))).toBe(true);
        expect(keys.some((k) => k.startsWith("input|") && k.endsWith("|q"))).toBe(true);
        expect(keys.some((k) => k.startsWith("input|") && k.endsWith("|email"))).toBe(true);
        expect(keys.some((k) => k.startsWith("input|") && k.endsWith("|file"))).toBe(true);
        expect(invisibleFocus).toEqual([]);
    });

    test("the confirmation dialog traps focus, closes with Escape and gives focus back", async ({ page, context }) => {
        await signIn(context, "super");
        await page.goto("/o/orga/w/worlda/moderation");
        const m = messagesFor("en-US");
        const trigger = page.getByRole("button", { name: m.moderation.bans.revoke }).first();
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAccessibleName(m.moderation.bans.revokeTitle);
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab");
            const inside = await page.evaluate(() => {
                const active = document.activeElement;
                const open = document.querySelector("dialog[open]");
                // Focus may briefly leave the document for the browser UI; it must never land on the page behind.
                return active === document.body || active === null || Boolean(open?.contains(active));
            });
            expect(inside, `focus escaped the dialog after ${i + 1} key presses`).toBe(true);
        }
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });
});

test.describe("responsive layout", () => {
    const VIEWPORTS = [
        { width: 375, height: 812 },
        { width: 1280, height: 800 },
    ];
    const RESPONSIVE = [
        "login",
        "worlds",
        "world overview",
        "members",
        "moderation",
        "reports",
        "world settings",
        "api keys",
        "account",
        "admin status",
        "admin accounts",
    ];

    // Regressions (WCAG 1.4.10 Reflow): moderation, world settings, api keys and admin accounts used to scroll
    // horizontally at 375px (bans column and settings navigation could not shrink; the .sr-only header labels
    // of the tables escaped their scroll box).

    for (const viewport of VIEWPORTS) {
        for (const locale of ["en-US", "ar-SA"] as Locale[]) {
            for (const target of PAGES.filter((p) => RESPONSIVE.includes(p.name))) {
                test(`${viewport.width}x${viewport.height} ${locale} ${target.name}: no horizontal overflow`, async ({
                    browser,
                }, testInfo) => {
                    const context = await browser.newContext({ baseURL: state().baseURL, viewport });
                    if (target.anonymous) await setLocaleCookie(context, locale);
                    else await signIn(context, "super", locale);
                    const page = await context.newPage();
                    await page.goto(target.path());
                    await expect(page.locator("main").first()).toBeVisible();
                    await testInfo.attach(`${viewport.width}-${locale}-${target.name}.png`, {
                        body: await page.screenshot({ fullPage: true }),
                        contentType: "image/png",
                    });
                    const sizes = await page.evaluate(() => {
                        const inner = window.innerWidth;
                        // The outermost elements sticking out of the viewport (inside a scrollable box they do not count).
                        const culprits = [...document.querySelectorAll("body *")]
                            .filter((el) => {
                                const r = el.getBoundingClientRect();
                                if (r.width <= 1 || (r.right <= inner + 0.5 && r.left >= -0.5)) return false;
                                const parent = el.parentElement!.getBoundingClientRect();
                                return parent.right <= inner + 0.5 && parent.left >= -0.5;
                            })
                            .slice(0, 5)
                            .map(
                                (el) =>
                                    `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 4).join(".")} (${Math.round(el.getBoundingClientRect().width)}px)`,
                            );
                        return { scroll: document.scrollingElement!.scrollWidth, inner, culprits };
                    });
                    await context.close();
                    expect(sizes.scroll, `culprits: ${sizes.culprits.join(", ")}`).toBeLessThanOrEqual(sizes.inner);
                });
            }
        }
    }

    test("375px: the navigation is reachable through the menu button", async ({ browser }) => {
        const context = await browser.newContext({ baseURL: state().baseURL, viewport: { width: 375, height: 812 } });
        await signIn(context, "super");
        const page = await context.newPage();
        await page.goto("/worlds");
        const m = messagesFor("en-US");
        await expect(page.locator("aside")).toBeHidden();
        await page.getByRole("button", { name: m.app.openMenu, exact: true }).click();
        const drawer = page.getByRole("dialog", { name: m.shell.nav.main });
        await drawer.getByRole("button", { name: m.app.account.menu }).click();
        await drawer.getByRole("link", { name: m.app.account.settings, exact: true }).click();
        await expect(page).toHaveURL(/\/account$/);
        await context.close();
    });
});
