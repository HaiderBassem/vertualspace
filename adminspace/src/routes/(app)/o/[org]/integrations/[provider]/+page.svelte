<script lang="ts">
    import { enhance } from "$app/forms";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import ConfirmForm from "$lib/components/ConfirmForm.svelte";
    import DateTime from "$lib/components/DateTime.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import CopyText from "$lib/components/worlds/CopyText.svelte";
    import { formField } from "$lib/components/world/formState";
    import CenterTabs from "$lib/components/integrations/CenterTabs.svelte";
    import CopyButton from "$lib/components/integrations/CopyButton.svelte";
    import StatusBadge from "$lib/components/integrations/StatusBadge.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { ActionData, PageData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
    const i18n = useI18n();
    const m = $derived(i18n.m.integrationCenter);
    const org = $derived(page.params.org ?? "");
    const card = $derived(data.card);
    const provider = $derived(m.providers[card.id]);
    const name = $derived(provider.name);
    const orgMode = $derived(card.organization);
    const connectable = $derived(orgMode !== null && (orgMode.method === "oauth" || orgMode.method === "trelloToken"));
    const missing = $derived([...new Set([...(orgMode?.missing ?? []), ...(card.personal?.missing ?? [])])]);
    const env = $derived([...new Set([...(orgMode?.env ?? []), ...(card.personal?.env ?? [])])]);
    const scopes = $derived([...(orgMode?.scopes ?? []), ...(card.personal?.scopes ?? [])]);
    let pending = $state<string | null>(null);

    function problemText(code: string | null | undefined): string {
        if (!code) return "";
        const known = (m.problems as Record<string, string>)[code];
        return known ?? i18n.t(m.problems.code, { code });
    }

    const test = $derived(formField<{ ok: true; account: string } | { ok: false; problem: string }>(form, "test"));
    const disconnected = $derived(formField<"revoked" | "unsupported" | "failed">(form, "disconnected"));
    const receiverSecret = $derived(formField<string>(form, "receiverSecret"));
    const startProblem = $derived(formField<string>(form, "problem"));

    function pendingSubmit(key: string) {
        return () => {
            pending = key;
            return async ({ update }: { update: () => Promise<void> }) => {
                await update();
                pending = null;
            };
        };
    }
</script>

<PageHeader title={name} description={provider.description}>
    {#snippet actions()}
        <a class="btn btn-ghost btn-sm" href={resolve(`/o/${org}/integrations`)}>
            <Icon name="chevron-left" size={16} />{m.provider.back}
        </a>
    {/snippet}
</PageHeader>
<CenterTabs {org} active="catalog" />

<div aria-live="polite" class="empty:hidden">
    {#if data.flash.connected}
        <p class="notice notice-success mb-4">{i18n.t(m.provider.connected, { provider: name })}</p>
    {:else if data.flash.problem}
        <p class="notice notice-danger mb-4" role="alert">{m.problems[data.flash.problem]}</p>
    {/if}
    {#if startProblem}
        <p class="notice notice-danger mb-4" role="alert">{problemText(startProblem)}</p>
    {/if}
    {#if test}
        {#if test.ok}
            <p class="notice notice-success mb-4">{i18n.t(m.provider.testOk, { account: test.account })}</p>
        {:else}
            <p class="notice notice-danger mb-4" role="alert">
                {i18n.t(m.provider.testFailed, { problem: problemText(test.problem) })}
            </p>
        {/if}
    {/if}
    {#if disconnected}
        <p class="notice {disconnected === 'revoked' ? 'notice-success' : 'notice-warning'} mb-4">
            {i18n.t(
                disconnected === "revoked"
                    ? m.provider.disconnected
                    : disconnected === "unsupported"
                      ? m.provider.disconnectedManual
                      : m.provider.revokeFailed,
                { provider: name },
            )}
        </p>
    {/if}
    {#if form && "receiverRemoved" in form}
        <p class="notice notice-success mb-4">{m.receiver.removed}</p>
    {/if}
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div class="space-y-6">
        <section class="card space-y-3" aria-labelledby="what">
            <h2 id="what" class="text-lg font-bold">{m.provider.whatItDoes}</h2>
            <p>{provider.usedFor}</p>
            <h3 class="pt-2 font-semibold">{m.provider.permissions}</h3>
            <p class="text-sm">{provider.permissions}</p>
            {#if scopes.length > 0}
                <ul class="flex flex-wrap gap-1.5" aria-label={m.provider.permissions}>
                    {#each scopes as scope, index (`${scope}-${index}`)}
                        <li><code class="chip" dir="ltr">{scope}</code></li>
                    {/each}
                </ul>
            {/if}
            <h3 class="pt-2 font-semibold">{m.provider.notes}</h3>
            <p class="muted text-sm">{m.notes[card.id]}</p>
        </section>

        {#if missing.length > 0}
            <section class="card space-y-3" aria-labelledby="setup">
                <h2 id="setup" class="text-lg font-bold">{m.setup.title}</h2>
                <p>{i18n.t(m.setup.notConfigured, { provider: name })}</p>
                <ol class="list-decimal space-y-3 ps-5 text-sm">
                    {#if env.length > 0}
                        <li>
                            {m.setup.createApp}
                            <!-- eslint-disable svelte/no-navigation-without-resolve -- external address (provider) -->
                            <a
                                href={card.setupUrl}
                                rel="noreferrer noopener"
                                target="_blank"
                                class="inline-flex items-center gap-1"
                            >
                                {m.setup.guide}<Icon name="external" size={14} />
                            </a>
                            <!-- eslint-enable svelte/no-navigation-without-resolve -->
                        </li>
                    {/if}
                    {#if card.redirectUri}
                        <li class="space-y-1">
                            <span>{m.setup.redirect}</span>
                            <CopyText value={card.redirectUri} />
                        </li>
                    {/if}
                    <li class="space-y-1">
                        <span>{m.setup.env}</span>
                        <ul class="flex flex-wrap gap-1.5">
                            {#each missing as variable (variable)}
                                <li><code class="chip" dir="ltr">{variable}</code></li>
                            {/each}
                        </ul>
                    </li>
                    {#if missing.includes("ORIGIN")}
                        <li>{m.setup.origin}</li>
                    {/if}
                </ol>
                <p class="muted text-sm">{m.setup.docs}</p>
            </section>
        {/if}

        {#if card.personal}
            <section class="card space-y-2" aria-labelledby="personal">
                <h2 id="personal" class="text-lg font-bold">{m.scope.personal}</h2>
                <p>{m.provider.personalOnly}</p>
                {#if card.personal.missing.length === 0}
                    <p class="muted text-sm">{i18n.p(m.provider.personalCount, card.personalCount)}</p>
                {/if}
                <a class="btn btn-sm" href={resolve(`/o/${org}/my-integrations`)}>{m.provider.openMine}</a>
            </section>
        {/if}

        {#if card.endpointKind}
            <section class="card space-y-2" aria-labelledby="destinations">
                <h2 id="destinations" class="text-lg font-bold">{m.provider.destinations}</h2>
                <p>{card.id === "slack" ? m.provider.slackDestinations : m.provider.destinationsIntro}</p>
                <p class="muted text-sm">{i18n.p(m.provider.destinationsCount, card.endpointCount)}</p>
                {#if orgMode?.method === "endpoints"}<p class="muted text-sm">{m.setup.noSetup}</p>{/if}
                <a class="btn btn-sm" href={resolve(`/o/${org}/integrations/notifications?kind=${card.endpointKind}`)}
                    >{m.provider.manageDestinations}</a
                >
            </section>
        {/if}

        {#if data.resources}
            <section class="card space-y-3" aria-labelledby="resources">
                <h2 id="resources" class="text-lg font-bold">{m.resources.title}</h2>
                <p class="muted text-sm">{m.resources.intro}</p>
                {#if !data.resources.ok}
                    <p class="notice notice-danger" role="alert">
                        {i18n.t(m.resources.failed, { problem: problemText(data.resources.problem) })}
                    </p>
                {:else if data.resources.resources.length === 0}
                    <p class="muted">{m.resources.empty}</p>
                {:else}
                    <ul class="divide-y divide-[var(--border)]">
                        {#each data.resources.resources as resource (resource.id)}
                            <li class="flex flex-wrap items-center gap-2 py-2.5">
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate font-medium" dir="auto">{resource.title}</span>
                                    {#if resource.updatedAt}
                                        <span class="muted text-xs"
                                            >{m.resources.updated}
                                            <DateTime value={resource.updatedAt} mode="relative" /></span
                                        >
                                    {/if}
                                </span>
                                <!-- eslint-disable svelte/no-navigation-without-resolve -- external address (provider) -->
                                <a
                                    class="btn btn-ghost btn-sm"
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    {m.resources.open}<Icon name="external" size={14} />
                                </a>
                                <!-- eslint-enable svelte/no-navigation-without-resolve -->
                                <CopyButton value={resource.url} label={m.resources.copyLink} />
                                {#if resource.embedUrl}<CopyButton
                                        value={resource.embedUrl}
                                        label={m.resources.copyEmbed}
                                    />{/if}
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
        {/if}

        {#if orgMode?.method === "receiver"}
            <section class="card space-y-3" aria-labelledby="receiver">
                <h2 id="receiver" class="text-lg font-bold">{m.receiver.title}</h2>
                <p>{m.receiver.intro}</p>
                {#if receiverSecret && data.receiverUrl}
                    <div class="notice notice-success space-y-2" aria-live="polite">
                        <p class="font-semibold">{m.receiver.secretOnce}</p>
                        <p class="text-sm">{m.receiver.url}</p>
                        <CopyText value={data.receiverUrl} />
                        <p class="text-sm">{m.receiver.secret}</p>
                        <CopyText value={receiverSecret} />
                        <p class="text-sm">{m.receiver.contentType}</p>
                        <p class="text-sm">
                            {card.id === "github" ? m.receiver.githubEvents : m.receiver.gitlabEvents}
                        </p>
                    </div>
                {:else if data.receiverUrl}
                    <p class="text-sm">{m.receiver.url}</p>
                    <CopyText value={data.receiverUrl} />
                    <p class="text-sm">{card.status === "connected" ? m.receiver.working : m.receiver.waiting}</p>
                {/if}
                {#if orgMode.missing.length === 0}
                    <div class="flex flex-wrap gap-2">
                        {#if data.receiverUrl}
                            <ConfirmForm
                                action="?/setupReceiver"
                                label={m.receiver.rotate}
                                title={m.receiver.rotateTitle}
                                description={m.receiver.rotateDescription}
                                small
                            />
                            <ConfirmForm
                                action="?/removeReceiver"
                                label={m.receiver.remove}
                                title={m.receiver.removeTitle}
                                description={m.receiver.removeDescription}
                                small
                            />
                        {:else}
                            <form method="POST" action="?/setupReceiver" use:enhance={pendingSubmit("receiver")}>
                                <button
                                    class="btn btn-primary btn-sm"
                                    type="submit"
                                    disabled={pending === "receiver"}
                                    aria-busy={pending === "receiver"}
                                >
                                    {m.receiver.setUp}
                                </button>
                            </form>
                        {/if}
                    </div>
                {/if}
            </section>
        {/if}
    </div>

    <div class="space-y-6">
        <section class="card space-y-3" aria-labelledby="connection">
            <div class="flex items-center justify-between gap-2">
                <h2 id="connection" class="text-lg font-bold">{m.provider.connection}</h2>
                <StatusBadge status={card.status} />
            </div>
            {#if card.connection}
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                    {#if card.connection.externalAccountName}
                        <dt class="muted">{m.provider.account}</dt>
                        <dd class="min-w-0 truncate" dir="auto">{card.connection.externalAccountName}</dd>
                    {/if}
                    <dt class="muted">{m.provider.lastTested}</dt>
                    <dd><DateTime value={card.connection.lastTestedAt} mode="relative" /></dd>
                    <dt class="muted">{m.provider.lastSync}</dt>
                    <dd><DateTime value={card.connection.lastSyncAt} mode="relative" /></dd>
                    {#if card.connection.expiresAt}
                        <dt class="muted">{m.provider.expires}</dt>
                        <dd><DateTime value={card.connection.expiresAt} /></dd>
                    {/if}
                    {#if card.connection.lastError}
                        <dt class="muted">{m.provider.lastError}</dt>
                        <dd>{problemText(card.connection.lastError)}</dd>
                    {/if}
                </dl>
            {:else if connectable}
                <p class="muted text-sm">{m.provider.notConnected}</p>
            {/if}
            {#if connectable && orgMode && orgMode.missing.length === 0}
                <div class="flex flex-wrap gap-2">
                    <!-- A full page request: the answer is a redirection to the provider. -->
                    <form method="POST" action="?/connect">
                        <button class="btn btn-primary btn-sm" type="submit">
                            {card.connection ? m.provider.reconnect : m.provider.connect}
                        </button>
                    </form>
                    {#if card.connection}
                        <form method="POST" action="?/test" use:enhance={pendingSubmit("test")}>
                            <button
                                class="btn btn-sm"
                                type="submit"
                                disabled={pending === "test"}
                                aria-busy={pending === "test"}
                            >
                                {m.provider.test}
                            </button>
                        </form>
                        <ConfirmForm
                            action="?/disconnect"
                            label={m.provider.disconnect}
                            title={i18n.t(m.provider.disconnectTitle, { provider: name })}
                            description={i18n.t(m.provider.disconnectDescription, { provider: name })}
                            small
                        />
                    {/if}
                </div>
            {/if}
            {#if card.manageAccessUrl && card.connection}
                <!-- eslint-disable svelte/no-navigation-without-resolve -- external address (provider) -->
                <a
                    class="inline-flex items-center gap-1 text-sm"
                    href={card.manageAccessUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    {i18n.t(m.provider.manageAccess, { provider: name })}<Icon name="external" size={14} />
                </a>
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
            {/if}
        </section>
    </div>
</div>
