<!--
    Form-level feedback after an action, announced to screen readers (WCAG 2.2: 4.1.3 Status messages).
    Errors are message codes of messages.common.errors; success shows `successText` (default: "Changes saved.").
-->
<script lang="ts">
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";

    let {
        form,
        successText = undefined,
    }: {
        form: { message?: keyof Messages["common"]["errors"]; success?: boolean } | null | undefined;
        successText?: string | undefined;
    } = $props();

    const i18n = useI18n();
</script>

<div aria-live="polite" class="empty:hidden">
    {#if form?.message}
        <p class="notice notice-danger mb-4" role="alert">{i18n.m.common.errors[form.message]}</p>
    {:else if form?.success}
        <p class="notice notice-success mb-4">{successText ?? i18n.m.common.saved}</p>
    {/if}
</div>
