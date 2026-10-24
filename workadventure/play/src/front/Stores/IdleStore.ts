import { derived, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import { videoStreamElementsStore } from "./PeerStore";
import { isLiveStreamingStore } from "./IsStreamingStore";

/** The delays people can choose before they are shown as away, in minutes (0: never). */
export const AWAY_AFTER_IDLE_OPTIONS = [0, 5, 10, 15, 30] as const;

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
const CHECK_INTERVAL_MS = 15_000;

function createAwayAfterIdleMinutesStore() {
    const { subscribe, set } = writable<number>(localUserStore.getAwayAfterIdleMinutes());
    return {
        subscribe,
        set: (minutes: number) => {
            localUserStore.setAwayAfterIdleMinutes(minutes);
            set(minutes);
        },
    };
}

/** After how many minutes without any input the user is shown as away (0: never). */
export const awayAfterIdleMinutesStore = createAwayAfterIdleMinutesStore();

/**
 * True when the user has not touched the keyboard, the mouse or the screen for the chosen delay. The first input
 * after that sets it back to false at once.
 */
export const userIdleStore = derived<typeof awayAfterIdleMinutesStore, boolean>(
    awayAfterIdleMinutesStore,
    (minutes, set) => {
        set(false);
        if (minutes <= 0) {
            return;
        }
        let lastActivity = Date.now();
        let idle = false;
        const onActivity = () => {
            lastActivity = Date.now();
            if (idle) {
                idle = false;
                set(false);
            }
        };
        const interval = setInterval(() => {
            if (!idle && Date.now() - lastActivity >= minutes * 60_000) {
                idle = true;
                set(true);
            }
        }, CHECK_INTERVAL_MS);
        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, onActivity, { passive: true });
        }
        return () => {
            clearInterval(interval);
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, onActivity);
            }
        };
    },
    false,
);

/**
 * Away because idle, but never in the middle of a conversation or a stream (listening is not an input).
 */
export const awayBecauseIdleStore = derived(
    [userIdleStore, videoStreamElementsStore, isLiveStreamingStore],
    ([$userIdle, $videoStreamElements, $isLiveStreaming]) =>
        $userIdle && $videoStreamElements.length === 0 && !$isLiveStreaming,
    false,
);
