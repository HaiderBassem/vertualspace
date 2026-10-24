<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import Avatar from "$lib/components/Avatar.svelte";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const c = $derived(i18n.m.control);
    const org = $derived(data.organization);
    const figureKeys = ["workspaces", "worlds", "rooms", "people", "members"] as const;
    const ownerError = $derived(form && "ownerError" in form ? form.ownerError : undefined);
</script>

<p class="mb-2 text-sm">
    <a href={resolve("/admin/organizations")} class="inline-flex items-center gap-1"
        ><Icon name="chevron-left" size={14} />{c.organization.back}</a
    >
</p>

<PageHeader title={org.name} description={i18n.t(c.organization.createdAt, { date: i18n.date(org.createdAt) })}>
    {#snippet actions()}
        <span class="badge {org.status === 'active' ? 'badge-success' : 'badge-warning'}"
            >{c.organization.status[org.status]}</span
        >
        {#if data.isMember}
            <a class="btn" href={resolve(`/o/${org.slug}`)} title={c.organization.openAsMember}
                ><Icon name="arrow-right" size={16} />{c.organization.open}</a
            >
        {/if}
    {/snippet}
</PageHeader>

<div aria-live="polite">
    {#if form?.lifecycle}
        <p class="notice notice-success mb-4"><Icon name="check" />{c.organization.lifecycle[form.lifecycle]}</p>
    {:else if form && "supportEnded" in form}
        <p class="notice notice-success mb-4"><Icon name="check" />{c.support.ended}</p>
    {:else if form?.ownerInvited}
        <div class="notice notice-success mb-4 flex-col">
            <span>{c.organization.inviteOwner.done}</span>
            {#if form.ownerInvited.link}
                <span class="w-full text-[var(--text)]"
                    >{c.organization.inviteOwner.link} <CopyText value={form.ownerInvited.link} /></span
                >
            {/if}
        </div>
    {/if}
</div>

<dl class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {#each figureKeys as key (key)}
        <div class="card stat !p-4">
            <dt class="stat-label">{c.organization.figures[key]}</dt>
            <dd class="stat-value">{i18n.number(data.stats[key])}</dd>
        </div>
    {/each}
</dl>

<div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
    <div class="space-y-6">
        <section class="card space-y-4" aria-labelledby="support-title">
            <div>
                <h2 id="support-title" class="flex items-center gap-2 font-semibold">
                    <Icon name="lock" size={17} />{c.support.title}
                </h2>
                <p class="muted mt-1 text-sm">{c.support.intro}</p>
            </div>
            {#if data.isMember}
                <p class="notice notice-info text-sm"><Icon name="info" />{c.organization.openAsMember}</p>
            {:else if data.activeGrant}
                <p class="notice notice-warning text-sm" role="status">
                    <Icon name="clock" />{i18n.t(c.support.active, { time: i18n.dateTime(data.activeGrant.expiresAt) })}
                </p>
                <div class="flex flex-wrap gap-2">
                    <a class="btn btn-primary" href={resolve(`/o/${org.slug}`)}
                        ><Icon name="arrow-right" size={16} />{c.organization.open}</a
                    >
                    <form method="POST" action="?/endSupport" use:enhance>
                        <button class="btn" type="submit">{c.support.end}</button>
                    </form>
                </div>
            {:else}
                {#if form && "supportError" in form}
                    <p class="notice notice-danger" role="alert">{i18n.m.common.errors.requiredField}</p>
                {/if}
                <form method="POST" action="?/startSupport" class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                    <div class="sm:col-span-2">
                        <label class="label" for="support-reason">{c.support.reason}</label>
                        <input
                            id="support-reason"
                            class="input"
                            name="reason"
                            required
                            minlength="5"
                            maxlength="500"
                            aria-describedby="support-reason-hint"
                        />
                        <p class="hint" id="support-reason-hint">{c.support.reasonHint}</p>
                    </div>
                    <div>
                        <label class="label" for="support-minutes">{c.support.duration}</label>
                        <select id="support-minutes" class="select" name="minutes" value="60">
                            {#each data.durations as minutes (minutes)}
                                <option value={minutes}>{i18n.p(c.support.minutes, minutes)}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button class="btn btn-primary w-full" type="submit">{c.support.start}</button>
                    </div>
                </form>
            {/if}
            <details class="text-sm">
                <summary class="cursor-pointer font-medium">{c.support.grants}</summary>
                <p class="muted mt-2">{c.support.grantsText}</p>
            </details>
        </section>

        <section class="card card-flush" aria-labelledby="history-title">
            <div class="card-header"><h2 id="history-title">{c.support.history}</h2></div>
            {#if data.grants.length === 0}
                <p class="muted px-5 py-6 text-sm">{c.support.noHistory}</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="table table-dense">
                        <thead>
                            <tr>
                                <th scope="col">{c.support.columns.who}</th>
                                <th scope="col">{c.support.columns.reason}</th>
                                <th scope="col">{c.support.columns.started}</th>
                                <th scope="col">{c.support.columns.ends}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.grants as grant (grant.id)}
                                <tr>
                                    <td class="text-sm">{grant.accountName ?? "—"}</td>
                                    <td class="max-w-72 truncate text-sm" title={grant.reason}>{grant.reason}</td>
                                    <td class="text-sm"><DateTime value={grant.createdAt} /></td>
                                    <td class="text-sm">
                                        {#if grant.active}<span class="badge badge-warning"
                                                >{c.organization.status.active}</span
                                            >{/if}
                                        <DateTime value={grant.endedAt ?? grant.expiresAt} />
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </section>
    </div>

    <aside class="space-y-6">
        <section class="card space-y-3" aria-labelledby="owners-title">
            <h2 id="owners-title" class="font-semibold">{c.organization.owners}</h2>
            {#if data.owners.length === 0}
                <p class="notice notice-warning text-sm"><Icon name="alert" />{c.organization.noOwner}</p>
            {:else}
                <ul class="space-y-2">
                    {#each data.owners as owner (owner.email)}
                        <li class="flex items-center gap-2.5">
                            <Avatar name={owner.name} seed={owner.email} size={28} />
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium">{owner.name}</p>
                                <a class="block truncate text-xs" href="mailto:{owner.email}">{owner.email}</a>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
            {#if data.owners.length === 0}
                <form
                    method="POST"
                    action="?/inviteOwner"
                    class="space-y-3 border-t border-[var(--border)] pt-3"
                    use:enhance
                >
                    <h3 class="text-sm font-semibold">{c.organization.inviteOwner.title}</h3>
                    <p class="muted text-xs">{c.organization.inviteOwner.intro}</p>
                    {#if ownerError}
                        <p class="field-error" role="alert">
                            {ownerError === "hasOwner"
                                ? c.organization.inviteOwner.hasOwner
                                : ownerError === "originMissing"
                                  ? i18n.m.team.inviteDialog.originMissing
                                  : i18n.m.common.errors.invalidEmail}
                        </p>
                    {/if}
                    <label class="sr-only" for="owner-email">{c.organization.inviteOwner.email}</label>
                    <input
                        id="owner-email"
                        class="input"
                        type="email"
                        name="email"
                        required
                        placeholder={c.organization.inviteOwner.email}
                    />
                    <button class="btn btn-primary w-full" type="submit">{c.organization.inviteOwner.submit}</button>
                </form>
            {/if}
        </section>

        <section class="card space-y-3" aria-labelledby="lifecycle-title">
            <h2 id="lifecycle-title" class="font-semibold">{c.organization.lifecycle.title}</h2>
            {#if org.status === "active"}
                <ConfirmForm
                    action="?/suspend"
                    danger={false}
                    label={c.organization.lifecycle.suspend}
                    title={i18n.t(c.organization.lifecycle.suspendTitle, { name: org.name })}
                    description={c.organization.lifecycle.suspendDescription}
                />
            {:else}
                <form method="POST" action="?/reactivate" use:enhance>
                    <button class="btn w-full" type="submit">{c.organization.lifecycle.reactivate}</button>
                </form>
            {/if}
            <ConfirmForm
                action="?/delete"
                label={c.organization.lifecycle.delete}
                description={c.organization.lifecycle.deleteDescription}
                confirmValue={org.slug}
            />
        </section>
    </aside>
</div>
