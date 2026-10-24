import { writable } from "svelte/store";

export const MINIMAP_EXPANDED_STORAGE_KEY = "workadventure.minimap.expanded";

/**
 * Reads the remembered state. The minimap starts expanded; storage may be unavailable (private mode, blocked
 * site data, sandboxed iframe), in which case the default wins.
 */
function readExpandedPreference(): boolean {
    try {
        const value = localStorage.getItem(MINIMAP_EXPANDED_STORAGE_KEY);
        return value === null ? true : value === "true";
    } catch (error: unknown) {
        console.info("The minimap state cannot be read from the local storage", error);
        return true;
    }
}

function writeExpandedPreference(expanded: boolean): void {
    try {
        localStorage.setItem(MINIMAP_EXPANDED_STORAGE_KEY, String(expanded));
    } catch (error: unknown) {
        console.info("The minimap state cannot be saved to the local storage", error);
    }
}

export function createMinimapExpandedStore() {
    const { subscribe, set } = writable<boolean>(readExpandedPreference());

    return {
        subscribe,
        set: (expanded: boolean) => {
            writeExpandedPreference(expanded);
            set(expanded);
        },
    };
}

/** Whether the minimap card is expanded (true) or collapsed to its button (false). Remembered across sessions. */
export const minimapExpandedStore = createMinimapExpandedStore();

/**
 * Height (CSS pixels, margin included) the minimap takes in the bottom-left corner, 0 when it is not displayed.
 * Other bottom-left UI (the proximity chat notifications) stacks above it.
 */
export const minimapReservedHeightStore = writable<number>(0);
