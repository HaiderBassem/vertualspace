import * as Sentry from "@sentry/svelte";
import type { Observable, Subscription } from "rxjs";
import type { Readable, Unsubscriber } from "svelte/store";
import { writable } from "svelte/store";
import type {
    GroupKnockAnsweredMessage,
    GroupKnockClosedMessage,
    GroupKnockReceivedMessage,
    KnockOnGroupAnswer,
} from "@workadventure/messages";
import { KnockOnGroupAnswer_Status } from "@workadventure/messages";

interface Position {
    x: number;
    y: number;
}

/** A conversation (bubble) of the map, as the server describes it. */
export interface ConversationInfo {
    groupId: number;
    position: Position;
    locked: boolean;
    full: boolean;
    userIds: readonly number[];
}

/**
 * The locked conversation the player stands next to, if any: within `distance` of its center or of one of its
 * members (the distance at which two users start talking). The closest one wins. Full conversations are left out:
 * nobody could be let in.
 */
export function findLockedConversationNearby(
    player: Position,
    conversations: Iterable<ConversationInfo>,
    getMemberPosition: (userId: number) => Position | undefined,
    distance: number,
): ConversationInfo | undefined {
    let closest: { conversation: ConversationInfo; distance: number } | undefined;
    for (const conversation of conversations) {
        if (!conversation.locked || conversation.full) {
            continue;
        }
        let nearest = Math.hypot(conversation.position.x - player.x, conversation.position.y - player.y);
        for (const userId of conversation.userIds) {
            const member = getMemberPosition(userId);
            if (member !== undefined) {
                nearest = Math.min(nearest, Math.hypot(member.x - player.x, member.y - player.y));
            }
        }
        if (nearest <= distance && (closest === undefined || nearest < closest.distance)) {
            closest = { conversation, distance: nearest };
        }
    }
    return closest?.conversation;
}

/**
 * How long a knock waits for an answer before the knocker may knock again: as long as the members are asked
 * (KnockReceivedToast).
 */
export const KNOCK_ANSWER_TIMEOUT_MS = 30_000;

/** "ready": offer to knock. "waiting": knocked, waiting for a member to answer. */
export interface KnockPrompt {
    groupId: number;
    state: "ready" | "waiting";
}

/** A conversation created or updated, as the room connection reports it. */
export interface ConversationUpdate {
    groupId: number;
    position: Position;
    groupSize?: number;
    locked?: boolean;
    userIds: number[];
}

export interface KnockConnection {
    readonly groupUpdateMessageStream: Observable<ConversationUpdate>;
    readonly groupDeleteMessageStream: Observable<{ groupId: number }>;
    readonly groupKnockReceivedStream: Observable<GroupKnockReceivedMessage>;
    readonly groupKnockAnsweredStream: Observable<GroupKnockAnsweredMessage>;
    readonly groupKnockClosedStream: Observable<GroupKnockClosedMessage>;
    knockOnGroup(groupId: number): Promise<KnockOnGroupAnswer>;
    emitAnswerGroupKnock(groupId: number, knockerUserId: number, accept: boolean): void;
}

export interface KnockFeedback {
    /** Somebody knocks on our conversation: ask whether to let them in. */
    knockReceived: (knock: GroupKnockReceivedMessage, answer: (accept: boolean) => void) => void;
    /** The knock was answered by another member, or is void: hide it. */
    knockClosed: (groupId: number, knockerUserId: number) => void;
    letIn: (responderName: string) => void;
    notNow: (responderName: string) => void;
    rateLimited: (retryAfterMs: number) => void;
    failed: () => void;
}

export interface KnockManagerOptions {
    connection: KnockConnection;
    feedback: KnockFeedback;
    /** The local player's moves. */
    playerMoves: Observable<{ x: number; y: number; moving: boolean }>;
    /** The conversation the local player is in. */
    currentGroupId: Readable<number | undefined>;
    getMemberPosition: (userId: number) => Position | undefined;
    /** How close to a conversation the player must stand to be offered to knock (see MINIMUM_DISTANCE). */
    nearbyDistance: number;
    maxPerGroup: number;
    /** Expected to stay silent when the status forbids notification sounds. */
    playKnockSound: () => void;
    /** Displays the prompt while it is defined. Returns what removes the display. */
    showPrompt: (prompt: Readable<KnockPrompt | undefined>, onKnock: () => void) => Unsubscriber;
}

/**
 * Knocking on a locked conversation. Standing still next to one offers to knock ("This conversation is private");
 * its members get "{name} is knocking" with [Let in] [Not now], and letting in allows the knocker to join once.
 */
export class KnockManager {
    private readonly conversations = new Map<number, ConversationInfo>();
    private readonly _promptStore = writable<KnockPrompt | undefined>(undefined);
    public readonly promptStore: Readable<KnockPrompt | undefined> = this._promptStore;
    private prompt: KnockPrompt | undefined;
    private playerPosition: Position | undefined;
    private playerMoving = false;
    private currentGroupId: number | undefined;
    /** The knocks shown to the local user, by "groupId:knockerUserId". */
    private readonly openKnocks = new Map<string, { groupId: number; knockerUserId: number }>();
    /** The conversations that let us in: no need to knock again while they last. */
    private readonly admittedTo = new Set<number>();
    private readonly subscriptions: Subscription[] = [];
    private readonly unsubscribeCurrentGroup: Unsubscriber;
    private readonly removePrompt: Unsubscriber;
    private waitingTimeout: ReturnType<typeof setTimeout> | undefined;
    private destroyed = false;

    constructor(private readonly options: KnockManagerOptions) {
        const { connection } = options;
        this.subscriptions.push(
            connection.groupUpdateMessageStream.subscribe((group) => {
                this.conversations.set(group.groupId, {
                    groupId: group.groupId,
                    position: group.position,
                    locked: group.locked ?? false,
                    full: (group.groupSize ?? group.userIds.length) >= options.maxPerGroup,
                    userIds: group.userIds,
                });
                this.updatePrompt();
            }),
            connection.groupDeleteMessageStream.subscribe(({ groupId }) => {
                this.conversations.delete(groupId);
                this.admittedTo.delete(groupId);
                this.updatePrompt();
            }),
            connection.groupKnockReceivedStream.subscribe((knock) => this.onKnockReceived(knock)),
            connection.groupKnockClosedStream.subscribe(({ groupId, knockerUserId }) =>
                this.closeKnock(groupId, knockerUserId),
            ),
            connection.groupKnockAnsweredStream.subscribe((answer) => this.onKnockAnswered(answer)),
            options.playerMoves.subscribe(({ x, y, moving }) => {
                this.playerPosition = { x, y };
                this.playerMoving = moving;
                this.updatePrompt();
            }),
        );
        this.unsubscribeCurrentGroup = options.currentGroupId.subscribe((groupId) => {
            if (this.currentGroupId !== undefined && groupId !== this.currentGroupId) {
                // We left that conversation: its knocks are not ours to answer anymore.
                this.closeKnocksOf(this.currentGroupId);
            }
            if (groupId !== undefined) {
                // Being let in is for one visit (like on the server): coming back after leaving means knocking again.
                this.admittedTo.delete(groupId);
            }
            this.currentGroupId = groupId;
            this.updatePrompt();
        });
        this.removePrompt = options.showPrompt(this.promptStore, () => {
            this.knock().catch((error) => {
                // knock() never rejects, but a floating promise must be handled.
                console.error(error);
                Sentry.captureException(error);
            });
        });
    }

    /** Knocks on the conversation of the prompt. Never rejects: the outcome is told through the feedback. */
    public async knock(): Promise<void> {
        const prompt = this.prompt;
        if (prompt === undefined || prompt.state === "waiting") {
            return;
        }
        this.setPrompt({ groupId: prompt.groupId, state: "waiting" });

        let answer: KnockOnGroupAnswer;
        try {
            answer = await this.options.connection.knockOnGroup(prompt.groupId);
        } catch (error) {
            if (this.destroyed) {
                return;
            }
            console.error("Failed to knock", error);
            Sentry.captureException(error);
            this.backToReady(prompt.groupId);
            this.options.feedback.failed();
            return;
        }
        if (this.destroyed) {
            return;
        }

        switch (answer.status) {
            case KnockOnGroupAnswer_Status.SENT:
                // Waiting for an answer (groupKnockAnsweredStream). The members' prompt expires unanswered after a
                // while: then the knocker may knock again.
                this.clearWaitingTimeout();
                this.waitingTimeout = setTimeout(() => {
                    this.waitingTimeout = undefined;
                    this.backToReady(prompt.groupId);
                }, KNOCK_ANSWER_TIMEOUT_MS);
                return;
            case KnockOnGroupAnswer_Status.RATE_LIMITED:
                this.backToReady(prompt.groupId);
                this.options.feedback.rateLimited(answer.retryAfterMs);
                return;
            case KnockOnGroupAnswer_Status.NOT_LOCKED:
            case KnockOnGroupAnswer_Status.GROUP_NOT_FOUND:
            case KnockOnGroupAnswer_Status.ALREADY_MEMBER:
            case KnockOnGroupAnswer_Status.TOO_FAR:
                // Nothing to knock on anymore (unlocked, gone, joined, or walked away): the prompt goes away with
                // the next update of the conversation or move of the player.
                this.backToReady(prompt.groupId);
                return;
            case KnockOnGroupAnswer_Status.UNRECOGNIZED:
                console.error("Unknown knock answer status", answer);
                this.backToReady(prompt.groupId);
                this.options.feedback.failed();
                return;
            default: {
                const _exhaustiveCheck: never = answer.status;
                return;
            }
        }
    }

    public destroy(): void {
        this.destroyed = true;
        this.clearWaitingTimeout();
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
        this.subscriptions.length = 0;
        this.unsubscribeCurrentGroup();
        for (const { groupId, knockerUserId } of this.openKnocks.values()) {
            this.options.feedback.knockClosed(groupId, knockerUserId);
        }
        this.openKnocks.clear();
        this.setPrompt(undefined);
        this.removePrompt();
    }

    private updatePrompt(): void {
        if (this.playerPosition === undefined) {
            return;
        }
        const nearby = findLockedConversationNearby(
            this.playerPosition,
            this.conversations.values(),
            this.options.getMemberPosition,
            this.options.nearbyDistance,
        );
        if (nearby === undefined || nearby.groupId === this.currentGroupId || this.admittedTo.has(nearby.groupId)) {
            this.setPrompt(undefined);
            return;
        }
        if (this.prompt?.groupId === nearby.groupId) {
            // Already offered (or knocked): keep it as is.
            return;
        }
        // Walking past a conversation is not trying to join it: offer to knock once the player stops.
        if (!this.playerMoving) {
            this.setPrompt({ groupId: nearby.groupId, state: "ready" });
        } else {
            this.setPrompt(undefined);
        }
    }

    private backToReady(groupId: number): void {
        if (this.prompt?.groupId === groupId) {
            this.setPrompt({ groupId, state: "ready" });
        }
    }

    private setPrompt(prompt: KnockPrompt | undefined): void {
        if (prompt?.state !== "waiting") {
            // Not waiting for an answer anymore (answered, walked away...).
            this.clearWaitingTimeout();
        }
        this.prompt = prompt;
        this._promptStore.set(prompt);
    }

    private clearWaitingTimeout(): void {
        if (this.waitingTimeout !== undefined) {
            clearTimeout(this.waitingTimeout);
            this.waitingTimeout = undefined;
        }
    }

    private onKnockReceived(knock: GroupKnockReceivedMessage): void {
        if (knock.groupId !== this.currentGroupId) {
            // We left that conversation in the meantime.
            return;
        }
        const key = knockKey(knock.groupId, knock.knockerUserId);
        this.openKnocks.set(key, { groupId: knock.groupId, knockerUserId: knock.knockerUserId });
        this.options.feedback.knockReceived(knock, (accept) => {
            this.openKnocks.delete(key);
            this.options.connection.emitAnswerGroupKnock(knock.groupId, knock.knockerUserId, accept);
        });
        this.options.playKnockSound();
    }

    private onKnockAnswered(answer: GroupKnockAnsweredMessage): void {
        if (answer.accepted) {
            // The server lets us in right away if we still stand next to the conversation, or when we come back.
            this.admittedTo.add(answer.groupId);
            this.options.feedback.letIn(answer.responderName);
            this.updatePrompt();
        } else {
            this.options.feedback.notNow(answer.responderName);
            this.backToReady(answer.groupId);
        }
    }

    private closeKnock(groupId: number, knockerUserId: number): void {
        if (this.openKnocks.delete(knockKey(groupId, knockerUserId))) {
            this.options.feedback.knockClosed(groupId, knockerUserId);
        }
    }

    private closeKnocksOf(groupId: number): void {
        for (const knock of [...this.openKnocks.values()]) {
            if (knock.groupId === groupId) {
                this.closeKnock(knock.groupId, knock.knockerUserId);
            }
        }
    }
}

function knockKey(groupId: number, knockerUserId: number): string {
    return `${groupId}:${knockerUserId}`;
}
