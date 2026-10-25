import { describe, expect, it } from "vitest";
import { MODEL_SCHEMA, Model3D, modelBounds, renderModel } from "../../src/Model3D";

// The model code is the one of AdminSpace (kept identical by its model3d:sync): this checks it works here.
describe("the 3D model code of the play front", () => {
    const model = Model3D.parse({
        schema: MODEL_SCHEMA,
        width: 32,
        height: 32,
        depth: 20,
        parts: [
            { shape: "box", at: [8, 0, 2], size: [16, 10, 14], color: "#a0a0a0" },
            { shape: "ellipsoid", at: [16, 14, 9], r: [6, 4, 5], color: "#c5653f" },
        ],
        seats: [{ x: 16, y: 20, direction: "Down" }],
    });

    it("draws a model into a picture of its size", () => {
        const picture = renderModel(model);
        expect([picture.width, picture.height, picture.data.length]).toEqual([32, 32, 4096]);
        let solid = 0;
        for (let i = 3; i < picture.data.length; i += 4) if (picture.data[i] > 200) solid++;
        expect(solid).toBeGreaterThan(150);
        expect(picture.data[3]).toBe(0);
    });

    it("measures where the shapes fall, and refuses a model that is not valid", () => {
        expect(modelBounds(model).x0).toBe(8);
        expect(Model3D.safeParse({ ...model, width: 33 }).success).toBe(false);
        expect(Model3D.safeParse({ ...model, parts: [] }).success).toBe(false);
    });
});
