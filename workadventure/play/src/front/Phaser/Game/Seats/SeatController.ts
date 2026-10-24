import type {
    PersonalAreaPropertyData,
    Seat,
    SeatedState,
    SitDenialReason,
    SitVerdict,
} from "@workadventure/map-editor";
import { evaluateSit, nearestSeat, parseSeatedState } from "@workadventure/map-editor";
import type { SitAnswer } from "@workadventure/messages";
import { SitAnswer_Status } from "@workadventure/messages";
import type { SeatPose } from "./SeatPose";
import { seatPoseFor } from "./SeatPose";

/** How close to a seat (between centres, in pixels) a player must stand to be offered to sit on it. */
export const SEAT_PROMPT_DISTANCE = 40;

/** Closer than this to a seat, the player sits down without walking first. */
export const SEAT_SNAP_DISTANCE = 40;

/** Why the player could not sit: the reasons of the room, or an error (the room could not be asked). */
export type SeatRefusal = SitDenialReason | "ERROR";

/** What the player is offered for the seat next to them. */
export type SeatPrompt = { kind: "sit"; seat: Seat } | { kind: "stand" };

/** What the seat controller needs from the game. */
export interface SeatControllerHost {
    /** The seats of the map, as they are now. */
    seats(): Seat[];
    /** The desk property of a desk of the map. */
    desk(areaId: string): PersonalAreaPropertyData | undefined;
    me(): { uuid: string | undefined; tags: readonly string[] };
    position(): { x: number; y: number };
    /** Who sits on a seat (their identifier), according to what the room told us of the other players. */
    occupantOf(seatId: string): string | undefined;
    querySit(seatId: string): Promise<SitAnswer>;
    /** Walks the player to a point; resolves when they arrive or the walk is cancelled (the player took over). */
    walkTo(point: { x: number; y: number }): Promise<{ cancelled: boolean }>;
    /** Puts the player right on the seat, facing its way (the room learns where the player is). */
    placeOnSeat(state: SeatedState): void;
    setPose(pose: SeatPose | undefined): void;
    /** Shows what the player can do with the seat next to them, or nothing (undefined). */
    showPrompt(prompt: SeatPrompt | undefined): void;
    /** The seat the player sits on changed (undefined: they stand). */
    onSeatChanged(state: SeatedState | undefined): void;
    refused(reason: SeatRefusal, seat: Seat): void;
    now(): number;
}

const REFUSALS: Partial<Record<SitAnswer_Status, SitDenialReason>> = {
    [SitAnswer_Status.SEAT_NOT_FOUND]: "SEAT_NOT_FOUND",
    [SitAnswer_Status.SEAT_TAKEN]: "SEAT_TAKEN",
    [SitAnswer_Status.TOO_FAR]: "TOO_FAR",
    [SitAnswer_Status.DESK_TAKEN]: "DESK_TAKEN",
    [SitAnswer_Status.DESK_RESERVED]: "DESK_RESERVED",
    [SitAnswer_Status.DESK_DISABLED]: "DESK_DISABLED",
    [SitAnswer_Status.DESK_NOT_ELIGIBLE]: "DESK_NOT_ELIGIBLE",
};

function toSeatedState(seat: Seat): SeatedState {
    return {
        seatId: seat.id,
        x: seat.x,
        y: seat.y,
        direction: seat.direction,
        ...(seat.deskAreaId !== undefined ? { deskAreaId: seat.deskAreaId } : {}),
    };
}

function samePrompt(a: SeatPrompt | undefined, b: SeatPrompt | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    if (a.kind === "stand" || b.kind === "stand") return a.kind === b.kind;
    return a.seat.id === b.seat.id;
}

/**
 * Sitting down and standing up, for the player of this browser. The room decides who sits where: this only asks, shows
 * the answer, and offers to sit when the player stands next to a seat they may use (or to stand up while they sit).
 */
export class SeatController {
    private seated: SeatedState | undefined;
    private pendingSeatId: string | undefined;
    private prompt: SeatPrompt | undefined;

    constructor(private readonly host: SeatControllerHost) {}

    /** Where the player sits, if they sit. */
    public get current(): SeatedState | undefined {
        return this.seated;
    }

    /** Whether the player may sit on a seat, as far as this browser knows (the room has the last word). */
    public verdictFor(seat: Seat): SitVerdict {
        const me = this.host.me();
        return evaluateSit({
            seat,
            desk: seat.deskAreaId !== undefined ? (this.host.desk(seat.deskAreaId) ?? null) : null,
            sitter: { uuid: me.uuid ?? "", tags: me.tags },
            occupantUuid: this.host.occupantOf(seat.id),
            now: this.host.now(),
        });
    }

    /** The closest seat next to the player that they may sit on, if any. */
    public seatNearby(): Seat | undefined {
        const usable = this.host.seats().filter((seat) => this.verdictFor(seat).allowed);
        return nearestSeat(usable, this.host.position(), SEAT_PROMPT_DISTANCE);
    }

    /** Updates what the player is offered, after they moved or the map or the other players changed. */
    public refreshPrompt(): void {
        let next: SeatPrompt | undefined;
        if (this.seated) {
            next = { kind: "stand" };
        } else if (this.pendingSeatId === undefined) {
            const seat = this.seatNearby();
            next = seat ? { kind: "sit", seat } : undefined;
        }
        if (!samePrompt(next, this.prompt)) {
            this.prompt = next;
            this.host.showPrompt(next);
        }
    }

    /**
     * Sits on a seat: walks to it when it is not right there, then asks the room. Resolves with whether the player now
     * sits on it.
     */
    public async sit(seatId: string): Promise<boolean> {
        const seat = this.host.seats().find((candidate) => candidate.id === seatId);
        if (!seat || this.pendingSeatId !== undefined) return false;
        if (this.seated?.seatId === seatId) return true;
        const verdict = this.verdictFor(seat);
        if (!verdict.allowed) {
            this.host.refused(verdict.reason, seat);
            return false;
        }

        this.pendingSeatId = seatId;
        this.refreshPrompt();
        try {
            const start = this.host.position();
            if (Math.hypot(start.x - seat.x, start.y - seat.y) > SEAT_SNAP_DISTANCE) {
                const walk = await this.host.walkTo({ x: seat.x, y: seat.y });
                if (walk.cancelled) return false;
                const arrival = this.host.position();
                if (Math.hypot(arrival.x - seat.x, arrival.y - seat.y) > SEAT_SNAP_DISTANCE * 2) {
                    // The seat could not be reached (behind a wall, in a locked room...).
                    this.host.refused("TOO_FAR", seat);
                    return false;
                }
            }

            if (this.seated) {
                // Moving to another seat: the room hears about the new one.
                this.setSeated(undefined);
            }
            this.host.placeOnSeat(toSeatedState(seat));
            const answer = await this.host.querySit(seat.id);
            if (answer.status === SitAnswer_Status.SEATED) {
                this.setSeated(toSeatedState(seat));
                return true;
            }
            this.host.refused(REFUSALS[answer.status] ?? "ERROR", seat);
            return false;
        } catch (error) {
            console.warn("Could not sit down", error);
            this.host.refused("ERROR", seat);
            return false;
        } finally {
            this.pendingSeatId = undefined;
            this.refreshPrompt();
        }
    }

    /** Sits on the seat next to the player, if there is one they may use. */
    public async sitNearby(): Promise<boolean> {
        const seat = this.seatNearby();
        return seat ? this.sit(seat.id) : false;
    }

    /** Stands up, and tells the room. */
    public stand(): void {
        if (!this.seated) return;
        this.setSeated(undefined);
        this.host.querySit("").catch((error) => console.warn("Could not tell the room that we stood up", error));
        this.refreshPrompt();
    }

    /** The player started to walk: whoever walks away from their seat stands up. */
    public onPlayerStartedMoving(): void {
        if (this.seated) this.stand();
    }

    /**
     * The room told this player where they sit, or that they stand (for instance because their desk was given to
     * somebody else, or the chair was removed).
     */
    public onServerSeat(value: unknown): void {
        const state = parseSeatedState(value);
        if (state === undefined) {
            if (this.seated && this.pendingSeatId === undefined) {
                this.setSeated(undefined);
                this.refreshPrompt();
            }
            return;
        }
        if (this.seated?.seatId !== state.seatId && this.pendingSeatId === undefined) {
            this.host.placeOnSeat(state);
            this.setSeated(state);
            this.refreshPrompt();
        }
    }

    private setSeated(state: SeatedState | undefined): void {
        this.seated = state;
        this.host.setPose(state ? seatPoseFor(state.direction) : undefined);
        this.host.onSeatChanged(state);
    }
}
