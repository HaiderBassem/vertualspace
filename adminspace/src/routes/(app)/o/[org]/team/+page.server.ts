import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { grantableRoles, ROLE_ORDER, type OrganizationRole, type WorkspaceRole } from "$lib/server/auth/rbac";
import { verifyPassword } from "$lib/server/auth/credentials";
import { config } from "$lib/server/config";
import { loadOrganization } from "$lib/server/context";
import { pseudonymize } from "$lib/server/crypto";
import { formValues, isUuid, pageParam } from "$lib/server/http/forms";
import { checkRateLimit } from "$lib/server/security/rateLimit";
import {
    createInvitations,
    listOpenInvitations,
    MAX_INVITATIONS_PER_REQUEST,
    parseEmailList,
    resendInvitation,
    revokeInvitation,
    type InvitationContext,
} from "$lib/server/services/invitations";
import { freeDesksOfAccounts, freeDesksOfInvitation, type DeskActor } from "$lib/server/services/desks";
import { mailConfigured, publicOrigin } from "$lib/server/services/mail";
import {
    bulkTeamOperation,
    changeTeamRole,
    leaveOrganization,
    listTeam,
    removeTeamMember,
    setMembershipSuspended,
    teamCounts,
    transferOwnership,
    type Actor,
    type BulkOperation,
    type TeamResult,
} from "$lib/server/services/organizations";
import { listWorkspaces, workspaceRolesByAccount } from "$lib/server/services/workspaces";

/** Who is acting, for the audit log of the desks that are freed when somebody leaves. */
function deskActor(account: { id: string; email: string }, clientIp: string | undefined): DeskActor {
    return { account: { id: account.id, email: account.email }, ipAddress: clientIp ?? null };
}

const PAGE_SIZE = 50;
const Role = z.enum(["owner", "admin", "moderator", "viewer", "employee"]);
const Status = z.enum(["active", "suspended"]);

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access, account } = await loadOrganization(locals, params.org, "team.read");
    const organizationId = access.organization.id;
    const query = url.searchParams.get("q")?.trim().slice(0, 200) || undefined;
    const role = Role.safeParse(url.searchParams.get("role")).data;
    const status = Status.safeParse(url.searchParams.get("status")).data;
    const page = pageParam(url.searchParams.get("page"));

    const [team, counts, invitations, workspaces] = await Promise.all([
        listTeam(organizationId, { query, role, status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        teamCounts(organizationId),
        listOpenInvitations(organizationId),
        listWorkspaces(organizationId),
    ]);
    const workspaceRoles = await workspaceRolesByAccount(
        organizationId,
        team.members.map((m) => m.accountId),
    );
    const workspaceNames = new Map(workspaces.map((w) => [w.id, w.name]));
    const grantable = access.can("team.manage") || access.can("team.invite") ? grantableRoles(access.role) : [];

    return {
        currentAccountId: account.id,
        roles: [...ROLE_ORDER].reverse(),
        grantableRoles: [...grantable].reverse(),
        filters: { q: query ?? "", role: role ?? "", status: status ?? "" },
        page,
        pageSize: PAGE_SIZE,
        total: team.total,
        counts: {
            active: counts.filter((c) => c.status === "active").reduce((sum, c) => sum + c.value, 0),
            suspended: counts.filter((c) => c.status === "suspended").reduce((sum, c) => sum + c.value, 0),
            pending: invitations.filter((i) => i.state === "pending").length,
        },
        team: team.members.map((member) => ({
            ...member,
            since: member.since.toISOString(),
            lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
            manageable: grantable.includes(member.role) && member.accountId !== account.id,
            workspaces: (workspaceRoles.get(member.accountId) ?? [])
                .map((w) => ({ name: workspaceNames.get(w.workspaceId) ?? "", role: w.role }))
                .filter((w) => w.name),
        })),
        invitations: invitations.map((invitation) => ({
            ...invitation,
            createdAt: invitation.createdAt.toISOString(),
            expiresAt: invitation.expiresAt.toISOString(),
            manageable: grantable.includes(invitation.role),
        })),
        workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
        mailConfigured: mailConfigured(),
        maxInvitations: MAX_INVITATIONS_PER_REQUEST,
    };
};

type TeamError = Exclude<TeamResult, "ok" | "unchanged">;

function actorOf(access: { role: OrganizationRole | undefined }, accountId: string): Actor {
    return { accountId, role: access.role };
}

function teamFailure(result: TeamResult) {
    if (result === "notMember") return fail(404, { message: "notFound" as const });
    return fail(400, { teamError: result as TeamError });
}

const RoleForm = z.object({ accountId: z.string().uuid(), role: Role });
const AccountForm = z.object({ accountId: z.string().uuid() });
const InvitationForm = z.object({ invitationId: z.string().uuid() });
const InviteForm = z.object({ emails: z.string().max(40_000), role: Role });
const BulkForm = z.object({
    operation: z.enum(["role", "suspend", "reactivate", "remove"]),
    role: Role.optional().or(z.literal("").transform(() => undefined)),
});
const TransferForm = z.object({ accountId: z.string().uuid(), password: z.string().min(1).max(256) });

/** Workspace access chosen in the invitation form: fields "workspace:<id>" = "", "member" or "manager". */
function workspaceGrants(values: Record<string, string>): { workspaceId: string; role: WorkspaceRole }[] {
    const grants: { workspaceId: string; role: WorkspaceRole }[] = [];
    for (const [key, value] of Object.entries(values)) {
        if (!key.startsWith("workspace:")) continue;
        const workspaceId = key.slice("workspace:".length);
        if (isUuid(workspaceId) && (value === "member" || value === "manager")) {
            grants.push({ workspaceId, role: value });
        }
    }
    return grants;
}

export const actions: Actions = {
    invite: async ({ request, locals, params, url }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.invite");
        const values = formValues(await request.formData());
        const parsed = InviteForm.safeParse(values);
        if (!parsed.success) return fail(400, { values, message: "validation" as const });
        const emails = parseEmailList(parsed.data.emails);
        if (emails.length === 0) return fail(400, { values, errors: { emails: "invalidEmail" as const } });
        if (emails.length > MAX_INVITATIONS_PER_REQUEST) return fail(400, { values, inviteError: "tooMany" as const });

        const limit = config().RATE_LIMIT_INVITATIONS_PER_ORGANIZATION;
        if (limit > 0) {
            // Every address counts, not only the request.
            const check = await checkRateLimit(
                `invite:org:${access.organization.id}`,
                limit,
                3600,
                new Date(),
                emails.length,
            );
            if (!check.allowed) {
                return fail(429, { values, inviteError: "rateLimited" as const });
            }
        }
        const origin = publicOrigin(url);
        if (!origin) return fail(500, { values, inviteError: "originMissing" as const });

        const context: InvitationContext = {
            organization: { id: access.organization.id, name: access.organization.name },
            inviter: { ...actorOf(access, account.id), name: account.name },
            locale: locals.locale,
            origin,
        };
        const outcomes = await createInvitations(context, {
            emails,
            role: parsed.data.role,
            workspaces: workspaceGrants(values),
        });
        for (const outcome of outcomes.filter((o) => o.result === "invited")) {
            await audit({
                action: "invitation.create",
                account,
                organizationId: access.organization.id,
                targetType: "invitation",
                targetId: outcome.invitationId,
                ipAddress: locals.clientIp ?? null,
                details: { email: outcome.email, role: parsed.data.role, delivery: outcome.delivery },
            });
        }
        return { inviteResults: outcomes };
    },

    resend: async ({ request, locals, params, url }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.invite");
        const parsed = InvitationForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        // A resend is one more email: same budget as invitations.
        const limit = config().RATE_LIMIT_INVITATIONS_PER_ORGANIZATION;
        if (limit > 0 && !(await checkRateLimit(`invite:org:${access.organization.id}`, limit, 3600)).allowed) {
            return fail(429, { message: "rateLimited" as const });
        }
        const origin = publicOrigin(url);
        if (!origin) return fail(500, { inviteError: "originMissing" as const });
        const outcome = await resendInvitation(
            {
                organization: { id: access.organization.id, name: access.organization.name },
                inviter: { ...actorOf(access, account.id), name: account.name },
                locale: locals.locale,
                origin,
            },
            parsed.data.invitationId,
        );
        if (outcome.result === "notFound") return fail(404, { message: "notFound" as const });
        if (outcome.result === "forbiddenRole") return fail(403, { teamError: "forbiddenRole" as TeamError });
        await audit({
            action: "invitation.resend",
            account,
            organizationId: access.organization.id,
            targetType: "invitation",
            targetId: parsed.data.invitationId,
            ipAddress: locals.clientIp ?? null,
            details: { delivery: outcome.delivery },
        });
        return { resent: { delivery: outcome.delivery, link: outcome.link ?? null } };
    },

    revoke: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.invite");
        const parsed = InvitationForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const result = await revokeInvitation(
            access.organization.id,
            actorOf(access, account.id),
            parsed.data.invitationId,
        );
        if (result === "notFound") return fail(404, { message: "notFound" as const });
        if (result === "forbiddenRole") return fail(403, { teamError: "forbiddenRole" as TeamError });
        await audit({
            action: "invitation.revoke",
            account,
            organizationId: access.organization.id,
            targetType: "invitation",
            targetId: parsed.data.invitationId,
            ipAddress: locals.clientIp ?? null,
        });
        // A desk reserved for the person who was invited must not stay reserved for somebody who cannot come.
        await freeDesksOfInvitation(
            access.organization.id,
            parsed.data.invitationId,
            deskActor(account, locals.clientIp),
        );
        return { done: "invitationRevoked" as const };
    },

    role: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.manage");
        const parsed = RoleForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const result = await changeTeamRole(
            access.organization.id,
            actorOf(access, account.id),
            parsed.data.accountId,
            parsed.data.role,
        );
        if (result === "unchanged") return { done: "roleChanged" as const };
        if (result !== "ok") return teamFailure(result);
        await audit({
            action: "team.role",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
            details: { role: parsed.data.role },
        });
        return { done: "roleChanged" as const };
    },

    suspend: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.manage");
        const parsed = AccountForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const result = await setMembershipSuspended(
            access.organization.id,
            actorOf(access, account.id),
            parsed.data.accountId,
            true,
        );
        if (result !== "ok" && result !== "unchanged") return teamFailure(result);
        await audit({
            action: "team.suspend",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
        });
        // A person who holds no right any more must not keep a desk. Their things stay on it.
        await freeDesksOfAccounts(
            access.organization.id,
            [parsed.data.accountId],
            deskActor(account, locals.clientIp),
            "suspended",
        );
        return { done: "suspended" as const };
    },

    reactivate: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.manage");
        const parsed = AccountForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const result = await setMembershipSuspended(
            access.organization.id,
            actorOf(access, account.id),
            parsed.data.accountId,
            false,
        );
        if (result !== "ok" && result !== "unchanged") return teamFailure(result);
        await audit({
            action: "team.reactivate",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
        });
        return { done: "reactivated" as const };
    },

    remove: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.manage");
        const parsed = AccountForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const result = await removeTeamMember(
            access.organization.id,
            actorOf(access, account.id),
            parsed.data.accountId,
        );
        if (result !== "ok") return teamFailure(result);
        await audit({
            action: "team.remove",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
        });
        await freeDesksOfAccounts(
            access.organization.id,
            [parsed.data.accountId],
            deskActor(account, locals.clientIp),
            "removed",
        );
        return { done: "removed" as const };
    },

    bulk: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "team.manage");
        const formData = await request.formData();
        const parsed = BulkForm.safeParse(formValues(formData));
        const accountIds = formData
            .getAll("accountIds")
            .filter((v): v is string => typeof v === "string" && isUuid(v))
            .slice(0, 500);
        if (!parsed.success || accountIds.length === 0) return fail(400, { bulkError: "nothingSelected" as const });
        let operation: BulkOperation;
        if (parsed.data.operation === "role") {
            if (!parsed.data.role) return fail(400, { bulkError: "roleRequired" as const });
            operation = { kind: "role", role: parsed.data.role };
        } else {
            operation = { kind: parsed.data.operation };
        }
        const results = await bulkTeamOperation(
            access.organization.id,
            actorOf(access, account.id),
            accountIds,
            operation,
        );
        for (const outcome of results.filter((r) => r.result === "ok")) {
            await audit({
                action: `team.${operation.kind}`,
                account,
                organizationId: access.organization.id,
                targetType: "account",
                targetId: outcome.accountId,
                ipAddress: locals.clientIp ?? null,
                details: { bulk: true, ...(operation.kind === "role" ? { role: operation.role } : {}) },
            });
        }
        if (operation.kind === "suspend" || operation.kind === "remove") {
            await freeDesksOfAccounts(
                access.organization.id,
                results.filter((r) => r.result === "ok").map((r) => r.accountId),
                deskActor(account, locals.clientIp),
                operation.kind === "suspend" ? "suspended" : "removed",
            );
        }
        return { bulkResults: results };
    },

    transfer: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "ownership.transfer");
        const parsed = TransferForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { transferError: "validation" as const });
        const limit = await checkRateLimit(
            `sensitive:account:${pseudonymize(account.id, "sensitive")}`,
            config().RATE_LIMIT_SENSITIVE_PER_ACCOUNT,
            900,
        );
        if (!limit.allowed) return fail(429, { transferError: "rateLimited" as const });
        if (!(await verifyPassword(account.passwordHash, parsed.data.password))) {
            return fail(400, { transferError: "wrongPassword" as const });
        }
        const result = await transferOwnership(access.organization.id, account.id, parsed.data.accountId);
        if (result !== "ok") return fail(400, { transferError: result as TeamError });
        await audit({
            action: "organization.ownership_transfer",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: parsed.data.accountId,
            ipAddress: locals.clientIp ?? null,
            details: { previousOwner: account.id },
        });
        return { done: "transferred" as const };
    },

    leave: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "organization.read");
        if (access.support) return fail(400, { message: "forbidden" as const });
        const result = await leaveOrganization(access.organization.id, account.id);
        if (result !== "ok") return teamFailure(result);
        await audit({
            action: "team.leave",
            account,
            organizationId: access.organization.id,
            targetType: "account",
            targetId: account.id,
            ipAddress: locals.clientIp ?? null,
        });
        await freeDesksOfAccounts(access.organization.id, [account.id], deskActor(account, locals.clientIp), "left");
        redirect(303, "/");
    },
};
