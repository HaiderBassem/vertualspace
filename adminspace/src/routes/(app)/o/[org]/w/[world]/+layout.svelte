<script lang="ts">
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import Tabs from "$lib/components/Tabs.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { LayoutData } from "./$types";

    let { data, children }: { data: LayoutData; children: Snippet } = $props();
    const i18n = useI18n();
    const nav = $derived(i18n.m.shell.nav.world);

    const tabs = $derived(
        [
            { href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}`), label: nav.overview, show: true },
            { href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/live`), label: nav.live, show: true },
            { href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms`), label: nav.rooms, show: true },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/components`),
                label: i18n.m.catalog.world.title,
                show: true,
            },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members`),
                label: nav.members,
                show: data.can["member.read"],
            },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/tags`),
                label: nav.tags,
                show: data.can["member.read"],
            },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/moderation`),
                label: nav.moderation,
                show: data.can["member.read"],
            },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings`),
                label: nav.settings,
                show: data.can["world.update"],
            },
            {
                href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/activity`),
                label: nav.activity,
                show: data.can["audit.read"],
            },
        ].filter((t) => t.show),
    );

    const isOverview = $derived(page.route.id === "/(app)/o/[org]/w/[world]");

    const stateClass = $derived(
        data.world.state === "open"
            ? "badge-success"
            : data.world.state === "expired"
              ? "badge-warning"
              : "badge-danger",
    );
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 flex-wrap items-center gap-3">
        <!-- The overview's level-one heading is the world name; every other world page has its own <h1>
             (PageHeader), so there the name is context, not a heading. -->
        {#if isOverview}
            <h1 class="truncate text-xl font-bold">{data.world.name}</h1>
        {:else}
            <p class="truncate text-xl font-bold">{data.world.name}</p>
        {/if}
        <span class="badge {stateClass}">{i18n.m.worlds.state[data.world.state]}</span>
    </div>
    {#if data.worldUrl}
        <a class="btn btn-sm" href={data.worldUrl} target="_blank" rel="external noopener noreferrer">
            {i18n.m.common.actions.openInWorkAdventure}
        </a>
    {/if}
</div>

<Tabs items={tabs} label={data.world.name} />

{@render children()}
