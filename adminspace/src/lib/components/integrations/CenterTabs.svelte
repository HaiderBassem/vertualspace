<!-- Sections of the Integration Center. Provider pages belong to the catalog section. -->
<script lang="ts">
    import { resolve } from "$app/paths";
    import type { ResolvedPathname } from "$app/types";
    import { useI18n } from "$lib/i18n/context";

    type Section = "catalog" | "notifications" | "deliveries" | "automation";
    let { org, active }: { org: string; active: Section } = $props();
    const i18n = useI18n();
    const t = $derived(i18n.m.integrationCenter.tabs);
    const items = $derived<{ key: Section; href: ResolvedPathname; label: string }[]>([
        { key: "catalog", href: resolve(`/o/${org}/integrations`), label: t.catalog },
        { key: "notifications", href: resolve(`/o/${org}/integrations/notifications`), label: t.notifications },
        { key: "deliveries", href: resolve(`/o/${org}/integrations/deliveries`), label: t.deliveries },
        { key: "automation", href: resolve(`/o/${org}/integrations/automation`), label: t.automation },
    ]);
</script>

<nav aria-label={t.label} class="relative mb-6 overflow-x-auto border-b border-[var(--border)]">
    <ul class="flex gap-1">
        {#each items as item (item.key)}
            <li>
                <a
                    href={item.href}
                    aria-current={item.key === active ? "page" : undefined}
                    class="-mb-px inline-block border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap no-underline {item.key ===
                    active
                        ? 'border-[var(--accent)] text-[var(--text)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}"
                >
                    {item.label}
                </a>
            </li>
        {/each}
    </ul>
</nav>
