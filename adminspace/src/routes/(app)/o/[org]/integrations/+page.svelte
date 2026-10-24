<script lang="ts">
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import Icon, { type IconName } from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import CenterTabs from "$lib/components/integrations/CenterTabs.svelte";
    import StatusBadge from "$lib/components/integrations/StatusBadge.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const org = $derived(page.params.org ?? "");

    const CATEGORY_ICONS: Record<PageData["categories"][number], IconName> = {
        calendars: "clock",
        chat: "mail",
        developer: "command",
        productivity: "layers",
        music: "play",
        automation: "refresh",
    };

    function scopeLabel(card: PageData["cards"][number]): string {
        if (card.organization && card.personal) return m.scope.both;
        return card.personal ? m.scope.personal : m.scope.organization;
    }
</script>

<PageHeader title={m.title} description={m.intro} />
<CenterTabs {org} active="catalog" />

{#each data.categories as category (category)}
    {@const cards = data.cards.filter((c) => c.category === category)}
    <section class="mb-10" aria-labelledby="category-{category}">
        <div class="mb-4 flex items-start gap-3">
            <span
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
            >
                <Icon name={CATEGORY_ICONS[category]} size={18} />
            </span>
            <div>
                <h2 id="category-{category}" class="text-lg font-bold">{m.categories[category].name}</h2>
                <p class="muted text-sm">{m.categories[category].description}</p>
            </div>
        </div>
        <ul class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {#each cards as card (card.id)}
                {@const provider = m.providers[card.id]}
                <li class="card flex flex-col gap-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <h3 class="text-base font-semibold">
                            <a href={resolve(`/o/${org}/integrations/${card.id}`)}>{provider.name}</a>
                        </h3>
                        <StatusBadge status={card.status} />
                    </div>
                    <p class="text-sm">{provider.description}</p>
                    <p class="muted text-sm">{provider.usedFor}</p>
                    <div class="mt-auto flex flex-wrap items-center gap-2 text-sm">
                        <span class="badge">{scopeLabel(card)}</span>
                        {#if card.personal && card.personal.missing.length === 0}
                            <span class="muted">{i18n.p(m.provider.personalCount, card.personalCount)}</span>
                        {/if}
                        {#if card.connection?.externalAccountName}
                            <span class="muted truncate" dir="auto">{card.connection.externalAccountName}</span>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    </section>
{/each}
