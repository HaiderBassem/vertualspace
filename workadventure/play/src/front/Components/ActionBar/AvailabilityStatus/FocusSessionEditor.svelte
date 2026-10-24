<script lang="ts">
    import { get } from "svelte/store";
    import { LL, locale } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { myCustomStatusStore } from "../../../Stores/CustomStatusStore";
    import { focusSessionStore } from "../../../Stores/PresenceStores";
    import { endFocusSession, FOCUS_DURATIONS_MINUTES, startFocusSession } from "../../../Utils/FocusSession";
    import type { FocusStatusSink } from "../../../Utils/FocusSession";
    import HeaderMenuItem from "../MenuIcons/HeaderMenuItem.svelte";

    // A focus session: "Do not disturb" for a while, even when walking around, and "🎧 Focusing" for the others.
    const status: FocusStatusSink = {
        current: () => get(myCustomStatusStore),
        set: (value) => gameManager.getCurrentGameScene().setMyCustomStatus(value),
    };

    const until = $derived(
        $focusSessionStore
            ? new Date($focusSessionStore.until).toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" })
            : "",
    );

    function start(minutes: number): void {
        startFocusSession(minutes, status, $LL.customStatus.focusSession.status());
    }
</script>

<div data-testid="focus-session">
    <HeaderMenuItem label={$LL.customStatus.focusSession.title()} />
    {#if $focusSessionStore}
        <div class="flex items-center gap-2 px-2 py-1 text-sm text-neutral-100">
            <span class="grow" data-testid="focus-session-until"
                >{$LL.customStatus.focusSession.until({ time: until })}</span
            >
            <button
                type="button"
                class="rounded px-2 py-1 hover:bg-white/10"
                data-testid="focus-session-end"
                onclick={(event) => {
                    event.stopPropagation();
                    endFocusSession(status);
                }}
            >
                {$LL.customStatus.focusSession.end()}
            </button>
        </div>
    {:else}
        <div class="flex items-center gap-1 px-2 py-1 text-sm text-neutral-100">
            {#each FOCUS_DURATIONS_MINUTES as minutes (minutes)}
                <button
                    type="button"
                    class="grow rounded px-1 py-1 hover:bg-white/10"
                    data-testid={`focus-session-${minutes}`}
                    title={$LL.customStatus.focusSession.hint()}
                    onclick={(event) => {
                        event.stopPropagation();
                        start(minutes);
                    }}
                >
                    {$LL.customStatus.focusSession.minutes({ count: minutes })}
                </button>
            {/each}
        </div>
    {/if}
</div>
