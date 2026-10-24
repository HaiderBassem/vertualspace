<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const auth = $derived(i18n.m.shell.auth);
    const problem = $derived(
        form && "locked" in form && form.locked
            ? auth.mfaLocked
            : form && "rateLimited" in form && form.rateLimited
              ? auth.rateLimited
              : form && "invalid" in form && form.invalid
                ? auth.mfaInvalid
                : undefined,
    );
    const locked = $derived(Boolean(form && "locked" in form && form.locked));
</script>

<svelte:head><title>{auth.mfaTitle} · {i18n.m.common.appName}</title></svelte:head>

<main id="main" class="flex min-h-dvh items-center justify-center p-4">
    <form method="POST" class="card w-full max-w-sm space-y-4" use:enhance>
        <div>
            <h1 class="text-xl font-bold">{auth.mfaTitle}</h1>
            <p class="muted mt-1 text-sm">{auth.mfaIntro}</p>
        </div>
        {#if problem}<p class="notice notice-danger" role="alert">{problem}</p>{/if}
        {#if locked}
            <a class="btn btn-primary w-full" href={resolve("/login")} data-sveltekit-reload>{auth.loginTitle}</a>
        {:else}
            <input type="hidden" name="redirectTo" value={data.redirectTo} />
            <div>
                <label class="label" for="code">{auth.mfaCode}</label>
                <input
                    class="input text-center font-mono text-xl tracking-[0.2em]"
                    id="code"
                    name="code"
                    autocomplete="one-time-code"
                    autocapitalize="off"
                    spellcheck="false"
                    maxlength="16"
                    required
                    dir="ltr"
                    aria-describedby="code-hint"
                />
                <p class="hint" id="code-hint">{auth.mfaCodeHint}</p>
            </div>
            <button class="btn btn-primary w-full" type="submit">{i18n.m.common.actions.confirm}</button>
        {/if}
    </form>
    <form method="POST" action="/logout" class="fixed end-4 top-4">
        <button class="btn btn-sm btn-ghost" type="submit">{i18n.m.common.actions.logout}</button>
    </form>
</main>
