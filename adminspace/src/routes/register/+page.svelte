<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import AuthFrame from "$lib/components/AuthFrame.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { SLUG_INPUT_PATTERN, suggestSlug } from "$lib/components/worlds/slug";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const r = $derived(i18n.m.onboarding.register);
    const auth = $derived(i18n.m.shell.auth);
    let submitting = $state(false);

    const seed = untrack(() => (form && "values" in form ? form.values : undefined));
    let organizationName = $state(seed?.organizationName ?? "");
    let organizationSlug = $state(seed?.organizationSlug ?? "");
    let slugEdited = $state(Boolean(seed?.organizationSlug));
    $effect(() => {
        if (!slugEdited) organizationSlug = suggestSlug(organizationName);
    });

    const field = $derived(form && "field" in form ? form.field : undefined);
    const fieldError = $derived(form && "error" in form ? form.error : undefined);
    const unavailable = $derived(
        data.availability === "closed" || data.availability === "needsMail" || (form && "unavailable" in form),
    );

    function errorFor(name: string): string | undefined {
        if (field !== name || !fieldError) return undefined;
        switch (fieldError) {
            case "tooShort":
                return i18n.t(auth.passwordTooShort, { min: data.passwordMinLength });
            case "tooLong":
                return i18n.t(auth.passwordTooLong, { max: data.passwordMaxLength });
            case "mismatch":
                return auth.passwordMismatch;
            case "slugTaken":
                return i18n.m.common.errors.slugTaken;
            default:
                return name === "email" ? i18n.m.common.errors.invalidEmail : i18n.m.common.errors.validation;
        }
    }
</script>

{#snippet input(name: string, label: string, type: string, autocomplete: AutoFill, value = "", hint?: string)}
    {@const error = errorFor(name)}
    <div>
        <label class="label" for="register-{name}">{label}</label>
        <input
            class="input"
            id="register-{name}"
            {name}
            {type}
            {autocomplete}
            required
            {value}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={[hint ? `register-${name}-hint` : "", error ? `register-${name}-error` : ""]
                .filter(Boolean)
                .join(" ") || undefined}
            minlength={type === "password" ? data.passwordMinLength : undefined}
            maxlength={type === "password" ? data.passwordMaxLength : 320}
        />
        {#if hint}<p class="hint" id="register-{name}-hint">{hint}</p>{/if}
        {#if error}<p class="field-error" id="register-{name}-error">{error}</p>{/if}
    </div>
{/snippet}

{#if form && "pending" in form}
    <AuthFrame title={r.pendingTitle}>
        <div class="flex flex-col items-center gap-4 text-center" role="status">
            <span
                class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"
            >
                <Icon name="mail" size={22} />
            </span>
            <p>{i18n.t(r.pending, { email: form.email ?? "" })}</p>
            <p class="muted text-sm">{r.pendingHint}</p>
        </div>
        {#snippet footer()}
            <a href={resolve("/login")}>{r.login}</a>
        {/snippet}
    </AuthFrame>
{:else if unavailable}
    <AuthFrame title={r.title}>
        <p class="notice notice-info">
            <Icon name="info" />
            <span>{data.availability === "needsMail" ? r.needsMail : r.closed}</span>
        </p>
        {#snippet footer()}
            {r.haveAccount} <a href={resolve("/login")}>{r.login}</a>
        {/snippet}
    </AuthFrame>
{:else}
    <AuthFrame title={r.title} intro={r.intro} wide>
        <form
            method="POST"
            class="space-y-6"
            novalidate
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
                    <p class="notice notice-danger" role="alert">{auth.rateLimited}</p>
                {:else if form && "accountExists" in form}
                    <p class="notice notice-danger" role="alert">{r.accountExists}</p>
                {:else if form && "field" in form}
                    <p class="notice notice-danger" role="alert">{i18n.m.common.errors.validation}</p>
                {/if}
            </div>

            <fieldset class="space-y-4">
                <legend class="section-title mb-3">{r.accountSection}</legend>
                {@render input("name", r.name, "text", "name", seed?.name ?? "")}
                {@render input("email", r.email, "email", "email", seed?.email ?? "")}
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {@render input("password", r.password, "password", "new-password")}
                    {@render input("passwordConfirm", r.passwordConfirm, "password", "new-password")}
                </div>
                <p class="hint !mt-1">{i18n.t(auth.passwordTooShort, { min: data.passwordMinLength })}</p>
            </fieldset>

            <fieldset class="space-y-4">
                <legend class="section-title mb-3">{r.organizationSection}</legend>
                <div>
                    <label class="label" for="register-organizationName">{r.organizationName}</label>
                    <input
                        class="input"
                        id="register-organizationName"
                        name="organizationName"
                        autocomplete="organization"
                        required
                        maxlength="200"
                        bind:value={organizationName}
                    />
                </div>
                <div>
                    <label class="label" for="register-organizationSlug">{r.organizationSlug}</label>
                    <input
                        class="input font-mono"
                        id="register-organizationSlug"
                        name="organizationSlug"
                        required
                        maxlength="64"
                        pattern={SLUG_INPUT_PATTERN}
                        autocomplete="off"
                        spellcheck="false"
                        aria-invalid={errorFor("organizationSlug") ? "true" : undefined}
                        aria-describedby="register-organizationSlug-hint"
                        bind:value={organizationSlug}
                        oninput={() => (slugEdited = true)}
                    />
                    <p class="hint" id="register-organizationSlug-hint">
                        {i18n.t(r.organizationSlugHint, { slug: organizationSlug || "…" })}
                    </p>
                    {#if errorFor("organizationSlug")}
                        <p class="field-error">{errorFor("organizationSlug")}</p>
                    {/if}
                </div>
            </fieldset>

            <!-- Honeypot: invisible and unreachable for people and assistive technologies. -->
            <div class="hidden" aria-hidden="true">
                <label>Website <input name="website" tabindex="-1" autocomplete="off" /></label>
            </div>

            <p class="muted text-xs">{r.terms}</p>
            <button class="btn btn-primary w-full" type="submit" disabled={submitting}>{r.submit}</button>
        </form>
        {#snippet footer()}
            {r.haveAccount} <a href={resolve("/login")}>{r.login}</a>
        {/snippet}
    </AuthFrame>
{/if}
