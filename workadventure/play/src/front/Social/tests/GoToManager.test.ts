import { describe, expect, it, vi } from "vitest";
import type { GetUserPositionAnswer } from "@workadventure/messages";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { GoToFeedback, GoToScene, VisiblePlayer } from "../GoToManager";
import { GoToManager } from "../GoToManager";

const TILE = 32;
const ROOM_URL = "/_/global/maps.example.com/office.tmj";

/** Pixel position of the center of a tile. */
const at = (x: number, y: number) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

function createScene(options: {
    map: string[];
    visiblePlayers?: VisiblePlayer[];
    serverPosition?: GetUserPositionAnswer | Error;
    forbidden?: (position: { x: number; y: number }) => boolean;
}) {
    const grid = options.map.map((row) => [...row].map((cell) => (cell === "#" ? 1 : 0)));
    const teleportCurrentPlayer = vi.fn<GoToScene["teleportCurrentPlayer"]>();
    const goToUserOnOtherMap = vi.fn<GoToScene["goToUserOnOtherMap"]>();
    const queryUserPosition = vi.fn<GoToScene["queryUserPosition"]>(() => {
        const answer = options.serverPosition ?? {};
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    });
    const scene: GoToScene = {
        roomUrl: ROOM_URL,
        getVisiblePlayers: () => options.visiblePlayers ?? [],
        queryUserPosition,
        getCollisionGrid: () => grid,
        getTileDimensions: () => ({ width: TILE, height: TILE }),
        isPositionAllowed: (position) => !(options.forbidden?.(position) ?? false),
        teleportCurrentPlayer,
        goToUserOnOtherMap,
    };
    const feedback: GoToFeedback = { notFound: vi.fn(), noFreeSpot: vi.fn(), failed: vi.fn() };
    return {
        manager: new GoToManager(scene, feedback),
        teleportCurrentPlayer,
        goToUserOnOtherMap,
        queryUserPosition,
        feedback,
    };
}

const bob = { uuid: "bob", name: "Bob", playUri: ROOM_URL };

describe("GoToManager", () => {
    it("teleports in front of a visible player, facing them, without asking the server", async () => {
        const { manager, teleportCurrentPlayer, queryUserPosition } = createScene({
            map: [".....", ".....", "....."],
            visiblePlayers: [{ userId: 2, userUuid: "bob", ...at(2, 1), direction: PositionMessage_Direction.DOWN }],
        });

        await manager.goTo(bob);

        const landing = at(2, 2);
        expect(teleportCurrentPlayer).toHaveBeenCalledWith(landing.x, landing.y, PositionMessage_Direction.UP);
        expect(queryUserPosition).not.toHaveBeenCalled();
    });

    it("asks the server where an off-screen player stands", async () => {
        const { manager, teleportCurrentPlayer, queryUserPosition } = createScene({
            map: [".....", ".....", "....."],
            serverPosition: {
                position: { ...at(3, 1), direction: PositionMessage_Direction.LEFT, moving: false },
                userId: 9,
            },
        });

        await manager.goTo({ ...bob, userId: 9 });

        expect(queryUserPosition).toHaveBeenCalledWith("bob", 9);
        const landing = at(2, 1);
        expect(teleportCurrentPlayer).toHaveBeenCalledWith(landing.x, landing.y, PositionMessage_Direction.RIGHT);
    });

    it("does not land on another player, nor in a forbidden area", async () => {
        const { manager, teleportCurrentPlayer } = createScene({
            map: ["#####", "#...#", "#####"],
            visiblePlayers: [
                { userId: 2, userUuid: "bob", ...at(2, 1), direction: PositionMessage_Direction.LEFT },
                { userId: 3, userUuid: "carol", ...at(1, 1), direction: PositionMessage_Direction.RIGHT },
            ],
        });

        await manager.goTo(bob);

        const landing = at(3, 1);
        expect(teleportCurrentPlayer).toHaveBeenCalledWith(landing.x, landing.y, PositionMessage_Direction.LEFT);
    });

    it("tells the user when there is no room next to the target", async () => {
        const { manager, teleportCurrentPlayer, feedback } = createScene({
            map: ["###", "#.#", "###"],
            visiblePlayers: [{ userId: 2, userUuid: "bob", ...at(1, 1), direction: PositionMessage_Direction.DOWN }],
        });

        await manager.goTo(bob);

        expect(teleportCurrentPlayer).not.toHaveBeenCalled();
        expect(feedback.noFreeSpot).toHaveBeenCalledWith(bob);
    });

    it("refuses tiles inside an area the user may not enter", async () => {
        const { manager, teleportCurrentPlayer } = createScene({
            map: [".....", "....."],
            visiblePlayers: [{ userId: 2, userUuid: "bob", ...at(2, 0), direction: PositionMessage_Direction.LEFT }],
            // Everything on the left of Bob is a private area.
            forbidden: (position) => position.x < 2 * TILE,
        });

        await manager.goTo(bob);

        const call = teleportCurrentPlayer.mock.calls[0];
        expect(call[0]).toBeGreaterThanOrEqual(2 * TILE);
    });

    it("tells the user when the target left the map", async () => {
        const { manager, teleportCurrentPlayer, feedback } = createScene({ map: ["..."], serverPosition: {} });

        await manager.goTo(bob);

        expect(teleportCurrentPlayer).not.toHaveBeenCalled();
        expect(feedback.notFound).toHaveBeenCalledWith(bob);
    });

    it("reports a failed lookup", async () => {
        const { manager, feedback } = createScene({ map: ["..."], serverPosition: new Error("timeout") });

        await manager.goTo(bob);

        expect(feedback.failed).toHaveBeenCalledWith(bob);
    });

    it("leaves for the target's map when they are on another one", async () => {
        const { manager, goToUserOnOtherMap, teleportCurrentPlayer } = createScene({ map: ["..."] });

        await manager.goTo({ ...bob, playUri: "/_/global/maps.example.com/garden.tmj" });

        expect(goToUserOnOtherMap).toHaveBeenCalledWith("/_/global/maps.example.com/garden.tmj", "bob");
        expect(teleportCurrentPlayer).not.toHaveBeenCalled();
    });

    it("does nothing once destroyed while waiting for the server", async () => {
        const { manager, teleportCurrentPlayer, feedback } = createScene({
            map: ["....."],
            serverPosition: {
                position: { ...at(2, 0), direction: PositionMessage_Direction.LEFT, moving: false },
                userId: 2,
            },
        });

        const pending = manager.goTo(bob);
        manager.destroy();
        await pending;

        expect(teleportCurrentPlayer).not.toHaveBeenCalled();
        expect(feedback.notFound).not.toHaveBeenCalled();
    });
});
