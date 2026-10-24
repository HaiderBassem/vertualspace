import type { AreaData, SeatedState } from "@workadventure/map-editor";
import { writable } from "svelte/store";
import type { DeskCardInfo } from "../Phaser/Game/MapEditor/DeskCard";

export const isInsidePersonalAreaStore = writable(false);

export const personalAreaDataStore = writable<AreaData | null>(null);

/**
 * True when the player has no desk yet and at least one desk on the map is free and can be claimed by them. It drives the
 * "find a free desk" entry of the menu and the welcome prompt of a newcomer, and is kept up to date by the areas manager.
 */
export const freeDeskAvailableStore = writable(false);

/** The card of the desk the player clicked in the office (whose desk, are they at it, what can be done), if open. */
export const deskCardStore = writable<DeskCardInfo | undefined>(undefined);

/** The seat the player sits on, as the room confirmed it (undefined: standing). */
export const mySeatStore = writable<SeatedState | undefined>(undefined);
