<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formErrors, formFeedback, formField, formValuesOf } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    interface Person {
        uuid: string;
        name: string;
        roomUrl: string;
        ipAddress?: string;
    }

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const l = $derived(i18n.m.live);
    const errors = $derived(formErrors(form));
    const values = $derived(formValuesOf(form));
    const broadcastFailed = $derived(formField<boolean>(form, "failed") === true);
    const roomNames = $derived(new Map(data.rooms.flatMap((r) => (r.url ? [[r.url, r.name] as const] : []))));

    let refreshing = $state(false);
    let status: "connecting" | "connected" | "disconnected" = $state("connecting");
    let people: Record<string, Person> = $state({});
    let connection = $state(0);
    const peopleList = $derived(Object.values(people).sort((a, b) => a.name.localeCompare(b.name, i18n.locale)));
    const showIp = $derived(peopleList.some((p) => p.ipAddress !== undefined));

    async function refresh() {
        refreshing = true;
        await invalidateAll();
        refreshing = false;
    }

    $effect(() => {
        if (!data.socketEnabled) return;
        void connection; // Reconnects when the "Reconnect" button bumps it.
        status = "connecting";
        people = {};
        const source = new EventSource(`/o/${data.organization.slug}/w/${data.world.slug}/live/stream`);
        const onReady = () => (status = "connected");
        const onJoin = (event: MessageEvent<string>) => {
            const person = JSON.parse(event.data) as Person;
            people[person.uuid] = person;
        };
        const onLeave = (event: MessageEvent<string>) => {
            const { uuid } = JSON.parse(event.data) as { uuid: string };
            delete people[uuid];
        };
        const onEnd = () => {
            status = "disconnected";
            source.close();
        };
        source.addEventListener("ready", onReady);
        source.addEventListener("join", onJoin);
        source.addEventListener("leave", onLeave);
        source.addEventListener("closed", onEnd);
        source.addEventListener("failure", onEnd);
        source.addEventListener("error", onEnd);
        return () => {
            source.removeEventListener("ready", onReady);
            source.removeEventListener("join", onJoin);
            source.removeEventListener("leave", onLeave);
            source.removeEventListener("closed", onEnd);
            source.removeEventListener("failure", onEnd);
            source.removeEventListener("error", onEnd);
            source.close();
        };
    });
</script>

<PageHeader title={l.title} description={l.description} />

{#if broadcastFailed}
    <p class="notice notice-danger mb-4" role="alert">{l.broadcast.failed}</p>
{:else}
    <FormMessage form={formFeedback(form)} successText={l.broadcast.sent} />
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section class="card space-y-4" aria-labelledby="live-occupancy">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 id="live-occupancy" class="text-lg font-bold">{l.perRoom}</h2>
            <button class="btn btn-sm" type="button" onclick={refresh} disabled={refreshing}>
                {i18n.m.common.actions.refresh}
            </button>
        </div>
        {#if data.total === null}
            <p class="notice text-sm">{l.unavailable}</p>
        {:else}
            <p class="text-2xl font-bold" aria-live="polite">{i18n.p(l.total, data.total)}</p>
            <ul class="divide-y divide-[var(--border)]">
                {#each data.rooms as room (room.id)}
                    <li class="flex items-center justify-between py-2">
                        <span>{room.name}</span>
                        <span class="badge {room.online ? 'badge-success' : ''}">{i18n.number(room.online ?? 0)}</span>
                    </li>
                {/each}
            </ul>
            <p class="muted text-xs">{i18n.t(l.updatedAt, { time: i18n.dateTime(data.checkedAt) })}</p>
        {/if}
    </section>

    {#if data.can["live.manage"]}
        {#key form}
            <form method="POST" action="?/broadcast" class="card space-y-4" use:enhance>
                <div>
                    <h2 class="text-lg font-bold">{l.broadcast.title}</h2>
                    <p class="muted mt-1 text-sm">{l.broadcast.intro}</p>
                </div>
                <Field label={l.broadcast.message} name="text" error={errors.text} required>
                    {#snippet children(a)}
                        <textarea class="textarea" {...a} name="text" rows="3" maxlength="1000"
                            >{values.text ?? ""}</textarea
                        >
                    {/snippet}
                </Field>
                <Field label={l.broadcast.target} name="roomId">
                    {#snippet children(a)}
                        <select class="select" {...a} name="roomId">
                            <option value="">{l.broadcast.allRooms}</option>
                            {#each data.rooms as room (room.id)}
                                <option value={room.id} selected={values.roomId === room.id}>{room.name}</option>
                            {/each}
                        </select>
                    {/snippet}
                </Field>
                <button class="btn btn-primary" type="submit">{l.broadcast.send}</button>
            </form>
        {/key}
    {/if}

    <section class="card space-y-4 lg:col-span-2" aria-labelledby="live-people">
        <h2 id="live-people" class="text-lg font-bold">{l.people.title}</h2>
        {#if !data.socketEnabled}
            <p class="muted text-sm">{l.people.notConfigured}</p>
        {:else}
            <div class="flex flex-wrap items-center gap-3" aria-live="polite">
                <span
                    class="badge {status === 'connected'
                        ? 'badge-success'
                        : status === 'disconnected'
                          ? 'badge-danger'
                          : ''}"
                >
                    {status === "connected"
                        ? l.people.connected
                        : status === "disconnected"
                          ? l.people.disconnected
                          : l.people.connecting}
                </span>
                {#if status === "disconnected"}
                    <button class="btn btn-sm" type="button" onclick={() => connection++}>{l.people.reconnect}</button>
                {/if}
            </div>
            {#if peopleList.length === 0}
                <p class="muted text-sm">{l.people.empty}</p>
            {:else}
                <div class="relative overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col">{l.people.columns.name}</th>
                                <th scope="col">{l.people.columns.room}</th>
                                {#if showIp}<th scope="col">{l.people.columns.ipAddress}</th>{/if}
                            </tr>
                        </thead>
                        <tbody>
                            {#each peopleList as person (person.uuid)}
                                <tr>
                                    <td>{person.name}</td>
                                    <td>{roomNames.get(person.roomUrl) ?? person.roomUrl}</td>
                                    {#if showIp}<td><code>{person.ipAddress ?? ""}</code></td>{/if}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        {/if}
    </section>
</div>
