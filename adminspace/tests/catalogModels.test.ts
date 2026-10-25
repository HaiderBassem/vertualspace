/**
 * The 3D models of the built-in furniture: every piece has one for every variant, drawn inside its picture, the size of
 * the picture it replaces, with seats where people can sit, and the copy of the model code in WorkAdventure's play front
 * is the same as this one.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENTITIES } from "../scripts/catalog/furniture";
import { NATURE_ENTITIES } from "../scripts/catalog/nature";
import { MODELLED_COMPONENTS, modelOf } from "../scripts/catalog/models";
import { modelBounds, renderModel } from "../src/lib/catalog/model3d/render";
import { ComponentManifest } from "../src/lib/catalog/manifest";
import { Model3D } from "../src/lib/catalog/model3d/types";
import { readPackage } from "../src/lib/server/catalog/builtin";
import { validatePackage } from "../src/lib/server/catalog/validate";

const entities = [...ENTITIES, ...NATURE_ENTITIES];
const variants = entities.flatMap((entity) => entity.variants.map((variant) => ({ entity, variant })));

describe("the models of the built-in furniture", () => {
    it("exist for every component", () => {
        expect(entities.filter((e) => !MODELLED_COMPONENTS.includes(e.key)).map((e) => e.key)).toEqual([]);
        expect(variants.length).toBeGreaterThan(150);
    });

    it("are valid, fit their picture and have the size of the picture they replace", () => {
        const problems: string[] = [];
        for (const { entity, variant } of variants) {
            const model = modelOf(entity.key, { key: variant.key, color: variant.color, direction: variant.direction });
            const name = `${entity.key}/${variant.key}`;
            if (!model) {
                problems.push(`${name}: no model`);
                continue;
            }
            const parsed = Model3D.safeParse(model);
            if (!parsed.success) {
                problems.push(`${name}: ${parsed.error.issues[0]?.message}`);
                continue;
            }
            const sprite = variant.draw();
            // Seen from the side, a bench is narrow: its picture is a tall one.
            const sideBench =
                entity.key === "garden-bench" && (variant.direction === "Left" || variant.direction === "Right");
            if (!sideBench && (model.width !== sprite.width || model.height !== sprite.height)) {
                problems.push(
                    `${name}: ${model.width}x${model.height}, the picture was ${sprite.width}x${sprite.height}`,
                );
            }
            const b = modelBounds(model);
            if (b.x0 < -0.01 || b.y0 < -0.01 || b.x1 > model.width + 0.01 || b.y1 > model.height + 0.01) {
                problems.push(`${name}: leaves its picture (${JSON.stringify(b)})`);
            }
            for (const seat of model.seats ?? []) {
                if (seat.x < 0 || seat.x > model.width || seat.y < 0 || seat.y > model.height)
                    problems.push(`${name}: a seat is outside`);
            }
        }
        expect(problems).toEqual([]);
    });

    it("keep the variant keys of the catalog, so that furniture already placed still has its prefab", () => {
        const keys = new Set(variants.map(({ entity, variant }) => `${entity.key}/${variant.key}`));
        expect(keys.size).toBe(variants.length);
    });

    it("draw something in every picture", () => {
        for (const { entity, variant } of variants.filter((_, i) => i % 3 === 0)) {
            const model = modelOf(entity.key, {
                key: variant.key,
                color: variant.color,
                direction: variant.direction,
            })!;
            const r = renderModel(model, { samples: 1 });
            let solid = 0;
            for (let i = 3; i < r.data.length; i += 4) if (r.data[i]! > 128) solid++;
            expect(solid / (r.width * r.height), `${entity.key}/${variant.key}`).toBeGreaterThan(0.03);
        }
    });

    it("give seats to the furniture people sit on", () => {
        const seats = (component: string, key: string, direction: "Down" | "Up" | "Left" | "Right" = "Down") => {
            const entity = entities.find((e) => e.key === component)!;
            const variant = entity.variants.find((v) => v.key === key)!;
            return modelOf(component, { key, color: variant.color, direction })?.seats ?? [];
        };
        expect(seats("office-chair", "blue-down")).toHaveLength(1);
        expect(seats("beanbag", "blue")).toHaveLength(1);
        expect(seats("sofa", "blue-down")).toHaveLength(2);
        expect(seats("garden-bench", "oak-down")).toHaveLength(2);
        expect(seats("garden-bench", "oak-left", "Left")).toHaveLength(1);
        expect(seats("log-bench", "oak")).toHaveLength(2);
        const picnic = seats("picnic-table", "oak");
        expect(picnic.map((s) => s.direction)).toEqual(["Down", "Down", "Up", "Up"]);
        expect(seats("desk-classic", "oak")).toHaveLength(0);
        expect(seats("oak-tree", "summer")).toHaveLength(0);
        // A chair turned to face right has its person face right.
        expect(seats("office-chair", "blue-right", "Right")[0]?.direction).toBe("Right");
        expect(seats("office-chair", "blue-up", "Up")[0]?.direction).toBe("Up");
        expect(seats("office-chair", "blue-left", "Left")[0]?.direction).toBe("Left");
    });
});

describe("the published catalog", () => {
    it("has the model of every variant next to its picture, and validates", () => {
        for (const key of ["office-chair", "beanbag", "sofa", "garden-bench", "picnic-table", "oak-tree", "pond"]) {
            const { manifest, files } = readPackage(path.resolve("catalog/builtin", key));
            const result = validatePackage(manifest, files);
            expect(result.ok, `${key}: ${JSON.stringify(result.issues)}`).toBe(true);
            for (const variant of ComponentManifest.parse(manifest).entity?.variants ?? []) {
                expect(variant.model, `${key}/${variant.key}`).toBe(`${variant.key}.model.json`);
            }
        }
    });

    it("refuses a model that is broken, or that does not match its picture", () => {
        const { manifest, files } = readPackage(path.resolve("catalog/builtin", "beanbag"));
        const broken = new Map(files);
        broken.set("blue.model.json", Buffer.from("{not json"));
        expect(validatePackage(manifest, broken).issues.map((i) => i.code)).toContain("modelInvalid");

        const model = JSON.parse(files.get("blue.model.json")!.toString("utf8")) as Model3D;
        const wrongSize = new Map(files);
        wrongSize.set("blue.model.json", Buffer.from(JSON.stringify({ ...model, width: 64, height: 64 })));
        expect(validatePackage(manifest, wrongSize).issues.map((i) => i.code)).toContain("modelSize");

        const invalid = new Map(files);
        invalid.set("blue.model.json", Buffer.from(JSON.stringify({ ...model, parts: [] })));
        expect(validatePackage(manifest, invalid).issues.map((i) => i.code)).toContain("modelInvalid");
    });
});

describe("the copy in WorkAdventure", () => {
    const copy = path.resolve("../workadventure/libs/map-editor/src/Model3D");
    it.skipIf(!existsSync(copy))("is the same code (npm run model3d:sync copies it)", () => {
        for (const file of ["types.ts", "render.ts"]) {
            expect(readFileSync(path.join(copy, file), "utf8"), file).toBe(
                readFileSync(path.resolve("src/lib/catalog/model3d", file), "utf8"),
            );
        }
    });
});
