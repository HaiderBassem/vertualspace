/**
 * Invitations of people, by email, into an organization (with a role and optional workspaces).
 *
 * - The link carries a 256-bit random token; only its SHA-256 is stored. The token is in the query
 *   string (/invite?token=...) so that request logs, which record paths only, never contain it.
 * - One open invitation per address and organization: inviting again replaces the previous one;
 *   resending rotates the token (the old link stops working).
 * - Acceptance is single use (row lock + accepted_at), requires the account's email to be the invited
 *   one, and re-checks that the inviter may still give that role.
 * - Without a mail server the link is returned to the inviter, who shares it: nothing pretends to have
 *   been emailed (lastDelivery = "not_configured").
 */
import { z } from "zod";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, schema, type Database } from "../db/client";
import { config } from "../config";
import { randomToken, sha256Hex } from "../crypto";
import { canManageMember, grantableRoles, type OrganizationRole, type WorkspaceRole } from "../auth/rbac";
import { hashPassword } from "../auth/credentials";
import { isUniqueViolation } from "../db/errors";
import { format, localeInfo, messagesFor, type Locale } from "../../i18n";
import { formatDateTime } from "../../i18n/format";
import { sendMail, type DeliveryOutcome } from "./mail";
import type { Actor } from "./organizations";
import { emitOrgEvent, type OrgEventData } from "../integrations/events";

export type Invitation = typeof schema.invitations.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type InvitationState = "pending" | "accepted" | "revoked" | "expired";

export function invitationState(
    invitation: Pick<Invitation, "acceptedAt" | "revokedAt" | "expiresAt">,
    now = new Date(),
): InvitationState {
    if (invitation.acceptedAt) return "accepted";
    if (invitation.revokedAt) return "revoked";
    if (invitation.expiresAt <= now) return "expired";
    return "pending";
}

/**
 * A plain address: the same check as registration (zod), and none of the characters a mail library would
 * read as a display name or a list (`foo<bar@evil.com>` must not send to bar@evil.com while storing foo…).
 */
const Email = z
    .string()
    .email()
    .max(320)
    .refine((value) => !/[<>"(),;:\\[\]\s]/.test(value));
export const MAX_INVITATIONS_PER_REQUEST = 100;

/** Addresses are compared and stored in lower case (accounts are unique on lower(email) too). */
export function normalizeEmail(value: string): string | undefined {
    const email = value.trim().toLowerCase();
    return Email.safeParse(email).success ? email : undefined;
}

/** Splits a pasted list of addresses (commas, semicolons, spaces or new lines). */
export function parseEmailList(value: string): string[] {
    return value
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

export function invitationLink(origin: string, token: string): string {
    return `${origin}/invite?token=${encodeURIComponent(token)}`;
}

function expiry(now = new Date()): Date {
    return new Date(now.getTime() + config().INVITATION_TTL_HOURS * 3_600_000);
}

/** The member.invited event of the Integration Center (never the token). */
function invitedEvent(invitation: Invitation, inviterName: string): OrgEventData["member.invited"] {
    return {
        invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt.toISOString(),
        },
        invitedBy: { name: inviterName },
    };
}

export interface InvitationContext {
    organization: { id: string; name: string };
    inviter: Actor & { name: string };
    locale: Locale;
    /** Origin of links (ORIGIN, or the request origin outside production). */
    origin: string;
}

function invitationMessage(context: InvitationContext, role: OrganizationRole, link: string, expiresAt: Date) {
    const m = messagesFor(context.locale);
    const t = m.onboarding.emails.invitation;
    const info = localeInfo(context.locale);
    return {
        subject: format(t.subject, { organization: context.organization.name }),
        paragraphs: [
            format(t.body, {
                inviter: context.inviter.name,
                organization: context.organization.name,
                role: m.shell.roles[role],
            }),
        ],
        action: { label: t.action, url: link },
        footnote: format(t.footnote, {
            expiresAt: formatDateTime(expiresAt, { locale: context.locale, timeZone: "UTC" }),
        }),
        dir: info.dir,
        lang: info.tag,
    };
}

async function deliver(
    context: InvitationContext,
    invitation: { id: string; email: string; role: OrganizationRole; expiresAt: Date },
    token: string,
): Promise<{ delivery: DeliveryOutcome; link: string }> {
    const link = invitationLink(context.origin, token);
    const delivery = await sendMail({
        to: invitation.email,
        purpose: "invitation",
        organizationId: context.organization.id,
        message: invitationMessage(context, invitation.role, link, invitation.expiresAt),
    });
    await db()
        .update(schema.invitations)
        .set({
            lastDelivery: delivery,
            lastSentAt: new Date(),
            sendCount: sql`${schema.invitations.sendCount} + 1`,
        })
        .where(eq(schema.invitations.id, invitation.id));
    return { delivery, link };
}

export type InviteResult = "invited" | "alreadyMember" | "invalidEmail" | "forbiddenRole";

export interface InviteOutcome {
    email: string;
    result: InviteResult;
    invitationId?: string;
    delivery?: DeliveryOutcome;
    /** Returned only when the email was not sent, for the inviter to share by other means. */
    link?: string;
}

/** Workspaces of the organization among the requested ones (anything else is ignored). */
async function validWorkspaces(
    organizationId: string,
    grants: { workspaceId: string; role: WorkspaceRole }[],
): Promise<{ workspaceId: string; role: WorkspaceRole }[]> {
    if (grants.length === 0) return [];
    const rows = await db()
        .select({ id: schema.workspaces.id })
        .from(schema.workspaces)
        .where(
            and(
                eq(schema.workspaces.organizationId, organizationId),
                inArray(
                    schema.workspaces.id,
                    grants.map((g) => g.workspaceId),
                ),
            ),
        );
    const ids = new Set(rows.map((r) => r.id));
    const unique = new Map(grants.filter((g) => ids.has(g.workspaceId)).map((g) => [g.workspaceId, g]));
    return [...unique.values()];
}

/**
 * Invites several addresses with the same role and workspaces. Each address is handled on its own
 * and reported: invalid, already a member, or invited (with the delivery outcome).
 */
export async function createInvitations(
    context: InvitationContext,
    input: { emails: string[]; role: OrganizationRole; workspaces: { workspaceId: string; role: WorkspaceRole }[] },
): Promise<InviteOutcome[]> {
    const organizationId = context.organization.id;
    const seen = new Set<string>();
    const outcomes: InviteOutcome[] = [];
    if (!grantableRoles(context.inviter.role).includes(input.role)) {
        return input.emails.map((email) => ({ email, result: "forbiddenRole" }));
    }
    const workspaces = await validWorkspaces(organizationId, input.workspaces);

    for (const raw of input.emails.slice(0, MAX_INVITATIONS_PER_REQUEST)) {
        const email = normalizeEmail(raw);
        if (!email) {
            outcomes.push({ email: raw.slice(0, 320), result: "invalidEmail" });
            continue;
        }
        if (seen.has(email)) continue;
        seen.add(email);

        const member = await db()
            .select({ accountId: schema.organizationMemberships.accountId })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, organizationId),
                    sql`lower(${schema.accounts.email}) = ${email}`,
                ),
            )
            .limit(1);
        if (member.length > 0) {
            outcomes.push({ email, result: "alreadyMember" });
            continue;
        }

        const token = randomToken();
        const invitation = await db().transaction(async (tx) => {
            // The new invitation replaces any open one for the same address (unique index on open ones).
            await tx
                .update(schema.invitations)
                .set({ revokedAt: new Date(), revokedBy: context.inviter.accountId })
                .where(
                    and(
                        eq(schema.invitations.organizationId, organizationId),
                        sql`lower(${schema.invitations.email}) = ${email}`,
                        isNull(schema.invitations.acceptedAt),
                        isNull(schema.invitations.revokedAt),
                    ),
                );
            const [row] = await tx
                .insert(schema.invitations)
                .values({
                    organizationId,
                    email,
                    role: input.role,
                    tokenHash: sha256Hex(token),
                    invitedBy: context.inviter.accountId,
                    expiresAt: expiry(),
                })
                .returning();
            if (!row) throw new Error("Invitation creation returned no row");
            if (workspaces.length > 0) {
                await tx.insert(schema.invitationWorkspaces).values(
                    workspaces.map((w) => ({
                        invitationId: row.id,
                        organizationId,
                        workspaceId: w.workspaceId,
                        role: w.role,
                    })),
                );
            }
            await emitOrgEvent(tx, organizationId, "member.invited", invitedEvent(row, context.inviter.name));
            return row;
        });
        const { delivery, link } = await deliver(context, invitation, token);
        outcomes.push({
            email,
            result: "invited",
            invitationId: invitation.id,
            delivery,
            ...(delivery === "sent" ? {} : { link }),
        });
    }
    return outcomes;
}

/** Sends an invitation again with a new token and a new expiry. The previous link stops working. */
export async function resendInvitation(
    context: InvitationContext,
    invitationId: string,
): Promise<
    { result: "ok"; delivery: DeliveryOutcome; link?: string } | { result: "notFound" } | { result: "forbiddenRole" }
> {
    const organizationId = context.organization.id;
    const current = await db().query.invitations.findFirst({
        where: and(eq(schema.invitations.organizationId, organizationId), eq(schema.invitations.id, invitationId)),
    });
    if (!current || current.acceptedAt || current.revokedAt) return { result: "notFound" };
    if (!canManageMember(context.inviter.role, current.role)) return { result: "forbiddenRole" };
    const token = randomToken();
    const [updated] = await db()
        .update(schema.invitations)
        .set({ tokenHash: sha256Hex(token), expiresAt: expiry(), invitedBy: context.inviter.accountId })
        .where(
            and(
                eq(schema.invitations.id, invitationId),
                isNull(schema.invitations.acceptedAt),
                isNull(schema.invitations.revokedAt),
            ),
        )
        .returning();
    if (!updated) return { result: "notFound" };
    const { delivery, link } = await deliver(context, updated, token);
    return { result: "ok", delivery, ...(delivery === "sent" ? {} : { link }) };
}

export async function revokeInvitation(
    organizationId: string,
    actor: Actor,
    invitationId: string,
): Promise<"ok" | "notFound" | "forbiddenRole"> {
    const current = await db().query.invitations.findFirst({
        where: and(eq(schema.invitations.organizationId, organizationId), eq(schema.invitations.id, invitationId)),
    });
    if (!current || current.acceptedAt || current.revokedAt) return "notFound";
    if (!canManageMember(actor.role, current.role)) return "forbiddenRole";
    await db()
        .update(schema.invitations)
        .set({ revokedAt: new Date(), revokedBy: actor.accountId })
        .where(and(eq(schema.invitations.id, invitationId), isNull(schema.invitations.acceptedAt)));
    return "ok";
}

export interface InvitationView {
    id: string;
    email: string;
    role: OrganizationRole;
    state: InvitationState;
    invitedBy: string | null;
    createdAt: Date;
    expiresAt: Date;
    lastDelivery: string | null;
    sendCount: number;
    workspaces: { workspaceId: string; name: string; role: WorkspaceRole }[];
}

/** Open (pending and expired) invitations of an organization, newest first. */
export async function listOpenInvitations(organizationId: string, limit = 200): Promise<InvitationView[]> {
    const rows = await db()
        .select({ invitation: schema.invitations, inviter: schema.accounts.name })
        .from(schema.invitations)
        .leftJoin(schema.accounts, eq(schema.accounts.id, schema.invitations.invitedBy))
        .where(
            and(
                eq(schema.invitations.organizationId, organizationId),
                isNull(schema.invitations.acceptedAt),
                isNull(schema.invitations.revokedAt),
            ),
        )
        .orderBy(desc(schema.invitations.createdAt))
        .limit(limit);
    const ids = rows.map((r) => r.invitation.id);
    const grants =
        ids.length > 0
            ? await db()
                  .select({
                      invitationId: schema.invitationWorkspaces.invitationId,
                      workspaceId: schema.invitationWorkspaces.workspaceId,
                      role: schema.invitationWorkspaces.role,
                      name: schema.workspaces.name,
                  })
                  .from(schema.invitationWorkspaces)
                  .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invitationWorkspaces.workspaceId))
                  .where(inArray(schema.invitationWorkspaces.invitationId, ids))
            : [];
    const now = new Date();
    return rows.map(({ invitation, inviter }) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        state: invitationState(invitation, now),
        invitedBy: inviter,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        lastDelivery: invitation.lastDelivery,
        sendCount: invitation.sendCount,
        workspaces: grants
            .filter((g) => g.invitationId === invitation.id)
            .map((g) => ({ workspaceId: g.workspaceId, name: g.name, role: g.role })),
    }));
}

export interface InvitationLookup {
    invitation: Invitation;
    state: InvitationState;
    organization: { id: string; slug: string; name: string; logoUrl: string | null; active: boolean };
    inviterName: string | null;
    workspaces: string[];
}

/** The invitation a link points to, whatever its state (the page explains expired or used links). */
export async function findInvitationByToken(token: string): Promise<InvitationLookup | undefined> {
    if (token.length < 20 || token.length > 200) return undefined;
    const rows = await db()
        .select({ invitation: schema.invitations, organization: schema.organizations, inviter: schema.accounts.name })
        .from(schema.invitations)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invitations.organizationId))
        .leftJoin(schema.accounts, eq(schema.accounts.id, schema.invitations.invitedBy))
        .where(eq(schema.invitations.tokenHash, sha256Hex(token)))
        .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    const workspaces = await db()
        .select({ name: schema.workspaces.name })
        .from(schema.invitationWorkspaces)
        .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invitationWorkspaces.workspaceId))
        .where(eq(schema.invitationWorkspaces.invitationId, row.invitation.id));
    return {
        invitation: row.invitation,
        state: invitationState(row.invitation),
        organization: {
            id: row.organization.id,
            slug: row.organization.slug,
            name: row.organization.name,
            logoUrl: row.organization.logoUrl,
            active: row.organization.status === "active",
        },
        inviterName: row.inviter,
        workspaces: workspaces.map((w) => w.name),
    };
}

export type AcceptFailure = "invalid" | "emailMismatch" | "accountExists" | "organizationInactive";

export type AcceptResult =
    | { result: "accepted"; organizationSlug: string; organizationId: string; invitationId: string; accountId: string }
    | { result: "alreadyMember"; organizationSlug: string }
    | { result: AcceptFailure };

/** Locks a pending, unexpired invitation by token and re-checks that its inviter may still grant it. */
async function lockValidInvitation(
    tx: Transaction,
    token: string,
): Promise<{ invitation: Invitation; organizationSlug: string } | "invalid" | "organizationInactive"> {
    const [row] = await tx
        .select({
            invitation: schema.invitations,
            slug: schema.organizations.slug,
            status: schema.organizations.status,
        })
        .from(schema.invitations)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invitations.organizationId))
        .where(
            and(
                eq(schema.invitations.tokenHash, sha256Hex(token)),
                isNull(schema.invitations.acceptedAt),
                isNull(schema.invitations.revokedAt),
                gt(schema.invitations.expiresAt, new Date()),
            ),
        )
        .for("update", { of: schema.invitations });
    if (!row) return "invalid";
    if (row.status !== "active") return "organizationInactive";
    // The inviter must still be an active member allowed to give this role.
    if (!row.invitation.invitedBy) return "invalid";
    const [inviter] = await tx
        .select({ role: schema.organizationMemberships.role, status: schema.organizationMemberships.status })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, row.invitation.organizationId),
                eq(schema.organizationMemberships.accountId, row.invitation.invitedBy),
            ),
        );
    if (inviter) {
        if (inviter.status !== "active" || !canManageMember(inviter.role, row.invitation.role)) return "invalid";
        return { invitation: row.invitation, organizationSlug: row.slug };
    }
    // Not a member: only a platform administrator's owner invitation, while the organization has no
    // active owner (onboarding of a new organization, recovery of an abandoned one).
    if (!(await isPlatformOwnerInvitationValid(tx, row.invitation))) return "invalid";
    return { invitation: row.invitation, organizationSlug: row.slug };
}

async function hasActiveOwner(tx: Transaction | Database, organizationId: string): Promise<boolean> {
    const owners = await tx
        .select({ accountId: schema.organizationMemberships.accountId })
        .from(schema.organizationMemberships)
        .where(
            and(
                eq(schema.organizationMemberships.organizationId, organizationId),
                eq(schema.organizationMemberships.role, "owner"),
                eq(schema.organizationMemberships.status, "active"),
            ),
        )
        .limit(1);
    return owners.length > 0;
}

async function isPlatformOwnerInvitationValid(tx: Transaction, invitation: Invitation): Promise<boolean> {
    if (invitation.role !== "owner" || !invitation.invitedBy) return false;
    const [inviter] = await tx
        .select({ isSuperadmin: schema.accounts.isSuperadmin, status: schema.accounts.status })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, invitation.invitedBy));
    if (!inviter?.isSuperadmin || inviter.status !== "active") return false;
    return !(await hasActiveOwner(tx, invitation.organizationId));
}

/**
 * Platform administrators invite the first owner of an organization without one. Refused when the
 * organization has an active owner: the platform does not hand out power inside a running tenant.
 */
export async function createPlatformOwnerInvitation(
    context: Omit<InvitationContext, "inviter"> & { inviter: { accountId: string; name: string } },
    email: string,
): Promise<InviteOutcome | { email: string; result: "hasOwner" }> {
    if (await hasActiveOwner(db(), context.organization.id)) return { email, result: "hasOwner" };
    const normalized = normalizeEmail(email);
    if (!normalized) return { email, result: "invalidEmail" };
    const token = randomToken();
    const invitation = await db().transaction(async (tx) => {
        await tx
            .update(schema.invitations)
            .set({ revokedAt: new Date(), revokedBy: context.inviter.accountId })
            .where(
                and(
                    eq(schema.invitations.organizationId, context.organization.id),
                    sql`lower(${schema.invitations.email}) = ${normalized}`,
                    isNull(schema.invitations.acceptedAt),
                    isNull(schema.invitations.revokedAt),
                ),
            );
        const [row] = await tx
            .insert(schema.invitations)
            .values({
                organizationId: context.organization.id,
                email: normalized,
                role: "owner",
                tokenHash: sha256Hex(token),
                invitedBy: context.inviter.accountId,
                expiresAt: expiry(),
            })
            .returning();
        if (!row) throw new Error("Invitation creation returned no row");
        await emitOrgEvent(tx, context.organization.id, "member.invited", invitedEvent(row, context.inviter.name));
        return row;
    });
    const { delivery, link } = await deliver(
        { ...context, inviter: { ...context.inviter, role: undefined } },
        invitation,
        token,
    );
    return {
        email: normalized,
        result: "invited",
        invitationId: invitation.id,
        delivery,
        ...(delivery === "sent" ? {} : { link }),
    };
}

async function grantInvitation(tx: Transaction, invitation: Invitation, accountId: string): Promise<void> {
    await tx.insert(schema.organizationMemberships).values({
        organizationId: invitation.organizationId,
        accountId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
    });
    const grants = await tx
        .select()
        .from(schema.invitationWorkspaces)
        .where(eq(schema.invitationWorkspaces.invitationId, invitation.id));
    if (grants.length > 0) {
        await tx.insert(schema.workspaceMemberships).values(
            grants.map((g) => ({
                organizationId: invitation.organizationId,
                workspaceId: g.workspaceId,
                accountId,
                role: g.role,
                createdBy: invitation.invitedBy,
            })),
        );
    }
    await tx
        .update(schema.invitations)
        .set({ acceptedAt: new Date(), acceptedBy: accountId })
        .where(eq(schema.invitations.id, invitation.id));
}

/** Accepts an invitation as an existing, logged-in account. */
export async function acceptInvitation(
    token: string,
    account: { id: string; email: string; emailVerifiedAt: Date | null },
): Promise<AcceptResult> {
    return db().transaction(async (tx) => {
        const locked = await lockValidInvitation(tx, token);
        if (typeof locked === "string") return { result: locked };
        const { invitation, organizationSlug } = locked;
        if (invitation.email.toLowerCase() !== account.email.toLowerCase()) return { result: "emailMismatch" };
        const existing = await tx
            .select({ role: schema.organizationMemberships.role })
            .from(schema.organizationMemberships)
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, invitation.organizationId),
                    eq(schema.organizationMemberships.accountId, account.id),
                ),
            );
        if (existing.length > 0) {
            await tx
                .update(schema.invitations)
                .set({ acceptedAt: new Date(), acceptedBy: account.id })
                .where(eq(schema.invitations.id, invitation.id));
            return { result: "alreadyMember", organizationSlug };
        }
        await grantInvitation(tx, invitation, account.id);
        // The emailed link proves the address (a link shared by hand does not).
        if (!account.emailVerifiedAt && invitation.lastDelivery === "sent") {
            await tx
                .update(schema.accounts)
                .set({ emailVerifiedAt: new Date() })
                .where(eq(schema.accounts.id, account.id));
        }
        return {
            result: "accepted",
            organizationSlug,
            organizationId: invitation.organizationId,
            invitationId: invitation.id,
            accountId: account.id,
        };
    });
}

/**
 * Accepts an invitation by creating the account of the invited address. "accountExists" when the
 * address already has an account: the person must log in and accept as that account.
 */
export async function acceptInvitationWithNewAccount(
    token: string,
    input: { name: string; password: string; locale: Locale },
): Promise<AcceptResult> {
    const passwordHash = await hashPassword(input.password);
    try {
        return await db().transaction(async (tx): Promise<AcceptResult> => {
            const locked = await lockValidInvitation(tx, token);
            if (typeof locked === "string") return { result: locked };
            const { invitation, organizationSlug } = locked;
            const existing = await tx
                .select({ id: schema.accounts.id })
                .from(schema.accounts)
                .where(sql`lower(${schema.accounts.email}) = lower(${invitation.email})`)
                .limit(1);
            if (existing.length > 0) return { result: "accountExists" };
            const [account] = await tx
                .insert(schema.accounts)
                .values({
                    email: invitation.email,
                    name: input.name,
                    passwordHash,
                    locale: input.locale,
                    emailVerifiedAt: invitation.lastDelivery === "sent" ? new Date() : null,
                })
                .returning({ id: schema.accounts.id });
            if (!account) throw new Error("Account creation returned no row");
            await grantInvitation(tx, invitation, account.id);
            return {
                result: "accepted",
                accountId: account.id,
                organizationSlug,
                organizationId: invitation.organizationId,
                invitationId: invitation.id,
            };
        });
    } catch (error) {
        // A concurrent registration of the same address won the race.
        if (isUniqueViolation(error)) return { result: "accountExists" };
        throw error;
    }
}
