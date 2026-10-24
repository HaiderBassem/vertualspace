import { writable } from "svelte/store";

/**
 * The meeting of the user's calendar (the one they connected in the admin back office) going on now, if any. While it
 * lasts, the user shows as busy.
 */
export const calendarMeetingStore = writable<{ title: string; end: number } | undefined>(undefined);

/**
 * A focus session the user started: they do not want to be disturbed until `until` (milliseconds since the epoch).
 * Walking around does not end it, unlike a status chosen in the menu.
 */
export const focusSessionStore = writable<{ until: number } | undefined>(undefined);
