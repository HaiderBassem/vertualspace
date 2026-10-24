import { writable } from "svelte/store";
import type { CustomStatus } from "../Utils/CustomStatus";

/** The custom status of the current user (see GameScene.setMyCustomStatus), or undefined when there is none. */
export const myCustomStatusStore = writable<CustomStatus | undefined>(undefined);
