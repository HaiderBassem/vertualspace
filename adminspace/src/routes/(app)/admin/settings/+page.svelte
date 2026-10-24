<script lang="ts">
    import { enhance } from "$app/forms";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.settings);

    type ErrorCode = keyof Messages["common"]["errors"];
    const errors = $derived((form && "errors" in form ? form.errors : {}) as Record<string, ErrorCode | undefined>);
    // After a failed submit, show what was typed; otherwise what is saved.
    const values = $derived(
        (form && "values" in form ? form.values : data.values) as Record<string, string | boolean | undefined>,
    );
    const text = (name: string): string => {
        const value = values[name];
        return typeof value === "string" ? value : "";
    };

    type UrlField = "playUrl" | "pusherInternalUrl" | "startRoomUrl" | "mapStoragePublicUrl" | "mapStorageInternalUrl";
</script>

{#snippet urlField(name: UrlField, label: string, hint?: string)}
    <Field {label} {name} {hint} error={errors[name]}>
        {#snippet children(a)}
            <input
                class="input font-mono"
                dir="ltr"
                {...a}
                {name}
                type={name === "startRoomUrl" ? "text" : "url"}
                value={text(name)}
                placeholder={data.effective[name]}
            />
        {/snippet}
    </Field>
{/snippet}

{#snippet secretField(
    name: "mapStorageApiToken" | "mapStorageWebhookToken" | "livekitApiSecret",
    label: string,
    help?: string,
)}
    <Field {label} {name} hint={data.secrets[name] ? m.secretKept : help} error={errors[name]}>
        {#snippet children(a)}
            <input class="input font-mono" dir="ltr" type="password" autocomplete="off" {...a} {name} />
        {/snippet}
    </Field>
    {#if data.secrets[name]}
        <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" name="clear_{name}" />
            {m.secretClear}
        </label>
    {/if}
{/snippet}

<PageHeader title={m.title} description={m.intro} />
<FormMessage form={form && "message" in form ? form : form && "success" in form ? { success: true } : null} />
<p class="notice mb-6 text-sm">{m.restartNote}</p>

<form
    method="POST"
    use:enhance={() =>
        async ({ update }) =>
            update({ reset: false })}
    class="space-y-6"
>
    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{m.sections.workadventure}</legend>
        {@render urlField("playUrl", m.playUrl, m.playUrlHelp)}
        {@render urlField("pusherInternalUrl", m.pusherInternalUrl, m.pusherInternalUrlHelp)}
        {@render urlField("startRoomUrl", m.startRoomUrl, m.startRoomUrlHelp)}
    </fieldset>

    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{m.sections.mapStorage}</legend>
        {@render urlField("mapStoragePublicUrl", m.mapStoragePublicUrl)}
        {@render urlField("mapStorageInternalUrl", m.mapStorageInternalUrl)}
        {@render secretField("mapStorageApiToken", m.mapStorageApiToken)}
        {@render secretField("mapStorageWebhookToken", m.mapStorageWebhookToken, m.mapStorageWebhookTokenHelp)}
        {#if data.webhookTokenFromEnvironment}<p class="hint">{m.mapStorageWebhookTokenFromEnvironment}</p>{/if}
        <div class="rounded-lg border border-[var(--border)] p-3 text-sm">
            <p class="font-semibold">{m.mapStorageWebhookTitle}</p>
            <p class="muted mt-1">{m.mapStorageWebhookIntro}</p>
            <dl class="mt-2 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-3">
                <dt class="muted">WEB_HOOK_URL</dt>
                <dd><code dir="ltr" class="break-all">{data.webhookUrl}</code></dd>
                <dt class="muted">WEB_HOOK_API_TOKEN</dt>
                <dd>{m.mapStorageWebhookSameToken}</dd>
            </dl>
            <p class="muted mt-2 text-xs">{m.mapStorageWebhookPrivate}</p>
        </div>
    </fieldset>

    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{m.sections.media}</legend>
        <p class="hint">{m.livekitHelp}</p>
        <Field label={m.livekitHost} name="livekitHost" error={errors.livekitHost}>
            {#snippet children(a)}
                <input
                    class="input font-mono"
                    dir="ltr"
                    type="url"
                    {...a}
                    name="livekitHost"
                    value={text("livekitHost")}
                />
            {/snippet}
        </Field>
        <Field label={m.livekitApiKey} name="livekitApiKey" error={errors.livekitApiKey}>
            {#snippet children(a)}
                <input class="input font-mono" dir="ltr" {...a} name="livekitApiKey" value={text("livekitApiKey")} />
            {/snippet}
        </Field>
        {@render secretField("livekitApiSecret", m.livekitApiSecret)}
        <div>
            <label class="label" for="iceServers">{m.iceServers}</label>
            <textarea
                class="textarea font-mono text-sm"
                id="iceServers"
                name="iceServers"
                dir="ltr"
                rows="6"
                aria-invalid={form && "iceServersInvalid" in form ? "true" : undefined}
                aria-describedby="iceServers-hint{form && 'iceServersInvalid' in form ? ' iceServers-error' : ''}"
                >{text("iceServers")}</textarea
            >
            <p class="hint" id="iceServers-hint">{m.iceServersHelp}</p>
            {#if form && "iceServersInvalid" in form}
                <p class="field-error" id="iceServers-error">{m.invalidIceServers}</p>
            {/if}
        </div>
    </fieldset>

    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{m.sections.permissions}</legend>
        <div>
            <label class="label" for="globalMapEditors">{m.globalMapEditors}</label>
            <textarea
                class="textarea font-mono text-sm"
                id="globalMapEditors"
                name="globalMapEditors"
                dir="ltr"
                rows="4">{text("globalMapEditors")}</textarea
            >
            <p class="hint">{m.globalMapEditorsHelp}</p>
        </div>
        <label class="flex items-center gap-2">
            <input
                type="checkbox"
                name="selfServiceOrganizations"
                checked={values.selfServiceOrganizations === true || values.selfServiceOrganizations === "on"}
            />
            {m.selfServiceOrganizations}
        </label>
    </fieldset>

    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{i18n.m.control.registration.title}</legend>
        <p class="muted text-sm">{i18n.m.control.registration.intro}</p>
        <div>
            <label class="label" for="registration">{i18n.m.control.registration.mode}</label>
            <select class="select" id="registration" name="registration" value={values.registration ?? "closed"}>
                <option value="closed">{i18n.m.control.registration.closed}</option>
                <option value="open">{i18n.m.control.registration.open}</option>
            </select>
        </div>
        <div>
            <label class="flex items-center gap-2">
                <input
                    type="checkbox"
                    name="registrationEmailVerification"
                    checked={values.registrationEmailVerification === true ||
                        values.registrationEmailVerification === "on"}
                    aria-describedby="registration-verification-hint"
                />
                {i18n.m.control.registration.verification}
            </label>
            <p class="hint" id="registration-verification-hint">{i18n.m.control.registration.verificationHint}</p>
        </div>
        <dl
            class="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm sm:grid-cols-2"
        >
            <div>
                <dt class="section-title">{i18n.m.control.registration.mailStatus}</dt>
                <dd class="mt-1">
                    {data.mailConfigured
                        ? i18n.m.control.registration.mailConfigured
                        : i18n.m.control.registration.mailMissing}
                </dd>
            </div>
            <div>
                <dt class="section-title">{i18n.m.control.registration.effective}</dt>
                <dd class="mt-1">{i18n.m.control.registration.availability[data.registrationAvailability]}</dd>
            </div>
        </dl>
    </fieldset>

    <fieldset class="card space-y-4">
        <legend class="px-1 text-lg font-bold">{m.sections.retention}</legend>
        <p class="muted text-sm">{m.retentionIntro}</p>
        {#each ["auditLogRetentionDays", "inactiveBanRetentionDays", "closedReportRetentionDays", "recordingEventRetentionDays"] as const as name (name)}
            <Field
                label={m[name]}
                {name}
                hint={i18n.t(m.retentionDefault, { days: data.retention.defaults[name] })}
                error={errors[name]}
            >
                {#snippet children(a)}
                    <input
                        class="input max-w-40"
                        type="number"
                        min="1"
                        max="3650"
                        step="1"
                        inputmode="numeric"
                        {...a}
                        {name}
                        value={text(name)}
                        placeholder={String(data.retention.defaults[name])}
                    />
                {/snippet}
            </Field>
        {/each}
    </fieldset>

    <button class="btn btn-primary" type="submit">{i18n.m.common.actions.saveChanges}</button>
</form>
