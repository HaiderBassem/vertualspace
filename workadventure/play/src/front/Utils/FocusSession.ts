import { get } from "svelte/store";
import { focusSessionStore } from "../Stores/PresenceStores";
import type { CustomStatus } from "./CustomStatus";

/**
 * Focus sessions (Gather's "focus time"): for a while, the user does not want to be disturbed. They show as "Do not
 * disturb" (nobody can start a conversation with them, notifications are muted) even when they walk around, and the
 * others see "🎧 Focusing" on their nameplate until it ends, unless the user shows a status of their own.
 */

export const FOCUS_DURATIONS_MINUTES = [25, 50, 90] as const;

export const FOCUS_EMOJI = "🎧";

export interface FocusStatusSink {
    /** The custom status shown now, if any. */
    current(): CustomStatus | undefined;
    set(status: CustomStatus | undefined): void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Starts a focus session of this many minutes (replacing the one going on, if any). */
export function startFocusSession(minutes: number, status: FocusStatusSink, label: string, now = Date.now()): void {
    endFocusSession(status);
    const until = now + minutes * 60_000;
    focusSessionStore.set({ until });
    timer = setTimeout(() => endFocusSession(status), until - now);
    const current = status.current();
    // A status of the user's own is kept; the one an earlier focus session left (it was saved) is replaced.
    if (current === undefined || (current.emoji === FOCUS_EMOJI && current.text === label)) {
        status.set({ emoji: FOCUS_EMOJI, text: label, expiresAt: until });
    }
}

/** Ends the focus session going on, if any, and the status it showed (not a status the user set meanwhile). */
export function endFocusSession(status: FocusStatusSink): void {
    clearTimeout(timer);
    timer = undefined;
    const session = get(focusSessionStore);
    if (!session) return;
    focusSessionStore.set(undefined);
    const shown = status.current();
    if (shown?.emoji === FOCUS_EMOJI && shown.expiresAt === session.until) {
        status.set(undefined);
    }
}
