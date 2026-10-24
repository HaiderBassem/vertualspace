<script lang="ts">
    import { enhance } from "$app/forms";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import SettingsFields from "$lib/components/worlds/SettingsFields.svelte";
    import { SECTIONS } from "$lib/components/worlds/settingsSections";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const s = $derived(i18n.m.worlds.settings);
    const groups = $derived(SECTIONS[data.section]);
    const intro = $derived((s.sectionIntros as Record<string, string | undefined>)[data.section]);
    const values = $derived({ ...data.values, ...(form && "values" in form ? form.values : {}) });
    const errors = $derived(form && "errors" in form ? form.errors : {});
</script>

<PageHeader title={s.sections[data.section]} description={intro} />

<FormMessage {form} />

<form
    method="POST"
    class="space-y-6"
    use:enhance={() =>
        async ({ update }) =>
            update({ reset: false })}
>
    <SettingsFields {groups} {values} secretsSet={data.secretsSet} canReadSecrets={data.canReadSecrets} {errors} />
    <button class="btn btn-primary" type="submit">{i18n.m.common.actions.saveChanges}</button>
</form>
