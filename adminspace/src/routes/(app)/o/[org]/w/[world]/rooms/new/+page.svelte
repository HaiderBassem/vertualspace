<script lang="ts">
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import RoomForm from "$lib/components/world/RoomForm.svelte";
    import { formErrors, formFeedback, formField, formValuesOf } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
</script>

<PageHeader title={i18n.m.rooms.newRoom} />

<FormMessage form={formFeedback(form)} />
{#if formField<"extensionWam" | "extensionTmj" | "otherOrganization">(form, "mapProblem")}
    {@const problem = formField<"extensionWam" | "extensionTmj" | "otherOrganization">(form, "mapProblem")}
    {#if problem}<p class="notice notice-danger mb-4" role="alert">{i18n.m.rooms.mapProblems[problem]}</p>{/if}
{/if}

{#key form}
    <RoomForm
        values={formValuesOf(form)}
        errors={formErrors(form)}
        maps={data.maps}
        tagNames={data.tagNames}
        submitLabel={i18n.m.common.actions.create}
    />
{/key}
