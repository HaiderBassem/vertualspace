<!-- Previous / next navigation for a paginated list. Renders nothing when everything fits on one page. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";

    let {
        page,
        pageSize,
        total,
        href,
    }: { page: number; pageSize: number; total: number; href: (page: number) => string } = $props();

    const i18n = useI18n();
    const pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
</script>

{#if pages > 1}
    <nav
        class="mt-4 flex flex-wrap items-center justify-between gap-3"
        aria-label={i18n.t(i18n.m.common.pagination.page, { page, pages })}
    >
        <span class="muted text-sm">
            {i18n.t(i18n.m.common.pagination.summary, {
                from: Math.min(total, (page - 1) * pageSize + 1),
                to: Math.min(total, page * pageSize),
                total,
            })}
        </span>
        <div class="flex gap-2">
            {#if page > 1}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href() returns a resolved path -->
                <a class="btn btn-sm" rel="prev" href={href(page - 1)}>{i18n.m.common.actions.previous}</a>
            {/if}
            {#if page < pages}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href() returns a resolved path -->
                <a class="btn btn-sm" rel="next" href={href(page + 1)}>{i18n.m.common.actions.next}</a>
            {/if}
        </div>
    </nav>
{/if}
