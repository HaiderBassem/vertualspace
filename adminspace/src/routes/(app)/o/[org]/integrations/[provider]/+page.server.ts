import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { db, schema } from "$lib/server/db/client";
import { messagesFor } from "$lib/i18n";
import { cardFor } from "$lib/server/integrations/catalog";
import {
    disconnectConnection,
    organizationConnection,
    organizationConnections,
    personalConnectionCounts,
    receiverUrl,
    setupReceiver,
    startConnection,
    testConnection,
    type CallbackProblem,
} from "$lib/server/integrations/connections";
import { listEndpoints } from "$lib/server/integrations/endpoints";
import { isProviderId, providerById } from "$lib/server/integrations/registry";
import { forgetResources, hasResources, listResources } from "$lib/server/integrations/resources";
import type { ProviderDefinition } from "$lib/server/integrations/types";

const CALLBACK_PROBLEMS: readonly CallbackProblem[] = [
    "invalidState",
    "denied",
    "notAllowed",
    "scopeMissing",
    "notConfigured",
    "rejected",
    "unavailable",
];

function providerOf(value: string): ProviderDefinition {
    if (!isProviderId(value)) error(404, "Not found");
    return providerById(value);
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "integration.manage");
    const provider = providerOf(params.provider);
    const organizationId = access.organization.id;
    const [connections, endpoints, counts] = await Promise.all([
        organizationConnections(organizationId),
        listEndpoints(organizationId),
        personalConnectionCounts(organizationId),
    ]);
    const card = cardFor(provider, connections, endpoints, counts);
    const connection = connections.find((c) => c.provider === provider.id);

    let resources: Awaited<ReturnType<typeof listResources>> | null = null;
    if (hasResources(provider.id) && connection?.status === "connected") {
        resources = await listResources(connection, messagesFor(locals.locale).integrationCenter.resources.untitled);
    }
    const problem = url.searchParams.get("problem");
    return {
        card,
        resources,
        receiverUrl:
            provider.organization?.method === "receiver" && connection
                ? (receiverUrl(provider.id, connection.id) ?? null)
                : null,
        flash: {
            connected: url.searchParams.get("connected") === provider.id,
            problem: CALLBACK_PROBLEMS.find((p) => p === problem) ?? null,
        },
    };
};

export const actions: Actions = {
    connect: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const provider = providerOf(params.provider);
        const started = await startConnection({
            organizationId: access.organization.id,
            accountId: account.id,
            provider: provider.id,
            scope: "organization",
            returnTo: `/o/${access.organization.slug}/integrations/${provider.id}`,
            appName: messagesFor(locals.locale).common.appName,
        });
        if (!started.ok) return fail(400, { problem: started.problem });
        redirect(303, started.url);
    },

    test: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const provider = providerOf(params.provider);
        const connection = await organizationConnection(access.organization.id, provider.id);
        if (!connection || provider.organization?.method === "receiver")
            return fail(404, { problem: "notFound" as const });
        const outcome = await testConnection(connection);
        forgetResources(connection.id);
        await audit({
            action: "integration.test",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id, ok: outcome.ok, ...(outcome.ok ? {} : { problem: outcome.problem }) },
        });
        return {
            test: outcome.ok
                ? { ok: true as const, account: outcome.identity.name }
                : { ok: false as const, problem: outcome.problem },
        };
    },

    disconnect: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const provider = providerOf(params.provider);
        const connection = await organizationConnection(access.organization.id, provider.id);
        if (!connection) return fail(404, { problem: "notFound" as const });
        const outcome = await disconnectConnection(connection);
        forgetResources(connection.id);
        await audit({
            action: "integration.disconnect",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id, revoke: outcome },
        });
        return { disconnected: outcome };
    },

    setupReceiver: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const provider = providerOf(params.provider);
        if (provider.organization?.method !== "receiver" || (provider.id !== "github" && provider.id !== "gitlab")) {
            return fail(404, { problem: "notFound" as const });
        }
        const { connection, secret } = await setupReceiver(access.organization.id, provider.id, account.id);
        await audit({
            action: "integration.receiver_setup",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: connection.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id },
        });
        // Shown once: only its sealed form is stored.
        return { receiverSecret: secret };
    },

    removeReceiver: async ({ locals, params }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const provider = providerOf(params.provider);
        if (provider.organization?.method !== "receiver") return fail(404, { problem: "notFound" as const });
        const [removed] = await db()
            .delete(schema.integrationConnections)
            .where(
                and(
                    eq(schema.integrationConnections.organizationId, access.organization.id),
                    eq(schema.integrationConnections.provider, provider.id),
                    isNull(schema.integrationConnections.accountId),
                ),
            )
            .returning({ id: schema.integrationConnections.id });
        if (!removed) return fail(404, { problem: "notFound" as const });
        await audit({
            action: "integration.receiver_remove",
            account,
            organizationId: access.organization.id,
            targetType: "integration",
            targetId: removed.id,
            ipAddress: locals.clientIp ?? null,
            details: { provider: provider.id },
        });
        return { receiverRemoved: true };
    },
};
