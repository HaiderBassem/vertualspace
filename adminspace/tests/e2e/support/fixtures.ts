/**
 * Fixture data of the end-to-end run, written straight into the temporary database (no application
 * code involved, so a defect in a service cannot hide itself by also corrupting its fixtures).
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type postgres from "postgres";
import { encryptV2, newTotpSecret, sha256Hex } from "./crypto";
import type { AccountKey, E2EState, OrgFixture } from "./state";

type Sql = postgres.Sql;

const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const ACCOUNTS: Record<AccountKey, { name: string; superadmin: boolean }> = {
    super: { name: "Sam Super", superadmin: true },
    owner: { name: "Olivia Owner", superadmin: false },
    admin: { name: "Adam Admin", superadmin: false },
    moderator: { name: "Mona Moderator", superadmin: false },
    viewer: { name: "Victor Viewer", superadmin: false },
    ownerB: { name: "Bea Owner-B", superadmin: false },
    mfa: { name: "Mia Mfa", superadmin: false },
    mfaStrict: { name: "Max Mfa-Strict", superadmin: false },
    lockout: { name: "Lou Lockout", superadmin: false },
    logout: { name: "Leo Logout", superadmin: false },
    switcher: { name: "Sid Switcher", superadmin: true },
    accept: { name: "Ada Accept", superadmin: true },
    redirect: { name: "Rex Redirect", superadmin: false },
    entOwner: { name: "Elena Owner", superadmin: false },
    entAdmin: { name: "Eric Admin", superadmin: false },
    entManager: { name: "Maya Manager", superadmin: false },
    entEmployee: { name: "Ezra Employee", superadmin: false },
    entRecover: { name: "Rita Recover", superadmin: false },
};

/** The organization of the enterprise journeys: two workspaces, a world in each, a room on map-storage. */
async function insertEnterpriseOrg(
    sql: Sql,
    accounts: E2EState["accounts"],
    mapStorageURL: string,
): Promise<E2EState["orgE"]> {
    const [org] = await sql<{ id: string }[]>`
        insert into organizations (slug, name, country_code, default_locale, contact_email)
        values ('orge', 'Org E', 'FR', 'en-US', 'contact@e.e2e.test') returning id`;
    if (!org) throw new Error("orge not created");
    const workspace = async (slug: string, name: string) => {
        const [row] = await sql<{ id: string }[]>`
            insert into workspaces (organization_id, slug, name) values (${org.id}, ${slug}, ${name}) returning id`;
        if (!row) throw new Error(`workspace ${slug} not created`);
        return row.id;
    };
    // Names that are not dictionary values: the Arabic journey checks that no English interface text remains.
    const workspaces = { main: await workspace("main", "Paris office"), sales: await workspace("sales", "Sales") };
    for (const [key, role] of [
        ["entOwner", "owner"],
        ["entAdmin", "admin"],
        ["entManager", "employee"],
        ["entEmployee", "employee"],
        ["entRecover", "employee"],
    ] as const) {
        await sql`insert into organization_memberships (organization_id, account_id, role)
                  values (${org.id}, ${accounts[key].id}, ${role})`;
    }
    const world = async (slug: string, name: string, workspaceId: string) => {
        const [row] = await sql<{ id: string }[]>`
            insert into worlds (workspace_id, organization_id, slug, name, access_policy)
            values (${workspaceId}, ${org.id}, ${slug}, ${name}, 'members') returning id`;
        if (!row) throw new Error(`world ${slug} not created`);
        return { id: row.id, slug };
    };
    const worlds = {
        hq: await world("hq", "Headquarters", workspaces.main),
        pipeline: await world("pipeline", "Pipeline", workspaces.sales),
    };
    const [room] = await sql<{ id: string }[]>`
        insert into rooms (world_id, slug, name, map_kind, wam_url, is_default, position)
        values (${worlds.hq.id}, 'office', 'Office', 'wam', ${`${mapStorageURL}/office/map.wam`}, true, 0)
        returning id`;
    if (!room) throw new Error("wam room not created");
    return { id: org.id, slug: "orge", workspaces, worlds, wamRoomId: room.id };
}

/** An organization of its own for the ownership transfer journey (it changes who owns it). */
async function insertTransferOrg(sql: Sql, accounts: E2EState["accounts"]): Promise<E2EState["orgT"]> {
    const [org] = await sql<{ id: string }[]>`
        insert into organizations (slug, name) values ('orgt', 'Org T') returning id`;
    if (!org) throw new Error("orgt not created");
    await sql`insert into workspaces (organization_id, slug, name) values (${org.id}, 'main', 'Main workspace')`;
    await sql`insert into organization_memberships (organization_id, account_id, role)
              values (${org.id}, ${accounts.entOwner.id}, 'owner'), (${org.id}, ${accounts.entAdmin.id}, 'admin')`;
    return { id: org.id, slug: "orgt" };
}

async function insertOrg(
    sql: Sql,
    letter: "a" | "b",
    roles: Record<string, string>,
    playUrl: string,
): Promise<OrgFixture> {
    const slug = `org${letter}`;
    const name = `Org ${letter.toUpperCase()}`;
    const [org] = await sql<{ id: string }[]>`
        insert into organizations (slug, name, country_code, default_locale, contact_email)
        values (${slug}, ${name}, 'FR', 'en-US', ${`contact@${letter}.e2e.test`}) returning id`;
    if (!org) throw new Error("organization not created");
    await sql`insert into workspaces (organization_id, slug, name) values (${org.id}, 'main', 'Main workspace')`;
    for (const [accountId, role] of Object.entries(roles)) {
        await sql`insert into organization_memberships (organization_id, account_id, role)
                  values (${org.id}, ${accountId}, ${role})`;
    }
    const worldSlug = `world${letter}`;
    const [world] = await sql<{ id: string }[]>`
        insert into worlds (workspace_id, organization_id, slug, name, description, access_policy)
        values ((select id from workspaces where organization_id = ${org.id}), ${org.id}, ${worldSlug}, ${`Main World ${letter.toUpperCase()}`}, 'Fixture world', 'members')
        returning id`;
    if (!world) throw new Error("world not created");
    const rooms: { id: string; slug: string }[] = [];
    for (const [index, room] of ["lobby", "second"].entries()) {
        const [row] = await sql<{ id: string }[]>`
            insert into rooms (world_id, slug, name, map_kind, map_url, is_default, position)
            values (${world.id}, ${room}, ${room === "lobby" ? "Lobby" : "Second room"}, 'tmj',
                    ${`https://maps.e2e.test/${room}.tmj`}, ${index === 0}, ${index})
            returning id`;
        if (!row) throw new Error("room not created");
        rooms.push({ id: row.id, slug: room });
    }
    const tags: Record<string, string> = {};
    for (const tag of [`vip${letter === "b" ? "-b" : ""}`, "admin"]) {
        const [row] = await sql<{ id: string }[]>`
            insert into tags (world_id, name, color) values (${world.id}, ${tag}, '#336699') returning id`;
        if (!row) throw new Error("tag not created");
        tags[tag] = row.id;
    }
    const members: Record<string, { id: string; uuid: string }> = {};
    const people = [
        {
            key: "alice",
            email: `alice@${letter}.e2e.test`,
            name: letter === "a" ? "Alice Anders" : "Bob Berg",
            kind: "member",
        },
        { key: "tagtarget", email: `tagtarget@${letter}.e2e.test`, name: "Tag Target", kind: "member" },
        { key: "guest", email: null, name: "Guest Person", kind: "guest" },
    ] as const;
    for (const person of people) {
        const uuid = person.email ?? `guest-${letter}-0000-uuid`;
        const [row] = await sql<{ id: string }[]>`
            insert into members (world_id, uuid, kind, email, name, visit_count, last_seen_at)
            values (${world.id}, ${uuid}, ${person.kind}, ${person.email}, ${person.name}, 3, now() - interval '2 days')
            returning id`;
        if (!row) throw new Error("member not created");
        members[person.key] = { id: row.id, uuid };
    }
    const vip = tags[`vip${letter === "b" ? "-b" : ""}`];
    await sql`insert into member_tags (member_id, tag_id) values (${members.alice!.id}, ${vip!})`;
    const [ban] = await sql<{ id: string }[]>`
        insert into bans (world_id, member_uuid, name, reason, banned_by)
        values (${world.id}, ${`banned@${letter}.e2e.test`}, 'Banned Person', ${`Spam ${letter}`}, 'fixture')
        returning id`;
    const [report] = await sql<{ id: string }[]>`
        insert into reports (world_id, room_url, reported_uuid, reporter_uuid, comment)
        values (${world.id}, ${`${playUrl}/@/${slug}/${worldSlug}/lobby`}, ${members.alice!.uuid},
                ${members.guest!.uuid}, ${`Rude behaviour in ${letter}`})
        returning id`;
    const key = `wa_rk_${randomBytes(32).toString("base64url")}`;
    const [apiKey] = await sql<{ id: string }[]>`
        insert into room_api_keys (organization_id, world_id, name, key_hash, key_prefix)
        values (${org.id}, ${world.id}, ${`Key ${letter.toUpperCase()}`}, ${sha256Hex(key)}, ${key.slice(0, 12)})
        returning id`;
    const [domain] = await sql<{ id: string }[]>`
        insert into domains (organization_id, host, challenge)
        values (${org.id}, ${`${letter}.e2e.test`}, ${randomBytes(16).toString("hex")}) returning id`;
    if (!ban || !report || !apiKey || !domain) throw new Error("org fixtures not created");
    return {
        id: org.id,
        slug,
        name,
        world: { id: world.id, slug: worldSlug, name: `Main World ${letter.toUpperCase()}` },
        rooms,
        tags,
        members,
        banId: ban.id,
        reportId: report.id,
        apiKeyId: apiKey.id,
        domainId: domain.id,
    };
}

export async function seedFixtures(
    sql: Sql,
    secrets: { password: string; appSecret: string; playUrl: string; mapStorageURL: string },
): Promise<
    Pick<
        E2EState,
        | "accounts"
        | "orgA"
        | "orgB"
        | "orgDelete"
        | "worldDelete"
        | "plurals"
        | "pluralWorlds"
        | "mfaStrictSecret"
        | "orgE"
        | "orgT"
        | "componentId"
    >
> {
    const passwordHash = await hash(secrets.password, ARGON2);
    const accounts = {} as E2EState["accounts"];
    for (const [key, info] of Object.entries(ACCOUNTS) as [AccountKey, (typeof ACCOUNTS)[AccountKey]][]) {
        const email = `${key.toLowerCase()}@e2e.test`;
        const [row] = await sql<{ id: string }[]>`
            insert into accounts (email, name, password_hash, is_superadmin, time_zone, email_verified_at)
            values (${email}, ${info.name}, ${passwordHash}, ${info.superadmin}, 'Europe/Paris', now()) returning id`;
        if (!row) throw new Error("account not created");
        accounts[key] = { id: row.id, email };
    }

    // Second factor of mfaStrict, enabled directly (its MFA flow is exercised on the strict server).
    const mfaStrictSecret = newTotpSecret();
    await sql`update accounts set totp_secret = ${encryptV2(mfaStrictSecret, secrets.appSecret)},
              totp_enabled_at = now() where id = ${accounts.mfaStrict.id}`;

    const rolesA = {
        [accounts.owner.id]: "owner",
        [accounts.admin.id]: "admin",
        [accounts.moderator.id]: "moderator",
        [accounts.viewer.id]: "viewer",
        [accounts.mfa.id]: "viewer",
        [accounts.mfaStrict.id]: "viewer",
        [accounts.logout.id]: "viewer",
        [accounts.lockout.id]: "viewer",
        [accounts.redirect.id]: "viewer",
        // Platform administrators who tour the organization's pages: since the tenant boundary, a platform
        // role alone no longer opens an organization (support access does, and is tested separately).
        [accounts.super.id]: "admin",
        [accounts.switcher.id]: "admin",
        [accounts.accept.id]: "admin",
    };
    const orgA = await insertOrg(sql, "a", rolesA, secrets.playUrl);
    const orgB = await insertOrg(sql, "b", { [accounts.ownerB.id]: "owner" }, secrets.playUrl);

    // An organization and a world that the deletion permission tests may really delete.
    const [orgDelete] = await sql<{ id: string }[]>`
        insert into organizations (slug, name) values ('orgdel', 'Org To Delete') returning id`;
    if (!orgDelete) throw new Error("orgdel not created");
    await sql`insert into workspaces (organization_id, slug, name) values (${orgDelete.id}, 'main', 'Main workspace')`;
    for (const role of ["owner", "admin", "moderator", "viewer"] as const) {
        await sql`insert into organization_memberships (organization_id, account_id, role)
                  values (${orgDelete.id}, ${accounts[role].id}, ${role})`;
    }
    const [worldDelete] = await sql<{ id: string }[]>`
        insert into worlds (workspace_id, organization_id, slug, name)
        values ((select id from workspaces where organization_id = ${orgA.id}), ${orgA.id}, 'deleteme', 'World To Delete') returning id`;
    if (!worldDelete) throw new Error("deleteme not created");

    // Organizations with 0, 1, 2 and 5 worlds, and worlds with 0, 1, 2 and 5 members (plural forms).
    const plurals = [0, 1, 2, 5].map((n) => ({ slug: `plural-${n}`, worlds: n }));
    const memberCounts: Record<string, number[]> = { "plural-1": [0], "plural-2": [1, 2], "plural-5": [5] };
    const pluralWorlds: E2EState["pluralWorlds"] = [];
    for (const { slug, worlds } of plurals) {
        const [org] = await sql<{ id: string }[]>`
            insert into organizations (slug, name) values (${slug}, ${`Plural ${worlds}`}) returning id`;
        if (!org) throw new Error("plural org not created");
        await sql`insert into workspaces (organization_id, slug, name) values (${org.id}, 'main', 'Main workspace')`;
        await sql`insert into organization_memberships (organization_id, account_id, role)
                  values (${org.id}, ${accounts.super.id}, 'owner')`;
        for (let i = 0; i < worlds; i++) {
            const [world] = await sql<{ id: string }[]>`
                insert into worlds (workspace_id, organization_id, slug, name)
                values ((select id from workspaces where organization_id = ${org.id}), ${org.id}, ${`w${i}`}, ${`Plural world ${i}`})
                returning id`;
            if (!world) throw new Error("plural world not created");
            const members = memberCounts[slug]?.[i];
            if (members === undefined) continue;
            for (let m = 0; m < members; m++) {
                await sql`insert into members (world_id, uuid, kind, email, name)
                          values (${world.id}, ${`p${m}@${slug}.e2e.test`}, 'member', ${`p${m}@${slug}.e2e.test`}, ${`Person ${m}`})`;
            }
            pluralWorlds.push({ org: slug, slug: `w${i}`, members });
        }
    }

    const orgE = await insertEnterpriseOrg(sql, accounts, secrets.mapStorageURL);
    const orgT = await insertTransferOrg(sql, accounts);
    // The built-in pack was imported by global-setup.ts (scripts/catalog-import.ts).
    const [component] = await sql<{ id: string }[]>`select id from components where key = 'desk-classic'`;
    if (!component) throw new Error("built-in catalog not imported");
    // Public registration open, with email verification: only the enterprise server has SMTP, the
    // others answer that registration is unavailable.
    await sql`insert into instance_settings (id, settings)
              values (1, ${sql.json({ registration: "open", registrationEmailVerification: true })})`;

    return {
        accounts,
        orgE,
        orgT,
        componentId: component.id,
        orgA,
        orgB,
        orgDelete: { id: orgDelete.id, slug: "orgdel" },
        worldDelete: { id: worldDelete.id, slug: "deleteme" },
        plurals,
        pluralWorlds,
        mfaStrictSecret,
    };
}
