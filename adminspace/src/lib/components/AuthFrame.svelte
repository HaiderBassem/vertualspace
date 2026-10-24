<!-- Frame of the public pages (login, registration, invitations, password reset): brand, language, card. -->
<script lang="ts">
    import type { Snippet } from "svelte";
    import Icon from "./Icon.svelte";
    import LocaleSwitcher from "./LocaleSwitcher.svelte";
    import { useI18n } from "$lib/i18n/context";

    let {
        title,
        intro = undefined,
        wide = false,
        children,
        footer = undefined,
    }: {
        title: string;
        intro?: string | undefined;
        wide?: boolean;
        children: Snippet;
        footer?: Snippet | undefined;
    } = $props();
    const i18n = useI18n();
</script>

<svelte:head><title>{title} · {i18n.m.common.appName}</title></svelte:head>

<main id="main" class="flex min-h-dvh items-start justify-center px-4 py-10 sm:items-center">
    <div class="w-full {wide ? 'max-w-xl' : 'max-w-sm'} space-y-6">
        <div class="flex items-center justify-between gap-3">
            <p class="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                <span
                    class="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-[var(--text)] text-[var(--surface)]"
                    aria-hidden="true"><Icon name="grid" size={15} /></span
                >
                {i18n.m.common.appName}
            </p>
            <LocaleSwitcher />
        </div>
        <div class="card space-y-5 p-6 sm:p-7">
            <div>
                <h1 class="text-xl font-semibold">{title}</h1>
                {#if intro}<p class="muted mt-1.5 text-sm">{intro}</p>{/if}
            </div>
            {@render children()}
        </div>
        {#if footer}<div class="muted text-center text-sm">{@render footer()}</div>{/if}
    </div>
</main>
