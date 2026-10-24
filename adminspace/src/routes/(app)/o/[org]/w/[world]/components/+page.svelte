<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { roomSyncProblem } from "$lib/catalog/manifest";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.catalog.world);
    const slug = $derived(data.organization.slug);
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);

    function stateOf(room: PageData["rooms"][number]): { label: string; tone: string } {
        if (room.compatibility !== "ready") return { label: w.compatibility[room.compatibility], tone: "" };
        if (room.syncState === "failed") return { label: w.state.failed, tone: "badge-danger" };
        if (room.syncState === "pending") return { label: w.state.pending, tone: "badge-warning" };
        if (room.linked) return { label: w.state.linked, tone: "badge-success" };
        return { label: w.state.notLinked, tone: "" };
    }
</script>

<PageHeader title={w.title} description={w.intro}>
    {#snippet actions()}
        <a class="btn btn-primary" href={resolve(`/o/${slug}/components`)}><Icon name="box" size={16} />{w.browse}</a>
    {/snippet}
</PageHeader>

<div aria-live="polite">
    {#if data.createdRoomId}
        <p class="notice notice-success mb-4"><Icon name="check" />{i18n.m.catalog.template.created}</p>
    {:else if form && "reconciled" in form}
        <p class="notice notice-success mb-4"><Icon name="refresh" />{w.retried}</p>
    {/if}
</div>
<FormMessage form={formMessage} />

<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <section class="card card-flush" aria-labelledby="installed-title">
        <div class="card-header"><h2 id="installed-title">{w.installed}</h2></div>
        {#if data.installed.length === 0}
            <EmptyState icon="box" title={w.none} compact>
                {#snippet actions()}
                    <a class="btn btn-sm" href={resolve(`/o/${slug}/components`)}>{w.browse}</a>
                {/snippet}
            </EmptyState>
        {:else}
            <ul class="divide-y divide-[var(--border)]">
                {#each data.installed as item (item.componentId)}
                    <li class="flex flex-wrap items-center gap-3 px-5 py-3">
                        <div class="min-w-0 flex-1">
                            <a class="font-medium" href={resolve(`/o/${slug}/components/${item.componentId}`)}
                                >{item.name}</a
                            >
                            <p class="muted text-xs">
                                {i18n.m.catalog.categories[item.category as keyof typeof i18n.m.catalog.categories] ??
                                    item.category}
                                · {item.version} · <DateTime value={item.installedAt} mode="date" />
                            </p>
                        </div>
                        {#if item.latestVersion && item.latestVersion !== item.version}
                            <span class="badge badge-accent">{i18n.t(w.update, { version: item.latestVersion })}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <section class="card card-flush" aria-labelledby="rooms-title">
        <div class="card-header">
            <div>
                <h2 id="rooms-title">{w.rooms}</h2>
                <p class="muted text-xs">{w.roomsIntro}</p>
            </div>
            {#if data.canInstall && data.installed.length > 0}
                <form method="POST" action="?/reconcile" use:enhance>
                    <button class="btn btn-sm" type="submit"><Icon name="refresh" size={14} />{w.retry}</button>
                </form>
            {/if}
        </div>
        <ul class="divide-y divide-[var(--border)]">
            {#each data.rooms as room (room.id)}
                {@const state = stateOf(room)}
                <li class="px-5 py-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <Icon name="door" class="text-[var(--text-muted)]" />
                        <span class="min-w-0 flex-1 truncate font-medium">{room.name}</span>
                        <span class="badge {state.tone}">{state.label}</span>
                    </div>
                    {#if room.syncError}
                        <p class="field-error ms-7 break-words">
                            {w.problems[roomSyncProblem(room.syncError) ?? "unexpected"]}
                        </p>
                    {/if}
                </li>
            {/each}
        </ul>
        {#if data.collectionUrl}
            <div class="card-footer !justify-start">
                <span class="section-title shrink-0">{w.collectionUrl}</span>
                <div class="min-w-0 flex-1"><CopyText value={data.collectionUrl} /></div>
            </div>
        {/if}
    </section>
</div>
