<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page as appPage } from "$app/state";
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const c = $derived(i18n.m.catalog);
    const slug = $derived(data.organization.slug);

    /** The current filters with some values changed, as a catalog URL. */
    function withParams(changes: Record<string, string>): string {
        const params = new SvelteURLSearchParams(appPage.url.searchParams);
        params.delete("page");
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        return resolve(`/o/${slug}/components?${params.toString()}`);
    }

    function pageHref(p: number): string {
        const params = new SvelteURLSearchParams(appPage.url.searchParams);
        params.set("page", String(p));
        return resolve(`/o/${slug}/components?${params.toString()}`);
    }

    const views = $derived([
        { key: "all", label: c.all, icon: "grid" as const },
        { key: "favorites", label: c.favorites, icon: "star" as const },
        { key: "owned", label: c.owned, icon: "building" as const },
    ]);
</script>

<PageHeader title={c.title} description={c.intro}>
    {#snippet actions()}
        {#if data.canUpload}
            <a class="btn btn-primary" href={resolve(`/o/${slug}/components/upload`)}>
                <Icon name="upload" size={16} />{c.upload}
            </a>
        {/if}
    {/snippet}
</PageHeader>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_1fr]">
    <nav aria-label={c.categoriesLabel} class="lg:sticky lg:top-20 lg:self-start">
        <ul class="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            <li>
                <!-- eslint-disable svelte/no-navigation-without-resolve -- withParams() returns a resolved path -->
                <a
                    href={withParams({ category: "" })}
                    aria-current={data.filters.category === "" ? "page" : undefined}
                    class="category-link"
                >
                    <span>{c.all}</span>
                </a>
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
            </li>
            {#each data.categories.filter((cat) => cat.count > 0) as category (category.key)}
                <li>
                    <!-- eslint-disable svelte/no-navigation-without-resolve -- withParams() returns a resolved path -->
                    <a
                        href={withParams({ category: category.key })}
                        aria-current={data.filters.category === category.key ? "page" : undefined}
                        class="category-link"
                    >
                        <span class="truncate">{c.categories[category.key]}</span>
                        <span class="muted text-xs tabular-nums">{category.count}</span>
                    </a>
                    <!-- eslint-enable svelte/no-navigation-without-resolve -->
                </li>
            {/each}
        </ul>
    </nav>

    <div class="min-w-0">
        <form method="GET" class="mb-4 flex flex-wrap items-center gap-2" role="search">
            {#if data.filters.category}<input type="hidden" name="category" value={data.filters.category} />{/if}
            {#if data.filters.view !== "all"}<input type="hidden" name="view" value={data.filters.view} />{/if}
            <div class="relative min-w-56 flex-1">
                <label class="sr-only" for="catalog-q">{c.search}</label>
                <span class="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-muted)]"
                    ><Icon name="search" size={16} /></span
                >
                <input
                    id="catalog-q"
                    class="input ps-9"
                    type="search"
                    name="q"
                    placeholder={c.search}
                    value={data.filters.q}
                />
            </div>
            <label class="sr-only" for="catalog-kind">{c.kinds.all}</label>
            <select id="catalog-kind" class="select !w-auto" name="kind" value={data.filters.kind}>
                <option value="">{c.kinds.all}</option>
                <option value="entity">{c.kinds.entity}</option>
                <option value="room_template">{c.kinds.room_template}</option>
            </select>
            <label class="sr-only" for="catalog-sort">{c.sort.label}</label>
            <select id="catalog-sort" class="select !w-auto" name="sort" value={data.filters.sort}>
                <option value="name">{c.sort.name}</option>
                <option value="newest">{c.sort.newest}</option>
                <option value="popular">{c.sort.popular}</option>
            </select>
            <button class="btn" type="submit"><Icon name="filter" size={16} />{i18n.m.team.filters.apply}</button>
        </form>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <nav class="segmented" aria-label={c.title}>
                {#each views as view (view.key)}
                    <!-- eslint-disable svelte/no-navigation-without-resolve -- withParams() returns a resolved path -->
                    <a
                        href={withParams({ view: view.key === "all" ? "" : view.key })}
                        aria-current={data.filters.view === view.key ? "page" : undefined}
                    >
                        <Icon name={view.icon} size={14} />{view.label}
                    </a>
                    <!-- eslint-enable svelte/no-navigation-without-resolve -->
                {/each}
            </nav>
            <p class="muted text-sm" aria-live="polite">{i18n.p(c.count, data.total)}</p>
        </div>

        {#if data.items.length === 0}
            <div class="card card-flush"><EmptyState icon="box" title={c.empty} /></div>
        {:else}
            <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {#each data.items as item (item.id)}
                    <li class="card card-interactive relative flex flex-col !p-0">
                        <a
                            href={resolve(`/o/${slug}/components/${item.id}`)}
                            class="flex flex-1 flex-col text-[var(--text)] no-underline"
                        >
                            <div
                                class="preview flex h-40 items-center justify-center rounded-t-[var(--radius-lg)] border-b border-[var(--border)]"
                            >
                                {#if item.previewUrl}
                                    <img
                                        src={item.previewUrl}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        class="max-h-32 max-w-[85%] object-contain [image-rendering:pixelated]"
                                    />
                                {:else}
                                    <Icon name="box" size={28} class="text-[var(--text-muted)]" />
                                {/if}
                            </div>
                            <div class="flex flex-1 flex-col gap-1.5 p-4">
                                <p class="font-semibold">{item.name}</p>
                                {#if item.description}
                                    <p class="muted line-clamp-2 text-sm">{item.description}</p>
                                {/if}
                                <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                                    <span class="chip"
                                        >{c.categories[item.category as keyof typeof c.categories] ??
                                            item.category}</span
                                    >
                                    {#if item.kind === "entity"}<span class="chip"
                                            >{i18n.p(c.variants, item.variantCount)}</span
                                        >{/if}
                                    {#if item.owned}<span class="badge badge-accent">{c.owned}</span>{/if}
                                    {#if item.status === "deprecated"}<span class="badge badge-warning"
                                            >{i18n.m.catalog.admin.status.deprecated}</span
                                        >{/if}
                                    {#if item.installedWorlds > 0}
                                        <span class="badge badge-success"
                                            >{i18n.p(c.installedIn, item.installedWorlds)}</span
                                        >
                                    {/if}
                                </div>
                            </div>
                        </a>
                        <form method="POST" action="?/favorite" class="absolute end-2 top-2" use:enhance>
                            <input type="hidden" name="componentId" value={item.id} />
                            <input type="hidden" name="favorite" value={item.favorite ? "false" : "true"} />
                            <button
                                class="btn btn-icon btn-sm {item.favorite ? 'text-[var(--warning)]' : ''}"
                                type="submit"
                                aria-pressed={item.favorite}
                            >
                                <Icon name="star" size={15} label={item.favorite ? c.unfavorite : c.favorite} />
                            </button>
                        </form>
                    </li>
                {/each}
            </ul>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
        {/if}
    </div>
</div>

<style>
    .preview {
        background: repeating-conic-gradient(var(--surface-sunken) 0% 25%, var(--surface-muted) 0% 50%) 0 0 / 16px 16px;
    }
    .category-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.4375rem 0.625rem;
        border-radius: var(--radius);
        font-size: 0.875rem;
        color: var(--text-muted);
        text-decoration: none;
        white-space: nowrap;
    }
    .category-link:hover {
        background: var(--surface-hover);
        color: var(--text);
    }
    .category-link[aria-current="page"] {
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
    }
</style>
