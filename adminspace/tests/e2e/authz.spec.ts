/**
 * B. Authorization at the HTTP boundary. Every check calls the real endpoint (page load or form
 * action, with the site's Origin) with the session of each organization role, and compares the
 * outcome with PERMISSIONS (src/lib/server/auth/rbac.ts). Allowed calls are built so that they pass
 * the permission check and then stop on their data (unknown id, invalid field), leaving fixtures intact.
 */
import type { APIRequestContext } from "@playwright/test";
import { PERMISSIONS, type Permission } from "../../src/lib/server/auth/rbac";
import { state } from "./support/state";
import { type ActionResult, db, expect, postAction, randomUuid, test } from "./support/test";

type Role = "viewer" | "moderator" | "admin" | "owner";
const ROLES: Role[] = ["viewer", "moderator", "admin", "owner"];

/** The intended matrix, written out: a change of PERMISSIONS must be a deliberate change of this test. */
type MatrixRole = Role | "employee";
const ALL: MatrixRole[] = ["employee", "viewer", "moderator", "admin", "owner"];
const STAFF: MatrixRole[] = ["viewer", "moderator", "admin", "owner"];
const MODERATORS: MatrixRole[] = ["moderator", "admin", "owner"];
const ADMINS: MatrixRole[] = ["admin", "owner"];
const EXPECTED: Record<Permission, MatrixRole[]> = {
    "organization.read": ALL,
    "organization.update": ADMINS,
    "organization.delete": ["owner"],
    "directory.read": ALL,
    "team.read": STAFF,
    "team.invite": ADMINS,
    "team.manage": ADMINS,
    "ownership.transfer": ["owner"],
    "workspace.read": STAFF,
    "workspace.create": ADMINS,
    "workspace.update": ADMINS,
    "workspace.archive": ADMINS,
    "world.read": STAFF,
    "world.create": ADMINS,
    "world.update": ADMINS,
    "world.delete": ["owner"],
    "room.manage": ADMINS,
    "member.read": STAFF,
    "member.manage": MODERATORS,
    "tag.manage": ADMINS,
    "moderation.manage": MODERATORS,
    "live.manage": MODERATORS,
    "secrets.read": ADMINS,
    "apiKey.manage": ADMINS,
    "domain.manage": ADMINS,
    "audit.read": STAFF,
    "component.read": ALL,
    "component.install": ADMINS,
    "component.manage": ADMINS,
    "integration.manage": ADMINS,
    "integration.personal": ALL,
    "presence.view": STAFF,
};

test("PERMISSIONS is the documented role matrix", () => {
    const actual = Object.fromEntries(
        Object.entries(PERMISSIONS).map(([permission, roles]) => [permission, [...roles].sort()]),
    );
    const expected = Object.fromEntries(
        Object.entries(EXPECTED).map(([permission, roles]) => [permission, [...roles].sort()]),
    );
    expect(actual).toEqual(expected);
});

interface Outcome {
    status: number;
    result?: ActionResult;
}

interface Check {
    name: string;
    permission: Permission;
    run: (api: APIRequestContext) => Promise<Outcome>;
    /** Status expected when allowed (the call then stops on its data). */
    allowedStatus: number;
}

const A = () => state().orgA;
const W = () => `/o/${A().slug}/w/${A().world.slug}`;

const page = (path: string | (() => string)) => async (api: APIRequestContext) => {
    const response = await api.get(typeof path === "string" ? path : path(), { maxRedirects: 0 });
    return { status: response.status() };
};
const action = (path: () => string, fields: () => Record<string, string>) => async (api: APIRequestContext) => {
    const result = await postAction(api, path(), fields());
    return { status: result.status, result };
};

const CHECKS: Check[] = [
    { name: "read the organization", permission: "organization.read", run: page("/o/orga"), allowedStatus: 200 },
    { name: "read the audit log", permission: "audit.read", run: page("/o/orga/audit"), allowedStatus: 200 },
    {
        name: "read the world activity",
        permission: "audit.read",
        run: page("/o/orga/w/worlda/activity"),
        allowedStatus: 200,
    },
    { name: "read members", permission: "member.read", run: page("/o/orga/w/worlda/members"), allowedStatus: 200 },
    { name: "read tags", permission: "member.read", run: page("/o/orga/w/worlda/tags"), allowedStatus: 200 },
    { name: "read bans", permission: "member.read", run: page("/o/orga/w/worlda/moderation"), allowedStatus: 200 },
    {
        name: "open organization settings",
        permission: "organization.update",
        run: page("/o/orga/settings"),
        allowedStatus: 200,
    },
    {
        name: "update organization settings",
        permission: "organization.update",
        run: action(
            () => `/o/${A().slug}/settings?/update`,
            () => ({ name: "", countryCode: "", defaultLocale: "en-US", contactEmail: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "change a team role",
        permission: "team.manage",
        run: action(
            () => `/o/${A().slug}/team?/role`,
            () => ({ accountId: randomUuid(), role: "viewer" }),
        ),
        allowedStatus: 404,
    },
    {
        name: "invite people",
        permission: "team.invite",
        run: action(
            () => `/o/${A().slug}/team?/invite`,
            () => ({ emails: "", role: "viewer" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "remove a team member",
        permission: "team.manage",
        run: action(
            () => `/o/${A().slug}/team?/remove`,
            () => ({ accountId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    { name: "open the new world page", permission: "world.create", run: page("/o/orga/w/new"), allowedStatus: 200 },
    {
        name: "create a world",
        permission: "world.create",
        run: action(
            () => `/o/${A().slug}/w/new`,
            () => ({ name: "", slug: "!!", accessPolicy: "public" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "open world settings",
        permission: "world.update",
        run: page("/o/orga/w/worlda/settings"),
        allowedStatus: 200,
    },
    {
        name: "open a world settings section",
        permission: "world.update",
        run: page("/o/orga/w/worlda/settings/integrations"),
        allowedStatus: 200,
    },
    {
        name: "update world settings",
        permission: "world.update",
        run: action(
            () => `${W()}/settings?/update`,
            () => ({ name: "", accessPolicy: "public", maxUsers: "0" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "save a world settings section",
        permission: "world.update",
        run: action(
            () => `${W()}/settings/branding`,
            () => ({ "branding.backgroundColor": "not-a-color" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "open a room",
        permission: "room.manage",
        run: page(() => `${W()}/rooms/${A().rooms[0]!.id}`),
        allowedStatus: 200,
    },
    {
        name: "open the new room page",
        permission: "room.manage",
        run: page("/o/orga/w/worlda/rooms/new"),
        allowedStatus: 200,
    },
    {
        name: "set the default room",
        permission: "room.manage",
        run: action(
            () => `${W()}/rooms?/setDefault`,
            () => ({ roomId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "delete a room",
        permission: "room.manage",
        run: action(
            () => `${W()}/rooms?/delete`,
            () => ({ roomId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    { name: "open the Desk Manager", permission: "room.manage", run: page("/o/orga/desks"), allowedStatus: 200 },
    ...(
        [
            ["assign a desk", "assign", { deskId: "x", owner: "someone@example.test" }],
            ["free a desk", "free", { deskId: "x" }],
            ["take a desk out of service", "toggle", { deskId: "x", disabled: "1" }],
            ["rename a desk", "rename", { deskId: "x", name: "Mine" }],
            ["change who can claim a desk", "claim", { deskId: "x", mode: "static" }],
            ["remove a desk", "remove", { deskId: "x" }],
            ["assign several desks", "bulkAssign", { lines: "Desk 1, someone@example.test" }],
            [
                "add desks",
                "create",
                {
                    columns: "1",
                    rows: "1",
                    deskWidth: "2",
                    deskHeight: "2",
                    gapX: "0",
                    gapY: "0",
                    originX: "1",
                    originY: "1",
                    namePrefix: "Desk",
                    startNumber: "1",
                    claimMode: "dynamic",
                },
            ],
        ] as const satisfies readonly (readonly [string, string, Record<string, string>])[]
    ).map(([name, operation, fields]): Check => ({
        name,
        permission: "room.manage",
        // The room does not exist: an allowed call passes the permission check and stops on its data.
        run: action(
            () => `/o/${A().slug}/desks?/${operation}`,
            () => ({ roomId: randomUuid(), ...fields }),
        ),
        allowedStatus: 404,
    })),
    {
        name: "reload a room",
        permission: "live.manage",
        run: action(
            () => `${W()}/rooms?/reload`,
            () => ({ roomId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "broadcast a live message",
        permission: "live.manage",
        run: action(
            () => `${W()}/live?/broadcast`,
            () => ({ text: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "add a member",
        permission: "member.manage",
        run: action(
            () => `${W()}/members?/add`,
            () => ({ email: "not-an-email" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "import members",
        permission: "member.manage",
        run: action(
            () => `${W()}/members?/import`,
            () => ({ file: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "edit a member",
        permission: "member.manage",
        run: action(
            () => `${W()}/members/${A().members.alice!.id}?/save`,
            () => ({ kind: "bogus" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "edit a member's employee profile",
        permission: "member.manage",
        run: action(
            () => `${W()}/members/${A().members.alice!.id}?/profile`,
            () => ({ managerEmail: "not-an-email" }),
        ),
        allowedStatus: 400,
    },
    { name: "open Who's in", permission: "presence.view", run: page("/o/orga/presence"), allowedStatus: 200 },
    {
        name: "read who is in right now",
        permission: "presence.view",
        run: page("/o/orga/presence/now"),
        allowedStatus: 200,
    },
    {
        name: "erase a member",
        permission: "member.manage",
        run: action(
            () => `${W()}/members/${randomUuid()}?/erase`,
            () => ({}),
        ),
        allowedStatus: 404,
    },
    {
        name: "export members (CSV)",
        permission: "member.manage",
        run: page("/o/orga/w/worlda/members/export?format=csv"),
        allowedStatus: 200,
    },
    {
        name: "export one person's data",
        permission: "member.manage",
        run: page(() => `${W()}/members/${A().members.alice!.id}/export`),
        allowedStatus: 200,
    },
    {
        name: "create a tag",
        permission: "tag.manage",
        run: action(
            () => `${W()}/tags?/create`,
            () => ({ name: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "delete a tag",
        permission: "tag.manage",
        run: action(
            () => `${W()}/tags?/delete`,
            () => ({ tagId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "ban from the moderation page",
        permission: "moderation.manage",
        run: action(
            () => `${W()}/moderation?/ban`,
            () => ({ reason: "", duration: "day" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "ban from a member page",
        permission: "moderation.manage",
        run: action(
            () => `${W()}/members/${A().members.alice!.id}?/ban`,
            () => ({ reason: "", duration: "day" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "revoke a ban",
        permission: "moderation.manage",
        run: action(
            () => `${W()}/moderation?/revoke`,
            () => ({ banId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "resolve a report",
        permission: "moderation.manage",
        run: action(
            () => `${W()}/moderation/reports?/resolve`,
            () => ({ reportId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "ban a reported person",
        permission: "moderation.manage",
        run: action(
            () => `${W()}/moderation/reports?/banReported`,
            () => ({ reportId: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    { name: "open API keys", permission: "apiKey.manage", run: page("/o/orga/api-keys"), allowedStatus: 200 },
    {
        name: "create an API key",
        permission: "apiKey.manage",
        run: action(
            () => `/o/${A().slug}/api-keys?/create`,
            () => ({ name: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "revoke an API key",
        permission: "apiKey.manage",
        run: action(
            () => `/o/${A().slug}/api-keys?/revoke`,
            () => ({ id: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    { name: "open domains", permission: "domain.manage", run: page("/o/orga/domains"), allowedStatus: 200 },
    {
        name: "remove a domain",
        permission: "domain.manage",
        run: action(
            () => `/o/${A().slug}/domains?/remove`,
            () => ({ id: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "add a domain",
        permission: "domain.manage",
        run: action(
            () => `/o/${A().slug}/domains?/add`,
            () => ({ host: "" }),
        ),
        allowedStatus: 400,
    },
    // Integration Center (organization-wide): the e2e servers configure no provider, so connecting stops on that.
    {
        name: "open the Integration Center",
        permission: "integration.manage",
        run: page("/o/orga/integrations"),
        allowedStatus: 200,
    },
    {
        name: "open an integration",
        permission: "integration.manage",
        run: page("/o/orga/integrations/slack"),
        allowedStatus: 200,
    },
    {
        name: "connect an organization integration",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/slack?/connect`,
            () => ({}),
        ),
        allowedStatus: 400,
    },
    {
        name: "open the notification destinations",
        permission: "integration.manage",
        run: page("/o/orga/integrations/notifications"),
        allowedStatus: 200,
    },
    {
        name: "add a notification destination",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/notifications?/create`,
            () => ({ kind: "webhook", name: "", url: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "send a test event",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/notifications?/test`,
            () => ({ id: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "open the delivery log",
        permission: "integration.manage",
        run: page("/o/orga/integrations/deliveries"),
        allowedStatus: 200,
    },
    {
        name: "retry a delivery",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/deliveries?/retry`,
            () => ({ id: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    {
        name: "open the automation API",
        permission: "integration.manage",
        run: page("/o/orga/integrations/automation"),
        allowedStatus: 200,
    },
    {
        name: "create an automation token",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/automation?/create`,
            () => ({ name: "" }),
        ),
        allowedStatus: 400,
    },
    {
        name: "revoke an automation token",
        permission: "integration.manage",
        run: action(
            () => `/o/${A().slug}/integrations/automation?/revoke`,
            () => ({ id: randomUuid() }),
        ),
        allowedStatus: 404,
    },
    // My integrations (personal): every role, for the account itself only.
    {
        name: "open My integrations",
        permission: "integration.personal",
        run: page("/o/orga/my-integrations"),
        allowedStatus: 200,
    },
    {
        name: "connect a personal integration",
        permission: "integration.personal",
        run: action(
            () => `/o/${A().slug}/my-integrations?/connect`,
            () => ({ provider: "google" }),
        ),
        allowedStatus: 400,
    },
];

for (const check of CHECKS) {
    for (const role of ROLES) {
        const allowed = EXPECTED[check.permission].includes(role);
        test(`${role} ${allowed ? "can" : "cannot"} ${check.name}`, async ({ as }) => {
            const api = await as(role);
            const outcome = await check.run(api);
            if (allowed) {
                expect(outcome.status, JSON.stringify(outcome.result ?? {})).toBe(check.allowedStatus);
            } else {
                expect(outcome.status, JSON.stringify(outcome.result ?? {})).toBe(403);
                if (outcome.result) expect(outcome.result.type).toBe("error");
            }
        });
    }
}

test.describe.serial("reserved tags", () => {
    test("a moderator cannot grant or remove the reserved tag admin", async ({ as }) => {
        const api = await as("moderator");
        const target = A().members.tagtarget!;
        const save = await postAction(api, `${W()}/members/${target.id}?/save`, {
            kind: "member",
            email: target.uuid,
            name: "Tag Target",
            tags: "admin",
        });
        expect(save).toMatchObject({ type: "failure", status: 400, data: { tagError: "reservedTag" } });
        const add = await postAction(api, `${W()}/members?/add`, {
            email: "promoted-by-mod@a.e2e.test",
            tags: "admin",
        });
        expect(add).toMatchObject({ type: "failure", status: 400, data: { tagError: "reservedTag" } });
        // Removing the reserved tag from someone who has it is refused as well.
        const alice = A().members.alice!;
        await db()`insert into member_tags (member_id, tag_id) values (${alice.id}, ${A().tags.admin!}) on conflict do nothing`;
        const remove = await postAction(api, `${W()}/members/${alice.id}?/save`, {
            kind: "member",
            email: alice.uuid,
            name: "Alice Anders",
            tags: "vip",
        });
        expect(remove).toMatchObject({ type: "failure", status: 400, data: { tagError: "reservedTag" } });
        await db()`delete from member_tags where member_id = ${alice.id} and tag_id = ${A().tags.admin!}`;

        const tags =
            await db()`select t.name from member_tags mt join tags t on t.id = mt.tag_id where mt.member_id = ${target.id}`;
        expect(tags).toHaveLength(0);
        expect(await db()`select 1 from members where email = 'promoted-by-mod@a.e2e.test'`).toHaveLength(0);
    });

    test("a moderator can give an existing ordinary tag, an admin can give admin", async ({ as }) => {
        const target = A().members.tagtarget!;
        const fields = (tags: string) => ({ kind: "member", email: target.uuid, name: "Tag Target", tags });
        const moderator = await as("moderator");
        expect(await postAction(moderator, `${W()}/members/${target.id}?/save`, fields("vip"))).toMatchObject({
            type: "success",
        });
        // A tag that does not exist yet would be created: only tag.manage may do that.
        expect(
            await postAction(moderator, `${W()}/members/${target.id}?/save`, fields("vip, brand-new")),
        ).toMatchObject({
            type: "failure",
            data: { tagError: "unknownTag" },
        });
        const admin = await as("admin");
        expect(await postAction(admin, `${W()}/members/${target.id}?/save`, fields("vip, admin"))).toMatchObject({
            type: "success",
        });
        const tags = await db()<{ name: string }[]>`
            select t.name from member_tags mt join tags t on t.id = mt.tag_id where mt.member_id = ${target.id} order by t.name`;
        expect(tags.map((t) => t.name)).toEqual(["admin", "vip"]);
        expect(await postAction(admin, `${W()}/members/${target.id}?/save`, fields(""))).toMatchObject({
            type: "success",
        });
    });
});

test.describe.serial("deletions", () => {
    test("only the owner deletes a world", async ({ as }) => {
        const { worldDelete } = state();
        for (const role of ["viewer", "moderator", "admin"] as const) {
            const result = await postAction(await as(role), `/o/orga/w/${worldDelete.slug}/settings?/delete`);
            expect(result.status, role).toBe(403);
            expect(await db()`select 1 from worlds where id = ${worldDelete.id}`).toHaveLength(1);
        }
        const result = await postAction(await as("owner"), `/o/orga/w/${worldDelete.slug}/settings?/delete`);
        expect(result).toMatchObject({ type: "redirect", location: "/o/orga" });
        expect(await db()`select 1 from worlds where id = ${worldDelete.id}`).toHaveLength(0);
    });

    test("only the owner deletes an organization", async ({ as }) => {
        const { orgDelete } = state();
        for (const role of ["viewer", "moderator", "admin"] as const) {
            const result = await postAction(await as(role), `/o/${orgDelete.slug}/settings?/delete`);
            expect(result.status, role).toBe(403);
            expect(await db()`select 1 from organizations where id = ${orgDelete.id}`).toHaveLength(1);
        }
        // The owner's session alone is not enough: the password is asked again.
        const owner = await as("owner");
        for (const password of [undefined, "not-the-password"]) {
            const refusedDeletion = await postAction(
                owner,
                `/o/${orgDelete.slug}/settings?/delete`,
                password ? { password } : {},
            );
            expect(refusedDeletion).toMatchObject({ type: "failure", status: 400, data: { message: "wrongPassword" } });
            expect(await db()`select 1 from organizations where id = ${orgDelete.id}`).toHaveLength(1);
        }
        const result = await postAction(owner, `/o/${orgDelete.slug}/settings?/delete`, { password: state().password });
        expect(result).toMatchObject({ type: "redirect", location: "/organizations" });
        expect(await db()`select 1 from organizations where id = ${orgDelete.id}`).toHaveLength(0);
    });
});

test.describe("platform administration", () => {
    const pages = [
        "/admin",
        "/admin/accounts",
        "/admin/organizations",
        "/admin/catalog",
        "/admin/settings",
        "/admin/audit",
    ];

    test("a superadmin opens every platform page", async ({ as }) => {
        const api = await as("super");
        for (const path of pages) {
            expect((await api.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
        }
    });

    for (const account of ["owner", "admin", "moderator", "viewer", "ownerB"] as const) {
        test(`${account} cannot open platform pages or call their actions`, async ({ as }) => {
            const api = await as(account);
            for (const path of pages) {
                expect((await api.get(path, { maxRedirects: 0 })).status(), path).toBe(403);
            }
            const me = state().accounts[account];
            const calls: [string, Record<string, string>][] = [
                ["/admin?/globalEvent", { name: "e2e", data: "" }],
                ["/admin/accounts?/create", { name: "Mallory", email: "mallory@e2e.test", isSuperadmin: "on" }],
                ["/admin/accounts?/toggleSuperadmin", { id: me.id }],
                ["/admin/accounts?/resetPassword", { id: state().accounts.super.id }],
                ["/admin/accounts?/resetMfa", { id: state().accounts.super.id }],
                ["/admin/accounts?/toggleStatus", { id: state().accounts.super.id }],
                ["/admin/accounts?/unlock", { id: me.id }],
                ["/admin/organizations?/create", { name: "Rogue", slug: "rogue", defaultLocale: "en-US" }],
                ["/admin/organizations?/delete", { id: state().orgB.id }],
                ["/admin/catalog?/toggleWoka", { id: "male1" }],
                ["/admin/settings", { playUrl: "https://evil.example" }],
            ];
            for (const [path, fields] of calls) {
                const result = await postAction(api, path, fields);
                expect(result.status, path).toBe(403);
            }
            const [row] = await db()<
                { is_superadmin: boolean }[]
            >`select is_superadmin from accounts where id = ${me.id}`;
            expect(row?.is_superadmin).toBe(false);
            expect(await db()`select 1 from accounts where email = 'mallory@e2e.test'`).toHaveLength(0);
            expect(await db()`select 1 from organizations where slug = 'rogue'`).toHaveLength(0);
            expect(await db()`select 1 from organizations where id = ${state().orgB.id}`).toHaveLength(1);
            const [superadmin] = await db()<
                { status: string }[]
            >`select status from accounts where id = ${state().accounts.super.id}`;
            expect(superadmin?.status).toBe("active");
        });
    }
});

test.describe("CSRF", () => {
    const fields = { name: "Renamed by CSRF", countryCode: "", defaultLocale: "en-US", contactEmail: "" };

    for (const origin of ["http://evil.example", null, "null"] as const) {
        test(`a form POST with Origin ${origin === null ? "(missing)" : origin} is refused`, async ({ as }) => {
            const api = await as("owner");
            const before = await db()`select name from organizations where id = ${A().id}`;
            const result = await postAction(api, `/o/${A().slug}/settings?/update`, fields, { origin });
            expect(result.http).toBe(403);
            expect(await db()`select name from organizations where id = ${A().id}`).toEqual(before);
        });
    }

    test("a cross-site login POST is refused", async ({ request }) => {
        const response = await request.post("/login", {
            headers: { origin: "http://evil.example" },
            form: { email: state().accounts.owner.email, password: state().password },
            maxRedirects: 0,
        });
        expect(response.status()).toBe(403);
        expect(response.headers()["set-cookie"]).toBeUndefined();
    });

    test("a text/plain POST from another site is refused", async ({ as }) => {
        const api = await as("owner");
        const response = await api.post(`/o/${A().slug}/settings?/update`, {
            headers: { origin: "http://evil.example", "content-type": "text/plain" },
            data: "name=Renamed+by+CSRF&defaultLocale=en-US",
            maxRedirects: 0,
        });
        expect(response.status()).toBe(403);
        expect((await db()`select name from organizations where id = ${A().id}`)[0]?.name).toBe(A().name);
    });
});
