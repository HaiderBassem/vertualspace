<!-- A date in a <time> element: ISO 8601 for machines, localized text for people. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";

    let {
        value,
        mode = "dateTime",
    }: { value: Date | string | null | undefined; mode?: "dateTime" | "date" | "relative" } = $props();

    const i18n = useI18n();
    const date = $derived(value ? new Date(value) : undefined);
</script>

{#if date && !Number.isNaN(date.getTime())}
    <time datetime={date.toISOString()} title={i18n.dateTime(date)}>
        {mode === "relative" ? i18n.relative(date) : mode === "date" ? i18n.date(date) : i18n.dateTime(date)}
    </time>
{:else}
    <span class="muted">{i18n.m.common.labels.never}</span>
{/if}
