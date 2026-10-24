<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const u = $derived(i18n.m.catalog.uploadPage);
    let submitting = $state(false);
</script>

<p class="mb-2 text-sm">
    <a href={resolve(`/o/${data.organization.slug}/components`)} class="inline-flex items-center gap-1"
        ><Icon name="chevron-left" size={14} />{i18n.m.catalog.detail.back}</a
    >
</p>

<PageHeader title={u.title} description={u.intro} />

{#if form?.uploadError}
    <div class="notice notice-danger mb-4 flex-col" role="alert">
        <p class="font-semibold">
            {form.uploadError === "quotaExceeded"
                ? i18n.t(u.quotaExceeded, { limit: String("quotaMb" in form ? form.quotaMb : "") })
                : form.uploadError === "rateLimited"
                  ? i18n.m.common.errors.rateLimited
                  : u[form.uploadError]}
        </p>
        {#if form.issues.length > 0}
            <ul class="list-inside list-disc text-sm">
                {#each form.issues as issue, index (index)}
                    <li>{i18n.t(i18n.m.catalog.issues[issue.code], { path: issue.path })}</li>
                {/each}
            </ul>
        {/if}
    </div>
{/if}

<form
    method="POST"
    enctype="multipart/form-data"
    class="card max-w-2xl space-y-5"
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            await update();
            submitting = false;
        };
    }}
>
    <div>
        <label class="label" for="upload-package">{u.file}</label>
        <input
            id="upload-package"
            class="input"
            type="file"
            name="package"
            accept=".zip,application/zip"
            required
            aria-describedby="upload-package-hint"
        />
        <p class="hint" id="upload-package-hint">{u.fileHint}</p>
    </div>
    <p class="muted text-sm">{u.manifestFormat}: <code>{data.schema}</code></p>
    <button class="btn btn-primary" type="submit" disabled={submitting}>
        <Icon name="upload" size={16} />{u.submit}
    </button>
</form>
