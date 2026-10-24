import type { EntityPermissions } from "@workadventure/map-editor";

/**
 * The rules for what a user without map edit rights may do to objects (entities) of the map: only what lies inside an
 * area they can write to, such as their own desk. They are applied where the map is stored, whatever the browser says.
 */

export type EntityEditDenialReason = "ENTITY_OUTSIDE_EDITABLE_AREA";

export class EntityEditPolicyError extends Error {
    constructor(
        public readonly reason: EntityEditDenialReason,
        message: string,
    ) {
        super(`${reason}: ${message}`);
        this.name = "EntityEditPolicyError";
    }
}

export interface EntityPoint {
    x: number;
    y: number;
}

/** An object on the map: its top-left corner and its size. */
export interface EntityRect extends EntityPoint {
    width: number;
    height: number;
}

type Permissions = Pick<EntityPermissions, "canEdit"> | undefined;

/** Whether the whole rectangle of an object lies in an area that the user can write to. */
function canEditRect(permissions: Permissions, rect: EntityRect): boolean {
    // A real object has a size. Without one, the check would only look at a single point and an object could stick out
    // of the area: the size comes from the browser, so it cannot be trusted to be there.
    if (!(rect.width > 0 && rect.height > 0)) {
        return false;
    }
    return (
        permissions?.canEdit(
            { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 },
            rect.width,
            rect.height,
        ) ?? false
    );
}

/** Whether a point (the top-left corner of an object that is already on the map) is in an area the user can write to. */
function canEditPoint(permissions: Permissions, point: EntityPoint): boolean {
    return permissions?.canEdit({ x: point.x, y: point.y }) ?? false;
}

/** An object can only be created inside an area that the user can write to, all of it. */
export function assertCanCreateEntity(permissions: Permissions, userCanEdit: boolean, rect: EntityRect): void {
    if (userCanEdit) {
        return;
    }
    if (!canEditRect(permissions, rect)) {
        throw new EntityEditPolicyError(
            "ENTITY_OUTSIDE_EDITABLE_AREA",
            "the object would not lie inside an area the user can edit",
        );
    }
}

/**
 * An object can only be changed if it is inside an area that the user can write to now, and stays inside one: otherwise
 * the user could move the objects of others, or of the office, into their own desk.
 *
 * @param current Where the object is on the map now, as the server has it, not as the browser says.
 * @param next Where the object would be after the change.
 */
export function assertCanModifyEntity(
    permissions: Permissions,
    userCanEdit: boolean,
    current: EntityPoint,
    next: EntityRect,
): void {
    if (userCanEdit) {
        return;
    }
    if (!canEditPoint(permissions, current)) {
        throw new EntityEditPolicyError(
            "ENTITY_OUTSIDE_EDITABLE_AREA",
            "the object is not inside an area the user can edit",
        );
    }
    if (!canEditRect(permissions, next)) {
        throw new EntityEditPolicyError(
            "ENTITY_OUTSIDE_EDITABLE_AREA",
            "the object would not lie inside an area the user can edit",
        );
    }
}

/** An object can only be deleted if it is inside an area that the user can write to. */
export function assertCanDeleteEntity(permissions: Permissions, userCanEdit: boolean, current: EntityPoint): void {
    if (userCanEdit) {
        return;
    }
    if (!canEditPoint(permissions, current)) {
        throw new EntityEditPolicyError(
            "ENTITY_OUTSIDE_EDITABLE_AREA",
            "the object is not inside an area the user can edit",
        );
    }
}
