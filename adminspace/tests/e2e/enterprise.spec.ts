/**
 * Enterprise journeys, on the "enterprise" server: SMTP to a local sink, the background job worker and a
 * fake WorkAdventure map-storage (tests/e2e/support/fakes.ts). Fixtures: tests/e2e/support/fixtures.ts
 * (Org E with two workspaces, Org T for the ownership transfer).
 *
 *  1. registration with email verification makes the person owner of a new organization;
 *  2. an invitation by email is accepted by a new person, once;
 *  3. an owner grants workspace management, which stays inside that workspace;
 *  4. an employee is denied administrative pages and actions;
 *  5. other organizations, and platform administrators without support access, are kept out;
 *  6. an administrator creates a workspace, a world in it and its first room;
 *  7. a component is searched, previewed and installed into a compatible office;
 *  8. a map-storage outage is surfaced, retried and repaired without duplicates;
 *  9. ownership is transferred safely;
 * 10. Arabic pages are right to left and fit a phone screen.
 */
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { messagesFor } from "../../src/lib/i18n";
import { buildZip } from "../../src/lib/server/catalog/mapStorage";
import { englishLeftovers } from "./support/i18n";
import { linkInMail } from "./support/mail";
import { state, type AccountKey } from "./support/state";
import {
    db,
    expect,
    gotoReady,
    postAction,
    refused,
    sessionState,
    signIn,
    test as base,
    type ActionResult,
} from "./support/test";

const en = messagesFor("en-US");
const suffix = randomBytes(4).toString("hex");
const E = () => state().enterpriseURL;
const ORG = () => state().orgE;
const BASE = () => `/o/${state().orgE.slug}`;

const test = base.extend<{ as: (account: AccountKey) => Promise<APIRequestContext> }>({
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures take their dependencies as an object pattern
    baseURL: async ({}, use) => {
        await use(state().enterpriseURL);
    },
    // eslint-disable-next-line no-empty-pattern -- see above
    as: async ({}, use) => {
        const contexts: APIRequestContext[] = [];
        await use(async (account) => {
            const api = await playwrightRequest.newContext({
                baseURL: state().enterpriseURL,
                storageState: await sessionState(account),
            });
            contexts.push(api);
            return api;
        });
        await Promise.all(contexts.map((c) => c.dispose()));
    },
});

/** A form action posted from the enterprise server's own origin. */
function post(api: APIRequestContext, path: string, fields: Record<string, string> = {}): Promise<ActionResult> {
    return postAction(api, path, fields, { origin: E() });
}

async function status(api: APIRequestContext, path: string): Promise<number> {
    return (await api.get(path, { maxRedirects: 0 })).status();
}

async function fake<T>(path: string, method = "GET"): Promise<T> {
    const response = await fetch(`${state().mapStorageURL}/__control/${path}`, { method });
    return (await response.json()) as T;
}

interface FakeWam {
    entityCollections: { url: string; type: string }[];
}

async function waitForLink(email: string, pathname: string): Promise<string> {
    let link: string | undefined;
    await expect
        .poll(() => (link = linkInMail(email, pathname)), { timeout: 20_000, message: `mail to ${email}` })
        .toBeTruthy();
    return link!;
}

function interpolate(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

test("1. registration with email verification makes the person owner of a new organization", async ({ page }) => {
    const r = en.onboarding.register;
    const v = en.onboarding.verify;
    const email = `founder-${suffix}@e2e.test`;
    const slug = `founded-${suffix}`;
    await gotoReady(page, "/register");
    await page.locator("#register-name").fill("Fiona Founder");
    await page.locator("#register-email").fill(email);
    await page.locator("#register-password").fill(state().password);
    await page.locator("#register-passwordConfirm").fill(state().password);
    await page.locator("#register-organizationName").fill(`Founded ${suffix}`);
    await page.locator("#register-organizationSlug").fill(slug);
    await page.getByRole("button", { name: r.submit }).click();
    await expect(page.getByRole("heading", { name: r.pendingTitle })).toBeVisible();
    // Nothing exists until the address is confirmed.
    expect(await db()`select 1 from accounts where email = ${email}`).toHaveLength(0);

    const link = await waitForLink(email, "/register/verify");
    expect(new URL(link).origin).toBe(E());
    await gotoReady(page, link);
    await expect(page.getByRole("heading", { name: v.title })).toBeVisible();
    await page.getByRole("button", { name: v.confirm }).click();
    await expect(page).toHaveURL(new RegExp(`/o/${slug}(/welcome)?(\\?.*)?$`));

    const rows = await db()<{ role: string; verified: boolean; workspaces: number }[]>`
        select m.role, a.email_verified_at is not null as verified,
               (select count(*)::int from workspaces w where w.organization_id = o.id) as workspaces
        from accounts a
        join organization_memberships m on m.account_id = a.id
        join organizations o on o.id = m.organization_id
        where a.email = ${email}`;
    expect(rows).toEqual([{ role: "owner", verified: true, workspaces: 1 }]);

    // The link works once.
    await page.context().clearCookies();
    await page.goto(link);
    await expect(page.getByRole("heading", { name: v.invalidTitle })).toBeVisible();
});

test("2. an invitation by email is accepted by a new person, once", async ({ page, browser }) => {
    const t = en.team;
    const inv = en.onboarding.invite;
    const email = `invitee-${suffix}@e2e.test`;
    await signIn(page.context(), "entOwner");
    await gotoReady(page, `${BASE()}/team`);
    await page.getByRole("button", { name: t.invite }).first().click();
    const dialog = page.getByRole("dialog", { name: t.inviteDialog.title });
    await dialog.locator("#invite-emails").fill(email);
    await dialog.locator("#invite-role").selectOption("employee");
    await dialog.locator(`#invite-ws-${ORG().workspaces.main}`).selectOption("member");
    await dialog.getByRole("button", { name: t.inviteDialog.submit }).click();
    await expect(dialog.getByText(t.inviteResults.sent)).toBeVisible();

    const link = await waitForLink(email, "/invite");
    const guest = await browser.newContext({ baseURL: E() });
    const invitee = await guest.newPage();
    await gotoReady(invitee, link);
    await expect(
        invitee.getByRole("heading", { name: interpolate(inv.title, { organization: "Org E" }) }),
    ).toBeVisible();
    await invitee.locator("#invite-name").fill("Ivy Invitee");
    await invitee.locator("#invite-password").fill(state().password);
    await invitee.locator("#invite-password-confirm").fill(state().password);
    await invitee.getByRole("button", { name: inv.createAndJoin }).click();
    await expect(invitee).toHaveURL(new RegExp(`${BASE()}\\?joined=1$`));

    const [membership] = await db()<{ role: string; workspace: string | null }[]>`
        select m.role, wm.role as workspace from accounts a
        join organization_memberships m on m.account_id = a.id and m.organization_id = ${ORG().id}
        left join workspace_memberships wm on wm.account_id = a.id and wm.workspace_id = ${ORG().workspaces.main}
        where a.email = ${email}`;
    expect(membership).toEqual({ role: "employee", workspace: "member" });

    // A second use of the link is refused, even by someone else.
    await guest.clearCookies();
    await invitee.goto(link);
    await expect(invitee.getByRole("heading", { name: inv.invalidTitle })).toBeVisible();
    await guest.close();
});

test("3. an owner grants workspace management, which stays inside that workspace", async ({ page, as }) => {
    const ws = en.workspaces;
    await signIn(page.context(), "entOwner");
    await gotoReady(page, `${BASE()}/workspaces/sales`);
    await page.locator("#assign-person").selectOption(state().accounts.entManager.id);
    await page.locator("#assign-role").selectOption("manager");
    await page.getByRole("button", { name: ws.detail.assignSubmit }).click();
    await expect(page.getByText(ws.detail.assigned)).toBeVisible();

    const manager = await as("entManager");
    expect(await status(manager, `${BASE()}/w/pipeline/settings`)).toBe(200);
    expect(await status(manager, `${BASE()}/workspaces/sales`)).toBe(200);
    // Another workspace's world does not exist for them; the team and integrations stay out of reach.
    expect(await status(manager, `${BASE()}/w/hq/settings`)).toBe(404);
    for (const path of [`${BASE()}/team`, `${BASE()}/api-keys`, `${BASE()}/settings`]) {
        expect([403, 404], path).toContain(await status(manager, path));
    }
    const world = (workspaceId: string, slug: string) => ({
        workspaceId,
        name: "Deals",
        slug,
        accessPolicy: "members",
    });
    const inMain = await post(manager, `${BASE()}/w/new`, world(ORG().workspaces.main, `nope-${suffix}`));
    expect(inMain.status).toBe(403);
    const inSales = await post(manager, `${BASE()}/w/new`, world(ORG().workspaces.sales, `deals-${suffix}`));
    expect(inSales.type).toBe("redirect");
    // Moving a world changes who administers it: never a workspace manager's decision.
    const move = await post(manager, `${BASE()}/w/pipeline/settings?/move`, { workspaceId: ORG().workspaces.main });
    expect(move.status).toBe(403);
    const rows = await db()<{ slug: string; workspace_id: string }[]>`
        select slug, workspace_id from worlds
        where organization_id = ${ORG().id} and slug in (${`deals-${suffix}`}, ${`nope-${suffix}`})`;
    expect(rows).toEqual([{ slug: `deals-${suffix}`, workspace_id: ORG().workspaces.sales }]);
});

test("4. an employee is denied administrative pages and actions", async ({ page, as }) => {
    const employee = await as("entEmployee");
    expect(await status(employee, BASE())).toBe(200);
    for (const path of [
        `${BASE()}/team`,
        `${BASE()}/workspaces`,
        `${BASE()}/api-keys`,
        `${BASE()}/domains`,
        `${BASE()}/audit`,
        `${BASE()}/settings`,
        `${BASE()}/w/hq/settings`,
        `${BASE()}/w/new`,
    ]) {
        expect([403, 404], path).toContain(await status(employee, path));
    }
    const attempts: [string, Record<string, string>][] = [
        [`${BASE()}/team?/invite`, { emails: `shadow-${suffix}@e2e.test`, role: "admin" }],
        [`${BASE()}/workspaces?/create`, { name: "Shadow", slug: `shadow-${suffix}` }],
        [`${BASE()}/components/${state().componentId}?/install`, { worldId: ORG().worlds.hq.id }],
        [
            `${BASE()}/w/new`,
            { workspaceId: ORG().workspaces.main, name: "Shadow", slug: `shadow-${suffix}`, accessPolicy: "members" },
        ],
    ];
    for (const [path, fields] of attempts) {
        const result = await post(employee, path, fields);
        expect([403, 404], `${path}: ${JSON.stringify(result)}`).toContain(result.status);
    }
    expect(await db()`select 1 from invitations where email = ${`shadow-${suffix}@e2e.test`}`).toHaveLength(0);
    expect(await db()`select 1 from workspaces where slug = ${`shadow-${suffix}`}`).toHaveLength(0);
    expect(await db()`select 1 from worlds where slug = ${`shadow-${suffix}`}`).toHaveLength(0);
    expect(
        await db()`select 1 from component_installations where world_id = ${ORG().worlds.hq.id}
                   and installed_by = ${state().accounts.entEmployee.id}`,
    ).toHaveLength(0);

    // Their home is the directory of offices and colleagues, without the administration section.
    await signIn(page.context(), "entEmployee");
    await page.goto(BASE());
    const nav = page.getByRole("navigation", { name: en.shell.nav.main }).first();
    await expect(nav.getByRole("link", { name: en.app.nav.directory, exact: true })).toBeVisible();
    await expect(nav.getByText(en.app.sections.administration, { exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: en.app.nav.people, exact: true })).toHaveCount(0);
});

test("5. other organizations, and platform administrators without support access, are kept out", async ({ as }) => {
    const outsider = await as("ownerB");
    for (const path of [BASE(), `${BASE()}/team`, `${BASE()}/w/hq`, `${BASE()}/components`, `${BASE()}/directory`]) {
        expect(await status(outsider, path), path).toBe(404);
    }
    const invite = await post(outsider, `${BASE()}/team?/invite`, { emails: `b-${suffix}@e2e.test`, role: "owner" });
    expect(invite.status).toBe(404);
    const owner = await as("entOwner");
    expect(await status(owner, `/o/${state().orgB.slug}`)).toBe(404);

    // A platform administrator is sent to the organization's Control Center page...
    const platform = await as("super");
    const refusedEntry = await platform.get(BASE(), { maxRedirects: 0 });
    expect(refusedEntry.status()).toBe(303);
    expect(refusedEntry.headers().location).toBe(`/admin/organizations/${ORG().id}`);
    // ...until they start a time-limited, justified support access, recorded in the organization's log.
    const reason = `E2E ticket ${suffix}`;
    const started = await post(platform, `/admin/organizations/${ORG().id}?/startSupport`, { reason, minutes: "15" });
    expect(started.type).toBe("redirect");
    expect(await status(platform, BASE())).toBe(200);
    expect(await status(platform, `${BASE()}/w/hq/settings`)).toBe(200);
    // Support never reaches integrations or secrets.
    for (const path of [`${BASE()}/api-keys`, `${BASE()}/domains`]) {
        expect([403, 404], path).toContain(await status(platform, path));
    }
    const [entry] = await db()<{ details: { reason?: string } }[]>`
        select details from audit_logs where organization_id = ${ORG().id} and action = 'support.start'
        order by occurred_at desc limit 1`;
    expect(entry?.details.reason).toBe(reason);
    await post(platform, `/admin/organizations/${ORG().id}?/endSupport`);
    expect(await status(platform, BASE())).toBe(303);
});

test("6. an administrator creates a workspace, a world in it and its first room", async ({ page }) => {
    const ws = en.workspaces;
    const slug = `eng-${suffix}`;
    await signIn(page.context(), "entAdmin");
    await gotoReady(page, `${BASE()}/workspaces`);
    await page.getByRole("button", { name: ws.create }).first().click();
    const dialog = page.getByRole("dialog", { name: ws.createTitle });
    await dialog.locator("#field-name").fill(`Engineering ${suffix}`);
    await dialog.locator("#field-slug").fill(slug);
    await dialog.getByRole("button", { name: en.common.actions.create }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE()}/workspaces/${slug}(\\?.*)?$`));
    const [workspace] = await db()<{ id: string }[]>`
        select id from workspaces where organization_id = ${ORG().id} and slug = ${slug}`;
    expect(workspace).toBeDefined();

    await page.getByRole("link", { name: ws.detail.newWorld }).first().click();
    await expect(page.locator("select[name=workspaceId]")).toHaveValue(workspace!.id);
    await page.locator("#field-name").fill(`Lab ${suffix}`);
    await page.locator("#field-slug").fill(`lab-${suffix}`);
    await page.locator("#field-roomName").fill("Bench");
    await page.locator("#field-roomSlug").fill("bench");
    await page.locator("#field-mapKind").selectOption("tmj");
    await page.locator("#field-mapUrl").fill("https://maps.e2e.test/bench.tmj");
    await page.getByRole("button", { name: en.worlds.create.submit }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE()}/w/lab-${suffix}$`));

    await page.goto(`${BASE()}/w/lab-${suffix}/rooms`);
    await expect(page.locator("main")).toContainText("Bench");
    const [world] = await db()<{ workspace_id: string; rooms: number }[]>`
        select w.workspace_id, (select count(*)::int from rooms r where r.world_id = w.id) as rooms
        from worlds w where w.organization_id = ${ORG().id} and w.slug = ${`lab-${suffix}`}`;
    expect(world).toEqual({ workspace_id: workspace!.id, rooms: 1 });
    // The workspace page lists its new world.
    await page.goto(`${BASE()}/workspaces/${slug}`);
    await expect(page.locator("main")).toContainText(`Lab ${suffix}`);

    // Then moves it to another workspace, from the world's settings.
    await gotoReady(page, `${BASE()}/w/lab-${suffix}/settings`);
    await page.locator("#field-workspaceId").selectOption(ORG().workspaces.sales);
    await page.getByRole("button", { name: ws.move.submit }).click();
    await expect(page.getByText(ws.move.done)).toBeVisible();
    const workspaceOf = async () =>
        (
            await db()<{ workspace_id: string }[]>`
                select workspace_id from worlds where organization_id = ${ORG().id} and slug = ${`lab-${suffix}`}`
        )[0]?.workspace_id;
    expect(await workspaceOf()).toBe(ORG().workspaces.sales);
    // A workspace of another organization is not a destination.
    const [foreign] = await db()<{ id: string }[]>`
        select id from workspaces where organization_id = ${state().orgA.id} limit 1`;
    const admin = await playwrightRequest.newContext({ baseURL: E(), storageState: await sessionState("entAdmin") });
    const result = await post(admin, `${BASE()}/w/lab-${suffix}/settings?/move`, { workspaceId: foreign!.id });
    expect(result.data).toEqual({ message: "validation" });
    expect(await workspaceOf()).toBe(ORG().workspaces.sales);
    await admin.dispose();
});

test.describe.serial("components reach WorkAdventure", () => {
    const collectionUrl = () => `${E()}/wa/worlds/${ORG().worlds.hq.id}/collection.json`;
    const officeWam = () => fake<FakeWam>("wam?path=office/map.wam");

    test("7. a component is searched, previewed and installed into a compatible office", async ({ page }) => {
        const c = en.catalog;
        await signIn(page.context(), "entAdmin");
        await gotoReady(page, `${BASE()}/components`);
        await page.locator("#catalog-q").fill("desk");
        await page.getByRole("button", { name: en.team.filters.apply }).click();
        await expect(page).toHaveURL(/[?&]q=desk/);
        await page.locator(`main a[href="${BASE()}/components/${state().componentId}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`${BASE()}/components/${state().componentId}$`));

        // The preview shows the real images of the variants.
        const preview = page.locator("section[aria-labelledby=variants-title] img").first();
        await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

        const hq = page.locator("section[aria-labelledby=install-title] li").filter({ hasText: "Headquarters" });
        await hq.getByRole("button", { name: c.install.submit }).click();
        await expect(page.getByText(c.install.installed)).toBeVisible();

        // The job links the world's collection into the room's map, on map-storage.
        await expect
            .poll(async () => (await officeWam()).entityCollections.map((e) => e.url), { timeout: 20_000 })
            .toEqual([collectionUrl()]);
        await page.goto(`${BASE()}/w/hq/components`);
        await expect(page.getByText(c.world.state.linked, { exact: true })).toBeVisible();

        // What WorkAdventure loads: the collection, with absolute image URLs served by AdminSpace.
        const collection = (await (await fetch(collectionUrl())).json()) as {
            collection: { id: string; imagePath: string }[];
        };
        expect(collection.collection.length).toBeGreaterThan(0);
        expect(collection.collection.every((p) => p.id.startsWith(`adminspace:${state().componentId}:`))).toBe(true);
        const image = await fetch(collection.collection[0]!.imagePath);
        expect(image.status).toBe(200);
        expect(image.headers.get("content-type")).toBe("image/png");
        // WorkAdventure's front fetches both from the play origin: they must allow cross-origin reads.
        const fromPlay = { headers: { origin: state().playUrl } };
        expect((await fetch(collectionUrl(), fromPlay)).headers.get("access-control-allow-origin")).toBe("*");
        const imageFromPlay = await fetch(collection.collection[0]!.imagePath, fromPlay);
        expect(imageFromPlay.headers.get("access-control-allow-origin")).toBe("*");
        expect(imageFromPlay.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    });

    test("8. a map-storage outage is surfaced, retried and repaired without duplicates", async ({ page }) => {
        const w = en.catalog.world;
        const [plant] = await db()<{ id: string }[]>`select id from components where key = 'plant-large'`;
        const patchesBefore = (await fake<{ calls: string[] }>("state")).calls.filter((c) => c.startsWith("PATCH"));
        await fake("outage?on=1", "POST");
        try {
            await signIn(page.context(), "entAdmin");
            await page.goto(`${BASE()}/components/${plant!.id}`);
            const hq = page.locator("section[aria-labelledby=install-title] li").filter({ hasText: "Headquarters" });
            await hq.getByRole("button", { name: en.catalog.install.submit }).click();
            await expect(page.getByText(en.catalog.install.installed)).toBeVisible();

            // The failure is shown, translated, while AdminSpace keeps retrying.
            await page.goto(`${BASE()}/w/hq/components`);
            await expect
                .poll(
                    async () => {
                        await page.reload();
                        return page.getByText(w.problems.unavailable, { exact: true }).count();
                    },
                    { timeout: 20_000 },
                )
                .toBeGreaterThan(0);
            await expect(page.getByText(w.state.pending, { exact: true })).toBeVisible();
        } finally {
            await fake("outage?on=0", "POST");
        }

        await page.getByRole("button", { name: w.retry }).click();
        await expect(page.getByText(w.retried)).toBeVisible();
        await expect
            .poll(
                async () => {
                    await page.reload();
                    return page.getByText(w.state.linked, { exact: true }).count();
                },
                { timeout: 30_000 },
            )
            .toBeGreaterThan(0);
        await expect(page.getByText(w.problems.unavailable, { exact: true })).toHaveCount(0);

        // One reference to the collection, and no write at all: it was already linked.
        const wam = await officeWam();
        expect(wam.entityCollections.filter((e) => e.url === collectionUrl())).toHaveLength(1);
        const patchesAfter = (await fake<{ calls: string[] }>("state")).calls.filter((c) => c.startsWith("PATCH"));
        expect(patchesAfter).toEqual(patchesBefore);
        // The job history keeps the failed attempts.
        const [job] = await db()<{ attempts: number; status: string }[]>`
            select attempts, status from jobs
            where organization_id = ${ORG().id} and kind = 'wam.link_collection' and attempts > 1
            order by created_at desc limit 1`;
        expect(job?.status).toBe("succeeded");
    });
});

test("an organization uploads its own component, checked and visible to it only", async ({ page, as }) => {
    const u = en.catalog.uploadPage;
    const source = path.resolve("catalog/builtin/desk-classic");
    const files = readdirSync(source).map((name) => ({ name, data: readFileSync(path.join(source, name)) }));
    /** The built-in desk as an organization package: another key and name, files optionally replaced. */
    const pack = (fields: Record<string, unknown>, replaced: Record<string, Buffer> = {}) => {
        const manifest = JSON.parse(readFileSync(path.join(source, "manifest.json"), "utf8")) as object;
        return buildZip([
            { name: "manifest.json", data: Buffer.from(JSON.stringify({ ...manifest, ...fields })) },
            ...files.filter((f) => f.name !== "manifest.json").map((f) => ({ ...f, data: replaced[f.name] ?? f.data })),
        ]);
    };
    const key = `uploaded-desk-${suffix}`;
    await signIn(page.context(), "entAdmin");

    // An SVG with a script, named like a PNG image of the package: refused, with the reason, translated.
    await gotoReady(page, `${BASE()}/components/upload`);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await page.locator("#upload-package").setInputFiles({
        name: "evil.zip",
        mimeType: "application/zip",
        buffer: pack({ key: `${key}-evil` }, { "oak.png": svg }),
    });
    await page.getByRole("button", { name: u.submit }).click();
    await expect(page.getByText(u.problems)).toBeVisible();
    await expect(page.getByText(interpolate(en.catalog.issues.notAnImage, { path: "oak.png" }))).toBeVisible();
    expect(await db()`select 1 from components where key = ${`${key}-evil`}`).toHaveLength(0);

    // A corrupt archive (deflate data damaged) is refused like any invalid archive, not as a server error.
    const corrupt = pack({ key: `${key}-corrupt` });
    corrupt.fill(0x41, 200, 400);
    await page
        .locator("#upload-package")
        .setInputFiles({ name: "bad.zip", mimeType: "application/zip", buffer: corrupt });
    await page.getByRole("button", { name: u.submit }).click();
    await expect(page.getByText(u.invalidArchive)).toBeVisible();

    // A valid package is published in this organization's library.
    await page.locator("#upload-package").setInputFiles({
        name: "desk.zip",
        mimeType: "application/zip",
        buffer: pack({ key, name: `Uploaded desk ${suffix}`, translations: {} }),
    });
    await page.getByRole("button", { name: u.submit }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE()}/components/[0-9a-f-]{36}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Uploaded desk ${suffix}`);
    const [row] = await db()<{ id: string; organization_id: string }[]>`
        select id, organization_id from components where key = ${key}`;
    expect(row?.organization_id).toBe(ORG().id);

    // Other organizations do not see it, by search or by address.
    const outsider = await as("ownerB");
    const search = await outsider.get(`/o/${state().orgB.slug}/components?q=${encodeURIComponent(suffix)}`);
    expect(await search.text()).not.toContain(`Uploaded desk ${suffix}`);
    expect(await status(outsider, `/o/${state().orgB.slug}/components/${row!.id}`)).toBe(404);
});

test("9. ownership is transferred safely", async ({ page, as }) => {
    const t = en.team;
    const org = state().orgT;
    const { entOwner, entAdmin } = state().accounts;
    const roles = async () => {
        const rows = await db()<{ account_id: string; role: string }[]>`
            select account_id, role from organization_memberships where organization_id = ${org.id}`;
        return Object.fromEntries(rows.map((r) => [r.account_id === entOwner.id ? "entOwner" : "entAdmin", r.role]));
    };
    await signIn(page.context(), "entOwner");
    await gotoReady(page, `/o/${org.slug}/team`);

    // A wrong password changes nothing.
    await page.locator("#transfer-target").selectOption(entAdmin.id);
    await page.locator("#transfer-password").fill("not-the-password");
    await page.getByRole("button", { name: t.transfer.submit }).click();
    await expect(page.getByText(t.transfer.wrongPassword)).toBeVisible();
    expect(await roles()).toEqual({ entOwner: "owner", entAdmin: "admin" });

    await page.locator("#transfer-target").selectOption(entAdmin.id);
    await page.locator("#transfer-password").fill(state().password);
    await page.getByRole("button", { name: t.transfer.submit }).click();
    await expect(page.getByText(t.done.transferred)).toBeVisible();
    expect(await roles()).toEqual({ entOwner: "admin", entAdmin: "owner" });
    await expect(page.getByRole("heading", { name: t.transfer.title })).toHaveCount(0);

    // The former owner can neither take it back nor demote the new owner.
    const former = await as("entOwner");
    const back = await post(former, `/o/${org.slug}/team?/transfer`, {
        accountId: entOwner.id,
        password: state().password,
    });
    expect(back.status).toBe(403);
    expect(refused(await post(former, `/o/${org.slug}/team?/role`, { accountId: entAdmin.id, role: "viewer" }))).toBe(
        true,
    );
    // Nobody becomes an owner through a role change or an invitation: only through a transfer.
    const promote = await post(await as("entAdmin"), `/o/${org.slug}/team?/role`, {
        accountId: entOwner.id,
        role: "owner",
    });
    expect(refused(promote)).toBe(true);
    // The new owner, the only one, can neither leave nor demote themselves.
    const owner = await as("entAdmin");
    expect(refused(await post(owner, `/o/${org.slug}/team?/leave`))).toBe(true);
    expect(refused(await post(owner, `/o/${org.slug}/team?/role`, { accountId: entAdmin.id, role: "admin" }))).toBe(
        true,
    );
    expect(await roles()).toEqual({ entOwner: "admin", entAdmin: "owner" });

    const audit = await db()<{ actor: string }[]>`
        select account_id as actor from audit_logs
        where organization_id = ${org.id} and action = 'organization.ownership_transfer'`;
    expect(audit).toEqual([{ actor: entOwner.id }]);
});

test("a platform administrator's password reset goes to the person, visibly to the organization", async ({
    page,
    as,
}) => {
    const person = state().accounts.entRecover;
    const platform = await as("super");
    const reset = await post(platform, "/admin/accounts?/resetPassword", { id: person.id });
    // With email, the administrator never sees a password.
    expect(reset.data).toEqual({ resetLinkSent: true, forEmail: person.email });
    // The previous password no longer works.
    const login = await postAction(
        await playwrightRequest.newContext({ baseURL: E() }),
        "/login",
        { email: person.email, password: state().password, redirectTo: "/" },
        { origin: E() },
    );
    expect(login.type).not.toBe("redirect");
    // The organization's audit log shows it.
    const [entry] = await db()<{ details: { by?: string } }[]>`
        select details from audit_logs
        where organization_id = ${ORG().id} and action = 'account.password.reset' and target_id = ${person.id}`;
    expect(entry?.details.by).toBe("platform");

    // The person chooses a new password from the link sent to their own address.
    const link = await waitForLink(person.email, "/reset-password");
    await gotoReady(page, link);
    const fresh = `Fresh-${suffix}-password`;
    await page.locator("input[name=password]").fill(fresh);
    await page.locator("input[name=passwordConfirm]").fill(fresh);
    await page.locator("form:has(input[name=passwordConfirm]) button[type=submit]").click();
    // No automatic login after a reset: the page confirms, then the new password works at the login page.
    await expect(page.getByRole("status")).toHaveText(en.onboarding.reset.done);
    const relogin = await postAction(
        await playwrightRequest.newContext({ baseURL: E() }),
        "/login",
        { email: person.email, password: fresh, redirectTo: "/" },
        { origin: E() },
    );
    expect(relogin.type).toBe("redirect");
});

test("10. Arabic pages are right to left and fit a phone screen", async ({ browser }) => {
    const ar = messagesFor("ar-SA");
    const pages = [
        BASE(),
        `${BASE()}/components`,
        `${BASE()}/components/${state().componentId}`,
        `${BASE()}/team`,
        `${BASE()}/workspaces`,
        `${BASE()}/workspaces/main`,
        `${BASE()}/directory`,
        `${BASE()}/w/hq/components`,
    ];
    for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 812 },
    ]) {
        const context = await browser.newContext({ baseURL: E(), viewport });
        await signIn(context, "entAdmin", "ar-SA");
        const page = await context.newPage();
        for (const path of pages) {
            await page.goto(path);
            await expect(page.locator("main").first()).toBeVisible();
            await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
            await expect(page.locator("html")).toHaveAttribute("lang", "ar-SA");
            expect.soft(await englishLeftovers(page, "ar-SA"), path).toEqual([]);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect.soft(overflow, `${path} overflows at ${viewport.width}px`).toBeLessThanOrEqual(0);
            if (viewport.width > 1000) {
                // The navigation is on the right of the content.
                const aside = await page.locator("aside").first().boundingBox();
                const main = await page.locator("main").first().boundingBox();
                expect.soft(aside!.x, path).toBeGreaterThan(main!.x);
            }
        }
        if (viewport.width < 500) {
            await expect(page.locator("aside").first()).toBeHidden();
            await page.getByRole("button", { name: ar.app.openMenu, exact: true }).click();
            const drawer = page.getByRole("dialog", { name: ar.shell.nav.main });
            await expect(drawer).toBeVisible();
            await expect(drawer.getByRole("link", { name: ar.app.nav.components, exact: true })).toBeVisible();
        }
        await context.close();
    }
});
