import type { SeatDirection } from "@workadventure/map-editor";
import { PositionMessage_Direction } from "@workadventure/messages";

/**
 * How a Woka is drawn while it sits. Wokas have no sitting frames: the standing frame facing the way of the seat is
 * drawn lower on the seat, with the legs cut off, which reads as sitting at the size Wokas are drawn. Seen from behind
 * (facing up, towards a desk), the Woka is drawn behind the back of the chair, so that only the head and shoulders show
 * above it.
 */
export interface SeatPose {
    direction: PositionMessage_Direction;
    /** Vertical shift of the Woka picture from the seat position, in pixels (negative: up). */
    offsetY: number;
    /** Rows of pixels cut off at the bottom of the 32 pixels high Woka frames (the legs). */
    cropBottom: number;
    /** Added to the depth of the Woka: negative to be drawn behind the chair, positive in front of it. */
    depthOffset: number;
}

/** The height of a Woka frame, in pixels. */
export const WOKA_FRAME_HEIGHT = 32;

const DIRECTIONS: Record<SeatDirection, PositionMessage_Direction> = {
    Up: PositionMessage_Direction.UP,
    Down: PositionMessage_Direction.DOWN,
    Left: PositionMessage_Direction.LEFT,
    Right: PositionMessage_Direction.RIGHT,
};

export function toPlayerDirection(direction: SeatDirection): PositionMessage_Direction {
    return DIRECTIONS[direction];
}

/** The pose of a Woka sitting on a seat that faces this way. */
export function seatPoseFor(direction: SeatDirection): SeatPose {
    switch (direction) {
        case "Up":
            // Seen from behind: head and shoulders above the back of the chair, which hides the rest.
            return { direction: DIRECTIONS.Up, offsetY: -12, cropBottom: 6, depthOffset: -2 };
        case "Down":
            // Facing the camera: on the seat, in front of the back of the chair.
            return { direction: DIRECTIONS.Down, offsetY: -4, cropBottom: 6, depthOffset: 2 };
        case "Left":
        case "Right":
            return { direction: DIRECTIONS[direction], offsetY: -5, cropBottom: 6, depthOffset: 2 };
    }
}
