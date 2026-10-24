<script lang="ts">
    import type { ResolvedPathname } from "$app/types";
    import { resolve } from "$app/paths";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import AuditTable from "$lib/components/worlds/AuditTable.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.organizations.audit);
    const pages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
    const from = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
    const to = $derived(Math.min(data.total, data.page * data.pageSize));

    function pageHref(page: number): ResolvedPathname {
        const query = [
            ["action", data.action],
            ["page", page > 1 ? String(page) : ""],
        ]
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}=${encodeURIComponent(value ?? "")}`)
            .join("&");
        return query
            ? resolve(`/o/${data.organization.slug}/audit?${query}`)
            : resolve(`/o/${data.organization.slug}/audit`);
    }
</script>

<PageHeader title={a.title} description={a.intro} />

<form method="GET" class="mb-4 flex flex-wrap items-end gap-3" role="search">
    <div>
        <label class="label" for="audit-action">{a.filterAction}</label>
        <input
            id="audit-action"
            class="input font-mono"
            name="action"
            value={data.action}
            placeholder="world."
            dir="ltr"
        />
    </div>
    <button class="btn" type="submit">{i18n.m.common.actions.filter}</button>
    {#if data.action}<a class="btn btn-ghost" href={resolve(`/o/${data.organization.slug}/audit`)}
            >{i18n.m.common.actions.reset}</a
        >{/if}
</form>

{#if data.entries.length === 0}
    <p class="card muted">{a.empty}</p>
{:else}
    <AuditTable entries={data.entries} />
    <nav
        class="mt-4 flex flex-wrap items-center justify-between gap-3"
        aria-label={i18n.t(i18n.m.common.pagination.page, { page: data.page, pages })}
    >
        <p class="muted text-sm">{i18n.t(i18n.m.common.pagination.summary, { from, to, total: data.total })}</p>
        <div class="flex gap-2">
            {#if data.page > 1}
                <a class="btn btn-sm" href={pageHref(data.page - 1)} rel="prev">{i18n.m.common.actions.previous}</a>
            {/if}
            {#if data.page < pages}
                <a class="btn btn-sm" href={pageHref(data.page + 1)} rel="next">{i18n.m.common.actions.next}</a>
            {/if}
        </div>
    </nav>
{/if}
