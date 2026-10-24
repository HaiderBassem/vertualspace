import { fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { CATEGORIES } from "$lib/catalog/manifest";
import { loadOrganization } from "$lib/server/context";
import { formValues, pageParam } from "$lib/server/http/forms";
import { catalogCategories, searchCatalog, setFavorite, type CatalogSort } from "$lib/server/catalog/store";

const PAGE_SIZE = 24;
const Category = z.enum(CATEGORIES);
const Kind = z.enum(["entity", "room_template"]);
const Sort = z.enum(["name", "newest", "popular"]);

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const { access, account } = await loadOrganization(locals, params.org, "component.read");
    const canManage = access.can("component.manage");
    const page = pageParam(url.searchParams.get("page"));
    const view = url.searchParams.get("view");
    const filters = {
        q: url.searchParams.get("q")?.trim().slice(0, 100) ?? "",
        category: Category.safeParse(url.searchParams.get("category")).data,
        kind: Kind.safeParse(url.searchParams.get("kind")).data,
        sort: (Sort.safeParse(url.searchParams.get("sort")).data ?? "name") as CatalogSort,
        view: view === "favorites" || view === "owned" ? view : "all",
    };
    const viewer = { organizationId: access.organization.id, accountId: account.id, locale: locals.locale, canManage };
    const [result, categories] = await Promise.all([
        searchCatalog(viewer, {
            query: filters.q || undefined,
            category: filters.category,
            kind: filters.kind,
            owned: filters.view === "owned",
            favoritesOf: filters.view === "favorites" ? account.id : undefined,
            sort: filters.sort,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
        }),
        catalogCategories(access.organization.id, canManage),
    ]);
    return {
        filters: { ...filters, category: filters.category ?? "", kind: filters.kind ?? "" },
        items: result.items,
        total: result.total,
        page,
        pageSize: PAGE_SIZE,
        categories: CATEGORIES.map((key) => ({ key, count: categories.find((c) => c.category === key)?.value ?? 0 })),
        canUpload: canManage,
    };
};

const FavoriteForm = z.object({ componentId: z.string().uuid(), favorite: z.enum(["true", "false"]) });

export const actions: Actions = {
    favorite: async ({ request, locals, params }) => {
        const { access, account } = await loadOrganization(locals, params.org, "component.read");
        const parsed = FavoriteForm.safeParse(formValues(await request.formData()));
        if (!parsed.success) return fail(400, { message: "validation" as const });
        const ok = await setFavorite(
            { organizationId: access.organization.id, accountId: account.id },
            parsed.data.componentId,
            parsed.data.favorite === "true",
        );
        if (!ok) return fail(404, { message: "notFound" as const });
        return { favorited: parsed.data.favorite === "true" };
    },
};
