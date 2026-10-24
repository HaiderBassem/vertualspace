import { PositionMessage_Direction } from "@workadventure/messages";
import { PathTileType } from "../Utils/PathfindingManager";

export interface TilePosition {
    x: number;
    y: number;
}

export interface FindLandingTileOptions {
    /** The direction the target faces: the tile in front of them is tried first, so that the two face each other. */
    targetDirection?: PositionMessage_Direction;
    /** Extra condition on the landing tile: an area the user may enter, a tile nobody stands on... */
    isAcceptable?: (tile: TilePosition) => boolean;
    /** How many steps away from the target the landing tile may be. Defaults to 4. */
    maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 4;

const CARDINAL_OFFSETS: Readonly<Record<PositionMessage_Direction, TilePosition | undefined>> = {
    [PositionMessage_Direction.UP]: { x: 0, y: -1 },
    [PositionMessage_Direction.RIGHT]: { x: 1, y: 0 },
    [PositionMessage_Direction.DOWN]: { x: 0, y: 1 },
    [PositionMessage_Direction.LEFT]: { x: -1, y: 0 },
    [PositionMessage_Direction.UNRECOGNIZED]: undefined,
};

// Cardinal neighbours come before the diagonal ones: standing beside someone feels closer than standing at a corner.
const NEIGHBOUR_OFFSETS: readonly TilePosition[] = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
];

function isInGrid(grid: readonly (readonly number[])[], tile: TilePosition): boolean {
    return tile.y >= 0 && tile.y < grid.length && tile.x >= 0 && tile.x < (grid[tile.y]?.length ?? 0);
}

/** A tile one can walk through. */
function isPassable(grid: readonly (readonly number[])[], tile: TilePosition): boolean {
    return isInGrid(grid, tile) && grid[tile.y][tile.x] !== PathTileType.Collider;
}

/** A tile one can stand on: walkable, and not an exit that would send the user to another map. */
function isLandable(grid: readonly (readonly number[])[], tile: TilePosition): boolean {
    return isPassable(grid, tile) && grid[tile.y][tile.x] !== PathTileType.Exit;
}

/**
 * Finds the tile to teleport to, to stand next to somebody: the closest free tile, walking-wise, from the target.
 *
 * The search walks from the target's tile through walkable tiles only (no corner cutting, like the pathfinding),
 * so the tile found is on the target's side of any wall: never inside a wall, nor in the next room.
 *
 * @param grid The collision grid of the map (see GameMapFrontWrapper.getCollisionGrid), indexed [y][x].
 * @param target The tile the target stands on.
 * @returns The tile to land on, or undefined if there is none within options.maxSteps.
 */
export function findLandingTile(
    grid: readonly (readonly number[])[],
    target: TilePosition,
    options: FindLandingTileOptions = {},
): TilePosition | undefined {
    const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
    const isAcceptable = options.isAcceptable ?? (() => true);
    const preferred = options.targetDirection !== undefined ? CARDINAL_OFFSETS[options.targetDirection] : undefined;
    const offsets = preferred
        ? [preferred, ...NEIGHBOUR_OFFSETS.filter((offset) => offset.x !== preferred.x || offset.y !== preferred.y)]
        : NEIGHBOUR_OFFSETS;

    const key = (tile: TilePosition) => `${tile.x},${tile.y}`;
    const visited = new Set<string>([key(target)]);
    let frontier: TilePosition[] = [target];

    for (let step = 1; step <= maxSteps && frontier.length > 0; step++) {
        const next: TilePosition[] = [];
        for (const from of frontier) {
            for (const offset of offsets) {
                const tile = { x: from.x + offset.x, y: from.y + offset.y };
                if (visited.has(key(tile)) || !isPassable(grid, tile)) {
                    continue;
                }
                const isDiagonal = offset.x !== 0 && offset.y !== 0;
                if (
                    isDiagonal &&
                    (!isPassable(grid, { x: from.x + offset.x, y: from.y }) ||
                        !isPassable(grid, { x: from.x, y: from.y + offset.y }))
                ) {
                    // Squeezing between two walls' corners is not "next to" the target.
                    continue;
                }
                visited.add(key(tile));
                next.push(tile);
            }
        }
        // Tiles of this step are in order of preference: the first acceptable one wins.
        const landing = next.find((tile) => isLandable(grid, tile) && isAcceptable(tile));
        if (landing) {
            return landing;
        }
        frontier = next;
    }
    return undefined;
}

/** The direction to face, standing on `from`, to look at `to`. */
export function directionTowards(from: TilePosition, to: TilePosition): PositionMessage_Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? PositionMessage_Direction.RIGHT : PositionMessage_Direction.LEFT;
    }
    return dy > 0 ? PositionMessage_Direction.DOWN : PositionMessage_Direction.UP;
}
