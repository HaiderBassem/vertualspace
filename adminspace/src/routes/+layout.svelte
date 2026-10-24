<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";
    import type { LayoutData } from "./$types";
    import { createI18n, setI18n } from "$lib/i18n/context";

    let { data, children }: { data: LayoutData; children: Snippet } = $props();

    setI18n(createI18n(() => ({ m: data.m, locale: data.locale, timeZone: data.timeZone ?? undefined })));

    // The server renders lang/dir into <html>; keep them right when the locale changes client-side.
    $effect(() => {
        document.documentElement.lang = data.locale;
        document.documentElement.dir = data.dir;
    });

    // Marks the page interactive (end-to-end tests wait for it before typing: input typed before
    // hydration can be reset by it).
    $effect(() => {
        document.documentElement.dataset.hydrated = "true";
    });
</script>

<svelte:head>
    <title>{data.m.common.appName}</title>
</svelte:head>

<a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-[var(--surface)] focus:p-2"
>
    {data.m.common.skipToContent}
</a>

{@render children()}
