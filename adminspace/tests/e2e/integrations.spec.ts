/**
 * Integration Center on the production build. The e2e servers configure no OAuth provider: every OAuth integration
 * must say "Not configured" with its setup steps (never "Connected"), webhook destinations stay available, private
 * addresses are refused, the automation API works end to end with a token created in the page, and WorkAdventure is
 * not told about calendar endpoints nobody can use.
 */
import { messagesFor } from "../../src/lib/i18n";
import { state } from "./support/state";
import { expect, postAction, signIn, test } from "./support/test";

const en = messagesFor("en-US");
const ic = en.integrationCenter;

function card(page: import("@playwright/test").Page, name: string) {
    return page.locator("li.card").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test.describe("Integration Center", () => {
    test("catalog: honest states without any provider configured", async ({ page, context }) => {
        await signIn(context, "admin", "en-US");
        await page.goto("/o/orga/integrations");
        await expect(page.getByRole("heading", { level: 1, name: ic.title })).toBeVisible();
        for (const provider of ["google", "microsoft", "slack", "notion", "trello", "miro", "spotify"] as const) {
            await expect(card(page, ic.providers[provider].name)).toContainText(ic.status.notConfigured);
        }
        for (const provider of ["discord", "teams", "zapier", "n8n", "webhook"] as const) {
            await expect(card(page, ic.providers[provider].name)).toContainText(ic.status.available);
        }
        await expect(page.getByText(ic.status.connected, { exact: true })).toHaveCount(0);
        // The navigation leads here and to the personal page.
        const nav = page.getByRole("navigation", { name: en.shell.nav.main }).first();
        await expect(nav.getByRole("link", { name: ic.nav, exact: true })).toBeVisible();
        await expect(nav.getByRole("link", { name: ic.navPersonal, exact: true })).toBeVisible();
    });

    test("provider page: setup steps, redirect URI, and no connect button while not configured", async ({
        page,
        context,
    }) => {
        await signIn(context, "admin", "en-US");
        await page.goto("/o/orga/integrations/google");
        await expect(page.getByRole("heading", { name: ic.setup.title })).toBeVisible();
        await expect(page.getByText("GOOGLE_OAUTH_CLIENT_ID", { exact: true })).toBeVisible();
        await expect(page.getByText(`${state().baseURL}/integrations/oauth/google/callback`)).toBeVisible();
        await expect(page.getByRole("button", { name: ic.provider.connect, exact: true })).toHaveCount(0);
        // Asking anyway is refused by the server.
        const refused = await postAction(page.request, "/o/orga/integrations/google?/connect");
        expect(refused).toMatchObject({ type: "failure", status: 400 });
    });

    test("My integrations: unavailable providers are explained, nothing pretends to connect", async ({
        page,
        context,
    }) => {
        await signIn(context, "entEmployee", "en-US");
        await page.goto(`/o/${state().orgE.slug}/my-integrations`);
        await expect(page.getByRole("heading", { level: 1, name: ic.personal.title })).toBeVisible();
        const google = page
            .locator("li.card")
            .filter({ has: page.getByRole("heading", { name: ic.providers.google.name }) });
        await expect(google).toContainText(ic.personal.notAvailable);
        await expect(google.getByRole("button", { name: ic.provider.connect, exact: true })).toHaveCount(0);
        // An employee does not reach the organization's Integration Center.
        const response = await page.goto(`/o/${state().orgE.slug}/integrations`);
        expect(response?.status()).toBe(403);
    });

    test("notification destinations refuse private addresses", async ({ page, context }) => {
        await signIn(context, "admin", "en-US");
        await page.goto("/o/orga/integrations/notifications");
        await page.locator("#field-kind").selectOption("webhook");
        await page.locator("#field-name").fill("Internal probe");
        await page.locator("#field-url").fill("https://169.254.169.254/latest/meta-data");
        await page.getByRole("button", { name: ic.notifications.create }).click();
        await expect(page.getByText(ic.targetProblems.privateAddress)).toBeVisible();
        await expect(page.getByText(ic.notifications.empty)).toBeVisible();
    });

    test("automation token: created once in the page, used by the API, revoked", async ({ page, context, request }) => {
        await signIn(context, "admin", "en-US");
        await page.goto("/o/orga/integrations/automation");
        await page.locator("#field-name").fill("E2E Zap");
        await page.getByLabel(ic.automation.scopeLabels.invitations).check();
        await page.getByRole("button", { name: ic.automation.create }).click();
        await expect(page.getByText(ic.automation.created)).toBeVisible();
        const token = await page.locator("section.notice code").first().innerText();
        expect(token).toMatch(/^as_at_[A-Za-z0-9_-]{43}$/);

        const ping = await request.get("/automation/v1/ping", { headers: { authorization: `Bearer ${token}` } });
        expect(ping.status()).toBe(200);
        expect(await ping.json()).toMatchObject({
            ok: true,
            organization: { slug: "orga" },
            token: { scopes: ["invitations:write"] },
        });
        const noScope = await request.post("/automation/v1/announcements", {
            headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            data: { world: state().orgA.world.slug, message: "Hello" },
        });
        expect(noScope.status()).toBe(403);
        expect(noScope.headers()["content-type"]).toContain("application/problem+json");

        const row = page.locator("tr").filter({ hasText: "E2E Zap" });
        await row.getByRole("button", { name: en.common.actions.revoke }).click();
        await page.getByRole("dialog").getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByText(ic.automation.revoked)).toBeVisible();
        const after = await request.get("/automation/v1/ping", { headers: { authorization: `Bearer ${token}` } });
        expect(after.status()).toBe(401);
    });

    test("Admin API: no calendar capability without a calendar provider; unknown people are not connected", async ({
        request,
    }) => {
        const capabilities = await (await request.get("/api/capabilities")).json();
        expect(capabilities).not.toHaveProperty("api/calendar/events");
        expect(capabilities).not.toHaveProperty("api/presence/activity");
        const calendar = await request.get(
            `/api/calendar/events?userIdentifier=nobody@e2e.test&playUri=${encodeURIComponent(`${state().playUrl}/@/orga/${state().orgA.world.slug}`)}`,
            { headers: { authorization: state().adminApiToken } },
        );
        expect(calendar.status()).toBe(200);
        expect(await calendar.json()).toMatchObject({ connected: false, provider: null, events: [], error: null });
        const refused = await request.get("/api/calendar/events?userIdentifier=x&playUri=y", {
            headers: { authorization: "wrong" },
        });
        expect(refused.status()).toBe(403);
    });
});
