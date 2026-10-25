import { describe, expect, it } from "vitest";
import { HEIGHT_SCALE, modelBounds, renderModel } from "../src/lib/catalog/model3d/render";
import { MODEL_SCHEMA, Model3D, type Part } from "../src/lib/catalog/model3d/types";

const model = (parts: Part[], width = 32, height = 32, depth = 20): Model3D => ({
    schema: MODEL_SCHEMA,
    width,
    height,
    depth,
    parts,
});
const box = (
    at: [number, number, number],
    size: [number, number, number],
    color = "#808080",
    extra: Partial<Part> = {},
): Part => ({ shape: "box", at, size, color, ...extra }) as Part;
const pixel = (r: ReturnType<typeof renderModel>, x: number, y: number) => {
    const k = (y * r.width + x) * 4;
    return { r: r.data[k]!, g: r.data[k + 1]!, b: r.data[k + 2]!, a: r.data[k + 3]! };
};
const luma = (p: { r: number; g: number; b: number }) => 0.3 * p.r + 0.59 * p.g + 0.11 * p.b;

describe("the 3D renderer", () => {
    const crate = model([box([8, 0, 2], [16, 10, 14], "#a0a0a0")]);

    it("draws a picture of the size of the model, transparent where there is nothing", () => {
        const r = renderModel(crate);
        expect([r.width, r.height, r.data.length]).toEqual([32, 32, 32 * 32 * 4]);
        expect(pixel(r, 0, 0).a).toBe(0);
        expect(pixel(r, 31, 31).a).toBe(0);
    });

    it("lights the top of a box more than its front, and keeps the same picture for the same model", () => {
        const r = renderModel(crate);
        // oy = 32 - 20 - 2 = 10: the front edge of the footprint (z = 16) is on row 26, the top edge of the box (z = 2, y = 10) on row 5.
        const top = pixel(r, 16, 8);
        const front = pixel(r, 16, 22);
        expect(top.a).toBe(255);
        expect(front.a).toBe(255);
        expect(luma(top)).toBeGreaterThan(luma(front) + 15);
        expect(Buffer.from(renderModel(crate).data).equals(Buffer.from(r.data))).toBe(true);
    });

    it("shows where the model stands: a shadow on the ground, a dark outline around it", () => {
        const r = renderModel(crate);
        // Just right of the box (light comes from the left): the shadow on the floor.
        const shadow = pixel(r, 25, 22);
        expect(shadow.a).toBeGreaterThan(0);
        expect(shadow.a).toBeLessThan(160);
        // Just left of the box, nothing falls there but the outline.
        const edge = pixel(r, 7, 14);
        expect(edge.a).toBeGreaterThan(150);
        expect(luma(edge)).toBeLessThan(60);
        expect(renderModel(crate, { outline: false }).data[(14 * 32 + 7) * 4 + 3]).toBe(0);
    });

    it("is hidden behind what is in front of it, and shows through glass", () => {
        const wall = model([box([8, 0, 2], [16, 10, 4], "#ff0000"), box([8, 0, 10], [16, 10, 4], "#0000ff")]);
        const solid = pixel(renderModel(wall, { outline: false }), 16, 15);
        expect(solid.b).toBeGreaterThan(solid.r);
        const glass = model([
            box([8, 0, 2], [16, 10, 4], "#ff0000"),
            box([8, 0, 10], [16, 10, 2], "#0000ff", { opacity: 0.4 }),
        ]);
        const seen = pixel(renderModel(glass, { outline: false }), 16, 15);
        expect(seen.r).toBeGreaterThan(40);
        expect(seen.b).toBeGreaterThan(40);
    });

    it("draws round shapes: lit on the left, darker on the right", () => {
        const ball = model([{ shape: "ellipsoid", at: [16, 8, 12], r: [10, 8, 8], color: "#c0c0c0" }]);
        const r = renderModel(ball, { outline: false });
        const left = pixel(r, 9, 16);
        const right = pixel(r, 23, 16);
        expect(left.a).toBe(255);
        expect(right.a).toBe(255);
        expect(luma(left)).toBeGreaterThan(luma(right) + 10);
        const pillar = model([{ shape: "cone", at: [16, 0, 12], r0: 6, r1: 6, h: 14, color: "#c0c0c0" }]);
        expect(pixel(renderModel(pillar, { outline: false }), 16, 12).a).toBe(255);
        const cone = model([{ shape: "cone", at: [16, 0, 12], r0: 8, r1: 0, h: 16, color: "#c0c0c0" }]);
        const c = renderModel(cone, { outline: false });
        // Wide at the bottom, a point at the top.
        const width = (y: number) =>
            Array.from({ length: 32 }, (_, x) => pixel(c, x, y).a > 128).filter(Boolean).length;
        expect(width(16)).toBeGreaterThan(width(6) + 6);
    });

    it("turns a box around its centre", () => {
        const plank = model([box([4, 0, 8], [24, 4, 4], "#a0a0a0")]);
        const turned = model([box([4, 0, 8], [24, 4, 4], "#a0a0a0", { yaw: 90 })]);
        const solid = (m: Model3D) => {
            const r = renderModel(m, { outline: false });
            let n = 0;
            for (let i = 3; i < r.data.length; i += 4) if (r.data[i]! > 200) n++;
            return n;
        };
        expect(solid(plank)).toBeGreaterThan(0);
        // Same plank, turned a quarter: the same number of pixels whichever way it points (the top face is a 24 x 4 slab).
        expect(Math.abs(solid(turned) - solid(plank))).toBeLessThan(solid(plank) * 0.35);
    });

    it("measures where the shapes fall on the picture", () => {
        const bounds = modelBounds(crate);
        expect(bounds.x0).toBe(8);
        expect(bounds.x1).toBe(24);
        // Back top edge: z = 2, y = 10 -> 2 - 10 * 0.7 + 10; front bottom edge: z = 16, y = 0 -> 26.
        expect(bounds.y0).toBeCloseTo(2 - 10 * HEIGHT_SCALE + 10, 5);
        expect(bounds.y1).toBeCloseTo(26, 5);
    });
});

describe("the model format", () => {
    const ok = model([box([0, 0, 0], [4, 4, 4])]);

    it("accepts a valid model, with seats", () => {
        expect(Model3D.safeParse(ok).success).toBe(true);
        expect(Model3D.safeParse({ ...ok, seats: [{ x: 16, y: 20, direction: "Down" }] }).success).toBe(true);
    });

    it("refuses what the game could not draw", () => {
        const bad: unknown[] = [
            { ...ok, schema: "other" },
            { ...ok, width: 40 },
            { ...ok, height: 512 },
            { ...ok, depth: 31 },
            { ...ok, parts: [] },
            { ...ok, parts: [{ shape: "pyramid", at: [0, 0, 0], color: "#000000" }] },
            { ...ok, parts: [box([0, 0, 0], [4, 4, 4], "red")] },
            { ...ok, parts: [box([0, 0, 0], [4, 4, 4], "#000000", { opacity: 0 })] },
            { ...ok, seats: [{ x: 1, y: 1, direction: "North" }] },
            { ...ok, seats: Array.from({ length: 9 }, () => ({ x: 1, y: 1, direction: "Down" })) },
            { ...ok, parts: Array.from({ length: 401 }, () => box([0, 0, 0], [1, 1, 1])) },
        ];
        for (const value of bad)
            expect(Model3D.safeParse(value).success, JSON.stringify(value).slice(0, 80)).toBe(false);
    });
});
