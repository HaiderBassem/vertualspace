<!--
    "Room size" panel of a room page: the current size, presets by team size, a custom size, the "keep in place" grid
    and the fill choice, with a live preview (map-storage dry run through `previewUrl`) and the resize action
    (`?/resize`), confirmed when objects or zones will move.
-->
<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { useI18n } from "$lib/i18n/context";
    import {
        isRoomTileCount,
        presetOf,
        type CurrentSize,
        type ResizeAnchor,
        type ResizeFill,
        type ResizeReason,
        type ResizeSummary,
        type RoomSizeProblem,
        type SizeAnswer,
        type SizeChoiceValue,
    } from "$lib/rooms/size";
    import AnchorPicker from "./AnchorPicker.svelte";
    import FillPicker from "./FillPicker.svelte";
    import SizeChoice from "./SizeChoice.svelte";
    import SizePreview from "./SizePreview.svelte";
    import SizeProblemText from "./SizeProblemText.svelte";

    let {
        current,
        previewUrl,
        resized = undefined,
        refused = undefined,
    }: {
        current: CurrentSize;
        previewUrl: string;
        resized?: ResizeSummary | undefined;
        refused?: { problem: RoomSizeProblem; reason?: ResizeReason | null; detail?: string | null } | undefined;
    } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);

    // The panel is re-created after each resize (keyed by its parent), so the starting size is read once.
    const start = untrack(() => current);
    let choice = $state<SizeChoiceValue>(presetOf(start) ?? "custom");
    let width = $state(start.width);
    let height = $state(start.height);
    let anchor = $state<ResizeAnchor>("top-left");
    let fill = $state<ResizeFill>("extend");

    type Preview = { status: "idle" } | { status: "loading" } | SizeAnswer;
    let preview = $state<Preview>({ status: "idle" });

    const unchanged = $derived(width === current.width && height === current.height);
    const moves = $derived(preview.status === "ok" ? preview.summary.movedObjects + preview.summary.movedAreas : 0);

    $effect(() => {
        const request = { width, height, anchor, fill };
        if (!isRoomTileCount(request.width) || !isRoomTileCount(request.height)) {
            preview = { status: "problem", problem: "invalid" };
            return;
        }
        if (request.width === current.width && request.height === current.height) {
            preview = { status: "idle" };
            return;
        }
        preview = { status: "loading" };
        const controller = new AbortController();
        // Waits for the person to stop typing, and drops answers that arrive after a newer request.
        const timer = setTimeout(async () => {
            try {
                const query = new URLSearchParams({
                    width: String(request.width),
                    height: String(request.height),
                    anchor: request.anchor,
                    fill: request.fill,
                });
                const response = await fetch(`${previewUrl}?${query.toString()}`, {
                    headers: { accept: "application/json" },
                    signal: controller.signal,
                });
                const answer = (await response.json()) as SizeAnswer;
                if (!controller.signal.aborted) preview = answer;
            } catch {
                if (!controller.signal.aborted) preview = { status: "problem", problem: "unavailable" };
            }
        }, 350);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    });

    function signed(count: number, added: Parameters<typeof i18n.p>[0], removed: Parameters<typeof i18n.p>[0]) {
        return count >= 0 ? i18n.p(added, count) : i18n.p(removed, -count);
    }
</script>

<section class="card space-y-5" aria-labelledby="room-size-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
            <h2 id="room-size-title" class="text-lg font-semibold">{o.size.title}</h2>
            <p class="muted mt-1 max-w-2xl text-sm">{o.size.intro}</p>
        </div>
        <div class="text-end">
            <p class="section-title">{o.size.current}</p>
            <p class="font-semibold">{i18n.t(o.tiles, { width: current.width, height: current.height })}</p>
            <p class="muted text-xs">
                {i18n.t(o.pixels, {
                    width: current.width * current.tileWidth,
                    height: current.height * current.tileHeight,
                })}
            </p>
        </div>
    </div>

    <div aria-live="polite">
        {#if resized}
            <p class="notice notice-success">
                <Icon name="check" />{i18n.t(o.size.resized, { width: resized.to.width, height: resized.to.height })}
            </p>
        {:else if refused}
            <div class="notice notice-danger" role="alert">
                <Icon name="alert" /><SizeProblemText
                    problem={refused.problem}
                    reason={refused.reason}
                    detail={refused.detail}
                />
            </div>
        {/if}
    </div>

    <SizeChoice legend={o.template.size} bind:choice bind:width bind:height idPrefix="room-size" />

    <div class="grid gap-5 md:grid-cols-[auto_1fr]">
        <AnchorPicker bind:anchor />
        <FillPicker bind:fill />
    </div>

    <div
        class="rounded-lg border border-[var(--border)] p-4"
        aria-live="polite"
        aria-busy={preview.status === "loading"}
    >
        <h3 class="section-title mb-3">{o.size.preview}</h3>
        {#if unchanged}
            <p class="muted text-sm">{o.size.unchanged}</p>
        {:else if preview.status === "loading" || preview.status === "idle"}
            <p class="muted text-sm">{o.size.previewing}</p>
        {:else if preview.status === "problem"}
            <div class="text-sm text-[var(--danger)]">
                <SizeProblemText problem={preview.problem} reason={preview.reason} detail={preview.detail} />
            </div>
        {:else}
            <div class="flex flex-wrap items-start gap-6">
                <SizePreview from={preview.summary.from} to={preview.summary.to} {anchor} />
                <ul class="space-y-1 text-sm">
                    {#if preview.summary.columns !== 0}
                        <li class="font-medium">
                            {signed(preview.summary.columns, o.size.columnsAdded, o.size.columnsRemoved)}
                        </li>
                    {/if}
                    {#if preview.summary.rows !== 0}
                        <li class="font-medium">
                            {signed(preview.summary.rows, o.size.rowsAdded, o.size.rowsRemoved)}
                        </li>
                    {/if}
                    <li class={preview.summary.movedObjects > 0 ? "text-[var(--warning)]" : "muted"}>
                        {preview.summary.movedObjects > 0
                            ? i18n.p(o.size.objectsMove, preview.summary.movedObjects)
                            : o.size.nothingMoves}
                    </li>
                    {#if preview.summary.movedAreas > 0}
                        <li class="text-[var(--warning)]">{i18n.p(o.size.areasMove, preview.summary.movedAreas)}</li>
                    {/if}
                </ul>
            </div>
        {/if}
    </div>

    <div class="flex justify-end">
        {#if preview.status === "ok" && moves > 0}
            <ConfirmForm
                action="?/resize"
                label={o.size.apply}
                title={o.size.confirmTitle}
                description={o.size.confirmDescription}
                fields={{ width: String(width), height: String(height), anchor, fill }}
                danger={false}
                primary
            />
        {:else}
            <form method="POST" action="?/resize" use:enhance>
                <input type="hidden" name="width" value={width} />
                <input type="hidden" name="height" value={height} />
                <input type="hidden" name="anchor" value={anchor} />
                <input type="hidden" name="fill" value={fill} />
                <button class="btn btn-primary" type="submit" disabled={preview.status !== "ok"}>{o.size.apply}</button>
            </form>
        {/if}
    </div>
</section>
