<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const t = $derived(i18n.m.people.tags);
    const canManage = $derived(data.can["tag.manage"]);
    const nameTaken = $derived(formField<boolean>(form, "nameTaken") === true);
    // Validation failures (parseForm) carry no `op`: they belong to the creation form, the only one with fields.
    const forCreate = $derived(formOp(form) === "create" || formOp(form) === undefined);
    const createValues = $derived(forCreate ? formValuesOf(form) : {});
    const createErrors = $derived(forCreate ? formErrors(form) : {});
    const successText = $derived(
        formOp(form) === "create" ? t.created : formOp(form) === "delete" ? i18n.m.common.deleted : t.saved,
    );
</script>

<PageHeader title={i18n.m.people.tagsTitle} description={t.description} />

<FormMessage form={nameTaken ? undefined : formFeedback(form)} {successText} />
{#if nameTaken}<p class="notice notice-danger mb-4" role="alert">{t.nameTaken}</p>{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <div class="lg:col-span-2">
        {#if data.tags.length === 0}
            <p class="card muted">{t.empty}</p>
        {:else}
            <div class="card relative overflow-x-auto p-0">
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">{t.columns.tag}</th>
                            <th scope="col">{t.columns.description}</th>
                            <th scope="col">{t.columns.members}</th>
                            {#if canManage}<th scope="col"
                                    ><span class="sr-only">{i18n.m.common.labels.actions}</span></th
                                >{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.tags as tag (tag.id)}
                            <tr>
                                <td>
                                    <span class="inline-flex items-center gap-2 font-semibold">
                                        <span
                                            class="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                                            style:background={tag.color ?? "transparent"}
                                            aria-hidden="true"
                                        ></span>
                                        {tag.name}
                                    </span>
                                    {#if data.builtIn.includes(tag.name)}
                                        <span class="badge ms-1">{t.builtIn}</span>
                                    {/if}
                                </td>
                                <td class="muted text-sm">{tag.description ?? ""}</td>
                                <td>{i18n.p(t.members, tag.memberCount)}</td>
                                {#if canManage}
                                    <td>
                                        <div class="flex justify-end gap-1">
                                            <details class="relative">
                                                <summary class="btn btn-sm">{i18n.m.common.actions.edit}</summary>
                                                <form
                                                    method="POST"
                                                    action="?/update"
                                                    use:enhance
                                                    class="absolute end-0 z-10 mt-2 w-72 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg"
                                                >
                                                    <input type="hidden" name="tagId" value={tag.id} />
                                                    <label class="block">
                                                        <span class="label">{i18n.m.common.labels.name}</span>
                                                        <input
                                                            class="input"
                                                            name="name"
                                                            value={tag.name}
                                                            maxlength="64"
                                                            required
                                                        />
                                                    </label>
                                                    <label class="block">
                                                        <span class="label">{t.descriptionLabel}</span>
                                                        <input
                                                            class="input"
                                                            name="description"
                                                            value={tag.description ?? ""}
                                                            maxlength="500"
                                                        />
                                                    </label>
                                                    <label class="block">
                                                        <span class="label">{t.colorLabel}</span>
                                                        <input
                                                            class="h-10 w-16"
                                                            type="color"
                                                            name="color"
                                                            value={tag.color ?? "#3b5bdb"}
                                                        />
                                                    </label>
                                                    <button class="btn btn-primary btn-sm" type="submit">
                                                        {i18n.m.common.actions.save}
                                                    </button>
                                                </form>
                                            </details>
                                            <ConfirmForm
                                                action="?/delete"
                                                label={i18n.m.common.actions.delete}
                                                title={i18n.t(t.deleteTitle, { name: tag.name })}
                                                description={t.deleteDescription}
                                                fields={{ tagId: tag.id }}
                                                small
                                            />
                                        </div>
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    {#if canManage}
        {#key form}
            <form method="POST" action="?/create" class="card h-fit space-y-4" use:enhance>
                <h2 class="text-lg font-bold">{t.add}</h2>
                <Field
                    label={i18n.m.common.labels.name}
                    name="name"
                    error={createErrors.name}
                    hint={t.nameHelp}
                    required
                >
                    {#snippet children(a)}
                        <input class="input" {...a} name="name" maxlength="64" value={createValues.name ?? ""} />
                    {/snippet}
                </Field>
                <Field label={t.descriptionLabel} name="description" error={createErrors.description}>
                    {#snippet children(a)}
                        <input
                            class="input"
                            {...a}
                            name="description"
                            maxlength="500"
                            value={createValues.description ?? ""}
                        />
                    {/snippet}
                </Field>
                <Field label={t.colorLabel} name="color" error={createErrors.color} hint={t.colorHelp}>
                    {#snippet children(a)}
                        <input
                            class="h-10 w-16"
                            {...a}
                            type="color"
                            name="color"
                            value={createValues.color ?? "#3b5bdb"}
                        />
                    {/snippet}
                </Field>
                <button class="btn btn-primary" type="submit">{i18n.m.common.actions.add}</button>
            </form>
        {/key}
    {/if}
</div>
