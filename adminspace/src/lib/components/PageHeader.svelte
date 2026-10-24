<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        title,
        description = undefined,
        actions = undefined,
    }: { title: string; description?: string | undefined; actions?: Snippet | undefined } = $props();
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight">{title}</h1>
        {#if description}<p class="muted mt-1 max-w-3xl">{description}</p>{/if}
    </div>
    {#if actions}
        <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
    {/if}
</header>
