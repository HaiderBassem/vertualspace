import type { Readable, Unsubscriber } from "svelte/store";
import { derived, get } from "svelte/store";
import { v4 } from "uuid";
import { LL } from "../../i18n/i18n-svelte";
import { toastStore } from "../Stores/ToastStoreSingleton";
import TextToast from "../Components/Toasts/TextToast.svelte";
import WaveReceivedToast from "../Components/Social/WaveReceivedToast.svelte";
import KnockPromptToast from "../Components/Social/KnockPromptToast.svelte";
import KnockReceivedToast from "../Components/Social/KnockReceivedToast.svelte";
import NowFreeToast from "../Components/Social/NowFreeToast.svelte";
import type { NowFreeUser } from "./AvailabilityWatcher";
import type { ReceivedWave, WaveFeedback, WaveTarget } from "./WaveManager";
import type { GoToFeedback, GoToTarget } from "./GoToManager";
import type { KnockFeedback, KnockPrompt } from "./KnockManager";

/** What the buttons of a received wave do. */
export interface WaveToastActions {
    waveBack(sender: WaveTarget): void;
    goTo(sender: ReceivedWave["sender"]): void;
    /** False when the local user cannot send direct messages (no chat, not logged in...). */
    canMessage(): boolean;
    message(chatId: string): void;
}

const SHORT_TOAST_MS = 3000;
const INFO_TOAST_MS = 5000;

function nameOrSomeone(name: string): string {
    return name || get(LL).social.someone();
}

function showText(toastUuid: string, message: string, theme: "success" | "error" | "secondary", duration: number) {
    toastStore.addToast(TextToast, { message, theme, duration }, toastUuid);
}

/**
 * Tells the user about waves with toasts. A new wave from the same person replaces the previous toast instead of
 * piling up.
 */
export function createWaveToasts(actions: WaveToastActions): WaveFeedback {
    const receivedToastBySender = new Map<string, string>();

    return {
        received(wave: ReceivedWave): void {
            const { sender } = wave;
            const previousToast = receivedToastBySender.get(sender.uuid);
            if (previousToast !== undefined) {
                toastStore.removeToast(previousToast);
            }
            // A fresh uuid, so that the new toast gets its full display time.
            const toastUuid = `wave-received-${v4()}`;
            receivedToastBySender.set(sender.uuid, toastUuid);

            const senderName = nameOrSomeone(sender.name);
            const chatId = sender.chatId;
            toastStore.addToast(
                WaveReceivedToast,
                {
                    senderName,
                    pictureStore: sender.pictureStore,
                    waveBack: wave.waveBack,
                    onWaveBack: () => actions.waveBack({ uuid: sender.uuid, name: senderName }),
                    onGoTo: () => actions.goTo(sender),
                    onMessage: chatId !== undefined && actions.canMessage() ? () => actions.message(chatId) : undefined,
                },
                toastUuid,
            );
        },
        sent(target: WaveTarget): void {
            showText(
                `wave-sent-${target.uuid}`,
                get(LL).social.wave.sent({ name: nameOrSomeone(target.name) }),
                "success",
                SHORT_TOAST_MS,
            );
        },
        rateLimited(target: WaveTarget, retryAfterMs: number): void {
            showText(
                `wave-sent-${target.uuid}`,
                get(LL).social.wave.rateLimited({
                    name: nameOrSomeone(target.name),
                    seconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
                }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        receiverGone(target: WaveTarget): void {
            showText(
                `wave-sent-${target.uuid}`,
                get(LL).social.wave.receiverGone({ name: nameOrSomeone(target.name) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        failed(target: WaveTarget): void {
            showText(
                `wave-sent-${target.uuid}`,
                get(LL).social.wave.failed({ name: nameOrSomeone(target.name) }),
                "error",
                INFO_TOAST_MS,
            );
        },
    };
}

/** What the buttons of a "is free now" toast do. */
export interface NowFreeToastActions {
    goTo(user: NowFreeUser): void;
    wave(user: NowFreeUser): void;
    canMessage(): boolean;
    message(chatId: string): void;
}

/** Tells the user about the people they wait for ("Tell me when free"). */
export function createAvailabilityToasts(actions: NowFreeToastActions) {
    return {
        watching(target: { uuid: string; name: string }): void {
            showText(
                `now-free-${target.uuid}`,
                get(LL).social.notifyWhenFree.watching({ name: nameOrSomeone(target.name) }),
                "success",
                SHORT_TOAST_MS,
            );
        },
        alreadyFree(target: { uuid: string; name: string }): void {
            showText(
                `now-free-${target.uuid}`,
                get(LL).social.notifyWhenFree.alreadyFree({ name: nameOrSomeone(target.name) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        free(user: NowFreeUser): void {
            const chatId = user.chatId;
            const toastUuid = `now-free-${user.uuid}`;
            toastStore.removeToast(toastUuid);
            toastStore.addToast(
                NowFreeToast,
                {
                    name: nameOrSomeone(user.name),
                    pictureStore: user.pictureStore,
                    onGoTo: () => actions.goTo(user),
                    onWave: () => actions.wave(user),
                    onMessage: chatId !== undefined && actions.canMessage() ? () => actions.message(chatId) : undefined,
                },
                toastUuid,
            );
        },
    };
}

/** Tells the user, with toasts, why "Go to" could not take them next to somebody. */
export function createGoToToasts(): GoToFeedback {
    return {
        notFound(target: GoToTarget): void {
            showText(
                `go-to-${target.uuid}`,
                get(LL).social.goTo.notFound({ name: nameOrSomeone(target.name) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        noFreeSpot(target: GoToTarget): void {
            showText(
                `go-to-${target.uuid}`,
                get(LL).social.goTo.noFreeSpot({ name: nameOrSomeone(target.name) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        failed(target: GoToTarget): void {
            showText(
                `go-to-${target.uuid}`,
                get(LL).social.goTo.failed({ name: nameOrSomeone(target.name) }),
                "error",
                INFO_TOAST_MS,
            );
        },
    };
}

function knockToastUuid(groupId: number, knockerUserId: number): string {
    return `knock-received-${groupId}-${knockerUserId}`;
}

/** Tells the user about knocks with toasts: the knocks received by the members, and the answers to the knocker. */
export function createKnockToasts(): KnockFeedback {
    return {
        knockReceived(knock, answer): void {
            toastStore.addToast(
                KnockReceivedToast,
                {
                    knockerUserId: knock.knockerUserId,
                    knockerName: nameOrSomeone(knock.knockerName),
                    onAnswer: answer,
                },
                knockToastUuid(knock.groupId, knock.knockerUserId),
            );
        },
        knockClosed(groupId, knockerUserId): void {
            toastStore.removeToast(knockToastUuid(groupId, knockerUserId));
        },
        letIn(responderName): void {
            showText(
                "knock-answer",
                get(LL).social.knock.letYouIn({ name: nameOrSomeone(responderName) }),
                "success",
                INFO_TOAST_MS,
            );
        },
        notNow(responderName): void {
            showText(
                "knock-answer",
                get(LL).social.knock.declined({ name: nameOrSomeone(responderName) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        rateLimited(retryAfterMs): void {
            showText(
                "knock-answer",
                get(LL).social.knock.rateLimited({ seconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }),
                "secondary",
                INFO_TOAST_MS,
            );
        },
        failed(): void {
            showText("knock-answer", get(LL).social.knock.failed(), "error", INFO_TOAST_MS);
        },
    };
}

/**
 * Shows "This conversation is private" with [Knock] while the user stands next to a locked conversation.
 *
 * @returns Removes the toast source.
 */
export function showKnockPrompt(prompt: Readable<KnockPrompt | undefined>, onKnock: () => void): Unsubscriber {
    return toastStore.registerToastSource(
        derived(prompt, (current) =>
            current === undefined
                ? undefined
                : { component: KnockPromptToast, props: { waiting: current.state === "waiting", onKnock } },
        ),
        undefined,
        "knock-prompt",
    );
}
