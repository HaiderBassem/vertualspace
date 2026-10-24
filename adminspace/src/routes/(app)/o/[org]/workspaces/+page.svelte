<script lang="ts">
    import { untrack } from "svelte";
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { SLUG_INPUT_PATTERN, suggestSlug } from "$lib/components/worlds/slug";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.workspaces);
    const slug = $derived(data.organization.slug);

    let dialog: HTMLDialogElement | undefined = $state();
    const seed = untrack(() => form?.values);
    let name = $state(seed?.name ?? "");
    let workspaceSlug = $state(seed?.slug ?? "");
    let slugEdited = $state(Boolean(seed?.slug));
    $effect(() => {
        if (!slugEdited) workspaceSlug = suggestSlug(name);
    });
    $effect(() => {
        if (form?.errors) dialog?.showModal();
    });
</script>

<PageHeader title={w.title} description={w.intro}>
    {#snippet actions()}
        {#if data.canSeeArchived}
            <a
                class="btn btn-ghost btn-sm"
                href={data.showArchived
                    ? resolve(`/o/${slug}/workspaces`)
                    : resolve(`/o/${slug}/workspaces?archived=1`)}
            >
                {#if data.showArchived}<Icon name="check" size={14} />{/if}{w.showArchived}
            </a>
        {/if}
        {#if data.canSomewhere["room.manage"]}
            <a class="btn" href={resolve(`/o/${slug}/room-sizes`)}
                ><Icon name="grid" size={16} />{i18n.m.office.bulk.open}</a
            >
        {/if}
        {#if data.can["workspace.create"]}
            <button type="button" class="btn btn-primary" onclick={() => dialog?.showModal()}>
                <Icon name="plus" size={16} />{w.create}
            </button>
        {/if}
    {/snippet}
</PageHeader>

{#if data.workspaces.length === 0}
    <div class="card card-flush"><EmptyState icon="layers" title={w.empty} description={w.intro} /></div>
{:else}
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {#each data.workspaces as workspace (workspace.id)}
            <li>
                <a
                    href={resolve(`/o/${slug}/workspaces/${workspace.slug}`)}
                    class="card card-interactive flex h-full flex-col gap-3 text-[var(--text)] no-underline"
                >
                    <div class="flex items-start justify-between gap-3">
                        <span
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                            ><Icon name="layers" size={20} /></span
                        >
                        <div class="flex flex-wrap justify-end gap-1">
                            {#if workspace.archivedAt}<span class="badge badge-warning">{w.archived}</span>{/if}
                            {#if workspace.myRole}
                                <span class="badge badge-accent">{i18n.m.shell.workspaceRoles[workspace.myRole]}</span>
                            {/if}
                        </div>
                    </div>
                    <div class="min-w-0">
                        <p class="truncate font-semibold">{workspace.name}</p>
                        {#if workspace.description}
                            <p class="muted mt-1 line-clamp-2 text-sm">{workspace.description}</p>
                        {/if}
                    </div>
                    <div class="muted mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span class="inline-flex items-center gap-1"
                            ><Icon name="globe" size={13} />{i18n.p(w.worldCount, workspace.worldCount)}</span
                        >
                        <span class="inline-flex items-center gap-1"
                            ><Icon name="users" size={13} />{i18n.p(w.peopleCount, workspace.memberCount)}</span
                        >
                    </div>
                </a>
            </li>
        {/each}
    </ul>
{/if}

{#if data.can["workspace.create"]}
    <dialog
        bind:this={dialog}
        class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] shadow-[var(--shadow-lg)] backdrop:bg-black/50"
        aria-labelledby="create-workspace-title"
    >
        <form method="POST" action="?/create" class="space-y-5 p-6" use:enhance>
            <h2 id="create-workspace-title" class="text-lg font-semibold">{w.createTitle}</h2>
            <FormMessage {form} />
            <Field label={w.fields.name} name="name" required error={form?.errors?.name}>
                {#snippet children(a)}<input
                        class="input"
                        {...a}
                        name="name"
                        maxlength="200"
                        bind:value={name}
                    />{/snippet}
            </Field>
            <Field label={w.fields.slug} name="slug" required error={form?.errors?.slug} hint={w.hints.slug}>
                {#snippet children(a)}
                    <input
                        class="input font-mono"
                        {...a}
                        name="slug"
                        maxlength="64"
                        pattern={SLUG_INPUT_PATTERN}
                        spellcheck="false"
                        autocomplete="off"
                        bind:value={workspaceSlug}
                        oninput={() => (slugEdited = true)}
                    />
                {/snippet}
            </Field>
            <Field label={w.fields.description} name="description" hint={w.hints.description}>
                {#snippet children(a)}
                    <textarea class="textarea" {...a} name="description" rows="3" maxlength="2000"></textarea>
                {/snippet}
            </Field>
            <div class="flex justify-end gap-2">
                <button type="button" class="btn" onclick={() => dialog?.close()}>{i18n.m.common.actions.cancel}</button
                >
                <button class="btn btn-primary" type="submit">{i18n.m.common.actions.create}</button>
            </div>
        </form>
    </dialog>
{/if}
