<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import Avatar from "$lib/components/Avatar.svelte";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const w = $derived(i18n.m.workspaces);
    const roles = $derived(i18n.m.shell.workspaceRoles);
    const slug = $derived(data.organization.slug);
    const ws = $derived(data.workspace);
    const perms = $derived(data.permissions);

    const workspaceError = $derived(form && "workspaceError" in form ? form.workspaceError : undefined);
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
    const assignableRoles = $derived(
        (["member", "manager"] as const).filter((r) => (r === "manager" ? perms.assignManagers : perms.assignMembers)),
    );

    const stateClass = (state: "open" | "archived" | "expired") =>
        state === "open" ? "badge-success" : state === "expired" ? "badge-warning" : "badge-danger";
</script>

<PageHeader title={ws.name} description={ws.description ?? w.intro}>
    {#snippet actions()}
        {#if ws.archivedAt}<span class="badge badge-warning">{w.archived}</span>{/if}
        {#if perms.resizeRooms && !ws.archivedAt}
            <a class="btn" href={resolve(`/o/${slug}/room-sizes?workspace=${ws.slug}`)}
                ><Icon name="grid" size={16} />{i18n.m.office.bulk.open}</a
            >
        {/if}
        {#if perms.createWorld && !ws.archivedAt}
            <a class="btn" href={resolve(`/o/${slug}/w/new?workspace=${ws.id}`)}
                ><Icon name="plus" size={16} />{w.detail.newWorld}</a
            >
            {#if perms.resizeRooms}
                <a class="btn btn-primary" href={resolve(`/o/${slug}/office/new?workspace=${ws.id}`)}
                    ><Icon name="sparkle" size={16} />{i18n.m.office.wizard.entry}</a
                >
            {/if}
        {/if}
    {/snippet}
</PageHeader>

<div aria-live="polite">
    {#if data.created}
        <p class="notice notice-success mb-4"><Icon name="check" />{w.created}</p>
    {:else if form && "success" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{w.updated}</p>
    {:else if form && "archived" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{i18n.p(w.archive.done, form.archived ?? 0)}</p>
    {:else if form && "restored" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{i18n.p(w.archive.restored, form.restored ?? 0)}</p>
    {:else if form && "assigned" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{w.detail.assigned}</p>
    {:else if form && "unassigned" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{w.detail.unassigned}</p>
    {:else if workspaceError}
        <p class="notice notice-danger mb-4" role="alert">
            <Icon name="alert" />
            {workspaceError === "lastActive"
                ? w.archive.lastActive
                : workspaceError === "notEmpty"
                  ? w.remove.notEmpty
                  : workspaceError === "lastWorkspace"
                    ? w.remove.lastWorkspace
                    : w.detail.notMember}
        </p>
    {/if}
</div>
<FormMessage form={formMessage} />

<div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
    <div class="space-y-6">
        <section class="card card-flush" aria-labelledby="ws-worlds">
            <div class="card-header">
                <div>
                    <h2 id="ws-worlds">{w.detail.worlds}</h2>
                    <p class="muted text-xs">{w.detail.worldsIntro}</p>
                </div>
            </div>
            {#if data.worlds.length === 0}
                <EmptyState icon="globe" title={w.detail.noWorlds} compact>
                    {#snippet actions()}
                        {#if perms.createWorld && !ws.archivedAt}
                            <a class="btn btn-primary btn-sm" href={resolve(`/o/${slug}/w/new?workspace=${ws.id}`)}
                                >{w.detail.newWorld}</a
                            >
                        {/if}
                    {/snippet}
                </EmptyState>
            {:else}
                <ul class="divide-y divide-[var(--border)]">
                    {#each data.worlds as world (world.slug)}
                        <li class="flex items-center gap-3 px-5 py-3">
                            <Icon name="globe" class="text-[var(--text-muted)]" />
                            <div class="min-w-0 flex-1">
                                <a class="font-medium" href={resolve(`/o/${slug}/w/${world.slug}`)}>{world.name}</a>
                                <p class="muted text-xs">{i18n.m.worlds.accessPolicy[world.accessPolicy]}</p>
                            </div>
                            <span class="badge {stateClass(world.state)}">{i18n.m.worlds.state[world.state]}</span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <section class="card card-flush" aria-labelledby="ws-people">
            <div class="card-header">
                <div>
                    <h2 id="ws-people">{w.detail.people}</h2>
                    <p class="muted text-xs">{w.detail.peopleIntro}</p>
                </div>
            </div>
            {#if data.people.length === 0}
                <p class="muted px-5 py-6 text-sm">{w.detail.noPeople}</p>
            {:else}
                <ul class="divide-y divide-[var(--border)]">
                    {#each data.people as person (person.accountId)}
                        <li class="flex flex-wrap items-center gap-3 px-5 py-3">
                            <Avatar name={person.name} seed={person.accountId} size={32} />
                            <div class="min-w-0 flex-1">
                                <p class="truncate text-sm font-medium">{person.name}</p>
                                <p class="muted truncate text-xs">{person.email}</p>
                            </div>
                            <span class="badge {person.role === 'manager' ? 'badge-accent' : ''}"
                                >{roles[person.role]}</span
                            >
                            {#if person.suspended}<span class="badge badge-warning">{i18n.m.team.status.suspended}</span
                                >{/if}
                            {#if person.role === "manager" ? perms.assignManagers : perms.assignMembers}
                                <ConfirmForm
                                    action="?/unassign"
                                    small
                                    label={w.detail.unassign}
                                    title={i18n.t(w.detail.unassignTitle, { name: person.name })}
                                    fields={{ accountId: person.accountId }}
                                />
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
            {#if perms.assignMembers && data.candidates.length > 0}
                <form method="POST" action="?/assign" class="card-footer flex-wrap !justify-start" use:enhance>
                    <label class="sr-only" for="assign-person">{w.detail.assignPerson}</label>
                    <select
                        id="assign-person"
                        class="select input-sm !w-auto min-w-48 flex-1"
                        name="accountId"
                        required
                    >
                        {#each data.candidates as person (person.accountId)}
                            <option value={person.accountId}>{person.name} ({person.email})</option>
                        {/each}
                    </select>
                    <label class="sr-only" for="assign-role">{w.detail.assignRole}</label>
                    <select id="assign-role" class="select input-sm !w-auto" name="role">
                        {#each assignableRoles as role (role)}<option value={role}>{roles[role]}</option>{/each}
                    </select>
                    <button class="btn btn-sm btn-primary" type="submit">{w.detail.assignSubmit}</button>
                </form>
            {/if}
        </section>
    </div>

    <aside class="space-y-6">
        {#if perms.edit}
            <form method="POST" action="?/update" class="card space-y-4" use:enhance aria-labelledby="ws-settings">
                <h2 id="ws-settings" class="font-semibold">{w.detail.settings}</h2>
                <Field label={w.fields.name} name="name" required>
                    {#snippet children(a)}<input
                            class="input"
                            {...a}
                            name="name"
                            maxlength="200"
                            value={ws.name}
                        />{/snippet}
                </Field>
                <Field label={w.fields.description} name="description">
                    {#snippet children(a)}
                        <textarea class="textarea" {...a} name="description" rows="3" maxlength="2000"
                            >{ws.description ?? ""}</textarea
                        >
                    {/snippet}
                </Field>
                <p class="muted text-xs">{w.fields.slug}: <code dir="ltr">{ws.slug}</code></p>
                <button class="btn btn-primary" type="submit">{i18n.m.common.actions.save}</button>
            </form>
        {/if}
        {#if perms.archive}
            <section class="card space-y-3" aria-label={w.archive.action}>
                {#if ws.archivedAt}
                    <form method="POST" action="?/restore" use:enhance>
                        <button class="btn w-full" type="submit"
                            ><Icon name="refresh" size={16} />{w.archive.restore}</button
                        >
                    </form>
                {:else}
                    <ConfirmForm
                        action="?/archive"
                        danger={false}
                        label={w.archive.action}
                        title={i18n.t(w.archive.title, { name: ws.name })}
                        description={w.archive.description}
                    />
                {/if}
                <ConfirmForm
                    action="?/delete"
                    label={w.remove.action}
                    title={i18n.t(w.remove.title, { name: ws.name })}
                    description={w.remove.description}
                    confirmValue={ws.slug}
                />
            </section>
        {/if}
    </aside>
</div>
