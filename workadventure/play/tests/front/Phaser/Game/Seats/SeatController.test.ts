import type { PersonalAreaPropertyData, Seat, SeatedState } from "@workadventure/map-editor";
import { PositionMessage_Direction, SitAnswer_Status } from "@workadventure/messages";
import type { SitAnswer } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import type { SeatControllerHost, SeatPrompt } from "../../../../../src/front/Phaser/Game/Seats/SeatController";
import { SeatController } from "../../../../../src/front/Phaser/Game/Seats/SeatController";
import type { SeatPose } from "../../../../../src/front/Phaser/Game/Seats/SeatPose";
import { seatPoseFor, toPlayerDirection } from "../../../../../src/front/Phaser/Game/Seats/SeatPose";

const LOBBY_SOFA: Seat = { id: "entity:sofa", x: 500, y: 500, direction: "Down" };
const ALICE_CHAIR: Seat = { id: "entity:chair", x: 146, y: 166, direction: "Up", deskAreaId: "desk-1" };

function desk(overrides: Partial<PersonalAreaPropertyData> = {}): PersonalAreaPropertyData {
    return {
        id: "p",
        type: "personalAreaPropertyData",
        accessClaimMode: "dynamic",
        allowedTags: [],
        ownerId: "alice",
        ...overrides,
    };
}

class FakeHost implements SeatControllerHost {
    public positionNow = { x: 500, y: 520 };
    public uuid: string | undefined = "alice";
    public desks = new Map<string, PersonalAreaPropertyData>([["desk-1", desk()]]);
    public occupants = new Map<string, string>();
    public seatList: Seat[] = [LOBBY_SOFA, ALICE_CHAIR];
    public answers: SitAnswer[] = [];
    public walks: { x: number; y: number }[] = [];
    public walkCancelled = false;
    public placed: SeatedState[] = [];
    public poses: (SeatPose | undefined)[] = [];
    public prompts: (SeatPrompt | undefined)[] = [];
    public seatChanges: (SeatedState | undefined)[] = [];
    public refusals: string[] = [];
    public queries: string[] = [];

    seats = () => this.seatList;
    desk = (areaId: string) => this.desks.get(areaId);
    me = () => ({ uuid: this.uuid, tags: [] });
    position = () => this.positionNow;
    occupantOf = (seatId: string) => this.occupants.get(seatId);
    querySit = vi.fn((seatId: string) => {
        this.queries.push(seatId);
        return Promise.resolve(this.answers.shift() ?? { status: SitAnswer_Status.STOOD_UP, seat: undefined });
    });
    walkTo = (point: { x: number; y: number }) => {
        this.walks.push(point);
        if (!this.walkCancelled) this.positionNow = { ...point };
        return Promise.resolve({ cancelled: this.walkCancelled });
    };
    placeOnSeat = (state: SeatedState) => {
        this.placed.push(state);
        this.positionNow = { x: state.x, y: state.y };
    };
    setPose = (pose: SeatPose | undefined) => this.poses.push(pose);
    showPrompt = (prompt: SeatPrompt | undefined) => this.prompts.push(prompt);
    onSeatChanged = (state: SeatedState | undefined) => this.seatChanges.push(state);
    refused = (reason: string) => this.refusals.push(reason);
    now = () => Date.parse("2026-10-24T10:00:00Z");
}

const seated = (seat: Seat): SitAnswer => ({
    status: SitAnswer_Status.SEATED,
    seat: {
        seatId: seat.id,
        x: seat.x,
        y: seat.y,
        direction: seat.direction,
        deskAreaId: seat.deskAreaId ?? "",
    },
});

describe("SeatPose", () => {
    it("faces the way of the seat, behind the chair when seen from behind and in front of it otherwise", () => {
        expect(toPlayerDirection("Left")).toBe(PositionMessage_Direction.LEFT);
        expect(seatPoseFor("Up")).toMatchObject({ direction: PositionMessage_Direction.UP });
        expect(seatPoseFor("Up").depthOffset).toBeLessThan(0);
        for (const direction of ["Down", "Left", "Right"] as const) {
            expect(seatPoseFor(direction).depthOffset).toBeGreaterThan(0);
            expect(seatPoseFor(direction).direction).toBe(toPlayerDirection(direction));
        }
        // The legs are cut off whatever the way.
        expect(seatPoseFor("Down").cropBottom).toBeGreaterThan(0);
    });
});

describe("SeatController", () => {
    it("offers to sit on the free seat next to the player, and nothing elsewhere", () => {
        const host = new FakeHost();
        const controller = new SeatController(host);

        controller.refreshPrompt();
        expect(host.prompts).toEqual([{ kind: "sit", seat: LOBBY_SOFA }]);

        host.positionNow = { x: 900, y: 900 };
        controller.refreshPrompt();
        controller.refreshPrompt();
        expect(host.prompts).toEqual([{ kind: "sit", seat: LOBBY_SOFA }, undefined]);
    });

    it("does not offer a seat that someone else sits on, nor the chair of somebody else's desk", () => {
        const host = new FakeHost();
        host.uuid = "bob";
        host.occupants.set(LOBBY_SOFA.id, "carol");
        const controller = new SeatController(host);

        controller.refreshPrompt();
        host.positionNow = { x: 146, y: 170 };
        controller.refreshPrompt();

        expect(host.prompts).toEqual([]);
    });

    it("sits right away on a seat next to the player: placed on it, posed, and the room asked", async () => {
        const host = new FakeHost();
        host.answers.push(seated(LOBBY_SOFA));
        const controller = new SeatController(host);

        await expect(controller.sit(LOBBY_SOFA.id)).resolves.toBe(true);

        expect(host.walks).toEqual([]);
        expect(host.placed).toEqual([{ seatId: LOBBY_SOFA.id, x: 500, y: 500, direction: "Down" }]);
        expect(host.queries).toEqual([LOBBY_SOFA.id]);
        expect(host.poses.at(-1)).toEqual(seatPoseFor("Down"));
        expect(controller.current?.seatId).toBe(LOBBY_SOFA.id);
        expect(host.prompts.at(-1)).toEqual({ kind: "stand" });
        expect(host.seatChanges.at(-1)?.seatId).toBe(LOBBY_SOFA.id);
    });

    it("walks to a seat that is further away before sitting, and gives up if the walk is cancelled", async () => {
        const host = new FakeHost();
        host.positionNow = { x: 100, y: 600 };
        host.answers.push(seated(ALICE_CHAIR));
        const controller = new SeatController(host);

        await expect(controller.sit(ALICE_CHAIR.id)).resolves.toBe(true);
        expect(host.walks).toEqual([{ x: ALICE_CHAIR.x, y: ALICE_CHAIR.y }]);

        const cancelled = new FakeHost();
        cancelled.positionNow = { x: 100, y: 600 };
        cancelled.walkCancelled = true;
        const other = new SeatController(cancelled);
        await expect(other.sit(ALICE_CHAIR.id)).resolves.toBe(false);
        expect(cancelled.queries).toEqual([]);
        expect(cancelled.poses).toEqual([]);
    });

    it("explains a refusal from the room and stays standing", async () => {
        const host = new FakeHost();
        host.answers.push({ status: SitAnswer_Status.SEAT_TAKEN, seat: undefined });
        const controller = new SeatController(host);

        await expect(controller.sit(LOBBY_SOFA.id)).resolves.toBe(false);

        expect(host.refusals).toEqual(["SEAT_TAKEN"]);
        expect(controller.current).toBeUndefined();
        expect(host.poses).toEqual([]);
    });

    it("refuses at once what the room would refuse, without asking it", async () => {
        const host = new FakeHost();
        host.uuid = "bob";
        host.positionNow = { x: 146, y: 170 };
        const controller = new SeatController(host);

        await expect(controller.sit(ALICE_CHAIR.id)).resolves.toBe(false);

        expect(host.refusals).toEqual(["DESK_TAKEN"]);
        expect(host.queries).toEqual([]);
    });

    it("reports an error when the room cannot be asked", async () => {
        const host = new FakeHost();
        host.querySit.mockRejectedValueOnce(new Error("socket closed"));
        const controller = new SeatController(host);
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(controller.sit(LOBBY_SOFA.id)).resolves.toBe(false);
        expect(host.refusals).toEqual(["ERROR"]);
    });

    it("stands up when the player walks away, and tells the room", async () => {
        const host = new FakeHost();
        host.answers.push(seated(LOBBY_SOFA));
        const controller = new SeatController(host);
        await controller.sit(LOBBY_SOFA.id);

        controller.onPlayerStartedMoving();

        expect(controller.current).toBeUndefined();
        expect(host.poses.at(-1)).toBeUndefined();
        expect(host.queries).toEqual([LOBBY_SOFA.id, ""]);
        expect(host.seatChanges.at(-1)).toBeUndefined();
    });

    it("follows the room when it stands the player up (the desk was given to someone else)", async () => {
        const host = new FakeHost();
        host.answers.push(seated(LOBBY_SOFA));
        const controller = new SeatController(host);
        await controller.sit(LOBBY_SOFA.id);

        controller.onServerSeat(null);

        expect(controller.current).toBeUndefined();
        expect(host.poses.at(-1)).toBeUndefined();
        // The room already knows: nothing to tell it.
        expect(host.queries).toEqual([LOBBY_SOFA.id]);
    });

    it("follows the room when it says the player sits somewhere", () => {
        const host = new FakeHost();
        const controller = new SeatController(host);

        controller.onServerSeat({ seatId: LOBBY_SOFA.id, x: 500, y: 500, direction: "Down" });

        expect(controller.current?.seatId).toBe(LOBBY_SOFA.id);
        expect(host.placed).toHaveLength(1);
        expect(host.poses.at(-1)).toEqual(seatPoseFor("Down"));
        controller.onServerSeat("garbage");
        expect(controller.current).toBeUndefined();
    });

    it("asks for one seat at a time", async () => {
        const host = new FakeHost();
        let release: (answer: SitAnswer) => void = () => {};
        host.querySit.mockImplementationOnce(
            (seatId: string) =>
                new Promise<SitAnswer>((resolve) => {
                    host.queries.push(seatId);
                    release = resolve;
                }),
        );
        const controller = new SeatController(host);

        const first = controller.sit(LOBBY_SOFA.id);
        await expect(controller.sit(LOBBY_SOFA.id)).resolves.toBe(false);
        release(seated(LOBBY_SOFA));
        await expect(first).resolves.toBe(true);
        expect(host.queries).toEqual([LOBBY_SOFA.id]);
    });
});
