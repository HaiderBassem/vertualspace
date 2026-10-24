import { describe, expect, it } from "vitest";
import { EntityPermissions, GameMapAreas } from "@workadventure/map-editor";
import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import {
    EntityEditPolicyError,
    assertCanCreateEntity,
    assertCanDeleteEntity,
    assertCanModifyEntity,
} from "../EntityEditPolicy";

/**
 * Two desks side by side and the open floor around them:
 *   alice's desk: x 0..64,   y 0..64
 *   bob's desk:   x 100..164, y 0..64
 *   everything else is the shared office, which no employee can edit.
 */
function desk(id: string, x: number, ownerId: string): AreaData {
    return {
        id,
        name: id,
        x,
        y: 0,
        width: 64,
        height: 64,
        visible: true,
        properties: [
            {
                id: `${id}-property`,
                type: "personalAreaPropertyData",
                accessClaimMode: "dynamic",
                allowedTags: [],
                ownerId,
            },
        ],
    };
}

function permissionsOf(userUUID: string, userCanEdit = false): EntityPermissions {
    const wam: WAMFileFormat = {
        version: "1.0.0",
        mapUrl: "./map.tmj",
        entities: {},
        areas: [desk("alice-desk", 0, "alice"), desk("bob-desk", 100, "bob")],
        entityCollections: [],
    };
    return new EntityPermissions(new GameMapAreas(wam), [], userCanEdit, userUUID);
}

const alice = (): EntityPermissions => permissionsOf("alice");
const SIZE = { width: 16, height: 16 };

describe("assertCanCreateEntity", () => {
    it("lets an employee put an object inside their own desk", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 10, y: 10, ...SIZE })).not.toThrow();
    });

    it("refuses an object on the shared floor", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 300, y: 300, ...SIZE })).toThrow(EntityEditPolicyError);
    });

    it("refuses an object in the desk of another employee", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 110, y: 10, ...SIZE })).toThrow(EntityEditPolicyError);
    });

    it("refuses an object that sticks out of the desk", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 56, y: 10, ...SIZE })).toThrow(EntityEditPolicyError);
    });

    it("refuses an object whose declared size is zero, which would turn the check into a check of one point", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 60, y: 10, width: 0, height: 0 })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("refuses an object whose declared size is made up, since the whole claimed rectangle must lie in the desk", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 200, y: 200, width: 400, height: 400 })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("refuses everything to a user who can edit nothing", () => {
        expect(() => assertCanCreateEntity(undefined, false, { x: 10, y: 10, ...SIZE })).toThrow(EntityEditPolicyError);
    });

    it("lets a user with map edit rights put an object anywhere, with whatever size", () => {
        expect(() => assertCanCreateEntity(undefined, true, { x: 5000, y: 5000, width: 0, height: 0 })).not.toThrow();
    });

    it("tells the reason", () => {
        expect(() => assertCanCreateEntity(alice(), false, { x: 300, y: 300, ...SIZE })).toThrow(
            /^ENTITY_OUTSIDE_EDITABLE_AREA: /,
        );
    });
});

describe("assertCanModifyEntity", () => {
    it("lets an employee move an object around inside their own desk", () => {
        expect(() => assertCanModifyEntity(alice(), false, { x: 10, y: 10 }, { x: 30, y: 30, ...SIZE })).not.toThrow();
    });

    it("refuses to move an object out of their desk", () => {
        expect(() => assertCanModifyEntity(alice(), false, { x: 10, y: 10 }, { x: 300, y: 300, ...SIZE })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("refuses to take an object of another employee into their own desk", () => {
        // The object is in bob's desk now. Where it would go is alice's desk, which alone would pass.
        expect(() => assertCanModifyEntity(alice(), false, { x: 110, y: 10 }, { x: 30, y: 30, ...SIZE })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("refuses to take a shared object of the office into their own desk", () => {
        expect(() => assertCanModifyEntity(alice(), false, { x: 300, y: 300 }, { x: 30, y: 30, ...SIZE })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("refuses to change an object of another employee in place", () => {
        expect(() => assertCanModifyEntity(alice(), false, { x: 110, y: 10 }, { x: 110, y: 10, ...SIZE })).toThrow(
            EntityEditPolicyError,
        );
    });

    it("lets a user with map edit rights move any object", () => {
        expect(() =>
            assertCanModifyEntity(permissionsOf("carol", true), true, { x: 110, y: 10 }, { x: 300, y: 300, ...SIZE }),
        ).not.toThrow();
    });
});

describe("assertCanDeleteEntity", () => {
    it("lets an employee delete an object in their own desk", () => {
        expect(() => assertCanDeleteEntity(alice(), false, { x: 10, y: 10 })).not.toThrow();
    });

    it("refuses to delete an object in the desk of another employee", () => {
        expect(() => assertCanDeleteEntity(alice(), false, { x: 110, y: 10 })).toThrow(EntityEditPolicyError);
    });

    it("refuses to delete a shared object of the office", () => {
        expect(() => assertCanDeleteEntity(alice(), false, { x: 300, y: 300 })).toThrow(EntityEditPolicyError);
    });

    it("lets a user with map edit rights delete any object", () => {
        expect(() => assertCanDeleteEntity(permissionsOf("carol", true), true, { x: 110, y: 10 })).not.toThrow();
    });
});
