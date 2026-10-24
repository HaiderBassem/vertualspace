<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import SizeChoice from "$lib/components/rooms/SizeChoice.svelte";
    import { suggestSlug } from "$lib/components/worlds/slug";
    import { isPresetKey, presetSize, type SizeChoiceValue } from "$lib/rooms/size";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const c = $derived(i18n.m.catalog);
    const d = $derived(c.detail);
    const slug = $derived(data.organization.slug);
    const component = $derived(data.component);

    const seed = untrack(() => (form && "values" in form ? form.values : undefined));
    let roomName = $state(seed?.name ?? untrack(() => data.component.name));
    let roomSlug = $state(seed?.slug ?? "");
    let roomSlugEdited = $state(Boolean(seed?.slug));
    const seededChoice = seed?.sizeChoice;
    let sizeChoice = $state<SizeChoiceValue>(
        isPresetKey(seededChoice) || seededChoice === "custom" ? seededChoice : "template",
    );
    const templateSize = untrack(() =>
        data.component.template
            ? { width: data.component.template.width, height: data.component.template.height }
            : { width: 20, height: 15 },
    );
    const seededSize = isPresetKey(seededChoice) ? presetSize(seededChoice) : templateSize;
    let sizeWidth = $state(Number(seed?.width) || seededSize.width);
    let sizeHeight = $state(Number(seed?.height) || seededSize.height);
    $effect(() => {
        if (!roomSlugEdited) roomSlug = suggestSlug(roomName, 128);
    });

    const installError = $derived(form && "installError" in form ? form.installError : undefined);
    const uninstallError = $derived(form && "uninstallError" in form ? form.uninstallError : undefined);
    const templateError = $derived(form && "templateError" in form ? form.templateError : undefined);
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
</script>

<p class="mb-2 text-sm">
    <a href={resolve(`/o/${slug}/components`)} class="inline-flex items-center gap-1"
        ><Icon name="chevron-left" size={14} />{d.back}</a
    >
</p>

<PageHeader title={component.name} description={component.description ?? undefined}>
    {#snippet actions()}
        <form method="POST" action="?/favorite" use:enhance>
            <input type="hidden" name="favorite" value={component.favorite ? "false" : "true"} />
            <button class="btn" type="submit" aria-pressed={component.favorite}>
                <Icon name="star" size={16} class={component.favorite ? "text-[var(--warning)]" : ""} />
                {component.favorite ? c.unfavorite : c.favorite}
            </button>
        </form>
    {/snippet}
</PageHeader>

<FormMessage form={formMessage} />
<div aria-live="polite">
    {#if form && "installResult" in form}
        <p class="notice notice-success mb-4">
            <Icon name="check" />
            <span>
                {form.installResult === "installed"
                    ? c.install.installed
                    : form.installResult === "updated"
                      ? c.install.updated
                      : c.install.unchanged}
                <a href={resolve(`/o/${slug}/w/${form.worldSlug}/components`)}>{c.world.title}</a>
            </span>
        </p>
    {:else if installError}
        <p class="notice notice-danger mb-4" role="alert"><Icon name="alert" />{c.install[installError]}</p>
    {:else if form && "removed" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{c.install.removed}</p>
    {:else if uninstallError}
        <p class="notice notice-danger mb-4" role="alert">
            <Icon name="alert" />
            {uninstallError === "notInstalled"
                ? c.install.notInstalled
                : i18n.t(c.install[uninstallError], { rooms: form?.rooms?.join(", ") ?? "" })}
        </p>
    {:else if templateError}
        <p class="notice notice-danger mb-4" role="alert">
            <Icon name="alert" />
            {templateError === "dependencyMissing"
                ? i18n.t(c.template.dependencyMissing, { keys: form?.keys?.join(", ") ?? "" })
                : templateError === "slugTaken"
                  ? c.template.slugTaken
                  : templateError === "mapStorageMissing"
                    ? c.template.mapStorageMissing
                    : templateError === "originMissing"
                      ? c.install.originMissing
                      : templateError === "validation"
                        ? i18n.m.common.errors.validation
                        : c.install.notFound}
        </p>
    {/if}
</div>

{#if component.status === "deprecated"}
    <p class="notice notice-warning mb-4"><Icon name="info" />{d.deprecated}</p>
{/if}

<div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
    <div class="space-y-6">
        <div class="preview card flex min-h-64 items-center justify-center !p-6">
            {#if data.previewUrl}
                <img
                    src={data.previewUrl}
                    alt={component.name}
                    class="max-h-80 w-auto max-w-full [image-rendering:pixelated]"
                    style:min-width="min(100%, 240px)"
                />
            {/if}
        </div>

        {#if data.variants.length > 0}
            <section class="card card-flush" aria-labelledby="variants-title">
                <div class="card-header"><h2 id="variants-title">{d.variantsTitle}</h2></div>
                <ul class="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
                    {#each data.variants as variant (variant.key)}
                        <li class="flex items-center gap-3 bg-[var(--surface)] p-3">
                            <span
                                class="preview inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius)]"
                            >
                                {#if variant.imageUrl}
                                    <img
                                        src={variant.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        class="max-h-14 max-w-14 [image-rendering:pixelated]"
                                    />
                                {/if}
                            </span>
                            <div class="min-w-0 text-sm">
                                <p class="flex items-center gap-1.5 font-medium">
                                    <span
                                        class="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                                        style:background={variant.color}
                                    ></span>
                                    {variant.key}
                                </p>
                                <p class="muted text-xs">{variant.direction} · {variant.width}×{variant.height} px</p>
                                <p class="muted text-xs">{variant.collides ? d.collides : d.walkable}</p>
                            </div>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}

        <section class="card" aria-labelledby="meta-title">
            <h2 id="meta-title" class="sr-only">{d.license}</h2>
            <dl class="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                    <dt class="section-title">{d.category}</dt>
                    <dd class="mt-1">
                        {c.categories[component.category as keyof typeof c.categories] ?? component.category}
                    </dd>
                </div>
                <div>
                    <dt class="section-title">{d.license}</dt>
                    <dd class="mt-1"><code>{component.license}</code></dd>
                </div>
                <div>
                    <dt class="section-title">{d.provenance}</dt>
                    <dd class="mt-1">
                        {component.provenance.author}
                        {#if component.provenance.url}
                            ·
                            <!-- eslint-disable svelte/no-navigation-without-resolve -- external source -->
                            <a href={component.provenance.url} rel="noopener noreferrer" target="_blank"
                                >{component.provenance.url}</a
                            >
                            <!-- eslint-enable svelte/no-navigation-without-resolve -->
                        {/if}
                    </dd>
                </div>
                {#if component.attribution}
                    <div>
                        <dt class="section-title">{d.attribution}</dt>
                        <dd class="mt-1">{component.attribution}</dd>
                    </div>
                {/if}
                <div>
                    <dt class="section-title">{d.compatibility}</dt>
                    <dd class="mt-1">
                        {#if component.compatibility.entityCollection}
                            {i18n.t(d.compatibleEntity, { version: component.compatibility.entityCollection })}
                        {/if}
                        {#if component.compatibility.wam}
                            {i18n.t(d.compatibleTemplate, { version: component.compatibility.wam })}
                        {/if}
                    </dd>
                </div>
                <div>
                    <dt class="section-title">{d.versions}</dt>
                    <dd class="mt-1 space-y-0.5">
                        {#each data.versions as version (version.id)}
                            <p>{version.version} · <DateTime value={version.publishedAt} mode="date" /></p>
                        {/each}
                    </dd>
                </div>
                {#if component.tags.length > 0}
                    <div class="sm:col-span-2">
                        <dt class="section-title">{d.tags}</dt>
                        <dd class="mt-1 flex flex-wrap gap-1">
                            {#each component.tags as tag (tag)}<span class="chip">{tag}</span>{/each}
                        </dd>
                    </div>
                {/if}
                {#if component.template}
                    <div>
                        <dt class="section-title">{d.requires}</dt>
                        <dd class="mt-1 flex flex-wrap gap-1">
                            {#each component.template.requires as key (key)}<span class="chip">{key}</span>{/each}
                        </dd>
                    </div>
                    <div>
                        <dt class="section-title">{c.kinds.room_template}</dt>
                        <dd class="mt-1">
                            {i18n.t(d.templateSize, {
                                width: component.template.width,
                                height: component.template.height,
                            })}
                        </dd>
                    </div>
                {/if}
            </dl>
            <p class="muted mt-4 text-xs">
                {i18n.t(d.version, { version: data.version })} · {i18n.t(d.publisher, {
                    publisher: component.publisher,
                })}
            </p>
        </section>
    </div>

    <aside class="space-y-6">
        {#if component.kind === "entity"}
            <section class="card space-y-4" aria-labelledby="install-title">
                <div>
                    <h2 id="install-title" class="font-semibold">{c.install.title}</h2>
                    <p class="muted mt-1 text-sm">{c.install.intro}</p>
                </div>
                {#if data.worlds.length === 0}
                    <p class="muted text-sm">{c.install.noWorld}</p>
                {:else}
                    <ul class="space-y-2">
                        {#each data.worlds as world (world.id)}
                            <li
                                class="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] p-2.5"
                            >
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-medium">{world.name}</p>
                                    {#if world.installedVersion}
                                        <p class="text-xs text-[var(--success)]">
                                            {i18n.t(d.version, { version: world.installedVersion })}
                                        </p>
                                    {/if}
                                </div>
                                <div class="flex shrink-0 gap-1">
                                    {#if !world.installedVersion || world.installedVersion !== data.version}
                                        <form method="POST" action="?/install" use:enhance>
                                            <input type="hidden" name="worldId" value={world.id} />
                                            <button class="btn btn-sm btn-primary" type="submit">
                                                {world.installedVersion
                                                    ? i18n.t(c.install.update, { version: data.version })
                                                    : c.install.submit}
                                            </button>
                                        </form>
                                    {/if}
                                    {#if world.installedVersion}
                                        <ConfirmForm
                                            action="?/uninstall"
                                            small
                                            label={i18n.m.common.actions.remove}
                                            title={i18n.t(c.install.removeTitle, {
                                                name: component.name,
                                                world: world.name,
                                            })}
                                            description={c.install.removeDescription}
                                            fields={{ worldId: world.id }}
                                        />
                                    {/if}
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
        {:else}
            <form
                method="POST"
                action="?/createRoom"
                class="card space-y-4"
                use:enhance
                aria-labelledby="template-title"
            >
                <div>
                    <h2 id="template-title" class="font-semibold">{c.template.title}</h2>
                    <p class="muted mt-1 text-sm">{c.template.intro}</p>
                </div>
                {#if data.worlds.length === 0}
                    <p class="muted text-sm">{c.install.noWorld}</p>
                {:else}
                    <div>
                        <label class="label" for="template-world">{c.template.world}</label>
                        <select id="template-world" class="select" name="worldId" required>
                            {#each data.worlds as world (world.id)}<option value={world.id}>{world.name}</option>{/each}
                        </select>
                    </div>
                    <div>
                        <label class="label" for="template-name">{c.template.name}</label>
                        <input
                            id="template-name"
                            class="input"
                            name="name"
                            maxlength="200"
                            required
                            bind:value={roomName}
                        />
                    </div>
                    <div>
                        <label class="label" for="template-slug">{c.template.slug}</label>
                        <input
                            id="template-slug"
                            class="input font-mono"
                            name="slug"
                            maxlength="128"
                            required
                            spellcheck="false"
                            bind:value={roomSlug}
                            oninput={() => (roomSlugEdited = true)}
                        />
                    </div>
                    <SizeChoice
                        legend={i18n.m.office.template.size}
                        bind:choice={sizeChoice}
                        bind:width={sizeWidth}
                        bind:height={sizeHeight}
                        {templateSize}
                        idPrefix="template-size"
                        compact
                    />
                    <button class="btn btn-primary w-full" type="submit">{c.template.submit}</button>
                {/if}
            </form>
        {/if}
    </aside>
</div>

<style>
    .preview {
        background: repeating-conic-gradient(var(--surface-sunken) 0% 25%, var(--surface-muted) 0% 50%) 0 0 / 16px 16px;
    }
</style>
