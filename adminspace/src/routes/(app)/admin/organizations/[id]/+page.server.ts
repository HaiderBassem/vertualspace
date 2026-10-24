import { error, fail, redirect } from "@sveltejs/kit";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { activeSupportGrant, requireSuperadmin } from "$lib/server/auth/rbac";
import type { Account } from "$lib/server/auth/session";
import { requireAccount } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { formValues, isUuid } from "$lib/server/http/forms";
import { organizationStats } from "$lib/server/services/directory";
import { createPlatformOwnerInvitation } from "$lib/server/services/invitations";
import { mailConfigured, publicOrigin } from "$lib/server/services/mail";
import { deleteOrganization, setOrganizationSuspended } from "$lib/server/services/organizations";
import {
    endSupportAccess,
    listSupportGrants,
    startSupportAccess,
    SUPPORT_DURATIONS_MINUTES,
    type SupportDuration,
} from "$lib/server/services/support";

function superadmin(locals: App.Locals): Account {
    const account = requireAccount(locals);
    requireSuperadmin(account);
    return account;
}

async function findOrganization(id: string) {
    if (!isUuid(id)) error(404, "Not found");
    const organization = await db().query.organizations.findFirst({ where: eq(schema.organizations.id, id) });
    if (!organization) error(404, "Not found");
    return organization;
}

/**
 * What the platform knows about an organization without entering it: identity, status, figures and
 * owners (the contacts). Its content is reachable only through support access.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
    const account = superadmin(locals);
    const organization = await findOrganization(params.id);
    const [stats, owners, waMembers, membership, grants, mine] = await Promise.all([
        organizationStats(organization.id),
        db()
            .select({ name: schema.accounts.name, email: schema.accounts.email })
            .from(schema.organizationMemberships)
            .innerJoin(schema.accounts, eq(schema.accounts.id, schema.organizationMemberships.accountId))
            .where(
                and(
                    eq(schema.organizationMemberships.organizationId, organization.id),
                    eq(schema.organizationMemberships.role, "owner"),
                    eq(schema.organizationMemberships.status, "active"),
                ),
            ),
        db()
            .select({ value: count() })
            .from(schema.members)
            .innerJoin(schema.worlds, eq(schema.worlds.id, schema.members.worldId))
            .where(and(eq(schema.worlds.organizationId, organization.id), eq(schema.members.kind, "member"))),
        db().query.organizationMemberships.findFirst({
            where: and(
                eq(schema.organizationMemberships.organizationId, organization.id),
                eq(schema.organizationMemberships.accountId, account.id),
                eq(schema.organizationMemberships.status, "active"),
            ),
        }),
        listSupportGrants(organization.id),
        activeSupportGrant(account.id, organization.id),
    ]);
    return {
        organization: {
            id: organization.id,
            slug: organization.slug,
            name: organization.name,
            status: organization.status,
            countryCode: organization.countryCode,
            contactEmail: organization.contactEmail,
            createdAt: organization.createdAt.toISOString(),
        },
        stats: { ...stats, members: waMembers[0]?.value ?? 0 },
        owners,
        isMember: membership !== undefined,
        activeGrant: mine ? { expiresAt: mine.expiresAt.toISOString(), reason: mine.reason } : null,
        grants: grants.map((g) => ({
            ...g,
            createdAt: g.createdAt.toISOString(),
            expiresAt: g.expiresAt.toISOString(),
            endedAt: g.endedAt?.toISOString() ?? null,
        })),
        durations: SUPPORT_DURATIONS_MINUTES,
        mailConfigured: mailConfigured(),
    };
};

const SupportForm = z.object({
    reason: z.string().trim().min(5).max(500),
    minutes: z.coerce
        .number()
        .refine((m): m is SupportDuration => SUPPORT_DURATIONS_MINUTES.includes(m as SupportDuration)),
});
const OwnerForm = z.object({ email: z.string().trim().email().max(320) });

export const actions: Actions = {
    startSupport: async ({ request, locals, params }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        const parsed = SupportForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { supportError: "reason" as const });
        const grant = await startSupportAccess({
            organizationId: organization.id,
            accountId: account.id,
            reason: parsed.data.reason,
            minutes: parsed.data.minutes as SupportDuration,
        });
        // In the organization's own audit log: its administrators see who entered, when and why. No log entry,
        // no access: the grant is ended again if the entry cannot be written.
        try {
            await audit({
                action: "support.start",
                account,
                organizationId: organization.id,
                targetType: "support_grant",
                targetId: grant.id,
                ipAddress: locals.clientIp ?? null,
                details: { reason: parsed.data.reason, minutes: parsed.data.minutes },
            });
        } catch (failure) {
            await endSupportAccess(organization.id, account.id);
            throw failure;
        }
        redirect(303, `/o/${organization.slug}`);
    },

    endSupport: async ({ locals, params }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        const grantId = await endSupportAccess(organization.id, account.id);
        if (grantId) {
            await audit({
                action: "support.end",
                account,
                organizationId: organization.id,
                targetType: "support_grant",
                targetId: grantId,
                ipAddress: locals.clientIp ?? null,
            });
        }
        return { supportEnded: true as const };
    },

    suspend: async ({ locals, params }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        await setOrganizationSuspended(organization.id, true);
        await audit({
            action: "organization.suspend",
            account,
            organizationId: organization.id,
            targetType: "organization",
            targetId: organization.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { lifecycle: "suspended" as const };
    },

    reactivate: async ({ locals, params }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        await setOrganizationSuspended(organization.id, false);
        await audit({
            action: "organization.reactivate",
            account,
            organizationId: organization.id,
            targetType: "organization",
            targetId: organization.id,
            ipAddress: locals.clientIp ?? null,
        });
        return { lifecycle: "reactivated" as const };
    },

    inviteOwner: async ({ request, locals, params, url }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        const parsed = OwnerForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { ownerError: "invalidEmail" as const });
        const origin = publicOrigin(url);
        if (!origin) return fail(500, { ownerError: "originMissing" as const });
        const outcome = await createPlatformOwnerInvitation(
            {
                organization: { id: organization.id, name: organization.name },
                inviter: { accountId: account.id, name: account.name },
                locale: locals.locale,
                origin,
            },
            parsed.data.email,
        );
        if (outcome.result === "hasOwner") return fail(400, { ownerError: "hasOwner" as const });
        if (outcome.result !== "invited") return fail(400, { ownerError: "invalidEmail" as const });
        await audit({
            action: "invitation.create",
            account,
            organizationId: organization.id,
            targetType: "invitation",
            targetId: outcome.invitationId,
            ipAddress: locals.clientIp ?? null,
            details: { email: outcome.email, role: "owner", platform: true, delivery: outcome.delivery },
        });
        return { ownerInvited: { delivery: outcome.delivery, link: outcome.link ?? null } };
    },

    delete: async ({ locals, params }) => {
        const account = superadmin(locals);
        const organization = await findOrganization(params.id);
        await deleteOrganization(organization.id);
        // organizationId is not set: the organization no longer exists to reference.
        await audit({
            action: "organization.delete",
            account,
            targetType: "organization",
            targetId: organization.slug,
            ipAddress: locals.clientIp ?? null,
            details: { name: organization.name },
        });
        redirect(303, "/admin/organizations");
    },
};
