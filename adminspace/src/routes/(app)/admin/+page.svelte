<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import { resolve } from "$app/paths";
    import DateTime from "$lib/components/DateTime.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    type CheckProblem = NonNullable<PageData["status"]["pusher"]["problem"]>;

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const eventProblem = $derived(
        form && "eventError" in form && form.eventError
            ? i18n.m.platform.status.globalEvent[form.eventError]
            : undefined,
    );
    const m = $derived(i18n.m.platform.status);
    const s = $derived(data.status);

    function problemText(problem: CheckProblem | undefined): string | undefined {
        if (!problem) return undefined;
        if (problem.code === "timeout") return i18n.t(m.problems.timeout, { seconds: problem.seconds });
        if (problem.code === "http") return i18n.t(m.problems.http, { status: String(problem.status) });
        return m.problems[problem.code];
    }

    const o = $derived(i18n.m.control.overview);
    const figures = $derived([
        { key: "organizations", value: data.overview.organizations, href: resolve("/admin/organizations") },
        { key: "suspended", value: data.overview.suspended, href: resolve("/admin/organizations") },
        { key: "accounts", value: data.overview.accounts, href: resolve("/admin/accounts") },
        { key: "worlds", value: data.overview.worlds, href: undefined },
        { key: "failedJobs", value: data.overview.failedJobs, href: resolve("/admin/jobs") },
        { key: "failedEmails", value: data.overview.failedEmails, href: resolve("/admin/email") },
    ] as const);

    const badge = { ok: "badge-success", failed: "badge-danger", notConfigured: "badge" } as const;
    const label = $derived({ ok: m.ok, failed: m.failed, notConfigured: m.notConfigured });

    const checks = $derived([
        { name: m.database, state: s.database.state, detail: problemText(s.database.problem) },
        {
            name: m.migrations,
            state: s.migrations.state,
            detail: i18n.t(m.migrationsDetail, { applied: s.migrations.applied, known: s.migrations.known }),
        },
        {
            name: m.pusher,
            state: s.pusher.state,
            detail:
                s.pusher.state === "ok"
                    ? i18n.t(m.pusherDetail, { people: s.pusher.people, rooms: s.pusher.rooms })
                    : problemText(s.pusher.problem),
        },
        {
            name: m.mapStorage,
            state: s.mapStorage.state,
            detail: s.mapStorage.problem ? problemText(s.mapStorage.problem) : s.mapStorage.url,
        },
        {
            name: m.adminSocket,
            state: s.adminSocket.state,
            detail: s.adminSocket.state === "ok" ? m.adminSocketDetail : undefined,
        },
    ]);
</script>

<PageHeader title={m.title} description={m.intro}>
    {#snippet actions()}
        <button class="btn" type="button" onclick={() => invalidateAll()}>{i18n.m.common.actions.refresh}</button>
    {/snippet}
</PageHeader>

<dl class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {#each figures as figure (figure.key)}
        <div class="card stat !p-4">
            <dt class="stat-label">
                {#if figure.href}<a href={figure.href}>{o.figures[figure.key]}</a>{:else}{o.figures[figure.key]}{/if}
            </dt>
            <dd
                class="stat-value {figure.value > 0 && (figure.key === 'failedJobs' || figure.key === 'failedEmails')
                    ? 'text-[var(--danger)]'
                    : ''}"
            >
                {i18n.number(figure.value)}
            </dd>
        </div>
    {/each}
</dl>

<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section class="card space-y-3" aria-labelledby="security-events">
        <h2 id="security-events" class="font-bold">{o.security}</h2>
        {#if data.overview.security.length === 0}
            <p class="muted text-sm">{o.securityEmpty}</p>
        {:else}
            <ul class="divide-y divide-[var(--border)]">
                {#each data.overview.security as event (event.event)}
                    <li class="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>{o.events[event.event]}</span>
                        <span class="font-semibold tabular-nums">{i18n.number(event.total)}</span>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
    <section class="card space-y-3" aria-labelledby="support-active">
        <h2 id="support-active" class="font-bold">{o.supportActive}</h2>
        {#if data.overview.support.length === 0}
            <p class="muted text-sm">{o.noSupport}</p>
        {:else}
            <ul class="divide-y divide-[var(--border)]">
                {#each data.overview.support as grant (grant.id)}
                    <li class="py-2 text-sm">
                        <a class="font-medium" href={resolve(`/admin/organizations/${grant.organizationId}`)}
                            >{grant.organizationName}</a
                        >
                        <span class="muted"> · {grant.accountName} · <DateTime value={grant.expiresAt} /></span>
                        <p class="muted break-words">{grant.reason}</p>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
</div>

<div class="card relative mb-6 overflow-x-auto p-0">
    <table class="table">
        <tbody>
            {#each checks as check (check.name)}
                <tr>
                    <th scope="row" class="!normal-case !tracking-normal !text-sm !text-[var(--text)]">{check.name}</th>
                    <td><span class="badge {badge[check.state]}">{label[check.state]}</span></td>
                    <td class="muted text-sm break-all">{check.detail ?? ""}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
{#if checks.some((check) => check.state === "failed")}
    <p class="hint -mt-4 mb-6">{m.detailsInLog}</p>
{/if}

<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <section class="card" aria-labelledby="capabilities">
        <h2 id="capabilities" class="mb-3 font-bold">{m.capabilities}</h2>
        <ul class="space-y-1 font-mono text-sm" dir="ltr">
            {#each Object.entries(s.capabilities) as [name, version] (name)}
                <li>{name} <span class="muted">{version}</span></li>
            {/each}
        </ul>
        <p class="hint mt-3">{m.restartNote}</p>
    </section>
    <section class="card space-y-2" aria-labelledby="versions">
        <h2 id="versions" class="font-bold">{m.version}</h2>
        <p class="font-mono text-sm">adminspace {s.version}</p>
        <h3 class="pt-2 font-bold">{m.contract}</h3>
        <p class="text-sm">{i18n.t(m.contractDetail, { commit: s.contractCommit.slice(0, 12) })}</p>
    </section>
    <section class="card space-y-2" aria-labelledby="retention">
        <h2 id="retention" class="font-bold">{m.retention}</h2>
        {#if !data.retention}
            <p class="muted text-sm">{m.retentionNotYet}</p>
        {:else if data.retention.ok && data.retention.report}
            {@const r = data.retention.report}
            <p class="text-sm">
                <span class="badge badge-success">{m.ok}</span>
                <DateTime value={data.retention.lastRunAt} />
            </p>
            <p class="muted text-sm">
                {i18n.t(m.retentionSummary, {
                    guests: r.guestsDeleted,
                    analytics: r.analyticsDeleted,
                    sessions: r.sessionsDeleted,
                    audit: r.auditLogsDeleted,
                    bans: r.bansDeleted,
                    reports: r.reportsDeleted,
                    recordings: r.recordingEventsDeleted,
                })}
            </p>
        {:else}
            <p class="text-sm">
                <span class="badge badge-danger">{m.failed}</span>
                <DateTime value={data.retention.lastRunAt} />
            </p>
            <p class="muted text-sm">{m.retentionFailed}</p>
        {/if}
    </section>
    <section class="card space-y-3" aria-labelledby="global-event">
        <h2 id="global-event" class="font-bold">{m.globalEvent.title}</h2>
        <p class="muted text-sm">{m.globalEvent.intro}</p>
        {#if eventProblem}<p class="notice notice-danger" role="alert">{eventProblem}</p>{/if}
        {#if form && "eventSent" in form}<p class="notice notice-success" role="status">{m.globalEvent.sent}</p>{/if}
        <form method="POST" action="?/globalEvent" use:enhance class="space-y-3">
            <div>
                <label class="label" for="event-name">{m.globalEvent.name}</label>
                <input
                    class="input font-mono"
                    id="event-name"
                    name="name"
                    dir="ltr"
                    required
                    maxlength="100"
                    pattern={"[A-Za-z0-9_.:\\-]{1,100}"}
                    value={form && "name" in form ? form.name : ""}
                    aria-describedby="event-name-hint"
                />
                <p class="hint" id="event-name-hint">{m.globalEvent.nameHelp}</p>
            </div>
            <div>
                <label class="label" for="event-data">{m.globalEvent.data}</label>
                <textarea
                    class="textarea font-mono text-sm"
                    id="event-data"
                    name="data"
                    dir="ltr"
                    rows="4"
                    maxlength="10000"
                    aria-describedby="event-data-hint">{form && "data" in form ? form.data : ""}</textarea
                >
                <p class="hint" id="event-data-hint">{m.globalEvent.dataHelp}</p>
            </div>
            <button class="btn btn-primary" type="submit">{m.globalEvent.send}</button>
        </form>
    </section>
</div>
