import { describe, expect, it } from "vitest";
import type { MinimapLayout } from "../../../../src/front/Components/Minimap/MinimapGeometry";
import {
    colorToCss,
    computeBackgroundResolution,
    computeMinimapLayout,
    findClosestDot,
    MINIMAP_MAX_SIZE,
    minimapToWorld,
    nudgeWorldPoint,
    worldRectToMinimap,
    worldToMinimap,
} from "../../../../src/front/Components/Minimap/MinimapGeometry";

function layoutFor(width: number, height: number): MinimapLayout {
    const layout = computeMinimapLayout({ width, height });
    if (!layout) {
        throw new Error("Expected a layout");
    }
    return layout;
}

describe("computeMinimapLayout", () => {
    it("should fill the width of the card for a wide map", () => {
        const layout = layoutFor(4800, 1600);

        expect(layout.width).toBe(240);
        expect(layout.height).toBe(80);
        expect(layout.scale).toBeCloseTo(0.05);
        expect(layout.offsetX).toBe(0);
        expect(layout.offsetY).toBe(0);
    });

    it("should fill the height of the card for a tall map", () => {
        const layout = layoutFor(2000, 3400);

        expect(layout.width).toBe(100);
        expect(layout.height).toBe(170);
        expect(layout.scale).toBeCloseTo(0.05);
    });

    it("should keep the aspect ratio of a square map within the card", () => {
        const layout = layoutFor(3200, 3200);

        expect(layout.width).toBe(170);
        expect(layout.height).toBe(170);
        expect(layout.width).toBeLessThanOrEqual(MINIMAP_MAX_SIZE.width);
    });

    it("should letterbox a very thin map so that the card stays usable", () => {
        const layout = layoutFor(9600, 320);

        expect(layout.width).toBe(240);
        expect(layout.height).toBe(56);
        expect(layout.imageHeight).toBeCloseTo(8);
        expect(layout.offsetY).toBeCloseTo(24);
        expect(layout.offsetX).toBe(0);
    });

    it("should refuse a map without a size", () => {
        expect(computeMinimapLayout({ width: 0, height: 320 })).toBeUndefined();
        expect(computeMinimapLayout({ width: 320, height: Number.NaN })).toBeUndefined();
    });
});

describe("world and minimap coordinates", () => {
    it("should map world corners to the corners of the map image", () => {
        const layout = layoutFor(4800, 1600);

        expect(worldToMinimap({ x: 0, y: 0 }, layout)).toEqual({ x: 0, y: 0 });
        expect(worldToMinimap({ x: 4800, y: 1600 }, layout)).toEqual({ x: 240, y: 80 });
        expect(worldToMinimap({ x: 2400, y: 800 }, layout)).toEqual({ x: 120, y: 40 });
    });

    it("should take the letterbox offset into account both ways", () => {
        const layout = layoutFor(9600, 320);

        const onCard = worldToMinimap({ x: 4800, y: 160 }, layout);
        expect(onCard.x).toBeCloseTo(120);
        expect(onCard.y).toBeCloseTo(28);

        const backInWorld = minimapToWorld(onCard, layout);
        expect(backInWorld.x).toBeCloseTo(4800);
        expect(backInWorld.y).toBeCloseTo(160);
    });

    it("should clamp a click in the letterbox margins to the map's edge", () => {
        const layout = layoutFor(9600, 320);

        expect(minimapToWorld({ x: 10, y: 2 }, layout)).toEqual({ x: 400, y: 0 });
        expect(minimapToWorld({ x: 250, y: 55 }, layout)).toEqual({ x: 9600, y: 320 });
    });
});

describe("worldRectToMinimap", () => {
    it("should convert the camera viewport to card pixels", () => {
        const layout = layoutFor(4800, 1600);

        expect(worldRectToMinimap({ x: 1000, y: 200, width: 1200, height: 600 }, layout)).toEqual({
            x: 50,
            y: 10,
            width: 60,
            height: 30,
        });
    });

    it("should clip a viewport larger than the map to the map image", () => {
        const layout = layoutFor(4800, 1600);

        expect(worldRectToMinimap({ x: -1000, y: -500, width: 8000, height: 4000 }, layout)).toEqual({
            x: 0,
            y: 0,
            width: 240,
            height: 80,
        });
    });

    it("should return undefined for a viewport outside the map", () => {
        const layout = layoutFor(4800, 1600);

        expect(worldRectToMinimap({ x: 5000, y: 0, width: 400, height: 400 }, layout)).toBeUndefined();
    });
});

describe("computeBackgroundResolution", () => {
    it("should supersample the displayed size", () => {
        const layout = layoutFor(4800, 1600);

        expect(computeBackgroundResolution(layout, 1)).toEqual({ width: 480, height: 160 });
        expect(computeBackgroundResolution(layout, 2)).toEqual({ width: 960, height: 320 });
    });

    it("should never exceed the maximum texture side", () => {
        const layout = layoutFor(48000, 16000);

        const resolution = computeBackgroundResolution(layout, 3, 2, 1024);
        expect(resolution.width).toBeLessThanOrEqual(1024);
        expect(resolution.height).toBeLessThanOrEqual(1024);
        expect(resolution.width / resolution.height).toBeCloseTo(3);
    });

    it("should not draw more pixels than the map has", () => {
        const layout = layoutFor(320, 160);

        expect(computeBackgroundResolution(layout, 2)).toEqual({ width: 320, height: 160 });
    });
});

describe("findClosestDot", () => {
    const dots = [
        { id: "a", x: 10, y: 10 },
        { id: "b", x: 14, y: 10 },
        { id: "c", x: 100, y: 100 },
    ];

    it("should return the closest dot within the distance", () => {
        expect(findClosestDot(dots, { x: 13, y: 11 }, 8)?.id).toBe("b");
        expect(findClosestDot(dots, { x: 9, y: 9 }, 8)?.id).toBe("a");
    });

    it("should return undefined when every dot is too far", () => {
        expect(findClosestDot(dots, { x: 50, y: 50 }, 8)).toBeUndefined();
        expect(findClosestDot([], { x: 50, y: 50 }, 8)).toBeUndefined();
    });
});

describe("nudgeWorldPoint", () => {
    it("should move the point and keep it inside the map", () => {
        const layout = layoutFor(4800, 1600);

        expect(nudgeWorldPoint({ x: 100, y: 100 }, 64, -32, layout)).toEqual({ x: 164, y: 68 });
        expect(nudgeWorldPoint({ x: 100, y: 100 }, -500, 5000, layout)).toEqual({ x: 0, y: 1600 });
    });
});

describe("colorToCss", () => {
    it("should format colors as 6-digit hexadecimal CSS colors", () => {
        expect(colorToCss(0x68e97a)).toBe("#68e97a");
        expect(colorToCss(0x0000ff)).toBe("#0000ff");
        expect(colorToCss(0xffffff)).toBe("#ffffff");
    });
});
