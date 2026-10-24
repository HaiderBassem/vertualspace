<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import CenterTabs from "$lib/components/integrations/CenterTabs.svelte";
    import { deliveryErrorText, eventLabel } from "$lib/components/integrations/messages";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const n = $derived(m.notifications);
    const org = $derived(page.params.org ?? "");

    const op = $derived(formOp(form));
    const errors = $derived(op === "create" ? formErrors(form) : {});
    const values = $derived(op === "create" ? formValuesOf(form) : {});
    const targetProblem = $derived(formField<string>(form, "targetProblem"));
    const created = $derived(formField<{ name: string; signingSecret: string | null }>(form, "created"));
    const test = $derived(formField<{ ok: boolean; httpStatus: number | null; error: string | null }>(form, "test"));

    let kind = $state<PageData["kinds"][number]>(untrack(() => data.preselectedKind));
    let pending = $state<string | null>(null);

    const notice = $derived.by(() => {
        if (op === "update" && formField(form, "saved")) return n.saved;
        if (op === "toggle") return formField<boolean>(form, "enabled") ? n.resumed : n.pausedDone;
        if (op === "remove" && formField(form, "removed")) return n.removed;
        if (op === "create" && created) return n.created;
        return undefined;
    });

    function submitting(key: string) {
        return () => {
            pending = key;
            return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
                await update({ reset: false });
                pending = null;
            };
        };
    }

    function reasonText(reason: string | null): string {
        return reason
            ? ((n.disabledReasons as Record<string, string>)[reason] ?? n.disabledReasons.manual)
            : n.disabledReasons.manual;
    }
</script>

<PageHeader title={n.title} description={n.intro} />
<CenterTabs {org} active="notifications" />

<FormMessage form={notice ? { success: true } : formFeedback(form)} successText={notice} />
{#if created?.signingSecret}
    <section class="notice notice-success mb-6 space-y-2" aria-live="polite">
        <p class="font-semibold">{n.secretTitle} — {created.name}</p>
        <p class="text-sm">{n.secretOnce}</p>
        <CopyText value={created.signingSecret} />
    </section>
{/if}
{#if test}
    <p class="notice {test.ok ? 'notice-success' : 'notice-danger'} mb-4" role={test.ok ? undefined : "alert"}>
        {test.ok
            ? i18n.t(n.testSent, { status: String(test.httpStatus ?? 200) })
            : i18n.t(n.testFailed, { problem: deliveryErrorText(i18n, test.error) })}
    </p>
{/if}

<section class="card mb-8" aria-labelledby="add-destination">
    <h2 id="add-destination" class="mb-4 text-lg font-bold">{n.add}</h2>
    <form
        method="POST"
        action="?/create"
        use:enhance={submitting("create")}
        class="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
        <Field label={n.kind} name="kind" required>
            {#snippet children(a)}
                <select class="select" {...a} name="kind" bind:value={kind}>
                    {#each data.kinds as option (option)}
                        <option value={option}>{n.kinds[option]}</option>
                    {/each}
                </select>
            {/snippet}
        </Field>
        <Field label={n.name} name="name" hint={n.nameHelp} required error={errors.name}>
            {#snippet children(a)}
                <input class="input" {...a} name="name" maxlength="200" value={values.name ?? ""} />
            {/snippet}
        </Field>
        <div class="md:col-span-2">
            <Field label={n.url} name="url" hint={n.urlHelp[kind]} required={kind !== "slack"} error={errors.url}>
                {#snippet children(a)}
                    <input
                        class="input font-mono text-sm"
                        {...a}
                        name="url"
                        type="url"
                        inputmode="url"
                        autocomplete="off"
                        spellcheck="false"
                        maxlength="2048"
                        dir="ltr"
                        aria-invalid={targetProblem ? "true" : a["aria-invalid"]}
                    />
                {/snippet}
            </Field>
            {#if targetProblem}
                <p class="field-error" role="alert">
                    {(m.targetProblems as Record<string, string>)[targetProblem] ?? targetProblem}
                </p>
            {/if}
        </div>
        {#if kind === "slack"}
            <div class="md:col-span-2">
                <Field label={n.channel} name="channel" hint={n.channelHelp}>
                    {#snippet children(a)}
                        <input
                            class="input"
                            {...a}
                            name="channel"
                            maxlength="100"
                            value={values.channel ?? ""}
                            disabled={!data.slackConnected}
                        />
                    {/snippet}
                </Field>
            </div>
        {/if}
        <fieldset class="md:col-span-2" aria-describedby="events-hint">
            <legend class="label">{n.events}</legend>
            <p class="hint" id="events-hint">{n.eventsHelp}</p>
            <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {#each data.eventTypes as type (type)}
                    <label class="choice">
                        <input type="checkbox" name="events" value={type} checked />
                        <span>{eventLabel(i18n, type)} <code class="muted text-xs" dir="ltr">{type}</code></span>
                    </label>
                {/each}
            </div>
            {#if errors.events}<p class="field-error">{n.noEvent}</p>{/if}
        </fieldset>
        <div class="md:col-span-2">
            <button
                class="btn btn-primary"
                type="submit"
                disabled={pending === "create"}
                aria-busy={pending === "create"}>{n.create}</button
            >
        </div>
    </form>
</section>

<h2 class="mb-3 text-lg font-bold">{n.list}</h2>
{#if data.endpoints.length === 0}
    <div class="card"><EmptyState icon="mail" title={n.empty} description={n.emptyHelp} /></div>
{:else}
    <ul class="space-y-4">
        {#each data.endpoints as endpoint (endpoint.id)}
            <li class="card space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-semibold" dir="auto">{endpoint.name}</h3>
                        <p class="muted text-sm">
                            {n.kinds[endpoint.kind]} ·
                            {#if endpoint.urlHint}<code dir="ltr">{endpoint.urlHint}</code
                                >{:else if endpoint.channel}<code dir="ltr">{endpoint.channel}</code>{/if}
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        {#if endpoint.enabled}
                            <span class="badge badge-success">{n.active}</span>
                        {:else}
                            <span class="badge badge-warning">{n.paused}</span>
                        {/if}
                        {#if endpoint.signed}<span class="badge">{n.signed}</span>{/if}
                    </div>
                </div>
                {#if !endpoint.enabled}<p class="notice notice-warning text-sm">
                        {reasonText(endpoint.disabledReason)}
                    </p>{/if}
                <ul class="flex flex-wrap gap-1.5" aria-label={n.events}>
                    {#each endpoint.eventTypes as type (type)}<li class="chip">{eventLabel(i18n, type)}</li>{/each}
                </ul>
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
                    <dt class="muted">{n.lastSuccess}</dt>
                    <dd><DateTime value={endpoint.lastSuccessAt} mode="relative" /></dd>
                    <dt class="muted">{n.lastFailure}</dt>
                    <dd>
                        <DateTime value={endpoint.lastFailureAt} mode="relative" />
                        {#if endpoint.lastError && endpoint.consecutiveFailures > 0}
                            <span class="muted">— {deliveryErrorText(i18n, endpoint.lastError)}</span>
                        {/if}
                    </dd>
                </dl>
                {#if endpoint.consecutiveFailures > 0}
                    <p class="text-sm text-[var(--danger)]">{i18n.p(n.failures, endpoint.consecutiveFailures)}</p>
                {/if}
                <div class="flex flex-wrap items-center gap-2">
                    <form method="POST" action="?/test" use:enhance={submitting(`test-${endpoint.id}`)}>
                        <input type="hidden" name="id" value={endpoint.id} />
                        <button
                            class="btn btn-sm"
                            type="submit"
                            disabled={pending === `test-${endpoint.id}`}
                            aria-busy={pending === `test-${endpoint.id}`}>{n.test}</button
                        >
                    </form>
                    <form method="POST" action="?/toggle" use:enhance={submitting(`toggle-${endpoint.id}`)}>
                        <input type="hidden" name="id" value={endpoint.id} />
                        <input type="hidden" name="enabled" value={endpoint.enabled ? "false" : "true"} />
                        <button class="btn btn-sm" type="submit" disabled={pending === `toggle-${endpoint.id}`}>
                            {endpoint.enabled ? n.pause : n.resume}
                        </button>
                    </form>
                    {#if endpoint.signed}
                        <ConfirmForm
                            action="?/rotate"
                            label={n.rotate}
                            title={n.rotateTitle}
                            description={n.rotateDescription}
                            fields={{ id: endpoint.id }}
                            danger={false}
                            small
                        />
                    {/if}
                    <ConfirmForm
                        action="?/remove"
                        label={n.remove}
                        title={n.removeTitle}
                        description={n.removeDescription}
                        fields={{ id: endpoint.id }}
                        small
                    />
                </div>
                <details>
                    <summary class="cursor-pointer text-sm font-semibold">{n.edit}</summary>
                    <form
                        method="POST"
                        action="?/update"
                        use:enhance={submitting(`update-${endpoint.id}`)}
                        class="mt-3 space-y-3"
                    >
                        <input type="hidden" name="id" value={endpoint.id} />
                        <Field label={n.name} name="name-{endpoint.id}" required>
                            {#snippet children(a)}
                                <input class="input" {...a} name="name" maxlength="200" value={endpoint.name} />
                            {/snippet}
                        </Field>
                        <fieldset>
                            <legend class="label">{n.events}</legend>
                            <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {#each data.eventTypes as type (type)}
                                    <label class="choice">
                                        <input
                                            type="checkbox"
                                            name="events"
                                            value={type}
                                            checked={endpoint.eventTypes.includes(type)}
                                        />
                                        <span>{eventLabel(i18n, type)}</span>
                                    </label>
                                {/each}
                            </div>
                            {#if op === "update" && formField(form, "noEvent") && formField(form, "id") === endpoint.id}
                                <p class="field-error">{n.noEvent}</p>
                            {/if}
                        </fieldset>
                        <button
                            class="btn btn-primary btn-sm"
                            type="submit"
                            disabled={pending === `update-${endpoint.id}`}>{n.save}</button
                        >
                    </form>
                </details>
            </li>
        {/each}
    </ul>
{/if}
