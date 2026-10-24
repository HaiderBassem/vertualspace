import { writable } from "svelte/store";
import { v4 } from "uuid";
import type { WorkAdventureComponent } from "../../types/component";
import type { SharedActivity } from "../Integrations/SharedActivitySync";

export type WokaMenuAction = {
    uuid?: string;
    actionName: string;
    callback: () => void;
    protected?: boolean;
    priority?: number;
    style?: "is-success" | "is-error" | "is-primary" | string;
    actionIcon?: string | WorkAdventureComponent;
    testId?: string;
};

export interface WokaMenuData {
    wokaName: string;
    actions: WokaMenuAction[];
    visitCardUrl?: string;
    userId: number; // -1 if the user is not found yet and woka menu is in progress
    userUuid: string;
    /** The time zone the user shares, to show what time it is for them. */
    timeZone?: string;
    /** What the user shares of their activity (music, coding). */
    activity?: SharedActivity;
}

function createWokaMenuStore() {
    const { subscribe, update, set } = writable<WokaMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (
            wokaName: string,
            userId: number,
            userUuid: string,
            visitCardUrl: string | undefined,
            timeZone?: string,
            activity?: SharedActivity,
        ) => {
            set({
                wokaName,
                actions: new Array<WokaMenuAction>(),
                visitCardUrl,
                timeZone,
                activity,
                userId,
                userUuid,
            });
        },
        addAction: (action: WokaMenuAction) => {
            update((data) => {
                if (data === undefined) return data;

                const dataWithUuid = { ...action, uuid: action.uuid ?? v4() };
                data.actions = [...data.actions, dataWithUuid];
                return data;
            });
        },
        removeAction: (actionName: string) => {
            update((data) => {
                if (!data) return data;
                const index = data.actions.findIndex((action) => {
                    return action.actionName === actionName;
                });
                if (index == undefined || index === -1) return data;

                data.actions = [...data.actions.splice(index, 1)];
                return data;
            });
        },
        /**
         * Hides menu
         */
        clear: () => {
            set(undefined);
        },
        removeRemotePlayer: (userUuid: string) => {
            update((data) => {
                if (!data) return data;
                if (data.userUuid === userUuid) {
                    return undefined;
                }
                return data;
            });
        },
    };
}

export const wokaMenuStore = createWokaMenuStore();

export const wokaMenuProgressStore = writable<
    | {
          progress: number;
          message: string;
      }
    | undefined
>(undefined);
