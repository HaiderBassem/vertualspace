<script lang="ts">
    import { resolve } from "$app/paths";
    import { page as appPage } from "$app/state";
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import Avatar from "$lib/components/Avatar.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const d = $derived(i18n.m.home.directory);

    function pageHref(p: number): string {
        const params = new SvelteURLSearchParams(appPage.url.searchParams);
        params.set("page", String(p));
        return resolve(`/o/${data.organization.slug}/directory?${params.toString()}`);
    }
</script>

<PageHeader title={d.title} description={i18n.t(d.intro, { organization: data.organization.name })} />

<form method="GET" class="mb-5 flex flex-wrap items-center gap-3" role="search">
    <div class="relative min-w-64 flex-1">
        <label class="sr-only" for="directory-q">{d.search}</label>
        <span class="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-muted)]"
            ><Icon name="search" size={16} /></span
        >
        <input id="directory-q" class="input ps-9" type="search" name="q" placeholder={d.search} value={data.q} />
    </div>
    <p class="muted text-sm" aria-live="polite">{i18n.p(d.count, data.total)}</p>
</form>

{#if data.people.length === 0}
    <div class="card card-flush"><EmptyState icon="users" title={d.empty} /></div>
{:else}
    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.people as person (person.accountId)}
            <li class="card flex items-center gap-3 !p-4">
                <Avatar name={person.name} seed={person.accountId} size={40} />
                <div class="min-w-0">
                    <p class="truncate font-medium">{person.name}</p>
                    <a class="block truncate text-sm" href="mailto:{person.email}">{person.email}</a>
                    <p class="muted text-xs">{i18n.m.shell.roles[person.role]}</p>
                </div>
            </li>
        {/each}
    </ul>
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
{/if}
