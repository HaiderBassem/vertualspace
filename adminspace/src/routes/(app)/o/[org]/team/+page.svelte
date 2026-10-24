<script lang="ts">
    import { onMount } from "svelte";
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import Avatar from "$lib/components/Avatar.svelte";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const t = $derived(i18n.m.team);
    const roles = $derived(i18n.m.shell.roles);
    const workspaceRoles = $derived(i18n.m.shell.workspaceRoles);
    const canManage = $derived(data.can["team.manage"]);
    const canInvite = $derived(data.can["team.invite"]);
    const tab = $derived(page.url.searchParams.get("tab") === "invitations" ? "invitations" : "people");

    const WORKSPACE_ROLE_KEYS = ["manager", "member"] as const;
    let inviteDialog: HTMLDialogElement | undefined = $state();
    let selected = $state<string[]>([]);
    let bulkOperation = $state("role");

    const teamError = $derived(form && "teamError" in form ? form.teamError : undefined);
    const done = $derived(form && "done" in form ? form.done : undefined);
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
    const inviteResults = $derived(form && "inviteResults" in form ? form.inviteResults : undefined);
    const bulkResults = $derived(form && "bulkResults" in form ? form.bulkResults : undefined);
    const resent = $derived(form && "resent" in form ? form.resent : undefined);
    const inviteError = $derived(form && "inviteError" in form ? form.inviteError : undefined);
    const transferError = $derived(form && "transferError" in form ? form.transferError : undefined);
    const bulkError = $derived(form && "bulkError" in form ? form.bulkError : undefined);

    const manageableOnPage = $derived(data.team.filter((m) => m.manageable).map((m) => m.accountId));
    const allSelected = $derived(manageableOnPage.length > 0 && manageableOnPage.every((id) => selected.includes(id)));
    const transferCandidates = $derived(
        data.team.filter((m) => m.accountId !== data.currentAccountId && m.status === "active" && m.role !== "owner"),
    );
    const nameOf = (accountId: string) => data.team.find((m) => m.accountId === accountId)?.name ?? accountId;

    function pageHref(p: number): string {
        const params = new SvelteURLSearchParams(page.url.searchParams);
        params.set("page", String(p));
        return resolve(`/o/${data.organization.slug}/team?${params.toString()}`);
    }

    $effect(() => {
        // A finished invitation round shows its results in the dialog.
        if (inviteResults) inviteDialog?.showModal();
    });
    onMount(() => {
        // "Invite people" links (e.g. after creating an office) open the invitation dialog directly.
        if (canInvite && page.url.searchParams.get("invite") === "1") inviteDialog?.showModal();
    });
</script>

<PageHeader title={t.title} description={t.intro}>
    {#snippet actions()}
        {#if canInvite}
            <button type="button" class="btn btn-primary" onclick={() => inviteDialog?.showModal()}>
                <Icon name="plus" size={16} />{t.invite}
            </button>
        {/if}
    {/snippet}
</PageHeader>

<div aria-live="polite">
    {#if teamError}
        <p class="notice notice-danger mb-4" role="alert"><Icon name="alert" />{t.errors[teamError]}</p>
    {:else if done}
        <p class="notice notice-success mb-4"><Icon name="check" />{t.done[done]}</p>
    {:else if resent}
        <div class="notice notice-success mb-4 flex-col">
            <span>{t.invitations.resent}</span>
            {#if resent.link}
                <span class="w-full text-[var(--text)]">{t.invitations.newLink} <CopyText value={resent.link} /></span>
            {/if}
        </div>
    {:else if inviteError === "originMissing"}
        <p class="notice notice-danger mb-4" role="alert">{t.inviteDialog.originMissing}</p>
    {/if}
</div>
<FormMessage form={formMessage} />

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <nav class="segmented" aria-label={t.title}>
        <a href={resolve(`/o/${data.organization.slug}/team`)} aria-current={tab === "people" ? "page" : undefined}>
            <Icon name="users" size={15} />{t.tabs.people}
            <span class="chip">{data.counts.active + data.counts.suspended}</span>
        </a>
        <a
            href={resolve(`/o/${data.organization.slug}/team?tab=invitations`)}
            aria-current={tab === "invitations" ? "page" : undefined}
        >
            <Icon name="mail" size={15} />{t.tabs.invitations}
            <span class="chip">{data.counts.pending}</span>
        </a>
    </nav>
    <p class="muted text-sm">
        {i18n.p(t.summary.active, data.counts.active)} · {i18n.p(t.summary.suspended, data.counts.suspended)}
    </p>
</div>

{#if tab === "people"}
    <form method="GET" class="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div class="min-w-56 flex-1">
            <label class="sr-only" for="team-q">{t.filters.search}</label>
            <input
                id="team-q"
                class="input"
                type="search"
                name="q"
                placeholder={t.filters.search}
                value={data.filters.q}
            />
        </div>
        <div>
            <label class="sr-only" for="team-role">{t.filters.role}</label>
            <select id="team-role" class="select" name="role" value={data.filters.role}>
                <option value="">{t.filters.anyRole}</option>
                {#each data.roles as role (role)}<option value={role}>{roles[role]}</option>{/each}
            </select>
        </div>
        <div>
            <label class="sr-only" for="team-status">{t.filters.status}</label>
            <select id="team-status" class="select" name="status" value={data.filters.status}>
                <option value="">{t.filters.anyStatus}</option>
                <option value="active">{t.status.active}</option>
                <option value="suspended">{t.status.suspended}</option>
            </select>
        </div>
        <button class="btn" type="submit"><Icon name="filter" size={16} />{t.filters.apply}</button>
        {#if data.filters.q || data.filters.role || data.filters.status}
            <a class="btn btn-ghost" href={resolve(`/o/${data.organization.slug}/team`)}>{t.filters.clear}</a>
        {/if}
    </form>

    {#if bulkResults}
        {@const refused = bulkResults.filter((r) => r.result !== "ok")}
        <section class="notice mb-4 flex-col" aria-labelledby="bulk-report">
            <h2 id="bulk-report" class="font-semibold">{t.bulk.report}</h2>
            <p>{i18n.p(t.bulk.done, bulkResults.length - refused.length)}</p>
            {#if refused.length > 0}
                <p>{i18n.p(t.bulk.refused, refused.length)}</p>
                <ul class="list-inside list-disc text-sm">
                    {#each refused as item (item.accountId)}
                        <li>{nameOf(item.accountId)} — {t.results[item.result]}</li>
                    {/each}
                </ul>
            {/if}
        </section>
    {/if}

    {#if canManage}
        <form
            id="bulk"
            method="POST"
            action="?/bulk"
            class="mb-3 flex flex-wrap items-center gap-2"
            use:enhance={() =>
                async ({ update }) => {
                    await update();
                    selected = [];
                }}
        >
            <span class="muted min-w-28 text-sm" aria-live="polite">{i18n.p(t.bulk.selected, selected.length)}</span>
            <label class="sr-only" for="bulk-operation">{t.bulk.operation}</label>
            <select id="bulk-operation" class="select input-sm !w-auto" name="operation" bind:value={bulkOperation}>
                <option value="role">{t.bulk.changeRole}</option>
                <option value="suspend">{t.bulk.suspend}</option>
                <option value="reactivate">{t.bulk.reactivate}</option>
                <option value="remove">{t.bulk.remove}</option>
            </select>
            {#if bulkOperation === "role"}
                <label class="sr-only" for="bulk-role">{t.columns.role}</label>
                <select id="bulk-role" class="select input-sm !w-auto" name="role">
                    {#each data.grantableRoles as role (role)}<option value={role}>{roles[role]}</option>{/each}
                </select>
            {/if}
            <button class="btn btn-sm" type="submit" disabled={selected.length === 0}>{t.bulk.apply}</button>
            {#if bulkError}<span class="field-error !mt-0" role="alert">{t.bulk[bulkError]}</span>{/if}
        </form>
    {/if}

    <div class="card card-flush">
        {#if data.team.length === 0}
            <EmptyState icon="users" title={t.empty} compact />
        {:else}
            <div class="overflow-x-auto">
                <table class="table">
                    <thead>
                        <tr>
                            {#if canManage}
                                <th scope="col" class="w-10">
                                    <input
                                        type="checkbox"
                                        aria-label={t.columns.selectAll}
                                        checked={allSelected}
                                        disabled={manageableOnPage.length === 0}
                                        onchange={(e) =>
                                            (selected = e.currentTarget.checked ? [...manageableOnPage] : [])}
                                    />
                                </th>
                            {/if}
                            <th scope="col">{t.columns.person}</th>
                            <th scope="col">{t.columns.role}</th>
                            <th scope="col">{t.columns.workspaces}</th>
                            <th scope="col">{t.columns.status}</th>
                            <th scope="col">{t.columns.lastLogin}</th>
                            {#if canManage}<th scope="col"
                                    ><span class="sr-only">{i18n.m.common.labels.actions}</span></th
                                >{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.team as member (member.accountId)}
                            <tr>
                                {#if canManage}
                                    <td>
                                        {#if member.manageable}
                                            <input
                                                type="checkbox"
                                                form="bulk"
                                                name="accountIds"
                                                value={member.accountId}
                                                aria-label={i18n.t(t.columns.select, { name: member.name })}
                                                bind:group={selected}
                                            />
                                        {/if}
                                    </td>
                                {/if}
                                <td>
                                    <div class="flex items-center gap-3">
                                        <Avatar name={member.name} seed={member.accountId} size={32} />
                                        <div class="min-w-0">
                                            <p class="truncate font-medium">
                                                {member.name}
                                                {#if member.accountId === data.currentAccountId}
                                                    <span class="badge ms-1">{t.you}</span>
                                                {/if}
                                            </p>
                                            <p class="muted truncate text-xs">{member.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {#if member.manageable}
                                        <form method="POST" action="?/role" class="flex items-center gap-2" use:enhance>
                                            <input type="hidden" name="accountId" value={member.accountId} />
                                            <label class="sr-only" for="role-{member.accountId}">{t.columns.role}</label
                                            >
                                            <select
                                                id="role-{member.accountId}"
                                                class="select input-sm !w-auto"
                                                name="role"
                                                value={member.role}
                                                onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                            >
                                                {#each data.grantableRoles as role (role)}
                                                    <option value={role}>{roles[role]}</option>
                                                {/each}
                                            </select>
                                            <noscript
                                                ><button class="btn btn-sm" type="submit"
                                                    >{i18n.m.common.actions.save}</button
                                                ></noscript
                                            >
                                        </form>
                                    {:else}
                                        <span class="badge {member.role === 'owner' ? 'badge-accent' : ''}"
                                            >{roles[member.role]}</span
                                        >
                                    {/if}
                                </td>
                                <td>
                                    {#if member.workspaces.length > 0}
                                        <div class="flex max-w-64 flex-wrap gap-1">
                                            {#each member.workspaces as workspace (workspace.name)}
                                                <span class="chip" title={workspaceRoles[workspace.role]}>
                                                    {#if workspace.role === "manager"}<Icon
                                                            name="star"
                                                            size={11}
                                                        />{/if}
                                                    {workspace.name}
                                                </span>
                                            {/each}
                                        </div>
                                    {:else if member.role !== "employee"}
                                        <span class="muted text-xs" title={t.noWorkspaceHint}>{t.noWorkspace}</span>
                                    {:else}
                                        <span class="muted text-xs">—</span>
                                    {/if}
                                </td>
                                <td>
                                    {#if member.accountDisabled}
                                        <span class="badge badge-danger">{t.status.accountDisabled}</span>
                                    {:else if member.status === "suspended"}
                                        <span class="badge badge-warning">{t.status.suspended}</span>
                                    {:else}
                                        <span class="badge badge-success"
                                            ><span class="dot"></span>{t.status.active}</span
                                        >
                                    {/if}
                                </td>
                                <td class="text-sm"><DateTime value={member.lastLoginAt} mode="relative" /></td>
                                {#if canManage}
                                    <td class="text-end">
                                        {#if member.manageable}
                                            <div class="flex justify-end gap-1">
                                                {#if member.status === "suspended"}
                                                    <form method="POST" action="?/reactivate" use:enhance>
                                                        <input
                                                            type="hidden"
                                                            name="accountId"
                                                            value={member.accountId}
                                                        />
                                                        <button class="btn btn-sm" type="submit"
                                                            >{t.actions.reactivate}</button
                                                        >
                                                    </form>
                                                {:else}
                                                    <ConfirmForm
                                                        action="?/suspend"
                                                        small
                                                        danger={false}
                                                        label={t.actions.suspend}
                                                        title={i18n.t(t.actions.suspendTitle, { name: member.name })}
                                                        description={t.actions.suspendDescription}
                                                        fields={{ accountId: member.accountId }}
                                                    />
                                                {/if}
                                                <ConfirmForm
                                                    action="?/remove"
                                                    small
                                                    label={i18n.m.common.actions.remove}
                                                    title={i18n.t(t.actions.removeTitle, { name: member.name })}
                                                    description={t.actions.removeDescription}
                                                    fields={{ accountId: member.accountId }}
                                                />
                                            </div>
                                        {/if}
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
{:else}
    <div class="card card-flush">
        {#if data.invitations.length === 0}
            <EmptyState icon="mail" title={t.invitations.empty} description={t.invitations.emptyHint}>
                {#snippet actions()}
                    {#if canInvite}
                        <button type="button" class="btn btn-primary" onclick={() => inviteDialog?.showModal()}
                            >{t.invite}</button
                        >
                    {/if}
                {/snippet}
            </EmptyState>
        {:else}
            <div class="overflow-x-auto">
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">{t.invitations.columns.email}</th>
                            <th scope="col">{t.invitations.columns.role}</th>
                            <th scope="col">{t.invitations.columns.workspaces}</th>
                            <th scope="col">{t.invitations.columns.state}</th>
                            <th scope="col">{t.invitations.columns.delivery}</th>
                            <th scope="col">{t.invitations.columns.expires}</th>
                            {#if canInvite}<th scope="col"
                                    ><span class="sr-only">{i18n.m.common.labels.actions}</span></th
                                >{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.invitations as invitation (invitation.id)}
                            <tr>
                                <td class="font-medium">{invitation.email}</td>
                                <td><span class="badge">{roles[invitation.role]}</span></td>
                                <td>
                                    <div class="flex max-w-64 flex-wrap gap-1">
                                        {#each invitation.workspaces as workspace (workspace.workspaceId)}
                                            <span class="chip">{workspace.name}</span>
                                        {:else}<span class="muted text-xs">—</span>{/each}
                                    </div>
                                </td>
                                <td>
                                    <span
                                        class="badge {invitation.state === 'pending'
                                            ? 'badge-accent'
                                            : 'badge-warning'}">{t.invitations.state[invitation.state]}</span
                                    >
                                </td>
                                <td class="text-sm">
                                    {invitation.lastDelivery === "sent" ||
                                    invitation.lastDelivery === "failed" ||
                                    invitation.lastDelivery === "not_configured"
                                        ? t.invitations.delivery[invitation.lastDelivery]
                                        : t.invitations.delivery.none}
                                </td>
                                <td class="text-sm"><DateTime value={invitation.expiresAt} /></td>
                                {#if canInvite}
                                    <td class="text-end">
                                        {#if invitation.manageable}
                                            <div class="flex justify-end gap-1">
                                                <form method="POST" action="?/resend" use:enhance>
                                                    <input type="hidden" name="invitationId" value={invitation.id} />
                                                    <button
                                                        class="btn btn-sm"
                                                        type="submit"
                                                        title={t.invitations.resendHint}
                                                        ><Icon name="refresh" size={14} />{t.invitations.resend}</button
                                                    >
                                                </form>
                                                <ConfirmForm
                                                    action="?/revoke"
                                                    small
                                                    label={t.invitations.revoke}
                                                    title={i18n.t(t.invitations.revokeTitle, {
                                                        email: invitation.email,
                                                    })}
                                                    description={t.invitations.revokeDescription}
                                                    fields={{ invitationId: invitation.id }}
                                                />
                                            </div>
                                        {/if}
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
{/if}

<div class="mt-10 grid gap-6 lg:grid-cols-2">
    {#if data.can["ownership.transfer"]}
        <section class="card space-y-4" aria-labelledby="transfer-title">
            <div>
                <h2 id="transfer-title" class="font-semibold">{t.transfer.title}</h2>
                <p class="muted mt-1 text-sm">{t.transfer.intro}</p>
            </div>
            {#if transferError}
                <p class="notice notice-danger" role="alert">
                    {transferError === "wrongPassword"
                        ? t.transfer.wrongPassword
                        : transferError === "rateLimited"
                          ? t.transfer.rateLimited
                          : transferError === "validation"
                            ? i18n.m.common.errors.validation
                            : t.errors[transferError]}
                </p>
            {/if}
            {#if transferCandidates.length === 0}
                <p class="muted text-sm">{t.transfer.none}</p>
            {:else}
                <form method="POST" action="?/transfer" class="space-y-3" use:enhance>
                    <div>
                        <label class="label" for="transfer-target">{t.transfer.target}</label>
                        <select id="transfer-target" class="select" name="accountId" required>
                            {#each transferCandidates as member (member.accountId)}
                                <option value={member.accountId}>{member.name} ({member.email})</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="label" for="transfer-password">{t.transfer.password}</label>
                        <input
                            id="transfer-password"
                            class="input"
                            type="password"
                            name="password"
                            autocomplete="current-password"
                            required
                        />
                    </div>
                    <button class="btn btn-danger" type="submit">{t.transfer.submit}</button>
                </form>
            {/if}
        </section>
    {/if}
    {#if !data.support}
        <section class="card space-y-3" aria-labelledby="leave-title">
            <div>
                <h2 id="leave-title" class="font-semibold">{t.leave.title}</h2>
                <p class="muted mt-1 text-sm">{t.leave.intro}</p>
            </div>
            <ConfirmForm
                action="?/leave"
                label={i18n.t(t.leave.action, { organization: data.organization.name })}
                title={i18n.t(t.leave.confirmTitle, { organization: data.organization.name })}
                description={t.leave.intro}
            />
        </section>
    {/if}
</div>

<details class="card mt-6">
    <summary class="cursor-pointer font-semibold">{t.roles.title}</summary>
    <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        {#each data.roles as role (role)}
            <div>
                <dt class="font-semibold">{roles[role]}</dt>
                <dd class="muted">{roles.descriptions[role]}</dd>
            </div>
        {/each}
        {#each WORKSPACE_ROLE_KEYS as role (role)}
            <div>
                <dt class="font-semibold">{workspaceRoles[role]}</dt>
                <dd class="muted">{workspaceRoles.descriptions[role]}</dd>
            </div>
        {/each}
    </dl>
</details>

{#if canInvite}
    <dialog
        bind:this={inviteDialog}
        class="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] shadow-[var(--shadow-lg)] backdrop:bg-black/50"
        aria-labelledby="invite-title"
    >
        <div class="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 id="invite-title" class="text-lg font-semibold">{t.inviteDialog.title}</h2>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" onclick={() => inviteDialog?.close()}>
                <Icon name="x" label={i18n.m.common.actions.close} />
            </button>
        </div>
        {#if inviteResults}
            <div class="space-y-4 px-6 py-5">
                <h3 class="section-title">{t.inviteResults.title}</h3>
                <ul class="space-y-3">
                    {#each inviteResults as result (result.email)}
                        <li class="rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <span class="font-medium">{result.email}</span>
                                {#if result.result === "invited"}
                                    <span
                                        class="badge {result.delivery === 'sent' ? 'badge-success' : 'badge-warning'}"
                                    >
                                        {result.delivery === "sent"
                                            ? t.inviteResults.sent
                                            : result.delivery === "failed"
                                              ? t.inviteResults.failed
                                              : t.inviteResults.notSent}
                                    </span>
                                {:else}
                                    <span class="badge badge-danger">{t.inviteResults[result.result]}</span>
                                {/if}
                            </div>
                            {#if result.link}<div class="mt-2"><CopyText value={result.link} /></div>{/if}
                        </li>
                    {/each}
                </ul>
                <div class="flex justify-end gap-2">
                    <a class="btn" href={resolve(`/o/${data.organization.slug}/team?tab=invitations`)}
                        >{t.tabs.invitations}</a
                    >
                    <button type="button" class="btn btn-primary" onclick={() => inviteDialog?.close()}
                        >{i18n.m.common.actions.close}</button
                    >
                </div>
            </div>
        {:else}
            <form method="POST" action="?/invite" class="space-y-5 px-6 py-5" use:enhance>
                <p class="muted text-sm">{t.inviteDialog.intro}</p>
                {#if !data.mailConfigured}
                    <p class="notice notice-info text-sm"><Icon name="info" />{t.inviteDialog.noMail}</p>
                {/if}
                {#if inviteError === "tooMany" || inviteError === "rateLimited"}
                    <p class="notice notice-danger" role="alert">{t.inviteDialog[inviteError]}</p>
                {/if}
                <div>
                    <label class="label" for="invite-emails">{t.inviteDialog.emails}</label>
                    <textarea
                        id="invite-emails"
                        class="textarea"
                        name="emails"
                        rows="3"
                        required
                        spellcheck="false"
                        aria-describedby="invite-emails-hint"></textarea>
                    <p class="hint" id="invite-emails-hint">
                        {i18n.t(t.inviteDialog.emailsHint, { max: data.maxInvitations })}
                    </p>
                </div>
                <div>
                    <label class="label" for="invite-role">{t.inviteDialog.role}</label>
                    <select id="invite-role" class="select" name="role" value="employee">
                        {#each data.grantableRoles as role (role)}<option value={role}>{roles[role]}</option>{/each}
                    </select>
                </div>
                {#if data.workspaces.length > 0}
                    <fieldset>
                        <legend class="label">{t.inviteDialog.workspaces}</legend>
                        <p class="hint !mt-0 mb-2">{t.inviteDialog.workspacesHint}</p>
                        <div
                            class="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)]"
                        >
                            {#each data.workspaces as workspace (workspace.id)}
                                <div class="flex items-center justify-between gap-3 px-3 py-2">
                                    <label for="invite-ws-{workspace.id}" class="text-sm font-medium"
                                        >{workspace.name}</label
                                    >
                                    <select
                                        id="invite-ws-{workspace.id}"
                                        class="select input-sm !w-auto"
                                        name="workspace:{workspace.id}"
                                        value={data.workspaces.length === 1 ? "member" : ""}
                                    >
                                        <option value="">{t.inviteDialog.noAccess}</option>
                                        <option value="member">{workspaceRoles.member}</option>
                                        <option value="manager">{workspaceRoles.manager}</option>
                                    </select>
                                </div>
                            {/each}
                        </div>
                    </fieldset>
                {/if}
                <div class="flex justify-end gap-2">
                    <button type="button" class="btn" onclick={() => inviteDialog?.close()}
                        >{i18n.m.common.actions.cancel}</button
                    >
                    <button class="btn btn-primary" type="submit"
                        ><Icon name="mail" size={16} />{t.inviteDialog.submit}</button
                    >
                </div>
            </form>
        {/if}
    </dialog>
{/if}
