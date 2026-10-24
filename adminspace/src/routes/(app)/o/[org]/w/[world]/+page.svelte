<script lang="ts">
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import AuditTable from "$lib/components/worlds/AuditTable.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const o = $derived(i18n.m.worlds.overview);

    const stats = $derived([
        {
            label: o.rooms,
            value: data.stats.rooms,
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms`),
        },
        {
            label: o.members,
            value: data.stats.members,
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members`),
        },
        {
            label: o.guests,
            value: data.stats.guests,
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members`),
        },
        {
            label: o.openReports,
            value: data.stats.openReports,
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/moderation`),
        },
    ]);

    function roomLabel(url: string): string {
        return data.worldUrl && url.startsWith(data.worldUrl)
            ? decodeURIComponent(url.slice(data.worldUrl.length))
            : url;
    }
</script>

<svelte:head><title>{data.world.name} · {i18n.m.shell.nav.world.overview}</title></svelte:head>

<div class="space-y-6">
    <section class="card space-y-3" aria-labelledby="world-address">
        <h2 id="world-address" class="font-bold">{o.address}</h2>
        {#if data.worldUrl}
            <CopyText value={data.worldUrl} />
            <p class="hint">{o.addressHint}</p>
        {:else}
            <p class="muted text-sm">{o.addressMissing}</p>
        {/if}
        <dl class="grid gap-3 pt-2 text-sm sm:grid-cols-3">
            <div>
                <dt class="muted">{i18n.m.worlds.accessPolicy.label}</dt>
                <dd class="font-semibold">{i18n.m.worlds.accessPolicy[data.world.accessPolicy]}</dd>
            </div>
            <div>
                <dt class="muted">{o.maxUsers}</dt>
                <dd class="font-semibold">
                    {data.world.maxUsers > 0 ? i18n.number(data.world.maxUsers) : i18n.m.common.labels.unlimited}
                </dd>
            </div>
            <div>
                <dt class="muted">{o.expires}</dt>
                <dd class="font-semibold"><DateTime value={data.world.expiresAt} /></dd>
            </div>
        </dl>
    </section>

    <ul class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <li class="card">
            <p class="muted text-sm">{o.online}</p>
            <p class="mt-1 text-3xl font-bold">{data.live.reachable ? i18n.number(data.live.total) : "—"}</p>
        </li>
        {#each stats as stat (stat.label)}
            <li class="card">
                <a href={stat.href} class="block text-[var(--text)] no-underline">
                    <p class="muted text-sm">{stat.label}</p>
                    <p class="mt-1 text-3xl font-bold">{i18n.number(stat.value)}</p>
                </a>
            </li>
        {/each}
    </ul>

    {#if !data.live.reachable && data.worldUrl}
        <p class="notice" role="status">{o.unreachable}</p>
    {:else if data.live.rooms.length > 0}
        <section class="card" aria-labelledby="rooms-online">
            <h2 id="rooms-online" class="mb-3 font-bold">{o.roomsOnline}</h2>
            <ul class="divide-y divide-[var(--border)]">
                {#each data.live.rooms as room (room.url)}
                    <li class="flex items-center justify-between gap-3 py-2 text-sm">
                        <code dir="ltr" class="truncate">{roomLabel(room.url)}</code>
                        <span class="badge badge-accent">{i18n.number(room.people)}</span>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    {#if data.can["audit.read"]}
        <section aria-labelledby="recent-activity" class="space-y-3">
            <div class="flex items-center justify-between">
                <h2 id="recent-activity" class="font-bold">{o.recentActivity}</h2>
                <a class="text-sm" href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/activity`)}
                    >{i18n.m.shell.nav.world.activity}</a
                >
            </div>
            {#if data.recent.length === 0}
                <p class="card muted">{o.noActivity}</p>
            {:else}
                <AuditTable entries={data.recent} compact />
            {/if}
        </section>
    {/if}
</div>
