<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import { resolve } from "$app/paths";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import AnchorPicker from "$lib/components/rooms/AnchorPicker.svelte";
    import FillPicker from "$lib/components/rooms/FillPicker.svelte";
    import SizeChoice from "$lib/components/rooms/SizeChoice.svelte";
    import SizeProblemText from "$lib/components/rooms/SizeProblemText.svelte";
    import { formField, formOp } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import {
        MAX_ROOM_TILES,
        presetSize,
        type ResizeAnchor,
        type ResizeFill,
        type SizeChoiceValue,
    } from "$lib/rooms/size";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const o = $derived(i18n.m.office);
    const b = $derived(o.bulk);
    const slug = $derived(data.organization.slug);

    type PreviewRow = NonNullable<Extract<ActionData, { preview: unknown }>>["preview"][number];
    const preview = $derived(formOp(form) === "preview" ? formField<PreviewRow[]>(form, "preview") : undefined);
    const previewAnchor = $derived(formField<ResizeAnchor>(form, "anchor") ?? "top-left");
    const previewFill = $derived(formField<ResizeFill>(form, "fill") ?? "extend");
    const bulkError = $derived(formField<"validation" | "noRooms" | "tooMany">(form, "bulkError"));

    let selected = $state<string[]>(untrack(() => formField<string[]>(form, "roomIds") ?? []));
    let mode = $state<"exact" | "grow" | "shrink">("exact");
    let sizeChoice = $state<SizeChoiceValue>("medium");
    let width = $state(presetSize("medium").width);
    let height = $state(presetSize("medium").height);
    let tiles = $state(4);
    let anchor = $state<ResizeAnchor>("top-left");
    let fill = $state<ResizeFill>("extend");

    const eligible = $derived(
        data.tree.workspaces.flatMap((w) => w.worlds.flatMap((world) => world.rooms.filter((r) => !r.problem))),
    );

    function worldRooms(world: PageData["tree"]["workspaces"][number]["worlds"][number]): string[] {
        return world.rooms.filter((r) => !r.problem).map((r) => r.id);
    }
    function toggleAll(ids: string[], on: boolean): void {
        selected = on ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id));
    }

    // Ready rows of the preview are included unless unticked.
    let excluded = $state<string[]>([]);
    $effect(() => {
        if (preview) excluded = [];
    });
    const included = $derived(
        (preview ?? []).filter((row) => row.status === "ready" && row.to && !excluded.includes(row.roomId)),
    );
    const items = $derived(included.map((row) => `${row.roomId}:${row.to!.width}:${row.to!.height}`).join(","));

    // Results refresh themselves while rooms are still waiting or being resized.
    const active = $derived(
        data.batch?.results?.some((r) => r.status === "pending" || r.status === "running") ?? false,
    );
    $effect(() => {
        if (!active) return;
        const timer = setInterval(() => void invalidateAll(), 2_000);
        return () => clearInterval(timer);
    });

    const stateTone = (status: string) =>
        status === "succeeded"
            ? "badge-success"
            : status === "failed"
              ? "badge-danger"
              : status === "cancelled"
                ? ""
                : "badge-warning";

    const noReset =
        () =>
        async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
            update({ reset: false });
</script>

<PageHeader title={b.title} description={b.intro} />

{#if data.batch}
    <section class="card space-y-4" aria-labelledby="results-title">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 id="results-title" class="text-lg font-semibold">{b.results}</h2>
                <p class="muted text-sm">{b.resultsIntro}</p>
            </div>
            <a class="btn" href={resolve(`/o/${slug}/room-sizes${data.scope ? `?workspace=${data.scope.slug}` : ""}`)}
                >{b.another}</a
            >
        </div>
        {#if formOp(form) === "retry"}
            <FormMessage
                form={{ message: formField(form, "message"), success: formField<boolean>(form, "retried") }}
                successText={b.retried}
            />
        {/if}
        {#if !data.batch.results}
            <p class="muted">{b.unknownBatch}</p>
        {:else}
            <div class="relative overflow-x-auto">
                <table class="table text-sm">
                    <thead>
                        <tr>
                            <th scope="col">{b.columns.room}</th>
                            <th scope="col">{b.columns.after}</th>
                            <th scope="col">{b.columns.status}</th>
                            <th scope="col">{b.columns.moves}</th>
                            <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                        </tr>
                    </thead>
                    <tbody aria-live="polite">
                        {#each data.batch.results as row (row.jobId)}
                            <tr>
                                <td>
                                    <span class="font-medium">{row.roomName ?? "—"}</span>
                                    {#if row.worldName}<span class="muted block text-xs">{row.worldName}</span>{/if}
                                </td>
                                <td class="whitespace-nowrap"
                                    >{i18n.t(o.tiles, { width: row.to.width, height: row.to.height })}</td
                                >
                                <td>
                                    <span class="badge {stateTone(row.status)}">{b.state[row.status]}</span>
                                    {#if row.status === "failed" && row.problem}
                                        <div class="mt-1 text-xs text-[var(--danger)]">
                                            {#if row.problem === "roomGone"}
                                                {b.roomGone}
                                            {:else}
                                                <SizeProblemText problem={row.problem} reason={row.reason} />
                                            {/if}
                                        </div>
                                    {:else if row.status === "pending" && row.problem}
                                        <p class="muted mt-1 text-xs">{b.retrying}</p>
                                    {/if}
                                </td>
                                <td>
                                    {#if row.summary}
                                        {row.summary.movedObjects + row.summary.movedAreas > 0
                                            ? i18n.p(b.moves, row.summary.movedObjects + row.summary.movedAreas)
                                            : b.nothing}
                                    {:else}
                                        <span class="muted">—</span>
                                    {/if}
                                </td>
                                <td class="text-end">
                                    {#if row.status === "failed" && row.problem !== "roomGone"}
                                        <form method="POST" action="?/retry" use:enhance>
                                            <input type="hidden" name="jobId" value={row.jobId} />
                                            <button class="btn btn-sm" type="submit">{b.retry}</button>
                                        </form>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>
{:else}
    {#if data.scopes.length > 1}
        <nav class="segmented mb-4 max-w-full overflow-x-auto" aria-label={b.scope}>
            <a href={resolve(`/o/${slug}/room-sizes`)} aria-current={data.scope ? undefined : "page"}>{b.scopeAll}</a>
            {#each data.scopes as scope (scope.slug)}
                <a
                    href={resolve(`/o/${slug}/room-sizes?workspace=${scope.slug}`)}
                    aria-current={data.scope?.slug === scope.slug ? "page" : undefined}>{scope.name}</a
                >
            {/each}
        </nav>
    {/if}

    {#if bulkError}
        <p class="notice notice-danger mb-4" role="alert">
            <Icon name="alert" />{bulkError === "tooMany"
                ? i18n.t(b.tooMany, { max: data.maxRooms })
                : bulkError === "noRooms"
                  ? b.noneSelected
                  : i18n.m.common.errors.validation}
        </p>
    {/if}

    <form method="POST" action="?/preview" use:enhance={noReset} class="grid gap-6 xl:grid-cols-[1fr_minmax(0,26rem)]">
        <section class="card space-y-4" aria-labelledby="rooms-title">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="rooms-title" class="text-lg font-semibold">{b.roomsStep}</h2>
                <p class="muted text-sm" aria-live="polite">
                    {selected.length === 0 ? b.noneSelected : i18n.p(b.selected, selected.length)}
                </p>
            </div>
            {#if eligible.length === 0 && data.tree.workspaces.every( (w) => w.worlds.every((x) => x.rooms.length === 0) )}
                <p class="muted">{b.noRooms}</p>
            {:else}
                <label class="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={eligible.length > 0 && eligible.every((r) => selected.includes(r.id))}
                        onchange={(event) =>
                            toggleAll(
                                eligible.map((r) => r.id),
                                event.currentTarget.checked,
                            )}
                    />
                    {b.selectAll}
                </label>
                {#each data.tree.workspaces as workspace (workspace.id)}
                    {#if workspace.worlds.length > 0}
                        <div class="space-y-3">
                            {#if !data.scope}<h3 class="section-title">{workspace.name}</h3>{/if}
                            {#each workspace.worlds as world (world.id)}
                                {@const ids = worldRooms(world)}
                                <fieldset class="rounded-lg border border-[var(--border)] p-3">
                                    <legend class="px-1">
                                        <label class="flex items-center gap-2 font-semibold">
                                            <input
                                                type="checkbox"
                                                disabled={ids.length === 0}
                                                checked={ids.length > 0 && ids.every((id) => selected.includes(id))}
                                                onchange={(event) => toggleAll(ids, event.currentTarget.checked)}
                                                aria-label={i18n.t(b.selectWorld, { world: world.name })}
                                            />
                                            {world.name}
                                        </label>
                                    </legend>
                                    <ul class="grid gap-1 sm:grid-cols-2">
                                        {#each world.rooms as room (room.id)}
                                            <li>
                                                <label
                                                    class="flex items-center gap-2 rounded px-1 py-0.5 text-sm {room.problem
                                                        ? 'muted'
                                                        : ''}"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        name="room"
                                                        value={room.id}
                                                        disabled={room.problem !== null}
                                                        bind:group={selected}
                                                    />
                                                    <span class="min-w-0 truncate">{room.name}</span>
                                                    {#if room.problem}<span class="chip shrink-0 text-xs"
                                                            >{o.shortProblems[room.problem]}</span
                                                        >{/if}
                                                </label>
                                            </li>
                                        {/each}
                                    </ul>
                                </fieldset>
                            {/each}
                        </div>
                    {/if}
                {/each}
            {/if}
        </section>

        <section class="card space-y-5" aria-labelledby="size-title">
            <h2 id="size-title" class="text-lg font-semibold">{b.sizeStep}</h2>
            <fieldset class="space-y-2">
                <legend class="label">{b.mode}</legend>
                {#each ["exact", "grow", "shrink"] as const as value (value)}
                    <label class="choice">
                        <input type="radio" name="mode" {value} bind:group={mode} class="mt-1" />
                        <span class="font-semibold">{b.modes[value]}</span>
                    </label>
                {/each}
            </fieldset>
            {#if mode === "exact"}
                <SizeChoice
                    legend={o.template.size}
                    bind:choice={sizeChoice}
                    bind:width
                    bind:height
                    idPrefix="bulk"
                    compact
                />
            {:else}
                <div>
                    <label class="label" for="bulk-tiles">{b.tiles}</label>
                    <input
                        id="bulk-tiles"
                        class="input max-w-32"
                        name="tiles"
                        type="number"
                        inputmode="numeric"
                        min="1"
                        max={MAX_ROOM_TILES}
                        step="1"
                        required
                        bind:value={tiles}
                        aria-describedby="bulk-tiles-hint"
                    />
                    <p class="hint" id="bulk-tiles-hint">{mode === "grow" ? b.growHint : b.shrinkHint}</p>
                </div>
            {/if}
            <AnchorPicker bind:anchor />
            <FillPicker bind:fill />
            <button class="btn btn-primary w-full" type="submit" disabled={selected.length === 0}
                >{b.previewSubmit}</button
            >
        </section>
    </form>

    {#if preview}
        <section class="card mt-6 space-y-4" aria-labelledby="preview-title">
            <div>
                <h2 id="preview-title" class="text-lg font-semibold">{b.previewTitle}</h2>
                <p class="muted text-sm">{b.previewIntro}</p>
            </div>
            <div class="relative overflow-x-auto">
                <table class="table text-sm">
                    <thead>
                        <tr>
                            <th scope="col">{b.columns.include}</th>
                            <th scope="col">{b.columns.room}</th>
                            <th scope="col">{b.columns.now}</th>
                            <th scope="col">{b.columns.after}</th>
                            <th scope="col">{b.columns.moves}</th>
                            <th scope="col">{b.columns.status}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each preview as row (row.roomId)}
                            <tr>
                                <td>
                                    {#if row.status === "ready"}
                                        <input
                                            type="checkbox"
                                            checked={!excluded.includes(row.roomId)}
                                            onchange={(event) =>
                                                (excluded = event.currentTarget.checked
                                                    ? excluded.filter((id) => id !== row.roomId)
                                                    : [...excluded, row.roomId])}
                                            aria-label={row.roomName}
                                        />
                                    {/if}
                                </td>
                                <td>
                                    <span class="font-medium">{row.roomName}</span>
                                    <span class="muted block text-xs">{row.worldName}</span>
                                </td>
                                <td class="whitespace-nowrap"
                                    >{row.from
                                        ? i18n.t(o.tiles, { width: row.from.width, height: row.from.height })
                                        : "—"}</td
                                >
                                <td class="whitespace-nowrap font-medium"
                                    >{row.to
                                        ? i18n.t(o.tiles, { width: row.to.width, height: row.to.height })
                                        : "—"}</td
                                >
                                <td>
                                    {#if row.summary}
                                        <span
                                            class={row.summary.movedObjects + row.summary.movedAreas > 0
                                                ? "text-[var(--warning)]"
                                                : "muted"}
                                        >
                                            {row.summary.movedObjects + row.summary.movedAreas > 0
                                                ? i18n.p(b.moves, row.summary.movedObjects + row.summary.movedAreas)
                                                : b.nothing}
                                        </span>
                                    {:else}
                                        <span class="muted">—</span>
                                    {/if}
                                </td>
                                <td>
                                    {#if row.status === "ready"}
                                        <span class="badge badge-success">{b.ready}</span>
                                    {:else if row.status === "sameSize"}
                                        <span class="badge">{b.sameSize}</span>
                                    {:else if row.status === "outOfRange"}
                                        <span class="badge badge-warning">{b.outOfRange}</span>
                                    {:else}
                                        <div class="text-xs text-[var(--danger)]">
                                            <SizeProblemText
                                                problem={row.status}
                                                reason={row.reason}
                                                detail={row.detail}
                                            />
                                        </div>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end">
                {#if included.length > 0}
                    <ConfirmForm
                        action="?/apply"
                        label={i18n.p(b.apply, included.length)}
                        title={b.applyTitle}
                        description={b.applyDescription}
                        fields={{ items, anchor: previewAnchor, fill: previewFill, workspace: data.scope?.slug ?? "" }}
                        danger={false}
                        primary
                    />
                {:else}
                    <p class="muted text-sm">{b.nothingToApply}</p>
                {/if}
            </div>
        </section>
    {/if}
{/if}
