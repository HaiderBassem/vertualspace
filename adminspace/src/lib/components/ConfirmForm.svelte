<!--
    A button that asks for confirmation in a modal <dialog> before posting a form action.
    With `confirmValue`, the person must type that value first (for irreversible deletions); with
    `passwordLabel`, they also give their password (posted as `password`, checked by the action).
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import { useI18n } from "$lib/i18n/context";

    let {
        action,
        label,
        title = undefined,
        description = undefined,
        fields = {},
        danger = true,
        primary = false,
        small = false,
        confirmValue = undefined,
        passwordLabel = undefined,
    }: {
        action: string;
        label: string;
        title?: string | undefined;
        description?: string | undefined;
        fields?: Record<string, string>;
        danger?: boolean;
        /** The trigger button is the page's main action (only when not `danger`). */
        primary?: boolean;
        small?: boolean;
        confirmValue?: string | undefined;
        passwordLabel?: string | undefined;
    } = $props();

    const i18n = useI18n();
    const titleId = $props.id();
    let dialog: HTMLDialogElement | undefined = $state();
    let typed = $state("");
    const canConfirm = $derived(!confirmValue || typed === confirmValue);
</script>

<button
    type="button"
    class="btn {danger ? 'btn-danger' : primary ? 'btn-primary' : ''} {small ? 'btn-sm' : ''}"
    onclick={() => {
        typed = "";
        dialog?.showModal();
    }}
>
    {label}
</button>

<dialog
    bind:this={dialog}
    class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] backdrop:bg-black/50"
    aria-labelledby={titleId}
>
    <form
        method="POST"
        {action}
        class="space-y-4 p-6"
        use:enhance={() =>
            async ({ update }) => {
                dialog?.close();
                await update();
            }}
    >
        <h2 id={titleId} class="text-lg font-bold">{title ?? i18n.m.common.areYouSure}</h2>
        {#if description}<p class="muted">{description}</p>{/if}
        {#each Object.entries(fields) as [name, value] (name)}
            <input type="hidden" {name} {value} />
        {/each}
        {#if confirmValue}
            <label class="block">
                <span class="label">{i18n.t(i18n.m.common.confirmDelete, { value: confirmValue })}</span>
                <input class="input" bind:value={typed} autocomplete="off" spellcheck="false" />
            </label>
        {/if}
        {#if passwordLabel}
            <label class="block">
                <span class="label">{passwordLabel}</span>
                <input class="input" type="password" name="password" autocomplete="current-password" required />
            </label>
        {/if}
        <div class="flex justify-end gap-2">
            <button type="button" class="btn" onclick={() => dialog?.close()}>{i18n.m.common.actions.cancel}</button>
            <button type="submit" class="btn {danger ? 'btn-danger' : 'btn-primary'}" disabled={!canConfirm}>
                {i18n.m.common.actions.confirm}
            </button>
        </div>
    </form>
</dialog>
