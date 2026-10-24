<script lang="ts">
    import { resolve } from "$app/paths";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import RoomForm from "$lib/components/world/RoomForm.svelte";
    import RoomSizePanel from "$lib/components/rooms/RoomSizePanel.svelte";
    import SizeProblemText from "$lib/components/rooms/SizeProblemText.svelte";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import { roomSyncProblem } from "$lib/catalog/manifest";
    import { useI18n } from "$lib/i18n/context";
    import type { ResizeReason, ResizeSummary, RoomSizeProblem } from "$lib/rooms/size";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const o = $derived(i18n.m.office);
    const resizeResult = $derived(formOp(form) === "resize" ? form : undefined);
    const saveResult = $derived(formOp(form) === "resize" ? undefined : form);
    // The room form keeps what was typed after a failed save, and the saved values otherwise.
    const values = $derived(saveResult ? formValuesOf(saveResult) : data.room);
    const resized = $derived(formField<ResizeSummary>(resizeResult, "resized"));
    const refusedProblem = $derived(formField<RoomSizeProblem>(resizeResult, "sizeProblem"));
    const previewUrl = $derived(
        resolve(`/o/${data.organization.slug}/w/${data.world.slug}/rooms/${data.room.id}/size`),
    );
    const syncProblem = $derived(roomSyncProblem(data.room.syncError));
</script>

<PageHeader title={`${i18n.m.rooms.editRoom} · ${data.room.name}`} />

{#if data.room.syncState === "failed" && syncProblem}
    <p class="notice notice-danger mb-4" role="alert">
        <Icon name="alert" />{i18n.m.catalog.world.problems[syncProblem]}
    </p>
{/if}

{#key form}
    {#await data.size}
        <section class="card mb-6" aria-busy="true">
            <h2 class="text-lg font-semibold">{o.size.title}</h2>
            <p class="muted mt-1 text-sm">{o.size.loading}</p>
        </section>
    {:then reading}
        {#if reading.status === "ok" && !reading.size.infinite}
            <div class="mb-6">
                <RoomSizePanel
                    current={reading.size}
                    {previewUrl}
                    {resized}
                    refused={refusedProblem
                        ? {
                              problem: refusedProblem,
                              reason: formField<ResizeReason | null>(resizeResult, "reason"),
                              detail: formField<string | null>(resizeResult, "detail"),
                          }
                        : undefined}
                />
            </div>
        {:else}
            <section class="card mb-6">
                <h2 class="text-lg font-semibold">{o.size.title}</h2>
                <div class="muted mt-1 text-sm">
                    <SizeProblemText
                        problem={reading.status === "ok" ? "unresizable" : reading.problem}
                        reason={reading.status === "ok" ? "infinite" : undefined}
                    />
                </div>
            </section>
        {/if}
    {/await}
{/key}

<FormMessage form={formFeedback(saveResult)} />
{#if formField<"extensionWam" | "extensionTmj" | "otherOrganization">(saveResult, "mapProblem")}
    {@const problem = formField<"extensionWam" | "extensionTmj" | "otherOrganization">(saveResult, "mapProblem")}
    {#if problem}<p class="notice notice-danger mb-4" role="alert">{i18n.m.rooms.mapProblems[problem]}</p>{/if}
{/if}

{#key saveResult}
    <RoomForm
        {values}
        errors={formErrors(saveResult)}
        maps={data.maps}
        tagNames={data.tagNames}
        submitLabel={i18n.m.common.actions.saveChanges}
    />
{/key}
