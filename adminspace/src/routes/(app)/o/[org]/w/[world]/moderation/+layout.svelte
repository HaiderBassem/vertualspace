<script lang="ts">
    import { resolve } from "$app/paths";
    import type { Snippet } from "svelte";
    import { page } from "$app/state";
    import Tabs from "$lib/components/Tabs.svelte";
    import { useI18n } from "$lib/i18n/context";

    let { children }: { children: Snippet } = $props();
    const i18n = useI18n();
</script>

<Tabs
    label={i18n.m.moderation.title}
    exact
    items={[
        {
            href: resolve(`/o/${page.params.org ?? ""}/w/${page.params.world ?? ""}/moderation`),
            label: i18n.m.moderation.tabs.bans,
        },
        {
            href: resolve(`/o/${page.params.org ?? ""}/w/${page.params.world ?? ""}/moderation/reports`),
            label: i18n.m.moderation.tabs.reports,
        },
    ]}
/>

{@render children()}
