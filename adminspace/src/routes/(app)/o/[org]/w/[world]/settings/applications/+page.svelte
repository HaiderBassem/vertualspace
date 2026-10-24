<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.worlds.settings.applications);

    type Application = PageData["applications"][number];
    const textFields = ["name", "description", "image", "doc", "script", "regexUrl", "targetUrl", "policy"] as const;
    const flags = ["enabled", "default", "forceNewTab", "allowAPI"] as const;
    const urlFields = new Set(["image", "doc", "script"]);

    const blank: Application = {
        name: "",
        enabled: true,
        default: false,
        forceNewTab: false,
        allowAPI: false,
    };

    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
    const errors = $derived(form && "errors" in form ? form.errors : undefined);
    const failedIndex = $derived(form && "values" in form ? Number(form.values?.index ?? -2) : -2);
</script>

{#snippet applicationForm(app: Application, index: number)}
    {@const prefix = `app-${index}`}
    <form method="POST" action="?/save" class="space-y-4" use:enhance>
        <input type="hidden" name="index" value={index} />
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            {#each textFields as field (field)}
                {@const error = failedIndex === index ? errors?.[field] : undefined}
                <div
                    class={field === "description" || field === "regexUrl" || field === "targetUrl"
                        ? "md:col-span-2"
                        : ""}
                >
                    <label class="label" for="{prefix}-{field}">
                        {a.fields[field]}
                        {#if field !== "name"}<span class="muted font-normal">({i18n.m.common.labels.optional})</span
                            >{/if}
                    </label>
                    <input
                        id="{prefix}-{field}"
                        class="input {urlFields.has(field) || field === 'regexUrl' || field === 'targetUrl'
                            ? 'font-mono'
                            : ''}"
                        type={urlFields.has(field) ? "url" : "text"}
                        name={field}
                        required={field === "name"}
                        dir={urlFields.has(field) || field === "regexUrl" || field === "targetUrl" ? "ltr" : undefined}
                        value={app[field] ?? ""}
                        aria-invalid={error ? "true" : undefined}
                        aria-describedby={error
                            ? `${prefix}-${field}-error`
                            : field in a.hints
                              ? `${prefix}-${field}-hint`
                              : undefined}
                    />
                    {#if field in a.hints}
                        <p class="hint" id="{prefix}-{field}-hint">{a.hints[field as keyof typeof a.hints]}</p>
                    {/if}
                    {#if error}<p class="field-error" id="{prefix}-{field}-error">{i18n.m.common.errors[error]}</p>{/if}
                </div>
            {/each}
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
            {#each flags as flag (flag)}
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={flag} checked={app[flag] ?? false} />
                    {a.fields[flag]}
                </label>
            {/each}
        </div>
        <button class="btn btn-primary" type="submit">{i18n.m.common.actions.save}</button>
    </form>
{/snippet}

<PageHeader title={a.title} description={a.intro} />

<div aria-live="polite">
    {#if form && "saved" in form}<p class="notice notice-success mb-4">{a.saved}</p>{/if}
    {#if form && "removed" in form}<p class="notice notice-success mb-4">{a.removed}</p>{/if}
</div>
<FormMessage form={formMessage} />

<div class="space-y-4">
    {#if data.applications.length === 0}
        <p class="card muted">{a.empty}</p>
    {:else}
        <ul class="space-y-3">
            {#each data.applications as app, index (index)}
                <li class="card">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex min-w-0 items-center gap-3">
                            {#if app.image}
                                <img
                                    src={app.image}
                                    alt=""
                                    class="h-8 w-8 shrink-0 rounded object-contain"
                                    loading="lazy"
                                />
                            {/if}
                            <div class="min-w-0">
                                <p class="truncate font-semibold">{app.name}</p>
                                {#if app.description}<p class="muted truncate text-sm">{app.description}</p>{/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="badge {app.enabled ? 'badge-success' : ''}">
                                {app.enabled ? i18n.m.common.labels.enabled : i18n.m.common.labels.disabled}
                            </span>
                            <ConfirmForm
                                action="?/remove"
                                small
                                label={i18n.m.common.actions.remove}
                                title={i18n.t(a.removeTitle, { name: app.name })}
                                fields={{ index: String(index) }}
                            />
                        </div>
                    </div>
                    <details class="mt-3" open={failedIndex === index}>
                        <summary class="cursor-pointer text-sm font-semibold">{a.edit}</summary>
                        <div class="mt-4">{@render applicationForm(app, index)}</div>
                    </details>
                </li>
            {/each}
        </ul>
    {/if}

    <details class="card" open={failedIndex === -1}>
        <summary class="cursor-pointer font-semibold">{a.add}</summary>
        <div class="mt-4">{@render applicationForm(blank, -1)}</div>
    </details>
</div>
