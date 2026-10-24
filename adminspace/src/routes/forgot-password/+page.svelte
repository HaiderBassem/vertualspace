<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const f = $derived(i18n.m.onboarding.forgot);
    let submitting = $state(false);
</script>

<AuthFrame title={f.title} intro={data.available && !(form && "sent" in form) ? f.intro : undefined}>
    {#if !data.available || (form && "unavailable" in form)}
        <p class="notice notice-info"><Icon name="info" /><span>{f.unavailable}</span></p>
    {:else if form && "sent" in form}
        <p class="notice notice-success" role="status"><Icon name="mail" /><span>{f.sent}</span></p>
    {:else}
        <form
            method="POST"
            class="space-y-4"
            use:enhance={() => {
                submitting = true;
                return async ({ update }) => {
                    await update({ reset: false });
                    submitting = false;
                };
            }}
        >
            <div aria-live="polite">
                {#if form && "rateLimited" in form}
                    <p class="notice notice-danger" role="alert">{i18n.m.shell.auth.rateLimited}</p>
                {/if}
            </div>
            <div>
                <label class="label" for="forgot-email">{f.email}</label>
                <input
                    class="input"
                    id="forgot-email"
                    name="email"
                    type="email"
                    autocomplete="username"
                    required
                    value={form && "email" in form ? form.email : ""}
                    aria-invalid={form && "invalid" in form ? "true" : undefined}
                />
                {#if form && "invalid" in form}<p class="field-error">{i18n.m.common.errors.invalidEmail}</p>{/if}
            </div>
            <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{f.submit}</button>
        </form>
    {/if}
    {#snippet footer()}
        <a href={resolve("/login")}>{f.backToLogin}</a>
    {/snippet}
</AuthFrame>
