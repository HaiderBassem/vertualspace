<script lang="ts">
    import { resolve } from "$app/paths";
    import { enhance } from "$app/forms";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import FormMessage from "$lib/components/FormMessage.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import Pager from "$lib/components/Pager.svelte";
    import { banSavedText } from "$lib/components/world/liveOutcome";
    import { formFeedback, formField, formOp } from "$lib/components/world/formState";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const rp = $derived(i18n.m.moderation.reports);
    const canModerate = $derived(data.can["moderation.manage"]);
    const filters = ["open", "resolved", "dismissed", "all"] as const;
    const successText = $derived(
        formOp(form) === "ban" ? banSavedText(i18n, formField<string>(form, "liveDisconnect")) : rp.updated,
    );
    const pageHref = (page: number) =>
        resolve(
            `/o/${data.organization.slug}/w/${data.world.slug}/moderation/reports?status=${data.filter}&page=${page}`,
        );

    const statusClass = (status: string) =>
        status === "open" ? "badge-warning" : status === "resolved" ? "badge-success" : "";
</script>

{#snippet person(entry: { uuid: string; member: { id: string; label: string } | null })}
    {#if entry.member}
        <a
            href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/members/${entry.member.id}`)}
            class="font-semibold">{entry.member.label}</a
        >
    {:else}
        <code class="break-all text-xs">{entry.uuid}</code>
    {/if}
{/snippet}

<PageHeader title={i18n.m.moderation.tabs.reports} description={rp.description} />

<FormMessage form={formFeedback(form)} {successText} />

<nav class="mb-4 flex flex-wrap gap-2" aria-label={i18n.m.common.actions.filter}>
    {#each filters as filter (filter)}
        <a
            class="btn btn-sm"
            href={resolve(`/o/${data.organization.slug}/w/${data.world.slug}/moderation/reports?status=${filter}`)}
            aria-current={data.filter === filter ? "page" : undefined}
        >
            {rp.filters[filter]}
        </a>
    {/each}
</nav>

<p class="muted mb-2 text-sm" aria-live="polite">{i18n.p(rp.count, data.reports.length)}</p>

{#if data.reports.length === 0}
    <p class="card muted">{rp.empty}</p>
{:else}
    <ul class="space-y-4">
        {#each data.reports as report (report.id)}
            <li class="card space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="badge {statusClass(report.status)}">{rp.status[report.status]}</span>
                    <span class="muted text-sm"><DateTime value={report.createdAt} /></span>
                </div>
                <dl class="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                        <dt class="muted">{rp.reported}</dt>
                        <dd>{@render person(report.reported)}</dd>
                    </div>
                    <div>
                        <dt class="muted">{rp.reporter}</dt>
                        <dd>{@render person(report.reporter)}</dd>
                    </div>
                    <div>
                        <dt class="muted">{rp.room}</dt>
                        <dd><code class="break-all text-xs">{report.roomUrl}</code></dd>
                    </div>
                </dl>
                <blockquote class="border-s-4 border-[var(--border)] ps-3 whitespace-pre-line">
                    {report.comment}
                </blockquote>
                {#if report.resolutionNote}
                    <p class="text-sm"><span class="muted">{rp.noteLabel}</span> {report.resolutionNote}</p>
                {/if}
                {#if report.handledAt}
                    <p class="muted text-xs">{i18n.t(rp.handledBy, { date: i18n.dateTime(report.handledAt) })}</p>
                {/if}

                {#if canModerate}
                    {#if report.status === "open"}
                        <form method="POST" class="space-y-2" use:enhance>
                            <input type="hidden" name="reportId" value={report.id} />
                            <label class="block">
                                <span class="label">{rp.note}</span>
                                <input class="input" name="note" maxlength="2000" />
                                <span class="hint block">{rp.noteHelp}</span>
                            </label>
                            <div class="flex flex-wrap gap-2">
                                <button class="btn btn-primary btn-sm" formaction="?/resolve">{rp.resolve}</button>
                                <button class="btn btn-sm" formaction="?/dismiss">{rp.dismiss}</button>
                            </div>
                        </form>
                        <ConfirmForm
                            action="?/banReported"
                            label={rp.banReported}
                            title={rp.banReportedTitle}
                            description={rp.banReportedDescription}
                            fields={{ reportId: report.id }}
                            small
                        />
                    {:else}
                        <form method="POST" action="?/reopen" use:enhance>
                            <input type="hidden" name="reportId" value={report.id} />
                            <button class="btn btn-sm">{rp.reopen}</button>
                        </form>
                    {/if}
                {/if}
            </li>
        {/each}
    </ul>
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} href={pageHref} />
{/if}
