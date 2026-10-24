import { describe, expect, it } from "vitest";
import {
    countClaimableDesks,
    findNearestClaimableDesk,
    getDeskProperty,
    hasADesk,
} from "../../src/PersonalDesk/NearestDesk";

type Area = Parameters<typeof findNearestClaimableDesk>[0][number];

interface DeskOptions {
    ownerId?: string | null;
    mode?: "dynamic" | "static";
    disabled?: boolean;
    allowedTags?: string[];
}

function desk(id: string, x: number, y: number, options: DeskOptions = {}): Area {
    return {
        id,
        x,
        y,
        width: 64,
        height: 64,
        properties: [
            {
                id: `${id}-p`,
                type: "personalAreaPropertyData",
                accessClaimMode: options.mode ?? "dynamic",
                allowedTags: options.allowedTags ?? [],
                ownerId: options.ownerId ?? null,
                ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
            },
        ],
    };
}

const meetingRoom: Area = { id: "meeting", x: 0, y: 0, width: 300, height: 300, properties: [] };

describe("getDeskProperty", () => {
    it("returns the personal area property of a desk, and nothing for any other area", () => {
        expect(getDeskProperty(desk("d1", 0, 0))?.type).toBe("personalAreaPropertyData");
        expect(getDeskProperty(meetingRoom)).toBeUndefined();
    });
});

describe("hasADesk", () => {
    const areas = [desk("d1", 0, 0, { ownerId: "alice@example.test" }), desk("d2", 100, 0), meetingRoom];

    it("is true for the person a desk was given to", () => {
        expect(hasADesk(areas, "alice@example.test")).toBe(true);
    });

    it("is false for anybody else, and when the user is not known", () => {
        expect(hasADesk(areas, "bob@example.test")).toBe(false);
        expect(hasADesk(areas, undefined)).toBe(false);
        expect(hasADesk(areas, "")).toBe(false);
    });

    it("is false on a map without desks", () => {
        expect(hasADesk([meetingRoom], "alice@example.test")).toBe(false);
    });
});

describe("countClaimableDesks", () => {
    it("counts the free desks open to claiming, in service and open to the user, and no other", () => {
        const areas = [
            desk("free", 0, 0),
            desk("taken", 100, 0, { ownerId: "alice@example.test" }),
            desk("static", 200, 0, { mode: "static" }),
            desk("off", 300, 0, { disabled: true }),
            desk("design-only", 400, 0, { allowedTags: ["design"] }),
            meetingRoom,
        ];

        expect(countClaimableDesks(areas, [])).toBe(1);
        expect(countClaimableDesks(areas, ["design"])).toBe(2);
    });
});

describe("findNearestClaimableDesk", () => {
    it("returns the claimable desk whose centre is closest to the point", () => {
        const areas = [desk("far", 1000, 1000), desk("near", 100, 100), desk("middle", 400, 400)];

        expect(findNearestClaimableDesk(areas, [], { x: 120, y: 120 })?.id).toBe("near");
        expect(findNearestClaimableDesk(areas, [], { x: 900, y: 900 })?.id).toBe("far");
    });

    it("skips desks that cannot be claimed, however close they are", () => {
        const areas = [
            desk("taken", 100, 100, { ownerId: "alice@example.test" }),
            desk("static", 110, 110, { mode: "static" }),
            desk("off", 120, 120, { disabled: true }),
            desk("design-only", 130, 130, { allowedTags: ["design"] }),
            desk("free", 800, 800),
        ];

        expect(findNearestClaimableDesk(areas, [], { x: 100, y: 100 })?.id).toBe("free");
        expect(findNearestClaimableDesk(areas, ["design"], { x: 100, y: 100 })?.id).toBe("design-only");
    });

    it("returns nothing when no desk can be claimed", () => {
        expect(findNearestClaimableDesk([], [], { x: 0, y: 0 })).toBeUndefined();
        expect(findNearestClaimableDesk([meetingRoom], [], { x: 0, y: 0 })).toBeUndefined();
        expect(
            findNearestClaimableDesk([desk("taken", 0, 0, { ownerId: "alice@example.test" })], [], { x: 0, y: 0 }),
        ).toBeUndefined();
    });

    it("measures to the centre of the desk, not to its corner", () => {
        // From x = 150: the desk at 100..164 has its centre at 132, the one at 140..204 has it at 172.
        const areas = [desk("a", 140, 0), desk("b", 100, 0)];

        expect(findNearestClaimableDesk(areas, [], { x: 150, y: 32 })?.id).toBe("b");
    });

    it("gives the same answer whatever the order of the areas when two desks are equally close", () => {
        const left = desk("left", 0, 0);
        const right = desk("right", 200, 0);
        const middle = { x: 132, y: 32 };

        expect(findNearestClaimableDesk([left, right], [], middle)?.id).toBe("left");
        expect(findNearestClaimableDesk([right, left], [], middle)?.id).toBe("left");
    });
});
