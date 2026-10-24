<script lang="ts">
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import type { ResolvedPathname } from "$app/types";
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.audit);
    const pages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

    function pageHref(page: number): ResolvedPathname {
        const params = new SvelteURLSearchParams();
        if (data.filters.action) params.set("action", data.filters.action);
        if (data.filters.actor) params.set("actor", data.filters.actor);
        if (data.filters.organization) params.set("organization", data.filters.organization);
        params.set("page", String(page));
        return resolve(`/admin/audit?${params}`);
    }
</script>

<PageHeader title={m.title} description={m.intro} />

<form method="GET" class="card mb-6 grid gap-4 md:grid-cols-4 md:items-end">
    <div>
        <label class="label" for="filter-action">{m.filterAction}</label>
        <input class="input font-mono" id="filter-action" name="action" dir="ltr" value={data.filters.action} />
    </div>
    <div>
        <label class="label" for="filter-actor">{m.filterActor}</label>
        <input class="input" id="filter-actor" name="actor" value={data.filters.actor} />
    </div>
    <div>
        <label class="label" for="filter-organization">{m.organization}</label>
        <select class="select" id="filter-organization" name="organization">
            <option value="">{i18n.m.common.labels.all}</option>
            {#each data.organizations as organization (organization.id)}
                <option value={organization.id} selected={organization.id === data.filters.organization}
                    >{organization.name}</option
                >
            {/each}
        </select>
    </div>
    <div class="flex gap-2">
        <button class="btn btn-primary" type="submit">{i18n.m.common.actions.filter}</button>
        <a class="btn" href={resolve("/admin/audit")}>{i18n.m.common.actions.reset}</a>
    </div>
</form>

{#if data.entries.length === 0}
    <p class="muted">{m.empty}</p>
{:else}
    <div class="card relative overflow-x-auto p-0">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{m.when}</th>
                    <th scope="col">{m.actor}</th>
                    <th scope="col">{m.action}</th>
                    <th scope="col">{m.target}</th>
                    <th scope="col">{m.organization}</th>
                    <th scope="col">{m.ipAddress}</th>
                    <th scope="col">{m.details}</th>
                </tr>
            </thead>
            <tbody>
                {#each data.entries as entry (entry.id)}
                    <tr>
                        <td class="whitespace-nowrap"><DateTime value={entry.occurredAt} /></td>
                        <td class="break-all">{entry.actor}</td>
                        <td><code dir="ltr">{entry.action}</code></td>
                        <td class="break-all text-sm">{entry.target}</td>
                        <td>{entry.organizationName ?? ""}</td>
                        <td><code dir="ltr">{entry.ipAddress ?? ""}</code></td>
                        <td>
                            {#if entry.details}
                                <details>
                                    <summary class="cursor-pointer text-sm">{m.details}</summary>
                                    <pre class="mt-2 max-w-md overflow-x-auto text-xs" dir="ltr">{entry.details}</pre>
                                </details>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <nav class="mt-4 flex items-center justify-between gap-3" aria-label={m.title}>
        <span class="muted text-sm">{i18n.t(i18n.m.common.pagination.page, { page: data.page, pages })}</span>
        <div class="flex gap-2">
            {#if data.page > 1}<a class="btn btn-sm" href={pageHref(data.page - 1)}>{i18n.m.common.actions.previous}</a
                >{/if}
            {#if data.page < pages}<a class="btn btn-sm" href={pageHref(data.page + 1)}>{i18n.m.common.actions.next}</a
                >{/if}
        </div>
    </nav>
{/if}
