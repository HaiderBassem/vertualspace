import { afterEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { get, writable } from "svelte/store";
import type { Readable } from "svelte/store";
import type {
    GroupKnockAnsweredMessage,
    GroupKnockClosedMessage,
    GroupKnockReceivedMessage,
    KnockOnGroupAnswer,
} from "@workadventure/messages";
import { KnockOnGroupAnswer_Status } from "@workadventure/messages";
import type {
    ConversationInfo,
    ConversationUpdate,
    KnockConnection,
    KnockFeedback,
    KnockPrompt,
} from "../KnockManager";
import { findLockedConversationNearby, KNOCK_ANSWER_TIMEOUT_MS, KnockManager } from "../KnockManager";

const DISTANCE = 64;

function createKnockManager(options: { knockAnswer?: KnockOnGroupAnswer | Error } = {}) {
    const groupUpdates = new Subject<ConversationUpdate>();
    const groupDeletes = new Subject<{ groupId: number }>();
    const knocksReceived = new Subject<GroupKnockReceivedMessage>();
    const knocksAnswered = new Subject<GroupKnockAnsweredMessage>();
    const knocksClosed = new Subject<GroupKnockClosedMessage>();
    const playerMoves = new Subject<{ x: number; y: number; moving: boolean }>();
    const currentGroupId = writable<number | undefined>(undefined);
    const memberPositions = new Map<number, { x: number; y: number }>();

    const knockOnGroup = vi.fn((_groupId: number) => {
        const answer = options.knockAnswer ?? { status: KnockOnGroupAnswer_Status.SENT, retryAfterMs: 0 };
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    });
    const emitAnswerGroupKnock = vi.fn<KnockConnection["emitAnswerGroupKnock"]>();
    const connection: KnockConnection = {
        groupUpdateMessageStream: groupUpdates,
        groupDeleteMessageStream: groupDeletes,
        groupKnockReceivedStream: knocksReceived,
        groupKnockAnsweredStream: knocksAnswered,
        groupKnockClosedStream: knocksClosed,
        knockOnGroup,
        emitAnswerGroupKnock,
    };
    const feedback: KnockFeedback = {
        knockReceived: vi.fn(),
        knockClosed: vi.fn(),
        letIn: vi.fn(),
        notNow: vi.fn(),
        rateLimited: vi.fn(),
        failed: vi.fn(),
    };
    const playKnockSound = vi.fn();
    const removePrompt = vi.fn();
    let shownPrompt: Readable<KnockPrompt | undefined> | undefined;
    let onKnockClicked: (() => void) | undefined;

    const manager = new KnockManager({
        connection,
        feedback,
        playerMoves,
        currentGroupId,
        getMemberPosition: (userId) => memberPositions.get(userId),
        nearbyDistance: DISTANCE,
        maxPerGroup: 4,
        playKnockSound,
        showPrompt: (prompt, onKnock) => {
            shownPrompt = prompt;
            onKnockClicked = onKnock;
            return removePrompt;
        },
    });

    /** Alice (user 1) and Bob (user 2) talk around (150, 100). */
    const lockedConversation = (locked = true) => {
        memberPositions.set(1, { x: 100, y: 100 });
        memberPositions.set(2, { x: 200, y: 100 });
        groupUpdates.next({ groupId: 7, position: { x: 150, y: 100 }, groupSize: 2, locked, userIds: [1, 2] });
    };
    const prompt = () => (shownPrompt ? get(shownPrompt) : undefined);

    return {
        manager,
        feedback,
        knockOnGroup,
        emitAnswerGroupKnock,
        playKnockSound,
        removePrompt,
        playerMoves,
        currentGroupId,
        groupDeletes,
        knocksReceived,
        knocksAnswered,
        knocksClosed,
        lockedConversation,
        prompt,
        clickKnock: () => onKnockClicked?.(),
        stopAt: (x: number, y: number) => playerMoves.next({ x, y, moving: false }),
        walkAt: (x: number, y: number) => playerMoves.next({ x, y, moving: true }),
    };
}

/** Lets the pending promises (the knock query) settle. */
const flushPromises = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

describe("findLockedConversationNearby", () => {
    const conversation = (groupId: number, x: number, overrides: Partial<ConversationInfo> = {}): ConversationInfo => ({
        groupId,
        position: { x, y: 0 },
        locked: true,
        full: false,
        userIds: [],
        ...overrides,
    });

    it("finds the closest locked conversation within the distance", () => {
        const found = findLockedConversationNearby(
            { x: 0, y: 0 },
            [conversation(1, 60), conversation(2, 30), conversation(3, 200)],
            () => undefined,
            DISTANCE,
        );
        expect(found?.groupId).toBe(2);
    });

    it("measures the distance to the members too, not only to the center", () => {
        const found = findLockedConversationNearby(
            { x: 0, y: 0 },
            [conversation(1, 300, { userIds: [5] })],
            (userId) => (userId === 5 ? { x: 50, y: 0 } : undefined),
            DISTANCE,
        );
        expect(found?.groupId).toBe(1);
    });

    it("ignores the conversations one could simply walk into, and the full ones", () => {
        expect(
            findLockedConversationNearby(
                { x: 0, y: 0 },
                [conversation(1, 10, { locked: false }), conversation(2, 10, { full: true })],
                () => undefined,
                DISTANCE,
            ),
        ).toBeUndefined();
    });
});

describe("KnockManager", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("offers to knock once the player stops next to a locked conversation, not while walking past", () => {
        const { lockedConversation, prompt, walkAt, stopAt } = createKnockManager();
        lockedConversation();

        walkAt(250, 100);
        expect(prompt()).toBeUndefined();

        stopAt(250, 100);
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });

        // Walking away hides it.
        walkAt(500, 100);
        expect(prompt()).toBeUndefined();
    });

    it("does not offer to knock on an open conversation, nor on one's own", () => {
        const { lockedConversation, prompt, stopAt, currentGroupId } = createKnockManager();
        lockedConversation(false);
        stopAt(250, 100);
        expect(prompt()).toBeUndefined();

        lockedConversation(true);
        currentGroupId.set(7);
        stopAt(150, 120);
        expect(prompt()).toBeUndefined();
    });

    it("knocks, waits, and offers to knock again after a 'Not now'", async () => {
        const { lockedConversation, prompt, stopAt, clickKnock, knockOnGroup, knocksAnswered, feedback } =
            createKnockManager();
        lockedConversation();
        stopAt(250, 100);

        clickKnock();
        expect(prompt()).toEqual({ groupId: 7, state: "waiting" });
        await flushPromises();
        expect(knockOnGroup).toHaveBeenCalledWith(7);
        expect(prompt()).toEqual({ groupId: 7, state: "waiting" });

        // Knocking again while waiting does nothing.
        clickKnock();
        expect(knockOnGroup).toHaveBeenCalledTimes(1);

        knocksAnswered.next({ groupId: 7, accepted: false, responderName: "Bob" });
        expect(feedback.notNow).toHaveBeenCalledWith("Bob");
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });
    });

    it("stops offering to knock once let in, until the visit is over", async () => {
        const { lockedConversation, prompt, stopAt, clickKnock, knocksAnswered, feedback, currentGroupId } =
            createKnockManager();
        lockedConversation();
        stopAt(250, 100);
        clickKnock();
        await flushPromises();

        knocksAnswered.next({ groupId: 7, accepted: true, responderName: "Alice" });
        expect(feedback.letIn).toHaveBeenCalledWith("Alice");
        expect(prompt()).toBeUndefined();
        stopAt(255, 100);
        expect(prompt()).toBeUndefined();

        // In, then out again: being let in was for one visit.
        currentGroupId.set(7);
        currentGroupId.set(undefined);
        stopAt(250, 100);
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });
    });

    it("lets the knocker knock again when nobody answers in time", async () => {
        vi.useFakeTimers();
        const { lockedConversation, prompt, stopAt, clickKnock } = createKnockManager();
        lockedConversation();
        stopAt(250, 100);

        clickKnock();
        await vi.advanceTimersByTimeAsync(0);
        expect(prompt()).toEqual({ groupId: 7, state: "waiting" });

        await vi.advanceTimersByTimeAsync(KNOCK_ANSWER_TIMEOUT_MS);
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });
        vi.useRealTimers();
    });

    it("tells how long to wait when knocking too often", async () => {
        const { lockedConversation, prompt, stopAt, clickKnock, feedback } = createKnockManager({
            knockAnswer: { status: KnockOnGroupAnswer_Status.RATE_LIMITED, retryAfterMs: 9_000 },
        });
        lockedConversation();
        stopAt(250, 100);

        clickKnock();
        await flushPromises();

        expect(feedback.rateLimited).toHaveBeenCalledWith(9_000);
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });
    });

    it("reports a failed knock and lets the user try again", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { lockedConversation, prompt, stopAt, clickKnock, feedback } = createKnockManager({
            knockAnswer: new Error("Connection lost"),
        });
        lockedConversation();
        stopAt(250, 100);

        clickKnock();
        await flushPromises();

        expect(feedback.failed).toHaveBeenCalled();
        expect(prompt()).toEqual({ groupId: 7, state: "ready" });
    });

    it("hides the prompt when the conversation ends", () => {
        const { lockedConversation, prompt, stopAt, groupDeletes } = createKnockManager();
        lockedConversation();
        stopAt(250, 100);

        groupDeletes.next({ groupId: 7 });

        expect(prompt()).toBeUndefined();
    });

    it("shows the members who is knocking, with a sound, and sends their answer", () => {
        const { knocksReceived, currentGroupId, feedback, playKnockSound, emitAnswerGroupKnock } = createKnockManager();
        currentGroupId.set(7);
        const knock = { groupId: 7, knockerUserId: 3, knockerUuid: "carol", knockerName: "Carol" };

        knocksReceived.next(knock);

        expect(feedback.knockReceived).toHaveBeenCalledWith(knock, expect.any(Function));
        expect(playKnockSound).toHaveBeenCalledTimes(1);
        const answer = vi.mocked(feedback.knockReceived).mock.calls[0][1];
        answer(true);
        expect(emitAnswerGroupKnock).toHaveBeenCalledWith(7, 3, true);
    });

    it("ignores the knocks on a conversation one already left", () => {
        const { knocksReceived, feedback, playKnockSound } = createKnockManager();

        knocksReceived.next({ groupId: 7, knockerUserId: 3, knockerUuid: "carol", knockerName: "Carol" });

        expect(feedback.knockReceived).not.toHaveBeenCalled();
        expect(playKnockSound).not.toHaveBeenCalled();
    });

    it("hides a knock answered by another member, or when leaving the conversation", () => {
        const { knocksReceived, knocksClosed, currentGroupId, feedback } = createKnockManager();
        currentGroupId.set(7);
        knocksReceived.next({ groupId: 7, knockerUserId: 3, knockerUuid: "carol", knockerName: "Carol" });
        knocksReceived.next({ groupId: 7, knockerUserId: 4, knockerUuid: "dave", knockerName: "Dave" });

        knocksClosed.next({ groupId: 7, knockerUserId: 3 });
        expect(feedback.knockClosed).toHaveBeenCalledWith(7, 3);

        currentGroupId.set(undefined);
        expect(feedback.knockClosed).toHaveBeenCalledWith(7, 4);
        expect(feedback.knockClosed).toHaveBeenCalledTimes(2);
    });

    it("cleans up when destroyed", () => {
        const { manager, playerMoves, knocksReceived, currentGroupId, feedback, removePrompt } = createKnockManager();
        currentGroupId.set(7);
        knocksReceived.next({ groupId: 7, knockerUserId: 3, knockerUuid: "carol", knockerName: "Carol" });

        manager.destroy();

        expect(feedback.knockClosed).toHaveBeenCalledWith(7, 3);
        expect(removePrompt).toHaveBeenCalled();
        expect(playerMoves.observed).toBe(false);
        expect(knocksReceived.observed).toBe(false);
    });
});
