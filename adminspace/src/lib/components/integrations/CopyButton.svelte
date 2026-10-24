<!-- A button copying a value (a link to place in a room); the result is announced to screen readers. -->
<script lang="ts">
    import { useI18n } from "$lib/i18n/context";

    let { value, label }: { value: string; label: string } = $props();
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

<button type="button" class="btn btn-sm" onclick={copy}>
    <span aria-live="polite">{copied ? i18n.m.integrationCenter.resources.copied : label}</span>
</button>
