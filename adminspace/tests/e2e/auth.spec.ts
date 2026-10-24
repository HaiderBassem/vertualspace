/**
 * A. Authentication: login, generic failures, lockout without oracle, logout, access guard, TOTP second
 * factor (enrolment, login, recovery codes, replay, lock, rate limit), session cookie flags and
 * open-redirect attempts. Runs against the production build (NODE_ENV=production).
 */
import { request as playwrightRequest } from "@playwright/test";
import { messagesFor } from "../../src/lib/i18n";
import { totp } from "./support/crypto";
import { state } from "./support/state";
import { db, expect, loginRequest, loginWithForm, postAction, test, LANDING } from "./support/test";

const en = messagesFor("en-US");

test.describe("login", () => {
    test("valid credentials open the back office", async ({ page }) => {
        await page.goto("/login");
        await expect(page.locator("h1")).toHaveText(en.shell.auth.loginTitle);
        await loginWithForm(page, "viewer");
        await expect(page).toHaveURL(LANDING);
        await expect(page.getByRole("navigation", { name: en.shell.nav.main }).first()).toBeVisible();
    });

    test("wrong password and unknown email get the same generic answer", async ({ page }) => {
        const api = await playwrightRequest.newContext({ baseURL: state().baseURL });
        const wrongPassword = await postAction(api, "/login", {
            email: state().accounts.viewer.email,
            password: "not-the-password",
        });
        const unknownEmail = await postAction(api, "/login", {
            email: "nobody@e2e.test",
            password: "not-the-password",
        });
        expect(wrongPassword).toMatchObject({ type: "failure", status: 400, data: { reason: "invalid" } });
        expect(unknownEmail).toMatchObject({ type: "failure", status: 400, data: { reason: "invalid" } });
        expect((await api.storageState()).cookies).toHaveLength(0);
        await api.dispose();

        for (const email of [state().accounts.viewer.email, "nobody@e2e.test"]) {
            await page.goto("/login");
            await page.locator("#email").fill(email);
            await page.locator("#password").fill("not-the-password");
            await page.locator("form:has(input[name=password]) button[type=submit]").click();
            await expect(page.getByRole("alert")).toHaveText(en.shell.auth.invalidCredentials);
            await expect(page).toHaveURL(/\/login/);
        }
    });

    test("a locked account answers exactly like a wrong password", async ({ page }) => {
        const api = await playwrightRequest.newContext({ baseURL: state().baseURL });
        const email = state().accounts.lockout.email;
        const failures = [];
        for (let i = 0; i < 10; i++) {
            failures.push(await postAction(api, "/login", { email, password: `wrong-${i}` }));
        }
        const [locked] = await db()<{ locked: boolean }[]>`
            select locked_until > now() as locked from accounts where email = ${email}`;
        expect(locked?.locked).toBe(true);

        // The right password on the locked account: same status, type and data as a wrong one.
        const rightPassword = await postAction(api, "/login", { email, password: state().password });
        const wrongPassword = await postAction(api, "/login", { email, password: "wrong-again" });
        expect(rightPassword).toEqual(wrongPassword);
        expect(rightPassword).toEqual(failures[0]);
        expect(rightPassword).toMatchObject({ type: "failure", status: 400, data: { reason: "invalid" } });
        expect((await api.storageState()).cookies).toHaveLength(0);
        await api.dispose();

        await page.goto("/login");
        await loginWithForm(page, "lockout");
        await expect(page.getByRole("alert")).toHaveText(en.shell.auth.invalidCredentials);
        await expect(page).toHaveURL(/\/login/);
    });

    test("logout ends the session on the server", async ({ page, context }) => {
        await page.goto("/login");
        await loginWithForm(page, "logout");
        await expect(page).toHaveURL(LANDING);
        const session = (await context.cookies()).find((c) => c.name === "__Host-adminspace_session");
        expect(session).toBeDefined();

        const logout = page.waitForResponse((r) => new URL(r.url()).pathname === "/logout");
        await page.locator("aside").getByRole("button", { name: en.app.account.menu }).click();
        await page.locator("aside").getByRole("button", { name: en.app.account.signOut, exact: true }).click();
        const answer = await logout;
        expect(answer.status()).toBe(303);
        // The answer tells the browser to drop the cookie (expired, empty value).
        const cleared = (await answer.headerValues("set-cookie")).find((v) =>
            v.startsWith("__Host-adminspace_session="),
        );
        expect(cleared).toMatch(/^__Host-adminspace_session=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
        await expect(page).toHaveURL(/\/login$/);
        const [rows] = await db()<{ n: number }[]>`
            select count(*)::int as n from sessions where account_id = ${state().accounts.logout.id}`;
        expect(rows?.n).toBe(0);

        await page.goto("/worlds");
        await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworlds$/);

        // The old token is dead server-side, not only forgotten by the browser.
        const replay = await playwrightRequest.newContext({
            baseURL: state().baseURL,
            storageState: { cookies: [session!], origins: [] },
        });
        const response = await replay.get("/worlds", { maxRedirects: 0 });
        expect(response.status()).toBe(303);
        expect(response.headers().location).toBe("/login?redirectTo=%2Fworlds");
        await replay.dispose();
    });

    test("protected pages and actions send anonymous visitors to /login", async () => {
        const api = await playwrightRequest.newContext({ baseURL: state().baseURL });
        const { orgA } = state();
        for (const path of [
            "/",
            "/worlds",
            `/o/${orgA.slug}`,
            `/o/${orgA.slug}/w/${orgA.world.slug}/members`,
            `/o/${orgA.slug}/w/${orgA.world.slug}/members/export?format=csv`,
            "/admin",
            "/admin/accounts",
            "/account",
        ]) {
            const response = await api.get(path, { maxRedirects: 0 });
            expect(response.status(), path).toBe(303);
            const expected = path === "/" ? "/login" : `/login?redirectTo=${encodeURIComponent(path)}`;
            expect(response.headers().location, path).toBe(expected);
        }
        const before = await db()`select name from organizations where id = ${orgA.id}`;
        const result = await postAction(api, `/o/${orgA.slug}/settings?/update`, {
            name: "Hijacked",
            countryCode: "",
            defaultLocale: "en-US",
            contactEmail: "",
        });
        // Either a plain 303 or, for a JSON action request, a redirect result: both to the login page.
        expect(result.type === "redirect" || result.http === 303).toBe(true);
        expect(result.location ?? "").toMatch(/^\/login/);
        expect(await db()`select name from organizations where id = ${orgA.id}`).toEqual(before);
        await api.dispose();
    });
});

test.describe("session cookie", () => {
    test("is __Host- prefixed, HttpOnly, Secure, SameSite=Lax and host-only", async ({ page, context }) => {
        const api = await playwrightRequest.newContext({ baseURL: state().baseURL });
        const response = await api.post("/login", {
            headers: { origin: state().baseURL, accept: "text/html" },
            form: { email: state().accounts.viewer.email, password: state().password, redirectTo: "/" },
            maxRedirects: 0,
        });
        expect(response.status()).toBe(303);
        const setCookie = response
            .headersArray()
            .filter((h) => h.name.toLowerCase() === "set-cookie")
            .map((h) => h.value)
            .find((v) => v.includes("adminspace_session"));
        expect(setCookie).toBeDefined();
        expect(setCookie).toMatch(/^__Host-adminspace_session=[A-Za-z0-9_-]{43};/);
        expect(setCookie).toMatch(/;\s*HttpOnly/i);
        expect(setCookie).toMatch(/;\s*Secure/i);
        expect(setCookie).toMatch(/;\s*SameSite=Lax/i);
        expect(setCookie).toMatch(/;\s*Path=\//i);
        expect(setCookie).not.toMatch(/;\s*Domain=/i);
        await api.dispose();

        // The browser accepts it on http://localhost (a potentially trustworthy origin) and hides it from scripts.
        await page.goto("/login");
        await loginWithForm(page, "viewer");
        await expect(page).toHaveURL(LANDING);
        const cookie = (await context.cookies()).find((c) => c.name === "__Host-adminspace_session");
        expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
        expect(await page.evaluate(() => document.cookie)).not.toContain("adminspace_session");
    });

    test("production answers carry HSTS and anti-framing headers", async ({ request }) => {
        const response = await request.get("/login");
        expect(response.headers()["strict-transport-security"]).toContain("max-age=");
        expect(response.headers()["x-frame-options"]).toBe("DENY");
        expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
        expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    });
});

test.describe("open redirects", () => {
    const attempts = [
        "/%09/evil.com",
        "//evil.com",
        "/\\evil.com",
        "https://evil.com",
        "/%5C%5Cevil.com",
        "/%2F%2Fevil.com",
    ];

    for (const attempt of attempts) {
        test(`login ?redirectTo=${attempt} stays on the site`, async ({ page }) => {
            await page.goto(`/login?redirectTo=${attempt}`);
            const hidden = await page.locator("form:has(input[name=password]) input[name=redirectTo]").inputValue();
            expect(hidden.startsWith("/") && !hidden.startsWith("//") && !hidden.includes("\\")).toBe(true);
            await loginWithForm(page, "redirect");
            await page.waitForURL((url) => !url.pathname.startsWith("/login"));
            expect(new URL(page.url()).origin).toBe(state().baseURL);
            expect(page.url()).not.toContain("evil.com");
        });
    }

    test("logged-in /login, /locale and /login/mfa refuse foreign targets", async () => {
        const api = await loginRequest("redirect");
        for (const attempt of ["//evil.com", "/\\evil.com", "/\tevil.com", "https://evil.com"]) {
            const login = await api.get(`/login?redirectTo=${encodeURIComponent(attempt)}`, { maxRedirects: 0 });
            expect(login.status()).toBe(303);
            expect(login.headers().location).toBe("/");
            const locale = await api.post("/locale", {
                headers: { origin: state().baseURL },
                form: { locale: "en-US", redirectTo: attempt },
                maxRedirects: 0,
            });
            expect(locale.status()).toBe(303);
            expect(locale.headers().location).toBe("/");
        }
        await api.dispose();
    });
});

test.describe.serial("two-factor authentication", () => {
    let recoveryCodes: string[] = [];
    let secret = "";
    let lastCode = "";

    test("enrolment from the account page shows the secret once and recovery codes", async ({ page }) => {
        await page.goto("/login");
        await loginWithForm(page, "mfa");
        await expect(page).toHaveURL(LANDING);
        await page.goto("/account");
        await page.locator("#start-password").fill(state().password);
        await page.getByRole("button", { name: en.shell.account.mfaStart }).click();
        const code = page.locator("dd code").first();
        await expect(code).toBeVisible();
        secret = (await code.textContent())!.trim();
        expect(secret).toMatch(/^[A-Z2-7]{32}$/);
        await page.locator("#mfa-code").fill(totp(secret));
        await page.getByRole("button", { name: en.shell.account.mfaEnable }).click();
        await expect(page.getByText(en.shell.account.mfaEnabledNow)).toBeVisible();
        recoveryCodes = await page.locator("ul[dir=ltr] li").allTextContents();
        expect(recoveryCodes).toHaveLength(10);
        for (const recovery of recoveryCodes) expect(recovery).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);

        const [row] = await db()<{ totp_secret: string | null }[]>`
            select totp_secret from accounts where id = ${state().accounts.mfa.id}`;
        expect(row?.totp_secret).toMatch(/^v2\./);
        expect(row?.totp_secret).not.toContain(secret);
        // Reloading the page does not show the secret or the codes again.
        await page.reload();
        await expect(page.getByText(secret)).toHaveCount(0);
        await expect(page.getByText(recoveryCodes[0]!)).toHaveCount(0);
    });

    test("login then requires a code; pages wait behind /login/mfa", async ({ page }) => {
        await page.goto(`/login?redirectTo=${encodeURIComponent("/account")}`);
        await loginWithForm(page, "mfa");
        await expect(page).toHaveURL(/\/login\/mfa\?redirectTo=%2Faccount$/);
        await page.goto("/worlds");
        await expect(page).toHaveURL(/\/login\/mfa$/);
        await page.goto(`/login/mfa?redirectTo=${encodeURIComponent("/account")}`);
        // The enrolment consumed the current time step: the next step's code is accepted (clock drift window).
        lastCode = totp(secret, Date.now() + 30_000);
        await page.locator("#code").fill(lastCode);
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page).toHaveURL(/\/account$/);
        await expect(page.locator("h1")).toHaveText(en.shell.account.title);
    });

    test("a TOTP code is accepted only once (replay)", async ({ page }) => {
        await page.goto("/login");
        await loginWithForm(page, "mfa");
        await expect(page).toHaveURL(/\/login\/mfa/);
        await page.locator("#code").fill(lastCode);
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByRole("alert")).toHaveText(en.shell.auth.mfaInvalid);
        await expect(page).toHaveURL(/\/login\/mfa/);
    });

    test("a recovery code works once", async ({ page, context }) => {
        await page.goto("/login");
        await loginWithForm(page, "mfa");
        await page.locator("#code").fill(recoveryCodes[0]!);
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page).toHaveURL(LANDING);

        await context.clearCookies();
        await page.goto("/login");
        await loginWithForm(page, "mfa");
        await page.locator("#code").fill(recoveryCodes[0]!);
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByRole("alert")).toHaveText(en.shell.auth.mfaInvalid);

        await page.locator("#code").fill(recoveryCodes[1]!);
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page).toHaveURL(LANDING);
        const [used] = await db()<{ n: number }[]>`
            select count(*)::int as n from recovery_codes where account_id = ${state().accounts.mfa.id} and used_at is not null`;
        expect(used?.n).toBe(2);
    });

    test("five wrong codes lock the second factor and end the pending session", async ({ page }) => {
        await page.goto("/login");
        await loginWithForm(page, "mfa");
        await expect(page).toHaveURL(/\/login\/mfa/);
        for (let i = 0; i < 4; i++) {
            await page.locator("#code").fill(String(100000 + i));
            await page.getByRole("button", { name: en.common.actions.confirm }).click();
            await expect(page.getByRole("alert")).toHaveText(en.shell.auth.mfaInvalid);
        }
        await page.locator("#code").fill("123999");
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByRole("alert")).toHaveText(en.shell.auth.mfaLocked);
        await page.goto("/worlds");
        await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworlds$/);

        // Even a valid code is refused while the lock lasts.
        await loginWithForm(page, "mfa");
        await expect(page).toHaveURL(/\/login\/mfa/);
        await page.locator("#code").fill(totp(secret, Date.now() + 30_000));
        await page.getByRole("button", { name: en.common.actions.confirm }).click();
        await expect(page.getByRole("alert")).toHaveText(en.shell.auth.mfaLocked);
    });
});

test.describe("rate limits (strict server)", () => {
    test("second-factor attempts are rate limited per client address", async () => {
        const ip = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
        const api = await playwrightRequest.newContext({
            baseURL: state().strictURL,
            extraHTTPHeaders: { "x-forwarded-for": ip },
        });
        const login = await postAction(
            api,
            "/login",
            { email: state().accounts.mfaStrict.email, password: state().password, redirectTo: "/" },
            { origin: state().strictURL },
        );
        expect(login).toMatchObject({ type: "redirect", location: "/login/mfa?redirectTo=%2F" });
        const answers = [];
        for (let i = 0; i < 4; i++) {
            answers.push(await postAction(api, "/login/mfa", { code: "000000" }, { origin: state().strictURL }));
        }
        expect(answers.slice(0, 3).map((a) => a.status)).toEqual([400, 400, 400]);
        expect(answers[3]).toMatchObject({ type: "failure", status: 429, data: { rateLimited: true } });
        // Throttled attempts are not even checked: a valid code is refused too, without locking the account.
        const valid = await postAction(
            api,
            "/login/mfa",
            { code: totp(state().mfaStrictSecret) },
            { origin: state().strictURL },
        );
        expect(valid.status).toBe(429);
        await api.dispose();
    });

    test("login attempts are rate limited per client address", async () => {
        const ip = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
        const api = await playwrightRequest.newContext({
            baseURL: state().strictURL,
            extraHTTPHeaders: { "x-forwarded-for": ip },
        });
        const statuses = [];
        for (let i = 0; i < 4; i++) {
            const result = await postAction(
                api,
                "/login",
                { email: `nobody${i}@e2e.test`, password: "nope" },
                { origin: state().strictURL },
            );
            statuses.push(`${result.status}:${(result.data as { reason?: string }).reason}`);
        }
        expect(statuses).toEqual(["400:invalid", "400:invalid", "400:invalid", "429:rateLimited"]);
        await api.dispose();
    });
});
