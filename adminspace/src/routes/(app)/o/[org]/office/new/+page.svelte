<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import { OFFICE_LAYOUTS, planOffice, plannedSize, type OfficeLayout, type PlannedRoom } from "$lib/rooms/office";
    import { ROOM_SIZE_PRESETS, type RoomSizePresetKey } from "$lib/rooms/size";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.office.wizard);
    const o = $derived(i18n.m.office);

    const seed = untrack(() => (form && "values" in form ? form.values : undefined));
    let step = $state(seed ? 3 : 1);
    let name = $state(seed?.name ?? "");
    let workspaceId = $state(seed?.workspaceId ?? untrack(() => data.selectedWorkspace));
    let layout = $state<OfficeLayout>(
        (OFFICE_LAYOUTS as readonly string[]).includes(seed?.layout ?? "") ? (seed!.layout as OfficeLayout) : "hybrid",
    );
    let size = $state<RoomSizePresetKey>(
        ROOM_SIZE_PRESETS.some((p) => p.key === seed?.size) ? (seed!.size as RoomSizePresetKey) : "small",
    );
    let nameError = $state(false);
    let submitting = $state(false);

    const TOTAL = 3;
    const plan = $derived(planOffice(layout, size));
    const officeProblem = $derived(data.problem ?? (form && "officeProblem" in form ? form.officeProblem : null));
    const failed = $derived(Boolean(form) && !officeProblem);

    function roomLabel(room: PlannedRoom): string {
        if (room.kind === "meeting") {
            return room.number === undefined
                ? w.roomNames.meetingSingle
                : i18n.t(w.roomNames.meeting, { n: room.number });
        }
        if (room.kind === "focus") return i18n.t(w.roomNames.focus, { n: room.number ?? 1 });
        return w.roomNames[room.kind];
    }

    function next(): void {
        if (step === 1 && name.trim().length < 2) {
            nameError = true;
            return;
        }
        nameError = false;
        step = Math.min(TOTAL, step + 1);
    }

    // Floor plan sketch: every room to the same scale, the biggest about 220 px wide.
    const scale = $derived(Math.min(4, 220 / Math.max(...plan.map((r) => plannedSize(r).width))));
</script>

<PageHeader title={w.title} />

<div aria-live="polite">
    {#if officeProblem}
        <p class="notice notice-danger mb-4" role="alert"><Icon name="alert" />{w.errors[officeProblem]}</p>
    {:else if failed && form && "message" in form && form.message && form.message !== "validation"}
        <FormMessage form={{ message: form.message }} />
    {:else if failed}
        <p class="notice notice-danger mb-4" role="alert"><Icon name="alert" />{w.errors.failed}</p>
    {/if}
</div>

<div class="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
    <form
        method="POST"
        class="card space-y-6"
        use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
                await update({ reset: false });
                submitting = false;
            };
        }}
    >
        <div class="flex items-center justify-between gap-3">
            {#if step > 1}
                <button type="button" class="btn btn-ghost btn-sm" onclick={() => (step -= 1)}>
                    <Icon name="chevron-left" size={14} />{w.back}
                </button>
            {:else}
                <span></span>
            {/if}
            <p class="muted text-sm">{i18n.t(w.stepOf, { step, total: TOTAL })}</p>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden="true">
            <div
                class="h-full rounded-full bg-[var(--accent)] transition-all"
                style:width="{(step / TOTAL) * 100}%"
            ></div>
        </div>

        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="layout" value={layout} />
        <input type="hidden" name="size" value={size} />

        {#if step === 1}
            <div class="space-y-4">
                <h2 class="text-xl font-bold">{w.name.heading}</h2>
                <div class="field">
                    <label class="label" for="office-name">{w.name.label}</label>
                    <input
                        id="office-name"
                        class="input"
                        maxlength="100"
                        placeholder={w.name.placeholder}
                        bind:value={name}
                        aria-invalid={nameError ? "true" : undefined}
                        aria-describedby="office-name-hint{nameError ? ' office-name-error' : ''}"
                        onkeydown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                next();
                            }
                        }}
                    />
                    <p class="hint" id="office-name-hint">{w.name.hint}</p>
                    {#if nameError}<p class="field-error" id="office-name-error">
                            {i18n.m.common.errors.requiredField}
                        </p>{/if}
                </div>
                {#if data.workspaces.length > 1}
                    <div class="field">
                        <label class="label" for="office-workspace">{w.name.workspace}</label>
                        <select id="office-workspace" class="select" bind:value={workspaceId}>
                            {#each data.workspaces as workspace (workspace.id)}
                                <option value={workspace.id}>{workspace.name}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </div>
        {:else if step === 2}
            <fieldset class="space-y-3">
                <legend class="text-xl font-bold">{w.layout.heading}</legend>
                <p class="muted text-sm">{w.layout.intro}</p>
                {#each OFFICE_LAYOUTS as value (value)}
                    <label class="choice">
                        <input type="radio" name="layoutChoice" {value} bind:group={layout} class="mt-1" />
                        <span>
                            <span class="flex flex-wrap items-center gap-2 font-semibold">
                                {w.layout[value].name}
                                {#if value === "hybrid"}<span class="badge badge-accent">{w.layout.recommended}</span
                                    >{/if}
                            </span>
                            <span class="muted block text-sm">{w.layout[value].description}</span>
                        </span>
                    </label>
                {/each}
            </fieldset>
        {:else}
            <fieldset class="space-y-3">
                <legend class="text-xl font-bold">{w.size.heading}</legend>
                <p class="muted text-sm">{w.size.intro}</p>
                {#each ROOM_SIZE_PRESETS as preset (preset.key)}
                    <label class="choice">
                        <input type="radio" name="sizeChoice" value={preset.key} bind:group={size} class="mt-1" />
                        <span>
                            <span class="block font-semibold">{o.presets[preset.key].people}</span>
                            <span class="muted block text-sm"
                                >{o.presets[preset.key].name} · {i18n.p(
                                    w.rooms,
                                    planOffice(layout, preset.key).length,
                                )}</span
                            >
                        </span>
                    </label>
                {/each}
            </fieldset>
        {/if}

        {#if step < TOTAL}
            <button type="button" class="btn btn-primary w-full" onclick={next}>{w.continue}</button>
        {:else}
            <button class="btn btn-primary w-full" type="submit" disabled={submitting || data.problem !== null}>
                {submitting ? w.creating : failed ? w.retry : w.create}
            </button>
        {/if}
    </form>

    <section class="card space-y-4" aria-labelledby="office-preview-title">
        <div>
            <h2 id="office-preview-title" class="text-lg font-semibold">{name.trim() || w.name.placeholder}</h2>
            <p class="muted text-sm">
                {w.layout[layout].name} · {o.presets[size].people} · {i18n.p(w.rooms, plan.length)}
            </p>
        </div>
        <ul class="flex flex-wrap items-end gap-3" dir="ltr">
            {#each plan as room (room.slug)}
                {@const roomSize = plannedSize(room)}
                <li
                    class="plan-room {room.isDefault ? 'plan-default' : ''}"
                    style:width="{Math.max(72, roomSize.width * scale)}px"
                    style:height="{Math.max(48, roomSize.height * scale)}px"
                >
                    <span class="text-xs font-semibold" dir="auto">{roomLabel(room)}</span>
                    <span class="muted text-[0.6875rem]"
                        >{i18n.t(o.tiles, { width: roomSize.width, height: roomSize.height })}</span
                    >
                    <Icon name="door" size={14} class="plan-door" />
                </li>
            {/each}
        </ul>
        <p class="muted text-xs">{w.entryIntro}</p>
        <p class="text-sm">
            <a href={resolve(`/o/${data.organization.slug}/w/new`)}>{w.emptyWorld}</a>
        </p>
    </section>
</div>

<style>
    .plan-room {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 0.125rem;
        padding: 0.375rem 0.5rem;
        border: 2px solid var(--border-strong);
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
        overflow: hidden;
    }
    .plan-default {
        border-color: var(--accent);
        background: var(--accent-soft);
    }
    .plan-room :global(.plan-door) {
        position: absolute;
        inset-block-end: 0.25rem;
        inset-inline-end: 0.25rem;
        color: var(--accent);
    }
</style>
