<!-- Sub-navigation between related pages. The current one carries aria-current="page". -->
<script lang="ts">
    import { page } from "$app/state";
    import type { ResolvedPathname } from "$app/types";

    let {
        items,
        label,
        exact = false,
    }: { items: { href: ResolvedPathname; label: string }[]; label: string; exact?: boolean } = $props();

    function isCurrent(href: string): boolean {
        const path = page.url.pathname;
        return exact ? path === href : path === href || path.startsWith(`${href}/`);
    }
</script>

<nav aria-label={label} class="relative mb-6 overflow-x-auto border-b border-[var(--border)]">
    <ul class="flex gap-1">
        {#each items as item (item.href)}
            {@const current = isCurrent(item.href)}
            <li>
                <a
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    class="-mb-px inline-block border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap no-underline {current
                        ? 'border-[var(--accent)] text-[var(--text)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}"
                >
                    {item.label}
                </a>
            </li>
        {/each}
    </ul>
</nav>
