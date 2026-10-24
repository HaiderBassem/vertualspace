/**
 * D. Internationalization of rendered pages, for the five locales: <html lang/dir>, no raw keys or junk,
 * no English chrome left in translations, Intl dates, CLDR plurals, French typography and Arabic RTL
 * layout. Locales are chosen with the locale cookie (as the switcher sets it), with the switcher itself,
 * and with Accept-Language.
 */
import type { Page } from "@playwright/test";
import { localeInfo, messagesFor, plural, type Locale } from "../../src/lib/i18n";
import { englishLeftovers, LOCALE_TAGS, leaves, textProblems, visibleText } from "./support/i18n";
import { state } from "./support/state";
import { db, expect, setLocaleCookie, signIn, test } from "./support/test";

const PAGES: { name: string; path: () => string; app: boolean }[] = [
    { name: "login", path: () => "/login", app: false },
    { name: "worlds", path: () => "/worlds", app: true },
    { name: "world overview", path: () => `/o/orga/w/${state().orgA.world.slug}`, app: true },
    { name: "members", path: () => `/o/orga/w/${state().orgA.world.slug}/members`, app: true },
    { name: "moderation", path: () => `/o/orga/w/${state().orgA.world.slug}/moderation`, app: true },
    { name: "reports", path: () => `/o/orga/w/${state().orgA.world.slug}/moderation/reports?status=all`, app: true },
    { name: "world settings", path: () => `/o/orga/w/${state().orgA.world.slug}/settings`, app: true },
    { name: "admin status", path: () => "/admin", app: true },
    { name: "account", path: () => "/account", app: true },
    { name: "organizations", path: () => "/organizations", app: true },
];

async function expectLocale(page: Page, locale: Locale) {
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", localeInfo(locale).dir);
}

for (const locale of LOCALE_TAGS) {
    test.describe(`${locale}`, () => {
        for (const target of PAGES) {
            test(`${target.name}: language, direction and clean text`, async ({ page, context }) => {
                if (target.app) await signIn(context, "super", locale);
                else await setLocaleCookie(context, locale);
                await page.goto(target.path());
                await expect(page.locator("main").first()).toBeVisible();
                await expectLocale(page, locale);

                const text = await visibleText(page);
                const problems = textProblems(text);
                expect(problems.rawKeys, "raw message keys").toEqual([]);
                expect(problems.junk, "undefined / [object Object] / NaN / null").toEqual([]);
                expect(problems.placeholders, "unreplaced {placeholders}").toEqual([]);
                expect(problems.isoDates, "ISO 8601 timestamps shown to people").toEqual([]);
                expect(await englishLeftovers(page, locale), "English labels in a translated page").toEqual([]);

                // Every <time> shows a localized date, never its machine value.
                for (const time of await page.locator("time").all()) {
                    const iso = await time.getAttribute("datetime");
                    const shown = (await time.innerText()).trim();
                    expect(shown.length).toBeGreaterThan(0);
                    expect(shown).not.toBe(iso);
                }

                if (target.app) {
                    const m = messagesFor(locale);
                    const nav = page.getByRole("navigation", { name: m.shell.nav.main }).first();
                    await expect(nav.getByRole("link", { name: m.shell.nav.myWorlds, exact: true })).toBeVisible();
                    await expect(
                        nav.getByRole("link", { name: m.app.platformNav.overview, exact: true }),
                    ).toBeVisible();
                    await expect(
                        nav.getByRole("link", { name: m.app.platformNav.accounts, exact: true }),
                    ).toBeVisible();
                    await expect(nav.getByText(m.app.sections.platform, { exact: true })).toBeVisible();
                    // Account settings and sign-out live in the account menu, under the navigation.
                    const accountMenu = page.locator("aside").getByRole("button", { name: m.app.account.menu });
                    await accountMenu.click();
                    await expect(page.getByRole("link", { name: m.app.account.settings, exact: true })).toBeVisible();
                    await expect(page.getByRole("button", { name: m.app.account.signOut, exact: true })).toBeVisible();
                }
                if (target.name !== "login" && target.path().includes("/w/")) {
                    const m = messagesFor(locale);
                    const tabs = page.locator("main nav").first();
                    for (const label of [
                        m.shell.nav.world.overview,
                        m.shell.nav.world.members,
                        m.shell.nav.world.moderation,
                    ]) {
                        await expect(tabs.getByRole("link", { name: label, exact: true })).toBeVisible();
                    }
                }
            });
        }

        test("plural sentences for 0, 1, 2 and 5", async ({ page, context }) => {
            await signIn(context, "super", locale);
            const m = messagesFor(locale);
            await page.goto("/organizations");
            for (const { slug, worlds } of state().plurals) {
                const card = page.locator("li.card").filter({ has: page.locator(`a[href="/o/${slug}"]`) });
                await expect(card.locator(".badge").first()).toHaveText(
                    plural(m.organizations.worldCount, worlds, locale),
                );
            }
            for (const world of state().pluralWorlds) {
                await page.goto(`/o/${world.org}/w/${world.slug}/members`);
                await expect(
                    page.getByText(plural(m.people.members.count, world.members, locale), { exact: true }),
                ).toBeVisible();
            }
        });

        test("dictionary has the CLDR plural forms these counts need", () => {
            const rules = new Intl.PluralRules(locale);
            const missing: string[] = [];
            for (const [name, forms] of [
                ["organizations.worldCount", messagesFor(locale).organizations.worldCount],
                ["people.members.count", messagesFor(locale).people.members.count],
            ] as const) {
                for (const count of [0, 1, 2, 5]) {
                    const category = rules.select(count);
                    if (!(category in forms)) missing.push(`${name}[${category}] for ${count}`);
                }
            }
            expect(missing).toEqual([]);
        });
    });
}

test.describe("French typography", () => {
    test("dictionary labels keep their non-breaking space before ':'", async ({ page, context }) => {
        await signIn(context, "super", "fr-FR");
        const withNbsp = leaves(messagesFor("fr-FR"))
            .map(([, v]) => v)
            .filter((v) => v.includes("\u00a0:") && !v.includes("{"));
        expect(withNbsp.length).toBeGreaterThan(5);
        // The dictionary never uses an ordinary space before ':' outside lists of characters.
        const plain = leaves(messagesFor("fr-FR")).filter(([, v]) => / :/.test(v) && !/\. _ : -/.test(v));
        expect(plain.map(([k]) => k)).toEqual([]);

        const seen: string[] = [];
        for (const target of PAGES.filter((p) => p.app)) {
            await page.goto(target.path());
            const text = await visibleText(page);
            for (const value of withNbsp) {
                const loose = value.replace(/\u00a0/g, " ");
                if (text.includes(value)) seen.push(value);
                else expect(text.includes(loose), `"${loose}" rendered without its non-breaking space`).toBe(false);
            }
        }
        expect(seen.length).toBeGreaterThan(0);
    });

    // Regressions: the bans table hard-coded "{b.columns.by}: …" (moderation) and /admin showed the server's
    // English diagnostics ("Pusher unreachable at …: TypeError: fetch failed").
    for (const target of PAGES) {
        test(`no colon glued to a word in French: ${target.name}`, async ({ page, context }) => {
            if (target.app) await signIn(context, "super", "fr-FR");
            else await setLocaleCookie(context, "fr-FR");
            await page.goto(target.path());
            await expectLocale(page, "fr-FR");
            // Text outside code, URLs and form values: a word glued to ':' then a space (French puts a space before it).
            // Identifiers such as 'workadventure:uuid' (no space after the colon) are data, not typography.
            const text = await page.evaluate(() => {
                const clone = document.body.cloneNode(true) as HTMLElement;
                clone
                    .querySelectorAll("code, pre, [dir=ltr], input, textarea, select, script, style")
                    .forEach((n) => n.remove());
                return clone.textContent ?? "";
            });
            const glued = [...text.matchAll(/(?<!\d)[\p{L})»]:\s/gu)].map(
                (match) => `…${text.slice(Math.max(0, match.index - 25), match.index + 15).replace(/\s+/g, " ")}…`,
            );
            expect(glued).toEqual([]);
        });
    }
});

test.describe("server diagnostics", () => {
    for (const locale of LOCALE_TAGS.filter((l) => l !== "en-US")) {
        test(`admin status shows no untranslated server diagnostics (${locale})`, async ({ page, context }) => {
            // Regression: /admin printed raw English errors from services (e.g. 'Pusher unreachable at http://…:
            // TypeError: fetch failed' from src/lib/server/services/pusher.ts) in every locale.
            await signIn(context, "super", locale);
            await page.goto("/admin");
            await expectLocale(page, locale);
            const text = await visibleText(page);
            expect(text).not.toMatch(/unreachable at|TypeError|fetch failed|ECONNREFUSED/);
            // The e2e server points the pusher and the map storage at a closed port: both show the translated reason.
            const st = messagesFor(locale).platform.status;
            for (const name of [st.pusher, st.mapStorage]) {
                const row = page.locator("tr").filter({ has: page.locator("th", { hasText: name }) });
                await expect(row).toContainText(st.problems.unreachable);
            }
            await expect(page.getByText(st.detailsInLog, { exact: true })).toBeVisible();
        });
    }
});

test.describe("choosing the language", () => {
    test("the language switcher changes the language and remembers it", async ({ page, context }) => {
        await signIn(context, "switcher");
        await page.goto(`/o/orga/w/${state().orgA.world.slug}/members`);
        await expectLocale(page, "en-US");
        for (const locale of ["fr-FR", "de-DE", "es-ES", "ar-SA", "en-US"] as Locale[]) {
            await page.locator("#locale-switcher").selectOption(locale);
            await expectLocale(page, locale);
            await expect(page).toHaveURL(new RegExp(`/o/orga/w/${state().orgA.world.slug}/members$`));
            await expect(page.locator("h1").first()).toHaveText(messagesFor(locale).people.membersTitle);
            const [row] = await db()<
                { locale: string | null }[]
            >`select locale from accounts where id = ${state().accounts.switcher.id}`;
            expect(row?.locale).toBe(locale);
        }
    });

    test("the login page switcher works before logging in", async ({ page }) => {
        await page.goto("/login");
        await page.locator("#locale-switcher").selectOption("de-DE");
        await expectLocale(page, "de-DE");
        await expect(page.locator("h1")).toHaveText(messagesFor("de-DE").shell.auth.loginTitle);
    });

    for (const [header, expected] of [
        ["fr-CA,fr;q=0.9,en;q=0.5", "fr-FR"],
        ["de-AT", "de-DE"],
        ["es-MX,es;q=0.8", "es-ES"],
        ["ar-EG,ar;q=0.9", "ar-SA"],
        ["ja-JP,zh;q=0.8", "en-US"],
        ["pt-BR,es;q=0.6,fr;q=0.5", "es-ES"],
    ] as const) {
        test(`Accept-Language ${header} gives ${expected}`, async ({ browser }) => {
            const context = await browser.newContext({ baseURL: state().baseURL });
            // Chromium derives Accept-Language from the context locale: set the exact header on every request.
            await context.route("**/*", (route) =>
                route.continue({ headers: { ...route.request().headers(), "accept-language": header } }),
            );
            await signIn(context, "accept");
            const page = await context.newPage();
            await page.goto("/worlds");
            await expectLocale(page, expected);
            await expect(
                page.getByRole("link", { name: messagesFor(expected).shell.nav.myWorlds, exact: true }).first(),
            ).toBeVisible();
            const login = await context.request.get("/login", { headers: { "accept-language": header } });
            expect(await login.text()).toContain(`lang="${expected}"`);
            await context.close();
        });
    }
});

test.describe("Arabic right-to-left layout", () => {
    test("sidebar on the right, text starting on the right", async ({ page, context }) => {
        await signIn(context, "super", "ar-SA");
        await page.goto(`/o/orga/w/${state().orgA.world.slug}/members`);
        await expectLocale(page, "ar-SA");
        const layout = await page.evaluate(() => {
            const aside = document.querySelector("aside")!.getBoundingClientRect();
            const main = document.querySelector("main")!.getBoundingClientRect();
            const h1 = document.querySelector("main h1")!;
            const range = document.createRange();
            range.selectNodeContents(h1);
            const text = range.getBoundingClientRect();
            return {
                width: window.innerWidth,
                asideLeft: aside.left,
                asideRight: aside.right,
                mainRight: main.right,
                textRight: text.right,
                textLeft: text.left,
                h1Right: h1.getBoundingClientRect().right,
                textAlign: getComputedStyle(h1).textAlign,
                direction: getComputedStyle(h1).direction,
            };
        });
        expect(layout.asideRight).toBeCloseTo(layout.width, -1);
        expect(layout.asideLeft).toBeGreaterThan(layout.width / 2);
        expect(layout.direction).toBe("rtl");
        expect(["start", "right"]).toContain(layout.textAlign);
        // The heading's text hugs the right edge of its box.
        expect(layout.h1Right - layout.textRight).toBeLessThan(2);
    });

    test("English keeps the sidebar on the left", async ({ page, context }) => {
        await signIn(context, "super", "en-US");
        await page.goto("/worlds");
        const aside = await page.locator("aside").boundingBox();
        expect(aside!.x).toBeLessThan(5);
    });

    test("tables and dialogs render right to left", async ({ page, context }) => {
        await signIn(context, "super", "ar-SA");
        const m = messagesFor("ar-SA");
        await page.goto(`/o/orga/w/${state().orgA.world.slug}/moderation`);
        const table = page.locator("table").first();
        await expect(table).toBeVisible();
        const headers = await table
            .locator("thead th")
            .evaluateAll((ths) =>
                ths.map((th) => ({ left: th.getBoundingClientRect().left, direction: getComputedStyle(th).direction })),
            );
        expect(headers.every((h) => h.direction === "rtl")).toBe(true);
        expect(headers[0]!.left).toBeGreaterThan(headers[headers.length - 1]!.left);

        await page.getByRole("button", { name: m.moderation.bans.revoke }).first().click();
        const dialog = page.locator("dialog[open]");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading")).toHaveText(m.moderation.bans.revokeTitle);
        const layout = await dialog.evaluate((d) => {
            const [cancel, confirm] = [...d.querySelectorAll("button")].map((b) => b.getBoundingClientRect().left);
            return { direction: getComputedStyle(d).direction, cancel, confirm };
        });
        expect(layout.direction).toBe("rtl");
        // Buttons are laid out from the right: the first one (cancel) is right of the second (confirm).
        expect(layout.cancel!).toBeGreaterThan(layout.confirm!);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        const [ban] = await db()<
            { revoked_at: Date | null }[]
        >`select revoked_at from bans where id = ${state().orgA.banId}`;
        expect(ban?.revoked_at).toBeNull();
    });
});
