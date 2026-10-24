import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { isUuid } from "$lib/server/http/forms";
import {
    addDomain,
    challengeRecordName,
    listDomains,
    normalizeHost,
    removeDomain,
    verifyDomainOwnership,
} from "$lib/server/services/domains";

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const context = await loadOrganization(locals, params.org, "domain.manage");
    const domains = await listDomains(context.access.organization.id);
    return {
        adminOrigin: url.origin,
        domains: domains.map((d) => ({
            id: d.id,
            host: d.host,
            challenge: d.challenge,
            recordName: challengeRecordName(d.host),
            verifiedAt: d.verifiedAt?.toISOString() ?? null,
            createdAt: d.createdAt.toISOString(),
        })),
    };
};

const idOf = async (request: Request): Promise<string | undefined> => {
    const id = (await request.formData()).get("id");
    return isUuid(id) ? id : undefined;
};

export const actions: Actions = {
    add: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "domain.manage");
        const input = String((await request.formData()).get("host") ?? "").slice(0, 300);
        const host = normalizeHost(input);
        if (!host) return fail(400, { hostError: "invalidHost" as const, host: input });
        // Host names are unique across organizations: a domain claimed elsewhere cannot be added.
        const domain = await addDomain(access.organization.id, host);
        if (domain === "taken") return fail(400, { hostError: "hostTaken" as const, host: input });
        await audit({
            action: "domain.add",
            account,
            organizationId: access.organization.id,
            targetType: "domain",
            targetId: domain.host,
            ipAddress: locals.clientIp ?? null,
        });
        return { success: true };
    },

    /** Checks the DNS TXT proof. Only a published proof verifies a domain. */
    verify: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "domain.manage");
        const id = await idOf(request);
        if (!id) return fail(404, { message: "notFound" as const });
        const result = await verifyDomainOwnership(access.organization.id, id);
        if (result.status === "notFound") return fail(404, { message: "notFound" as const });
        if (result.status !== "verified") {
            await audit({
                action: "domain.verify_failed",
                account,
                organizationId: access.organization.id,
                targetType: "domain",
                targetId: id,
                ipAddress: locals.clientIp ?? null,
                details: { reason: result.status },
            });
            return fail(400, { verifyError: result.status, recordName: result.recordName });
        }
        await audit({
            action: "domain.verify",
            account,
            organizationId: access.organization.id,
            targetType: "domain",
            targetId: result.domain.host,
            ipAddress: locals.clientIp ?? null,
            details: { proof: "dns-txt" },
        });
        return { verified: true };
    },

    remove: async ({ request, locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "domain.manage");
        const id = await idOf(request);
        const domain = id ? await removeDomain(access.organization.id, id) : undefined;
        if (!domain) return fail(404, { message: "notFound" as const });
        await audit({
            action: "domain.remove",
            account,
            organizationId: access.organization.id,
            targetType: "domain",
            targetId: domain.host,
            ipAddress: locals.clientIp ?? null,
        });
        return { removed: true };
    },
};
