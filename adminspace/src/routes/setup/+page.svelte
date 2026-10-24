<script lang="ts">
    import { enhance } from "$app/forms";
    import LocaleSwitcher from "$lib/components/LocaleSwitcher.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const auth = $derived(i18n.m.shell.auth);

    type FieldName = "setupToken" | "name" | "email" | "password" | "passwordConfirm";

    const fields: {
        name: FieldName;
        type: "text" | "email" | "password";
        autocomplete: "name" | "email" | "new-password" | "off";
    }[] = [
        { name: "setupToken", type: "password", autocomplete: "off" },
        { name: "name", type: "text", autocomplete: "name" },
        { name: "email", type: "email", autocomplete: "email" },
        { name: "password", type: "password", autocomplete: "new-password" },
        { name: "passwordConfirm", type: "password", autocomplete: "new-password" },
    ];
    const visibleFields = $derived(fields.filter((f) => f.name !== "setupToken" || data.availability === "token"));

    function labelFor(name: FieldName): string {
        switch (name) {
            case "setupToken":
                return auth.setupToken;
            case "name":
                return i18n.m.common.labels.name;
            case "email":
                return i18n.m.common.labels.email;
            case "password":
                return auth.password;
            case "passwordConfirm":
                return auth.passwordConfirm;
        }
    }

    function errorFor(name: FieldName): string | undefined {
        if (form?.field !== name) return undefined;
        switch (name) {
            case "setupToken":
                return auth.setupTokenInvalid;
            case "password":
                return "problem" in form && form.problem === "tooLong"
                    ? i18n.t(auth.passwordTooLong, { max: data.passwordMaxLength })
                    : i18n.t(auth.passwordTooShort, { min: data.passwordMinLength });
            case "passwordConfirm":
                return auth.passwordMismatch;
            case "email":
                return i18n.m.common.errors.invalidEmail;
            case "name":
                return i18n.m.common.errors.requiredField;
        }
    }

    function valueFor(name: FieldName): string {
        if (name === "name" || name === "email") return form?.values?.[name] ?? "";
        return "";
    }

    const rateLimited = $derived(Boolean(form && "rateLimited" in form && form.rateLimited));
</script>

<svelte:head><title>{auth.setupTitle}</title></svelte:head>

<main id="main" class="flex min-h-dvh items-center justify-center p-4">
    <div class="w-full max-w-md space-y-6">
        <div class="flex items-center justify-between">
            <p class="text-lg font-bold">{i18n.m.common.appName}</p>
            <LocaleSwitcher />
        </div>
        {#if data.availability === "disabled"}
            <section class="card space-y-3">
                <h1 class="text-xl font-bold">{auth.setupTitle}</h1>
                <p class="notice">{auth.setupDisabled}</p>
                <pre class="overflow-x-auto rounded bg-[var(--surface-sunken)] p-3 text-sm" dir="ltr"><code
                        >npm run superadmin:create -- --email admin@example.com --name "Admin"</code
                    ></pre>
            </section>
        {:else}
            <form method="POST" class="card space-y-4" use:enhance>
                <div>
                    <h1 class="text-xl font-bold">{auth.setupTitle}</h1>
                    <p class="muted mt-1 text-sm">{auth.setupIntro}</p>
                </div>
                {#if rateLimited}<p class="notice notice-danger" role="alert">{auth.rateLimited}</p>{/if}
                {#each visibleFields as field (field.name)}
                    {@const error = errorFor(field.name)}
                    <div>
                        <label class="label" for={field.name}>{labelFor(field.name)}</label>
                        <input
                            class="input"
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            autocomplete={field.autocomplete}
                            required
                            minlength={field.name === "password" || field.name === "passwordConfirm"
                                ? data.passwordMinLength
                                : undefined}
                            value={valueFor(field.name)}
                            aria-invalid={error ? "true" : undefined}
                            aria-describedby={[
                                field.name === "setupToken" ? "setupToken-hint" : "",
                                error ? `${field.name}-error` : "",
                            ]
                                .filter(Boolean)
                                .join(" ") || undefined}
                        />
                        {#if field.name === "setupToken"}
                            <p class="hint" id="setupToken-hint">{auth.setupTokenHelp}</p>
                        {/if}
                        {#if error}<p class="field-error" id="{field.name}-error">{error}</p>{/if}
                    </div>
                {/each}
                <button class="btn btn-primary w-full" type="submit">{i18n.m.common.actions.create}</button>
            </form>
        {/if}
    </div>
</main>
