import * as Sentry from "@sentry/svelte";
import type { GetUserPositionAnswer, PositionMessage_Direction } from "@workadventure/messages";
import type { TilePosition } from "./findLandingTile";
import { directionTowards, findLandingTile } from "./findLandingTile";

/** The person to go to. */
export interface GoToTarget {
    uuid: string;
    name: string;
    /** The map they are on. Undefined when unknown: the current map is assumed. */
    playUri: string | undefined;
    /** Their connection in this room, when known (somebody connected twice has two). */
    userId?: number;
}

/** A player whose sprite is on the screen. */
export interface VisiblePlayer {
    userId: number;
    userUuid: string;
    x: number;
    y: number;
    direction: PositionMessage_Direction;
}

/** What "Go to" needs from the game scene. */
export interface GoToScene {
    readonly roomUrl: string;
    getVisiblePlayers(): Iterable<VisiblePlayer>;
    queryUserPosition(userUuid: string, userId?: number): Promise<GetUserPositionAnswer>;
    /** The collision grid, indexed [y][x] (see GameMapFrontWrapper.getCollisionGrid). */
    getCollisionGrid(): readonly (readonly number[])[];
    getTileDimensions(): { width: number; height: number };
    /** False inside an area the user may not enter. */
    isPositionAllowed(position: { x: number; y: number }): boolean;
    teleportCurrentPlayer(x: number, y: number, direction: PositionMessage_Direction): void;
    /** Leaves for another map and walks to the user there (the existing cross-map teleport). */
    goToUserOnOtherMap(playUri: string, userUuid: string): void;
}

export interface GoToFeedback {
    /** The target is not on this map anymore. */
    notFound: (target: GoToTarget) => void;
    /** Every tile around the target is a wall, taken or forbidden. */
    noFreeSpot: (target: GoToTarget) => void;
    failed: (target: GoToTarget) => void;
}

/**
 * "Go to": moves the user instantly next to somebody, on a free walkable tile on their side of the walls, facing
 * them. On another map, leaves for that map as the existing teleport does. ("Talk to" is the walking version.)
 */
export class GoToManager {
    private destroyed = false;

    constructor(
        private readonly scene: GoToScene,
        private readonly feedback: GoToFeedback,
    ) {}

    /** Never rejects: failures are reported through the feedback. */
    public async goTo(target: GoToTarget): Promise<void> {
        if (target.playUri !== undefined && target.playUri !== this.scene.roomUrl) {
            this.scene.goToUserOnOtherMap(target.playUri, target.uuid);
            return;
        }

        let targetPosition: { x: number; y: number; direction: PositionMessage_Direction } | undefined;
        try {
            targetPosition = await this.locate(target);
        } catch (error) {
            if (this.destroyed) {
                return;
            }
            console.error("Failed to locate the user to go to", error);
            Sentry.captureException(error);
            this.feedback.failed(target);
            return;
        }
        if (this.destroyed) {
            return;
        }
        if (targetPosition === undefined) {
            this.feedback.notFound(target);
            return;
        }

        const { width, height } = this.scene.getTileDimensions();
        const toTile = (position: { x: number; y: number }): TilePosition => ({
            x: Math.floor(position.x / width),
            y: Math.floor(position.y / height),
        });
        const toCenter = (tile: TilePosition) => ({ x: (tile.x + 0.5) * width, y: (tile.y + 0.5) * height });

        const targetTile = toTile(targetPosition);
        const takenTiles = new Set<string>();
        for (const player of this.scene.getVisiblePlayers()) {
            const tile = toTile(player);
            takenTiles.add(`${tile.x},${tile.y}`);
        }

        const landingTile = findLandingTile(this.scene.getCollisionGrid(), targetTile, {
            targetDirection: targetPosition.direction,
            isAcceptable: (tile) =>
                !takenTiles.has(`${tile.x},${tile.y}`) && this.scene.isPositionAllowed(toCenter(tile)),
        });
        if (landingTile === undefined) {
            this.feedback.noFreeSpot(target);
            return;
        }

        const landing = toCenter(landingTile);
        this.scene.teleportCurrentPlayer(landing.x, landing.y, directionTowards(landingTile, targetTile));
    }

    public destroy(): void {
        this.destroyed = true;
    }

    /** Where the target stands: from their sprite when it is on the screen, from the server otherwise. */
    private async locate(
        target: GoToTarget,
    ): Promise<{ x: number; y: number; direction: PositionMessage_Direction } | undefined> {
        let visible: VisiblePlayer | undefined;
        for (const player of this.scene.getVisiblePlayers()) {
            if (player.userUuid !== target.uuid) {
                continue;
            }
            if (visible === undefined || player.userId === target.userId) {
                visible = player;
            }
        }
        if (visible !== undefined) {
            return { x: visible.x, y: visible.y, direction: visible.direction };
        }

        const answer = await this.scene.queryUserPosition(target.uuid, target.userId);
        if (answer.position === undefined) {
            return undefined;
        }
        return { x: answer.position.x, y: answer.position.y, direction: answer.position.direction };
    }
}
