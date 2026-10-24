<!-- Audit log entries (audit_logs) as a table. -->
<script lang="ts">
    import DateTime from "$lib/components/DateTime.svelte";
    import { useI18n } from "$lib/i18n/context";

    interface Entry {
        id: string;
        occurredAt: string;
        actorLabel: string;
        action: string;
        targetType: string | null;
        targetId: string | null;
        ipAddress: string | null;
        details: Record<string, unknown> | null;
    }

    let { entries, compact = false }: { entries: Entry[]; compact?: boolean } = $props();
    const i18n = useI18n();
    const c = $derived(i18n.m.organizations.audit.columns);
</script>

<div class="card relative overflow-x-auto p-0">
    <table class="table text-sm">
        <thead>
            <tr>
                <th scope="col">{c.time}</th>
                <th scope="col">{c.actor}</th>
                <th scope="col">{c.action}</th>
                {#if !compact}
                    <th scope="col">{c.target}</th>
                    <th scope="col">{c.ip}</th>
                    <th scope="col">{c.details}</th>
                {/if}
            </tr>
        </thead>
        <tbody>
            {#each entries as entry (entry.id)}
                <tr>
                    <td class="whitespace-nowrap"
                        ><DateTime value={entry.occurredAt} mode={compact ? "relative" : "dateTime"} /></td
                    >
                    <td class="max-w-56 truncate" title={entry.actorLabel}>{entry.actorLabel}</td>
                    <td><code dir="ltr">{entry.action}</code></td>
                    {#if !compact}
                        <td class="max-w-56 truncate" title={entry.targetId ?? ""}>
                            {#if entry.targetType}<span class="muted">{entry.targetType}</span>{/if}
                            {entry.targetId ?? ""}
                        </td>
                        <td><code dir="ltr">{entry.ipAddress ?? ""}</code></td>
                        <td>
                            {#if entry.details && Object.keys(entry.details).length > 0}
                                <details>
                                    <summary class="cursor-pointer">{c.details}</summary>
                                    <pre class="mt-1 max-w-md overflow-x-auto text-xs" dir="ltr">{JSON.stringify(
                                            entry.details,
                                            null,
                                            2,
                                        )}</pre>
                                </details>
                            {/if}
                        </td>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
