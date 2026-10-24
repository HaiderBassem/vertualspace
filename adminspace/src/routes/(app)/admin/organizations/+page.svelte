<script lang="ts">
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { countryOptions } from "$lib/i18n/format";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.organizations);
    const labels = $derived(i18n.m.common.labels);
    const countries = $derived(countryOptions(i18n.locale));

    const errors = $derived(form && "errors" in form ? (form.errors as Record<string, never>) : {});
    const values = $derived(
        (form && "values" in form ? form.values : {}) as Partial<
            Record<"name" | "slug" | "countryCode" | "defaultLocale" | "ownerEmail", string>
        >,
    );
    const feedback = $derived(
        form && "message" in form ? form : form && ("success" in form || "deleted" in form) ? { success: true } : null,
    );
</script>

<PageHeader title={m.title} description={m.intro} />

<FormMessage form={feedback} successText={form && "deleted" in form ? i18n.m.common.deleted : i18n.m.common.created} />

<details class="card mb-8" open={Boolean(form && ("errors" in form || "ownerNotFound" in form))}>
    <summary class="cursor-pointer text-lg font-bold">{m.create}</summary>
    <form method="POST" action="?/create" use:enhance class="mt-4 grid gap-4 md:grid-cols-2">
        <Field label={labels.name} name="name" required error={errors.name}>
            {#snippet children(a)}<input
                    class="input"
                    {...a}
                    name="name"
                    maxlength="200"
                    value={values.name ?? ""}
                />{/snippet}
        </Field>
        <Field label={labels.slug} name="slug" required hint={i18n.m.common.slugHelp} error={errors.slug}>
            {#snippet children(a)}
                <input class="input font-mono" {...a} name="slug" maxlength="64" dir="ltr" value={values.slug ?? ""} />
            {/snippet}
        </Field>
        <Field label={labels.country} name="countryCode">
            {#snippet children(a)}
                <select class="select" {...a} name="countryCode">
                    <option value="">{labels.none}</option>
                    {#each countries as country (country.code)}
                        <option value={country.code} selected={values.countryCode === country.code}
                            >{country.name}</option
                        >
                    {/each}
                </select>
            {/snippet}
        </Field>
        <Field label={m.defaultLocale} name="defaultLocale" required>
            {#snippet children(a)}
                <select class="select" {...a} name="defaultLocale">
                    {#each data.locales as locale (locale.tag)}
                        <option
                            value={locale.tag}
                            lang={locale.tag}
                            selected={(values.defaultLocale ?? i18n.locale) === locale.tag}>{locale.nativeName}</option
                        >
                    {/each}
                </select>
            {/snippet}
        </Field>
        <div class="md:col-span-2">
            <Field label={m.owner} name="ownerEmail" hint={m.ownerHelp} error={errors.ownerEmail}>
                {#snippet children(a)}
                    <input class="input" type="email" {...a} name="ownerEmail" value={values.ownerEmail ?? ""} />
                {/snippet}
            </Field>
            {#if form && "ownerNotFound" in form}<p class="field-error">{m.ownerNotFound}</p>{/if}
        </div>
        <div class="md:col-span-2">
            <button class="btn btn-primary" type="submit">{i18n.m.common.actions.create}</button>
        </div>
    </form>
</details>

{#if data.organizations.length === 0}
    <p class="muted">{m.empty}</p>
{:else}
    <div class="card relative overflow-x-auto p-0">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{labels.name}</th>
                    <th scope="col">{labels.country}</th>
                    <th scope="col">{m.worlds}</th>
                    <th scope="col">{m.members}</th>
                    <th scope="col">{m.admins}</th>
                    <th scope="col">{labels.createdAt}</th>
                    <th scope="col"><span class="sr-only">{labels.actions}</span></th>
                </tr>
            </thead>
            <tbody>
                {#each data.organizations as organization (organization.id)}
                    <tr>
                        <td>
                            <a href={resolve(`/admin/organizations/${organization.id}`)} class="font-semibold"
                                >{organization.name}</a
                            >
                            <div class="muted font-mono text-xs" dir="ltr">{organization.slug}</div>
                        </td>
                        <td>{i18n.country(organization.countryCode)}</td>
                        <td>{i18n.number(organization.worlds)}</td>
                        <td>{i18n.number(organization.members)}</td>
                        <td>{i18n.number(organization.admins)}</td>
                        <td><DateTime value={organization.createdAt} mode="date" /></td>
                        <td class="text-end">
                            <ConfirmForm
                                action="?/delete"
                                label={i18n.m.common.actions.delete}
                                title={m.deleteTitle}
                                description={m.deleteDescription}
                                fields={{ id: organization.id }}
                                confirmValue={organization.slug}
                                small
                            />
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}
