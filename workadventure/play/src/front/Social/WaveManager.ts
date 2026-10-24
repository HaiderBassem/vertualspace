import * as Sentry from "@sentry/svelte";
import type { Observable, Subscription } from "rxjs";
import type { Readable } from "svelte/store";
import type { SendWaveAnswer, SpaceUser, WavePrivateMessage } from "@workadventure/messages";
import { SendWaveAnswer_Status } from "@workadventure/messages";

/** The person to wave at. */
export interface WaveTarget {
    uuid: string;
    name: string;
}

/** A wave received from another user, with what the toast needs to answer it. */
export interface ReceivedWave {
    sender: {
        uuid: string;
        name: string;
        /** The map the sender is on. */
        playUri: string;
        /** Their Matrix id, to send them a message. Undefined when they have no chat account. */
        chatId: string | undefined;
        pictureStore: Readable<string | undefined> | undefined;
    };
    /** The sender answers a wave of ours. */
    waveBack: boolean;
}

/** How the WaveManager tells the user what happened. */
export interface WaveFeedback {
    received: (wave: ReceivedWave) => void;
    sent: (target: WaveTarget) => void;
    rateLimited: (target: WaveTarget, retryAfterMs: number) => void;
    receiverGone: (target: WaveTarget) => void;
    failed: (target: WaveTarget) => void;
}

/** What the WaveManager uses of a space (a SpaceInterface fits). */
export interface WaveSpace {
    getName(): string;
    observePrivateEvent(key: "wave"): Observable<{ wave: WavePrivateMessage; sender: SpaceUser }>;
    getSpaceUserBySpaceUserId(spaceUserId: string): { pictureStore: Readable<string | undefined> } | undefined;
}

export interface WaveManagerOptions {
    /** The space the waves go through. The world space reaches the users of every map of the world. */
    space: WaveSpace;
    connection: { sendWave(spaceName: string, receiverUserUuid: string, waveBack: boolean): Promise<SendWaveAnswer> };
    feedback: WaveFeedback;
    /** Plays the "wave received" sound. Expected to stay silent when the status forbids notification sounds. */
    playReceivedSound: () => void;
    /** Waves from users the local user blocked are dropped. */
    isBlocked: (userUuid: string) => boolean;
}

/**
 * Sends and receives waves (Gather-style "👋"). The back delivers them and enforces the rate limits; this class
 * only tells the user how it went.
 */
export class WaveManager {
    private readonly subscription: Subscription;
    private destroyed = false;

    constructor(private readonly options: WaveManagerOptions) {
        this.subscription = options.space.observePrivateEvent("wave").subscribe((event) => {
            this.onWaveReceived(event.sender, event.wave.waveBack);
        });
    }

    /**
     * Waves at somebody. Resolves once the user was told the outcome (sent, too soon, gone...). Never rejects.
     */
    public async wave(target: WaveTarget, options: { waveBack?: boolean } = {}): Promise<void> {
        let answer: SendWaveAnswer;
        try {
            answer = await this.options.connection.sendWave(
                this.options.space.getName(),
                target.uuid,
                options.waveBack ?? false,
            );
        } catch (error) {
            if (this.destroyed) {
                // The scene is closing: the query was aborted on purpose.
                return;
            }
            console.error("Failed to send a wave", error);
            Sentry.captureException(error);
            this.options.feedback.failed(target);
            return;
        }
        if (this.destroyed) {
            return;
        }

        switch (answer.status) {
            case SendWaveAnswer_Status.SENT:
                this.options.feedback.sent(target);
                return;
            case SendWaveAnswer_Status.RATE_LIMITED:
                this.options.feedback.rateLimited(target, answer.retryAfterMs);
                return;
            case SendWaveAnswer_Status.RECEIVER_NOT_FOUND:
                this.options.feedback.receiverGone(target);
                return;
            case SendWaveAnswer_Status.UNRECOGNIZED:
                console.error("Unknown wave answer status", answer);
                this.options.feedback.failed(target);
                return;
            default: {
                const _exhaustiveCheck: never = answer.status;
                return;
            }
        }
    }

    public destroy(): void {
        this.destroyed = true;
        this.subscription.unsubscribe();
    }

    private onWaveReceived(sender: SpaceUser, waveBack: boolean): void {
        if (!sender.uuid || this.options.isBlocked(sender.uuid)) {
            return;
        }
        const knownSender = this.options.space.getSpaceUserBySpaceUserId(sender.spaceUserId);
        this.options.feedback.received({
            sender: {
                uuid: sender.uuid,
                name: sender.name,
                playUri: sender.playUri,
                chatId: sender.chatID || undefined,
                pictureStore: knownSender?.pictureStore,
            },
            waveBack,
        });
        this.options.playReceivedSound();
    }
}
