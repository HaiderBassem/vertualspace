<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { resolve } from "$app/paths";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const r = $derived(i18n.m.office.ready);
    const ready = $derived(data.rooms.filter((room) => room.state === "ready").length);
    const settingUp = $derived(data.rooms.some((room) => room.state === "pending"));

    // While rooms are set up, look again every two seconds (for two minutes at most).
    $effect(() => {
        if (!settingUp) return;
        let polls = 0;
        const timer = setInterval(() => {
            polls += 1;
            if (polls > 60) clearInterval(timer);
            else void invalidateAll();
        }, 2_000);
        return () => clearInterval(timer);
    });

    const tone = (state: string) =>
        state === "ready" ? "badge-success" : state === "failed" ? "badge-danger" : "badge-warning";
</script>

<PageHeader title={settingUp ? r.preparing : r.title} description={settingUp ? r.preparingIntro : r.intro} />

<section class="card max-w-2xl space-y-5" aria-live="polite">
    <div class="flex flex-wrap gap-2">
        {#if data.officeUrl}
            <!-- eslint-disable svelte/no-navigation-without-resolve -- WorkAdventure URL, another site -->
            <a
                class="btn {settingUp ? '' : 'btn-primary'}"
                href={data.officeUrl}
                target="_blank"
                rel="external noopener noreferrer"
            >
                <Icon name="external" size={16} />{r.open}
            </a>
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/if}
        {#if data.canInvite}
            <a class="btn" href={resolve(`/o/${data.organization.slug}/team?invite=1`)}
                ><Icon name="users" size={16} />{r.invite}</a
            >
        {/if}
        {#if data.canManageRooms}
            <a class="btn btn-ghost" href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms`)}
                >{r.manageRooms}</a
            >
        {/if}
    </div>

    <div>
        <p class="text-sm font-medium">{i18n.t(r.progress, { ready, total: data.rooms.length })}</p>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden="true">
            <div
                class="h-full rounded-full bg-[var(--accent)] transition-all"
                style:width="{data.rooms.length ? (ready / data.rooms.length) * 100 : 0}%"
            ></div>
        </div>
    </div>

    <ul class="divide-y divide-[var(--border)]">
        {#each data.rooms as room (room.id)}
            <li class="flex items-center justify-between gap-3 py-2">
                <span class="flex items-center gap-2">
                    <Icon name="door" size={16} />
                    <span class="font-medium">{room.name}</span>
                    {#if room.isDefault}<span class="badge badge-accent">{i18n.m.rooms.defaultBadge}</span>{/if}
                </span>
                <span class="badge {tone(room.state)}">{r.states[room.state]}</span>
            </li>
        {/each}
    </ul>

    <p class="muted text-sm">
        {r.access}
        <a href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings`)}
            >{i18n.m.shell.nav.world.settings}</a
        >
    </p>
</section>
