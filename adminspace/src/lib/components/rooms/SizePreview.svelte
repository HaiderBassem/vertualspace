<!--
    Outline of a room now (dashed) and after a resize (filled), to scale, with the kept part where the anchor says.
    Drawn left to right in every language: it is a picture of the map.
-->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import { anchoredOffset, type ResizeAnchor, type RoomSize } from "$lib/rooms/size";

    let { from, to, anchor }: { from: RoomSize; to: RoomSize; anchor: ResizeAnchor } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);
    const offset = $derived(anchoredOffset(from, to, anchor));
    // Both outlines fit in a 200 × 140 box.
    const box = $derived.by(() => {
        const minX = Math.min(0, offset.x);
        const minY = Math.min(0, offset.y);
        const maxX = Math.max(to.width, offset.x + from.width);
        const maxY = Math.max(to.height, offset.y + from.height);
        const scale = Math.min(200 / (maxX - minX), 140 / (maxY - minY));
        return { minX, minY, scale, width: (maxX - minX) * scale, height: (maxY - minY) * scale };
    });
</script>

<figure class="flex flex-col items-start gap-2">
    <svg
        width={box.width + 8}
        height={box.height + 8}
        viewBox="-4 -4 {box.width + 8} {box.height + 8}"
        role="img"
        aria-label={o.size.previewLabel}
    >
        <rect
            x={(0 - box.minX) * box.scale}
            y={(0 - box.minY) * box.scale}
            width={to.width * box.scale}
            height={to.height * box.scale}
            rx="3"
            class="after"
        />
        <rect
            x={(offset.x - box.minX) * box.scale}
            y={(offset.y - box.minY) * box.scale}
            width={from.width * box.scale}
            height={from.height * box.scale}
            rx="3"
            class="now"
        />
    </svg>
    <figcaption class="muted flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span class="inline-flex items-center gap-1.5"
            ><span class="swatch swatch-after" aria-hidden="true"></span>{o.size.legendAfter} · {i18n.t(o.tiles, {
                width: to.width,
                height: to.height,
            })}</span
        >
        <span class="inline-flex items-center gap-1.5"
            ><span class="swatch swatch-now" aria-hidden="true"></span>{o.size.legendNow} · {i18n.t(o.tiles, {
                width: from.width,
                height: from.height,
            })}</span
        >
    </figcaption>
</figure>

<style>
    .after {
        fill: var(--accent-soft);
        stroke: var(--accent);
        stroke-width: 2;
    }
    .now {
        fill: none;
        stroke: var(--text-muted);
        stroke-width: 1.5;
        stroke-dasharray: 4 3;
    }
    .swatch {
        display: inline-block;
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 2px;
    }
    .swatch-after {
        background: var(--accent-soft);
        border: 2px solid var(--accent);
    }
    .swatch-now {
        border: 1.5px dashed var(--text-muted);
    }
</style>
