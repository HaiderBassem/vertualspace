import { describe, expect, it } from "vitest";
import { PositionMessage_Direction } from "@workadventure/messages";
import { directionTowards, findLandingTile } from "../findLandingTile";

/**
 * Builds a collision grid from a drawing: "#" is a wall, "E" an exit, "." a walkable tile, "T" the target
 * (walkable). Returns the grid and the target's tile.
 */
function parseMap(rows: string[]) {
    let target = { x: -1, y: -1 };
    const grid = rows.map((row, y) =>
        [...row].map((cell, x) => {
            if (cell === "T") {
                target = { x, y };
            }
            if (cell === "#") return 1;
            if (cell === "E") return 2;
            return 0;
        }),
    );
    return { grid, target };
}

describe("findLandingTile", () => {
    it("lands in front of the target, so that both face each other", () => {
        const { grid, target } = parseMap([".....", ".....", "..T..", ".....", "....."]);

        expect(findLandingTile(grid, target, { targetDirection: PositionMessage_Direction.LEFT })).toEqual({
            x: 1,
            y: 2,
        });
        expect(findLandingTile(grid, target, { targetDirection: PositionMessage_Direction.UP })).toEqual({
            x: 2,
            y: 1,
        });
    });

    it("prefers a tile beside the target to a corner", () => {
        const { grid, target } = parseMap(["...", "#T#", "..."]);

        // Facing a wall: the tiles below and above come before the diagonals.
        expect(findLandingTile(grid, target, { targetDirection: PositionMessage_Direction.RIGHT })).toEqual({
            x: 1,
            y: 2,
        });
    });

    it("never lands on the other side of a wall, even when that tile is closer", () => {
        // The target faces a wall. Behind it, at 2 tiles, another room. On the target's side, the 2 tiles next to
        // them are taken: the closest free tile they can walk to is 3 tiles away.
        const { grid, target } = parseMap(["########", "#.#T...#", "########"]);
        const taken = new Set(["4,1", "5,1"]);

        const tile = findLandingTile(grid, target, {
            targetDirection: PositionMessage_Direction.LEFT,
            isAcceptable: (t) => !taken.has(`${t.x},${t.y}`),
        });

        expect(tile).toEqual({ x: 6, y: 1 });
    });

    it("does not squeeze between two wall corners", () => {
        const { grid, target } = parseMap(["#.", "T#"]);

        // (1, 0) is diagonal to the target, but walls block both ways around the corner.
        expect(findLandingTile(grid, target)).toBeUndefined();
    });

    it("walks around taken tiles to find a free one", () => {
        const { grid, target } = parseMap(["#####", "#...#", "#.T.#", "#...#", "#####"]);
        const taken = new Set(["1,1", "2,1", "3,1", "1,2", "3,2", "1,3", "2,3"]);

        const tile = findLandingTile(grid, target, { isAcceptable: (t) => !taken.has(`${t.x},${t.y}`) });

        expect(tile).toEqual({ x: 3, y: 3 });
    });

    it("goes further when every neighbour is taken, within the allowed steps", () => {
        const { grid, target } = parseMap([".....", ".....", "..T..", ".....", "....."]);
        const isNeighbour = (t: { x: number; y: number }) => Math.abs(t.x - 2) <= 1 && Math.abs(t.y - 2) <= 1;

        const tile = findLandingTile(grid, target, { isAcceptable: (t) => !isNeighbour(t) });
        expect(tile).toBeDefined();
        expect(tile && isNeighbour(tile)).toBe(false);

        expect(findLandingTile(grid, target, { isAcceptable: (t) => !isNeighbour(t), maxSteps: 1 })).toBeUndefined();
    });

    it("does not land on an exit, which would send the user to another map", () => {
        const { grid, target } = parseMap(["###", "ETE", "#.#"]);

        expect(findLandingTile(grid, target, { targetDirection: PositionMessage_Direction.LEFT })).toEqual({
            x: 1,
            y: 2,
        });
    });

    it("finds nothing next to somebody locked away", () => {
        const { grid, target } = parseMap(["#####", "#####", "##T##", "#####", "....."]);

        expect(findLandingTile(grid, target)).toBeUndefined();
    });

    it("stays within the map", () => {
        const { grid, target } = parseMap(["T#", "##"]);

        expect(findLandingTile(grid, target)).toBeUndefined();
    });
});

describe("directionTowards", () => {
    it("faces the target", () => {
        expect(directionTowards({ x: 1, y: 2 }, { x: 2, y: 2 })).toBe(PositionMessage_Direction.RIGHT);
        expect(directionTowards({ x: 3, y: 2 }, { x: 2, y: 2 })).toBe(PositionMessage_Direction.LEFT);
        expect(directionTowards({ x: 2, y: 1 }, { x: 2, y: 2 })).toBe(PositionMessage_Direction.DOWN);
        expect(directionTowards({ x: 2, y: 3 }, { x: 2, y: 2 })).toBe(PositionMessage_Direction.UP);
    });
});
