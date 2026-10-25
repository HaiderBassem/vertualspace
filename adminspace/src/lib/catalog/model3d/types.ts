/**
 * AdminSpace 3D models: a piece of furniture described as solid shapes in space, drawn by the renderer in `render.ts`.
 *
 * This file and `render.ts` are shared, byte for byte, with WorkAdventure's play front
 * (`workadventure/libs/map-editor/src/Model3D/`, kept in step by `npm run model3d:sync`): the catalog build draws the
 * pictures of the catalog with them, and the game draws the models itself when it loads a map.
 *
 * Space: x goes right, y goes up (height), z goes towards the viewer (south on the map). Everything is in pixels of the
 * map (one tile is 32 px). The footprint of a model is the box x in [0, width], z in [0, depth] on the ground (y = 0);
 * the picture is `width` x `height` pixels, with the front edge of the footprint two pixels above its bottom edge.
 * The camera looks from above and from the front, like the rest of the map: the ground is seen undistorted and the
 * height is drawn upwards, a little compressed (HEIGHT_SCALE in render.ts: 7 pixels up the picture per 10 of height).
 */
import { z } from "zod";

export const MODEL_SCHEMA = "adminspace.model/1";
/** Largest picture a model draws (pixels), and most shapes a model may have. */
export const MODEL_LIMITS = { pixels: 256, parts: 400, seats: 8 } as const;

const Vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const Color = z.string().regex(/^#[0-9a-f]{6}$/i);

const Look = {
    color: Color,
    /** Turn around the vertical axis through the centre of the shape, in degrees. */
    yaw: z.number().min(-360).max(360).optional(),
    /** 1 is solid. Lower lets what is behind show through (glass, water). */
    opacity: z.number().min(0.05).max(1).optional(),
    /** 0..1: how much the shape glows by itself (lamps, screens) instead of being lit by the light of the scene. */
    glow: z.number().min(0).max(1).optional(),
};

/** A box. `at` is its corner with the smallest x, y and z. */
export const BoxPart = z.object({ shape: z.literal("box"), at: Vec3, size: Vec3, ...Look });
/**
 * A cone with its top cut off, which is a cylinder when both radii are equal. `at` is the centre of its base; `squash`
 * stretches it along x and z to make an oval.
 */
export const ConePart = z.object({
    shape: z.literal("cone"),
    at: Vec3,
    r0: z.number().min(0),
    r1: z.number().min(0),
    h: z.number().positive(),
    squash: z.tuple([z.number().positive(), z.number().positive()]).optional(),
    ...Look,
});
/** An ellipsoid (a ball when the three radii are equal). `at` is its centre. */
export const EllipsoidPart = z.object({ shape: z.literal("ellipsoid"), at: Vec3, r: Vec3, ...Look });

export const Part = z.discriminatedUnion("shape", [BoxPart, ConePart, EllipsoidPart]);
export type Part = z.infer<typeof Part>;
export type BoxPart = z.infer<typeof BoxPart>;
export type ConePart = z.infer<typeof ConePart>;
export type EllipsoidPart = z.infer<typeof EllipsoidPart>;

export const ModelDirection = z.enum(["Left", "Up", "Down", "Right"]);

/**
 * A place to sit on the piece of furniture: where the body of the person is (pixels from the top-left corner of the
 * picture) and the way they face.
 */
export const ModelSeat = z.object({ x: z.number().finite(), y: z.number().finite(), direction: ModelDirection });
export type ModelSeat = z.infer<typeof ModelSeat>;

export const Model3D = z
    .object({
        schema: z.literal(MODEL_SCHEMA),
        /** Size of the picture, in pixels (whole 32 px cells, like every entity of WorkAdventure). */
        width: z.number().int().min(32).max(MODEL_LIMITS.pixels).multipleOf(32),
        height: z.number().int().min(32).max(MODEL_LIMITS.pixels).multipleOf(32),
        /** How deep the footprint is on the ground (z from 0 to depth). */
        depth: z.number().min(1).max(MODEL_LIMITS.pixels),
        parts: z.array(Part).min(1).max(MODEL_LIMITS.parts),
        seats: z.array(ModelSeat).max(MODEL_LIMITS.seats).optional(),
    })
    .refine((model) => model.depth + 2 <= model.height, { message: "the footprint must fit in the picture" });
export type Model3D = z.infer<typeof Model3D>;
