<script lang="ts">
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Field from "$lib/components/Field.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import { banSavedText } from "$lib/components/world/liveOutcome";
    import { formErrors, formFeedback, formField, formOp, formValuesOf } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const b = $derived(i18n.m.moderation.bans);
    const canModerate = $derived(data.can["moderation.manage"]);

    const errors = $derived(formErrors(form));
    const values = $derived(formValuesOf(form));
    const targetRequired = $derived(formField<boolean>(form, "targetRequired") === true);
    const invalidIp = $derived(formField<boolean>(form, "invalidIp") === true);
    const successText = $derived(
        formOp(form) === "revoke" ? b.revoked : banSavedText(i18n, formField<string>(form, "liveDisconnect")),
    );
    const pageHref = (page: number) =>
        resolve(
            `/o/${data.organization.slug}/w/${data.world.slug}/moderation?${data.showAll ? "status=all&" : ""}page=${page}`,
        );

    const statusClass = (status: string) =>
        status === "active" ? "badge-danger" : status === "expired" ? "badge-warning" : "";
</script>

<PageHeader title={i18n.m.moderation.tabs.bans} description={b.description} />

{#if targetRequired}
    <p class="notice notice-danger mb-4" role="alert">{b.targetRequired}</p>
{:else if invalidIp}
    <p class="notice notice-danger mb-4" role="alert">{b.invalidIp}</p>
{:else}
    <FormMessage form={formFeedback(form)} {successText} />
{/if}

<nav class="mb-4 flex gap-2" aria-label={i18n.m.common.actions.filter}>
    <a
        class="btn btn-sm"
        href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/moderation`)}
        aria-current={data.showAll ? undefined : "page"}>{b.filterActive}</a
    >
    <a
        class="btn btn-sm"
        href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/moderation?status=all`)}
        aria-current={data.showAll ? "page" : undefined}>{b.filterAll}</a
    >
</nav>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <div class="min-w-0 lg:col-span-2">
        {#if data.bans.length === 0}
            <p class="card muted">{b.empty}</p>
        {:else}
            <TableScroll label={i18n.m.moderation.tabs.bans}>
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">{b.columns.person}</th>
                            <th scope="col">{b.columns.reason}</th>
                            <th scope="col">{b.columns.since}</th>
                            <th scope="col">{b.columns.until}</th>
                            <th scope="col">{b.columns.status}</th>
                            {#if canModerate}<th scope="col"
                                    ><span class="sr-only">{i18n.m.common.labels.actions}</span></th
                                >{/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.bans as ban (ban.id)}
                            <tr>
                                <td class="max-w-[14rem]">
                                    {#if ban.name}<span class="font-semibold">{ban.name}</span>{/if}
                                    {#if ban.memberUuid}
                                        <a
                                            class="block truncate text-xs"
                                            href={resolve(
                                                `/o/${data.organization.slug}/w/${data.world.slug}/members?q=${encodeURIComponent(ban.memberUuid)}`,
                                            )}>{ban.memberUuid}</a
                                        >
                                    {/if}
                                    {#if ban.ipAddress}<code class="muted block text-xs">{ban.ipAddress}</code>{/if}
                                    <span class="muted block text-xs">
                                        {i18n.t(b.bannedByLine, { name: ban.bannedBy ?? b.fromBackOffice })}
                                    </span>
                                </td>
                                <td class="text-sm">{ban.reason}</td>
                                <td><DateTime value={ban.createdAt} /></td>
                                <td>
                                    {#if ban.expiresAt}<DateTime value={ban.expiresAt} />{:else}<span class="muted"
                                            >{b.permanent}</span
                                        >{/if}
                                </td>
                                <td>
                                    <span class="badge {statusClass(ban.status)}">
                                        {b.status[ban.status as "active" | "revoked" | "expired"]}
                                    </span>
                                </td>
                                {#if canModerate}
                                    <td>
                                        {#if ban.status === "active"}
                                            <ConfirmForm
                                                action="?/revoke"
                                                label={b.revoke}
                                                title={b.revokeTitle}
                                                description={b.revokeDescription}
                                                fields={{ banId: ban.id }}
                                                danger={false}
                                                small
                                            />
                                        {/if}
                                    </td>
                                {/if}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </TableScroll>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
        {/if}
    </div>

    {#if canModerate}
        {#key form}
            <form method="POST" action="?/ban" class="card h-fit min-w-0 space-y-4" use:enhance>
                <h2 class="text-lg font-bold">{b.create}</h2>
                <Field label={b.target} name="target" error={errors.target} hint={b.targetHelp}>
                    {#snippet children(a)}<input
                            class="input"
                            {...a}
                            name="target"
                            maxlength="320"
                            value={values.target ?? ""}
                        />{/snippet}
                </Field>
                <Field label={b.ipAddress} name="ipAddress" error={errors.ipAddress} hint={b.ipAddressHelp}>
                    {#snippet children(a)}
                        <input
                            class="input font-mono"
                            {...a}
                            name="ipAddress"
                            maxlength="45"
                            value={values.ipAddress ?? ""}
                        />
                    {/snippet}
                </Field>
                <Field label={b.reason} name="reason" error={errors.reason} hint={b.reasonHelp} required>
                    {#snippet children(a)}<input
                            class="input"
                            {...a}
                            name="reason"
                            maxlength="1000"
                            value={values.reason ?? ""}
                        />{/snippet}
                </Field>
                <Field label={b.duration} name="duration" required>
                    {#snippet children(a)}
                        <select class="select" {...a} name="duration">
                            {#each Object.entries(b.durations) as [key, label] (key)}
                                <option value={key} selected={values.duration === key}>{label}</option>
                            {/each}
                        </select>
                    {/snippet}
                </Field>
                <button class="btn btn-danger" type="submit">{b.create}</button>
            </form>
        {/key}
    {/if}
</div>
