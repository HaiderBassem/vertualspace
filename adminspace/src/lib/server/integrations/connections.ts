/**
 * Connections of an organization (and of its people) to third-party services: the OAuth flow, token storage,
 * refresh, test and disconnection.
 *
 * - The flow starts with a single-use `state` bound to the account that started it and a PKCE verifier (sealed);
 *   the callback consumes it atomically and re-checks the person's permission before anything is stored.
 * - Tokens are sealed at rest (services/secrets.ts) and never leave the server; pages get connectionView() only.
 * - "connected" is set only after a real successful call to the provider (exchange + identity call, or a test).
 * - Refreshes hold a short lease on the row (refresh_locked_until): providers that rotate refresh tokens (Microsoft,
 *   GitLab, Miro, Slack with rotation) invalidate the old one at each refresh, so two concurrent refreshes must never
 *   use the same token. No network call happens inside a database transaction.
 * - 401 or invalid_grant after a refresh attempt: the connection is "expired" and the person is asked to reconnect.
 */
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { audit } from "../audit";
import { roleHas } from "../auth/rbac";
import type { Account } from "../auth/session";
import { randomToken, sha256Hex } from "../crypto";
import { safeRedirectPath } from "../http/forms";
import { logJson } from "../security/requestLog";
import { enqueueJob } from "../services/jobs";
import { openSecret, sealSecret } from "../services/secrets";
import { readIntegrationSettings, type IntegrationSettings } from "../../settings/integrationSettings";
import { ProviderError, type ProviderErrorCode } from "./http";
import { STATE_TTL_MS, integrationOrigin, newPkcePair, newState, redirectUriFor } from "./oauth";
import { isCalendarProvider, isModeAvailable, isProviderId, modeOf, providerById } from "./registry";
import { ORG_EVENT_TYPES } from "./events";
import {
    trelloAuthorizeUrl,
    trelloIdentify,
    trelloTokenExpiry,
    isTrelloToken,
    revokeTrelloToken,
} from "./providers/trello";
import { urlHint } from "./providers/webhooks";
import type {
    ConnectionScope,
    ExchangeResult,
    ExternalIdentity,
    ProviderDefinition,
    ProviderId,
    TokenSet,
} from "./types";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Connection = typeof schema.integrationConnections.$inferSelect;
export type ConnectionStatus = Connection["status"];
const C = schema.integrationConnections;

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

export function organizationConnections(organizationId: string): Promise<Connection[]> {
    return db()
        .select()
        .from(C)
        .where(and(eq(C.organizationId, organizationId), isNull(C.accountId)));
}

export async function organizationConnection(
    organizationId: string,
    provider: ProviderId,
): Promise<Connection | undefined> {
    const [row] = await db()
        .select()
        .from(C)
        .where(and(eq(C.organizationId, organizationId), eq(C.provider, provider), isNull(C.accountId)));
    return row;
}

export function personalConnections(organizationId: string, accountId: string): Promise<Connection[]> {
    return db()
        .select()
        .from(C)
        .where(and(eq(C.organizationId, organizationId), eq(C.accountId, accountId)));
}

export async function personalConnection(
    organizationId: string,
    accountId: string,
    provider: ProviderId,
): Promise<Connection | undefined> {
    const [row] = await db()
        .select()
        .from(C)
        .where(and(eq(C.organizationId, organizationId), eq(C.accountId, accountId), eq(C.provider, provider)));
    return row;
}

/** How many people connected each personal provider (counts only: administrators do not see who). */
export async function personalConnectionCounts(organizationId: string): Promise<Map<string, number>> {
    const rows = await db()
        .select({ provider: C.provider, count: sql<number>`count(*)::int` })
        .from(C)
        .where(and(eq(C.organizationId, organizationId), isNotNull(C.accountId), eq(C.status, "connected")))
        .groupBy(C.provider);
    return new Map(rows.map((r) => [r.provider, r.count]));
}

/** What pages may see of a connection: never a token or a secret. */
export function connectionView(connection: Connection) {
    const settings = readIntegrationSettings(connection.settings);
    return {
        id: connection.id,
        provider: connection.provider,
        personal: connection.accountId !== null,
        status: connection.status,
        scopes: connection.scopes,
        externalAccountName: connection.externalAccountName,
        expiresAt: connection.expiresAt?.toISOString() ?? null,
        lastTestedAt: connection.lastTestedAt?.toISOString() ?? null,
        lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        lastError: connection.lastError,
        createdAt: connection.createdAt.toISOString(),
        settings: {
            calendarSharing: settings.calendarSharing ?? "busy",
            shareActivity: settings.shareActivity ?? false,
            shareMusic: settings.shareMusic ?? false,
            statusSync: settings.statusSync ?? false,
            teamName: settings.teamName ?? null,
            webhookChannel: settings.webhookChannel ?? null,
        },
    };
}
export type ConnectionView = ReturnType<typeof connectionView>;

// ---------------------------------------------------------------------------------------------
// Who may connect
// ---------------------------------------------------------------------------------------------

/**
 * Whether the account may (still) connect this kind of integration in the organization: an active membership of an
 * active organization with integration.manage (organization) or integration.personal (personal). Platform support
 * access never counts: integrations are outside SUPPORT_PERMISSIONS.
 */
export async function mayConnect(accountId: string, organizationId: string, scope: ConnectionScope): Promise<boolean> {
    const [row] = await db()
        .select({
            role: schema.organizationMemberships.role,
            status: schema.organizationMemberships.status,
            organizationStatus: schema.organizations.status,
            accountStatus: schema.accounts.status,
        })
        .from(schema.organizationMemberships)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMemberships.organizationId))
        .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.accountId, accountId),
            ),
        );
    if (!row || row.status !== "active" || row.organizationStatus !== "active" || row.accountStatus !== "active") {
        return false;
    }
    return roleHas(row.role, scope === "personal" ? "integration.personal" : "integration.manage");
}

// ---------------------------------------------------------------------------------------------
// Starting the flow
// ---------------------------------------------------------------------------------------------

export type StartProblem = "notConfigured" | "notAllowed" | "unsupported" | "calendarTaken";

export async function startConnection(input: {
    organizationId: string;
    accountId: string;
    provider: ProviderId;
    scope: ConnectionScope;
    /** Back-office path to return to after the provider (checked with safeRedirectPath). */
    returnTo: string;
    appName: string;
}): Promise<{ ok: true; url: string } | { ok: false; problem: StartProblem }> {
    const provider = providerById(input.provider);
    const mode = modeOf(provider, input.scope);
    if (!mode || (mode.method !== "oauth" && mode.method !== "trelloToken"))
        return { ok: false, problem: "unsupported" };
    if (!isModeAvailable(provider, input.scope)) return { ok: false, problem: "notConfigured" };
    if (!(await mayConnect(input.accountId, input.organizationId, input.scope)))
        return { ok: false, problem: "notAllowed" };
    const personal = input.scope === "personal";
    if (personal && isCalendarProvider(input.provider)) {
        // One calendar per person and organization: WorkAdventure gets one answer, from one provider.
        const others = (await personalConnections(input.organizationId, input.accountId)).filter(
            (c) => isCalendarProvider(c.provider as ProviderId) && c.provider !== input.provider,
        );
        if (others.length > 0) return { ok: false, problem: "calendarTaken" };
    }
    const redirectUri = redirectUriFor(input.provider);
    if (!redirectUri) return { ok: false, problem: "notConfigured" };

    const state = newState();
    const pkce = mode.method === "oauth" && provider.oauth?.pkce ? newPkcePair() : undefined;
    await db()
        .insert(schema.integrationOauthStates)
        .values({
            stateHash: sha256Hex(state),
            organizationId: input.organizationId,
            accountId: input.accountId,
            provider: input.provider,
            personal,
            codeVerifier: pkce ? sealSecret(pkce.verifier) : null,
            redirectUri,
            returnTo: safeRedirectPath(input.returnTo).slice(0, 300),
            expiresAt: new Date(Date.now() + STATE_TTL_MS),
        });
    // Expired flows are useless: drop them as new ones start (retention also purges them).
    await db()
        .delete(schema.integrationOauthStates)
        .where(lt(schema.integrationOauthStates.expiresAt, new Date(Date.now() - 86_400_000)));

    const url =
        mode.method === "trelloToken"
            ? trelloAuthorizeUrl({ state, redirectUri, appName: input.appName })
            : provider.oauth!.authorizeUrl({ personal, state, codeChallenge: pkce?.challenge, redirectUri });
    return { ok: true, url };
}

// ---------------------------------------------------------------------------------------------
// Completing the flow (callback)
// ---------------------------------------------------------------------------------------------

export type OAuthState = typeof schema.integrationOauthStates.$inferSelect;

/**
 * Consumes a state: only once, before it expires, for the provider it was made for and by the account that started
 * the flow (a link sent to someone else cannot complete it). Atomic: a second use finds nothing.
 */
export async function consumeState(
    state: string,
    accountId: string,
    provider: ProviderId,
): Promise<OAuthState | undefined> {
    if (state.length < 20 || state.length > 200) return undefined;
    const S = schema.integrationOauthStates;
    const [row] = await db()
        .update(S)
        .set({ consumedAt: new Date() })
        .where(
            and(
                eq(S.stateHash, sha256Hex(state)),
                eq(S.provider, provider),
                eq(S.accountId, accountId),
                isNull(S.consumedAt),
                sql`${S.expiresAt} > now()`,
            ),
        )
        .returning();
    return row;
}

export type CallbackProblem =
    "invalidState" | "denied" | "notAllowed" | "scopeMissing" | "notConfigured" | "rejected" | "unavailable";

export type CallbackOutcome =
    | { ok: true; returnTo: string; provider: ProviderId; personal: boolean; organizationId: string }
    | { ok: false; problem: CallbackProblem; returnTo: string | undefined };

function callbackProblem(error: unknown): CallbackProblem {
    if (!(error instanceof ProviderError)) return "unavailable";
    const map: Partial<Record<ProviderErrorCode, CallbackProblem>> = {
        scopeMissing: "scopeMissing",
        notConfigured: "notConfigured",
        invalidGrant: "rejected",
        rejected: "rejected",
        forbidden: "denied",
        unauthorized: "rejected",
    };
    return map[error.code] ?? "unavailable";
}

/**
 * Completes a connection: `code` (OAuth), `token` (Trello's fragment flow) or `error` (the person refused). Stores the
 * connection only after the provider answered for the token (exchange and identity call).
 */
export async function completeConnection(input: {
    account: Pick<Account, "id" | "email">;
    provider: ProviderId;
    state: string;
    code?: string | undefined;
    token?: string | undefined;
    error?: string | undefined;
    ipAddress: string | null;
}): Promise<CallbackOutcome> {
    const flow = await consumeState(input.state, input.account.id, input.provider);
    if (!flow) return { ok: false, problem: "invalidState", returnTo: undefined };
    const returnTo = safeRedirectPath(flow.returnTo);
    const scope: ConnectionScope = flow.personal ? "personal" : "organization";
    const fail = async (problem: CallbackProblem, detail?: string) => {
        await audit({
            action: "integration.connect_failed",
            account: input.account,
            organizationId: flow.organizationId,
            targetType: "integration",
            targetId: input.provider,
            ipAddress: input.ipAddress,
            details: {
                provider: input.provider,
                personal: flow.personal,
                reason: problem,
                ...(detail ? { detail } : {}),
            },
        });
        return { ok: false as const, problem, returnTo };
    };
    if (!(await mayConnect(input.account.id, flow.organizationId, scope))) return fail("notAllowed");
    if (input.error) return fail("denied", input.error.replace(/[^a-z_]/gi, "").slice(0, 40));

    const provider = providerById(input.provider);
    let result: ExchangeResult;
    try {
        result = await exchange(provider, flow, input);
    } catch (error) {
        logJson("warn", "integration connection failed", {
            provider: input.provider,
            code: error instanceof ProviderError ? error.code : "unexpected",
            httpStatus: error instanceof ProviderError ? error.httpStatus : undefined,
        });
        return fail(callbackProblem(error), error instanceof ProviderError ? error.code : undefined);
    }

    const connection = await saveConnection({
        organizationId: flow.organizationId,
        accountId: flow.personal ? input.account.id : null,
        provider: input.provider,
        result,
        createdBy: input.account.id,
    });
    await audit({
        action: "integration.connect",
        account: input.account,
        organizationId: flow.organizationId,
        targetType: "integration",
        targetId: connection.id,
        ipAddress: input.ipAddress,
        details: {
            provider: input.provider,
            personal: flow.personal,
            externalAccount: result.identity.name,
            scopes: result.tokens.scopes,
        },
    });
    return {
        ok: true,
        returnTo,
        provider: input.provider,
        personal: flow.personal,
        organizationId: flow.organizationId,
    };
}

async function exchange(
    provider: ProviderDefinition,
    flow: OAuthState,
    input: { code?: string | undefined; token?: string | undefined },
): Promise<ExchangeResult> {
    if (provider.id === "trello") {
        const token = input.token ?? "";
        if (!isTrelloToken(token)) throw new ProviderError("rejected", "Trello: malformed token");
        const identity = await trelloIdentify(token);
        const expiresAt = await trelloTokenExpiry(token);
        return { tokens: { accessToken: token, expiresAt, scopes: ["read"] }, identity };
    }
    if (!provider.oauth || !input.code || input.code.length > 4096) {
        throw new ProviderError("rejected", "no authorization code");
    }
    return provider.oauth.exchangeCode({
        code: input.code,
        codeVerifier: openSecret(flow.codeVerifier),
        redirectUri: flow.redirectUri,
        personal: flow.personal,
    });
}

/** Default choices of a new personal connection: share as little as possible until the person decides otherwise. */
function defaultSettings(provider: ProviderId): IntegrationSettings {
    if (isCalendarProvider(provider)) return { calendarSharing: "busy" };
    if (provider === "github" || provider === "gitlab") return { shareActivity: false };
    if (provider === "spotify") return { shareMusic: false };
    if (provider === "slack") return { statusSync: false };
    return {};
}

/** Inserts or replaces the connection after a successful exchange (one per organization/provider/person). */
export async function saveConnection(input: {
    organizationId: string;
    accountId: string | null;
    provider: ProviderId;
    result: ExchangeResult;
    createdBy: string;
}): Promise<Connection> {
    const { tokens, identity } = input.result;
    const now = new Date();
    const bookkeeping = input.result.settings ?? {};
    const values = {
        organizationId: input.organizationId,
        accountId: input.accountId,
        provider: input.provider,
        status: "connected" as const,
        scopes: tokens.scopes,
        externalAccountId: identity.id.slice(0, 200),
        externalAccountName: identity.name.slice(0, 200),
        accessToken: sealSecret(tokens.accessToken),
        refreshToken: tokens.refreshToken ? sealSecret(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt ?? null,
        lastTestedAt: now,
        lastError: null,
        refreshLockedUntil: null,
        settings: { ...(input.accountId ? defaultSettings(input.provider) : {}), ...bookkeeping },
        createdBy: input.createdBy,
    };
    return db().transaction(async (tx) => {
        const [row] = await tx
            .insert(C)
            .values(values)
            .onConflictDoUpdate({
                target: input.accountId ? [C.organizationId, C.provider, C.accountId] : [C.organizationId, C.provider],
                targetWhere: input.accountId ? sql`${C.accountId} is not null` : sql`${C.accountId} is null`,
                set: {
                    status: "connected",
                    scopes: values.scopes,
                    externalAccountId: values.externalAccountId,
                    externalAccountName: values.externalAccountName,
                    accessToken: values.accessToken,
                    refreshToken: values.refreshToken,
                    expiresAt: values.expiresAt,
                    lastTestedAt: now,
                    lastError: null,
                    refreshLockedUntil: null,
                    // The person's earlier choices stay; the provider's bookkeeping is updated.
                    settings: sql`${C.settings} || ${JSON.stringify(bookkeeping)}::jsonb`,
                    updatedAt: now,
                },
            })
            .returning();
        if (!row) throw new Error("Connection upsert returned no row");
        if (input.result.incomingWebhook && !input.accountId) {
            await addSlackInstallEndpoint(tx, input.organizationId, input.result.incomingWebhook, input.createdBy);
        }
        return row;
    });
}

/** The incoming webhook created by a Slack install becomes a notification endpoint (once per channel). */
async function addSlackInstallEndpoint(
    tx: Transaction,
    organizationId: string,
    hook: { url: string; channel: string },
    createdBy: string,
): Promise<void> {
    const existing = await tx
        .select({ url: schema.integrationEndpoints.url })
        .from(schema.integrationEndpoints)
        .where(
            and(
                eq(schema.integrationEndpoints.organizationId, organizationId),
                eq(schema.integrationEndpoints.kind, "slack"),
            ),
        );
    if (existing.some((e) => openSecret(e.url) === hook.url)) return;
    await tx.insert(schema.integrationEndpoints).values({
        organizationId,
        kind: "slack",
        name: `Slack ${hook.channel}`.slice(0, 200),
        url: sealSecret(hook.url),
        urlHint: urlHint(hook.url),
        eventTypes: [...ORG_EVENT_TYPES],
        createdBy,
    });
}

// ---------------------------------------------------------------------------------------------
// Tokens: refresh with a lease, use with one retry
// ---------------------------------------------------------------------------------------------

const REFRESH_MARGIN_MS = 60_000;
const LEASE_SECONDS = 30;
const inflight = new Map<string, Promise<Connection>>();

function canRefresh(connection: Connection): boolean {
    const provider = isProviderId(connection.provider) ? providerById(connection.provider) : undefined;
    return Boolean(provider?.oauth?.refresh && connection.refreshToken);
}

async function load(id: string): Promise<Connection | undefined> {
    const [row] = await db().select().from(C).where(eq(C.id, id));
    return row;
}

/** Marks a connection whose credentials are dead: the person must reconnect (tokens are wiped). */
async function markExpired(id: string, code: string): Promise<void> {
    await db()
        .update(C)
        .set({ status: "expired", lastError: code, accessToken: null, refreshToken: null, refreshLockedUntil: null })
        .where(eq(C.id, id));
}

/** Records a failure that may pass (provider down, rate limited): the connection stays usable. */
export async function markFailure(id: string, error: unknown): Promise<void> {
    const code = error instanceof ProviderError ? error.code : "unexpected";
    if (error instanceof ProviderError && (error.code === "invalidGrant" || error.code === "unauthorized")) {
        await markExpired(id, code);
        return;
    }
    await db().update(C).set({ lastError: code }).where(eq(C.id, id));
}

/**
 * Refreshes the access token under a lease: one refresh at a time per connection across every instance. A caller
 * that finds the lease taken waits for the other refresh and uses its result.
 */
export function refreshConnection(connection: Connection): Promise<Connection> {
    const running = inflight.get(connection.id);
    if (running) return running;
    const promise = (async () => {
        const [claimed] = await db()
            .update(C)
            .set({ refreshLockedUntil: sql`now() + make_interval(secs => ${LEASE_SECONDS})` })
            .where(and(eq(C.id, connection.id), or(isNull(C.refreshLockedUntil), sql`${C.refreshLockedUntil} < now()`)))
            .returning();
        if (!claimed) {
            for (let i = 0; i < 40; i++) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                const current = await load(connection.id);
                if (!current) throw new ProviderError("unauthorized", "connection removed during refresh");
                if (!current.refreshLockedUntil || current.refreshLockedUntil < new Date()) return current;
            }
            throw new ProviderError("unavailable", "another token refresh is still running");
        }
        // Someone may have refreshed just before the lease was taken.
        if (
            claimed.expiresAt &&
            claimed.expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS &&
            connection.accessToken !== claimed.accessToken
        ) {
            await db().update(C).set({ refreshLockedUntil: null }).where(eq(C.id, claimed.id));
            return { ...claimed, refreshLockedUntil: null };
        }
        const refreshToken = openSecret(claimed.refreshToken);
        const provider = providerById(claimed.provider as ProviderId);
        if (!refreshToken || !provider.oauth?.refresh) {
            await markExpired(claimed.id, "invalidGrant");
            throw new ProviderError("invalidGrant", "no refresh token");
        }
        let tokens: TokenSet;
        try {
            tokens = await provider.oauth.refresh(refreshToken, redirectUriFor(provider.id));
        } catch (error) {
            if (error instanceof ProviderError && (error.code === "invalidGrant" || error.code === "unauthorized")) {
                await markExpired(claimed.id, error.code);
            } else {
                await db()
                    .update(C)
                    .set({
                        refreshLockedUntil: null,
                        lastError: error instanceof ProviderError ? error.code : "unexpected",
                    })
                    .where(eq(C.id, claimed.id));
            }
            throw error;
        }
        const [updated] = await db()
            .update(C)
            .set({
                accessToken: sealSecret(tokens.accessToken),
                // Rotating providers return a new refresh token (the old one is now dead); others keep theirs.
                refreshToken: tokens.refreshToken ? sealSecret(tokens.refreshToken) : claimed.refreshToken,
                expiresAt: tokens.expiresAt ?? null,
                status: "connected",
                lastError: null,
                refreshLockedUntil: null,
            })
            .where(eq(C.id, claimed.id))
            .returning();
        if (!updated) throw new ProviderError("unauthorized", "connection removed during refresh");
        return updated;
    })().finally(() => inflight.delete(connection.id));
    inflight.set(connection.id, promise);
    return promise;
}

/**
 * Runs `call` with a valid access token: refreshed first when it expires within a minute, refreshed once more and
 * retried when the provider answers 401. Dead credentials mark the connection "expired".
 */
export async function withAccessToken<T>(
    connection: Connection,
    call: (accessToken: string, connection: Connection) => Promise<T>,
): Promise<T> {
    if (connection.status !== "connected") {
        throw new ProviderError(
            connection.status === "expired" ? "invalidGrant" : "unauthorized",
            `connection is ${connection.status}`,
        );
    }
    let current = connection;
    if (current.expiresAt && current.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS) {
        if (canRefresh(current)) current = await refreshConnection(current);
        else if (current.expiresAt.getTime() <= Date.now()) {
            await markExpired(current.id, "expired");
            throw new ProviderError("invalidGrant", "the token expired and cannot be refreshed");
        }
    }
    const token = openSecret(current.accessToken);
    if (!token) {
        await markExpired(current.id, "unreadable");
        throw new ProviderError("invalidGrant", "the stored token cannot be read");
    }
    try {
        return await call(token, current);
    } catch (error) {
        if (!(error instanceof ProviderError) || error.code !== "unauthorized") throw error;
        if (!canRefresh(current)) {
            await markExpired(current.id, "unauthorized");
            throw error;
        }
        const refreshed = await refreshConnection(current);
        const fresh = openSecret(refreshed.accessToken);
        if (!fresh) throw error;
        try {
            return await call(fresh, refreshed);
        } catch (retryError) {
            if (retryError instanceof ProviderError && retryError.code === "unauthorized") {
                await markExpired(current.id, "unauthorized");
            }
            throw retryError;
        }
    }
}

/** Notes that WorkAdventure used the connection (at most once a minute): background sync runs only while useful. */
export async function touchConnection(id: string): Promise<void> {
    await db()
        .update(C)
        .set({ lastUsedAt: new Date() })
        .where(and(eq(C.id, id), or(isNull(C.lastUsedAt), sql`${C.lastUsedAt} < now() - interval '1 minute'`)));
}

// ---------------------------------------------------------------------------------------------
// Testing, settings, disconnecting
// ---------------------------------------------------------------------------------------------

export type TestOutcome =
    { ok: true; identity: ExternalIdentity } | { ok: false; problem: ProviderErrorCode | "unexpected" };

/** A cheap authenticated call to the provider; updates the status from its outcome. */
export async function testConnection(connection: Connection): Promise<TestOutcome> {
    const provider = providerById(connection.provider as ProviderId);
    const personal = connection.accountId !== null;
    try {
        const identity = await withAccessToken(connection, (token) =>
            provider.id === "trello" ? trelloIdentify(token) : provider.oauth!.test(token, personal),
        );
        await db()
            .update(C)
            .set({
                status: "connected",
                lastTestedAt: new Date(),
                lastError: null,
                externalAccountName: identity.name.slice(0, 200),
            })
            .where(eq(C.id, connection.id));
        return { ok: true, identity };
    } catch (error) {
        const problem = error instanceof ProviderError ? error.code : "unexpected";
        if (!(error instanceof ProviderError) || !["invalidGrant", "unauthorized"].includes(error.code)) {
            await db()
                .update(C)
                .set({ status: "error", lastTestedAt: new Date(), lastError: problem })
                .where(eq(C.id, connection.id));
        }
        return { ok: false, problem };
    }
}

/** Saves what a person chose to share; merged into the settings (bookkeeping fields are not touched). */
export async function updatePersonalSettings(
    organizationId: string,
    accountId: string,
    provider: ProviderId,
    patch: Pick<IntegrationSettings, "calendarSharing" | "shareActivity" | "shareMusic" | "statusSync">,
): Promise<Connection | undefined> {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const [row] = await db()
        .update(C)
        .set({
            settings: sql`${C.settings} || ${JSON.stringify(clean)}::jsonb`,
            // Stopping to share forgets what was collected for sharing.
            ...(patch.shareActivity === false ? { activity: null } : {}),
        })
        .where(and(eq(C.organizationId, organizationId), eq(C.accountId, accountId), eq(C.provider, provider)))
        .returning();
    return row;
}

export type RevokeOutcome = "revoked" | "unsupported" | "failed";

/** Asks the provider to revoke the grant (best effort, bounded by the HTTP timeout). */
export async function revokeAtProvider(connection: Connection): Promise<RevokeOutcome> {
    const provider = isProviderId(connection.provider) ? providerById(connection.provider) : undefined;
    const accessToken = openSecret(connection.accessToken);
    const refreshToken = openSecret(connection.refreshToken);
    if (!provider || (!accessToken && !refreshToken)) return "revoked";
    try {
        if (provider.id === "trello") return accessToken ? await revokeTrelloToken(accessToken) : "revoked";
        if (!provider.oauth) return "unsupported";
        return await provider.oauth.revoke({ accessToken, refreshToken });
    } catch (error) {
        logJson("warn", "integration revoke failed", {
            provider: connection.provider,
            code: error instanceof ProviderError ? error.code : "unexpected",
        });
        return "failed";
    }
}

/**
 * Disconnects: revokes at the provider (best effort), then deletes the connection and its tokens. A Slack workspace
 * also disables the endpoints that posted with its bot token.
 */
export async function disconnectConnection(connection: Connection): Promise<RevokeOutcome> {
    const outcome = await revokeAtProvider(connection);
    await db().transaction(async (tx) => {
        await tx.delete(C).where(eq(C.id, connection.id));
        if (connection.provider === "slack" && connection.accountId === null) {
            await tx
                .update(schema.integrationEndpoints)
                .set({ enabled: false, disabledReason: "unauthorized" })
                .where(
                    and(
                        eq(schema.integrationEndpoints.organizationId, connection.organizationId),
                        eq(schema.integrationEndpoints.kind, "slack"),
                        isNull(schema.integrationEndpoints.url),
                    ),
                );
        }
    });
    return outcome;
}

/**
 * When people leave (removal, departure) their personal connections stop at once and are revoked at the provider by a
 * background job (integration.revoke), enqueued in the caller's transaction.
 */
export async function endPersonalConnections(
    tx: Transaction,
    organizationId: string,
    accountIds: string[],
): Promise<void> {
    if (accountIds.length === 0) return;
    const rows = await tx
        .update(C)
        .set({ status: "revoked", lastError: "membershipEnded" })
        .where(and(eq(C.organizationId, organizationId), inArray(C.accountId, accountIds)))
        .returning({ id: C.id });
    for (const row of rows) {
        await enqueueJob(tx, {
            kind: "integration.revoke",
            organizationId,
            payload: { connectionId: row.id },
            idempotencyKey: `integration.revoke:${row.id}`,
        });
    }
}

// ---------------------------------------------------------------------------------------------
// Inbound webhook receivers (GitHub, GitLab)
// ---------------------------------------------------------------------------------------------

/** {ORIGIN}/integrations/webhooks/{provider}/{connection id}: the payload URL to give the provider. */
export function receiverUrl(provider: ProviderId, connectionId: string): string | undefined {
    const origin = integrationOrigin();
    return origin ? `${origin}/integrations/webhooks/${provider}/${connectionId}` : undefined;
}

/**
 * Creates (or rotates the secret of) the organization's webhook receiver. The secret is returned once, to be pasted in
 * the provider's webhook settings; the receiver stays "pending" until a delivery signed with it arrives.
 */
export async function setupReceiver(
    organizationId: string,
    provider: "github" | "gitlab",
    createdBy: string,
): Promise<{ connection: Connection; secret: string }> {
    const secret = randomToken(32);
    const [row] = await db()
        .insert(C)
        .values({
            organizationId,
            accountId: null,
            provider,
            status: "pending",
            secret: sealSecret(secret),
            createdBy,
        })
        .onConflictDoUpdate({
            target: [C.organizationId, C.provider],
            targetWhere: sql`${C.accountId} is null`,
            set: { status: "pending", secret: sealSecret(secret), lastError: null, updatedAt: new Date() },
        })
        .returning();
    if (!row) throw new Error("Receiver upsert returned no row");
    return { connection: row, secret };
}

export function isConnectionScope(value: unknown): value is ConnectionScope {
    return value === "organization" || value === "personal";
}
