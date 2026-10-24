import { writable } from "svelte/store";

export type RoomCreationStatus =
    | { state: "idle" }
    | { state: "pending"; commandId: string; name: string; addDoor: boolean }
    /** Created by map-storage, waiting for it to be listed in the world (to know its URL and add the door). */
    | { state: "linking"; name: string }
    | { state: "created"; name: string; roomUrl: string | undefined; doorAdded: boolean }
    | { state: "failed"; reason: string };

/** The room this user asked to create from the map editor. */
export const roomCreationStatusStore = writable<RoomCreationStatus>({ state: "idle" });
