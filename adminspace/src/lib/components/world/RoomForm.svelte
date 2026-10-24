<!-- Create / edit form of a room. Used by rooms/new and rooms/[roomId]. -->
<script lang="ts">
    import { enhance } from "$app/forms";
    import Field from "$lib/components/Field.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ErrorCode } from "./formState";

    interface RoomValues {
        name?: string | undefined;
        slug?: string | undefined;
        description?: string | undefined;
        mapKind?: string | undefined;
        wamUrl?: string | undefined;
        mapUrl?: string | undefined;
        thumbnailUrl?: string | undefined;
        requiredTags?: string | undefined;
        isDefault?: boolean | string | undefined;
    }

    type Listing =
        | { status: "ok"; maps: { path: string; name: string; description?: string | undefined; wamUrl: string }[] }
        | { status: "notConfigured" }
        | { status: "unreachable" };

    let {
        values,
        errors,
        maps,
        tagNames,
        submitLabel,
    }: {
        values: RoomValues;
        errors: Record<string, ErrorCode | undefined>;
        maps: Listing;
        tagNames: string[];
        submitLabel: string;
    } = $props();

    const i18n = useI18n();
    const r = $derived(i18n.m.rooms);
    // The form is re-created after each submission, so the initial values are read once.
    // svelte-ignore state_referenced_locally
    let mapKind = $state(values.mapKind === "tmj" ? "tmj" : "wam");
    // svelte-ignore state_referenced_locally
    let wamUrl = $state(values.wamUrl ?? "");
    const isDefault = $derived(values.isDefault === true || values.isDefault === "on" || values.isDefault === "true");
</script>

<form method="POST" action="?/save" class="space-y-5" use:enhance>
    <div class="card space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={r.fields.name} name="name" error={errors.name} required>
                {#snippet children(a)}<input
                        class="input"
                        {...a}
                        name="name"
                        maxlength="200"
                        value={values.name ?? ""}
                    />{/snippet}
            </Field>
            <Field label={r.fields.slug} name="slug" error={errors.slug} hint={r.fields.slugHelp} required>
                {#snippet children(a)}
                    <input
                        class="input font-mono"
                        {...a}
                        name="slug"
                        maxlength="128"
                        autocapitalize="off"
                        spellcheck="false"
                        value={values.slug ?? ""}
                    />
                {/snippet}
            </Field>
        </div>
        <Field label={r.fields.description} name="description" error={errors.description}>
            {#snippet children(a)}
                <textarea class="textarea" {...a} name="description" rows="2" maxlength="2000"
                    >{values.description ?? ""}</textarea
                >
            {/snippet}
        </Field>
    </div>

    <fieldset class="card space-y-4">
        <legend class="px-1 font-semibold">{r.fields.mapKind}</legend>
        <div class="space-y-2">
            <label class="flex items-start gap-2">
                <input type="radio" name="mapKind" value="wam" bind:group={mapKind} class="mt-1" />
                <span>{r.fields.mapKindWam}</span>
            </label>
            <label class="flex items-start gap-2">
                <input type="radio" name="mapKind" value="tmj" bind:group={mapKind} class="mt-1" />
                <span>{r.fields.mapKindTmj}</span>
            </label>
        </div>

        {#if mapKind === "wam"}
            <Field label={r.fields.wamUrl} name="wamUrl" error={errors.wamUrl} hint={r.fields.wamUrlHelp} required>
                {#snippet children(a)}
                    <input class="input font-mono" {...a} name="wamUrl" type="url" bind:value={wamUrl} />
                {/snippet}
            </Field>
            <details class="rounded-lg border border-[var(--border)] p-3">
                <summary class="cursor-pointer font-semibold">{r.mapStorage.title}</summary>
                <div class="mt-3">
                    {#if maps.status === "notConfigured"}
                        <p class="muted text-sm">{r.mapStorage.notConfigured}</p>
                    {:else if maps.status === "unreachable"}
                        <p class="muted text-sm">{r.mapStorage.unreachable}</p>
                    {:else if maps.maps.length === 0}
                        <p class="muted text-sm">{r.mapStorage.none}</p>
                    {:else}
                        <ul class="max-h-64 space-y-1 overflow-y-auto">
                            {#each maps.maps as map (map.path)}
                                <li class="flex items-center justify-between gap-3 text-sm">
                                    <span class="min-w-0">
                                        <span class="font-medium">{map.name}</span>
                                        <code class="muted block truncate">{map.path}</code>
                                    </span>
                                    <button type="button" class="btn btn-sm" onclick={() => (wamUrl = map.wamUrl)}>
                                        {r.mapStorage.use}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </details>
        {:else}
            <input type="hidden" name="wamUrl" value="" />
            <Field label={r.fields.mapUrl} name="mapUrl" error={errors.mapUrl} hint={r.fields.mapUrlHelp} required>
                {#snippet children(a)}
                    <input class="input font-mono" {...a} name="mapUrl" type="url" value={values.mapUrl ?? ""} />
                {/snippet}
            </Field>
        {/if}
    </fieldset>

    <div class="card space-y-4">
        <Field
            label={r.fields.requiredTags}
            name="requiredTags"
            error={errors.requiredTags}
            hint={r.fields.requiredTagsHelp}
        >
            {#snippet children(a)}
                <input
                    class="input"
                    {...a}
                    name="requiredTags"
                    list="room-tag-names"
                    value={values.requiredTags ?? ""}
                />
            {/snippet}
        </Field>
        <datalist id="room-tag-names">
            {#each tagNames as tag (tag)}<option value={tag}></option>{/each}
        </datalist>
        <Field label={r.fields.thumbnailUrl} name="thumbnailUrl" error={errors.thumbnailUrl}>
            {#snippet children(a)}
                <input class="input" {...a} name="thumbnailUrl" type="url" value={values.thumbnailUrl ?? ""} />
            {/snippet}
        </Field>
        <label class="flex items-start gap-2">
            <input type="checkbox" name="isDefault" checked={isDefault} class="mt-1" />
            <span>
                <span class="font-semibold">{r.fields.isDefault}</span>
                <span class="hint block">{r.defaultHelp}</span>
            </span>
        </label>
    </div>

    <div class="flex justify-end">
        <button class="btn btn-primary" type="submit">{submitLabel}</button>
    </div>
</form>
