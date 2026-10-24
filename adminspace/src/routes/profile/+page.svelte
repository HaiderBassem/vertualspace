<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.profile);
</script>

<svelte:head><title>{m.title}</title></svelte:head>

<main id="main" class="mx-auto max-w-xl space-y-4 p-6">
    <h1 class="text-xl font-bold">{m.title}</h1>
    {#if data.world}
        <p class="muted">{i18n.t(m.world, { world: `${data.world.name} (${data.world.organization})` })}</p>
    {/if}
    <p>{m.intro}</p>
    <p>{m.account}</p>
</main>
