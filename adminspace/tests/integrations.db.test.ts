/**
 * Integration Center against the real services and PostgreSQL (.env database): OAuth state (single use, bound to the
 * account, expiring), sealed tokens, refresh under a lease with rotation, the Admin API calendar and presence endpoints
 * with a fake provider, events → deliveries → jobs → a real local HTTP receiver (signed requests, retries, 410),
 * the automation API, inbound webhooks, member departures, and isolation between organizations.
 *
 * Mocks: providers' APIs only (setProviderFetch); webhook deliveries reach a real HTTP server on 127.0.0.1, allowed by
 * INTEGRATION_ALLOWED_PRIVATE_HOSTS exactly as an operator allows a self-hosted n8n. Everything is created under
 * "itg-test-*" and deleted after.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    Object.assign(process.env, {
        ORIGIN: "https://admin.integrations-test.example",
        GOOGLE_OAUTH_CLIENT_ID: "google-client",
        GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
        MICROSOFT_OAUTH_CLIENT_ID: "ms-client",
        MICROSOFT_OAUTH_CLIENT_SECRET: "ms-secret",
        SLACK_CLIENT_ID: "slack-client",
        SLACK_CLIENT_SECRET: "slack-secret",
        SLACK_SIGNING_SECRET: "slack-signing-secret-for-tests",
        GITHUB_OAUTH_CLIENT_ID: "gh-client",
        GITHUB_OAUTH_CLIENT_SECRET: "gh-secret",
        SPOTIFY_CLIENT_ID: "spotify-client",
        SPOTIFY_CLIENT_SECRET: "spotify-secret",
        INTEGRATION_ALLOWED_PRIVATE_HOSTS: "127.0.0.1",
        RATE_LIMIT_AUTOMATION_PER_TOKEN: "7",
        RATE_LIMIT_INVITATIONS_PER_ORGANIZATION: "0",
        WORKADVENTURE_PLAY_URL: "http://play.integrations-test.example",
        // Closed port: announcements meet an unreachable pusher.
        WORKADVENTURE_PUSHER_INTERNAL_URL: "http://127.0.0.1:9",
    });
    delete process.env.NOTION_CLIENT_ID;
    delete process.env.NOTION_CLIENT_SECRET;
    delete process.env.SMTP_URL;
});

import { createHmac } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/server/db/client";
import { config } from "../src/lib/server/config";
import { sha256Hex } from "../src/lib/server/crypto";
import { dispatchAdminApi } from "../src/lib/server/adminApi/routes";
import { isCalendarEventsData, isPresenceActivityData } from "../src/lib/contract/workadventure";
import { isSealed, openSecret, sealSecret } from "../src/lib/server/services/secrets";
import { runDueJobs } from "../src/lib/server/services/jobs";
import { recordVisit } from "../src/lib/server/services/members";
import { removeTeamMember, setMembershipSuspended } from "../src/lib/server/services/organizations";
import { setProviderFetch } from "../src/lib/server/integrations/http";
import { codeChallengeS256 } from "../src/lib/server/integrations/oauth";
import {
    completeConnection,
    consumeState,
    personalConnection,
    refreshConnection,
    setupReceiver,
    startConnection,
    updatePersonalSettings,
    withAccessToken,
} from "../src/lib/server/integrations/connections";
import { clearCalendarCache } from "../src/lib/server/integrations/calendar";
import { clearPresenceCache } from "../src/lib/server/integrations/presence";
import { emitOrgEvent } from "../src/lib/server/integrations/events";
import {
    checkEndpointTarget,
    createEndpoint,
    deleteEndpoint,
    getEndpoint,
    updateEndpoint,
} from "../src/lib/server/integrations/endpoints";
import { listDeliveries, retryDelivery, sendTestEvent } from "../src/lib/server/integrations/deliveries";
import {
    createAutomationToken,
    dispatchAutomationApi,
    revokeAutomationToken,
} from "../src/lib/server/integrations/automation";
import { handleGithubWebhook, handleGitlabWebhook, handleSlackEvents } from "../src/lib/server/integrations/inbound";
import { purgeIntegrationRecords } from "../src/lib/server/integrations/jobs";
import { verifyStandardWebhook } from "../src/lib/server/integrations/signatures";

const SUFFIX = Date.now().toString(36);
const PREFIX = `itg-test-${SUFFIX}`;
const PLAY = "http://play.integrations-test.example";

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

async function account(name: string): Promise<{ id: string; email: string; name: string }> {
    const [row] = await db()
        .insert(schema.accounts)
        .values({ email: `${name}-${SUFFIX}@itg.test`, name, passwordHash: "x", emailVerifiedAt: new Date() })
        .returning();
    return { id: row!.id, email: row!.email, name: row!.name };
}

async function organization(slug: string) {
    const [org] = await db()
        .insert(schema.organizations)
        .values({ slug, name: `Org ${slug}` })
        .returning();
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId: org!.id, slug: "main", name: "Main" })
        .returning();
    const [world] = await db()
        .insert(schema.worlds)
        .values({ organizationId: org!.id, workspaceId: workspace!.id, slug: "office", name: "Office" })
        .returning();
    await db().insert(schema.rooms).values({
        worldId: world!.id,
        slug: "lobby",
        name: "Lobby",
        mapKind: "tmj",
        mapUrl: "https://maps.example/lobby.tmj",
        isDefault: true,
    });
    return { id: org!.id, slug, world: world! };
}

async function member(organizationId: string, accountId: string, role: "owner" | "admin" | "employee") {
    await db().insert(schema.organizationMemberships).values({ organizationId, accountId, role });
}

const ACCOUNT_IDS: string[] = [];
let orgA: Awaited<ReturnType<typeof organization>>;
let orgB: Awaited<ReturnType<typeof organization>>;
let adminA: Awaited<ReturnType<typeof account>>;
let employeeA: Awaited<ReturnType<typeof account>>;
let colleagueA: Awaited<ReturnType<typeof account>>;
let adminB: Awaited<ReturnType<typeof account>>;

// ---------------------------------------------------------------------------------------------
// Fake provider APIs (fetch hook) and a real webhook receiver
// ---------------------------------------------------------------------------------------------

type Route = (url: URL, init: RequestInit) => Response | Promise<Response>;
const routes = new Map<string, Route>();
const providerCalls: string[] = [];

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

const received: { path: string; headers: IncomingMessage["headers"]; body: string }[] = [];
let receiver: Server;
let receiverBase = "";

function receiverHandler(req: IncomingMessage, res: ServerResponse): void {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
        received.push({ path: req.url ?? "", headers: req.headers, body });
        const status = req.url?.startsWith("/fail") ? 500 : req.url?.startsWith("/gone") ? 410 : 204;
        res.writeHead(status).end();
    });
}

beforeAll(async () => {
    setProviderFetch((async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        providerCalls.push(`${init.method ?? "GET"} ${url.origin}${url.pathname}`);
        const key = [...routes.keys()].find((prefix) => url.toString().startsWith(prefix));
        return key ? routes.get(key)!(url, init) : new Response("no route", { status: 404 });
    }) as typeof fetch);
    receiver = createServer(receiverHandler);
    await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
    receiverBase = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;

    orgA = await organization(`${PREFIX}-a`);
    orgB = await organization(`${PREFIX}-b`);
    adminA = await account("admin-a");
    employeeA = await account("employee-a");
    colleagueA = await account("colleague-a");
    adminB = await account("admin-b");
    ACCOUNT_IDS.push(adminA.id, employeeA.id, colleagueA.id, adminB.id);
    await member(orgA.id, adminA.id, "admin");
    await member(orgA.id, employeeA.id, "employee");
    await member(orgA.id, colleagueA.id, "employee");
    await member(orgB.id, adminB.id, "admin");
});

afterAll(async () => {
    setProviderFetch(undefined);
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
    await db()
        .delete(schema.organizations)
        .where(like(schema.organizations.slug, `${PREFIX}%`));
    await db().delete(schema.accounts).where(inArray(schema.accounts.id, ACCOUNT_IDS));
    await db()
        .delete(schema.integrationInboundEvents)
        .where(like(schema.integrationInboundEvents.externalId, `itg-${SUFFIX}%`));
    await closeDb();
});

function stateOf(url: string): string {
    return new URL(url).searchParams.get("state") ?? "";
}

/** Google answers for a successful connection with the given granted scopes. */
function googleConnects(scope: string) {
    routes.set("https://oauth2.googleapis.com/token", () =>
        json({ access_token: "g-at-1", expires_in: 3600, refresh_token: "g-rt-1", scope, token_type: "Bearer" }),
    );
    routes.set("https://www.googleapis.com/oauth2/v3/userinfo", () =>
        json({ sub: "g-123", email: "employee@gmail.test" }),
    );
}

const FREEBUSY = "https://www.googleapis.com/auth/calendar.freebusy";
const EVENTS = "https://www.googleapis.com/auth/calendar.events.readonly";

function adminApi(path: string, token = config().ADMIN_API_TOKEN): Promise<Response> {
    return dispatchAdminApi(
        new Request(`http://adminspace.test${path}`, { headers: { authorization: token } }),
        "127.0.0.1",
    );
}

// ---------------------------------------------------------------------------------------------

describe("OAuth flow", () => {
    it("starts with a sealed PKCE verifier and a hashed state, refuses what is not allowed", async () => {
        const started = await startConnection({
            organizationId: orgA.id,
            accountId: employeeA.id,
            provider: "google",
            scope: "personal",
            returnTo: `/o/${orgA.slug}/my-integrations`,
            appName: "AdminSpace",
        });
        expect(started.ok).toBe(true);
        if (!started.ok) return;
        const url = new URL(started.url);
        expect(url.searchParams.get("redirect_uri")).toBe(
            "https://admin.integrations-test.example/integrations/oauth/google/callback",
        );
        const state = stateOf(started.url);
        const [row] = await db()
            .select()
            .from(schema.integrationOauthStates)
            .where(eq(schema.integrationOauthStates.stateHash, sha256Hex(state)));
        expect(row).toBeDefined();
        expect(isSealed(row!.codeVerifier!)).toBe(true);
        expect(url.searchParams.get("code_challenge")).toBe(codeChallengeS256(openSecret(row!.codeVerifier)!));

        // An employee may not connect the organization's Slack; Notion is not configured on this server.
        expect(
            await startConnection({
                organizationId: orgA.id,
                accountId: employeeA.id,
                provider: "slack",
                scope: "organization",
                returnTo: "/",
                appName: "AdminSpace",
            }),
        ).toEqual({ ok: false, problem: "notAllowed" });
        expect(
            await startConnection({
                organizationId: orgA.id,
                accountId: adminA.id,
                provider: "notion",
                scope: "organization",
                returnTo: "/",
                appName: "AdminSpace",
            }),
        ).toEqual({ ok: false, problem: "notConfigured" });
        // Not a member of organization A.
        expect(
            await startConnection({
                organizationId: orgA.id,
                accountId: adminB.id,
                provider: "google",
                scope: "personal",
                returnTo: "/",
                appName: "AdminSpace",
            }),
        ).toEqual({ ok: false, problem: "notAllowed" });
    });

    it("completes once, for the account that started it, and stores the tokens sealed", async () => {
        googleConnects(`openid email ${FREEBUSY} ${EVENTS}`);
        const started = await startConnection({
            organizationId: orgA.id,
            accountId: employeeA.id,
            provider: "google",
            scope: "personal",
            returnTo: `/o/${orgA.slug}/my-integrations`,
            appName: "AdminSpace",
        });
        if (!started.ok) throw new Error("not started");
        const state = stateOf(started.url);
        // Another person, or another provider, cannot use this state.
        expect(await consumeState(state, adminA.id, "google")).toBeUndefined();
        expect(await consumeState(state, employeeA.id, "microsoft")).toBeUndefined();

        const outcome = await completeConnection({
            account: employeeA,
            provider: "google",
            state,
            code: "auth-code",
            ipAddress: "203.0.113.5",
        });
        expect(outcome).toMatchObject({
            ok: true,
            returnTo: `/o/${orgA.slug}/my-integrations`,
            provider: "google",
            personal: true,
        });
        // Replay of the same callback.
        expect(
            await completeConnection({
                account: employeeA,
                provider: "google",
                state,
                code: "auth-code",
                ipAddress: null,
            }),
        ).toEqual({ ok: false, problem: "invalidState", returnTo: undefined });

        const connection = await personalConnection(orgA.id, employeeA.id, "google");
        expect(connection).toMatchObject({ status: "connected", externalAccountName: "employee@gmail.test" });
        expect(isSealed(connection!.accessToken!)).toBe(true);
        expect(connection!.accessToken).not.toContain("g-at-1");
        expect(openSecret(connection!.accessToken)).toBe("g-at-1");
        expect(openSecret(connection!.refreshToken)).toBe("g-rt-1");
        expect(connection!.settings).toMatchObject({ calendarSharing: "busy" });
        const [entry] = await db()
            .select()
            .from(schema.auditLogs)
            .where(
                and(eq(schema.auditLogs.organizationId, orgA.id), eq(schema.auditLogs.action, "integration.connect")),
            );
        expect(entry).toBeDefined();
        expect(JSON.stringify(entry!.details)).not.toContain("g-at-1");
    });

    it("expires states after ten minutes and keeps one calendar per person", async () => {
        const started = await startConnection({
            organizationId: orgA.id,
            accountId: employeeA.id,
            provider: "google",
            scope: "personal",
            returnTo: "/",
            appName: "AdminSpace",
        });
        if (!started.ok) throw new Error("not started");
        const state = stateOf(started.url);
        await db()
            .update(schema.integrationOauthStates)
            .set({ expiresAt: new Date(Date.now() - 1000) })
            .where(eq(schema.integrationOauthStates.stateHash, sha256Hex(state)));
        expect(await consumeState(state, employeeA.id, "google")).toBeUndefined();
        expect(
            await startConnection({
                organizationId: orgA.id,
                accountId: employeeA.id,
                provider: "microsoft",
                scope: "personal",
                returnTo: "/",
                appName: "AdminSpace",
            }),
        ).toEqual({ ok: false, problem: "calendarTaken" });
    });

    it("records a refusal at the provider without storing anything", async () => {
        const started = await startConnection({
            organizationId: orgA.id,
            accountId: colleagueA.id,
            provider: "spotify",
            scope: "personal",
            returnTo: "/back",
            appName: "AdminSpace",
        });
        if (!started.ok) throw new Error("not started");
        const outcome = await completeConnection({
            account: colleagueA,
            provider: "spotify",
            state: stateOf(started.url),
            error: "access_denied",
            ipAddress: null,
        });
        expect(outcome).toEqual({ ok: false, problem: "denied", returnTo: "/back" });
        expect(await personalConnection(orgA.id, colleagueA.id, "spotify")).toBeUndefined();
    });
});

describe("Admin API: calendar and presence", () => {
    const busy = [{ start: "2026-10-24T09:00:00Z", end: "2026-10-24T09:30:00Z" }];
    let freeBusyTimeMax = "";

    beforeAll(() => {
        clearCalendarCache();
        routes.set("https://www.googleapis.com/calendar/v3/freeBusy", async (_url, init) => {
            freeBusyTimeMax = (JSON.parse(String(init.body)) as { timeMax: string }).timeMax;
            return json({ calendars: { primary: { busy } } });
        });
        routes.set("https://www.googleapis.com/calendar/v3/calendars/primary/events", () =>
            json({
                items: [
                    {
                        id: "ev1",
                        summary: "Design review",
                        start: { dateTime: "2026-10-24T09:00:00Z" },
                        end: { dateTime: "2026-10-24T09:30:00Z" },
                        hangoutLink: "https://meet.google.com/abc-defg-hij",
                    },
                ],
            }),
        );
    });

    it("answers free/busy by default, parsed by the contract, without any token", async () => {
        const from = "2026-10-24T00:00:00Z";
        const response = await adminApi(
            `/api/calendar/events?userIdentifier=${encodeURIComponent(employeeA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office/lobby`)}&from=${from}&to=2026-12-31T00:00:00Z`,
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        const text = await response.text();
        expect(text).not.toContain("g-at-1");
        const body = isCalendarEventsData.parse(JSON.parse(text));
        expect(body).toMatchObject({ connected: true, provider: "google", error: null });
        expect(body.events).toEqual([
            {
                id: "busy-2026-10-24T09:00:00.000Z",
                title: "Busy",
                start: "2026-10-24T09:00:00.000Z",
                end: "2026-10-24T09:30:00.000Z",
                allDay: false,
                busy: true,
                location: null,
                joinUrl: null,
            },
        ]);
        // The window is capped at 7 days.
        expect(Date.parse(freeBusyTimeMax) - Date.parse(from)).toBe(7 * 86_400_000);
    });

    it("caches answers for a minute", async () => {
        const before = providerCalls.length;
        const response = await adminApi(
            `/api/calendar/events?userIdentifier=${encodeURIComponent(employeeA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}&from=2026-10-24T00:00:00Z&to=2026-12-31T00:00:00Z`,
        );
        expect(response.status).toBe(200);
        expect(providerCalls.length).toBe(before);
    });

    it("shares titles and meeting links once the person chose to, and finds anonymous members by their email", async () => {
        await updatePersonalSettings(orgA.id, employeeA.id, "google", { calendarSharing: "details" });
        await db()
            .insert(schema.members)
            .values({ worldId: orgA.world.id, uuid: `anon-${SUFFIX}`, email: employeeA.email, kind: "member" });
        const response = await adminApi(
            `/api/calendar/events?userIdentifier=anon-${SUFFIX}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office/lobby`)}&from=2026-10-24T00:00:00Z&to=2026-10-25T00:00:00Z`,
        );
        const body = isCalendarEventsData.parse(await response.json());
        expect(body.events[0]).toMatchObject({
            title: "Design review",
            joinUrl: "https://meet.google.com/abc-defg-hij",
        });
    });

    it("answers 'not connected' for unknown people, other organizations, and refuses bad requests", async () => {
        const unknown = await adminApi(
            `/api/calendar/events?userIdentifier=nobody-${SUFFIX}@itg.test&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}`,
        );
        expect(isCalendarEventsData.parse(await unknown.json())).toMatchObject({
            connected: false,
            provider: null,
            events: [],
        });
        // The person's calendar is connected in organization A, not B.
        const otherOrg = await adminApi(
            `/api/calendar/events?userIdentifier=${encodeURIComponent(employeeA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgB.slug}/office`)}`,
        );
        expect(isCalendarEventsData.parse(await otherOrg.json()).connected).toBe(false);
        expect(
            (await adminApi(`/api/calendar/events?playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}`))
                .status,
        ).toBe(400);
        expect(
            (
                await adminApi(
                    `/api/calendar/events?userIdentifier=a@b.c&playUri=x&from=2026-10-24T00:00:00Z&to=2026-10-23T00:00:00Z`,
                )
            ).status,
        ).toBe(400);
        expect((await adminApi(`/api/calendar/events?userIdentifier=a@b.c&playUri=x`, "wrong-token")).status).toBe(403);
    });

    it("advertises the endpoints in the capabilities", async () => {
        const response = await dispatchAdminApi(new Request("http://adminspace.test/api/capabilities"), undefined);
        expect(await response.json()).toMatchObject({ "api/calendar/events": "v1", "api/presence/activity": "v1" });
    });

    it("presence: music only for people who share it", async () => {
        clearPresenceCache();
        await db()
            .insert(schema.integrationConnections)
            .values({
                organizationId: orgA.id,
                accountId: employeeA.id,
                provider: "spotify",
                status: "connected",
                accessToken: sealSecret("sp-at"),
                settings: { shareMusic: false },
            });
        routes.set("https://api.spotify.com/v1/me/player/currently-playing", () =>
            json({ is_playing: true, item: { name: "Clair de lune", artists: [{ name: "Debussy" }] } }),
        );
        const query = `/api/presence/activity?userIdentifier=${encodeURIComponent(employeeA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}`;
        expect(isPresenceActivityData.parse(await (await adminApi(query)).json())).toEqual({
            music: null,
            coding: null,
        });
        await updatePersonalSettings(orgA.id, employeeA.id, "spotify", { shareMusic: true });
        expect(isPresenceActivityData.parse(await (await adminApi(query)).json())).toEqual({
            music: { title: "Clair de lune", artist: "Debussy" },
            coding: null,
        });
    });

    it("a provider refusing the token makes the connection expire: WorkAdventure is told to ask for a reconnection", async () => {
        clearCalendarCache();
        routes.set("https://www.googleapis.com/calendar/v3/calendars/primary/events", () => json({ error: {} }, 401));
        routes.set("https://oauth2.googleapis.com/token", () => json({ error: "invalid_grant" }, 400));
        const response = await adminApi(
            `/api/calendar/events?userIdentifier=${encodeURIComponent(employeeA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}&from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z`,
        );
        expect(isCalendarEventsData.parse(await response.json())).toMatchObject({
            connected: false,
            provider: "google",
            error: "expired",
        });
        const connection = await personalConnection(orgA.id, employeeA.id, "google");
        expect(connection).toMatchObject({ status: "expired", accessToken: null, refreshToken: null });
    });
});

describe("token refresh", () => {
    let refreshes = 0;

    async function microsoftConnection(accessToken: string, refreshToken: string) {
        const [row] = await db()
            .insert(schema.integrationConnections)
            .values({
                organizationId: orgB.id,
                accountId: adminB.id,
                provider: "microsoft",
                status: "connected",
                accessToken: sealSecret(accessToken),
                refreshToken: sealSecret(refreshToken),
                expiresAt: new Date(Date.now() - 1000),
                scopes: ["Calendars.ReadBasic"],
            })
            .onConflictDoUpdate({
                target: [
                    schema.integrationConnections.organizationId,
                    schema.integrationConnections.provider,
                    schema.integrationConnections.accountId,
                ],
                targetWhere: sql`${schema.integrationConnections.accountId} is not null`,
                set: {
                    status: "connected",
                    accessToken: sealSecret(accessToken),
                    refreshToken: sealSecret(refreshToken),
                    expiresAt: new Date(Date.now() - 1000),
                    refreshLockedUntil: null,
                },
            })
            .returning();
        return row!;
    }

    it("refreshes once for concurrent callers and stores the rotated refresh token", async () => {
        routes.set("https://login.microsoftonline.com/", async () => {
            refreshes++;
            await new Promise((resolve) => setTimeout(resolve, 50));
            return json({
                access_token: "ms-at-2",
                refresh_token: "ms-rt-2",
                expires_in: 3600,
                scope: "Calendars.ReadBasic",
            });
        });
        const connection = await microsoftConnection("ms-at-1", "ms-rt-1");
        const tokens = await Promise.all([
            withAccessToken(connection, async (token) => token),
            withAccessToken(connection, async (token) => token),
        ]);
        expect(tokens).toEqual(["ms-at-2", "ms-at-2"]);
        expect(refreshes).toBe(1);
        const [row] = await db()
            .select()
            .from(schema.integrationConnections)
            .where(eq(schema.integrationConnections.id, connection.id));
        expect(openSecret(row!.refreshToken)).toBe("ms-rt-2");
        expect(row!.refreshLockedUntil).toBeNull();
    });

    it("waits for a refresh already running elsewhere (lease) instead of using the same refresh token", async () => {
        const stale = await microsoftConnection("ms-at-1", "ms-rt-1");
        await db()
            .update(schema.integrationConnections)
            .set({ refreshLockedUntil: new Date(Date.now() + 30_000) })
            .where(eq(schema.integrationConnections.id, stale.id));
        const before = refreshes;
        setTimeout(() => {
            void db()
                .update(schema.integrationConnections)
                .set({
                    accessToken: sealSecret("from-other-instance"),
                    expiresAt: new Date(Date.now() + 3600_000),
                    refreshLockedUntil: null,
                })
                .where(eq(schema.integrationConnections.id, stale.id))
                .then(() => undefined);
        }, 300);
        const result = await refreshConnection(stale);
        expect(openSecret(result.accessToken)).toBe("from-other-instance");
        expect(refreshes).toBe(before);
    });

    it("a dead refresh token (invalid_grant) expires the connection and wipes its tokens", async () => {
        routes.set("https://login.microsoftonline.com/", () => json({ error: "invalid_grant" }, 400));
        const connection = await microsoftConnection("ms-at-1", "ms-rt-dead");
        await expect(withAccessToken(connection, async (token) => token)).rejects.toMatchObject({
            code: "invalidGrant",
        });
        const [row] = await db()
            .select()
            .from(schema.integrationConnections)
            .where(eq(schema.integrationConnections.id, connection.id));
        expect(row).toMatchObject({ status: "expired", accessToken: null, refreshToken: null });
    });
});

describe("events, deliveries and jobs", () => {
    let okEndpoint: string;
    let secret: string;

    it("validates destinations: Discord URLs, private addresses, the allowed private host", async () => {
        expect(await checkEndpointTarget(orgA.id, "discord", { url: "https://example.com/x" })).toEqual({
            ok: false,
            problem: "notDiscordUrl",
        });
        expect(await checkEndpointTarget(orgA.id, "webhook", { url: "https://10.1.2.3/x" })).toEqual({
            ok: false,
            problem: "privateAddress",
        });
        expect(await checkEndpointTarget(orgA.id, "slack", { channel: "#office" })).toEqual({
            ok: false,
            problem: "slackNotConnected",
        });
        expect(await checkEndpointTarget(orgA.id, "webhook", { url: `${receiverBase}/ok` })).toEqual({
            ok: true,
            url: `${receiverBase}/ok`,
            channel: null,
        });
    });

    it("stores nothing when nobody listens, one delivery per subscribed endpoint otherwise", async () => {
        const created = await createEndpoint({
            organizationId: orgA.id,
            kind: "webhook",
            name: "Receiver",
            url: `${receiverBase}/ok`,
            channel: null,
            eventTypes: ["member.suspended", "member.removed", "member.invited"],
            createdBy: adminA.id,
        });
        okEndpoint = created.endpoint.id;
        secret = created.signingSecret!;
        expect(isSealed(created.endpoint.url!)).toBe(true);
        expect(
            await emitOrgEvent(db(), orgA.id, "member.joined", {
                person: { name: "x", email: "x@itg.test" },
                world: { id: orgA.world.id, slug: "office", name: "Office", url: null },
            }),
        ).toEqual({ eventId: null, deliveries: 0 });
        const emitted = await emitOrgEvent(db(), orgA.id, "member.suspended", {
            person: { id: colleagueA.id, name: "Colleague", email: colleagueA.email },
            by: { name: "Admin" },
        });
        expect(emitted.deliveries).toBe(1);
        const [job] = await db()
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.idempotencyKey, `integration.deliver:${emitted.eventId}:${okEndpoint}`));
        expect(job).toMatchObject({ kind: "integration.deliver", organizationId: orgA.id, status: "pending" });
    });

    it("delivers a signed Standard Webhooks request through the job queue", async () => {
        received.length = 0;
        for (let i = 0; i < 5 && received.length === 0; i++) await runDueJobs(20);
        const request = received.find((r) => r.path === "/ok");
        expect(request).toBeDefined();
        const body = JSON.parse(request!.body) as {
            type: string;
            timestamp: string;
            data: { person: { email: string } };
        };
        expect(body.type).toBe("member.suspended");
        expect(body.data.person.email).toBe(colleagueA.email);
        expect(
            verifyStandardWebhook(
                secret,
                {
                    id: String(request!.headers["webhook-id"]),
                    timestamp: String(request!.headers["webhook-timestamp"]),
                    signature: String(request!.headers["webhook-signature"]),
                },
                request!.body,
            ),
        ).toBe(true);
        const log = await listDeliveries(orgA.id, { page: 1 });
        expect(log.deliveries.find((d) => d.endpointId === okEndpoint)).toMatchObject({
            status: "succeeded",
            responseStatus: 204,
            attempts: 1,
        });
    });

    it("retries 5xx answers later, disables an endpoint answering 410, and retries on request once resumed", async () => {
        const failing = await createEndpoint({
            organizationId: orgA.id,
            kind: "n8n",
            name: "Failing",
            url: `${receiverBase}/fail`,
            channel: null,
            eventTypes: ["office.announcement"],
            createdBy: adminA.id,
        });
        const gone = await createEndpoint({
            organizationId: orgA.id,
            kind: "webhook",
            name: "Gone",
            url: `${receiverBase}/gone`,
            channel: null,
            eventTypes: ["office.announcement"],
            createdBy: adminA.id,
        });
        await emitOrgEvent(db(), orgA.id, "office.announcement", {
            message: "Hello",
            world: { id: orgA.world.id, slug: "office", name: "Office" },
            rooms: 1,
            by: { name: "Admin" },
            via: "backOffice",
        });
        for (let i = 0; i < 3; i++) await runDueJobs(20);
        const log = await listDeliveries(orgA.id, { page: 1, eventType: "office.announcement" });
        const fail = log.deliveries.find((d) => d.endpointId === failing.endpoint.id)!;
        const goneDelivery = log.deliveries.find((d) => d.endpointId === gone.endpoint.id)!;
        expect(fail).toMatchObject({ status: "pending", attempts: 1, responseStatus: 500, lastError: "http_500" });
        expect(goneDelivery).toMatchObject({ status: "failed", responseStatus: 410 });
        expect(await getEndpoint(orgA.id, gone.endpoint.id)).toMatchObject({ enabled: false, disabledReason: "gone" });
        expect(await getEndpoint(orgA.id, failing.endpoint.id)).toMatchObject({
            enabled: true,
            consecutiveFailures: 1,
        });

        expect(await retryDelivery(orgA.id, goneDelivery.id)).toBe("endpointDisabled");
        await updateEndpoint(orgA.id, gone.endpoint.id, { enabled: true });
        expect(await retryDelivery(orgA.id, goneDelivery.id)).toBe("ok");
        const [rearmed] = await db()
            .select()
            .from(schema.jobs)
            .where(eq(schema.jobs.idempotencyKey, `integration.deliver:${goneDelivery.eventId}:${gone.endpoint.id}`));
        expect(rearmed).toMatchObject({ status: "pending", attempts: 0 });
        // A paused endpoint receives nothing new.
        await updateEndpoint(orgA.id, failing.endpoint.id, { enabled: false });
        const quiet = await emitOrgEvent(db(), orgA.id, "office.announcement", {
            message: "Again",
            world: { id: orgA.world.id, slug: "office", name: "Office" },
            rooms: 1,
            by: null,
            via: "backOffice",
        });
        expect(quiet.deliveries).toBe(1);
        await deleteEndpoint(orgA.id, failing.endpoint.id);
        await deleteEndpoint(orgA.id, gone.endpoint.id);
    });

    it("sends a test event at once and logs it", async () => {
        const endpoint = await getEndpoint(orgA.id, okEndpoint);
        const outcome = await sendTestEvent(orgA.id, endpoint!, { name: "Admin" }, "Test");
        expect(outcome).toMatchObject({ status: "succeeded", httpStatus: 204 });
    });
});

describe("automation API", () => {
    function call(path: string, token: string | undefined, init: RequestInit = {}): Promise<Response> {
        return dispatchAutomationApi(
            new Request(`http://adminspace.test${path}`, {
                ...init,
                headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
            }),
            `198.51.100.${Math.floor(Math.random() * 200)}`,
        );
    }
    const post = (path: string, token: string, body: unknown) =>
        call(path, token, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "content-type": "application/json" },
        });

    it("authenticates bearer tokens, audits calls, and acts with the creator's rights within the scopes", async () => {
        const { token, row } = await createAutomationToken({
            organizationId: orgA.id,
            name: "Zapier",
            scopes: ["invitations:write"],
            expiresAt: null,
            createdBy: adminA.id,
        });
        expect((await call("/automation/v1/ping", undefined)).status).toBe(401);
        expect(
            (await call("/automation/v1/ping", "as_at_wrong-token-value")).headers.get("www-authenticate"),
        ).toContain("Bearer");
        const ping = await call("/automation/v1/ping", token);
        expect(ping.status).toBe(200);
        expect(await ping.json()).toMatchObject({
            ok: true,
            organization: { slug: orgA.slug },
            actingAs: { role: "admin" },
        });
        const [audited] = await db()
            .select()
            .from(schema.auditLogs)
            .where(and(eq(schema.auditLogs.action, "automation.ping"), eq(schema.auditLogs.targetId, row.id)));
        expect(audited).toMatchObject({ actorLabel: adminA.email, organizationId: orgA.id });

        const email = `new-hire-${SUFFIX}@itg.test`;
        const invited = await post("/automation/v1/invitations", token, { email, role: "employee", workspace: "main" });
        expect(invited.status).toBe(201);
        const body = (await invited.json()) as { invitationId: string; inviteUrl?: string };
        expect(body.inviteUrl).toMatch(/\/invite\?token=/);
        const [invitation] = await db()
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.id, body.invitationId));
        expect(invitation).toMatchObject({ email, role: "employee", invitedBy: adminA.id });
        expect((await post("/automation/v1/invitations", token, { email, role: "owner" })).status).toBe(400);
        expect((await post("/automation/v1/invitations", token, { email: "not-an-email" })).status).toBe(400);
        expect(
            (
                await call("/automation/v1/invitations", token, {
                    method: "POST",
                    body: "{}",
                    headers: { "content-type": "text/plain" },
                })
            ).status,
        ).toBe(415);
        expect((await post("/automation/v1/announcements", token, { world: "office", message: "Hi" })).status).toBe(
            403,
        );

        await revokeAutomationToken(orgA.id, row.id);
        expect((await call("/automation/v1/ping", token)).status).toBe(401);
    });

    it("announcements reach WorkAdventure's pusher (unreachable here: 502), and stop when the creator loses the right", async () => {
        const { token } = await createAutomationToken({
            organizationId: orgA.id,
            name: "n8n",
            scopes: ["announcements:write", "invitations:write"],
            expiresAt: null,
            createdBy: adminA.id,
        });
        const unreachable = await post("/automation/v1/announcements", token, { world: "office", message: "Stand-up" });
        expect(unreachable.status).toBe(502);
        expect(await unreachable.json()).toMatchObject({ code: "workadventureUnavailable" });
        expect((await post("/automation/v1/announcements", token, { world: "nope", message: "x" })).status).toBe(404);

        await db()
            .update(schema.organizationMemberships)
            .set({ role: "employee" })
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, orgA.id),
                    eq(schema.organizationMemberships.accountId, adminA.id),
                ),
            );
        try {
            const refused = await post("/automation/v1/invitations", token, { email: `x-${SUFFIX}@itg.test` });
            expect(refused.status).toBe(403);
        } finally {
            await db()
                .update(schema.organizationMemberships)
                .set({ role: "admin" })
                .where(
                    and(
                        eq(schema.organizationMemberships.organizationId, orgA.id),
                        eq(schema.organizationMemberships.accountId, adminA.id),
                    ),
                );
        }
    });

    it("limits calls per token", async () => {
        const { token } = await createAutomationToken({
            organizationId: orgA.id,
            name: "Busy script",
            scopes: [],
            expiresAt: null,
            createdBy: adminA.id,
        });
        const statuses: number[] = [];
        for (let i = 0; i < 8; i++) statuses.push((await call("/automation/v1/ping", token)).status);
        expect(statuses.slice(0, 7)).toEqual([200, 200, 200, 200, 200, 200, 200]);
        expect(statuses[7]).toBe(429);
    });
});

describe("isolation between organizations", () => {
    it("never reaches another organization's endpoints, deliveries, tokens or connections", async () => {
        const [endpointA] = await db()
            .select()
            .from(schema.integrationEndpoints)
            .where(eq(schema.integrationEndpoints.organizationId, orgA.id));
        expect(endpointA).toBeDefined();
        expect(await getEndpoint(orgB.id, endpointA!.id)).toBeUndefined();
        expect(await updateEndpoint(orgB.id, endpointA!.id, { name: "Hijacked", enabled: false })).toBeUndefined();
        expect(await deleteEndpoint(orgB.id, endpointA!.id)).toBeUndefined();
        expect(await getEndpoint(orgA.id, endpointA!.id)).toMatchObject({
            name: endpointA!.name,
            enabled: endpointA!.enabled,
        });

        const logA = await listDeliveries(orgA.id, { page: 1 });
        expect(logA.total).toBeGreaterThan(0);
        expect((await listDeliveries(orgB.id, { page: 1 })).total).toBe(0);
        expect(await retryDelivery(orgB.id, logA.deliveries[0]!.id)).toBe("notFound");

        const { row } = await createAutomationToken({
            organizationId: orgA.id,
            name: "A",
            scopes: [],
            expiresAt: null,
            createdBy: adminA.id,
        });
        expect(await revokeAutomationToken(orgB.id, row.id)).toBeUndefined();
        expect(await personalConnection(orgB.id, employeeA.id, "google")).toBeUndefined();

        // The database itself refuses a delivery naming another organization's endpoint and event.
        const delivery = logA.deliveries[0]!;
        await expect(
            db()
                .insert(schema.integrationDeliveries)
                .values({ organizationId: orgB.id, eventId: delivery.eventId, endpointId: delivery.endpointId }),
        ).rejects.toThrow();
    });
});

describe("people leaving", () => {
    it("removal stops and revokes personal connections, and is announced", async () => {
        routes.set("https://oauth2.googleapis.com/revoke", () => new Response(null, { status: 200 }));
        await db()
            .insert(schema.integrationConnections)
            .values({
                organizationId: orgA.id,
                accountId: colleagueA.id,
                provider: "google",
                status: "connected",
                accessToken: sealSecret("c-at"),
                refreshToken: sealSecret("c-rt"),
            });
        received.length = 0;
        const result = await removeTeamMember(orgA.id, { accountId: adminA.id, role: "admin" }, colleagueA.id);
        expect(result).toBe("ok");
        const connection = await personalConnection(orgA.id, colleagueA.id, "google");
        expect(connection).toMatchObject({ status: "revoked", lastError: "membershipEnded" });
        for (let i = 0; i < 5; i++) await runDueJobs(20);
        expect(await personalConnection(orgA.id, colleagueA.id, "google")).toBeUndefined();
        expect(providerCalls).toContain("POST https://oauth2.googleapis.com/revoke");
        const event = received.find((r) => r.body.includes('"member.removed"'));
        expect(JSON.parse(event!.body)).toMatchObject({
            type: "member.removed",
            data: { reason: "removed", by: { name: adminA.name } },
        });
    });

    it("suspension is announced in the same transaction as the change", async () => {
        await member(orgA.id, colleagueA.id, "employee");
        await updateEndpoint(
            orgA.id,
            (
                await db()
                    .select()
                    .from(schema.integrationEndpoints)
                    .where(eq(schema.integrationEndpoints.organizationId, orgA.id))
            )[0]!.id,
            {
                eventTypes: ["member.suspended"],
            },
        );
        expect(
            await setMembershipSuspended(orgA.id, { accountId: adminA.id, role: "admin" }, colleagueA.id, true),
        ).toBe("ok");
        const [event] = await db()
            .select()
            .from(schema.integrationEvents)
            .where(
                and(
                    eq(schema.integrationEvents.organizationId, orgA.id),
                    eq(schema.integrationEvents.type, "member.suspended"),
                ),
            )
            .orderBy(sql`${schema.integrationEvents.occurredAt} desc`)
            .limit(1);
        expect(event!.data).toMatchObject({ person: { email: colleagueA.email }, by: { name: adminA.name } });
    });

    it("records a first visit exactly once", async () => {
        const identifier = `first-${SUFFIX}@itg.test`;
        expect((await recordVisit(orgA.world.id, identifier, {}))?.firstVisit).toBe(true);
        expect((await recordVisit(orgA.world.id, identifier, {}))?.firstVisit).toBe(false);
        await db()
            .insert(schema.members)
            .values({
                worldId: orgA.world.id,
                uuid: `added-${SUFFIX}@itg.test`,
                email: `added-${SUFFIX}@itg.test`,
                kind: "member",
            });
        expect((await recordVisit(orgA.world.id, `added-${SUFFIX}@itg.test`, {}))?.firstVisit).toBe(true);
    });
});

describe("inbound webhooks", () => {
    function signedGithub(id: string, secret: string, event: string, payload: unknown, delivery: string): Request {
        const body = JSON.stringify(payload);
        return new Request(`https://admin.integrations-test.example/integrations/webhooks/github/${id}`, {
            method: "POST",
            body,
            headers: {
                "content-type": "application/json",
                "x-github-event": event,
                "x-github-delivery": delivery,
                "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
            },
        });
    }

    it("GitHub: a signed ping proves the receiver; pushes feed the activity of people who share it", async () => {
        const { connection, secret } = await setupReceiver(orgA.id, "github", adminA.id);
        expect(connection.status).toBe("pending");
        expect(
            (
                await handleGithubWebhook(
                    signedGithub(connection.id, "wrong-secret", "ping", {}, `itg-${SUFFIX}-0`),
                    connection.id,
                )
            ).status,
        ).toBe(401);
        expect(
            (
                await handleGithubWebhook(
                    signedGithub(connection.id, secret, "ping", { zen: "ok" }, `itg-${SUFFIX}-1`),
                    connection.id,
                )
            ).status,
        ).toBe(202);
        const [receiverRow] = await db()
            .select()
            .from(schema.integrationConnections)
            .where(eq(schema.integrationConnections.id, connection.id));
        expect(receiverRow!.status).toBe("connected");
        // Replays are ignored.
        const replay = await handleGithubWebhook(
            signedGithub(connection.id, secret, "ping", { zen: "ok" }, `itg-${SUFFIX}-1`),
            connection.id,
        );
        expect(await replay.json()).toEqual({ status: "duplicate" });

        await db()
            .insert(schema.integrationConnections)
            .values({
                organizationId: orgA.id,
                accountId: adminA.id,
                provider: "github",
                status: "connected",
                accessToken: sealSecret("gh-at"),
                externalAccountId: "4242",
                externalAccountName: "admin-a",
                settings: { shareActivity: true },
                lastSyncAt: new Date(),
            });
        const push = await handleGithubWebhook(
            signedGithub(
                connection.id,
                secret,
                "push",
                { repository: { full_name: "acme/api" }, sender: { id: 4242 } },
                `itg-${SUFFIX}-2`,
            ),
            connection.id,
        );
        expect(await push.json()).toMatchObject({ activity: true });
        // Polling is not due (pollAfter in the future): the activity comes from the verified webhook.
        await db()
            .update(schema.integrationConnections)
            .set({ settings: { shareActivity: true, pollAfter: new Date(Date.now() + 600_000).toISOString() } })
            .where(
                and(
                    eq(schema.integrationConnections.accountId, adminA.id),
                    eq(schema.integrationConnections.provider, "github"),
                ),
            );
        const presence = await adminApi(
            `/api/presence/activity?userIdentifier=${encodeURIComponent(adminA.email)}&playUri=${encodeURIComponent(`${PLAY}/@/${orgA.slug}/office`)}`,
        );
        expect(isPresenceActivityData.parse(await presence.json()).coding).toMatchObject({
            provider: "github",
            repo: "acme/api",
        });
        // An unknown receiver id answers 404.
        expect(
            (await handleGithubWebhook(signedGithub(orgB.id, secret, "ping", {}, `itg-${SUFFIX}-3`), orgB.id)).status,
        ).toBe(404);
    });

    it("GitLab: the secret token header authenticates the delivery", async () => {
        const { connection, secret } = await setupReceiver(orgA.id, "gitlab", adminA.id);
        const request = (token: string, uuid: string) =>
            new Request(`https://admin.integrations-test.example/integrations/webhooks/gitlab/${connection.id}`, {
                method: "POST",
                body: JSON.stringify({
                    object_kind: "push",
                    user_id: 99,
                    project: { path_with_namespace: "acme/infra" },
                }),
                headers: { "content-type": "application/json", "x-gitlab-token": token, "x-gitlab-event-uuid": uuid },
            });
        expect((await handleGitlabWebhook(request("nope", `itg-${SUFFIX}-gl0`), connection.id)).status).toBe(401);
        expect((await handleGitlabWebhook(request(secret, `itg-${SUFFIX}-gl1`), connection.id)).status).toBe(202);
    });

    it("Slack Events API: verified challenge, revoked tokens revoke the connections", async () => {
        await db()
            .insert(schema.integrationConnections)
            .values({
                organizationId: orgA.id,
                accountId: employeeA.id,
                provider: "slack",
                status: "connected",
                accessToken: sealSecret("xoxp-1"),
                externalAccountId: "U-ITG",
                settings: { teamId: `T-${SUFFIX}`, statusSync: true },
            });
        const slackRequest = (payload: unknown, secret = config().SLACK_SIGNING_SECRET!) => {
            const body = JSON.stringify(payload);
            const timestamp = String(Math.floor(Date.now() / 1000));
            const signature = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
            return new Request("https://admin.integrations-test.example/integrations/webhooks/slack", {
                method: "POST",
                body,
                headers: {
                    "content-type": "application/json",
                    "x-slack-request-timestamp": timestamp,
                    "x-slack-signature": signature,
                },
            });
        };
        const challenge = await handleSlackEvents(slackRequest({ type: "url_verification", challenge: "abc123" }));
        expect(await challenge.json()).toEqual({ challenge: "abc123" });
        expect(
            (await handleSlackEvents(slackRequest({ type: "url_verification", challenge: "x" }, "other-secret")))
                .status,
        ).toBe(401);
        const revoked = await handleSlackEvents(
            slackRequest({
                type: "event_callback",
                team_id: `T-${SUFFIX}`,
                event_id: `itg-${SUFFIX}-ev1`,
                event: { type: "tokens_revoked", tokens: { oauth: ["U-ITG"], bot: [] } },
            }),
        );
        expect(revoked.status).toBe(200);
        expect(await personalConnection(orgA.id, employeeA.id, "slack")).toMatchObject({
            status: "revoked",
            accessToken: null,
        });
    });
});

describe("retention", () => {
    it("purges events after 30 days unless a delivery is still pending", async () => {
        const [endpoint] = await db()
            .select()
            .from(schema.integrationEndpoints)
            .where(eq(schema.integrationEndpoints.organizationId, orgA.id));
        const old = new Date(Date.now() - 40 * 86_400_000);
        const [done] = await db()
            .insert(schema.integrationEvents)
            .values({ organizationId: orgA.id, type: "member.joined", data: {}, occurredAt: old })
            .returning();
        const [waiting] = await db()
            .insert(schema.integrationEvents)
            .values({ organizationId: orgA.id, type: "member.joined", data: {}, occurredAt: old })
            .returning();
        await db()
            .insert(schema.integrationDeliveries)
            .values([
                { organizationId: orgA.id, eventId: done!.id, endpointId: endpoint!.id, status: "succeeded" },
                { organizationId: orgA.id, eventId: waiting!.id, endpointId: endpoint!.id, status: "pending" },
            ]);
        await purgeIntegrationRecords();
        const left = await db()
            .select({ id: schema.integrationEvents.id })
            .from(schema.integrationEvents)
            .where(inArray(schema.integrationEvents.id, [done!.id, waiting!.id]));
        expect(left.map((e) => e.id)).toEqual([waiting!.id]);
    });
});
