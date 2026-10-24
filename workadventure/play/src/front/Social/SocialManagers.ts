import * as Sentry from "@sentry/svelte";
import { Observable } from "rxjs";
import { get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import type { GameScene } from "../Phaser/Game/GameScene";
import type { RoomConnection } from "../Connection/RoomConnection";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { HasPlayerMovedInterface } from "../Api/Events/HasPlayerMovedInterface";
import { scriptUtils } from "../Api/ScriptUtils";
import { openDirectChatRoom } from "../Chat/Utils";
import { userIsConnected } from "../Stores/MenuStore";
import { currentPlayerGroupIdStore } from "../Stores/CurrentPlayerGroupStore";
import { blackListManager } from "../WebRtc/BlackListManager";
import { notificationManager } from "../Notification/NotificationManager";
import { BubbleNotification } from "../Notification/BubbleNotification";
import { hasMovedEventName } from "../Phaser/Player/Player";
import { MAX_PER_GROUP, MINIMUM_DISTANCE } from "../Enum/EnvironmentVariable";
import type { GoToScene, VisiblePlayer } from "./GoToManager";
import { GoToManager } from "./GoToManager";
import { WaveManager } from "./WaveManager";
import { KnockManager } from "./KnockManager";
import { AvailabilityWatcher } from "./AvailabilityWatcher";
import {
    createAvailabilityToasts,
    createGoToToasts,
    createKnockToasts,
    createWaveToasts,
    showKnockPrompt,
} from "./SocialToasts";

/** Volume of the "wave received" sound: noticeable, but quieter than a bubble sound. */
const WAVE_SOUND_VOLUME = 0.25;
const KNOCK_SOUND_VOLUME = 0.3;

function createGoToScene(scene: GameScene, connection: RoomConnection): GoToScene {
    return {
        roomUrl: scene.roomUrl,
        *getVisiblePlayers(): Iterable<VisiblePlayer> {
            for (const player of scene.MapPlayersByKey.values()) {
                yield {
                    userId: player.userId,
                    userUuid: player.userUuid,
                    x: player.x,
                    y: player.y,
                    direction: player.lastDirection,
                };
            }
        },
        queryUserPosition: (userUuid, userId) => connection.queryUserPosition(userUuid, userId),
        getCollisionGrid: () => scene.getGameMapFrontWrapper().getCollisionGrid({ emitMapChangedEvent: false }),
        getTileDimensions: () => scene.getGameMapFrontWrapper().getTileDimensions(),
        isPositionAllowed: (position) => scene.isPositionAllowedForCurrentUser(position),
        teleportCurrentPlayer: (x, y, direction) => scene.CurrentPlayer.teleportTo(x, y, direction),
        goToUserOnOtherMap: (playUri, userUuid) => scriptUtils.goToPage(`${playUri}#moveToUser=${userUuid}`),
    };
}

/** "Go to" for the users of this scene's map (and the existing teleport for the other maps). */
export function createGoToManager(scene: GameScene, connection: RoomConnection): GoToManager {
    return new GoToManager(createGoToScene(scene, connection), createGoToToasts());
}

/**
 * Waves through the world space, so that they reach the users of every map of the world.
 *
 * @param getGoToManager The "Go to" of a wave toast goes through it. A getter, as it may be created later.
 */
export function createWaveManager(
    scene: GameScene,
    worldSpace: SpaceInterface,
    connection: RoomConnection,
    getGoToManager: () => GoToManager | undefined,
): WaveManager {
    // Declared before use by the toast actions, which only run after the constructor returned.
    let waveManager: WaveManager | undefined = undefined;

    const toasts = createWaveToasts({
        waveBack: (sender) => {
            waveManager?.wave(sender, { waveBack: true }).catch((error) => {
                // wave() never rejects, but a floating promise must be handled.
                console.error(error);
                Sentry.captureException(error);
            });
        },
        goTo: (sender) => {
            getGoToManager()
                ?.goTo({ uuid: sender.uuid, name: sender.name, playUri: sender.playUri })
                .catch((error) => {
                    console.error(error);
                    Sentry.captureException(error);
                });
        },
        // Direct messages need the Matrix chat, and an account.
        canMessage: () => scene.room.isMatrixChatEnabled && get(userIsConnected),
        message: (chatId) => {
            openDirectChatRoom(chatId).catch((error) => {
                console.error("Error opening direct chat room:", error);
                Sentry.captureException(error);
            });
        },
    });

    waveManager = new WaveManager({
        space: worldSpace,
        connection,
        feedback: {
            ...toasts,
            received: (wave) => {
                toasts.received(wave);
                // A desktop notification too, when the tab is in the background (and the status allows it).
                const text = wave.waveBack
                    ? get(LL).social.wave.receivedBack({ name: wave.sender.name })
                    : get(LL).social.wave.received({ name: wave.sender.name });
                notificationManager.createNotification(new BubbleNotification(text));
            },
        },
        // playSound stays silent when the status forbids notification sounds (Do Not Disturb...).
        playReceivedSound: () => scene.playSound("wave", WAVE_SOUND_VOLUME),
        isBlocked: (userUuid) => blackListManager.isBlackListed(userUuid),
    });
    return waveManager;
}

/**
 * "Tell me when free", through the world space, so that people are followed on every map of the world.
 *
 * @param getGoToManager The "Go to" of the toast goes through it. A getter, as it may be created later.
 */
export function createAvailabilityWatcher(
    scene: GameScene,
    worldSpace: SpaceInterface,
    getGoToManager: () => GoToManager | undefined,
): AvailabilityWatcher {
    const report = (error: unknown) => {
        console.error(error);
        Sentry.captureException(error);
    };
    const toasts = createAvailabilityToasts({
        goTo: (user) => {
            getGoToManager()?.goTo(user).catch(report);
        },
        wave: (user) => {
            scene.waveManager?.wave(user).catch(report);
        },
        // Direct messages need the Matrix chat, and an account.
        canMessage: () => scene.room.isMatrixChatEnabled && get(userIsConnected),
        message: (chatId) => {
            openDirectChatRoom(chatId).catch(report);
        },
    });
    return new AvailabilityWatcher({
        space: worldSpace,
        feedback: {
            ...toasts,
            free: (user) => {
                toasts.free(user);
                // A desktop notification too, when the tab is in the background (and the status allows it).
                notificationManager.createNotification(
                    new BubbleNotification(get(LL).social.notifyWhenFree.nowFree({ name: user.name })),
                );
                // playSound stays silent when the status forbids notification sounds (Do Not Disturb...).
                scene.playSound("wave", WAVE_SOUND_VOLUME);
            },
        },
    });
}

/**
 * Knocking on the locked conversations of this map. The prompt ("This conversation is private" [Knock]) is a toast
 * shown while the user stands next to one.
 */
export function createKnockManager(scene: GameScene, connection: RoomConnection): KnockManager {
    // The player's moves, as an observable that stops listening once unsubscribed.
    const playerMoves = new Observable<HasPlayerMovedInterface>((subscriber) => {
        const player = scene.CurrentPlayer;
        const listener = (event: HasPlayerMovedInterface) => subscriber.next(event);
        player.on(hasMovedEventName, listener);
        return () => {
            player.off(hasMovedEventName, listener);
        };
    });

    return new KnockManager({
        connection,
        feedback: createKnockToasts(),
        playerMoves,
        currentGroupId: currentPlayerGroupIdStore,
        getMemberPosition: (userId) => {
            const player = scene.MapPlayersByKey.get(userId);
            return player ? { x: player.x, y: player.y } : undefined;
        },
        nearbyDistance: MINIMUM_DISTANCE,
        maxPerGroup: MAX_PER_GROUP,
        // playSound stays silent when the status forbids notification sounds (Do Not Disturb...).
        playKnockSound: () => scene.playSound("knock", KNOCK_SOUND_VOLUME),
        showPrompt: showKnockPrompt,
    });
}
