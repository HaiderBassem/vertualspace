/**
 * The automation API (/automation/v1/*): what Zapier, n8n or a script may do in an organization with a bearer token
 * created in the Integration Center.
 *
 * - Tokens: "as_at_" + 256 random bits; only the SHA-256 is stored (like Room API keys), the clear token is shown once.
 *   Revocable, optionally expiring, limited to scopes.
 * - A token acts with the CURRENT rights of the person who created it (re-read at every call), within its scopes: a
 *   token of someone who left or lost the role stops working.
 * - Limits: per client address before authentication, per token after (RATE_LIMIT_AUTOMATION_PER_TOKEN a minute).
 * - Every authenticated call is written to the audit log; errors are RFC 9457 problem documents.
 *
 *   GET  /automation/v1/ping
 *   POST /automation/v1/invitations   { email, role?, workspace?, workspaceRole? }      scope invitations:write
 *   POST /automation/v1/announcements { world, message, room? }                        scope announcements:write
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { grantableRoles, roleHas, type OrganizationRole } from "../auth/rbac";
import { config } from "../config";
import { randomToken, sha256Hex } from "../crypto";
import { db, schema } from "../db/client";
import { json, problem } from "../http/problem";
import { readJson, PayloadTooLargeError } from "../adminApi/router";
import { checkRateLimit } from "../security/rateLimit";
import { describeError, logJson } from "../security/requestLog";
import { createInvitations, normalizeEmail, type InvitationContext } from "../services/invitations";
import { publicOrigin } from "../services/mail";
import { broadcastMessage, PusherUnavailableError } from "../services/pusher";
import { allWorldRoomUrls } from "../services/rooms";
import { listRooms } from "../services/worlds";
import { isLocale, DEFAULT_LOCALE } from "../../i18n";
import { emitOrgEvent } from "./events";

export const AUTOMATION_TOKEN_PREFIX = "as_at_";
export const AUTOMATION_TOKEN_VISIBLE_LENGTH = 12;
export const AUTOMATION_SCOPES = ["invitations:write", "announcements:write"] as const;
export type AutomationScope = (typeof AUTOMATION_SCOPES)[number];
export type AutomationToken = typeof schema.automationTokens.$inferSelect;
export type AutomationTokenStatus = "active" | "revoked" | "expired";
const T = schema.automationTokens;

export function generateAutomationToken(): { token: string; hash: string; prefix: string } {
    const token = AUTOMATION_TOKEN_PREFIX + randomToken(32);
    return { token, hash: sha256Hex(token), prefix: token.slice(0, AUTOMATION_TOKEN_VISIBLE_LENGTH) };
}

export function automationTokenStatus(
    token: Pick<AutomationToken, "revokedAt" | "expiresAt">,
    now = new Date(),
): AutomationTokenStatus {
    if (token.revokedAt) return "revoked";
    if (token.expiresAt && token.expiresAt <= now) return "expired";
    return "active";
}

export async function createAutomationToken(input: {
    organizationId: string;
    name: string;
    scopes: AutomationScope[];
    expiresAt: Date | null;
    createdBy: string;
}): Promise<{ row: AutomationToken; token: string }> {
    const { token, hash, prefix } = generateAutomationToken();
    const [row] = await db()
        .insert(T)
        .values({ ...input, tokenHash: hash, tokenPrefix: prefix })
        .returning();
    if (!row) throw new Error("Automation token insert returned no row");
    return { row, token };
}

export function listAutomationTokens(organizationId: string) {
    return db()
        .select({ token: T, creator: schema.accounts.name })
        .from(T)
        .leftJoin(schema.accounts, eq(schema.accounts.id, T.createdBy))
        .where(eq(T.organizationId, organizationId))
        .orderBy(desc(T.createdAt));
}

export async function revokeAutomationToken(organizationId: string, id: string): Promise<AutomationToken | undefined> {
    const [row] = await db()
        .update(T)
        .set({ revokedAt: new Date() })
        .where(and(eq(T.id, id), eq(T.organizationId, organizationId), sql`${T.revokedAt} is null`))
        .returning();
    return row;
}

// ---------------------------------------------------------------------------------------------
// The API
// ---------------------------------------------------------------------------------------------

/** Unauthenticated calls per client address and minute (slows down token guessing, which 256 bits make futile). */
const PER_IP_LIMIT = 300;

function apiProblem(status: number, code: string, title: string, headers: HeadersInit = {}): Response {
    return problem({ status, title, code }, { "cache-control": "no-store", ...headers });
}

interface Caller {
    token: AutomationToken;
    organization: typeof schema.organizations.$inferSelect;
    /** The creator's current role, if they still are an active member of an active organization. */
    actor: { accountId: string; name: string; email: string; role: OrganizationRole } | undefined;
}

async function authenticate(request: Request): Promise<Caller | Response> {
    const header = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(\S{10,200})$/i.exec(header);
    if (!match?.[1] || !match[1].startsWith(AUTOMATION_TOKEN_PREFIX)) {
        return apiProblem(401, "unauthenticated", "A bearer token is required", {
            "www-authenticate": 'Bearer realm="automation"',
        });
    }
    const [row] = await db()
        .select({ token: T, organization: schema.organizations })
        .from(T)
        .innerJoin(schema.organizations, eq(schema.organizations.id, T.organizationId))
        .where(eq(T.tokenHash, sha256Hex(match[1])));
    if (!row || automationTokenStatus(row.token) !== "active") {
        return apiProblem(401, "unauthenticated", "The token is invalid, revoked or expired", {
            "www-authenticate": 'Bearer realm="automation", error="invalid_token"',
        });
    }
    if (row.organization.status !== "active")
        return apiProblem(403, "organizationSuspended", "The organization is suspended");
    let actor: Caller["actor"];
    if (row.token.createdBy) {
        const [member] = await db()
            .select({
                role: schema.organizationMemberships.role,
                status: schema.organizationMemberships.status,
                name: schema.accounts.name,
                email: schema.accounts.email,
                accountStatus: schema.accounts.status,
            })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, row.organization.id),
                    eq(schema.organizationMemberships.accountId, row.token.createdBy),
                ),
            );
        if (member && member.status === "active" && member.accountStatus === "active") {
            actor = { accountId: row.token.createdBy, name: member.name, email: member.email, role: member.role };
        }
    }
    return { token: row.token, organization: row.organization, actor };
}

function hasScope(caller: Caller, scope: AutomationScope): boolean {
    return caller.token.scopes.includes(scope);
}

async function auditCall(
    caller: Caller,
    action: string,
    clientIp: string | undefined,
    details: Record<string, unknown>,
) {
    await audit({
        action,
        account: caller.actor ? { id: caller.actor.accountId, email: caller.actor.email } : null,
        actorLabel: `automation:${caller.token.tokenPrefix}`,
        organizationId: caller.organization.id,
        targetType: "automationToken",
        targetId: caller.token.id,
        ipAddress: clientIp ?? null,
        details: { via: "automation", tokenName: caller.token.name, ...details },
    });
}

const InvitationBody = z.object({
    email: z.string().trim().max(320),
    role: z.enum(["employee", "viewer", "moderator", "admin"]).default("employee"),
    workspace: z.string().trim().max(64).optional(),
    workspaceRole: z.enum(["member", "manager"]).default("member"),
    locale: z.string().max(35).optional(),
});

async function postInvitation(caller: Caller, body: unknown, clientIp: string | undefined): Promise<Response> {
    if (!hasScope(caller, "invitations:write"))
        return apiProblem(403, "insufficientScope", "The token lacks invitations:write");
    const parsed = InvitationBody.safeParse(body);
    if (!parsed.success) return apiProblem(400, "invalidBody", "The body does not match the documented fields");
    const email = normalizeEmail(parsed.data.email);
    if (!email) return apiProblem(400, "invalidEmail", "The email address is not valid");
    const actor = caller.actor;
    if (!actor || !roleHas(actor.role, "team.invite")) {
        await auditCall(caller, "automation.refused", clientIp, {
            operation: "invitation",
            reason: "creatorLacksRight",
        });
        return apiProblem(403, "forbidden", "The person who created this token may not invite people any more");
    }
    if (!grantableRoles(actor.role).includes(parsed.data.role)) {
        return apiProblem(403, "forbiddenRole", "The token's creator may not give this role");
    }
    const workspaces: { workspaceId: string; role: "member" | "manager" }[] = [];
    if (parsed.data.workspace) {
        const [workspace] = await db()
            .select({ id: schema.workspaces.id })
            .from(schema.workspaces)
            .where(
                and(
                    eq(schema.workspaces.organizationId, caller.organization.id),
                    eq(schema.workspaces.slug, parsed.data.workspace),
                ),
            );
        if (!workspace) return apiProblem(404, "workspaceNotFound", "No such workspace in this organization");
        workspaces.push({ workspaceId: workspace.id, role: parsed.data.workspaceRole });
    }
    const limit = config().RATE_LIMIT_INVITATIONS_PER_ORGANIZATION;
    if (limit > 0) {
        const check = await checkRateLimit(`invite:org:${caller.organization.id}`, limit, 3600);
        if (!check.allowed)
            return apiProblem(429, "rateLimited", "Too many invitations", {
                "retry-after": String(check.retryAfterSec),
            });
    }
    const origin = publicOrigin();
    if (!origin) return apiProblem(503, "originMissing", "ORIGIN is not configured on this server");
    const locale = isLocale(parsed.data.locale)
        ? parsed.data.locale
        : isLocale(caller.organization.defaultLocale)
          ? caller.organization.defaultLocale
          : DEFAULT_LOCALE;
    const context: InvitationContext = {
        organization: { id: caller.organization.id, name: caller.organization.name },
        inviter: { accountId: actor.accountId, role: actor.role, name: actor.name },
        locale,
        origin,
    };
    const [outcome] = await createInvitations(context, { emails: [email], role: parsed.data.role, workspaces });
    if (!outcome) return apiProblem(500, "unexpected", "No outcome");
    if (outcome.result === "alreadyMember") return apiProblem(409, "alreadyMember", "This person is already a member");
    if (outcome.result !== "invited") return apiProblem(400, outcome.result, "The invitation was refused");
    await audit({
        action: "invitation.create",
        account: { id: actor.accountId, email: actor.email },
        organizationId: caller.organization.id,
        targetType: "invitation",
        targetId: outcome.invitationId,
        ipAddress: clientIp ?? null,
        details: {
            email,
            role: parsed.data.role,
            delivery: outcome.delivery,
            via: "automation",
            tokenPrefix: caller.token.tokenPrefix,
        },
    });
    return json(
        {
            status: "invited",
            invitationId: outcome.invitationId,
            email,
            role: parsed.data.role,
            delivery: outcome.delivery,
            // Only when no email was sent: the automation shares the link by another channel.
            ...(outcome.link ? { inviteUrl: outcome.link } : {}),
        },
        { status: 201, headers: { "cache-control": "no-store" } },
    );
}

const AnnouncementBody = z.object({
    world: z.string().trim().min(1).max(64),
    message: z.string().trim().min(1).max(1000),
    room: z.string().trim().max(128).optional(),
});

async function postAnnouncement(caller: Caller, body: unknown, clientIp: string | undefined): Promise<Response> {
    if (!hasScope(caller, "announcements:write"))
        return apiProblem(403, "insufficientScope", "The token lacks announcements:write");
    const parsed = AnnouncementBody.safeParse(body);
    if (!parsed.success) return apiProblem(400, "invalidBody", "The body does not match the documented fields");
    const actor = caller.actor;
    if (!actor || !roleHas(actor.role, "live.manage")) {
        await auditCall(caller, "automation.refused", clientIp, {
            operation: "announcement",
            reason: "creatorLacksRight",
        });
        return apiProblem(403, "forbidden", "The person who created this token may not send announcements any more");
    }
    const [world] = await db()
        .select()
        .from(schema.worlds)
        .where(
            and(eq(schema.worlds.organizationId, caller.organization.id), eq(schema.worlds.slug, parsed.data.world)),
        );
    if (!world || world.archivedAt) return apiProblem(404, "worldNotFound", "No such world in this organization");
    const rooms = await listRooms(world.id);
    const targets = parsed.data.room ? rooms.filter((r) => r.slug === parsed.data.room) : rooms;
    if (targets.length === 0) return apiProblem(404, "roomNotFound", "No such room in this world");
    const all = await allWorldRoomUrls(caller.organization, world);
    const urls = parsed.data.room ? all.filter((url) => targets.some((room) => url.endsWith(`/${room.slug}`))) : all;
    try {
        await broadcastMessage(urls, parsed.data.message);
    } catch (error) {
        if (error instanceof PusherUnavailableError) {
            return apiProblem(502, "workadventureUnavailable", "WorkAdventure could not be reached");
        }
        throw error;
    }
    await emitOrgEvent(db(), caller.organization.id, "office.announcement", {
        message: parsed.data.message,
        world: { id: world.id, slug: world.slug, name: world.name },
        rooms: targets.length,
        by: { name: actor.name },
        via: "automation",
    });
    await audit({
        action: "live.broadcast",
        account: { id: actor.accountId, email: actor.email },
        organizationId: caller.organization.id,
        worldId: world.id,
        targetType: parsed.data.room ? "room" : "world",
        targetId: parsed.data.room ? targets[0]!.id : world.id,
        ipAddress: clientIp ?? null,
        details: {
            rooms: targets.length,
            length: parsed.data.message.length,
            via: "automation",
            tokenPrefix: caller.token.tokenPrefix,
        },
    });
    return json(
        { status: "sent", world: world.slug, rooms: targets.length },
        { headers: { "cache-control": "no-store" } },
    );
}

const ROUTES: Record<
    string,
    { method: "GET" | "POST"; run: (caller: Caller, body: unknown, ip: string | undefined) => Promise<Response> }
> = {
    "/automation/v1/ping": {
        method: "GET",
        run: async (caller, _body, ip) => {
            await auditCall(caller, "automation.ping", ip, {});
            return json(
                {
                    ok: true,
                    organization: { slug: caller.organization.slug, name: caller.organization.name },
                    token: {
                        name: caller.token.name,
                        prefix: caller.token.tokenPrefix,
                        scopes: caller.token.scopes,
                        expiresAt: caller.token.expiresAt?.toISOString() ?? null,
                    },
                    actingAs: caller.actor ? { name: caller.actor.name, role: caller.actor.role } : null,
                },
                { headers: { "cache-control": "no-store" } },
            );
        },
    },
    "/automation/v1/invitations": { method: "POST", run: postInvitation },
    "/automation/v1/announcements": { method: "POST", run: postAnnouncement },
};

/** Entry point of /automation/v1/* (src/routes/automation/v1/[...path]/+server.ts); testable with plain Requests. */
export async function dispatchAutomationApi(request: Request, clientIp: string | undefined): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    const route = ROUTES[path];
    if (!route) return apiProblem(404, "notFound", "Unknown endpoint");
    if (request.method !== route.method) {
        return new Response(null, { status: 405, headers: { allow: route.method, "cache-control": "no-store" } });
    }
    const perIp = await checkRateLimit(`automation:ip:${clientIp ?? "unknown"}`, PER_IP_LIMIT, 60);
    if (!perIp.allowed)
        return apiProblem(429, "rateLimited", "Too many requests", { "retry-after": String(perIp.retryAfterSec) });
    const caller = await authenticate(request);
    if (caller instanceof Response) return caller;
    const perToken = await checkRateLimit(
        `automation:token:${caller.token.id}`,
        config().RATE_LIMIT_AUTOMATION_PER_TOKEN,
        60,
    );
    if (!perToken.allowed) {
        return apiProblem(429, "rateLimited", "Too many requests for this token", {
            "retry-after": String(perToken.retryAfterSec),
        });
    }
    await db()
        .update(T)
        .set({ lastUsedAt: new Date() })
        .where(
            and(
                eq(T.id, caller.token.id),
                sql`(${T.lastUsedAt} is null or ${T.lastUsedAt} < now() - interval '1 minute')`,
            ),
        );
    try {
        let body: unknown;
        if (route.method === "POST") {
            if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
                return apiProblem(415, "unsupportedMediaType", "Send the body as application/json");
            }
            body = await readJson(request);
            if (body === undefined) return apiProblem(400, "invalidJson", "The body is not valid JSON");
        }
        return await route.run(caller, body, clientIp);
    } catch (error) {
        if (error instanceof PayloadTooLargeError) return apiProblem(413, "payloadTooLarge", "Payload too large");
        logJson("error", "automation API call failed", { path, error: describeError(error) });
        return apiProblem(500, "unexpected", "Internal error");
    }
}
