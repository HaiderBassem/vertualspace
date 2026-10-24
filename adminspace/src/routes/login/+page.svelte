<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const auth = $derived(i18n.m.shell.auth);
    let submitting = $state(false);

    // A locked account answers like a wrong password: the page cannot reveal which emails exist.
    const errorText = $derived(
        form?.reason === "rateLimited"
            ? auth.rateLimited
            : form?.reason === "disabled"
              ? auth.disabled
              : form?.reason
                ? auth.invalidCredentials
                : undefined,
    );
</script>

<AuthFrame title={auth.loginTitle} intro={auth.loginIntro}>
    <form
        method="POST"
        class="space-y-4"
        use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
                await update();
                submitting = false;
            };
        }}
    >
        {#if errorText}<p class="notice notice-danger" role="alert">{errorText}</p>{/if}
        <input type="hidden" name="redirectTo" value={data.redirectTo} />
        <div>
            <label class="label" for="email">{i18n.m.common.labels.email}</label>
            <input
                class="input"
                id="email"
                name="email"
                type="email"
                autocomplete="username"
                required
                value={form?.email ?? ""}
            />
        </div>
        <div>
            <div class="flex items-baseline justify-between gap-3">
                <label class="label" for="password">{auth.password}</label>
                {#if data.resetAvailable}
                    <a class="text-sm" href={resolve("/forgot-password")}>{i18n.m.onboarding.forgot.link}</a>
                {/if}
            </div>
            <input
                class="input"
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
            />
        </div>
        <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{auth.submit}</button>
    </form>
    {#snippet footer()}
        {#if data.registrationOpen}
            <a href={resolve("/register")}>{i18n.m.onboarding.register.title}</a>
        {/if}
    {/snippet}
</AuthFrame>
