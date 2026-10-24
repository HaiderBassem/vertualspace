import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { messagesFor } from "$lib/i18n";
import { loadOrganization } from "$lib/server/context";
import { formValues, isUuid, optionalText, requiredText } from "$lib/server/http/forms";
import { organizationConnection } from "$lib/server/integrations/connections";
import { sendTestEvent } from "$lib/server/integrations/deliveries";
import {
    checkEndpointTarget,
    cleanEventTypes,
    createEndpoint,
    deleteEndpoint,
    endpointView,
    getEndpoint,
    listEndpoints,
    rotateSigningSecret,
    updateEndpoint,
} from "$lib/server/integrations/endpoints";
import { ORG_EVENT_TYPES } from "$lib/server/integrations/events";
import { ENDPOINT_KINDS, type EndpointKind } from "$lib/server/integrations/types";

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "integration.manage");
    const [endpoints, slack] = await Promise.all([
        listEndpoints(access.organization.id),
        organizationConnection(access.organization.id, "slack"),
    ]);
    const kind = url.searchParams.get("kind");
    return {
        endpoints: endpoints.map(endpointView),
        kinds: [...ENDPOINT_KINDS],
        eventTypes: [...ORG_EVENT_TYPES],
        slackConnected: slack?.status === "connected",
        preselectedKind: ENDPOINT_KINDS.find((k) => k === kind) ?? "webhook",
    };
};

const CreateForm = z.object({
    kind: z.enum(ENDPOINT_KINDS),
    name: requiredText(200),
    url: optionalText(2048),
    channel: optionalText(100),
});
const IdForm = z.object({ id: z.string().refine(isUuid) });
const UpdateForm = IdForm.extend({ name: requiredText(200) });
const ToggleForm = IdForm.extend({ enabled: z.enum(["true", "false"]) });

function auditEndpoint(
    action: string,
    context: { account: { id: string; email: string }; organizationId: string; ip: string | null },
    endpoint: { id: string; kind: EndpointKind; name: string },
    details: Record<string, unknown> = {},
) {
    return audit({
        action,
        account: context.account,
        organizationId: context.organizationId,
        targetType: "integrationEndpoint",
        targetId: endpoint.id,
        ipAddress: context.ip,
        details: { kind: endpoint.kind, name: endpoint.name, ...details },
    });
}

export const actions: Actions = {
    create: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const formData = await request.formData();
        const values = formValues(formData);
        const parsed = CreateForm.safeParse(values);
        // A webhook URL is a credential: it is never echoed back in the page.
        const safeValues = { kind: values.kind ?? "", name: values.name ?? "", channel: values.channel ?? "" };
        if (!parsed.success) {
            const errors = Object.fromEntries(
                parsed.error.issues.map((i) => [String(i.path[0]), "requiredField" as const]),
            );
            return fail(400, { op: "create", errors, values: safeValues, message: "validation" as const });
        }
        const eventTypes = cleanEventTypes(formData.getAll("events").map(String));
        if (eventTypes.length === 0) {
            return fail(400, {
                op: "create",
                errors: { events: "requiredField" as const },
                values: safeValues,
                message: "validation" as const,
            });
        }
        const target = await checkEndpointTarget(access.organization.id, parsed.data.kind, parsed.data);
        if (!target.ok) return fail(400, { op: "create", targetProblem: target.problem, values: safeValues });
        const { endpoint, signingSecret } = await createEndpoint({
            organizationId: access.organization.id,
            kind: parsed.data.kind,
            name: parsed.data.name,
            url: target.url,
            channel: target.channel,
            eventTypes,
            createdBy: account.id,
        });
        await auditEndpoint(
            "integration.endpoint_create",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
            { urlHint: endpoint.urlHint, channel: endpoint.channel, events: eventTypes },
        );
        // The signing secret is shown once: only its sealed form is stored.
        return { op: "create", created: { name: endpoint.name, signingSecret } };
    },

    update: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const formData = await request.formData();
        const parsed = UpdateForm.safeParse(formValues(formData));
        if (!parsed.success) return fail(400, { op: "update", message: "validation" as const });
        const eventTypes = cleanEventTypes(formData.getAll("events").map(String));
        if (eventTypes.length === 0) return fail(400, { op: "update", id: parsed.data.id, noEvent: true });
        const endpoint = await updateEndpoint(access.organization.id, parsed.data.id, {
            name: parsed.data.name,
            eventTypes,
        });
        if (!endpoint) return fail(404, { op: "update", message: "notFound" as const });
        await auditEndpoint(
            "integration.endpoint_update",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
            { events: eventTypes },
        );
        return { op: "update", saved: true };
    },

    toggle: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const parsed = ToggleForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { op: "toggle", message: "validation" as const });
        const enabled = parsed.data.enabled === "true";
        const endpoint = await updateEndpoint(access.organization.id, parsed.data.id, { enabled });
        if (!endpoint) return fail(404, { op: "toggle", message: "notFound" as const });
        await auditEndpoint(
            enabled ? "integration.endpoint_resume" : "integration.endpoint_pause",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
        );
        return { op: "toggle", enabled };
    },

    test: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const parsed = IdForm.safeParse(formValues(await request.formData()));
        const endpoint = parsed.success ? await getEndpoint(access.organization.id, parsed.data.id) : undefined;
        if (!endpoint) return fail(404, { op: "test", message: "notFound" as const });
        const outcome = await sendTestEvent(
            access.organization.id,
            endpoint,
            { name: account.name, email: account.email },
            messagesFor(locals.locale).integrationCenter.notifications.testMessage,
        );
        await auditEndpoint(
            "integration.endpoint_test",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
            { outcome: outcome.status, httpStatus: outcome.httpStatus, error: outcome.error },
        );
        return {
            op: "test",
            id: endpoint.id,
            test: { ok: outcome.status === "succeeded", httpStatus: outcome.httpStatus, error: outcome.error },
        };
    },

    rotate: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const parsed = IdForm.safeParse(formValues(await request.formData()));
        const endpoint = parsed.success ? await getEndpoint(access.organization.id, parsed.data.id) : undefined;
        const secret = endpoint ? await rotateSigningSecret(access.organization.id, endpoint.id) : undefined;
        if (!endpoint || !secret) return fail(404, { op: "rotate", message: "notFound" as const });
        await auditEndpoint(
            "integration.endpoint_rotate",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
        );
        return { op: "rotate", created: { name: endpoint.name, signingSecret: secret } };
    },

    remove: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const parsed = IdForm.safeParse(formValues(await request.formData()));
        const endpoint = parsed.success ? await deleteEndpoint(access.organization.id, parsed.data.id) : undefined;
        if (!endpoint) return fail(404, { op: "remove", message: "notFound" as const });
        await auditEndpoint(
            "integration.endpoint_delete",
            { account, organizationId: access.organization.id, ip: locals.clientIp ?? null },
            endpoint,
        );
        return { op: "remove", removed: true };
    },
};
