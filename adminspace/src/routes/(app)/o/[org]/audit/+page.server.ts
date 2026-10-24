import type { PageServerLoad } from "./$types";
import { loadOrganization } from "$lib/server/context";
import { listAuditEntries } from "$lib/server/services/organizations";

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "audit.read");
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const action = (url.searchParams.get("action") ?? "").trim().slice(0, 100);
    const { entries, total } = await listAuditEntries({
        organizationId: access.organization.id,
        actionPrefix: action || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
    });
    return { entries, total, page, pageSize: PAGE_SIZE, action };
};
