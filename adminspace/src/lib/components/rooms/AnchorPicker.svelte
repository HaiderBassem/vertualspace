<!--
    The 3×3 "keep in place" grid of a resize: the part of the map that does not move. Laid out left to right in every
    language, since left and right are directions on the map, not on the page. Posts `anchor`.
-->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import { RESIZE_ANCHORS, type ResizeAnchor } from "$lib/rooms/size";

    let { anchor = $bindable(), name = "anchor" }: { anchor: ResizeAnchor; name?: string } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);
    const hintId = $props.id();
</script>

<fieldset>
    <legend class="label">{o.size.anchor}</legend>
    <p class="hint !mt-0 mb-2" id={hintId}>{o.size.anchorHint}</p>
    <div class="anchor-grid" dir="ltr" aria-describedby={hintId}>
        {#each RESIZE_ANCHORS as value (value)}
            <label class="anchor-cell" title={o.anchors[value]}>
                <input type="radio" {name} {value} bind:group={anchor} class="sr-only" />
                <span class="anchor-dot" aria-hidden="true"></span>
                <span class="sr-only">{o.anchors[value]}</span>
            </label>
        {/each}
    </div>
    <p class="muted mt-2 text-sm" aria-live="polite">{o.anchors[anchor]}</p>
</fieldset>

<style>
    .anchor-grid {
        display: grid;
        grid-template-columns: repeat(3, 2.5rem);
        grid-template-rows: repeat(3, 2.5rem);
        gap: 0.25rem;
        padding: 0.375rem;
        width: max-content;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface-sunken);
    }
    .anchor-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        cursor: pointer;
        background: var(--surface);
        border: 1px solid var(--border);
    }
    .anchor-cell:hover {
        border-color: var(--border-strong);
    }
    .anchor-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 999px;
        background: var(--border-strong);
    }
    .anchor-cell:has(input:checked) {
        border-color: var(--accent);
        background: var(--accent-soft);
    }
    .anchor-cell:has(input:checked) .anchor-dot {
        width: 0.875rem;
        height: 0.875rem;
        background: var(--accent);
    }
    .anchor-cell:has(input:focus-visible) {
        outline: 2px solid var(--focus);
        outline-offset: 2px;
    }
</style>
