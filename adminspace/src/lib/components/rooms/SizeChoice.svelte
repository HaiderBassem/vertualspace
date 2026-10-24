<!--
    Room size picker: team-size presets (Small, Medium, Large, Huge), optionally the template's own size, and a
    custom width × height. Posts `sizeChoice` and, unless the template size is kept, `width` and `height`.
-->
<script lang="ts">
    import Field from "$lib/components/Field.svelte";
    import { useI18n } from "$lib/i18n/context";
    import {
        MAX_ROOM_TILES,
        MIN_ROOM_TILES,
        ROOM_SIZE_PRESETS,
        presetSize,
        type SizeChoiceValue,
    } from "$lib/rooms/size";

    let {
        legend,
        choice = $bindable(),
        width = $bindable(),
        height = $bindable(),
        templateSize = undefined,
        idPrefix = "size",
        compact = false,
    }: {
        legend: string;
        choice: SizeChoiceValue;
        width: number;
        height: number;
        /** When given, a first option keeps the template's own size. */
        templateSize?: { width: number; height: number } | undefined;
        idPrefix?: string;
        compact?: boolean;
    } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);

    function pick(value: SizeChoiceValue): void {
        choice = value;
        if (value === "template" && templateSize) {
            width = templateSize.width;
            height = templateSize.height;
        } else if (value !== "custom" && value !== "template") {
            const size = presetSize(value);
            width = size.width;
            height = size.height;
        }
    }
</script>

<fieldset class="space-y-3">
    <legend class="label">{legend}</legend>
    <div class="grid gap-2 {compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'}">
        {#if templateSize}
            <label class="choice">
                <input
                    type="radio"
                    name="sizeChoice"
                    value="template"
                    checked={choice === "template"}
                    onchange={() => pick("template")}
                    class="mt-1"
                />
                <span>
                    <span class="block font-semibold">{o.template.asDesigned}</span>
                    <span class="muted block text-sm" dir="ltr"
                        >{i18n.t(o.tiles, { width: templateSize.width, height: templateSize.height })}</span
                    >
                </span>
            </label>
        {/if}
        {#each ROOM_SIZE_PRESETS as preset (preset.key)}
            <label class="choice">
                <input
                    type="radio"
                    name="sizeChoice"
                    value={preset.key}
                    checked={choice === preset.key}
                    onchange={() => pick(preset.key)}
                    class="mt-1"
                />
                <span>
                    <span class="block font-semibold">{o.presets[preset.key].name}</span>
                    <span class="block text-sm">{o.presets[preset.key].people}</span>
                    <span class="muted block text-xs"
                        >{i18n.t(o.tiles, { width: preset.width, height: preset.height })}</span
                    >
                </span>
            </label>
        {/each}
        <label class="choice">
            <input
                type="radio"
                name="sizeChoice"
                value="custom"
                checked={choice === "custom"}
                onchange={() => pick("custom")}
                class="mt-1"
            />
            <span>
                <span class="block font-semibold">{o.size.custom}</span>
                {#if templateSize}<span class="muted block text-xs">{o.template.customHint}</span>{/if}
            </span>
        </label>
    </div>

    {#if choice === "custom"}
        <div class="grid max-w-md grid-cols-2 gap-3">
            <Field label={o.size.width} name="{idPrefix}-width" required>
                {#snippet children(a)}
                    <input
                        class="input"
                        {...a}
                        name="width"
                        type="number"
                        inputmode="numeric"
                        min={MIN_ROOM_TILES}
                        max={MAX_ROOM_TILES}
                        step="1"
                        bind:value={width}
                    />
                {/snippet}
            </Field>
            <Field label={o.size.height} name="{idPrefix}-height" required>
                {#snippet children(a)}
                    <input
                        class="input"
                        {...a}
                        name="height"
                        type="number"
                        inputmode="numeric"
                        min={MIN_ROOM_TILES}
                        max={MAX_ROOM_TILES}
                        step="1"
                        bind:value={height}
                    />
                {/snippet}
            </Field>
        </div>
    {:else if choice !== "template"}
        <input type="hidden" name="width" value={width} />
        <input type="hidden" name="height" value={height} />
    {/if}
</fieldset>
