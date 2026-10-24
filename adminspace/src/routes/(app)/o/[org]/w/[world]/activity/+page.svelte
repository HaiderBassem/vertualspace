<script lang="ts">
    import DateTime from "$lib/components/DateTime.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import AuditTable from "$lib/components/worlds/AuditTable.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.worlds.activity);

    /** ISO 8601-like h:mm:ss, independent of the locale. */
    function duration(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function size(bytes: number): string {
        const megabytes = bytes / 1_000_000;
        return new Intl.NumberFormat(i18n.locale, {
            style: "unit",
            unit: megabytes >= 1000 ? "gigabyte" : "megabyte",
            maximumFractionDigits: 1,
        }).format(megabytes >= 1000 ? megabytes / 1000 : megabytes);
    }
</script>

<PageHeader title={a.title} />

<div class="space-y-8">
    <section aria-labelledby="recordings" class="space-y-3">
        <div>
            <h2 id="recordings" class="text-lg font-bold">{a.recordings}</h2>
            <p class="muted text-sm">{a.recordingsIntro}</p>
        </div>
        {#if data.recordings.length === 0}
            <p class="card muted">{a.noRecordings}</p>
        {:else}
            <div class="card relative overflow-x-auto p-0">
                <table class="table text-sm">
                    <thead>
                        <tr>
                            <th scope="col">{a.recordingColumns.ended}</th>
                            <th scope="col">{a.recordingColumns.status}</th>
                            <th scope="col">{a.recordingColumns.recorder}</th>
                            <th scope="col">{a.recordingColumns.duration}</th>
                            <th scope="col">{a.recordingColumns.files}</th>
                            <th scope="col">{a.recordingColumns.size}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.recordings as recording (recording.id)}
                            <tr>
                                <td class="whitespace-nowrap"><DateTime value={recording.endedAt} /></td>
                                <td>
                                    <span
                                        class="badge {recording.status === 'EGRESS_COMPLETE'
                                            ? 'badge-success'
                                            : 'badge-danger'}"
                                        title={recording.error ?? undefined}><code>{recording.status}</code></span
                                    >
                                </td>
                                <td class="max-w-56 truncate" title={recording.recorderUuid}
                                    >{recording.recorderUuid}</td
                                >
                                <td><code dir="ltr">{duration(recording.durationSeconds)}</code></td>
                                <td>{i18n.number(recording.fileCount)}</td>
                                <td>{size(recording.sizeBytes)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>

    <section aria-labelledby="analytics" class="space-y-3">
        <h2 id="analytics" class="text-lg font-bold">{a.analytics}</h2>
        {#if !data.analyticsEnabled}
            <p class="notice">{a.analyticsDisabled}</p>
        {/if}
        {#if data.events.length === 0}
            <p class="card muted">{a.noAnalytics}</p>
        {:else}
            <div class="card relative overflow-x-auto p-0">
                <table class="table text-sm">
                    <thead>
                        <tr>
                            <th scope="col">{a.eventColumns.event}</th>
                            <th scope="col" class="text-end">{a.eventColumns.count}</th>
                            <th scope="col" class="text-end">{a.eventColumns.people}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.events as event (event.eventName)}
                            <tr>
                                <td><code dir="ltr">{event.eventName}</code></td>
                                <td class="text-end">{i18n.number(event.total)}</td>
                                <td class="text-end">{i18n.number(event.people)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>

    <section aria-labelledby="world-audit" class="space-y-3">
        <h2 id="world-audit" class="text-lg font-bold">{a.audit}</h2>
        {#if data.audit.length === 0}
            <p class="card muted">{a.noAudit}</p>
        {:else}
            <AuditTable entries={data.audit} />
        {/if}
    </section>
</div>
