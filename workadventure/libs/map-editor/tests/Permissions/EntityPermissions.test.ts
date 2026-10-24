import { describe, expect, it } from "vitest";
import { GameMapAreas } from "../../src/GameMap/GameMapAreas";
import { EntityPermissions } from "../../src/Permissions/EntityPermissions";
import type { AreaData, WAMFileFormat } from "../../src/types";

/** A desk that is wide and short: 100 × 40, with its top-left corner at (0, 0). */
function desk(ownerId: string | null): AreaData {
    return {
        id: "desk",
        name: "desk",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        visible: true,
        properties: [
            {
                id: "desk-property",
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
        areas: [desk("alice")],
        entityCollections: [],
    };
    return new EntityPermissions(new GameMapAreas(wam), [], userCanEdit, userUUID);
}

describe("EntityPermissions.canEdit", () => {
    it("lets the owner of a desk put an object in it", () => {
        expect(permissionsOf("alice").canEdit({ x: 50, y: 20 }, 20, 20)).toBe(true);
    });

    it("refuses someone else's desk", () => {
        expect(permissionsOf("bob").canEdit({ x: 50, y: 20 }, 20, 20)).toBe(false);
    });

    it("lets a user with map edit rights put an object anywhere", () => {
        expect(permissionsOf("bob", true).canEdit({ x: 5000, y: 5000 }, 20, 20)).toBe(true);
    });

    it("accepts a wide object that fits the wide desk", () => {
        // 90 wide, 30 tall, centered: it lies from x=5 to 95 and y=5 to 35, inside the 100 × 40 desk. With the
        // dimensions the wrong way round it would be taken for 30 × 90, which does not fit.
        expect(permissionsOf("alice").canEdit({ x: 50, y: 20 }, 90, 30)).toBe(true);
    });

    it("refuses a tall object that does not fit the wide desk", () => {
        // 30 wide, 90 tall: it sticks out of the 40 tall desk. With the dimensions the wrong way round it would be
        // taken for 90 × 30, which fits.
        expect(permissionsOf("alice").canEdit({ x: 50, y: 20 }, 30, 90)).toBe(false);
    });

    it("refuses an object that sticks out of the desk", () => {
        expect(permissionsOf("alice").canEdit({ x: 95, y: 20 }, 30, 20)).toBe(false);
    });
});
