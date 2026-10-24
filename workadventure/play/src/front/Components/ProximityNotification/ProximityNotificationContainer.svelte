<script lang="ts">
    import { chatNotificationStore } from "../../Stores/ProximityNotificationStore";
    import { minimapReservedHeightStore } from "../../Stores/MinimapStore";
    import ProximityNotification from "./ProximityNotification.svelte";

    const MAX_NOTIFICATIONS = 4;
    // 16px (pb-4) above the bottom edge, or above the minimap when it is displayed in the same corner.
    const BOTTOM_PADDING = 16;
</script>

{#if $chatNotificationStore.length > 0}
    <div
        class="fixed left-4 bottom-0 pointer-events-none flex flex-col items-start z-[900]"
        style:padding-bottom="{BOTTOM_PADDING + $minimapReservedHeightStore}px"
    >
        {#each $chatNotificationStore.slice(-MAX_NOTIFICATIONS) as notification (notification.id)}
            <div class="flex justify-start mb-2">
                <ProximityNotification {notification} />
            </div>
        {/each}
    </div>
{/if}
