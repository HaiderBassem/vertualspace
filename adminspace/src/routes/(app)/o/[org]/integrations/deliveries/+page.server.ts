import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { audit } from "$lib/server/audit";
import { loadOrganization } from "$lib/server/context";
import { isUuid, pageParam } from "$lib/server/http/forms";
import { DELIVERY_PAGE_SIZE, listDeliveries, retryDelivery } from "$lib/server/integrations/deliveries";
import { listEndpoints } from "$lib/server/integrations/endpoints";
import { ORG_EVENT_TYPES } from "$lib/server/integrations/events";

const STATUSES = ["pending", "succeeded", "failed"] as const;

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "integration.manage");
    const status = STATUSES.find((s) => s === url.searchParams.get("status"));
    const endpointId = url.searchParams.get("endpoint") ?? "";
    const eventType = [...ORG_EVENT_TYPES, "integration.test"].find((t) => t === url.searchParams.get("event"));
    const page = pageParam(url.searchParams.get("page"));
    const [log, endpoints] = await Promise.all([
        listDeliveries(access.organization.id, {
            status,
            endpointId: isUuid(endpointId) ? endpointId : undefined,
            eventType,
            page,
        }),
        listEndpoints(access.organization.id),
    ]);
    return {
        ...log,
        page,
        pageSize: DELIVERY_PAGE_SIZE,
        filter: { status: status ?? "", endpoint: isUuid(endpointId) ? endpointId : "", event: eventType ?? "" },
        statuses: [...STATUSES],
        eventTypes: [...ORG_EVENT_TYPES, "integration.test"],
        endpoints: endpoints.map((e) => ({ id: e.id, name: e.name })),
    };
};

export const actions: Actions = {
    retry: async ({ locals, params, request }) => {
        const { account, access } = await loadOrganization(locals, params.org, "integration.manage");
        const id = String((await request.formData()).get("id") ?? "");
        const outcome = await retryDelivery(access.organization.id, id);
        if (outcome === "notFound") return fail(404, { retryProblem: outcome });
        if (outcome !== "ok") return fail(400, { retryProblem: outcome });
        await audit({
            action: "integration.delivery_retry",
            account,
            organizationId: access.organization.id,
            targetType: "integrationDelivery",
            targetId: id,
            ipAddress: locals.clientIp ?? null,
        });
        return { retried: true };
    },
};
