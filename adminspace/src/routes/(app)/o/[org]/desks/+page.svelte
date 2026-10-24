<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { navigating, page } from "$app/state";
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import { useI18n } from "$lib/i18n/context";
    import { DESK_STATUSES, DESK_TYPES } from "$lib/desks/model";
    import DeskReservations from "./DeskReservations.svelte";
    import DeskSettings from "./DeskSettings.svelte";
    import FloorPlan from "./FloorPlan.svelte";
    import {
        STATUS_BADGE,
        feedbackMessage,
        holderCount,
        liveReservations,
        ownerName,
        personName,
        reservedFor,
        tracked,
        type DeskRow,
        type Feedback,
        type RoomView,
    } from "./ui";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const d = $derived(i18n.m.desks);
    const slug = $derived(data.organization.slug);

    const feedback = $derived((form ?? null) as Feedback | null);
    const message = $derived(feedbackMessage(feedback, i18n));
    /** The filters are being applied: the page is loading the desks again. */
    const loading = $derived(navigating.to !== null && navigating.to?.url.pathname === page.url.pathname);

    /** Which forms are being sent, by key: their buttons say so and cannot be pressed twice. */
    let busy = $state<Record<string, boolean>>({});
    const track = (key: string) => tracked((on) => (busy[key] = on));

    const rowId = (view: RoomView, desk: DeskRow) => `desk-${view.room.id}-${desk.id}`;

    function href(changes: Record<string, string | null>): string {
        const params = new SvelteURLSearchParams();
        if (data.scope) params.set("workspace", data.scope.slug);
        if (data.filters.q) params.set("q", data.filters.q);
        if (data.filters.status) params.set("status", data.filters.status);
        if (data.filters.type) params.set("type", data.filters.type);
        if (data.filters.roomId) params.set("room", data.filters.roomId);
        for (const [key, value] of Object.entries(changes)) {
            if (value === null) params.delete(key);
            else params.set(key, value);
        }
        const query = params.toString();
        return resolve(`/o/${slug}/desks${query ? `?${query}` : ""}`);
    }

    const filtering = $derived(
        Boolean(data.filters.q || data.filters.status || data.filters.type || data.filters.roomId),
    );
    const shownDesks = $derived(data.rooms.reduce((total, view) => total + view.desks.length, 0));

    function problemText(problem: string): string {
        return (d.problems as Record<string, string>)[problem] ?? d.problems.invalid;
    }

    /** The fields of the form that adds desks: name of the field, label, first value, smallest, largest. */
    const gridFields = $derived([
        ["columns", d.create.columns, 3, 1, 100],
        ["rows", d.create.rows, 2, 1, 100],
        ["deskWidth", d.create.width, 2, 1, 20],
        ["deskHeight", d.create.height, 2, 1, 20],
        ["gapX", d.create.gapX, 1, 0, 20],
        ["gapY", d.create.gapY, 1, 0, 20],
        ["originX", d.create.originX, 1, 0, 10000],
        ["originY", d.create.originY, 1, 0, 10000],
        ["startNumber", d.create.start, 1, 0, 100000],
    ] as const);

    /** Whether the answer of the last action is about this desk: it is repeated next to it. */
    const aboutDesk = (view: RoomView, desk: DeskRow) =>
        !!message && feedback?.roomId === view.room.id && feedback?.deskId === desk.id;
</script>

<PageHeader title={d.title} description={d.intro} />

<div aria-live="polite" class="empty:hidden">
    {#if loading}
        <p class="notice notice-info mb-4" aria-busy="true">{d.loading}</p>
    {:else if message}
        <p
            class="notice mb-4 {message.tone === 'danger' ? 'notice-danger' : 'notice-success'}"
            role={message.tone === "danger" ? "alert" : "status"}
        >
            {message.text}
        </p>
    {/if}
</div>

<ul class="mb-5 flex flex-wrap items-center gap-2" aria-label={i18n.p(d.total, data.totals.total)}>
    <li><span class="badge">{i18n.p(d.total, data.totals.total)}</span></li>
    {#each DESK_STATUSES as status (status)}
        {#if data.totals[status] > 0 || data.filters.status === status}
            <li>
                <!-- eslint-disable svelte/no-navigation-without-resolve -- href() returns a resolved path -->
                <a
                    class="{STATUS_BADGE[status]} no-underline"
                    href={href({ status: data.filters.status === status ? null : status })}
                    aria-current={data.filters.status === status ? "true" : undefined}
                    title={d.statusHint[status]}
                >
                    {i18n.t(d.statusCount, { status: d.status[status], count: data.totals[status] })}
                </a>
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
            </li>
        {/if}
    {/each}
    {#if data.upcoming > 0}
        <li><span class="badge"><Icon name="clock" size={14} />{i18n.p(d.upcoming, data.upcoming)}</span></li>
    {/if}
</ul>

<form method="GET" class="mb-5 flex flex-wrap items-end gap-3" role="search">
    <div class="min-w-56 flex-1">
        <label class="label" for="desks-q">{d.filters.search}</label>
        <input id="desks-q" class="input" type="search" name="q" value={data.filters.q} />
    </div>
    <div>
        <label class="label" for="desks-status">{d.filters.status}</label>
        <select id="desks-status" class="input" name="status">
            <option value="" selected={!data.filters.status}>{d.filters.allStatuses}</option>
            {#each DESK_STATUSES as status (status)}
                <option value={status} selected={data.filters.status === status}>{d.status[status]}</option>
            {/each}
        </select>
    </div>
    <div>
        <label class="label" for="desks-type">{d.filters.type}</label>
        <select id="desks-type" class="input" name="type">
            <option value="" selected={!data.filters.type}>{d.filters.allTypes}</option>
            {#each DESK_TYPES as type (type)}
                <option value={type} selected={data.filters.type === type}>{d.type[type]}</option>
            {/each}
        </select>
    </div>
    <div>
        <label class="label" for="desks-room">{d.filters.room}</label>
        <select id="desks-room" class="input" name="room">
            <option value="" selected={!data.filters.roomId}>{d.filters.allRooms}</option>
            {#each data.roomOptions as option (option.id)}
                <option value={option.id} selected={data.filters.roomId === option.id}>{option.name}</option>
            {/each}
        </select>
    </div>
    {#if data.scopes.length > 1}
        <div>
            <label class="label" for="desks-workspace">{d.scope.label}</label>
            <select id="desks-workspace" class="input" name="workspace">
                <option value="" selected={!data.scope}>{d.scope.all}</option>
                {#each data.scopes as scope (scope.slug)}
                    <option value={scope.slug} selected={data.scope?.slug === scope.slug}>{scope.name}</option>
                {/each}
            </select>
        </div>
    {/if}
    <button type="submit" class="btn btn-primary" disabled={loading} aria-busy={loading}>
        <Icon name="search" size={16} />{d.filters.apply}
    </button>
    {#if filtering}
        <a class="btn btn-ghost" href={resolve(`/o/${slug}/desks`)}>{d.filters.clear}</a>
    {/if}
    <p class="muted w-full text-sm" aria-live="polite">{i18n.p(d.shown, shownDesks)}</p>
</form>

{#if data.truncated}
    <p class="notice mb-4">{i18n.t(d.truncated, { count: data.maxRooms })}</p>
{/if}

<datalist id="desk-people">
    {#each data.people as person (person.value)}
        <option value={person.value}>{person.label}</option>
    {/each}
</datalist>

{#if data.rooms.length === 0}
    <div class="card card-flush">
        <EmptyState
            icon="grid"
            title={filtering ? d.empty.noResults : d.empty.noRooms}
            description={filtering ? undefined : d.empty.noRoomsHint}
        />
    </div>
{/if}

{#each data.rooms as view (view.room.id)}
    <section class="card mb-6" aria-labelledby="room-{view.room.id}">
        <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
                <h2 id="room-{view.room.id}" class="text-lg font-semibold">{view.room.name}</h2>
                <p class="muted text-sm">
                    {i18n.t(d.inWorkspace, { workspace: view.workspace.name, world: view.world.name })}
                </p>
            </div>
            {#if !view.problem && view.counts.total > 0}
                <ul class="flex flex-wrap gap-2" aria-label={i18n.p(d.total, view.counts.total)}>
                    {#each DESK_STATUSES as status (status)}
                        {#if view.counts[status] > 0}
                            <li>
                                <span class={STATUS_BADGE[status]}>
                                    {i18n.t(d.statusCount, { status: d.status[status], count: view.counts[status] })}
                                </span>
                            </li>
                        {/if}
                    {/each}
                    {#if view.upcoming > 0}
                        <li><span class="badge">{i18n.p(d.upcoming, view.upcoming)}</span></li>
                    {/if}
                </ul>
            {/if}
        </header>

        {#if view.problem}
            <p class="notice">{problemText(view.problem)}</p>
        {:else}
            {#if view.desks.length > 0}
                <FloorPlan {view} rowId={(desk) => rowId(view, desk)} />

                <TableScroll label={i18n.t(d.table.caption, { room: view.room.name })}>
                    <table class="table table-dense">
                        <caption class="sr-only">{i18n.t(d.table.caption, { room: view.room.name })}</caption>
                        <thead>
                            <tr>
                                <th scope="col">{d.table.desk}</th>
                                <th scope="col">{d.table.status}</th>
                                <th scope="col">{d.table.person}</th>
                                <th scope="col">{d.table.reservations}</th>
                                <th scope="col">{d.table.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each view.desks as desk (desk.id)}
                                {@const live = liveReservations(desk)}
                                {@const current = live.find((reservation) => reservation.phase === "active")}
                                {@const next = live.find((reservation) => reservation.phase === "upcoming")}
                                {@const more = live.length - (current ? 1 : 0) - (next ? 1 : 0)}
                                {@const held = holderCount(desk) > 0}
                                {@const key = `${view.room.id}-${desk.id}`}
                                <tr
                                    id={rowId(view, desk)}
                                    class="scroll-mt-24 target:bg-[var(--accent-soft)] *:!align-top"
                                >
                                    <th
                                        scope="row"
                                        class="max-w-64 min-w-40 !bg-transparent !text-sm !font-medium !tracking-normal !whitespace-normal !text-[var(--text)] !normal-case"
                                    >
                                        {desk.name}
                                        <span class="muted block text-xs font-normal">
                                            {d.type[desk.deskType]}
                                            {#if desk.deskType === "assigned"}
                                                · {desk.claimMode === "dynamic" ? d.table.dynamic : d.table.static}
                                            {/if}
                                            {#if desk.allowedTags.length > 0}
                                                · {i18n.t(d.table.tags, { tags: desk.allowedTags.join(", ") })}
                                            {/if}
                                        </span>
                                        {#if desk.seats.length > 0}
                                            <span class="muted block text-xs font-normal">
                                                {i18n.p(d.table.seats, desk.seats.length)}
                                            </span>
                                        {/if}
                                    </th>
                                    <td>
                                        <span class={STATUS_BADGE[desk.status]} title={d.statusHint[desk.status]}>
                                            {d.status[desk.status]}
                                        </span>
                                        {#if desk.status === "kept" && current}
                                            <span class="muted mt-1 block text-xs">
                                                {i18n.t(d.table.keptFor, {
                                                    person: reservedFor(current),
                                                    end: i18n.dateTime(current.end),
                                                })}
                                            </span>
                                        {/if}
                                    </td>
                                    <td>
                                        {#if !held}
                                            <span class="muted">{d.table.nobody}</span>
                                        {:else}
                                            {#if desk.ownerId !== null}
                                                <span class="block font-medium break-words">{ownerName(desk)}</span>
                                                {#if desk.owner?.name && desk.owner.email}
                                                    <span class="muted block text-xs [overflow-wrap:anywhere]"
                                                        >{desk.owner.email}</span
                                                    >
                                                {/if}
                                                {#if !desk.owner?.hasJoined}
                                                    <span class="muted block text-xs">{d.table.notJoined}</span>
                                                {/if}
                                            {/if}
                                            {#if desk.coOwners.length > 0}
                                                <span class="mt-1 block text-xs break-words">
                                                    {i18n.t(d.table.coOwners, {
                                                        people: desk.coOwners
                                                            .map((coOwner) => personName(coOwner.info, coOwner.id))
                                                            .join(", "),
                                                    })}
                                                </span>
                                            {/if}
                                            {#if desk.ownerName && desk.ownerId !== null && desk.ownerName !== ownerName(desk)}
                                                <span class="muted block text-xs break-words">
                                                    {i18n.t(d.table.nameOnDesk, { name: desk.ownerName })}
                                                </span>
                                            {/if}
                                        {/if}
                                    </td>
                                    <td>
                                        {#if current}
                                            <span class="block text-sm break-words">
                                                {i18n.t(d.table.now, {
                                                    person: reservedFor(current),
                                                    end: i18n.dateTime(current.end),
                                                })}
                                            </span>
                                        {/if}
                                        {#if next}
                                            <span class="block text-sm break-words">
                                                {i18n.t(d.table.next, {
                                                    person: reservedFor(next),
                                                    start: i18n.dateTime(next.start),
                                                    end: i18n.dateTime(next.end),
                                                })}
                                            </span>
                                        {/if}
                                        {#if more > 0}
                                            <span class="muted block text-xs">{i18n.p(d.table.more, more)}</span>
                                        {/if}
                                        {#if !current && !next}
                                            <span class="muted">{d.table.none}</span>
                                        {:else if held}
                                            <span class="muted block text-xs">{d.table.notInEffect}</span>
                                        {/if}
                                    </td>
                                    <td>
                                        <div class="flex min-w-72 flex-col gap-2">
                                            {#if aboutDesk(view, desk) && message}
                                                <p
                                                    class="flex items-start gap-1.5 text-xs font-medium {message.tone ===
                                                    'danger'
                                                        ? 'text-[var(--danger)]'
                                                        : 'text-[var(--success)]'}"
                                                >
                                                    <span class="mt-px shrink-0">
                                                        <Icon
                                                            name={message.tone === "danger" ? "alert" : "check"}
                                                            size={14}
                                                        />
                                                    </span>
                                                    <span>{message.text}</span>
                                                </p>
                                            {/if}
                                            {#if desk.deskType !== "hot"}
                                                <form
                                                    method="POST"
                                                    action="?/assign"
                                                    use:enhance={track(`assign-${key}`)}
                                                    class="flex flex-wrap items-center gap-2"
                                                >
                                                    <input type="hidden" name="roomId" value={view.room.id} />
                                                    <input type="hidden" name="deskId" value={desk.id} />
                                                    <input type="hidden" name="deskName" value={desk.name} />
                                                    <label class="sr-only" for="owner-{key}">
                                                        {i18n.t(d.actions.assignLabel, { desk: desk.name })}
                                                    </label>
                                                    <input
                                                        id="owner-{key}"
                                                        class="input min-w-44 flex-1"
                                                        type="email"
                                                        name="owner"
                                                        list="desk-people"
                                                        placeholder={d.actions.assignPlaceholder}
                                                        autocomplete="off"
                                                        maxlength="320"
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        class="btn btn-sm"
                                                        disabled={busy[`assign-${key}`]}
                                                        aria-busy={busy[`assign-${key}`] ?? false}
                                                    >
                                                        {busy[`assign-${key}`] ? d.saving : d.actions.assign}
                                                    </button>
                                                    <label class="flex w-full items-center gap-2 text-xs">
                                                        <input type="checkbox" name="moveFromOtherDesk" value="1" />
                                                        {d.actions.moveFromOther}
                                                    </label>
                                                    {#if desk.ownerId !== null}
                                                        <label class="flex w-full items-center gap-2 text-xs">
                                                            <input
                                                                type="checkbox"
                                                                name="takeFromCurrentOwner"
                                                                value="1"
                                                                required
                                                            />
                                                            {i18n.t(d.confirm.takeTitle, {
                                                                desk: desk.name,
                                                                person: ownerName(desk),
                                                            })}
                                                        </label>
                                                    {/if}
                                                    {#if live.length > 0}
                                                        <label class="flex w-full items-center gap-2 text-xs">
                                                            <input
                                                                type="checkbox"
                                                                name="cancelReservations"
                                                                value="1"
                                                                required
                                                            />
                                                            {i18n.p(d.actions.cancelReservations, live.length)}
                                                        </label>
                                                    {/if}
                                                </form>
                                            {/if}

                                            <div class="flex flex-wrap items-center gap-2">
                                                {#if desk.ownerId !== null}
                                                    <ConfirmForm
                                                        action="?/free"
                                                        label={d.actions.free}
                                                        title={i18n.t(d.confirm.freeTitle, { desk: desk.name })}
                                                        description={i18n.t(d.confirm.freeBody, {
                                                            person: ownerName(desk),
                                                        })}
                                                        fields={{
                                                            roomId: view.room.id,
                                                            deskId: desk.id,
                                                            deskName: desk.name,
                                                        }}
                                                        danger={false}
                                                        small
                                                    />
                                                {/if}
                                                <form
                                                    method="POST"
                                                    action="?/toggle"
                                                    use:enhance={track(`toggle-${key}`)}
                                                >
                                                    <input type="hidden" name="roomId" value={view.room.id} />
                                                    <input type="hidden" name="deskId" value={desk.id} />
                                                    <input type="hidden" name="deskName" value={desk.name} />
                                                    <input
                                                        type="hidden"
                                                        name="disabled"
                                                        value={desk.disabled ? "0" : "1"}
                                                    />
                                                    <button
                                                        type="submit"
                                                        class="btn btn-sm"
                                                        disabled={busy[`toggle-${key}`]}
                                                        aria-busy={busy[`toggle-${key}`] ?? false}
                                                    >
                                                        {desk.disabled ? d.actions.enable : d.actions.disable}
                                                    </button>
                                                </form>
                                            </div>

                                            <DeskReservations
                                                roomId={view.room.id}
                                                {desk}
                                                timeZone={data.timeZone}
                                                limits={data.limits}
                                                {feedback}
                                            />
                                            <DeskSettings
                                                roomId={view.room.id}
                                                {desk}
                                                worldTags={view.worldTags}
                                                {feedback}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </TableScroll>
            {:else}
                <p class="muted mb-4">{view.deskCount === 0 ? d.empty.noDesks : d.empty.noResults}</p>
            {/if}

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
                <details class="card !p-4" open={feedback?.op === "create" && feedback.roomId === view.room.id}>
                    <summary class="cursor-pointer font-medium">{d.create.title}</summary>
                    {#if view.map}
                        <form
                            method="POST"
                            action="?/create"
                            use:enhance={track(`create-${view.room.id}`)}
                            class="mt-3 grid gap-3 sm:grid-cols-2"
                        >
                            <p class="muted text-sm sm:col-span-2">
                                {i18n.t(d.create.intro, { room: view.room.name })}
                            </p>
                            <input type="hidden" name="roomId" value={view.room.id} />
                            {#each gridFields as [name, label, value, min, max] (name)}
                                <div>
                                    <label class="label" for="{view.room.id}-{name}">{label}</label>
                                    <input
                                        id="{view.room.id}-{name}"
                                        class="input"
                                        type="number"
                                        {name}
                                        {value}
                                        {min}
                                        {max}
                                        step="1"
                                        required
                                    />
                                </div>
                            {/each}
                            <div>
                                <label class="label" for="{view.room.id}-prefix">{d.create.prefix}</label>
                                <input
                                    id="{view.room.id}-prefix"
                                    class="input"
                                    name="namePrefix"
                                    value={d.create.prefixDefault}
                                    maxlength="100"
                                    required
                                />
                            </div>
                            <div>
                                <label class="label" for="{view.room.id}-type">{d.create.type}</label>
                                <select id="{view.room.id}-type" class="input" name="deskType">
                                    {#each DESK_TYPES as type (type)}
                                        <option value={type}>{d.type[type]}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="label" for="{view.room.id}-claim">{d.create.claim}</label>
                                <select id="{view.room.id}-claim" class="input" name="claimMode">
                                    <option value="dynamic">{d.table.dynamic}</option>
                                    <option value="static">{d.table.static}</option>
                                </select>
                            </div>
                            <div class="sm:col-span-2">
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    disabled={busy[`create-${view.room.id}`]}
                                    aria-busy={busy[`create-${view.room.id}`] ?? false}
                                >
                                    <Icon name="plus" size={16} />{busy[`create-${view.room.id}`]
                                        ? d.saving
                                        : d.create.submit}
                                </button>
                            </div>
                        </form>
                    {:else}
                        <p class="muted mt-3 text-sm">{d.plan.noSize}</p>
                    {/if}
                </details>

                {#if view.deskCount > 0}
                    <details class="card !p-4" open={feedback?.op === "bulkAssign" && feedback.roomId === view.room.id}>
                        <summary class="cursor-pointer font-medium">{d.bulk.title}</summary>
                        <form
                            method="POST"
                            action="?/bulkAssign"
                            use:enhance={track(`bulk-${view.room.id}`)}
                            class="mt-3 flex flex-col gap-3"
                        >
                            <p id="{view.room.id}-lines-hint" class="muted text-sm">
                                {i18n.t(d.bulk.intro, { timeZone: data.timeZone })}
                            </p>
                            <input type="hidden" name="roomId" value={view.room.id} />
                            <div>
                                <label class="label" for="{view.room.id}-lines">{d.bulk.label}</label>
                                <textarea
                                    id="{view.room.id}-lines"
                                    class="input font-mono"
                                    name="lines"
                                    rows="5"
                                    placeholder={d.bulk.placeholder}
                                    aria-describedby="{view.room.id}-lines-hint"
                                    required></textarea>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    disabled={busy[`bulk-${view.room.id}`]}
                                    aria-busy={busy[`bulk-${view.room.id}`] ?? false}
                                >
                                    {busy[`bulk-${view.room.id}`] ? d.saving : d.bulk.submit}
                                </button>
                            </div>
                        </form>
                        {#if feedback?.op === "bulkAssign" && feedback.roomId === view.room.id && feedback.report}
                            <h3 class="mt-4 font-medium">{d.bulk.resultTitle}</h3>
                            <ul class="mt-2 flex flex-col gap-1 text-sm">
                                {#each feedback.report as entry (entry.line)}
                                    <li class="flex flex-wrap gap-x-2">
                                        <span class="muted">{i18n.t(d.bulk.line, { line: entry.line })}</span>
                                        <span
                                            class={entry.status === "ok" || entry.status === "reserved"
                                                ? "badge badge-success"
                                                : "badge badge-danger"}
                                        >
                                            {i18n.t(d.bulk[entry.status], {
                                                desk: entry.other ?? entry.desk,
                                                days: data.limits.maxDays,
                                            })}
                                        </span>
                                        <span class="break-all">
                                            {entry.desk}
                                            {i18n.dir === "rtl" ? "←" : "→"}
                                            {entry.person}{#if entry.days}, {entry.days}{/if}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </details>
                {/if}
            </div>
        {/if}
    </section>
{/each}
