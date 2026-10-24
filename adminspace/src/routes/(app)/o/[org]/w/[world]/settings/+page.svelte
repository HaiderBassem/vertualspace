<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.worlds);
    const g = $derived(w.settings.general);
    const values = $derived(form && "values" in form ? form.values : undefined);
    const errors = $derived(form && "errors" in form ? form.errors : undefined);
    const formMessage = $derived(
        form && ("message" in form || "success" in form)
            ? (form as { message?: "validation"; success?: boolean })
            : null,
    );
    const policies = ["public", "authenticated", "members"] as const;
    let accessPolicy = $state<string>(untrack(() => values?.accessPolicy ?? data.world.accessPolicy));
</script>

<PageHeader title={w.settings.sections.general} />

<div aria-live="polite">
    {#if form && "archived" in form}<p class="notice notice-success mb-4">{g.archived}</p>{/if}
    {#if form && "restored" in form}<p class="notice notice-success mb-4">{g.restored}</p>{/if}
    {#if form && "moved" in form}<p class="notice notice-success mb-4">{i18n.m.workspaces.move.done}</p>{/if}
</div>
<FormMessage form={formMessage} />

<form
    method="POST"
    action="?/update"
    class="card space-y-5"
    use:enhance={() =>
        async ({ update }) =>
            update({ reset: false })}
>
    <Field label={i18n.m.common.labels.name} name="name" required error={errors?.name}>
        {#snippet children(a)}
            <input class="input" {...a} name="name" maxlength="200" value={values?.name ?? data.world.name} />
        {/snippet}
    </Field>
    <div>
        <p class="label">{i18n.m.common.labels.slug}</p>
        <code dir="ltr">{data.world.slug}</code>
        <p class="hint">{g.slugReadOnly}</p>
    </div>
    <Field label={i18n.m.common.labels.description} name="description" error={errors?.description}>
        {#snippet children(a)}
            <textarea class="textarea" rows="3" {...a} name="description" maxlength="2000"
                >{values?.description ?? data.world.description ?? ""}</textarea
            >
        {/snippet}
    </Field>
    <fieldset class="space-y-2">
        <legend class="label">{w.accessPolicy.label}</legend>
        {#each policies as policy (policy)}
            <label class="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
                <input type="radio" name="accessPolicy" value={policy} bind:group={accessPolicy} class="mt-1" />
                <span>
                    <span class="font-semibold">{w.accessPolicy[policy]}</span>
                    <span class="muted block text-sm">{w.accessPolicy.descriptions[policy]}</span>
                </span>
            </label>
        {/each}
    </fieldset>
    <Field label={g.maxUsers} name="maxUsers" required error={errors?.maxUsers} hint={g.maxUsersHint}>
        {#snippet children(a)}
            <input
                class="input max-w-40"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                {...a}
                name="maxUsers"
                value={values?.maxUsers ?? String(data.world.maxUsers)}
            />
        {/snippet}
    </Field>
    <Field
        label={g.expiresAt}
        name="expiresAt"
        error={errors?.expiresAt}
        hint={i18n.t(g.expiresAtHint, { timeZone: data.timeZone })}
    >
        {#snippet children(a)}
            <input
                class="input max-w-64"
                type="datetime-local"
                {...a}
                name="expiresAt"
                value={values?.expiresAt ?? data.expiresAtLocal}
            />
        {/snippet}
    </Field>
    <button class="btn btn-primary" type="submit">{i18n.m.common.actions.saveChanges}</button>
</form>

{#if data.workspaces.length > 1}
    <form method="POST" action="?/move" class="card mt-8 space-y-4" use:enhance aria-labelledby="world-workspace">
        <div>
            <h2 id="world-workspace" class="font-semibold">{i18n.m.workspaces.move.title}</h2>
            <p class="muted mt-1 text-sm">{i18n.m.workspaces.move.intro}</p>
        </div>
        <Field label={i18n.m.workspaces.pick} name="workspaceId" required>
            {#snippet children(a)}
                <select class="select max-w-96" {...a} name="workspaceId" value={data.workspaceId}>
                    {#each data.workspaces as workspace (workspace.id)}
                        <option value={workspace.id}>{workspace.name}</option>
                    {/each}
                </select>
            {/snippet}
        </Field>
        <button class="btn" type="submit">{i18n.m.workspaces.move.submit}</button>
    </form>
{/if}

<section class="card mt-8 space-y-5 border-[var(--danger)]" aria-labelledby="world-danger">
    <h2 id="world-danger" class="text-lg font-bold text-[var(--danger)]">{g.dangerZone}</h2>
    <div class="flex flex-wrap items-center justify-between gap-4">
        {#if data.world.archivedAt}
            <div>
                <p class="font-semibold">{g.restoreTitle}</p>
                <p class="muted text-sm">{g.restoreDescription}</p>
            </div>
            <form method="POST" action="?/restore" use:enhance>
                <button class="btn" type="submit">{g.restore}</button>
            </form>
        {:else}
            <div>
                <p class="font-semibold">{g.archiveTitle}</p>
                <p class="muted text-sm">{g.archiveDescription}</p>
            </div>
            <ConfirmForm
                action="?/archive"
                label={g.archive}
                title={g.archiveTitle}
                description={g.archiveDescription}
            />
        {/if}
    </div>
    {#if data.can["world.delete"]}
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
            <div>
                <p class="font-semibold">{g.deleteTitle}</p>
                <p class="muted text-sm">{g.deleteDescription}</p>
            </div>
            <ConfirmForm
                action="?/delete"
                label={i18n.m.common.actions.delete}
                title={g.deleteTitle}
                description={g.deleteDescription}
                confirmValue={data.world.slug}
            />
        </div>
    {/if}
</section>
