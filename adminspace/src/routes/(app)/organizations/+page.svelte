<script lang="ts">
    import { resolve } from "$app/paths";
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import Field from "$lib/components/Field.svelte";
    import { SLUG_INPUT_PATTERN, suggestSlug } from "$lib/components/worlds/slug";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { LOCALES } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const o = $derived(i18n.m.organizations);

    // Fields start from the values sent back after a failed submission, then live on their own.
    const seed = untrack(() => form?.values);
    let name = $state(seed?.name ?? "");
    let slug = $state(seed?.slug ?? "");
    let slugEdited = $state(Boolean(seed?.slug));

    $effect(() => {
        if (!slugEdited) slug = suggestSlug(name);
    });
</script>

<PageHeader title={o.title} description={o.intro} />

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_24rem]">
    <section aria-labelledby="org-list">
        <h2 id="org-list" class="sr-only">{o.title}</h2>
        {#if data.organizations.length === 0}
            <p class="card muted">{o.empty}</p>
        {:else}
            <ul class="space-y-3">
                {#each data.organizations as organization (organization.slug)}
                    <li class="card flex flex-wrap items-center justify-between gap-3">
                        <div class="min-w-0">
                            <a href={resolve(`/o/${organization.slug}`)} class="text-lg font-bold"
                                >{organization.name}</a
                            >
                            <p class="muted text-sm">
                                <code dir="ltr">/@/{organization.slug}/</code>
                                {#if organization.countryCode}· {i18n.country(organization.countryCode)}{/if}
                            </p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="badge">{i18n.p(o.worldCount, organization.worldCount)}</span>
                            {#if organization.role}
                                <span class="badge badge-accent">{i18n.m.shell.roles[organization.role]}</span>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <section aria-labelledby="org-create" class="card h-fit space-y-4">
        <div>
            <h2 id="org-create" class="text-lg font-bold">{o.createTitle}</h2>
            <p class="muted mt-1 text-sm">{data.canCreate ? o.createIntro : o.createNotAllowed}</p>
        </div>
        {#if data.canCreate}
            <FormMessage {form} />
            <form method="POST" action="?/create" class="space-y-4" use:enhance>
                <Field label={o.fields.name} name="name" required error={form?.errors?.name}>
                    {#snippet children(a)}
                        <input class="input" {...a} name="name" maxlength="200" bind:value={name} />
                    {/snippet}
                </Field>
                <Field
                    label={o.fields.slug}
                    name="slug"
                    required
                    error={form?.errors?.slug}
                    hint={i18n.t(o.hints.slug, { slug: slug || "…" })}
                >
                    {#snippet children(a)}
                        <input
                            class="input font-mono"
                            {...a}
                            name="slug"
                            dir="ltr"
                            maxlength="64"
                            pattern={SLUG_INPUT_PATTERN}
                            bind:value={slug}
                            oninput={() => (slugEdited = true)}
                        />
                    {/snippet}
                </Field>
                <Field
                    label={o.fields.country}
                    name="countryCode"
                    error={form?.errors?.countryCode}
                    hint={o.hints.country}
                >
                    {#snippet children(a)}
                        <select class="select" {...a} name="countryCode" value={form?.values?.countryCode ?? ""}>
                            <option value="">{o.noCountry}</option>
                            {#each data.countries as country (country.code)}
                                <option value={country.code}>{country.name}</option>
                            {/each}
                        </select>
                    {/snippet}
                </Field>
                <Field label={o.fields.defaultLocale} name="defaultLocale" required hint={o.hints.defaultLocale}>
                    {#snippet children(a)}
                        <select
                            class="select"
                            {...a}
                            name="defaultLocale"
                            value={form?.values?.defaultLocale ?? i18n.locale}
                        >
                            {#each LOCALES as locale (locale.tag)}
                                <option value={locale.tag} lang={locale.tag}>{locale.nativeName}</option>
                            {/each}
                        </select>
                    {/snippet}
                </Field>
                <Field label={o.fields.contactEmail} name="contactEmail" error={form?.errors?.contactEmail}>
                    {#snippet children(a)}
                        <input
                            class="input"
                            type="email"
                            {...a}
                            name="contactEmail"
                            value={form?.values?.contactEmail ?? ""}
                        />
                    {/snippet}
                </Field>
                <button class="btn btn-primary w-full" type="submit">{o.create}</button>
            </form>
        {/if}
    </section>
</div>
