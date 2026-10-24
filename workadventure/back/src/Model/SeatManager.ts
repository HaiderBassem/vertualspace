import type { Seat, SeatedState, SitDenialReason, WAMFileFormat } from "@workadventure/map-editor";
import { evaluateSit, getDeskProperty, listSeats, SEAT_LEAVE_DISTANCE } from "@workadventure/map-editor";
import type { SitAnswer } from "@workadventure/messages";
import { SitAnswer_Status } from "@workadventure/messages";

/** What the seat manager needs to know of a player. */
export interface Sitter {
    readonly uuid: string;
    readonly tags: string[];
    getPosition(): { x: number; y: number };
}

/** What the seat manager needs from the room it keeps the seats of. */
export interface SeatRoom<U extends Sitter> {
    getWam(): WAMFileFormat | undefined;
    /** Tells everyone in the room (the player included) that the player now sits there, or stands (null). */
    publishSeat(user: U, state: SeatedState | null): void;
}

const DENIAL_STATUS: Record<SitDenialReason, SitAnswer_Status> = {
    SEAT_NOT_FOUND: SitAnswer_Status.SEAT_NOT_FOUND,
    SEAT_TAKEN: SitAnswer_Status.SEAT_TAKEN,
    TOO_FAR: SitAnswer_Status.TOO_FAR,
    DESK_TAKEN: SitAnswer_Status.DESK_TAKEN,
    DESK_RESERVED: SitAnswer_Status.DESK_RESERVED,
    DESK_DISABLED: SitAnswer_Status.DESK_DISABLED,
    DESK_NOT_ELIGIBLE: SitAnswer_Status.DESK_NOT_ELIGIBLE,
};

/**
 * Who sits where in a room. The room is the only judge: a player asks to sit, the room checks that the seat exists, that
 * the player is next to it, that its desk is for them and that nobody else sits there, and then tells everyone. Two
 * players asking for the same seat at the same time are answered one after the other, so only the first one sits.
 *
 * A seat is given back when its player stands up, walks away from it, leaves the room, or is no longer allowed to sit
 * there (the desk was given to someone else, the chair was removed...).
 */
export class SeatManager<U extends Sitter> {
    private readonly occupants = new Map<string, U>();
    private readonly seated = new Map<U, SeatedState>();

    constructor(
        private readonly room: SeatRoom<U>,
        private readonly now: () => number = () => Date.now(),
    ) {}

    /** Asks to sit on a seat, or to stand up when the seat id is empty. */
    public sit(user: U, seatId: string): SitAnswer {
        if (seatId === "") {
            this.stand(user);
            return { status: SitAnswer_Status.STOOD_UP, seat: undefined };
        }

        const wam = this.room.getWam();
        const seat = wam ? listSeats(wam.areas, Object.entries(wam.entities)).find((s) => s.id === seatId) : undefined;
        let occupant = this.occupants.get(seatId);
        // Someone whose time at this seat is over (the desk was booked for someone else from now on) gives it up.
        if (occupant !== undefined && occupant !== user && !this.mayStillSit(occupant, seat, wam)) {
            this.release(occupant, true);
            occupant = undefined;
        }
        const verdict = evaluateSit({
            seat,
            desk: this.deskOf(wam, seat?.deskAreaId),
            sitter: { uuid: user.uuid, tags: user.tags },
            occupantUuid: occupant !== undefined && occupant !== user ? occupant.uuid : undefined,
            position: user.getPosition(),
            now: this.now(),
        });
        if (!verdict.allowed || seat === undefined) {
            return {
                status: verdict.allowed ? SitAnswer_Status.SEAT_NOT_FOUND : DENIAL_STATUS[verdict.reason],
                seat: undefined,
            };
        }

        // Another connection of the same person sat there (an older tab): this one sits there now.
        if (occupant !== undefined && occupant !== user) {
            this.release(occupant, true);
        }
        // Moving from one seat to another: the new seat is announced below, no need to announce standing up.
        this.release(user, false);

        const state: SeatedState = {
            seatId: seat.id,
            x: seat.x,
            y: seat.y,
            direction: seat.direction,
            ...(seat.deskAreaId !== undefined ? { deskAreaId: seat.deskAreaId } : {}),
        };
        this.occupants.set(seat.id, user);
        this.seated.set(user, state);
        this.room.publishSeat(user, state);
        return {
            status: SitAnswer_Status.SEATED,
            seat: {
                seatId: state.seatId,
                x: state.x,
                y: state.y,
                direction: state.direction,
                deskAreaId: state.deskAreaId ?? "",
            },
        };
    }

    /** The player stands up (nothing happens if they were not sitting). */
    public stand(user: U): void {
        this.release(user, true);
    }

    /** The player left the room: their seat is free again. Others are told by the player leaving. */
    public onUserLeft(user: U): void {
        this.release(user, false);
    }

    /** The player moved: if they walked away from their seat, they stood up. */
    public onUserMoved(user: U): void {
        const state = this.seated.get(user);
        if (state === undefined) return;
        const position = user.getPosition();
        if (Math.hypot(position.x - state.x, position.y - state.y) > SEAT_LEAVE_DISTANCE) {
            this.release(user, true);
        }
    }

    /**
     * The map changed: whoever may no longer sit where they sit stands up (the chair was removed or moved, the desk was
     * given to someone else, taken out of service...).
     */
    public onMapChanged(): void {
        const wam = this.room.getWam();
        const seats = wam ? listSeats(wam.areas, Object.entries(wam.entities)) : [];
        for (const [user, state] of [...this.seated]) {
            const seat = seats.find((candidate) => candidate.id === state.seatId);
            const verdict = evaluateSit({
                seat,
                desk: this.deskOf(wam, seat?.deskAreaId),
                sitter: { uuid: user.uuid, tags: user.tags },
                occupantUuid: undefined,
                now: this.now(),
            });
            const moved = seat !== undefined && (seat.x !== state.x || seat.y !== state.y);
            if (!verdict.allowed || moved) {
                this.release(user, true);
            }
        }
    }

    public seatOf(user: U): SeatedState | undefined {
        return this.seated.get(user);
    }

    public occupantOf(seatId: string): U | undefined {
        return this.occupants.get(seatId);
    }

    private mayStillSit(user: U, seat: Seat | undefined, wam: WAMFileFormat | undefined): boolean {
        return evaluateSit({
            seat,
            desk: this.deskOf(wam, seat?.deskAreaId),
            sitter: { uuid: user.uuid, tags: user.tags },
            occupantUuid: undefined,
            now: this.now(),
        }).allowed;
    }

    private deskOf(wam: WAMFileFormat | undefined, deskAreaId: string | undefined) {
        if (!wam || deskAreaId === undefined) return null;
        const area = wam.areas.find((candidate) => candidate.id === deskAreaId);
        return (area && getDeskProperty(area)) ?? null;
    }

    private release(user: U, announce: boolean): void {
        const state = this.seated.get(user);
        if (state === undefined) return;
        this.seated.delete(user);
        if (this.occupants.get(state.seatId) === user) {
            this.occupants.delete(state.seatId);
        }
        if (announce) {
            this.room.publishSeat(user, null);
        }
    }
}
