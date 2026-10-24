<!--
    Initials on a tinted disc. The tint is derived from `seed` (stable per person or organization) and
    stays readable in both themes; no image is fetched. Decorative: the name is always written next to it.
-->
<script lang="ts">
    let {
        name,
        seed = name,
        size = 32,
        imageUrl = undefined,
        square = false,
    }: {
        name: string;
        seed?: string;
        size?: number;
        imageUrl?: string | null | undefined;
        square?: boolean;
    } = $props();

    const initials = $derived(
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => Array.from(part)[0] ?? "")
            .join("")
            .toLocaleUpperCase() || "?",
    );

    function hue(value: string): number {
        let hash = 0;
        for (const char of value) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
        return hash % 360;
    }
    const h = $derived(hue(seed));
</script>

{#if imageUrl}
    <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        class="shrink-0 border border-[var(--border)] bg-[var(--surface)] object-contain {square
            ? 'rounded-[var(--radius)]'
            : 'rounded-full'}"
        style:width="{size}px"
        style:height="{size}px"
        referrerpolicy="no-referrer"
    />
{:else}
    <span
        aria-hidden="true"
        class="avatar inline-flex shrink-0 items-center justify-center font-semibold select-none {square
            ? 'rounded-[var(--radius)]'
            : 'rounded-full'}"
        style:width="{size}px"
        style:height="{size}px"
        style:font-size="{Math.round(size * 0.38)}px"
        style:--h={h}
    >
        {initials}
    </span>
{/if}

<style>
    .avatar {
        background: hsl(var(--h) 55% 92%);
        color: hsl(var(--h) 45% 28%);
    }
    @media (prefers-color-scheme: dark) {
        .avatar {
            background: hsl(var(--h) 35% 22%);
            color: hsl(var(--h) 70% 85%);
        }
    }
</style>
