<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const j = $derived(i18n.m.control.jobs);
    const statuses = ["pending", "running", "failed", "succeeded", "cancelled"] as const;
    const tone = (status: string) =>
        status === "succeeded"
            ? "badge-success"
            : status === "failed"
              ? "badge-danger"
              : status === "pending"
                ? "badge-warning"
                : "";
    const formMessage = $derived(form && "message" in form ? { message: form.message } : null);
</script>

<PageHeader title={j.title} description={j.intro} />

<div aria-live="polite">
    {#if form && "retried" in form}<p class="notice notice-success mb-4"><Icon name="refresh" />{j.retried}</p>{/if}
    {#if form && "cancelled" in form}<p class="notice notice-success mb-4"><Icon name="check" />{j.cancelled}</p>{/if}
</div>
<FormMessage form={formMessage} />

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <nav class="segmented" aria-label={j.filter}>
        <a href={resolve("/admin/jobs")} aria-current={data.status === "" ? "page" : undefined}>{j.all}</a>
        {#each statuses as status (status)}
            <a href={resolve(`/admin/jobs?status=${status}`)} aria-current={data.status === status ? "page" : undefined}
                >{j.status[status]}</a
            >
        {/each}
    </nav>
    <p class="muted flex items-center gap-2 text-sm">
        <span class="dot {data.worker ? 'text-[var(--success)]' : 'text-[var(--warning)]'}"></span>
        {j.worker}: {data.worker ? j.workerOn : j.workerOff}
    </p>
</div>

<div class="card card-flush">
    {#if data.jobs.length === 0}
        <EmptyState icon="server" title={j.empty} compact />
    {:else}
        <div class="overflow-x-auto">
            <table class="table table-dense">
                <thead>
                    <tr>
                        <th scope="col">{j.columns.kind}</th>
                        <th scope="col">{j.columns.organization}</th>
                        <th scope="col">{j.columns.status}</th>
                        <th scope="col">{j.columns.attempts}</th>
                        <th scope="col">{j.columns.error}</th>
                        <th scope="col">{j.columns.updated}</th>
                        <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.jobs as job (job.id)}
                        <tr>
                            <td><code class="text-xs">{job.kind}</code></td>
                            <td class="text-sm">{job.organizationName ?? "—"}</td>
                            <td><span class="badge {tone(job.status)}">{j.status[job.status]}</span></td>
                            <td class="text-sm tabular-nums">{job.attempts}/{job.maxAttempts}</td>
                            <td class="max-w-80 text-xs break-words text-[var(--danger)]">{job.lastError ?? ""}</td>
                            <td class="text-sm"><DateTime value={job.updatedAt} mode="relative" /></td>
                            <td class="text-end">
                                <div class="flex justify-end gap-1">
                                    {#if job.status === "failed" || job.status === "cancelled" || job.status === "pending"}
                                        <form method="POST" action="?/retry" use:enhance>
                                            <input type="hidden" name="id" value={job.id} />
                                            <button class="btn btn-sm" type="submit">{j.retry}</button>
                                        </form>
                                    {/if}
                                    {#if job.status === "failed" || job.status === "pending"}
                                        <form method="POST" action="?/cancel" use:enhance>
                                            <input type="hidden" name="id" value={job.id} />
                                            <button class="btn btn-sm btn-ghost" type="submit">{j.cancel}</button>
                                        </form>
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
