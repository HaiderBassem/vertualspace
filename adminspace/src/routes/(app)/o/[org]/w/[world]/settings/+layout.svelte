<script lang="ts">
    import { resolve } from "$app/paths";
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import { useI18n } from "$lib/i18n/context";
    import type { LayoutData } from "./$types";

    let { data, children }: { data: LayoutData; children: Snippet } = $props();
    const i18n = useI18n();
    const sections = $derived(i18n.m.worlds.settings.sections);

    const items = $derived([
        { href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings`), label: sections.general },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/branding`),
            label: sections.branding,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/features`),
            label: sections.features,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/avatars`),
            label: sections.avatars,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/permissions`),
            label: sections.permissions,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/integrations`),
            label: sections.integrations,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/applications`),
            label: sections.applications,
        },
        { href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/legal`), label: sections.legal },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/privacy`),
            label: sections.privacy,
        },
        {
            href: resolve(`/o/${data.organization.slug}/w/${data.world.slug}/settings/advanced`),
            label: sections.advanced,
        },
    ]);
</script>

<div class="grid grid-cols-1 gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
    <!-- On narrow screens the sections wrap on several lines instead of widening the page (WCAG 1.4.10). -->
    <nav class="min-w-0" aria-label={i18n.m.worlds.settings.title}>
        <ul class="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
            {#each items as item (item.href)}
                <li>
                    <a
                        href={item.href}
                        aria-current={page.url.pathname === item.href ? "page" : undefined}
                        class="block rounded-md px-3 py-2 text-sm whitespace-nowrap text-[var(--text)] no-underline hover:bg-[var(--surface-sunken)] aria-[current=page]:bg-[var(--surface-sunken)] aria-[current=page]:font-bold"
                    >
                        {item.label}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
    <div class="min-w-0">{@render children()}</div>
</div>
