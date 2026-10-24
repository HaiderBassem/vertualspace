<script lang="ts">
    import { enhance } from "$app/forms";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.shell.account);
    const auth = $derived(i18n.m.shell.auth);

    /** Every action answers with its own fields: read them through one loose view. */
    interface Result {
        section?: "profile" | "preferences" | "password" | "mfa" | "sessions";
        success?: boolean;
        message?: keyof Messages["common"]["errors"];
        errors?: Record<string, keyof Messages["common"]["errors"]>;
        emailTaken?: boolean;
        rateLimited?: boolean;
        passwordError?: "wrongPassword" | "passwordTooShort" | "passwordTooLong" | "passwordMismatch";
        codeError?: "invalid" | "locked";
        mfaSetup?: { token: string; uri: string; base32: string };
        mfaInvalid?: boolean;
        enrolmentExpired?: boolean;
        mfaEnabled?: boolean;
        mfaDisabled?: boolean;
        mfaMandatory?: boolean;
        recoveryCodes?: string[];
        sessionsEnded?: boolean;
    }
    const result = $derived((form ?? {}) as Result);

    const passwordError = $derived.by(() => {
        switch (result.passwordError) {
            case "wrongPassword":
                return m.wrongPassword;
            case "passwordTooShort":
                return i18n.t(auth.passwordTooShort, { min: data.passwordMinLength });
            case "passwordTooLong":
                return i18n.t(auth.passwordTooLong, { max: data.passwordMaxLength });
            case "passwordMismatch":
                return auth.passwordMismatch;
            default:
                return undefined;
        }
    });

    const mfaProblem = $derived.by(() => {
        if (result.section !== "mfa") return undefined;
        if (result.rateLimited) return auth.rateLimited;
        if (result.passwordError) return m.wrongPassword;
        if (result.codeError === "locked") return auth.mfaLocked;
        if (result.codeError === "invalid" || result.mfaInvalid) return auth.mfaInvalid;
        if (result.enrolmentExpired) return m.mfaEnrolmentExpired;
        if (result.mfaMandatory) return m.mfaMandatory;
        return undefined;
    });

    const keep =
        () =>
        async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
            update({ reset: false });
</script>

{#snippet saved(section: Result["section"], text: string = i18n.m.common.saved)}
    {#if result.section === section && result.success}
        <p class="notice notice-success" aria-live="polite">{text}</p>
    {/if}
{/snippet}

{#snippet passwordInput(id: string)}
    <div>
        <label class="label" for={id}>{m.currentPassword}</label>
        <input class="input" {id} name="currentPassword" type="password" autocomplete="current-password" required />
    </div>
{/snippet}

{#snippet codeInput(id: string)}
    <div>
        <label class="label" for={id}>{m.mfaCurrentCode}</label>
        <input
            class="input max-w-56 text-center font-mono text-lg tracking-[0.2em]"
            {id}
            name="code"
            autocomplete="one-time-code"
            autocapitalize="off"
            spellcheck="false"
            maxlength="16"
            dir="ltr"
            required
            aria-describedby="{id}-hint"
        />
        <p class="hint" id="{id}-hint">{auth.mfaCodeHint}</p>
    </div>
{/snippet}

<PageHeader title={m.title} />

{#if data.mustChangePassword}
    <p class="notice notice-danger mb-6" role="alert">{auth.mustChangePassword}</p>
{/if}
{#if data.mfaRequired && !data.profile.mfaEnabled}
    <p class="notice notice-danger mb-6" role="alert">{auth.mfaRequired}</p>
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section class="card space-y-4" aria-labelledby="profile">
        <h2 id="profile" class="text-lg font-bold">{m.profile}</h2>
        {@render saved("profile")}
        {#if result.section === "profile" && result.rateLimited}
            <p class="notice notice-danger" role="alert">{auth.rateLimited}</p>
        {/if}
        {#if result.section === "profile" && result.passwordError}
            <p class="notice notice-danger" role="alert">{m.wrongPassword}</p>
        {/if}
        <form method="POST" action="?/profile" use:enhance={keep} class="space-y-4">
            <Field label={i18n.m.common.labels.name} name="name" required error={result.errors?.name}>
                {#snippet children(a)}
                    <input
                        class="input"
                        {...a}
                        name="name"
                        maxlength="200"
                        autocomplete="name"
                        value={data.profile.name}
                    />
                {/snippet}
            </Field>
            <Field label={i18n.m.common.labels.email} name="email" required error={result.errors?.email}>
                {#snippet children(a)}
                    <input
                        class="input"
                        type="email"
                        {...a}
                        name="email"
                        maxlength="320"
                        autocomplete="email"
                        value={data.profile.email}
                    />
                {/snippet}
            </Field>
            {#if result.section === "profile" && result.emailTaken}<p class="field-error">{m.emailTaken}</p>{/if}
            <Field label={m.currentPassword} name="profile-currentPassword" hint={m.emailChangePassword}>
                {#snippet children(a)}
                    <input
                        class="input"
                        {...a}
                        name="currentPassword"
                        type="password"
                        autocomplete="current-password"
                    />
                {/snippet}
            </Field>
            <button class="btn btn-primary" type="submit">{i18n.m.common.actions.save}</button>
        </form>
    </section>

    <section class="card space-y-4" aria-labelledby="preferences">
        <h2 id="preferences" class="text-lg font-bold">{m.preferences}</h2>
        {@render saved("preferences")}
        <form method="POST" action="?/preferences" class="space-y-4">
            <Field label={i18n.m.common.labels.language} name="locale" hint={m.localeHelp}>
                {#snippet children(a)}
                    <select class="select" {...a} name="locale">
                        <option value="">{m.automatic}</option>
                        {#each data.locales as locale (locale.tag)}
                            <option value={locale.tag} lang={locale.tag} selected={locale.tag === data.profile.locale}
                                >{locale.nativeName}</option
                            >
                        {/each}
                    </select>
                {/snippet}
            </Field>
            <Field label={i18n.m.common.labels.timeZone} name="timeZone" hint={m.timeZoneHelp}>
                {#snippet children(a)}
                    <select class="select" {...a} name="timeZone">
                        <option value="">{m.automatic}</option>
                        {#each data.timeZones as zone (zone)}
                            <option value={zone} selected={zone === data.profile.timeZone}>{zone}</option>
                        {/each}
                    </select>
                {/snippet}
            </Field>
            <button class="btn btn-primary" type="submit">{i18n.m.common.actions.save}</button>
        </form>
    </section>

    <section class="card space-y-4" aria-labelledby="password">
        <h2 id="password" class="text-lg font-bold">{m.changePassword}</h2>
        {@render saved("password", m.passwordChanged)}
        {#if result.section === "password" && result.rateLimited}
            <p class="notice notice-danger" role="alert">{auth.rateLimited}</p>
        {/if}
        {#if result.section === "password" && passwordError}
            <p class="notice notice-danger" role="alert">{passwordError}</p>
        {/if}
        <form method="POST" action="?/password" use:enhance class="space-y-4">
            <input type="text" name="username" autocomplete="username" value={data.profile.email} hidden />
            {@render passwordInput("currentPassword")}
            <div>
                <label class="label" for="newPassword">{m.newPassword}</label>
                <input
                    class="input"
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autocomplete="new-password"
                    minlength={data.passwordMinLength}
                    maxlength={data.passwordMaxLength}
                    required
                    aria-describedby="newPassword-hint"
                />
                <p class="hint" id="newPassword-hint">
                    {i18n.t(auth.passwordTooShort, { min: data.passwordMinLength })}
                </p>
            </div>
            <div>
                <label class="label" for="passwordConfirm">{auth.passwordConfirm}</label>
                <input
                    class="input"
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autocomplete="new-password"
                    required
                />
            </div>
            <button class="btn btn-primary" type="submit">{m.changePassword}</button>
        </form>
    </section>

    <section class="card space-y-4" aria-labelledby="mfa">
        <h2 id="mfa" class="text-lg font-bold">{m.mfa}</h2>
        {#if result.mfaEnabled}<p class="notice notice-success" aria-live="polite">{m.mfaEnabledNow}</p>{/if}
        {#if result.mfaDisabled}<p class="notice notice-success" aria-live="polite">{m.mfaDisabledNow}</p>{/if}
        {#if mfaProblem}<p class="notice notice-danger" role="alert">{mfaProblem}</p>{/if}

        {#if result.recoveryCodes}
            <div class="notice space-y-2" aria-live="polite">
                <h3 class="font-bold">{m.recoveryCodes}</h3>
                <p class="text-sm">{m.recoveryCodesIntro}</p>
                <ul class="grid grid-cols-2 gap-1 font-mono" dir="ltr">
                    {#each result.recoveryCodes as code (code)}<li>{code}</li>{/each}
                </ul>
            </div>
        {/if}

        {#if result.mfaSetup}
            <p>{m.mfaSetupIntro}</p>
            <dl class="space-y-2 text-sm">
                <dt class="font-semibold">{m.mfaSecret}</dt>
                <dd><code class="text-base tracking-wider break-all" dir="ltr">{result.mfaSetup.base32}</code></dd>
                <dt class="font-semibold">{m.mfaUri}</dt>
                <dd>
                    <a class="break-all" dir="ltr" href={result.mfaSetup.uri} rel="external">{result.mfaSetup.uri}</a>
                </dd>
            </dl>
            <form method="POST" action="?/mfaConfirm" use:enhance class="space-y-3">
                <input type="hidden" name="token" value={result.mfaSetup.token} />
                <input type="hidden" name="uri" value={result.mfaSetup.uri} />
                <input type="hidden" name="base32" value={result.mfaSetup.base32} />
                <p class="hint">{m.mfaConfirmIntro}</p>
                <label class="label" for="mfa-code">{auth.mfaCode}</label>
                <input
                    class="input max-w-48 text-center font-mono text-xl tracking-[0.3em]"
                    id="mfa-code"
                    name="code"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="7"
                    dir="ltr"
                    required
                />
                <div><button class="btn btn-primary" type="submit">{m.mfaEnable}</button></div>
            </form>
        {:else if data.profile.mfaEnabled}
            <p>
                <span class="badge badge-success">{i18n.m.common.labels.enabled}</span>
                {m.mfaEnabled}
                <span class="muted text-sm"><DateTime value={data.profile.mfaEnabledAt} mode="date" /></span>
            </p>
            <p class="text-sm">{i18n.p(m.recoveryCodesRemaining, data.recoveryCodesRemaining)}</p>

            <details class="space-y-3">
                <summary class="cursor-pointer font-semibold">{m.recoveryCodesRegenerate}</summary>
                <form method="POST" action="?/recoveryCodes" use:enhance class="mt-3 space-y-3">
                    <p class="hint">{m.recoveryCodesRegenerateIntro}</p>
                    {@render passwordInput("recovery-password")}
                    <button class="btn" type="submit">{m.recoveryCodesRegenerate}</button>
                </form>
            </details>

            <details class="space-y-3">
                <summary class="cursor-pointer font-semibold">{m.mfaReplace}</summary>
                <form method="POST" action="?/mfaStart" use:enhance class="mt-3 space-y-3">
                    <p class="hint">{m.mfaReplaceIntro}</p>
                    {@render passwordInput("replace-password")}
                    {@render codeInput("replace-code")}
                    <button class="btn" type="submit">{m.mfaReplace}</button>
                </form>
            </details>

            {#if !data.mfaMandatory}
                <details class="space-y-3">
                    <summary class="cursor-pointer font-semibold">{m.mfaDisable}</summary>
                    <form method="POST" action="?/mfaDisable" use:enhance class="mt-3 space-y-3">
                        <p class="hint">{m.mfaDisableIntro}</p>
                        {@render passwordInput("disable-password")}
                        {@render codeInput("disable-code")}
                        <button class="btn btn-danger" type="submit">{m.mfaDisable}</button>
                    </form>
                </details>
            {:else}
                <p class="hint">{m.mfaMandatory}</p>
            {/if}
        {:else}
            <p class="muted">{m.mfaDisabled}</p>
            <form method="POST" action="?/mfaStart" use:enhance class="space-y-3">
                <p class="hint">{m.mfaStartIntro}</p>
                {@render passwordInput("start-password")}
                <button class="btn btn-primary" type="submit">{m.mfaStart}</button>
            </form>
        {/if}
    </section>
</div>

<section class="card mt-6 space-y-4" aria-labelledby="sessions">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sessions" class="text-lg font-bold">{m.sessions}</h2>
        {#if data.sessions.length > 1}
            <form method="POST" action="?/endOtherSessions" use:enhance>
                <button class="btn btn-danger btn-sm" type="submit">{m.endOtherSessions}</button>
            </form>
        {/if}
    </div>
    {#if result.sessionsEnded}<p class="notice notice-success" aria-live="polite">{m.sessionsEnded}</p>{/if}
    <div class="relative overflow-x-auto">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{m.device}</th>
                    <th scope="col">{m.ipAddress}</th>
                    <th scope="col">{i18n.m.common.labels.createdAt}</th>
                    <th scope="col">{i18n.m.common.labels.lastSeen}</th>
                </tr>
            </thead>
            <tbody>
                {#each data.sessions as session, index (index)}
                    <tr>
                        <td class="max-w-md text-sm break-words">
                            {session.userAgent ?? i18n.m.common.labels.unknown}
                            {#if session.current}<span class="badge badge-accent ms-1">{m.currentSession}</span>{/if}
                        </td>
                        <td><code dir="ltr">{session.ipAddress ?? ""}</code></td>
                        <td><DateTime value={session.createdAt} /></td>
                        <td><DateTime value={session.lastSeenAt} mode="relative" /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    {#if data.sessions.length <= 1}<p class="muted text-sm">{m.noOtherSessions}</p>{/if}
</section>
