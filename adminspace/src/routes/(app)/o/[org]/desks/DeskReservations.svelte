<!--
    The reservations of one desk: the list (going on, to come, over), cancelling one, removing those that are over, and
    reserving the desk for someone between two times typed in the administrator's time zone. A desk that belongs to
    someone cannot be reserved: the panel says so instead of offering a form that would be refused.
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ReservationPhase } from "$lib/desks/model";
    import {
        holderCount,
        isAbout,
        liveReservations,
        period,
        reservedFor,
        tracked,
        type DeskRow,
        type Feedback,
    } from "./ui";

    let {
        roomId,
        desk,
        timeZone,
        limits,
        feedback,
    }: {
        roomId: string;
        desk: DeskRow;
        timeZone: string;
        limits: { maxDays: number; maxAdvanceDays: number };
        feedback: Feedback | null;
    } = $props();

    const i18n = useI18n();
    const d = $derived(i18n.m.desks);
    const r = $derived(i18n.m.desks.reservations);
    const live = $derived(liveReservations(desk));
    const hasPast = $derived(desk.reservations.some((reservation) => reservation.phase === "past"));
    const held = $derived(holderCount(desk) > 0);
    const open = $derived(isAbout(feedback, roomId, desk.id, ["reserve", "cancelReservation", "clearPast"]));
    const ids = $derived(`reservation-${roomId}-${desk.id}`);
    const fields = $derived({ roomId, deskId: desk.id, deskName: desk.name });

    let adding = $state(false);
    let clearing = $state(false);

    const PHASE_BADGE: Record<ReservationPhase, string> = {
        active: "badge badge-warning",
        upcoming: "badge badge-accent",
        past: "badge",
    };
</script>

<details {open}>
    <summary class="cursor-pointer text-sm">
        {i18n.p(r.summary, live.length)}<span class="sr-only"> ({desk.name})</span>
    </summary>
    <div class="mt-2 flex flex-col gap-3">
        <p class="muted text-xs">{r.intro}</p>
        {#if desk.reservations.length === 0}
            <p class="muted text-sm">{r.empty}</p>
        {:else}
            <ul class="flex flex-col gap-2" aria-label={i18n.t(r.of, { desk: desk.name })}>
                {#each desk.reservations as reservation (reservation.id)}
                    {@const when = period(i18n, reservation.start, reservation.end)}
                    <li class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span class={PHASE_BADGE[reservation.phase]}>{r.phase[reservation.phase]}</span>
                        <span class="font-medium break-words">{reservedFor(reservation)}</span>
                        <span class="muted w-full text-xs">{when}</span>
                        {#if reservation.phase !== "past"}
                            <ConfirmForm
                                action="?/cancelReservation"
                                label={r.cancel}
                                title={i18n.t(r.cancelTitle, { person: reservedFor(reservation) })}
                                description={i18n.t(r.cancelBody, { desk: desk.name, period: when })}
                                fields={{ ...fields, reservationId: reservation.id }}
                                small
                            />
                        {/if}
                    </li>
                {/each}
            </ul>
            {#if hasPast}
                <form method="POST" action="?/clearPast" use:enhance={tracked((on) => (clearing = on))}>
                    <input type="hidden" name="roomId" value={roomId} />
                    <input type="hidden" name="deskId" value={desk.id} />
                    <input type="hidden" name="deskName" value={desk.name} />
                    <button type="submit" class="btn btn-sm btn-ghost" disabled={clearing} aria-busy={clearing}>
                        {clearing ? d.saving : r.clearPast}
                    </button>
                </form>
            {/if}
        {/if}

        {#if held}
            <p class="muted text-sm">{i18n.t(r.held, { desk: desk.name })}</p>
        {:else}
            <form
                method="POST"
                action="?/reserve"
                use:enhance={tracked((on) => (adding = on))}
                class="grid gap-2 sm:grid-cols-2"
            >
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="deskId" value={desk.id} />
                <input type="hidden" name="deskName" value={desk.name} />
                <div class="sm:col-span-2">
                    <label class="label" for="{ids}-person">{i18n.t(r.personLabel, { desk: desk.name })}</label>
                    <input
                        id="{ids}-person"
                        class="input"
                        type="email"
                        name="person"
                        list="desk-people"
                        placeholder={d.actions.assignPlaceholder}
                        autocomplete="off"
                        maxlength="320"
                        required
                    />
                </div>
                <div>
                    <label class="label" for="{ids}-start">{r.start}</label>
                    <input
                        id="{ids}-start"
                        class="input"
                        type="datetime-local"
                        name="start"
                        required
                        aria-describedby="{ids}-hint"
                    />
                </div>
                <div>
                    <label class="label" for="{ids}-end">{r.end}</label>
                    <input
                        id="{ids}-end"
                        class="input"
                        type="datetime-local"
                        name="end"
                        required
                        aria-describedby="{ids}-hint"
                    />
                </div>
                <p id="{ids}-hint" class="hint sm:col-span-2">
                    {i18n.t(r.zone, { timeZone })}
                    {i18n.t(r.limits, { days: limits.maxDays, advance: limits.maxAdvanceDays })}
                    {#if desk.disabled}{r.disabledNote}{/if}
                </p>
                <div class="sm:col-span-2">
                    <button type="submit" class="btn btn-sm btn-primary" disabled={adding} aria-busy={adding}>
                        {adding ? d.saving : r.add}
                    </button>
                </div>
            </form>
        {/if}
    </div>
</details>
