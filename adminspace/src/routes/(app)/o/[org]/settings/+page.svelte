<script lang="ts">
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { LOCALES } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const o = $derived(i18n.m.organizations);
    const org = $derived(data.organization);
    const values = $derived(form && "values" in form ? form.values : undefined);
    const errors = $derived(form && "errors" in form ? form.errors : undefined);
</script>

<PageHeader title={o.settings.title} description={o.settings.intro} />

<FormMessage {form} />

<form
    method="POST"
    action="?/update"
    class="card max-w-2xl space-y-5"
    use:enhance={() =>
        async ({ update }) =>
            update({ reset: false })}
>
    <Field label={o.fields.name} name="name" required error={errors?.name}>
        {#snippet children(a)}
            <input class="input" {...a} name="name" maxlength="200" value={values?.name ?? org.name} />
        {/snippet}
    </Field>
    <div>
        <p class="label">{o.fields.slug}</p>
        <code class="block" dir="ltr">{org.slug}</code>
        <p class="hint">{o.settings.slugReadOnly}</p>
    </div>
    <Field label={o.fields.country} name="countryCode" error={errors?.countryCode} hint={o.hints.country}>
        {#snippet children(a)}
            <select class="select" {...a} name="countryCode" value={values?.countryCode ?? org.countryCode ?? ""}>
                <option value="">{o.noCountry}</option>
                {#each data.countries as country (country.code)}
                    <option value={country.code}>{country.name}</option>
                {/each}
            </select>
        {/snippet}
    </Field>
    <Field label={o.fields.defaultLocale} name="defaultLocale" required hint={o.hints.defaultLocale}>
        {#snippet children(a)}
            <select class="select" {...a} name="defaultLocale" value={values?.defaultLocale ?? org.defaultLocale}>
                {#each LOCALES as locale (locale.tag)}
                    <option value={locale.tag} lang={locale.tag}>{locale.nativeName}</option>
                {/each}
            </select>
        {/snippet}
    </Field>
    <Field label={o.fields.contactEmail} name="contactEmail" error={errors?.contactEmail} hint={o.hints.contactEmail}>
        {#snippet children(a)}
            <input
                class="input"
                type="email"
                {...a}
                name="contactEmail"
                value={values?.contactEmail ?? org.contactEmail ?? ""}
            />
        {/snippet}
    </Field>
    <button class="btn btn-primary" type="submit">{i18n.m.common.actions.saveChanges}</button>
</form>

{#if data.can["organization.delete"]}
    <section class="card mt-8 max-w-2xl border-[var(--danger)]" aria-labelledby="danger-zone">
        <h2 id="danger-zone" class="text-lg font-bold text-[var(--danger)]">{o.settings.dangerZone}</h2>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
                <p class="font-semibold">{o.settings.deleteTitle}</p>
                <p class="muted text-sm">{o.settings.deleteDescription}</p>
            </div>
            <ConfirmForm
                action="?/delete"
                label={i18n.m.common.actions.delete}
                title={o.settings.deleteTitle}
                description={o.settings.deleteDescription}
                confirmValue={org.slug}
                passwordLabel={i18n.m.team.transfer.password}
            />
        </div>
    </section>
{/if}
