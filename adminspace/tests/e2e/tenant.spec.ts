/**
 * B (continued). Tenant isolation and identifier handling: the owner of organization A presents the
 * identifiers of organization B's objects, through A's URLs and through B's URLs. Every attempt must be
 * refused and leave B untouched (checked in the database). Malformed identifiers must never cause a 500.
 */
import { state } from "./support/state";
import { type ActionResult, db, expect, postAction, refused, test } from "./support/test";

const A = () => state().orgA;
const B = () => state().orgB;
const WA = () => `/o/${A().slug}/w/${A().world.slug}`;
const WB = () => `/o/${B().slug}/w/${B().world.slug}`;

/** Everything of organization B that an attack could change, as one comparable snapshot. */
async function snapshotB() {
    const b = B();
    const sql = db();
    return {
        org: await sql`select name, country_code, contact_email, default_locale from organizations where id = ${b.id}`,
        team: await sql`select account_id, role from organization_memberships where organization_id = ${b.id} order by account_id`,
        world: await sql`select name, description, access_policy, max_users, archived_at, settings from worlds where id = ${b.world.id}`,
        rooms: await sql`select id, slug, name, is_default, position, map_url, required_tags from rooms where world_id = ${b.world.id} order by id`,
        members: await sql`select id, uuid, kind, email, name from members where world_id = ${b.world.id} order by id`,
        memberTags: await sql`select mt.member_id, mt.tag_id from member_tags mt join tags t on t.id = mt.tag_id
                              where t.world_id = ${b.world.id} order by 1, 2`,
        tags: await sql`select id, name, color, description from tags where world_id = ${b.world.id} order by id`,
        bans: await sql`select id, revoked_at, expires_at from bans where world_id = ${b.world.id} order by id`,
        reports: await sql`select id, status, resolution_note from reports where world_id = ${b.world.id} order by id`,
        keys: await sql`select id, revoked_at, name from room_api_keys where organization_id = ${b.id} order by id`,
        domains: await sql`select id, host, verified_at from domains where organization_id = ${b.id} order by id`,
    };
}

test.describe("organization A's owner against organization B's objects", () => {
    test("through A's URLs: every action refuses B's identifiers and B is unchanged", async ({ as }) => {
        const api = await as("owner");
        const before = await snapshotB();
        const b = B();
        const bRoom = b.rooms[1]!.id;
        const bMember = b.members.alice!.id;
        const bTag = b.tags["vip-b"]!;
        const attempts: [string, Record<string, string>][] = [
            [`${WA()}/moderation?/revoke`, { banId: b.banId }],
            [`${WA()}/moderation/reports?/resolve`, { reportId: b.reportId, note: "pwned" }],
            [`${WA()}/moderation/reports?/dismiss`, { reportId: b.reportId }],
            [`${WA()}/moderation/reports?/banReported`, { reportId: b.reportId }],
            [`${WA()}/tags?/update`, { tagId: bTag, name: "pwned", color: "#000000" }],
            [`${WA()}/tags?/delete`, { tagId: bTag }],
            [`${WA()}/rooms?/delete`, { roomId: bRoom }],
            [`${WA()}/rooms?/setDefault`, { roomId: bRoom }],
            [`${WA()}/rooms?/checkMap`, { roomId: bRoom }],
            [`${WA()}/rooms?/reload`, { roomId: bRoom }],
            [
                `${WA()}/rooms/${bRoom}?/save`,
                { name: "pwned", slug: "pwned", mapKind: "tmj", mapUrl: "https://evil.example/x.tmj" },
            ],
            [`${WA()}/members/${bMember}?/save`, { kind: "guest", email: "pwned@evil.example", tags: "" }],
            [`${WA()}/members/${bMember}?/ban`, { reason: "pwned", duration: "permanent" }],
            [`${WA()}/members/${bMember}?/erase`, {}],
            [`${WA()}/live?/broadcast`, { text: "pwned", roomId: bRoom }],
            [`/o/${A().slug}/api-keys?/revoke`, { id: b.apiKeyId }],
            [`/o/${A().slug}/domains?/remove`, { id: b.domainId }],
            [`/o/${A().slug}/domains?/verify`, { id: b.domainId }],
            [`/o/${A().slug}/team?/role`, { accountId: state().accounts.ownerB.id, role: "viewer" }],
            [`/o/${A().slug}/team?/remove`, { accountId: state().accounts.ownerB.id }],
        ];
        const outcomes: Record<string, ActionResult> = {};
        for (const [path, fields] of attempts) {
            outcomes[path] = await postAction(api, path, fields);
        }
        for (const [path, outcome] of Object.entries(outcomes)) {
            expect(refused(outcome), `${path}: ${JSON.stringify(outcome)}`).toBe(true);
        }
        expect(await snapshotB()).toEqual(before);
        // banReported must not have banned B's reported person in A either.
        expect(await db()`select 1 from bans where member_uuid = ${b.members.alice!.uuid}`).toHaveLength(0);
    });

    test("through A's URLs: moving B's room is refused", async ({ as }) => {
        // Regression: rooms?/move used to answer success and audit room.move for a room of another world.
        const api = await as("owner");
        const before = await snapshotB();
        const bRoom = B().rooms[1]!.id;
        const outcome = await postAction(api, `${WA()}/rooms?/move`, { roomId: bRoom, direction: "up" });
        expect(await snapshotB()).toEqual(before);
        expect(refused(outcome), JSON.stringify(outcome)).toBe(true);
        expect(outcome.status, JSON.stringify(outcome)).toBe(404);
        expect(await db()`select 1 from audit_logs where action = 'room.move' and target_id = ${bRoom}`).toHaveLength(
            0,
        );
    });

    test("through A's URLs: B's pages and downloads answer 404", async ({ as }) => {
        const api = await as("owner");
        const b = B();
        for (const path of [
            `${WA()}/members/${b.members.alice!.id}`,
            `${WA()}/members/${b.members.alice!.id}/export`,
            `${WA()}/rooms/${b.rooms[0]!.id}`,
        ]) {
            const response = await api.get(path, { maxRedirects: 0 });
            expect(response.status(), path).toBe(404);
            expect(await response.text()).not.toContain("Bob Berg");
        }
    });

    test("through A's URLs: an API key cannot be scoped to B's world", async ({ as }) => {
        const api = await as("owner");
        const result = await postAction(api, `/o/${A().slug}/api-keys?/create`, {
            name: "cross-tenant",
            worldId: B().world.id,
        });
        expect(result).toMatchObject({ type: "failure", status: 400 });
        expect(await db()`select 1 from room_api_keys where name = 'cross-tenant'`).toHaveLength(0);
    });

    test("through B's URLs: pages and actions answer 404, like an unknown organization", async ({ as }) => {
        const api = await as("owner");
        const before = await snapshotB();
        for (const path of [
            `/o/${B().slug}`,
            `${WB()}`,
            `${WB()}/members`,
            `${WB()}/moderation`,
            `/o/${B().slug}/api-keys`,
        ]) {
            const response = await api.get(path, { maxRedirects: 0 });
            expect(response.status(), path).toBe(404);
        }
        // Same answer as an organization that does not exist: slugs cannot be enumerated.
        const unknown = await api.get("/o/does-not-exist", { maxRedirects: 0 });
        const known = await api.get(`/o/${B().slug}`, { maxRedirects: 0 });
        expect(known.status()).toBe(unknown.status());
        const normalize = (html: string, slug: string) =>
            html
                .replaceAll(slug, "X")
                .replace(/nonce="[^"]*"/g, "")
                .replace(/__sveltekit_\w+/g, "");
        expect(normalize(await known.text(), B().slug)).toBe(normalize(await unknown.text(), "does-not-exist"));

        const attempts: [string, Record<string, string>][] = [
            [`${WB()}/moderation?/revoke`, { banId: B().banId }],
            [`${WB()}/moderation/reports?/resolve`, { reportId: B().reportId }],
            [`${WB()}/tags?/delete`, { tagId: B().tags["vip-b"]! }],
            [`${WB()}/rooms?/delete`, { roomId: B().rooms[1]!.id }],
            [`${WB()}/members?/add`, { email: "intruder@evil.example" }],
            [`${WB()}/settings?/update`, { name: "pwned", accessPolicy: "public", maxUsers: "0" }],
            [`${WB()}/settings?/delete`, {}],
            [
                `/o/${B().slug}/settings?/update`,
                { name: "pwned", countryCode: "", defaultLocale: "en-US", contactEmail: "" },
            ],
            [`/o/${B().slug}/settings?/delete`, {}],
            [`/o/${B().slug}/api-keys?/revoke`, { id: B().apiKeyId }],
            [`/o/${B().slug}/domains?/remove`, { id: B().domainId }],
            [`/o/${B().slug}/team?/add`, { email: state().accounts.owner.email, role: "owner" }],
            [`/o/${B().slug}/w/new`, { name: "pwned", slug: "pwned", accessPolicy: "public" }],
        ];
        for (const [path, fields] of attempts) {
            const result = await postAction(api, path, fields);
            expect(result.status, path).toBe(404);
        }
        expect(await snapshotB()).toEqual(before);
    });
});

test.describe("malformed identifiers", () => {
    const garbage = ["not-a-uuid", "' or 1=1 --", "", "00000000-0000-0000-0000-000000000000x", "%00"];

    test("pages with a malformed id answer 404, never 500", async ({ as }) => {
        const api = await as("owner");
        for (const path of [
            `${WA()}/members/not-a-uuid`,
            `${WA()}/members/not-a-uuid/export`,
            `${WA()}/members/${encodeURIComponent("' or 1=1 --")}`,
            `${WA()}/rooms/not-a-uuid`,
            `${WA()}/settings/not-a-section`,
            `/o/${A().slug}/w/no-such-world`,
        ]) {
            const response = await api.get(path, { maxRedirects: 0 });
            expect(response.status(), path).toBe(404);
        }
    });

    test("actions with malformed ids answer 400 or 404, never 500", async ({ as }) => {
        const owner = await as("owner");
        const superadmin = await as("super");
        const targets: [typeof owner, string, string][] = [
            [owner, `${WA()}/moderation?/revoke`, "banId"],
            [owner, `${WA()}/moderation/reports?/resolve`, "reportId"],
            [owner, `${WA()}/moderation/reports?/banReported`, "reportId"],
            [owner, `${WA()}/tags?/update`, "tagId"],
            [owner, `${WA()}/tags?/delete`, "tagId"],
            [owner, `${WA()}/rooms?/setDefault`, "roomId"],
            [owner, `${WA()}/rooms?/delete`, "roomId"],
            [owner, `${WA()}/rooms?/checkMap`, "roomId"],
            [owner, `${WA()}/rooms?/reload`, "roomId"],
            [owner, `/o/${A().slug}/api-keys?/revoke`, "id"],
            [owner, `/o/${A().slug}/domains?/remove`, "id"],
            [owner, `/o/${A().slug}/domains?/verify`, "id"],
            [owner, `/o/${A().slug}/team?/role`, "accountId"],
            [owner, `/o/${A().slug}/team?/remove`, "accountId"],
            [superadmin, "/admin/accounts?/toggleStatus", "id"],
            [superadmin, "/admin/accounts?/unlock", "id"],
            [superadmin, "/admin/organizations?/delete", "id"],
            [superadmin, "/admin/catalog?/toggleWoka", "id"],
        ];
        const problems: string[] = [];
        for (const [api, path, field] of targets) {
            for (const value of garbage) {
                const extra: Record<string, string> = path.endsWith("tags?/update")
                    ? { name: "renamed" }
                    : path.includes("team?/role")
                      ? { role: "viewer" }
                      : {};
                const result = await postAction(api, path, { [field]: value, ...extra });
                if (![400, 404].includes(result.status) || result.type === "success") {
                    problems.push(
                        `${path} ${field}=${JSON.stringify(value)} -> ${result.http}/${result.type}/${result.status}`,
                    );
                }
            }
        }
        expect(problems).toEqual([]);
    });
});
