<script lang="ts">
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import { statusTone, type PresenceView } from "$lib/presence/model";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.presence);

    // The server's view first, then the polled ones (src/routes/(app)/o/[org]/presence/now).
    let fresh: PresenceView | undefined = $state();
    let failed = $state(false);
    const view = $derived(fresh ?? data.presence);

    $effect(() => {
        const url = resolve(`/o/${data.organization.slug}/presence/now`);
        let stopped = false;
        const refresh = async () => {
            if (document.hidden) return;
            try {
                const response = await fetch(url, { headers: { accept: "application/json" } });
                if (!response.ok) throw new Error(String(response.status));
                const next = (await response.json()) as PresenceView;
                if (!stopped) {
                    fresh = next;
                    failed = false;
                }
            } catch {
                if (!stopped) failed = true;
            }
        };
        const timer = setInterval(() => void refresh(), data.refreshMs);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    });

    const toneClass = {
        success: "dot-success",
        warning: "dot-warning",
        danger: "dot-danger",
        accent: "dot-accent",
        neutral: "dot-neutral",
    } as const;
</script>

<PageHeader title={m.title} description={m.intro} />

<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
    <p class="text-lg font-semibold">{i18n.p(m.online, view.counts.total)}</p>
    <p class="muted text-sm">
        {i18n.p(m.signedIn, view.counts.signedIn)} · {i18n.p(m.guests, view.counts.guests)}
    </p>
    <p class="muted text-sm">{m.updated} <DateTime value={view.checkedAt} mode="relative" /></p>
</div>
{#if failed}
    <p class="notice notice-warning mb-4" role="status">{m.refreshFailed}</p>
{/if}

{#if view.worlds.length === 0}
    <div class="card">
        <EmptyState icon="users" title={m.emptyTitle} description={m.emptyText} />
    </div>
{:else}
    <div class="space-y-6">
        {#each view.worlds as world (world.id)}
            <section class="card space-y-4" aria-labelledby="presence-world-{world.id}">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="presence-world-{world.id}" class="text-lg font-bold">
                        <a href={resolve(`/o/${data.organization.slug}/w/${world.slug}`)}>{world.name}</a>
                    </h2>
                    <span class="badge">{i18n.p(m.inWorld, world.count)}</span>
                </div>
                {#each world.rooms as room (room.id)}
                    <div>
                        <h3 class="mb-2 font-semibold">
                            {room.name}
                            <span class="muted text-sm font-normal">({i18n.p(m.inWorld, room.people.length)})</span>
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="table">
                                <caption class="sr-only">{i18n.t(m.roomLabel, { room: room.name })}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">{m.columns.person}</th>
                                        <th scope="col">{m.columns.status}</th>
                                        <th scope="col">{m.columns.since}</th>
                                        <th scope="col">{m.columns.account}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each room.people as person (person.userIdentifier)}
                                        <tr>
                                            <td class="max-w-xs">
                                                <span class="font-semibold">{person.name}</span>
                                                <span class="badge ms-1 {person.isLogged ? 'badge-accent' : ''}"
                                                    >{person.isLogged ? m.signedInBadge : m.guestBadge}</span
                                                >
                                                {#if person.account}
                                                    <span class="muted block truncate text-xs"
                                                        >{person.account.name} · {person.account.email}</span
                                                    >
                                                {/if}
                                            </td>
                                            <td>
                                                <span class="inline-flex items-center gap-2">
                                                    <span
                                                        class="dot {toneClass[statusTone(person.status)]}"
                                                        aria-hidden="true"
                                                    ></span>
                                                    {m.statuses[person.status]}
                                                </span>
                                            </td>
                                            <td><DateTime value={person.connectedAt} mode="relative" /></td>
                                            <td>
                                                {#if person.memberId}
                                                    <a
                                                        href={resolve(
                                                            `/o/${data.organization.slug}/w/${world.slug}/members/${person.memberId}`,
                                                        )}>{m.memberPage}</a
                                                    >
                                                {:else}
                                                    <span class="muted text-sm">{m.notAMember}</span>
                                                {/if}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/each}
            </section>
        {/each}
    </div>
{/if}

<p class="muted mt-6 text-sm">{m.privacy}</p>

<style>
    .dot {
        display: inline-block;
        width: 0.625rem;
        height: 0.625rem;
        border-radius: 9999px;
        flex-shrink: 0;
    }
    .dot-success {
        background: var(--success);
    }
    .dot-warning {
        background: var(--warning);
    }
    .dot-danger {
        background: var(--danger);
    }
    .dot-accent {
        background: var(--accent);
    }
    .dot-neutral {
        background: var(--text-muted);
    }
</style>
