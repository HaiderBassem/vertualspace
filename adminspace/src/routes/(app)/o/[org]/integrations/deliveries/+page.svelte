<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { SvelteURLSearchParams } from "svelte/reactivity";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import TableScroll from "$lib/components/TableScroll.svelte";
    import { formField } from "$lib/components/world/formState";
    import CenterTabs from "$lib/components/integrations/CenterTabs.svelte";
    import { deliveryErrorText, eventLabel } from "$lib/components/integrations/messages";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const d = $derived(m.deliveries);
    const org = $derived(page.params.org ?? "");
    const filtered = $derived(Boolean(data.filter.status || data.filter.endpoint || data.filter.event));
    const retryProblem = $derived(formField<"notFound" | "notFailed" | "endpointDisabled">(form, "retryProblem"));
    let pending = $state<string | null>(null);

    const statusClass = { pending: "badge-warning", succeeded: "badge-success", failed: "badge-danger" } as const;

    function pageHref(p: number): string {
        const params = new SvelteURLSearchParams(page.url.searchParams);
        params.set("page", String(p));
        return resolve(`/o/${org}/integrations/deliveries?${params.toString()}`);
    }
</script>

<PageHeader title={d.title} description={d.intro} />
<CenterTabs {org} active="deliveries" />

<div aria-live="polite" class="empty:hidden">
    {#if form && "retried" in form}
        <p class="notice notice-success mb-4">{d.retried}</p>
    {:else if retryProblem}
        <p class="notice notice-danger mb-4" role="alert">{d.retryProblems[retryProblem]}</p>
    {/if}
</div>

<form method="GET" class="card mb-6 flex flex-wrap items-end gap-3" aria-label={d.filters}>
    <div>
        <label class="label" for="filter-status">{d.status}</label>
        <select id="filter-status" class="select" name="status" value={data.filter.status}>
            <option value="">{d.all}</option>
            {#each data.statuses as status (status)}<option value={status}>{d.statuses[status]}</option>{/each}
        </select>
    </div>
    <div class="min-w-48">
        <label class="label" for="filter-endpoint">{d.endpoint}</label>
        <select id="filter-endpoint" class="select" name="endpoint" value={data.filter.endpoint}>
            <option value="">{d.all}</option>
            {#each data.endpoints as endpoint (endpoint.id)}<option value={endpoint.id}>{endpoint.name}</option>{/each}
        </select>
    </div>
    <div class="min-w-48">
        <label class="label" for="filter-event">{d.event}</label>
        <select id="filter-event" class="select" name="event" value={data.filter.event}>
            <option value="">{d.all}</option>
            {#each data.eventTypes as type (type)}<option value={type}>{eventLabel(i18n, type)}</option>{/each}
        </select>
    </div>
    <button class="btn" type="submit">{d.apply}</button>
</form>

{#if data.deliveries.length === 0}
    <div class="card"><EmptyState icon="inbox" title={filtered ? d.emptyFiltered : d.empty} /></div>
{:else}
    <TableScroll label={d.title}>
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">{d.columns.time}</th>
                    <th scope="col">{d.columns.event}</th>
                    <th scope="col">{d.columns.endpoint}</th>
                    <th scope="col">{d.columns.status}</th>
                    <th scope="col">{d.columns.attempts}</th>
                    <th scope="col">{d.columns.answer}</th>
                    <th scope="col">{d.columns.error}</th>
                    <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                </tr>
            </thead>
            <tbody>
                {#each data.deliveries as delivery (delivery.id)}
                    <tr>
                        <td><DateTime value={delivery.createdAt} /></td>
                        <td>{eventLabel(i18n, delivery.eventType)}</td>
                        <td dir="auto"
                            >{delivery.endpointName}
                            <span class="muted text-xs">({m.notifications.kinds[delivery.endpointKind]})</span></td
                        >
                        <td><span class="badge {statusClass[delivery.status]}">{d.statuses[delivery.status]}</span></td>
                        <td>{i18n.number(delivery.attempts)}</td>
                        <td>
                            {#if delivery.responseStatus}{i18n.t(d.httpStatus, {
                                    status: String(delivery.responseStatus),
                                })}{:else}<span class="muted">{d.noAnswer}</span>{/if}
                        </td>
                        <td class="text-sm">{deliveryErrorText(i18n, delivery.lastError)}</td>
                        <td class="text-end">
                            {#if delivery.status === "failed"}
                                <form
                                    method="POST"
                                    action="?/retry"
                                    use:enhance={() => {
                                        pending = delivery.id;
                                        return async ({ update }) => {
                                            await update();
                                            pending = null;
                                        };
                                    }}
                                >
                                    <input type="hidden" name="id" value={delivery.id} />
                                    <button
                                        class="btn btn-sm"
                                        type="submit"
                                        disabled={pending === delivery.id}
                                        aria-busy={pending === delivery.id}>{d.retry}</button
                                    >
                                </form>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </TableScroll>
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
{/if}
