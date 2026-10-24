<!--
    Card that scrolls a wide table horizontally inside itself, so the page never scrolls sideways on narrow
    screens (WCAG 1.4.10 Reflow). It is a named, focusable region so keyboard users can scroll it too.
    `relative` keeps absolutely positioned descendants (the .sr-only header labels) inside the scroll box:
    otherwise their containing block is the page and they widen it.
-->
<script lang="ts">
    import type { Snippet } from "svelte";

    let { label, children }: { label: string; children: Snippet } = $props();
</script>

<!-- A scrollable region must be reachable with the keyboard (axe scrollable-region-focusable, WCAG 2.1.1). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="card relative overflow-x-auto p-0" role="region" aria-label={label} tabindex="0">
    {@render children()}
</div>
