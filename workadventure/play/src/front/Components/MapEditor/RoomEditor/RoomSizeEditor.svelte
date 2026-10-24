<script lang="ts">
    import type { MapResizeAnchor, MapResizeFill } from "@workadventure/map-editor";
    import { MAP_RESIZE_MAX_TILES, MAP_RESIZE_MIN_TILES } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import type { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import {
        roomResizeDraftStore,
        roomResizePreviewStore,
        roomResizeStatusStore,
    } from "../../../Stores/RoomResizeStore";
    import { IconAlertTriangle, IconDimensions, IconMinus, IconPlus } from "@wa-icons";

    const scene = gameManager.getCurrentGameScene();
    const currentWidth = scene.getGameMap().getMap().width ?? MAP_RESIZE_MIN_TILES;
    const currentHeight = scene.getGameMap().getMap().height ?? MAP_RESIZE_MIN_TILES;

    let width = $state(currentWidth);
    let height = $state(currentHeight);
    let anchor = $state<MapResizeAnchor>("top-left");
    let fill = $state<MapResizeFill>("extend");
    // Set by a first click on "Resize" when things will have to move: a second click confirms.
    let confirming = $state(false);

    // Office sizes in the spirit of Gather's "how big is your team": about 30 tiles per person, plus circulation.
    const presets: { label: () => LocalizedString; width: number; height: number; people: number }[] = [
        { label: () => $LL.mapEditor.roomEditor.presetSmall(), width: 20, height: 15, people: 10 },
        { label: () => $LL.mapEditor.roomEditor.presetMedium(), width: 32, height: 24, people: 25 },
        { label: () => $LL.mapEditor.roomEditor.presetLarge(), width: 48, height: 36, people: 50 },
        { label: () => $LL.mapEditor.roomEditor.presetHuge(), width: 64, height: 48, people: 100 },
    ];

    const anchors: { value: MapResizeAnchor; label: () => LocalizedString }[] = [
        { value: "top-left", label: () => $LL.mapEditor.roomEditor.anchors.topLeft() },
        { value: "top", label: () => $LL.mapEditor.roomEditor.anchors.top() },
        { value: "top-right", label: () => $LL.mapEditor.roomEditor.anchors.topRight() },
        { value: "left", label: () => $LL.mapEditor.roomEditor.anchors.left() },
        { value: "center", label: () => $LL.mapEditor.roomEditor.anchors.center() },
        { value: "right", label: () => $LL.mapEditor.roomEditor.anchors.right() },
        { value: "bottom-left", label: () => $LL.mapEditor.roomEditor.anchors.bottomLeft() },
        { value: "bottom", label: () => $LL.mapEditor.roomEditor.anchors.bottom() },
        { value: "bottom-right", label: () => $LL.mapEditor.roomEditor.anchors.bottomRight() },
    ];

    const fills: { value: MapResizeFill; title: () => LocalizedString; help: () => LocalizedString }[] = [
        {
            value: "extend",
            title: () => $LL.mapEditor.roomEditor.fillExtend(),
            help: () => $LL.mapEditor.roomEditor.fillExtendHelp(),
        },
        {
            value: "empty",
            title: () => $LL.mapEditor.roomEditor.fillEmpty(),
            help: () => $LL.mapEditor.roomEditor.fillEmptyHelp(),
        },
    ];

    function clampTiles(value: number): number {
        if (!Number.isFinite(value)) {
            return MAP_RESIZE_MIN_TILES;
        }
        return Math.min(MAP_RESIZE_MAX_TILES, Math.max(MAP_RESIZE_MIN_TILES, Math.round(value)));
    }

    let draftWidth = $derived(clampTiles(width));
    let draftHeight = $derived(clampTiles(height));
    let unchanged = $derived(draftWidth === currentWidth && draftHeight === currentHeight);

    $effect(() => {
        roomResizeDraftStore.set(unchanged ? undefined : { width: draftWidth, height: draftHeight, anchor, fill });
        confirming = false;
    });

    let report = $derived(
        $roomResizePreviewStore && "report" in $roomResizePreviewStore ? $roomResizePreviewStore.report : undefined,
    );
    let previewError = $derived(
        $roomResizePreviewStore && "error" in $roomResizePreviewStore ? $roomResizePreviewStore.error : undefined,
    );
    let displacedCount = $derived(report ? report.displacedEntities.length + report.displacedAreas.length : 0);
    let pending = $derived($roomResizeStatusStore.state === "pending");

    function apply(): void {
        const draft = $roomResizeDraftStore;
        if (!draft || previewError || pending) {
            return;
        }
        if (displacedCount > 0 && !confirming) {
            confirming = true;
            return;
        }
        scene.getMapEditorModeManager()?.requestRoomResize(draft);
    }

    function reset(): void {
        width = currentWidth;
        height = currentHeight;
        anchor = "top-left";
        fill = "extend";
        roomResizeStatusStore.set({ state: "idle" });
    }

    onDestroy(() => {
        roomResizeDraftStore.set(undefined);
        if ($roomResizeStatusStore.state === "failed") {
            roomResizeStatusStore.set({ state: "idle" });
        }
    });
</script>

{#snippet sizeInput(id: string, label: string, value: number, onchange: (value: number) => void)}
    <div class="flex items-center gap-2">
        <label for={id} class="w-16 text-sm">{label}</label>
        <button
            type="button"
            class="rounded-md bg-white/10 p-2 hover:bg-white/20"
            aria-label={$LL.mapEditor.roomEditor.decrease({ dimension: label })}
            disabled={pending}
            onclick={() => onchange(clampTiles(value - 1))}
        >
            <IconMinus font-size="16" />
        </button>
        <input
            {id}
            data-testid={id}
            type="number"
            class="w-20 rounded-md bg-white/10 px-2 py-1 text-center text-white"
            min={MAP_RESIZE_MIN_TILES}
            max={MAP_RESIZE_MAX_TILES}
            disabled={pending}
            {value}
            oninput={(event) => onchange(event.currentTarget.valueAsNumber)}
        />
        <button
            type="button"
            class="rounded-md bg-white/10 p-2 hover:bg-white/20"
            aria-label={$LL.mapEditor.roomEditor.increase({ dimension: label })}
            disabled={pending}
            onclick={() => onchange(clampTiles(value + 1))}
        >
            <IconPlus font-size="16" />
        </button>
        <span class="text-sm text-white/60">{$LL.mapEditor.roomEditor.tiles()}</span>
    </div>
{/snippet}

<div class="flex flex-col gap-4 overflow-y-auto text-white" data-testid="roomEditor">
    <header class="flex flex-col gap-1">
        <h2 class="flex items-center gap-2 text-lg font-bold m-0">
            <IconDimensions font-size="22" />
            {$LL.mapEditor.roomEditor.title()}
        </h2>
        <p class="text-sm text-white/70 m-0">{$LL.mapEditor.roomEditor.description()}</p>
        <p class="text-sm m-0" data-testid="roomEditorCurrentSize">
            {$LL.mapEditor.roomEditor.currentSize({ width: currentWidth, height: currentHeight })}
        </p>
    </header>

    <section class="flex flex-col gap-2">
        <h3 class="text-sm font-bold uppercase tracking-wide text-white/60 m-0">
            {$LL.mapEditor.roomEditor.presets()}
        </h3>
        <div class="grid grid-cols-2 gap-2">
            {#each presets as preset (preset.width)}
                <button
                    type="button"
                    class="flex flex-col items-start rounded-lg p-2 text-start transition-colors {draftWidth ===
                        preset.width && draftHeight === preset.height
                        ? 'bg-secondary'
                        : 'bg-white/10 hover:bg-white/20'}"
                    disabled={pending}
                    onclick={() => {
                        width = preset.width;
                        height = preset.height;
                    }}
                >
                    <span class="font-bold">{preset.label()}</span>
                    <span class="text-xs text-white/70">
                        {$LL.mapEditor.roomEditor.presetPeople({ count: preset.people })} · {preset.width} × {preset.height}
                    </span>
                </button>
            {/each}
        </div>
    </section>

    <section class="flex flex-col gap-2">
        {@render sizeInput("roomEditorWidth", $LL.mapEditor.roomEditor.width(), draftWidth, (value) => (width = value))}
        {@render sizeInput(
            "roomEditorHeight",
            $LL.mapEditor.roomEditor.height(),
            draftHeight,
            (value) => (height = value),
        )}
    </section>

    <section class="flex flex-col gap-2">
        <h3 class="text-sm font-bold uppercase tracking-wide text-white/60 m-0">
            {$LL.mapEditor.roomEditor.anchor()}
        </h3>
        <div class="flex items-center gap-4">
            <div
                class="grid shrink-0 grid-cols-3 gap-1 w-fit"
                role="radiogroup"
                aria-label={$LL.mapEditor.roomEditor.anchor()}
            >
                {#each anchors as option (option.value)}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={anchor === option.value}
                        aria-label={option.label()}
                        title={option.label()}
                        class="h-8 w-8 rounded-md {anchor === option.value
                            ? 'bg-secondary'
                            : 'bg-white/10 hover:bg-white/20'}"
                        disabled={pending}
                        onclick={() => (anchor = option.value)}
                    >
                        <span
                            class="mx-auto block h-2 w-2 rounded-full {anchor === option.value
                                ? 'bg-white'
                                : 'bg-white/40'}"
                        ></span>
                    </button>
                {/each}
            </div>
            <p class="text-xs text-white/60 m-0">{$LL.mapEditor.roomEditor.anchorHelp()}</p>
        </div>
    </section>

    <section class="flex flex-col gap-2">
        <h3 class="text-sm font-bold uppercase tracking-wide text-white/60 m-0">
            {$LL.mapEditor.roomEditor.fill()}
        </h3>
        <div class="flex flex-col gap-2" role="radiogroup" aria-label={$LL.mapEditor.roomEditor.fill()}>
            {#each fills as option (option.value)}
                <button
                    type="button"
                    role="radio"
                    aria-checked={fill === option.value}
                    class="flex flex-col items-start rounded-lg p-2 text-start border-2 {fill === option.value
                        ? 'border-secondary bg-secondary/40'
                        : 'border-transparent bg-white/10 hover:bg-white/20'}"
                    disabled={pending}
                    onclick={() => (fill = option.value)}
                >
                    <span class="font-bold">{option.title()}</span>
                    <span class="text-xs text-white/70">{option.help()}</span>
                </button>
            {/each}
        </div>
    </section>

    <section class="flex flex-col gap-2 rounded-lg bg-white/5 p-3 text-sm" aria-live="polite">
        {#if previewError}
            <p class="m-0 flex items-start gap-2 text-danger-400">
                <IconAlertTriangle font-size="18" class="shrink-0" />
                {previewError}
            </p>
        {:else if !report}
            <p class="m-0 text-white/70">{$LL.mapEditor.roomEditor.sameSize()}</p>
        {:else}
            <p class="m-0 flex gap-2 font-bold" data-testid="roomEditorSummary">
                {#if report.newWidth > report.oldWidth}
                    <span>{$LL.mapEditor.roomEditor.addedColumns({ count: report.newWidth - report.oldWidth })}</span>
                {:else if report.newWidth < report.oldWidth}
                    <span>{$LL.mapEditor.roomEditor.removedColumns({ count: report.oldWidth - report.newWidth })}</span>
                {/if}
                {#if report.newHeight > report.oldHeight}
                    <span>{$LL.mapEditor.roomEditor.addedRows({ count: report.newHeight - report.oldHeight })}</span>
                {:else if report.newHeight < report.oldHeight}
                    <span>{$LL.mapEditor.roomEditor.removedRows({ count: report.oldHeight - report.newHeight })}</span>
                {/if}
            </p>
            {#if report.displacedEntities.length > 0}
                <p class="m-0 flex items-start gap-2 text-warning-400">
                    <IconAlertTriangle font-size="18" class="shrink-0" />
                    {$LL.mapEditor.roomEditor.displacedEntities({ count: report.displacedEntities.length })}
                </p>
            {/if}
            {#if report.displacedAreas.length > 0}
                <p class="m-0 flex items-start gap-2 text-warning-400">
                    <IconAlertTriangle font-size="18" class="shrink-0" />
                    {$LL.mapEditor.roomEditor.displacedAreas({ count: report.displacedAreas.length })}
                </p>
            {/if}
            <div class="flex flex-wrap gap-3 text-xs text-white/70">
                <span class="flex items-center gap-1">
                    <span class="inline-block h-3 w-3 rounded-sm bg-[#30a46c]"></span>
                    {$LL.mapEditor.roomEditor.legendRepeated()}
                </span>
                <span class="flex items-center gap-1">
                    <span class="inline-block h-3 w-3 rounded-sm bg-[#e5484d]"></span>
                    {$LL.mapEditor.roomEditor.legendRemoved()}
                </span>
                <span class="flex items-center gap-1">
                    <span class="inline-block h-3 w-3 rounded-sm border-2 border-secondary"></span>
                    {$LL.mapEditor.roomEditor.legendNewSize()}
                </span>
            </div>
        {/if}
        {#if $roomResizeStatusStore.state === "failed"}
            <p class="m-0 flex items-start gap-2 text-danger-400" role="alert">
                <IconAlertTriangle font-size="18" class="shrink-0" />
                {$LL.mapEditor.roomEditor.failed({ reason: $roomResizeStatusStore.reason })}
            </p>
        {/if}
    </section>

    <div class="flex justify-end gap-2">
        <button
            type="button"
            class="rounded-lg px-4 py-2 bg-white/10 hover:bg-white/20"
            disabled={pending}
            onclick={reset}
        >
            {$LL.mapEditor.roomEditor.reset()}
        </button>
        <button
            type="button"
            data-testid="roomEditorApply"
            class="rounded-lg px-4 py-2 font-bold disabled:opacity-50 {confirming
                ? 'bg-warning-600 hover:bg-warning-500'
                : 'bg-secondary hover:bg-secondary-600'}"
            disabled={!report || previewError !== undefined || pending}
            onclick={apply}
        >
            {#if pending}
                {$LL.mapEditor.roomEditor.resizing()}
            {:else if confirming}
                {$LL.mapEditor.roomEditor.confirmApply()}
            {:else}
                {$LL.mapEditor.roomEditor.apply()}
            {/if}
        </button>
    </div>
</div>
