<script lang="ts">
    import type { Snippet } from "svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import type { ResolvedPathname } from "$app/types";
    import Avatar from "$lib/components/Avatar.svelte";
    import Icon, { type IconName } from "$lib/components/Icon.svelte";
    import LocaleSwitcher from "$lib/components/LocaleSwitcher.svelte";
    import Menu from "$lib/components/Menu.svelte";
    import { useI18n } from "$lib/i18n/context";
    import type { LayoutData } from "./$types";

    let { data, children }: { data: LayoutData; children: Snippet } = $props();
    const i18n = useI18n();
    const a = $derived(i18n.m.app);
    // Set by the root layout (src/routes/+layout.server.ts) and, inside an organization, by its layout.
    const account = $derived(page.data.account);
    const orgSlug = $derived(page.params.org);
    const organization = $derived(orgSlug ? page.data.organization : undefined);
    const can = $derived(organization ? page.data.can : undefined);
    const canSomewhere = $derived(organization ? page.data.canSomewhere : undefined);
    const support = $derived(organization ? page.data.support : null);
    const world = $derived(page.data.world as { slug: string; name: string } | undefined);
    const workspace = $derived(page.data.workspace as { slug: string; name: string } | undefined);

    let drawer: HTMLDialogElement | undefined = $state();

    // Close the drawer after a navigation inside it.
    $effect(() => {
        void page.url.pathname;
        drawer?.close();
    });

    function current(href: string, exact = false): "page" | undefined {
        const path = page.url.pathname;
        return (exact ? path === href : path === href || path.startsWith(`${href}/`)) ? "page" : undefined;
    }

    interface NavItem {
        href: ResolvedPathname;
        label: string;
        icon: IconName;
        exact?: boolean;
    }

    const orgItems = $derived.by((): NavItem[] => {
        if (!organization || !can || !canSomewhere) return [];
        const items: (NavItem & { show: boolean })[] = [
            {
                href: resolve(`/o/${organization.slug}`),
                label: can["world.read"] ? a.nav.overview : a.nav.home,
                icon: "home",
                exact: true,
                show: true,
            },
            {
                href: resolve(`/o/${organization.slug}/workspaces`),
                label: a.nav.workspaces,
                icon: "layers",
                show: canSomewhere["workspace.read"],
            },
            {
                href: resolve(`/o/${organization.slug}/desks`),
                label: i18n.m.desks.nav,
                icon: "grid",
                show: canSomewhere["room.manage"],
            },
            {
                href: resolve(`/o/${organization.slug}/presence`),
                label: i18n.m.presence.nav,
                icon: "activity",
                show: canSomewhere["presence.view"],
            },
            {
                href: resolve(`/o/${organization.slug}/team`),
                label: a.nav.people,
                icon: "users",
                show: can["team.read"],
            },
            {
                href: resolve(`/o/${organization.slug}/directory`),
                label: a.nav.directory,
                icon: "users",
                show: can["directory.read"] && !can["team.read"],
            },
            {
                href: resolve(`/o/${organization.slug}/components`),
                label: a.nav.components,
                icon: "box",
                show: can["component.read"],
            },
            {
                href: resolve(`/o/${organization.slug}/my-integrations`),
                label: i18n.m.integrationCenter.navPersonal,
                icon: "user",
                show: can["integration.personal"],
            },
        ];
        return items.filter((i) => i.show);
    });

    const adminItems = $derived.by((): NavItem[] => {
        if (!organization || !can) return [];
        const items: (NavItem & { show: boolean })[] = [
            {
                href: resolve(`/o/${organization.slug}/integrations`),
                label: i18n.m.integrationCenter.nav,
                icon: "plug",
                show: can["integration.manage"],
            },
            {
                href: resolve(`/o/${organization.slug}/api-keys`),
                label: a.nav.apiKeys,
                icon: "key",
                show: can["apiKey.manage"],
            },
            {
                href: resolve(`/o/${organization.slug}/domains`),
                label: a.nav.domains,
                icon: "link",
                show: can["domain.manage"],
            },
            {
                href: resolve(`/o/${organization.slug}/audit`),
                label: a.nav.audit,
                icon: "shield",
                show: can["audit.read"],
            },
            {
                href: resolve(`/o/${organization.slug}/settings`),
                label: a.nav.settings,
                icon: "sliders",
                show: can["organization.update"],
            },
        ];
        return items.filter((i) => i.show);
    });

    const platformItems = $derived.by((): NavItem[] =>
        account?.isSuperadmin
            ? [
                  { href: resolve("/admin"), label: a.platformNav.overview, icon: "activity", exact: true },
                  { href: resolve("/admin/organizations"), label: a.platformNav.organizations, icon: "building" },
                  { href: resolve("/admin/accounts"), label: a.platformNav.accounts, icon: "user" },
                  { href: resolve("/admin/components"), label: a.platformNav.components, icon: "box" },
                  { href: resolve("/admin/catalog"), label: a.platformNav.avatars, icon: "sparkle" },
                  { href: resolve("/admin/jobs"), label: a.platformNav.jobs, icon: "server" },
                  { href: resolve("/admin/email"), label: a.platformNav.email, icon: "mail" },
                  { href: resolve("/admin/settings"), label: a.platformNav.settings, icon: "sliders" },
                  { href: resolve("/admin/audit"), label: a.platformNav.audit, icon: "shield" },
              ]
            : [],
    );
</script>

{#snippet navLink(item: NavItem)}
    <a href={item.href} aria-current={current(item.href, item.exact)} class="nav-link">
        <Icon name={item.icon} size={17} />
        <span class="truncate">{item.label}</span>
    </a>
{/snippet}

{#snippet switcher()}
    <Menu label={a.switcher.label} triggerClass="switcher" panelClass="w-[17rem] max-h-[70vh] overflow-y-auto">
        {#snippet trigger()}
            {#if organization}
                <Avatar
                    name={organization.name}
                    seed={organization.slug}
                    imageUrl={organization.logoUrl}
                    size={30}
                    square
                />
                <span class="min-w-0 flex-1 text-start">
                    <span class="block truncate text-sm font-semibold">{organization.name}</span>
                    <span class="muted block truncate text-xs"
                        >{support
                            ? i18n.m.shell.roles.support
                            : page.data.role
                              ? i18n.m.shell.roles[page.data.role as keyof typeof i18n.m.shell.roles]
                              : ""}</span
                    >
                </span>
            {:else}
                <span
                    class="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]"
                >
                    <Icon name="building" size={16} />
                </span>
                <span class="min-w-0 flex-1 truncate text-start text-sm font-semibold">{a.switcher.choose}</span>
            {/if}
            <Icon name="chevron-up-down" size={16} class="text-[var(--text-muted)]" />
        {/snippet}
        {#snippet children({ close })}
            <p class="section-title px-2.5 pt-1.5 pb-1">{a.switcher.yourOrganizations}</p>
            {#each data.organizations as org (org.slug)}
                <a
                    class="popover-item"
                    href={resolve(`/o/${org.slug}`)}
                    aria-current={org.slug === organization?.slug ? "true" : undefined}
                    onclick={close}
                >
                    <Avatar name={org.name} seed={org.slug} imageUrl={org.logoUrl} size={24} square />
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium">{org.name}</span>
                        <span class="muted block truncate text-xs"
                            >{org.suspended ? a.switcher.suspended : i18n.m.shell.roles[org.role]}</span
                        >
                    </span>
                    {#if org.slug === organization?.slug}<Icon
                            name="check"
                            size={16}
                            class="text-[var(--accent)]"
                        />{/if}
                </a>
            {:else}
                <p class="muted px-2.5 py-2 text-sm">{a.switcher.none}</p>
            {/each}
            {#if data.supportOrganizations.length > 0}
                <p class="section-title px-2.5 pt-3 pb-1">{a.switcher.support}</p>
                {#each data.supportOrganizations as org (org.slug)}
                    <a class="popover-item" href={resolve(`/o/${org.slug}`)} onclick={close}>
                        <Avatar name={org.name} seed={org.slug} size={24} square />
                        <span class="min-w-0 flex-1 truncate font-medium">{org.name}</span>
                        <Icon name="lock" size={15} class="text-[var(--warning)]" />
                    </a>
                {/each}
            {/if}
            <div class="mt-1 border-t border-[var(--border)] pt-1">
                <a class="popover-item" href={resolve("/organizations")} onclick={close}>
                    <Icon name="plus" size={16} />
                    {a.switcher.create}
                </a>
            </div>
        {/snippet}
    </Menu>
{/snippet}

{#snippet navigation()}
    <nav aria-label={i18n.m.shell.nav.main} class="flex flex-col gap-6">
        {#if data.administersWorlds}
            <ul class="space-y-0.5">
                <li>
                    {@render navLink({ href: resolve("/worlds"), label: i18n.m.shell.nav.myWorlds, icon: "globe" })}
                </li>
            </ul>
        {/if}
        {#if orgItems.length > 0}
            <ul class="space-y-0.5">
                {#each orgItems as item (item.href)}<li>{@render navLink(item)}</li>{/each}
            </ul>
        {/if}
        {#if adminItems.length > 0}
            <div>
                <p class="section-title mb-1.5 px-2.5">{a.sections.administration}</p>
                <ul class="space-y-0.5">
                    {#each adminItems as item (item.href)}<li>{@render navLink(item)}</li>{/each}
                </ul>
            </div>
        {/if}
        {#if platformItems.length > 0}
            <div class="platform-nav">
                <p class="section-title mb-1.5 flex items-center gap-1.5 px-2.5">
                    <Icon name="shield" size={13} />{a.sections.platform}
                </p>
                <ul class="space-y-0.5">
                    {#each platformItems as item (item.href)}<li>{@render navLink(item)}</li>{/each}
                </ul>
            </div>
        {/if}
    </nav>
{/snippet}

{#snippet accountMenu()}
    <Menu label={a.account.menu} triggerClass="switcher" placement="above" panelClass="w-[15rem]">
        {#snippet trigger()}
            <Avatar name={account?.name ?? ""} seed={account?.id} size={28} />
            <span class="min-w-0 flex-1 text-start">
                <span class="block truncate text-sm font-medium">{account?.name}</span>
                <span class="muted block truncate text-xs">{account?.email}</span>
            </span>
        {/snippet}
        {#snippet children({ close })}
            <a class="popover-item" href={resolve("/account")} onclick={close}>
                <Icon name="user" size={16} />
                {a.account.settings}
            </a>
            <form method="POST" action="/logout">
                <button class="popover-item" type="submit">
                    <Icon name="logout" size={16} />
                    {a.account.signOut}
                </button>
            </form>
        {/snippet}
    </Menu>
{/snippet}

{#snippet sidebarContent()}
    <a href={resolve("/")} class="brand">
        <span class="brand-mark" aria-hidden="true"><Icon name="grid" size={15} /></span>
        <span>{i18n.m.common.appName}</span>
    </a>
    <div class="mb-5">{@render switcher()}</div>
    <div class="flex-1 overflow-y-auto">{@render navigation()}</div>
    <div class="mt-4 border-t border-[var(--border)] pt-3">{@render accountMenu()}</div>
{/snippet}

<div class="shell">
    <aside class="sidebar">
        {@render sidebarContent()}
    </aside>

    <dialog bind:this={drawer} class="drawer" aria-label={i18n.m.shell.nav.main}>
        <div class="flex h-full flex-col p-3">
            <div class="mb-2 flex justify-end">
                <button type="button" class="btn btn-ghost btn-icon btn-sm" onclick={() => drawer?.close()}>
                    <Icon name="x" label={a.closeMenu} />
                </button>
            </div>
            {@render sidebarContent()}
        </div>
    </dialog>

    <div class="flex min-w-0 flex-1 flex-col">
        <header class="topbar">
            <button type="button" class="btn btn-ghost btn-icon btn-sm md:hidden" onclick={() => drawer?.showModal()}>
                <Icon name="menu" label={a.openMenu} />
            </button>
            <nav aria-label={a.breadcrumbs} class="min-w-0 flex-1">
                <ol class="flex min-w-0 items-center gap-1.5 text-sm">
                    {#if organization}
                        <li class="min-w-0">
                            <a href={resolve(`/o/${organization.slug}`)} class="crumb">{organization.name}</a>
                        </li>
                        {#if workspace}
                            <li aria-hidden="true" class="muted"><Icon name="chevron-right" size={14} /></li>
                            <li class="min-w-0">
                                <a href={resolve(`/o/${organization.slug}/workspaces/${workspace.slug}`)} class="crumb"
                                    >{workspace.name}</a
                                >
                            </li>
                        {/if}
                        {#if world}
                            <li aria-hidden="true" class="muted"><Icon name="chevron-right" size={14} /></li>
                            <li class="min-w-0">
                                <a
                                    href={resolve(`/o/${organization.slug}/w/${world.slug}`)}
                                    class="crumb"
                                    aria-current="page">{world.name}</a
                                >
                            </li>
                        {/if}
                    {:else}
                        <li class="muted hidden truncate sm:block">{i18n.m.common.tagline}</li>
                    {/if}
                </ol>
            </nav>
            <LocaleSwitcher />
        </header>

        {#if support && organization}
            <div class="support-banner" role="status">
                <Icon name="lock" size={16} />
                <p class="min-w-0 flex-1">
                    {i18n.t(a.support.banner, {
                        organization: organization.name,
                        time: i18n.dateTime(support.expiresAt),
                        reason: support.reason,
                    })}
                </p>
                <form method="POST" action="/admin/organizations/{organization.id}?/endSupport">
                    <button class="btn btn-sm" type="submit">{a.support.end}</button>
                </form>
            </div>
        {/if}

        <main id="main" class="mx-auto w-full max-w-[76rem] flex-1 px-4 py-6 md:px-8 md:py-8" tabindex="-1">
            {@render children()}
        </main>
    </div>
</div>

<style>
    .shell {
        display: flex;
        min-height: 100dvh;
    }
    .sidebar {
        display: none;
        position: sticky;
        top: 0;
        height: 100dvh;
        width: var(--sidebar-width);
        flex-shrink: 0;
        flex-direction: column;
        padding: 1rem 0.75rem 0.75rem;
        border-inline-end: 1px solid var(--border);
        background: var(--surface);
    }
    @media (min-width: 768px) {
        .sidebar {
            display: flex;
        }
    }
    .drawer {
        margin: 0;
        margin-inline-start: 0;
        height: 100dvh;
        max-height: 100dvh;
        width: min(var(--sidebar-width), calc(100vw - 3rem));
        border: 0;
        border-inline-end: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        padding: 0;
    }
    .drawer::backdrop {
        background: rgb(10 12 16 / 0.45);
    }
    .brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.25rem 0.625rem 1rem;
        font-weight: 650;
        letter-spacing: -0.01em;
        color: var(--text);
        text-decoration: none;
    }
    .brand-mark {
        display: inline-flex;
        width: 1.625rem;
        height: 1.625rem;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius);
        background: var(--text);
        color: var(--surface);
    }
    :global(.switcher) {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 0.625rem;
        padding: 0.4375rem 0.5rem;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
        text-align: start;
    }
    :global(.switcher:hover) {
        background: var(--surface-hover);
    }
    .nav-link {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.4375rem 0.625rem;
        border-radius: var(--radius);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-muted);
        text-decoration: none;
    }
    .nav-link:hover {
        background: var(--surface-hover);
        color: var(--text);
    }
    .nav-link[aria-current="page"] {
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
    }
    .platform-nav {
        padding-block-start: 1rem;
        border-block-start: 1px dashed var(--border);
    }
    .topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-height: 3.25rem;
        padding: 0.375rem 1rem;
        border-block-end: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface) 92%, transparent);
        backdrop-filter: saturate(1.4) blur(8px);
    }
    @media (min-width: 768px) {
        .topbar {
            padding-inline: 2rem;
        }
    }
    .crumb {
        display: block;
        max-width: 16rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-muted);
        text-decoration: none;
        font-weight: 500;
    }
    .crumb:hover {
        color: var(--text);
    }
    .crumb[aria-current="page"] {
        color: var(--text);
        font-weight: 600;
    }
    .support-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 1rem;
        border-block-end: 1px solid color-mix(in srgb, var(--warning) 40%, transparent);
        background: var(--warning-soft);
        color: var(--warning);
        font-size: 0.875rem;
    }
    @media (min-width: 768px) {
        .support-banner {
            padding-inline: 2rem;
        }
    }
</style>
