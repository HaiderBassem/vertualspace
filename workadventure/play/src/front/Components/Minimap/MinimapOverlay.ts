import type { AvailabilityStatus } from "@workadventure/messages";
import type { GameScene } from "../../Phaser/Game/GameScene";
import { MINIMUM_DISTANCE } from "../../Enum/EnvironmentVariable";
import { getColorOfStatus } from "../../Utils/AvailabilityStatus";
import type { MinimapLayout, Point } from "./MinimapGeometry";
import { colorToCss, worldRectToMinimap, worldToMinimap } from "./MinimapGeometry";

/** A player as drawn on the minimap, in card pixels. */
export interface MinimapDot extends Point {
    userId: number | undefined;
    name: string;
    color: string;
    isMe: boolean;
    inMyBubble: boolean;
}

interface MinimapBubble extends Point {
    radius: number;
    isMine: boolean;
}

/** Everything the overlay draws, already converted to card pixels. */
export interface MinimapFrame {
    dots: MinimapDot[];
    bubbles: MinimapBubble[];
    viewport: { x: number; y: number; width: number; height: number } | undefined;
}

const OTHER_DOT_RADIUS = 3;
const MY_DOT_RADIUS = 5;
const MIN_BUBBLE_RADIUS = 4;

function statusColor(status: AvailabilityStatus): string {
    return colorToCss(getColorOfStatus(status).filling);
}

/**
 * Reads the scene state the overlay needs. Cheap: one pass over the remote players and the conversation bubbles.
 */
export function collectMinimapFrame(
    scene: GameScene,
    layout: MinimapLayout,
    myGroupId: number | undefined,
    myName: string,
): MinimapFrame {
    const myBubble = myGroupId !== undefined ? scene.groups.get(myGroupId) : undefined;
    const myBubbleUserIds = new Set(myBubble?.getUserIds() ?? []);

    const bubbles: MinimapBubble[] = [];
    for (const [groupId, bubble] of scene.groups) {
        const center = worldToMinimap(bubble, layout);
        bubbles.push({
            x: center.x,
            y: center.y,
            // The bubble's resting radius, the size it is drawn at on the map.
            radius: Math.max(MIN_BUBBLE_RADIUS, MINIMUM_DISTANCE * layout.scale),
            isMine: groupId === myGroupId,
        });
    }

    const dots: MinimapDot[] = [];
    for (const player of scene.MapPlayersByKey.values()) {
        const position = worldToMinimap(player, layout);
        dots.push({
            x: position.x,
            y: position.y,
            userId: player.userId,
            name: player.playerName,
            color: statusColor(player.getAvailabilityStatus()),
            isMe: false,
            inMyBubble: myBubbleUserIds.has(player.userId),
        });
    }

    // The scene may be between two players (reconnection): the field is declared but not always set.
    const currentPlayer: GameScene["CurrentPlayer"] | undefined = scene.CurrentPlayer;
    if (currentPlayer) {
        const position = worldToMinimap(currentPlayer, layout);
        dots.push({
            x: position.x,
            y: position.y,
            userId: undefined,
            name: myName,
            color: statusColor(currentPlayer.getAvailabilityStatus()),
            isMe: true,
            inMyBubble: myBubble !== undefined,
        });
    }

    const worldView = scene.getCameraManager().getCamera().worldView;
    const viewport = worldRectToMinimap(
        { x: worldView.x, y: worldView.y, width: worldView.width, height: worldView.height },
        layout,
    );

    return { dots, bubbles, viewport };
}

/** Dark outline drawn under white strokes: white alone disappears on light floors (snow, tiles, carpets). */
const HALO_COLOR = "rgba(15, 31, 45, 0.75)";

/** Strokes the current path in white over a dark halo, so that it reads on any floor. */
function strokeWithHalo(context: CanvasRenderingContext2D, lineWidth: number, dash: number[] = []): void {
    context.setLineDash([]);
    context.strokeStyle = HALO_COLOR;
    context.lineWidth = lineWidth + 2;
    context.stroke();
    context.setLineDash(dash);
    context.strokeStyle = "#ffffff";
    context.lineWidth = lineWidth;
    context.stroke();
    context.setLineDash([]);
}

function drawDot(context: CanvasRenderingContext2D, dot: MinimapDot): void {
    const radius = dot.isMe ? MY_DOT_RADIUS : OTHER_DOT_RADIUS;

    if (dot.inMyBubble && !dot.isMe) {
        context.beginPath();
        context.arc(dot.x, dot.y, radius + 2.5, 0, Math.PI * 2);
        strokeWithHalo(context, 1.5);
    }

    context.beginPath();
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    context.fillStyle = dot.color;
    context.fill();
    if (dot.isMe) {
        // Mine: bigger, with a white ring.
        strokeWithHalo(context, 2);
    } else {
        context.strokeStyle = HALO_COLOR;
        context.lineWidth = 1;
        context.stroke();
    }
}

function drawTarget(context: CanvasRenderingContext2D, target: Point, dashed: boolean): void {
    context.beginPath();
    context.arc(target.x, target.y, 6, 0, Math.PI * 2);
    strokeWithHalo(context, 1.5, dashed ? [2, 2] : []);
    context.beginPath();
    context.moveTo(target.x - 3, target.y);
    context.lineTo(target.x + 3, target.y);
    context.moveTo(target.x, target.y - 3);
    context.lineTo(target.x, target.y + 3);
    strokeWithHalo(context, 1.5);
}

export interface MinimapOverlayExtras {
    /** Where the user asked to walk (card pixels), until the woka gets there. */
    walkTarget?: Point;
    /** The spot picked with the keyboard (card pixels), while the map surface has the focus. */
    keyboardTarget?: Point;
}

/**
 * Draws a frame on the overlay canvas. The canvas is sized in device pixels; the drawing happens in CSS pixels.
 */
export function drawMinimapFrame(
    context: CanvasRenderingContext2D,
    frame: MinimapFrame,
    devicePixelRatio: number,
    extras: MinimapOverlayExtras = {},
): void {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    for (const bubble of frame.bubbles) {
        context.beginPath();
        context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        context.fillStyle = bubble.isMine ? "rgba(54, 93, 255, 0.35)" : "rgba(255, 255, 255, 0.2)";
        context.fill();
        if (bubble.isMine) {
            strokeWithHalo(context, 1);
        } else {
            context.strokeStyle = "rgba(15, 31, 45, 0.35)";
            context.lineWidth = 1;
            context.stroke();
        }
    }

    if (frame.viewport) {
        const { x, y, width, height } = frame.viewport;
        context.fillStyle = "rgba(255, 255, 255, 0.1)";
        context.fillRect(x, y, width, height);
        context.beginPath();
        // Inset by half a line so that the outline stays inside the map image when the viewport covers it all.
        context.rect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height - 2));
        strokeWithHalo(context, 1);
    }

    if (extras.walkTarget) {
        drawTarget(context, extras.walkTarget, false);
    }

    // Mine is last in the list, so it is drawn above everybody else.
    for (const dot of frame.dots) {
        drawDot(context, dot);
    }

    if (extras.keyboardTarget) {
        drawTarget(context, extras.keyboardTarget, true);
    }
}
