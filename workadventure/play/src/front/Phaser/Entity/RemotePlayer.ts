import * as Sentry from "@sentry/svelte";
import * as Phaser from "phaser";
import { get } from "svelte/store";
import type { CancelablePromise } from "cancelable-promise";
import {
    AskPositionMessage_AskType,
    type PositionMessage,
    type PositionMessage_Direction,
    type SayMessage,
} from "@workadventure/messages";
import type { WokaMenuAction } from "../../Stores/WokaMenuStore";
import { wokaMenuStore } from "../../Stores/WokaMenuStore";
import { Character } from "../Entity/Character";
import type { GameScene } from "../Game/GameScene";
import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";
import type { ActivatableInterface } from "../Game/ActivatableInterface";
import { LL } from "../../../i18n/i18n-svelte";
import { blackListManager } from "../../WebRtc/BlackListManager";
import { openModerationModal } from "../../Components/Moderation/openModerationModal";
import { iframeListener } from "../../Api/IframeListener";
import banIcon from "../../Components/images/ban-icon.svg";
import { openDirectChatRoom } from "../../Chat/Utils";
import chat from "../../Components/images/chat.png";
import teleport from "../../Chat/images/teleport.svg";
import { userIsConnected } from "../../Stores/MenuStore";
import { parseTimeZone, TIMEZONE_VARIABLE } from "../../Utils/LocalTime";
import { ACTIVITY_VARIABLE, parseSharedActivity } from "../../Integrations/SharedActivitySync";
import RequiresLoginForChatModal from "../../Chat/Components/RequiresLoginForChatModal.svelte";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isFreeStatus } from "../../Social/AvailabilityWatcher";
import { IconBell, IconCamera, IconHandStop, IconUserPlus } from "@wa-icons";
import { modals } from "@wa-modals";

export enum RemotePlayerEvent {
    Clicked = "Clicked",
}

/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character implements ActivatableInterface {
    public readonly userId: number;
    public readonly userUuid: string;
    public readonly activationRadius: number;

    private visitCardUrl: string | null;
    private pathFollowingUpdateCallback: (time: number, delta: number) => void;

    constructor(
        userId: number,
        userUuid: string,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PositionMessage_Direction,
        moving: boolean,
        visitCardUrl: string | null,
        companionTexturePromise: CancelablePromise<string> | undefined,
        activationRadius?: number,
        private chatID: string | undefined = undefined,
        sayMessage?: SayMessage,
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companionTexturePromise);

        //set data
        this.userId = userId;
        this.userUuid = userUuid;
        this.visitCardUrl = visitCardUrl;
        this.setClickable(this.getDefaultWokaMenuActions().length > 0);
        this.activationRadius = activationRadius ?? 76;

        if (sayMessage) {
            this.say(sayMessage.message, sayMessage.type);
        }

        this.bindEventHandlers();
        this.pathFollowingUpdateCallback = (_time: number, delta: number) => this.followPath(delta);
    }

    public updatePosition(position: PositionMessage): void {
        this.stopMoveTo();
        if (position.moving && this.getSeatPose()) {
            // Walking away from their seat: they stood up (the room confirms it a moment later).
            this.setSeatPose(undefined);
        }
        this.playAnimation(position.direction, position.moving);
        this.setPosition(position.x, position.y);

        if (this.companion) {
            this.companion.setTarget(position.x, position.y, position.direction);
        }
    }

    /**
     * Move to a position using pathfinding (same logic as GameScene.moveTo).
     * Uses the PathfindingManager to find a path and follows it with proper walking animation.
     * Named moveToPosition to avoid conflict with Phaser Container.moveTo.
     * @param position Target position in game pixels
     * @param tryFindingNearestAvailable If true, finds nearest available tile when exact target is blocked
     * @param speed Walking speed (default: WOKA_SPEED)
     * @returns Promise that resolves with final position and whether the move was cancelled
     */
    public async moveToPosition(
        position: { x: number; y: number },
        tryFindingNearestAvailable = false,
        speed: number | undefined = undefined,
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        this.stopMoveTo();

        const gameScene = this.scene;
        const path = await gameScene
            .getPathfindingManager()
            .findPathFromGameCoordinates({ x: this.x, y: this.y }, position, tryFindingNearestAvailable);

        if (path.length === 0) {
            throw new Error("No path found");
        }

        const pathFollowingPromise = this.setPathToFollow(path, speed ?? WOKA_SPEED);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.pathFollowingUpdateCallback);
        return pathFollowingPromise;
    }

    /**
     * Stop any ongoing moveTo.
     */
    public stopMoveTo(): void {
        if (this.isFollowingPath()) {
            this.finishFollowingPath(true);
        }
    }

    public finishFollowingPath(cancelled = false, blocked = false): void {
        super.finishFollowingPath(cancelled, blocked);
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.pathFollowingUpdateCallback);
        this.scene.markDirty();
    }

    public getVisitCardUrl(): string | null {
        return this.visitCardUrl;
    }

    public setChatID(chatID: string | undefined): void {
        this.chatID = chatID;
        this.setClickable(this.getDefaultWokaMenuActions().length > 0);
    }

    public registerWokaMenuAction(action: WokaMenuAction): void {
        wokaMenuStore.addAction({
            ...action,
            priority: action.priority ?? 0,
            callback: () => {
                action.callback();
                wokaMenuStore.removeRemotePlayer(this.userUuid);
            },
        });
    }

    public unregisterWokaMenuAction(actionName: string) {
        wokaMenuStore.removeAction(actionName);
    }

    public activate(): void {
        this.toggleActionsMenu();
    }

    public deactivate(): void {
        wokaMenuStore.removeRemotePlayer(this.userUuid);
    }

    public destroy(): void {
        this.stopMoveTo();
        wokaMenuStore.removeRemotePlayer(this.userUuid);
        super.destroy();
    }

    public isActivatable(): boolean {
        return this.isClickable();
    }

    private toggleActionsMenu(): void {
        // Track the open woka menu action
        analyticsClient.trackAdminEvent("user.woka_menu.opened");

        // Close the woka menu if it is already open by the same remote player
        const wokaMenuStoreValue = get(wokaMenuStore);
        if (
            wokaMenuStoreValue?.userUuid !== undefined &&
            wokaMenuStoreValue.userUuid !== "" &&
            wokaMenuStoreValue.userUuid === this.userUuid
        ) {
            wokaMenuStore.removeRemotePlayer(this.userUuid);
            return;
        }

        // Initialize the woka menu
        const variables = this.scene.getRemotePlayersRepository().getPlayers().get(this.userId)?.variables;
        wokaMenuStore.initialize(
            this.playerName,
            this.userId,
            this.userUuid,
            this.visitCardUrl ?? undefined,
            parseTimeZone(variables?.get(TIMEZONE_VARIABLE)),
            parseSharedActivity(variables?.get(ACTIVITY_VARIABLE)),
        );

        // Add the default actions to the woka menu
        for (const action of this.getDefaultWokaMenuActions()) {
            wokaMenuStore.addAction(action);
        }

        // Send the remote player clicked event to the iframe listener
        const userFound = this.scene.getRemotePlayersRepository().getPlayers().get(this.userId);
        if (!userFound) {
            console.error("Undefined clicked player!");
            return;
        }

        // Send the remote player clicked event to the iframe listener
        iframeListener.sendRemotePlayerClickedEvent(userFound);
    }

    private getDefaultWokaMenuActions(): WokaMenuAction[] {
        const actions: WokaMenuAction[] = [];
        actions.push({
            actionName: get(LL).report.moderate.action(),
            protected: true,
            priority: -1,
            style: "is-error bg-white/10 hover:bg-white/30 text-red-500",
            testId: "wokamenu-block-user-button",
            callback: () => {
                // Track the report user action
                analyticsClient.trackAdminEvent("user.report.clicked");

                openModerationModal(this.userUuid, this.playerName);
            },
            actionIcon: banIcon,
        });
        if (!blackListManager.isBlackListed(this.userUuid)) {
            const waveManager = this.scene.waveManager;
            if (waveManager) {
                actions.push({
                    actionName: get(LL).social.wave.action(),
                    protected: false,
                    priority: 5,
                    style: "bg-white/10 hover:bg-white/30",
                    testId: "wokamenu-wave-button",
                    callback: () => {
                        waveManager.wave({ uuid: this.userUuid, name: this.playerName }).catch((error) => {
                            console.error(error);
                            Sentry.captureException(error);
                        });
                    },
                    actionIcon: IconHandStop,
                });
            }
            // "Tell me when free", for somebody busy, away or in a meeting (or to stop waiting for them).
            const availabilityWatcher = this.scene.availabilityWatcher;
            const status = this.scene.getRemotePlayersRepository().getPlayers().get(this.userId)?.availabilityStatus;
            const waiting = availabilityWatcher?.isWatching(this.userUuid) ?? false;
            if (availabilityWatcher && (waiting || (status !== undefined && !isFreeStatus(status)))) {
                actions.push({
                    actionName: waiting ? get(LL).social.notifyWhenFree.stop() : get(LL).social.notifyWhenFree.action(),
                    protected: false,
                    priority: 5,
                    style: "bg-white/10 hover:bg-white/30",
                    testId: "wokamenu-notify-when-free-button",
                    callback: () => {
                        if (waiting) availabilityWatcher.unwatch(this.userUuid);
                        else availabilityWatcher.watch({ uuid: this.userUuid, name: this.playerName });
                    },
                    actionIcon: IconBell,
                });
            }
            const goToManager = this.scene.goToManager;
            if (goToManager) {
                actions.push({
                    actionName: get(LL).social.goTo.action(),
                    protected: false,
                    priority: 4,
                    style: "bg-white/10 hover:bg-white/30",
                    testId: "wokamenu-go-to-button",
                    callback: () => {
                        analyticsClient.trackAdminEvent("user.go_to_clicked");
                        goToManager
                            .goTo({
                                uuid: this.userUuid,
                                name: this.playerName,
                                playUri: this.scene.roomUrl,
                                userId: this.userId,
                            })
                            .catch((error) => {
                                console.error(error);
                                Sentry.captureException(error);
                            });
                    },
                    actionIcon: teleport,
                });
            }
            actions.push({
                actionName: get(LL).chat.userList.TalkTo(),
                protected: false,
                priority: 1,
                style: "bg-white/10 hover:bg-white/30",
                callback: () => {
                    // Track the talk to user action
                    analyticsClient.trackAdminEvent("user.go_to_clicked");

                    if (this.scene.connection != undefined)
                        this.scene.connection.emitAskPosition(
                            this.userUuid,
                            this.scene.roomUrl,
                            AskPositionMessage_AskType.MOVE,
                            this.userId,
                        );
                },
                actionIcon: IconCamera,
            });
        }
        if (this.chatID != undefined) {
            actions.push({
                actionName: get(LL).chat.userList.sendMessage(),
                protected: false,
                priority: 2,
                style: "bg-white/10 hover:bg-white/30",
                callback: () => {
                    // Track the opened chat action
                    analyticsClient.trackAdminEvent("chat.opened");

                    if (!get(userIsConnected)) {
                        modals.open(RequiresLoginForChatModal);
                        return;
                    }

                    openDirectChatRoom(this.chatID!).catch((error) => {
                        console.error("Error opening direct chat room:", error);
                        Sentry.captureException(error, {
                            extra: {
                                userId: this.userUuid,
                                chatId: this.chatID!,
                                playUri: this.scene.roomUrl,
                                username: this.playerName,
                            },
                        });
                    });
                },
                actionIcon: chat,
            });
        }
        // Add new action invite user to meet me
        actions.push({
            actionName: get(LL).chat.userList.invite(),
            protected: false,
            priority: 3,
            style: "bg-white/10 hover:bg-white/30",
            callback: () => {
                const sent = this.scene.inviteManager?.requestMeetingInvitation(this.userUuid, this.userId);
                if (sent) {
                    try {
                        this.scene.playSound("meeting-in", 0.15);
                    } catch (error) {
                        Sentry.captureException(error);
                    }
                }
            },
            actionIcon: IconUserPlus,
        });

        return actions;
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
            if (event.downElement.nodeName === "CANVAS" && event.leftButtonDown()) {
                this.emit(RemotePlayerEvent.Clicked);
            }
        });
    }
}
