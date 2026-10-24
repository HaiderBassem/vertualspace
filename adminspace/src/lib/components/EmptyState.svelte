<!-- A centered placeholder for empty lists: what is missing, why it matters, and the next action. -->
<script lang="ts">
    import type { Snippet } from "svelte";
    import Icon, { type IconName } from "./Icon.svelte";

    let {
        icon = "inbox",
        title,
        description = undefined,
        actions = undefined,
        compact = false,
    }: {
        icon?: IconName;
        title: string;
        description?: string | undefined;
        actions?: Snippet | undefined;
        compact?: boolean;
    } = $props();
</script>

<div class="flex flex-col items-center text-center {compact ? 'px-4 py-8' : 'px-6 py-14'}">
    <span
        class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
    >
        <Icon name={icon} size={22} />
    </span>
    <p class="text-base font-semibold">{title}</p>
    {#if description}<p class="muted mt-1 max-w-md text-sm">{description}</p>{/if}
    {#if actions}<div class="mt-5 flex flex-wrap justify-center gap-2">{@render actions()}</div>{/if}
</div>
