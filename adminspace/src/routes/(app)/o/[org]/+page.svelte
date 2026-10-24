<script lang="ts">
    import { resolve } from "$app/paths";
    import Avatar from "$lib/components/Avatar.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Icon, { type IconName } from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    const i18n = useI18n();
    const h = $derived(i18n.m.home);
    const o = $derived(i18n.m.organizations);
    const slug = $derived(data.organization.slug);

    const stateClass = (state: "open" | "archived" | "expired") =>
        state === "open" ? "badge-success" : state === "expired" ? "badge-warning" : "badge-danger";

    const stepLinks = $derived({
        profile: resolve(`/o/${slug}/settings`),
        workspace: resolve(`/o/${slug}/workspaces`),
        world: resolve(`/o/${slug}/w/new`),
        invite: resolve(`/o/${slug}/team`),
        components: resolve(`/o/${slug}/components`),
    });
    const statKeys = ["workspaces", "worlds", "rooms", "people", "pendingInvitations"] as const;
    const stepHints = {
        profile: "profileHint",
        workspace: "workspaceHint",
        world: "worldHint",
        invite: "inviteHint",
        components: "componentsHint",
    } as const;
    const stepIcons: Record<string, IconName> = {
        profile: "building",
        workspace: "layers",
        world: "globe",
        invite: "users",
        components: "box",
    };
</script>

{#if data.joined}
    <p class="notice notice-success mb-6" role="status">
        <Icon name="check" />{i18n.t(h.joined, { organization: data.organization.name })}
    </p>
{/if}

{#if data.view === "employee"}
    <PageHeader
        title={i18n.t(h.employee.greeting, { name: data.account?.name ?? "" })}
        description={i18n.t(h.employee.intro, { organization: data.organization.name })}
    />

    <section class="mb-10" aria-labelledby="offices-title">
        <div class="mb-3">
            <h2 id="offices-title" class="text-lg font-semibold">{h.employee.offices}</h2>
            <p class="muted text-sm">{i18n.t(h.employee.officesIntro, { email: data.email })}</p>
        </div>
        {#if data.offices.length === 0}
            <div class="card card-flush">
                <EmptyState icon="door" title={h.employee.noOffices} description={h.employee.noOfficesHint} />
            </div>
        {:else}
            <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each data.offices as office (office.worldId)}
                    <li class="card card-interactive flex flex-col gap-3">
                        <div class="flex items-start gap-3">
                            <span
                                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            >
                                <Icon name="globe" size={20} />
                            </span>
                            <div class="min-w-0">
                                <p class="truncate font-semibold">{office.worldName}</p>
                                <p class="muted truncate text-xs">{office.workspaceName}</p>
                            </div>
                        </div>
                        {#if office.description}<p class="muted line-clamp-2 text-sm">{office.description}</p>{/if}
                        <div class="mt-auto flex items-center justify-between gap-2">
                            <span class="muted text-xs">{i18n.p(h.employee.rooms, office.roomCount)}</span>
                            {#if office.url}
                                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external WorkAdventure address -->
                                <a class="btn btn-primary btn-sm" href={office.url} target="_blank" rel="noopener"
                                    ><Icon name="play" size={15} />{h.employee.enter}</a
                                >
                            {:else}
                                <span class="muted text-xs" title={h.employee.unavailable}>—</span>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <section class="card card-flush" aria-labelledby="teammates-title">
            <div class="card-header">
                <h2 id="teammates-title">{h.employee.teammates}</h2>
                <a class="text-sm" href={resolve(`/o/${slug}/directory`)}>{h.employee.allTeammates}</a>
            </div>
            <ul class="divide-y divide-[var(--border)]">
                {#each data.teammates as person (person.accountId)}
                    <li class="flex items-center gap-3 px-5 py-3">
                        <Avatar name={person.name} seed={person.accountId} size={32} />
                        <div class="min-w-0">
                            <p class="truncate text-sm font-medium">{person.name}</p>
                            <p class="muted truncate text-xs">{person.email}</p>
                        </div>
                    </li>
                {/each}
            </ul>
        </section>
        <section class="card space-y-3" aria-labelledby="components-title">
            <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                ><Icon name="box" size={20} /></span
            >
            <h2 id="components-title" class="font-semibold">{h.employee.components}</h2>
            <p class="muted text-sm">{h.employee.componentsIntro}</p>
            <a class="btn" href={resolve(`/o/${slug}/components`)}>{h.employee.browseComponents}</a>
        </section>
    </div>
{:else}
    <PageHeader title={data.organization.name} description={h.overview.intro}>
        {#snippet actions()}
            {#if data.can["team.invite"]}
                <a class="btn" href={resolve(`/o/${slug}/team`)}><Icon name="users" size={16} />{h.overview.invite}</a>
            {/if}
            {#if data.canCreateWorld}
                <a class="btn" href={resolve(`/o/${slug}/w/new`)}><Icon name="plus" size={16} />{h.overview.newWorld}</a
                >
                <a class="btn btn-primary" href={resolve(`/o/${slug}/office/new`)}
                    ><Icon name="sparkle" size={16} />{i18n.m.office.wizard.entry}</a
                >
            {/if}
        {/snippet}
    </PageHeader>

    {#if data.welcome}
        <section class="notice notice-info mb-6 flex-col !items-start" aria-labelledby="welcome-title">
            <h2 id="welcome-title" class="flex items-center gap-2 font-semibold">
                <Icon name="sparkle" />{i18n.t(i18n.m.onboarding.welcome.title, {
                    organization: data.organization.name,
                })}
            </h2>
            <p class="text-sm">{i18n.m.onboarding.welcome.intro}</p>
        </section>
    {/if}

    <dl class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {#each statKeys as key (key)}
            <div class="card stat !p-4">
                <dt class="stat-label">{h.overview.stats[key]}</dt>
                <dd class="stat-value">{i18n.number(data.stats[key])}</dd>
            </div>
        {/each}
    </dl>

    {#if data.checklist.length > 0 && data.checklist.some((step) => !step.done)}
        {@const done = data.checklist.filter((step) => step.done).length}
        <section class="card mb-8" aria-labelledby="setup-title">
            <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="setup-title" class="font-semibold">{h.overview.setup}</h2>
                <span class="muted text-sm"
                    >{i18n.t(h.overview.setupProgress, { done, total: data.checklist.length })}</span
                >
            </div>
            <div class="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden="true">
                <div
                    class="h-full rounded-full bg-[var(--accent)]"
                    style:width="{(done / data.checklist.length) * 100}%"
                ></div>
            </div>
            <ol class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each data.checklist as step (step.key)}
                    {@const steps = i18n.m.onboarding.welcome.steps}
                    <li>
                        <a
                            href={stepLinks[step.key]}
                            class="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] p-3 text-[var(--text)] no-underline hover:bg-[var(--surface-hover)]"
                        >
                            <span
                                class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full {step.done
                                    ? 'bg-[var(--success-soft)] text-[var(--success)]'
                                    : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]'}"
                            >
                                <Icon name={step.done ? "check" : stepIcons[step.key]!} size={15} />
                            </span>
                            <span class="min-w-0">
                                <span class="block text-sm font-medium">{steps[step.key]}</span>
                                <span class="muted block text-xs">
                                    <span class="sr-only"
                                        >{step.done ? i18n.m.onboarding.welcome.done : i18n.m.onboarding.welcome.todo}:
                                    </span>{steps[stepHints[step.key]]}
                                </span>
                            </span>
                        </a>
                    </li>
                {/each}
            </ol>
        </section>
    {/if}

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="worlds-title">
            <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 id="worlds-title" class="text-lg font-semibold">{h.overview.worldsTitle}</h2>
                    <p class="muted text-sm">{h.overview.worldsIntro}</p>
                </div>
                <a
                    class="btn btn-sm btn-ghost"
                    href={data.showArchived ? resolve(`/o/${slug}`) : resolve(`/o/${slug}?archived=1`)}
                >
                    {#if data.showArchived}<Icon name="check" size={14} />{/if}
                    {o.worlds.showArchived}
                </a>
            </div>
            <div class="card card-flush">
                {#if data.worlds.length === 0}
                    <EmptyState icon="globe" title={o.worlds.empty} description={h.overview.worldsIntro}>
                        {#snippet actions()}
                            {#if data.canCreateWorld}
                                <a class="btn btn-primary" href={resolve(`/o/${slug}/w/new`)}>{o.worlds.newWorld}</a>
                            {/if}
                        {/snippet}
                    </EmptyState>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">{o.worlds.columns.world}</th>
                                    <th scope="col">{h.overview.workspaceColumn}</th>
                                    <th scope="col">{o.worlds.columns.access}</th>
                                    <th scope="col">{o.worlds.columns.state}</th>
                                    <th scope="col">{o.worlds.columns.created}</th>
                                    <th scope="col"><span class="sr-only">{i18n.m.common.labels.actions}</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each data.worlds as world (world.slug)}
                                    <tr>
                                        <td>
                                            <a class="font-semibold" href={resolve(`/o/${slug}/w/${world.slug}`)}
                                                >{world.name}</a
                                            >
                                            <div class="muted text-xs"><code dir="ltr">{world.slug}</code></div>
                                        </td>
                                        <td>
                                            {#if world.workspace}
                                                <a
                                                    class="chip no-underline"
                                                    href={resolve(`/o/${slug}/workspaces/${world.workspace.slug}`)}
                                                    >{world.workspace.name}</a
                                                >
                                            {/if}
                                        </td>
                                        <td class="text-sm">{i18n.m.worlds.accessPolicy[world.accessPolicy]}</td>
                                        <td>
                                            <span class="badge {stateClass(world.state)}"
                                                >{i18n.m.worlds.state[world.state]}</span
                                            >
                                        </td>
                                        <td class="text-sm"><DateTime value={world.createdAt} mode="date" /></td>
                                        <td class="text-end">
                                            {#if world.url && world.state === "open"}
                                                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external WorkAdventure address -->
                                                <!-- eslint-disable svelte/no-navigation-without-resolve -- external WorkAdventure address -->
                                                <a
                                                    class="btn btn-sm btn-ghost"
                                                    href={world.url}
                                                    target="_blank"
                                                    rel="noopener"
                                                    title={i18n.m.common.actions.openInWorkAdventure}
                                                >
                                                    <Icon
                                                        name="external"
                                                        size={15}
                                                        label={i18n.m.common.actions.openInWorkAdventure}
                                                    />
                                                </a>
                                                <!-- eslint-enable svelte/no-navigation-without-resolve -->
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </section>

        {#if data.can["audit.read"]}
            <section class="card card-flush self-start" aria-labelledby="activity-title">
                <div class="card-header">
                    <h2 id="activity-title">{h.overview.activity}</h2>
                    <a class="text-sm" href={resolve(`/o/${slug}/audit`)}>{h.overview.allActivity}</a>
                </div>
                {#if data.activity.length === 0}
                    <p class="muted px-5 py-6 text-sm">{h.overview.activityEmpty}</p>
                {:else}
                    <ol class="divide-y divide-[var(--border)]">
                        {#each data.activity as entry (entry.id)}
                            <li class="px-5 py-3">
                                <p class="truncate text-sm font-medium"><code>{entry.action}</code></p>
                                <p class="muted truncate text-xs">
                                    {entry.actorLabel} · <DateTime value={entry.occurredAt} mode="relative" />
                                </p>
                            </li>
                        {/each}
                    </ol>
                {/if}
            </section>
        {/if}
    </div>
{/if}
