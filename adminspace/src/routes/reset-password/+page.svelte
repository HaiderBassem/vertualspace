<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const r = $derived(i18n.m.onboarding.reset);
    const auth = $derived(i18n.m.shell.auth);
    const token = $derived(page.url.searchParams.get("token") ?? "");
    let submitting = $state(false);
    const problem = $derived(form && "problem" in form ? form.problem : undefined);
</script>

<AuthFrame title={r.title} intro={data.valid && !(form && "done" in form) ? r.intro : undefined}>
    {#if form && "done" in form}
        <p class="notice notice-success" role="status"><Icon name="check" /><span>{r.done}</span></p>
        <a class="btn btn-primary w-full" href={resolve("/login")}>{auth.submit}</a>
    {:else if !data.valid || (form && "invalid" in form)}
        <p class="notice notice-warning"><Icon name="alert" /><span>{r.invalid}</span></p>
        <a class="btn w-full" href={resolve("/forgot-password")}>{r.askAgain}</a>
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
            <input type="hidden" name="token" value={token} />
            <div aria-live="polite">
                {#if form && "rateLimited" in form}
                    <p class="notice notice-danger" role="alert">{auth.rateLimited}</p>
                {/if}
            </div>
            <div>
                <label class="label" for="reset-password">{r.password}</label>
                <input
                    class="input"
                    id="reset-password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    required
                    minlength={data.passwordMinLength}
                    maxlength={data.passwordMaxLength}
                    aria-invalid={problem ? "true" : undefined}
                    aria-describedby="reset-password-hint"
                />
                <p class="hint" id="reset-password-hint">
                    {problem === "tooLong"
                        ? i18n.t(auth.passwordTooLong, { max: data.passwordMaxLength })
                        : i18n.t(auth.passwordTooShort, { min: data.passwordMinLength })}
                </p>
            </div>
            <div>
                <label class="label" for="reset-password-confirm">{r.passwordConfirm}</label>
                <input
                    class="input"
                    id="reset-password-confirm"
                    name="passwordConfirm"
                    type="password"
                    autocomplete="new-password"
                    required
                    aria-invalid={form && "mismatch" in form ? "true" : undefined}
                />
                {#if form && "mismatch" in form}<p class="field-error">{auth.passwordMismatch}</p>{/if}
            </div>
            <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{r.submit}</button>
        </form>
    {/if}
</AuthFrame>
