/**
 * Contract tests: every Admin API answer is parsed with the schemas WorkAdventure itself uses
 * (vendored from libs/messages by `npm run contract:sync`). If WorkAdventure changes its contract,
 * `npm run contract:sync` followed by these tests shows what must change here.
 *
 * Needs the database of .env (docker compose up -d db && npm run db:migrate && npm run db:seed).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
    CompanionTextureCollection,
    ErrorApiData,
    isCapabilities,
    isMapDetailsData,
    isRoomRedirect,
    MemberData,
    wokaList,
} from "../src/lib/contract/workadventure";
import {
    FetchMemberDataByUuidResponse,
    FetchMemberDataByUuidSuccessResponse,
    ShortMapDescriptionList,
    WorldChatMembersData,
} from "../src/lib/contract/adminApi";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { config } from "../src/lib/server/config";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { findMember, setMemberTags } from "../src/lib/server/services/members";
import { entryPathOf, soleWorldPath } from "../src/lib/server/services/worlds";

const ORIGIN = "http://play.test";
const ORG = `contract-test-${Date.now()}`;
const WORLD = "world";
const ROOM_URL = `${ORIGIN}/@/${ORG}/${WORLD}/lobby`;
const ADMIN_UUID = "admin@example.com";
const GUEST_UUID = "6f1c9a52-0d7e-4c55-9b0a-4b8f9a3e2b11";

let organizationId = "";
let workspaceId = "";
let worldId = "";

async function call(path: string, init: RequestInit & { token?: boolean } = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.token !== false) headers.set("authorization", config().ADMIN_API_TOKEN);
    if (init.body) headers.set("content-type", "application/json");
    return dispatchAdminApi(new Request(`http://admin.test${path}`, { ...init, headers }), "198.51.100.10");
}

async function getJson(path: string): Promise<unknown> {
    const response = await call(path);
    expect(response.status).toBe(200);
    return response.json();
}

const enc = encodeURIComponent;

beforeAll(async () => {
    const [organization] = await db()
        .insert(schema.organizations)
        .values({ slug: ORG, name: "Contract test" })
        .returning();
    if (!organization) throw new Error("organization not created");
    organizationId = organization.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: organizationId, slug: "main", name: "Main" })
        .returning();
    if (!workspace) throw new Error("workspace not created");
    workspaceId = workspace.id;
    const [world] = await db()
        .insert(schema.worlds)
        .values({ organizationId, workspaceId, slug: WORLD, name: "Contract world", accessPolicy: "public" })
        .returning();
    if (!world) throw new Error("world not created");
    worldId = world.id;
    await db()
        .insert(schema.rooms)
        .values([
            {
                worldId,
                slug: "lobby",
                name: "Lobby",
                isDefault: true,
                mapKind: "wam",
                wamUrl: "https://maps.test/a.wam",
            },
            {
                worldId,
                slug: "vip",
                name: "VIP",
                mapKind: "tmj",
                mapUrl: "https://maps.test/b.tmj",
                requiredTags: ["vip"],
            },
        ]);
    await db()
        .insert(schema.members)
        .values({ worldId, uuid: ADMIN_UUID, email: ADMIN_UUID, kind: "member", name: "Ada" });
    const admin = await findMember(worldId, ADMIN_UUID);
    if (!admin) throw new Error("admin not created");
    await setMemberTags(worldId, admin.id, ["admin"]);
});

afterAll(async () => {
    await db().delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    await closeDb();
});

describe("authentication", () => {
    it("refuses calls without ADMIN_API_TOKEN with 403", async () => {
        const response = await call(`/api/map?playUri=${enc(ROOM_URL)}`, { token: false });
        expect(response.status).toBe(403);
    });

    it("serves capabilities without token", async () => {
        const response = await call("/api/capabilities", { token: false });
        expect(isCapabilities.parse(await response.json())["api/woka/list"]).toBe("v1");
    });
});

describe("GET /api/map", () => {
    it("answers MapDetailsData for a room", async () => {
        const data = isMapDetailsData.parse(await getJson(`/api/map?playUri=${enc(ROOM_URL)}`));
        expect(data.wamUrl).toBe("https://maps.test/a.wam");
        expect(data.group).toBe(`${ORG}/${WORLD}`);
    });

    it("redirects a world URL to its default room", async () => {
        const data = isRoomRedirect.parse(await getJson(`/api/map?playUri=${enc(`${ORIGIN}/@/${ORG}/${WORLD}`)}`));
        expect(data.redirectUrl).toBe(ROOM_URL);
    });

    it("answers ErrorApiData for an unknown room", async () => {
        const data = ErrorApiData.parse(
            await getJson(`/api/map?playUri=${enc(`${ORIGIN}/@/${ORG}/${WORLD}/missing`)}`),
        );
        expect(data.type).toBe("error");
    });
});

describe("GET /api/room/access", () => {
    it("lets a guest in and records them", async () => {
        const data = FetchMemberDataByUuidSuccessResponse.parse(
            await getJson(
                `/api/room/access?playUri=${enc(ROOM_URL)}&userIdentifier=${GUEST_UUID}` +
                    `&ipAddress=203.0.113.7&characterTextureIds[]=male1`,
            ),
        );
        expect(data.isCharacterTexturesValid).toBe(true);
        expect(data.world).toBe(`${ORIGIN}/@/${ORG}/${WORLD}/`);
        expect(await findMember(worldId, GUEST_UUID)).toBeDefined();
    });

    it("refuses a room requiring a tag the person does not hold", async () => {
        const data = FetchMemberDataByUuidResponse.parse(
            await getJson(
                `/api/room/access?playUri=${enc(`${ORIGIN}/@/${ORG}/${WORLD}/vip`)}` +
                    `&userIdentifier=${GUEST_UUID}&ipAddress=203.0.113.7`,
            ),
        );
        expect(data.status).toBe("error");
    });

    it("gives map edition to the admin tag", async () => {
        const data = FetchMemberDataByUuidSuccessResponse.parse(
            await getJson(
                `/api/room/access?playUri=${enc(ROOM_URL)}&userIdentifier=${ADMIN_UUID}` +
                    `&accessToken=token&ipAddress=203.0.113.8`,
            ),
        );
        expect(data.tags).toContain("admin");
        expect(data.canEdit).toBe(true);
    });
});

describe("bans", () => {
    it("refuses a ban from someone without the admin tag", async () => {
        const response = await call("/api/ban", {
            method: "POST",
            body: JSON.stringify({
                uuidToBan: ADMIN_UUID,
                playUri: ROOM_URL,
                name: "Ada",
                message: "test",
                byUserUuid: GUEST_UUID,
            }),
        });
        expect(response.status).toBe(200);
        expect(ErrorApiData.parse(await response.json()).status).toBe("error");
    });

    it("bans a guest by uuid and IP, then refuses them access", async () => {
        const response = await call("/api/ban", {
            method: "POST",
            body: JSON.stringify({
                uuidToBan: GUEST_UUID,
                playUri: ROOM_URL,
                name: "Guest",
                message: "Spam",
                byUserUuid: ADMIN_UUID,
                ipAddress: "203.0.113.7",
            }),
        });
        expect(z.object({ status: z.literal("ok") }).safeParse(await response.json()).success).toBe(true);

        // Banned through the IP address too: another identity from the same address is refused.
        const data = ErrorApiData.parse(
            await getJson(
                `/api/room/access?playUri=${enc(ROOM_URL)}` +
                    `&userIdentifier=7c2b1d3e-1111-4222-8333-944455556666&ipAddress=203.0.113.7`,
            ),
        );
        expect(data.status).toBe("error");
    });
});

describe("catalog, people and rooms", () => {
    it("serves the Woka list and companions", async () => {
        const list = wokaList.parse(await getJson(`/api/woka/list?roomUrl=${enc(ROOM_URL)}&uuid=x`));
        expect(Object.keys(list)).toContain("woka");
        CompanionTextureCollection.array().parse(await getJson(`/api/companion/list?roomUrl=${enc(ROOM_URL)}&uuid=x`));
    });

    it("searches members and lists chat members", async () => {
        const members = MemberData.array().parse(await getJson(`/api/members?playUri=${enc(ROOM_URL)}&searchText=ada`));
        expect(members.map((m) => m.id)).toContain(ADMIN_UUID);
        WorldChatMembersData.parse(await getJson(`/api/chat/members?playUri=${enc(ROOM_URL)}`));
    });

    it("lists the rooms of the same world, filtered by tags", async () => {
        const rooms = ShortMapDescriptionList.parse(
            await getJson(`/api/room/sameWorld?roomUrl=${enc(ROOM_URL)}&bypassTagFilter=false`),
        );
        expect(rooms.map((r) => r.name)).toEqual(["Lobby"]);
    });

    it("answers 204 to save-name", async () => {
        const response = await call("/api/save-name", {
            method: "POST",
            body: JSON.stringify({ playUri: ROOM_URL, userIdentifier: ADMIN_UUID, name: "Ada L." }),
        });
        expect(response.status).toBe(204);
        expect((await findMember(worldId, ADMIN_UUID))?.name).toBe("Ada L.");
    });
});

describe("rooms outside of any world", () => {
    const GLOBAL = `${ORIGIN}/_/global/maps.test/office.tmj`;
    const EMAIL = `contract-${Date.now()}@example.com`;
    let accountId = "";

    beforeAll(async () => {
        const [account] = await db()
            .insert(schema.accounts)
            .values({ email: EMAIL, name: "Contract Person", passwordHash: "not-a-real-hash" })
            .returning();
        accountId = account!.id;
    });
    afterAll(async () => {
        await db().delete(schema.accounts).where(eq(schema.accounts.id, accountId));
    });

    it("asks visitors who are not signed in to sign in", async () => {
        const map = (await getJson(`/api/map?playUri=${enc(GLOBAL)}`)) as { authenticationMandatory?: boolean };
        expect(map.authenticationMandatory).toBe(true);
        const data = ErrorApiData.parse(
            await getJson(`/api/room/access?playUri=${enc(GLOBAL)}&userIdentifier=${GUEST_UUID}`),
        );
        expect(data).toMatchObject({ status: "error", type: "redirect" });
    });

    it("refuses a signed-in identity that has no account here, and lets in one that has", async () => {
        const stranger = ErrorApiData.parse(
            await getJson(`/api/room/access?playUri=${enc(GLOBAL)}&userIdentifier=nobody@example.com&isLogged=1`),
        );
        expect(stranger).toMatchObject({ status: "error", type: "unauthorized" });
        const person = FetchMemberDataByUuidSuccessResponse.parse(
            await getJson(`/api/room/access?playUri=${enc(GLOBAL)}&userIdentifier=${EMAIL}&isLogged=1`),
        );
        expect(person.email).toBe(EMAIL);
    });
});

describe("POST /api/room/rename", () => {
    const OWNER = `owner-${Date.now()}@example.com`;
    const EMPLOYEE = `employee-${Date.now()}@example.com`;
    const accounts: string[] = [];

    beforeAll(async () => {
        for (const [email, role] of [
            [OWNER, "owner"],
            [EMPLOYEE, "employee"],
        ] as const) {
            const [account] = await db()
                .insert(schema.accounts)
                .values({ email, name: email, passwordHash: "not-a-real-hash" })
                .returning();
            accounts.push(account!.id);
            await db()
                .insert(schema.organizationMemberships)
                .values({ organizationId, accountId: account!.id, role, status: "active" });
        }
    });
    afterAll(async () => {
        for (const id of accounts) await db().delete(schema.accounts).where(eq(schema.accounts.id, id));
    });

    const rename = (userIdentifier: string, name: string) =>
        call("/api/room/rename", {
            method: "POST",
            body: JSON.stringify({ roomUrl: `${ORIGIN}/@/${ORG}/${WORLD}/vip`, userIdentifier, name }),
        });

    it("renames the room for someone who manages rooms, and refuses everybody else", async () => {
        expect((await rename(EMPLOYEE, "Nope")).status).toBe(403);
        expect((await rename("stranger@example.com", "Nope")).status).toBe(403);
        expect((await rename(OWNER, "   ")).status).toBe(400);
        const done = await rename(OWNER, "  Board room ");
        expect(done.status).toBe(200);
        expect(await done.json()).toEqual({ status: "ok", name: "Board room" });
        const rooms = ShortMapDescriptionList.parse(
            await getJson(`/api/room/sameWorld?roomUrl=${enc(ROOM_URL)}&bypassTagFilter=true`),
        );
        expect(rooms.map((r) => r.name).sort()).toEqual(["Board room", "Lobby"]);
    });

    it("needs the Admin API token", async () => {
        const response = await call("/api/room/rename", { method: "POST", body: "{}", token: false });
        expect(response.status).toBe(403);
    });
});

describe("where the address of the site leads", () => {
    const only = [{ organizationSlug: "acme", worldSlug: "office" }];
    const two = [...only, { organizationSlug: "acme", worldSlug: "lab" }];

    it("takes the only world when there is exactly one", () => {
        expect(soleWorldPath(only)).toBe("/@/acme/office");
        expect(soleWorldPath(two)).toBeUndefined();
        expect(soleWorldPath([])).toBeUndefined();
    });

    it("keeps the start room of the instance while it exists", async () => {
        const world = `/@/${ORG}/${WORLD}`;
        expect(await entryPathOf(world, async () => only)).toBe(world);
        expect(await entryPathOf(`${world}/lobby`, async () => only)).toBe(`${world}/lobby`);
        // Rooms outside of any world are always there.
        expect(await entryPathOf("/_/global/maps.test/office.tmj", async () => only)).toBe(
            "/_/global/maps.test/office.tmj",
        );
    });

    it("falls back to the only world when the start room is gone or was never set", async () => {
        // The world it pointed at was deleted: the site still has an entrance.
        expect(await entryPathOf(`/@/${ORG}/deleted-world`, async () => only)).toBe("/@/acme/office");
        expect(await entryPathOf(`/@/${ORG}/${WORLD}/deleted-room`, async () => only)).toBe("/@/acme/office");
        expect(await entryPathOf(undefined, async () => only)).toBe("/@/acme/office");
        expect(await entryPathOf("not an address", async () => only)).toBe("/@/acme/office");
        // With several worlds nobody can tell which one: no entrance rather than a guess.
        expect(await entryPathOf(`/@/${ORG}/deleted-world`, async () => two)).toBeUndefined();
        expect(await entryPathOf(undefined, async () => [])).toBeUndefined();
    });
});
