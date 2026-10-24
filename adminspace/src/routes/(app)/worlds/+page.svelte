<script lang="ts">
    import { resolve } from "$app/paths";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.worlds);

    let search = $state("");
    let organization = $state("");

    const organizations = $derived([
        ...new Map(data.worlds.map((entry) => [entry.organization.slug, entry.organization])).values(),
    ]);

    const visible = $derived.by(() => {
        const needle = search.trim().toLocaleLowerCase(i18n.locale);
        return data.worlds.filter(
            (entry) =>
                (!organization || entry.organization.slug === organization) &&
                (!needle ||
                    [entry.world.name, entry.world.slug, entry.organization.name, entry.url ?? ""].some((value) =>
                        value.toLocaleLowerCase(i18n.locale).includes(needle),
                    )),
        );
    });

    const stateClass = (state: "open" | "archived" | "expired") =>
        state === "open" ? "badge-success" : state === "expired" ? "badge-warning" : "badge-danger";
</script>

<PageHeader title={w.title} description={w.intro}>
    {#snippet actions()}
        <a class="btn" href={resolve("/organizations")}>{i18n.m.organizations.title}</a>
    {/snippet}
</PageHeader>

{#if data.worlds.length === 0}
    <div class="card text-center">
        <p class="muted">{w.empty}</p>
        <a class="btn btn-primary mt-4" href={resolve("/organizations")}>{i18n.m.organizations.create}</a>
    </div>
{:else}
    <div class="mb-6 flex flex-wrap items-end gap-3" role="search">
        <div class="min-w-60 flex-1">
            <label class="label" for="world-search">{w.searchLabel}</label>
            <input
                id="world-search"
                class="input"
                type="search"
                placeholder={w.searchPlaceholder}
                bind:value={search}
            />
        </div>
        {#if organizations.length > 1}
            <div>
                <label class="label" for="world-organization">{w.organizationFilter}</label>
                <select id="world-organization" class="select" bind:value={organization}>
                    <option value="">{w.allOrganizations}</option>
                    {#each organizations as org (org.slug)}
                        <option value={org.slug}>{org.name}</option>
                    {/each}
                </select>
            </div>
        {/if}
    </div>

    <p class="muted mb-3 text-sm" aria-live="polite">{i18n.p(i18n.m.common.results, visible.length)}</p>

    {#if visible.length === 0}
        <p class="card muted">{i18n.m.common.noMatch}</p>
    {:else}
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {#each visible as entry (`${entry.organization.slug}/${entry.world.slug}`)}
                {@const href = resolve(`/o/${entry.organization.slug}/w/${entry.world.slug}`)}
                <li class="card flex flex-col gap-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="muted truncate text-xs font-semibold tracking-wide uppercase">
                                {entry.organization.name}
                            </p>
                            <h2 class="truncate text-lg font-bold">
                                <a {href} class="text-[var(--text)] no-underline hover:underline">{entry.world.name}</a>
                            </h2>
                        </div>
                        <span class="badge {stateClass(entry.world.state)}">{w.state[entry.world.state]}</span>
                    </div>
                    {#if entry.world.description}
                        <p class="muted line-clamp-2 text-sm">{entry.world.description}</p>
                    {/if}
                    <div class="flex flex-wrap gap-2 text-xs">
                        <span class="badge">{w.accessPolicy[entry.world.accessPolicy]}</span>
                        <span class="badge">{i18n.p(w.rooms, entry.roomCount)}</span>
                        <span class="badge">{i18n.p(w.members, entry.memberCount)}</span>
                    </div>
                    {#if entry.url}
                        <code class="muted truncate text-xs" dir="ltr">{entry.url}</code>
                    {/if}
                    <div class="mt-auto flex flex-wrap gap-2">
                        <a class="btn btn-sm btn-primary" {href}>{w.manage}</a>
                        {#if entry.url && entry.world.state === "open"}
                            <a class="btn btn-sm" href={entry.url} target="_blank" rel="external noopener noreferrer">
                                {i18n.m.common.actions.openInWorkAdventure}
                            </a>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
{/if}
