<script lang="ts">
    import { resolve } from "$app/paths";
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { SLUG_INPUT_PATTERN, suggestSlug } from "$lib/components/worlds/slug";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.worlds);
    const errors = $derived(form?.errors);

    // Fields start from the values sent back after a failed submission, then live on their own.
    const seed = untrack(() => form?.values);
    let name = $state(seed?.name ?? "");
    let slug = $state(seed?.slug ?? "");
    let slugEdited = $state(Boolean(seed?.slug));
    let roomName = $state(seed?.roomName ?? "");
    let roomSlug = $state(seed?.roomSlug ?? "");
    let roomSlugEdited = $state(Boolean(seed?.roomSlug));
    let accessPolicy = $state(seed?.accessPolicy ?? "public");

    $effect(() => {
        if (!slugEdited) slug = suggestSlug(name);
    });
    $effect(() => {
        if (!roomSlugEdited) roomSlug = suggestSlug(roomName, 128);
    });

    const policies = ["public", "authenticated", "members"] as const;
</script>

<PageHeader title={w.create.title} description={w.create.intro} />

<a
    class="card card-interactive mb-6 flex max-w-2xl items-center gap-3"
    href={resolve(`/o/${data.organization.slug}/office/new`)}
>
    <Icon name="sparkle" />
    <span class="min-w-0 flex-1">
        <span class="block font-semibold">{i18n.m.office.wizard.entry}</span>
        <span class="muted block text-sm">{i18n.m.office.wizard.entryIntro}</span>
    </span>
    <Icon name="chevron-right" size={16} />
</a>

<FormMessage {form} />

<form method="POST" class="max-w-2xl space-y-6" use:enhance>
    <div class="card space-y-5">
        <Field label={i18n.m.workspaces.pick} name="workspaceId" required hint={i18n.m.workspaces.pickHint}>
            {#snippet children(a)}
                <select class="select" {...a} name="workspaceId" value={seed?.workspaceId ?? data.selectedWorkspace}>
                    {#each data.workspaces as workspace (workspace.id)}
                        <option value={workspace.id}>{workspace.name}</option>
                    {/each}
                </select>
            {/snippet}
        </Field>
        <Field label={i18n.m.common.labels.name} name="name" required error={errors?.name}>
            {#snippet children(a)}
                <input class="input" {...a} name="name" maxlength="200" bind:value={name} />
            {/snippet}
        </Field>
        <Field
            label={i18n.m.common.labels.slug}
            name="slug"
            required
            error={errors?.slug}
            hint={i18n.m.common.slugHelp}
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
        <p class="muted -mt-3 text-xs" dir="ltr">/@/{data.organization.slug}/{slug || "…"}/</p>
        <Field label={i18n.m.common.labels.description} name="description" error={errors?.description}>
            {#snippet children(a)}
                <textarea class="textarea" rows="3" {...a} name="description" maxlength="2000"
                    >{form?.values?.description ?? ""}</textarea
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
    </div>

    <fieldset class="card space-y-5">
        <legend class="px-1 text-base font-bold">{w.create.firstRoom}</legend>
        <p class="muted text-sm">{w.create.firstRoomIntro}</p>
        <Field label={w.create.roomName} name="roomName" error={errors?.roomName}>
            {#snippet children(a)}
                <input class="input" {...a} name="roomName" maxlength="200" bind:value={roomName} />
            {/snippet}
        </Field>
        <Field label={w.create.roomSlug} name="roomSlug" error={errors?.roomSlug}>
            {#snippet children(a)}
                <input
                    class="input font-mono"
                    {...a}
                    name="roomSlug"
                    dir="ltr"
                    maxlength="128"
                    bind:value={roomSlug}
                    oninput={() => (roomSlugEdited = true)}
                />
            {/snippet}
        </Field>
        <Field label={w.create.mapKind} name="mapKind" error={errors?.mapKind}>
            {#snippet children(a)}
                <select class="select" {...a} name="mapKind" value={form?.values?.mapKind ?? "wam"}>
                    <option value="wam">{w.create.mapKinds.wam}</option>
                    <option value="tmj">{w.create.mapKinds.tmj}</option>
                </select>
            {/snippet}
        </Field>
        <Field label={w.create.mapUrl} name="mapUrl" error={errors?.mapUrl} hint={w.create.mapUrlHint}>
            {#snippet children(a)}
                <input class="input" type="url" dir="ltr" {...a} name="mapUrl" value={form?.values?.mapUrl ?? ""} />
            {/snippet}
        </Field>
    </fieldset>

    <div class="flex gap-2">
        <button class="btn btn-primary" type="submit">{w.create.submit}</button>
        <a class="btn" href={resolve(`/o/${data.organization.slug}`)}>{i18n.m.common.actions.cancel}</a>
    </div>
</form>
