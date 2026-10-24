import type { PageServerLoad } from "./$types";
import { loadOrganization } from "$lib/server/context";
import { pageParam } from "$lib/server/http/forms";
import { listTeammates } from "$lib/server/services/directory";

const PAGE_SIZE = 48;

/** The organization's people, as everyone in it sees them (names and work emails, nothing administrative). */
export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access } = await loadOrganization(locals, params.org, "directory.read");
    const query = url.searchParams.get("q")?.trim().slice(0, 200) || undefined;
    const page = pageParam(url.searchParams.get("page"));
    const { people, total } = await listTeammates(access.organization.id, {
        query,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
    });
    return { people, total, page, pageSize: PAGE_SIZE, q: query ?? "" };
};
