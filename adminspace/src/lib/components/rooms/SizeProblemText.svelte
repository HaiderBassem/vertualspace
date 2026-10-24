<!-- Why a room's size cannot be read or changed, in the person's language, with map-storage's own words as detail. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";
    import type { ResizeReason, RoomSizeProblem } from "$lib/rooms/size";

    let {
        problem,
        reason = undefined,
        detail = undefined,
    }: {
        problem: RoomSizeProblem;
        reason?: ResizeReason | null | undefined;
        detail?: string | null | undefined;
    } = $props();

    const i18n = useI18n();
    const o = $derived(i18n.m.office);
    const text = $derived(
        problem === "unresizable"
            ? i18n.t(o.problems.unresizable, { reason: o.reasons[reason ?? "unknown"] })
            : o.problems[problem],
    );
</script>

<span class="block">
    {text}
    {#if detail}
        <details class="mt-1 text-xs">
            <summary class="cursor-pointer">{o.technicalDetail}</summary>
            <code dir="ltr" class="mt-1 block break-words">{detail}</code>
        </details>
    {/if}
</span>
