<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formField } from "$lib/components/world/formState";
    import StatusBadge from "$lib/components/integrations/StatusBadge.svelte";
    import { problemText } from "$lib/components/integrations/messages";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const p = $derived(m.personal);
    const formProvider = $derived(formField<string>(form, "provider"));
    let pending = $state<string | null>(null);

    function submitting(key: string) {
        return () => {
            pending = key;
            return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
                await update({ reset: false });
                pending = null;
            };
        };
    }

    function feedback(providerId: string) {
        if (formProvider !== providerId) return null;
        const test = formField<{ ok: true; account: string } | { ok: false; problem: string }>(form, "test");
        const name = m.providers[providerId as PageData["providers"][number]["id"]].name;
        if (test) {
            return test.ok
                ? { ok: true, text: i18n.t(m.provider.testOk, { account: test.account }) }
                : { ok: false, text: i18n.t(m.provider.testFailed, { problem: problemText(i18n, test.problem) }) };
        }
        const disconnected = formField<"revoked" | "unsupported" | "failed">(form, "disconnected");
        if (disconnected) {
            const template =
                disconnected === "revoked"
                    ? m.provider.disconnected
                    : disconnected === "unsupported"
                      ? m.provider.disconnectedManual
                      : m.provider.revokeFailed;
            return { ok: disconnected === "revoked", text: i18n.t(template, { provider: name }) };
        }
        if (formField(form, "settingsSaved")) return { ok: true, text: p.settingsSaved };
        const problem = formField<string>(form, "problem");
        if (problem) return { ok: false, text: problemText(i18n, problem) };
        return null;
    }
</script>

<PageHeader title={p.title} description={p.intro} />

<p class="notice notice-info mb-6 flex items-start gap-2 text-sm">
    <Icon name="lock" size={16} class="mt-0.5 shrink-0" />
    <span>{p.privacy}</span>
</p>

<div aria-live="polite" class="empty:hidden">
    {#if data.flash.connected}
        <p class="notice notice-success mb-4">
            {i18n.t(m.provider.connected, { provider: m.providers[data.flash.connected].name })}
        </p>
    {:else if data.flash.problem}
        <p class="notice notice-danger mb-4" role="alert">{m.problems[data.flash.problem]}</p>
    {/if}
</div>

<ul class="space-y-4">
    {#each data.providers as item (item.id)}
        {@const provider = m.providers[item.id]}
        {@const connection = item.connection}
        {@const result = feedback(item.id)}
        <li class="card space-y-3" aria-labelledby="provider-{item.id}">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 id="provider-{item.id}" class="text-lg font-bold">{provider.name}</h2>
                    <p class="muted text-sm">{provider.usedFor}</p>
                </div>
                {#if !item.available && !connection}
                    <span class="badge">{p.notAvailable}</span>
                {:else}
                    <StatusBadge status={connection ? connection.status : "available"} />
                {/if}
            </div>

            {#if result}
                <p
                    class="notice {result.ok ? 'notice-success' : 'notice-danger'} text-sm"
                    role={result.ok ? undefined : "alert"}
                >
                    {result.text}
                </p>
            {/if}

            {#if !item.available && !connection}
                <p class="muted text-sm">{p.notAvailableHelp}</p>
            {:else}
                {#if connection}
                    <p class="text-sm">
                        {#if connection.externalAccountName}{i18n.t(p.connectedAs, {
                                account: connection.externalAccountName,
                            })}{/if}
                        {#if connection.lastSyncAt}
                            <span class="muted"
                                >· {m.provider.lastSync}
                                <DateTime value={connection.lastSyncAt} mode="relative" /></span
                            >
                        {/if}
                    </p>
                    {#if connection.lastError && connection.status !== "connected"}
                        <p class="notice notice-warning text-sm">{problemText(i18n, connection.lastError)}</p>
                    {/if}
                {:else}
                    <details>
                        <summary class="cursor-pointer text-sm font-semibold">{p.consentTitle}</summary>
                        <p class="mt-2 text-sm">{p.consent[item.id as keyof typeof p.consent]}</p>
                        <p class="muted mt-1 text-sm">{provider.permissions}</p>
                        <ul class="mt-2 flex flex-wrap gap-1.5">
                            {#each item.scopes as scope (scope)}<li>
                                    <code class="chip" dir="ltr">{scope}</code>
                                </li>{/each}
                        </ul>
                    </details>
                {/if}

                {#if connection?.status === "connected"}
                    <form
                        method="POST"
                        action="?/settings"
                        use:enhance={submitting(`settings-${item.id}`)}
                        class="space-y-2"
                    >
                        <input type="hidden" name="provider" value={item.id} />
                        <fieldset class="space-y-2">
                            <legend class="label">{p.settingsTitle}</legend>
                            {#if item.id === "google" || item.id === "microsoft"}
                                <p class="text-sm">{p.calendarSharing.label}</p>
                                <label class="choice">
                                    <input
                                        type="radio"
                                        name="calendarSharing"
                                        value="busy"
                                        checked={connection.settings.calendarSharing === "busy"}
                                    />
                                    <span
                                        ><span class="font-medium">{p.calendarSharing.busy}</span> —
                                        <span class="muted">{p.calendarSharing.busyHelp}</span></span
                                    >
                                </label>
                                <label class="choice">
                                    <input
                                        type="radio"
                                        name="calendarSharing"
                                        value="details"
                                        checked={connection.settings.calendarSharing === "details"}
                                    />
                                    <span
                                        ><span class="font-medium">{p.calendarSharing.details}</span> —
                                        <span class="muted">{p.calendarSharing.detailsHelp}</span></span
                                    >
                                </label>
                            {:else if item.id === "github" || item.id === "gitlab"}
                                <label class="choice">
                                    <input
                                        type="checkbox"
                                        name="shareActivity"
                                        checked={connection.settings.shareActivity}
                                    />
                                    <span>{p.shareActivity}</span>
                                </label>
                            {:else if item.id === "spotify"}
                                <label class="choice">
                                    <input type="checkbox" name="shareMusic" checked={connection.settings.shareMusic} />
                                    <span>{p.shareMusic}</span>
                                </label>
                            {:else if item.id === "slack"}
                                <label class="choice">
                                    <input type="checkbox" name="statusSync" checked={connection.settings.statusSync} />
                                    <span>{p.statusSync}</span>
                                </label>
                                {#if !data.hasCalendar}<p class="hint">{p.statusSyncNeedsCalendar}</p>{/if}
                            {/if}
                        </fieldset>
                        <button class="btn btn-sm" type="submit" disabled={pending === `settings-${item.id}`}
                            >{p.saveSettings}</button
                        >
                    </form>
                {/if}

                <div class="flex flex-wrap items-center gap-2">
                    {#if item.available}
                        <!-- A full page request: the answer is a redirection to the provider. -->
                        <form method="POST" action="?/connect">
                            <input type="hidden" name="provider" value={item.id} />
                            <button class="btn {connection ? '' : 'btn-primary'} btn-sm" type="submit">
                                {connection ? m.provider.reconnect : m.provider.connect}
                            </button>
                        </form>
                    {/if}
                    {#if connection}
                        <form method="POST" action="?/test" use:enhance={submitting(`test-${item.id}`)}>
                            <input type="hidden" name="provider" value={item.id} />
                            <button
                                class="btn btn-sm"
                                type="submit"
                                disabled={pending === `test-${item.id}`}
                                aria-busy={pending === `test-${item.id}`}
                            >
                                {m.provider.test}
                            </button>
                        </form>
                        <ConfirmForm
                            action="?/disconnect"
                            label={m.provider.disconnect}
                            title={i18n.t(m.provider.disconnectTitle, { provider: provider.name })}
                            description={i18n.t(p.disconnectDescription, { provider: provider.name })}
                            fields={{ provider: item.id }}
                            small
                        />
                        {#if item.manageAccessUrl}
                            <!-- eslint-disable svelte/no-navigation-without-resolve -- external address (provider) -->
                            <a
                                class="inline-flex items-center gap-1 text-sm"
                                href={item.manageAccessUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                {i18n.t(m.provider.manageAccess, { provider: provider.name })}<Icon
                                    name="external"
                                    size={14}
                                />
                            </a>
                            <!-- eslint-enable svelte/no-navigation-without-resolve -->
                        {/if}
                    {/if}
                </div>
            {/if}
        </li>
    {/each}
</ul>
