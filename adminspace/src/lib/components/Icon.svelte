<!--
    Inline SVG icons drawn for AdminSpace (24×24 grid, 1.75 stroke, currentColor): no icon font, no
    third-party set, no network request. Decorative by default (aria-hidden); give `label` when the
    icon carries meaning on its own. Directional icons mirror in right-to-left layouts.
-->
<script lang="ts" module>
    export const ICONS = {
        home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v10h12V9"/><path d="M10 19v-5h4v5"/>',
        building:
            '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2"/><path d="M10.5 20.5V18h3v2.5"/>',
        layers: '<path d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
        globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5Z"/>',
        door: '<path d="M6 20.5V4.5A1 1 0 0 1 7 3.5h10a1 1 0 0 1 1 1v16"/><path d="M4 20.5h16"/><circle cx="14.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/>',
        users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4"/><path d="M17.5 14.8c1.8.6 3 2.2 3.5 4.7"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-3.8 3.6-6 7.5-6s6.7 2.2 7.5 6"/>',
        mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
        shield: '<path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.8 7 9 4.1-1.2 7-4.7 7-9V6l-7-2.5Z"/><path d="m9 12 2 2 4-4"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5"/><path d="m16 7 2.5 2.5"/><path d="m14 9 2 2"/>',
        link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
        sliders:
            '<path d="M4 7h9M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 12h3M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 17h11M19 17h1"/><circle cx="17" cy="17" r="2"/>',
        box: '<path d="M12 3.5 20 7.5v9L12 20.5 4 16.5v-9L12 3.5Z"/><path d="M4 7.5 12 11.5l8-4"/><path d="M12 11.5v9"/>',
        grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
        list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.75" cy="6.5" r=".9" fill="currentColor" stroke="none"/><circle cx="4.75" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="4.75" cy="17.5" r=".9" fill="currentColor" stroke="none"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        x: '<path d="M6 6l12 12M18 6 6 18"/>',
        "chevron-down": '<path d="m6 9 6 6 6-6"/>',
        "chevron-up-down": '<path d="m8 9.5 4-4 4 4"/><path d="m8 14.5 4 4 4-4"/>',
        "chevron-right": '<path d="m9 6 6 6-6 6"/>',
        "chevron-left": '<path d="m15 6-6 6 6 6"/>',
        "arrow-right": '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
        external:
            '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>',
        logout: '<path d="M14 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8"/><path d="M10 12h10"/><path d="m16.5 8.5 3.5 3.5-3.5 3.5"/>',
        menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
        activity: '<path d="M3.5 12h4l2.5-6 4 12 2.5-6h4"/>',
        alert: '<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
        info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
        lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
        star: '<path d="m12 4 2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.8l-5 2.6.9-5.6-4-3.9 5.6-.8L12 4Z"/>',
        trash: '<path d="M4.5 7h15"/><path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>',
        pencil: '<path d="M15.5 5 19 8.5 8.5 19H5v-3.5L15.5 5Z"/><path d="m13.5 7 3.5 3.5"/>',
        copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
        refresh:
            '<path d="M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M17.5 3.5v3.4h-3.4"/><path d="M6.5 20.5v-3.4h3.4"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
        sparkle:
            '<path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5Z"/><path d="M18.5 15.5c.3 1.9.9 2.6 2.8 2.8-1.9.3-2.5.9-2.8 2.8-.3-1.9-.9-2.5-2.8-2.8 1.9-.2 2.5-.9 2.8-2.8Z"/>',
        server: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><circle cx="7.75" cy="7.5" r=".9" fill="currentColor" stroke="none"/><circle cx="7.75" cy="16.5" r=".9" fill="currentColor" stroke="none"/>',
        inbox: '<path d="M4 13.5 6.5 5h11l2.5 8.5"/><path d="M4 13.5v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5h-5l-1 2h-4l-1-2H4Z"/>',
        play: '<circle cx="12" cy="12" r="8.5"/><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z"/>',
        upload: '<path d="M12 15.5V4.5"/><path d="m7.5 9 4.5-4.5L16.5 9"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15"/>',
        download:
            '<path d="M12 4.5v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15"/>',
        filter: '<path d="M4 5.5h16l-6.2 7.3v5.4l-3.6 1.8v-7.2L4 5.5Z"/>',
        language:
            '<path d="M4 6h9M8.5 4v2c0 4-2 7-4.5 8.5"/><path d="M6 10c1 2 3 3.5 5.5 4.5"/><path d="m12.5 20 4-9 4 9"/><path d="M14 17h5"/>',
        "help-circle":
            '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
        tag: '<path d="M4 4.5h7.5l8.5 8.5-7 7-8.5-8.5V4.5Z"/><circle cx="8.25" cy="8.75" r="1.25"/>',
        briefcase:
            '<rect x="3.5" y="7.5" width="17" height="12" rx="1.5"/><path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3.5 12.5h17"/>',
        command:
            '<path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9Zm0 0v6m0-6h6m-6 6v2.5A2.5 2.5 0 1 1 6.5 15H9Zm0 0h6m0-6V6.5A2.5 2.5 0 1 1 17.5 9H15Zm0 0v6m0 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15Z"/>',
        archive:
            '<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M5 8.5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-10"/><path d="M10 12.5h4"/>',
        plug: '<path d="M9 3.5v4M15 3.5v4"/><path d="M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0v-3Z"/><path d="M12 16v4.5"/>',
    } as const;

    export type IconName = keyof typeof ICONS;

    /** Icons that point to a direction: mirrored when the document is right to left. */
    const DIRECTIONAL = new Set<IconName>(["chevron-right", "chevron-left", "arrow-right", "logout", "external"]);
</script>

<script lang="ts">
    let {
        name,
        size = 18,
        label = undefined,
        class: className = "",
    }: { name: IconName; size?: number; label?: string | undefined; class?: string } = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon shrink-0 {DIRECTIONAL.has(name) ? 'rtl:-scale-x-100' : ''} {className}"
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
    focusable="false"
>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- static markup from the constant table above, never user input -->
    {@html ICONS[name]}
</svg>
