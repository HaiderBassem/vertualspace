<!-- A value with a button copying it to the clipboard; the result is announced to screen readers. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";

    let { value }: { value: string } = $props();
    const i18n = useI18n();
    let copied = $state(false);

    async function copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(value);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {
            copied = false;
        }
    }
</script>

<div class="flex min-w-0 items-center gap-2">
    <code class="min-w-0 flex-1 truncate rounded bg-[var(--surface-sunken)] px-2 py-1" dir="ltr">{value}</code>
    <button type="button" class="btn btn-sm" onclick={copy}>
        <span aria-live="polite">{copied ? i18n.m.common.actions.copied : i18n.m.common.actions.copy}</span>
    </button>
</div>
