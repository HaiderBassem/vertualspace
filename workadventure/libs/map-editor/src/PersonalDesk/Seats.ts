import { z } from "zod";
import type { AreaData, WAMEntityData } from "../types";
import { getDeskProperty } from "./NearestDesk";

/**
 * Places to sit in the office: chairs, armchairs, sofas... placed on the map as objects, and the seats drawn on a desk by
 * hand (for maps whose chairs are part of the map picture). The browser and the servers list seats with the same code,
 * so that they agree on where each one is and which desk it belongs to.
 */

export const SeatDirection = z.enum(["Left", "Up", "Down", "Right"]);
export type SeatDirection = z.infer<typeof SeatDirection>;

export interface Seat {
    /** "entity:<id>" for a piece of furniture, "desk:<area id>:<index>" for a seat drawn on a desk. */
    id: string;
    /** The centre of the seat, in pixels of the map: where the body of the person sitting is. */
    x: number;
    y: number;
    /** The way the person sitting faces. */
    direction: SeatDirection;
    /** The desk the seat is part of, when it lies inside one. */
    deskAreaId?: string;
}

/**
 * The public player variable that tells everyone where a player sits. Only the server sets it, once it has checked that
 * the player may sit there: a browser cannot make others believe it sits somewhere it may not.
 */
export const SEAT_PLAYER_VARIABLE = "wa:seat";

/** The value of the seat variable while a player sits (null when they stand). */
export const SeatedState = z.object({
    seatId: z.string(),
    x: z.number(),
    y: z.number(),
    direction: SeatDirection,
    deskAreaId: z.string().optional(),
});
export type SeatedState = z.infer<typeof SeatedState>;

/** The seated state in a variable value, or undefined when the player stands (or the value is not one). */
export function parseSeatedState(value: unknown): SeatedState | undefined {
    if (value === null || value === undefined) return undefined;
    const result = SeatedState.safeParse(value);
    return result.success ? result.data : undefined;
}

/** The size assumed for an object whose picture the code cannot see (the servers): the size of a map tile. */
export const DEFAULT_SEAT_ENTITY_SIZE = { width: 32, height: 32 };

/** How far from a seat (between centres, in pixels) a player can still sit on it. */
export const SEAT_REACH = 96;

/** How far a player can drift from their seat (in pixels) before they are considered to have stood up. */
export const SEAT_LEAVE_DISTANCE = 48;

/** Words that, in the name of a piece of furniture, say it is something to sit on. */
const SEAT_WORDS =
    /\b(chair|armchair|stool|bench|couch|sofa|pouf|seat|beanbag|bean bag|chaise|ottoman|hammock|swing|lounger|recliner|deckchair|settee|loveseat)s?\b/i;

/** Whether a piece of furniture is something to sit on, from its name. */
export function isSeatFurnitureName(name: string): boolean {
    return SEAT_WORDS.test(name);
}

export interface PrefabIdParts {
    collectionName: string;
    name: string;
    color: string;
    direction: SeatDirection | undefined;
}

/**
 * The parts of the identifier of a piece of furniture of a collection, which is built as
 * "<collection>:<name>:<color>:<direction>" (e.g. "basic furniture:Basic Chair:blue:Up"). Undefined when the identifier
 * does not have that shape, such as the identifier of an uploaded object.
 */
export function parsePrefabId(prefabId: string): PrefabIdParts | undefined {
    const parts = prefabId.split(":");
    if (parts.length < 4) return undefined;
    const direction = SeatDirection.safeParse(parts[parts.length - 1]);
    const color = parts[parts.length - 2];
    const name = parts[parts.length - 3];
    const collectionName = parts.slice(0, parts.length - 3).join(":");
    if (!name || !collectionName) return undefined;
    return { collectionName, name, color, direction: direction.success ? direction.data : undefined };
}

/** What a collection says of a piece of furniture: its name, and the way it faces. */
export interface PrefabDescription {
    name: string;
    direction?: SeatDirection | undefined;
}

/**
 * Looks a piece of furniture up in the collections of the map, for identifiers that do not carry its name (the ones the
 * admin back office makes, "adminspace:<component>:<variant>"). Undefined when the collection does not know it.
 */
export type PrefabDescriber = (prefabId: string) => PrefabDescription | undefined;

export interface EntitySize {
    width: number;
    height: number;
}

/**
 * The seat a piece of furniture of the map offers, if it is something to sit on. The person sitting faces the way the
 * piece of furniture faces (a chair "Up" is seen from behind: whoever sits on it faces up, towards the desk).
 */
export function seatOfEntity(
    entityId: string,
    entity: Pick<WAMEntityData, "x" | "y" | "prefabRef">,
    size: EntitySize = DEFAULT_SEAT_ENTITY_SIZE,
    describe?: PrefabDescriber,
): Seat | undefined {
    // The identifier says what the furniture is when it is "<collection>:<name>:<color>:<direction>"; otherwise the
    // collection does.
    const prefab: PrefabDescription | undefined = parsePrefabId(entity.prefabRef.id) ?? describe?.(entity.prefabRef.id);
    if (!prefab || !isSeatFurnitureName(prefab.name)) return undefined;
    return {
        id: `entity:${entityId}`,
        x: entity.x + size.width / 2,
        y: entity.y + size.height / 2,
        direction: prefab.direction ?? "Down",
    };
}

type AreaLike = Pick<AreaData, "id" | "x" | "y" | "width" | "height" | "properties">;

function contains(area: Pick<AreaData, "x" | "y" | "width" | "height">, point: { x: number; y: number }): boolean {
    return point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height;
}

/** The desk (an area with the personal-area property) that contains a point, if any. */
export function deskContaining<T extends AreaLike>(
    areas: readonly T[],
    point: { x: number; y: number },
): T | undefined {
    return areas.find((area) => getDeskProperty(area) !== undefined && contains(area, point));
}

/**
 * All the seats of a map: the furniture to sit on, and the seats drawn on desks. A seat that lies inside a desk belongs
 * to that desk, so the rules of the desk (whose it is, who it is kept for) apply to whoever wants to sit there.
 *
 * @param sizeOf The size of the picture of an object, when known (the browser knows it; the servers do not).
 * @param describe What the collections say of a piece of furniture whose identifier does not say it.
 */
export function listSeats(
    areas: readonly AreaLike[],
    entities: Iterable<[string, Pick<WAMEntityData, "x" | "y" | "prefabRef">]>,
    sizeOf?: (entityId: string) => EntitySize | undefined,
    describe?: PrefabDescriber,
): Seat[] {
    const seats: Seat[] = [];
    for (const [entityId, entity] of entities) {
        const seat = seatOfEntity(entityId, entity, sizeOf?.(entityId) ?? DEFAULT_SEAT_ENTITY_SIZE, describe);
        if (!seat) continue;
        const desk = deskContaining(areas, seat);
        seats.push(desk ? { ...seat, deskAreaId: desk.id } : seat);
    }
    for (const area of areas) {
        const desk = getDeskProperty(area);
        (desk?.seats ?? []).forEach((drawn, index) => {
            seats.push({
                id: `desk:${area.id}:${index}`,
                x: drawn.x,
                y: drawn.y,
                direction: drawn.direction,
                deskAreaId: area.id,
            });
        });
    }
    return seats;
}

/** The seat closest to a point, within a distance (between centres), if any. Ties are broken by id. */
export function nearestSeat<T extends Pick<Seat, "id" | "x" | "y">>(
    seats: readonly T[],
    point: { x: number; y: number },
    maxDistance: number,
): T | undefined {
    let best: { seat: T; distance: number } | undefined;
    for (const seat of seats) {
        const distance = Math.hypot(seat.x - point.x, seat.y - point.y);
        if (distance > maxDistance) continue;
        if (!best || distance < best.distance || (distance === best.distance && seat.id < best.seat.id)) {
            best = { seat, distance };
        }
    }
    return best?.seat;
}

/** The seats of one desk. */
export function seatsOfDesk<T extends Pick<Seat, "deskAreaId">>(seats: readonly T[], deskAreaId: string): T[] {
    return seats.filter((seat) => seat.deskAreaId === deskAreaId);
}
