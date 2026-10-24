<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import type { Messages } from "$lib/i18n";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.platform.catalog);

    type ErrorCode = keyof Messages["common"]["errors"];
    const errors = $derived((form && "errors" in form ? form.errors : {}) as Record<string, ErrorCode | undefined>);

    /** Relative texture URLs are resolved by WorkAdventure against its own origin: preview them the same way. */
    function preview(url: string): string | undefined {
        if (/^https?:\/\//i.test(url)) return url;
        if (!data.playUrl) return undefined;
        try {
            return new URL(url, data.playUrl.endsWith("/") ? data.playUrl : `${data.playUrl}/`).href;
        } catch {
            return undefined;
        }
    }

    const editing = $derived(data.editing);
    const texture = $derived(editing?.texture ?? null);
    const kind = $derived(editing?.kind ?? "woka");
    function byCollection<T extends { collectionId: string }>(rows: T[]): SvelteMap<string, T[]> {
        const groups = new SvelteMap<string, T[]>();
        for (const row of rows) groups.set(row.collectionId, [...(groups.get(row.collectionId) ?? []), row]);
        return groups;
    }
    const wokaByCollection = $derived(byCollection(data.wokaTextures));
    const companionsByCollection = $derived(byCollection(data.companionTextures));
</script>

{#snippet thumb(url: string)}
    {@const src = preview(url)}
    {#if src}
        <!-- Spritesheets: show the first 32x32 frame. -->
        <img
            {src}
            alt=""
            loading="lazy"
            width="32"
            height="32"
            class="h-8 w-8 rounded border border-[var(--border)] bg-[var(--surface-sunken)] object-none object-left-top [image-rendering:pixelated]"
        />
    {:else}
        <span class="inline-block h-8 w-8 rounded border border-dashed border-[var(--border)]"></span>
    {/if}
{/snippet}

{#snippet textureRow(texture: { id: string; name: string; url: string; enabled: boolean }, kind: "woka" | "companion")}
    <tr class={texture.enabled ? "" : "opacity-60"}>
        <td>{@render thumb(texture.url)}</td>
        <td><code dir="ltr">{texture.id}</code></td>
        <td>{texture.name}</td>
        <td>
            <form method="POST" action={kind === "woka" ? "?/toggleWoka" : "?/toggleCompanion"} use:enhance>
                <input type="hidden" name="id" value={texture.id} />
                <button class="btn btn-sm" type="submit" aria-pressed={texture.enabled}>
                    {texture.enabled ? i18n.m.common.labels.enabled : i18n.m.common.labels.disabled}
                </button>
            </form>
        </td>
        <td class="text-end">
            <div class="flex justify-end gap-2">
                <a
                    class="btn btn-sm"
                    href={resolve(`/admin/catalog?edit=${kind}:${encodeURIComponent(texture.id)}#editor`)}
                    >{i18n.m.common.actions.edit}</a
                >
                <ConfirmForm
                    action={kind === "woka" ? "?/deleteWoka" : "?/deleteCompanion"}
                    label={i18n.m.common.actions.delete}
                    title={m.deleteTitle}
                    description={m.deleteDescription}
                    fields={{ id: texture.id }}
                    small
                />
            </div>
        </td>
    </tr>
{/snippet}

{#snippet table(rows: { id: string; name: string; url: string; enabled: boolean }[], kind: "woka" | "companion")}
    <div class="relative overflow-x-auto">
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{m.preview}</th>
                    <th scope="col">{m.textureId}</th>
                    <th scope="col">{i18n.m.common.labels.name}</th>
                    <th scope="col">{i18n.m.common.labels.status}</th>
                    <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                </tr>
            </thead>
            <tbody>
                {#each rows as texture (texture.id)}{@render textureRow(texture, kind)}{/each}
            </tbody>
        </table>
    </div>
{/snippet}

<PageHeader title={m.title} description={m.intro} />
<FormMessage form={form && "message" in form ? form : form && "success" in form ? { success: true } : null} />
{#if form && "idTaken" in form}<p class="notice notice-danger mb-4" role="alert">{m.idTaken}</p>{/if}

<section id="editor" class="card mb-8" aria-labelledby="editor-title">
    <h2 id="editor-title" class="mb-4 text-lg font-bold">{texture ? m.editTexture : m.addTexture}</h2>
    {#if !texture}
        <div class="mb-4 flex gap-2" role="group" aria-label={m.addTexture}>
            <a class="btn btn-sm" href={resolve("/admin/catalog")} aria-current={kind === "woka" ? "true" : undefined}
                >{m.wokas}</a
            >
            <a
                class="btn btn-sm"
                href={resolve("/admin/catalog?edit=companion:")}
                aria-current={kind === "companion" ? "true" : undefined}>{m.companions}</a
            >
        </div>
    {/if}
    <form
        method="POST"
        action={kind === "woka" ? "?/saveWoka" : "?/saveCompanion"}
        use:enhance
        class="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
        <input type="hidden" name="originalId" value={texture?.id ?? ""} />
        <div>
            <label class="label" for="texture-id">{m.textureId}</label>
            <input
                class="input font-mono"
                id="texture-id"
                name="id"
                dir="ltr"
                required
                readonly={Boolean(texture)}
                value={texture?.id ?? ""}
                aria-invalid={errors.id ? "true" : undefined}
                aria-describedby="texture-id-hint"
            />
            <p class="hint" id="texture-id-hint">{m.textureIdHelp}</p>
        </div>
        <div>
            <label class="label" for="texture-name">{i18n.m.common.labels.name}</label>
            <input class="input" id="texture-name" name="name" required maxlength="100" value={texture?.name ?? ""} />
        </div>
        <div class="md:col-span-2">
            <label class="label" for="texture-url">{m.textureUrl}</label>
            <input
                class="input font-mono"
                id="texture-url"
                name="url"
                dir="ltr"
                required
                maxlength="2048"
                value={texture?.url ?? ""}
                aria-invalid={errors.url ? "true" : undefined}
                aria-describedby="texture-url-hint"
            />
            <p class="hint" id="texture-url-hint">{m.textureUrlHelp}</p>
            {#if errors.url}<p class="field-error">{i18n.m.common.errors.invalidUrl}</p>{/if}
        </div>
        <div>
            <label class="label" for="texture-collection">{m.collection}</label>
            <select class="select" id="texture-collection" name="collectionId" required>
                {#if kind === "woka"}
                    {#each data.wokaCollections as collection (collection.id)}
                        <option value={collection.id} selected={collection.id === texture?.collectionId}
                            >{m.parts[collection.part]} — {collection.name}</option
                        >
                    {/each}
                {:else}
                    {#each data.companionCollections as collection (collection.id)}
                        <option value={collection.id} selected={collection.id === texture?.collectionId}
                            >{collection.name}</option
                        >
                    {/each}
                {/if}
            </select>
        </div>
        {#if kind === "woka"}
            <label class="flex items-center gap-2 self-end">
                <input
                    type="checkbox"
                    name="tintable"
                    checked={texture && "tintable" in texture ? texture.tintable : false}
                />
                {m.tintable}
            </label>
        {:else}
            <div>
                <label class="label" for="texture-behavior">{m.behavior}</label>
                <select class="select" id="texture-behavior" name="behavior">
                    <option value="">{m.behaviors.none}</option>
                    {#each data.behaviors as behavior (behavior)}
                        <option
                            value={behavior}
                            selected={texture && "behavior" in texture && texture.behavior === behavior}
                            >{m.behaviors[behavior]}</option
                        >
                    {/each}
                </select>
            </div>
        {/if}
        <div class="flex gap-2 md:col-span-2">
            <button class="btn btn-primary" type="submit">{i18n.m.common.actions.save}</button>
            {#if texture}<a class="btn" href={resolve("/admin/catalog")}>{i18n.m.common.actions.cancel}</a>{/if}
        </div>
    </form>
</section>

<section class="card mb-8" aria-labelledby="new-collection">
    <h2 id="new-collection" class="mb-4 text-lg font-bold">{m.newCollection}</h2>
    <form method="POST" action="?/addCollection" use:enhance class="flex flex-wrap items-end gap-3">
        <div>
            <label class="label" for="collection-part">{m.part}</label>
            <select class="select" id="collection-part" name="part">
                {#each data.parts as part (part)}<option value={part}>{m.parts[part]}</option>{/each}
                <option value="companion">{m.companions}</option>
            </select>
        </div>
        <div class="min-w-48 flex-1">
            <label class="label" for="collection-name">{i18n.m.common.labels.name}</label>
            <input class="input" id="collection-name" name="name" required maxlength="100" />
        </div>
        <button class="btn" type="submit">{i18n.m.common.actions.add}</button>
    </form>
</section>

<h2 class="mb-3 text-xl font-bold">{m.wokas}</h2>
<div class="mb-10 space-y-3">
    {#each data.wokaCollections as collection (collection.id)}
        {@const textures = wokaByCollection.get(collection.id) ?? []}
        <details class="card p-0">
            <summary class="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <span class="font-semibold">{m.parts[collection.part]} — {collection.name}</span>
                <span class="muted text-sm"
                    >{i18n.t(m.count, {
                        enabled: textures.filter((t) => t.enabled).length,
                        total: textures.length,
                    })}</span
                >
            </summary>
            {@render table(textures, "woka")}
        </details>
    {/each}
</div>

<h2 class="mb-3 text-xl font-bold">{m.companions}</h2>
<div class="space-y-3">
    {#each data.companionCollections as collection (collection.id)}
        {@const textures = companionsByCollection.get(collection.id) ?? []}
        <details class="card p-0">
            <summary class="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <span class="font-semibold">{collection.name}</span>
                <span class="muted text-sm"
                    >{i18n.t(m.count, {
                        enabled: textures.filter((t) => t.enabled).length,
                        total: textures.length,
                    })}</span
                >
            </summary>
            {@render table(textures, "companion")}
        </details>
    {/each}
</div>
