<script lang="ts">
    import type { Snippet } from "svelte";

    // Navigation, the organization switcher and the breadcrumb live in the application shell
    // ((app)/+layout.svelte); this layout only provides the organization's data to its pages.
    let { children }: { children: Snippet } = $props();
</script>

{@render children()}
