<script lang="ts">
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const e = $derived(i18n.m.control.email);
    const tone = (status: string) =>
        status === "sent" ? "badge-success" : status === "failed" ? "badge-danger" : "badge-warning";
</script>

<PageHeader title={e.title} description={e.intro} />

<p class="notice {data.configured ? 'notice-success' : 'notice-warning'} mb-5">
    <Icon name={data.configured ? "check" : "alert"} />
    {data.configured ? i18n.t(e.configured, { from: data.from }) : e.notConfigured}
</p>

<div class="card card-flush">
    {#if data.deliveries.length === 0}
        <EmptyState icon="mail" title={e.empty} compact />
    {:else}
        <div class="overflow-x-auto">
            <table class="table table-dense">
                <thead>
                    <tr>
                        <th scope="col">{e.columns.time}</th>
                        <th scope="col">{e.columns.recipient}</th>
                        <th scope="col">{e.columns.purpose}</th>
                        <th scope="col">{e.columns.status}</th>
                        <th scope="col">{e.columns.error}</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.deliveries as delivery (delivery.id)}
                        <tr>
                            <td class="text-sm"><DateTime value={delivery.createdAt} /></td>
                            <td class="text-sm">{delivery.recipient}</td>
                            <td class="text-sm"
                                >{e.purposes[delivery.purpose as keyof typeof e.purposes] ?? delivery.purpose}</td
                            >
                            <td><span class="badge {tone(delivery.status)}">{e.status[delivery.status]}</span></td>
                            <td class="text-xs"><code>{delivery.errorCode ?? ""}</code></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
