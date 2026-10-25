/**
 * The renderer of AdminSpace 3D models (see types.ts for the space they live in, and for where this file is shared).
 *
 * It follows the rays of the camera through the solid shapes of the model: for each pixel (and a few samples per pixel,
 * for smooth edges) it finds the nearest surface, lights it from one direction with a cast shadow, darkens it a little
 * near the ground, and draws a thin outline around the shapes. No graphics card is needed (the same code draws the
 * pictures of the catalog on a server and the furniture in the browser), the result only depends on the model, and a
 * 64 x 64 piece of furniture takes a few milliseconds.
 *
 * Camera: it looks along the direction (0, -1, -HEIGHT_SCALE): from above and from the front, so that the top and the
 * front of a box are seen, and the ground keeps its proportions. Light comes from the upper left, a little from the front.
 */
import type { Model3D, Part } from "./types";

type V3 = [number, number, number];

export interface RenderedModel {
    width: number;
    height: number;
    /** RGBA, 8 bits per channel, not premultiplied. */
    data: Uint8ClampedArray;
}

export interface RenderOptions {
    /** Samples per pixel along each axis (default 3: nine per pixel). */
    samples?: number;
    /** Draw a thin dark outline around the shapes and between the ones that overlap (default true). */
    outline?: boolean;
}

function normalize(v: V3): V3 {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
}

const LIGHT: V3 = normalize([-0.4, 0.9, 0.45]);
const AMBIENT = 0.58;
const DIFFUSE = 0.62;
const SHADOW_STRENGTH = 0.55;
const GROUND_SHADOW: V3 = [16, 18, 23];
/**
 * How many pixels up the picture one pixel of height goes. Below 1, tall things take less of the picture, as in the rest
 * of the map, where the ground is seen from nearly above.
 */
export const HEIGHT_SCALE = 0.7;
const CAMERA: V3 = [0, -1, -HEIGHT_SCALE];

function parseColor(hex: string): V3 {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const KIND_BOX = 0;
const KIND_CONE = 1;
const KIND_ELLIPSOID = 2;

interface Prepared {
    kind: number;
    rgb: V3;
    opacity: number;
    glow: number;
    /** The centre (box, ellipsoid) or the middle of the base (cone) in the world. */
    c: V3;
    /** World to local: scale^-1 * rotation^-1, row by row. */
    m: number[];
    /** Local to world for normals: rotation * scale^-1. */
    n: number[];
    /** Box: half sizes. */
    half: V3;
    /** Cone: radii at the base and at the top, height, change of radius per unit of height. */
    r0: number;
    r1: number;
    h: number;
    k: number;
    /** Bounds in the world: x, y, z minimum then maximum. */
    box: [number, number, number, number, number, number];
    /** Bounds on the picture. */
    sx0: number;
    sy0: number;
    sx1: number;
    sy1: number;
}

function rotation(yawDegrees: number): number[] {
    const a = (yawDegrees * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // x' = cos x + sin z ; z' = -sin x + cos z
    return [cos, 0, sin, 0, 1, 0, -sin, 0, cos];
}

function transpose(m: number[]): number[] {
    return [m[0]!, m[3]!, m[6]!, m[1]!, m[4]!, m[7]!, m[2]!, m[5]!, m[8]!];
}

/** m * diag(s) when `left` is false, diag(s) * m when it is true. */
function scaled(m: number[], s: V3, left: boolean): number[] {
    const out = m.slice();
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            out[row * 3 + col] = m[row * 3 + col]! * (left ? s[row]! : s[col]!);
        }
    }
    return out;
}

function prepare(part: Part, oy: number): Prepared {
    const yaw = part.yaw ?? 0;
    const rot = rotation(yaw);
    const rotInv = transpose(rot);
    const base = {
        rgb: parseColor(part.color),
        opacity: part.opacity ?? 1,
        glow: part.glow ?? 0,
        half: [0, 0, 0] as V3,
        r0: 0,
        r1: 0,
        h: 0,
        k: 0,
    };
    let kind = KIND_BOX;
    let c: V3;
    let scale: V3 = [1, 1, 1];
    let box: Prepared["box"];
    const cos = Math.abs(Math.cos((yaw * Math.PI) / 180));
    const sin = Math.abs(Math.sin((yaw * Math.PI) / 180));
    if (part.shape === "box") {
        const [x, y, z] = part.at;
        const [w, h, d] = part.size;
        c = [x + w / 2, y + h / 2, z + d / 2];
        base.half = [w / 2, h / 2, d / 2];
        const hx = cos * (w / 2) + sin * (d / 2);
        const hz = sin * (w / 2) + cos * (d / 2);
        box = [c[0] - hx, y, c[2] - hz, c[0] + hx, y + h, c[2] + hz];
    } else if (part.shape === "cone") {
        kind = KIND_CONE;
        c = [part.at[0], part.at[1], part.at[2]];
        const [sx, sz] = part.squash ?? [1, 1];
        scale = [sx, 1, sz];
        base.r0 = part.r0;
        base.r1 = part.r1;
        base.h = part.h;
        base.k = (part.r1 - part.r0) / part.h;
        const rmax = Math.max(part.r0, part.r1);
        const hx = Math.hypot(rmax * sx * Math.cos((yaw * Math.PI) / 180), rmax * sz * Math.sin((yaw * Math.PI) / 180));
        const hz = Math.hypot(rmax * sx * Math.sin((yaw * Math.PI) / 180), rmax * sz * Math.cos((yaw * Math.PI) / 180));
        box = [c[0] - hx, c[1], c[2] - hz, c[0] + hx, c[1] + part.h, c[2] + hz];
    } else {
        kind = KIND_ELLIPSOID;
        c = [part.at[0], part.at[1], part.at[2]];
        scale = [part.r[0], part.r[1], part.r[2]];
        const hx = Math.hypot(scale[0] * Math.cos((yaw * Math.PI) / 180), scale[2] * Math.sin((yaw * Math.PI) / 180));
        const hz = Math.hypot(scale[0] * Math.sin((yaw * Math.PI) / 180), scale[2] * Math.cos((yaw * Math.PI) / 180));
        box = [c[0] - hx, c[1] - scale[1], c[2] - hz, c[0] + hx, c[1] + scale[1], c[2] + hz];
    }
    const inverse: V3 = [1 / scale[0], 1 / scale[1], 1 / scale[2]];
    // Bounds on the picture. A box is exact at its corners. For round shapes the extent up and down the picture of an
    // ellipse of depth radius rz at height y is rz, and a ball of height radius ry adds HEIGHT_SCALE * ry to it.
    let sy0 = box[2] - box[4] * HEIGHT_SCALE + oy;
    let sy1 = box[5] - box[1] * HEIGHT_SCALE + oy;
    if (part.shape === "ellipsoid") {
        const hz = (box[5] - box[2]) / 2;
        const centre = c[2] - c[1] * HEIGHT_SCALE + oy;
        const reach = Math.hypot(hz, HEIGHT_SCALE * scale[1]);
        sy0 = centre - reach;
        sy1 = centre + reach;
    } else if (part.shape === "cone") {
        const rotate = (yaw * Math.PI) / 180;
        const reachAt = (radius: number) =>
            Math.hypot(radius * scale[0] * Math.sin(rotate), radius * scale[2] * Math.cos(rotate));
        const bottom = c[2] - c[1] * HEIGHT_SCALE + oy;
        const topY = c[2] - (c[1] + part.h) * HEIGHT_SCALE + oy;
        sy0 = Math.min(bottom - reachAt(part.r0), topY - reachAt(part.r1));
        sy1 = Math.max(bottom + reachAt(part.r0), topY + reachAt(part.r1));
    }
    return {
        ...base,
        kind,
        c,
        m: scaled(rotInv, inverse, true),
        n: scaled(rot, inverse, false),
        box,
        sx0: box[0],
        sx1: box[3],
        sy0,
        sy1,
    };
}

interface Hit {
    t: number;
    nx: number;
    ny: number;
    nz: number;
}

function apply(m: number[], x: number, y: number, z: number, out: V3): V3 {
    out[0] = m[0]! * x + m[1]! * y + m[2]! * z;
    out[1] = m[3]! * x + m[4]! * y + m[5]! * z;
    out[2] = m[6]! * x + m[7]! * y + m[8]! * z;
    return out;
}

const scratchO: V3 = [0, 0, 0];
const scratchD: V3 = [0, 0, 0];
const scratchN: V3 = [0, 0, 0];

function setNormal(p: Prepared, lx: number, ly: number, lz: number, hit: Hit): void {
    const n = apply(p.n, lx, ly, lz, scratchN);
    const length = Math.hypot(n[0], n[1], n[2]) || 1;
    hit.nx = n[0] / length;
    hit.ny = n[1] / length;
    hit.nz = n[2] / length;
}

/** The nearest surface of a part hit by the ray O + t D with t above `tMin`, or false. */
function hitPart(
    p: Prepared,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    tMin: number,
    hit: Hit,
): boolean {
    const o = apply(p.m, ox - p.c[0], oy - p.c[1], oz - p.c[2], scratchO);
    const d = apply(p.m, dx, dy, dz, scratchD);
    if (p.kind === KIND_BOX) {
        let t0 = -Infinity;
        let t1 = Infinity;
        let axis = -1;
        let sign = 0;
        for (let i = 0; i < 3; i++) {
            const half = p.half[i]!;
            if (Math.abs(d[i]!) < 1e-9) {
                if (Math.abs(o[i]!) > half) return false;
                continue;
            }
            let ta = (-half - o[i]!) / d[i]!;
            let tb = (half - o[i]!) / d[i]!;
            if (ta > tb) {
                const swap = ta;
                ta = tb;
                tb = swap;
            }
            if (ta > t0) {
                t0 = ta;
                axis = i;
                sign = d[i]! > 0 ? -1 : 1;
            }
            if (tb < t1) t1 = tb;
            if (t0 > t1) return false;
        }
        if (axis < 0 || t0 <= tMin) return false;
        hit.t = t0;
        setNormal(p, axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0, hit);
        return true;
    }
    if (p.kind === KIND_ELLIPSOID) {
        const a = d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!;
        const b = 2 * (o[0]! * d[0]! + o[1]! * d[1]! + o[2]! * d[2]!);
        const c = o[0]! * o[0]! + o[1]! * o[1]! + o[2]! * o[2]! - 1;
        const disc = b * b - 4 * a * c;
        if (disc < 0 || a < 1e-12) return false;
        const sq = Math.sqrt(disc);
        let t = (-b - sq) / (2 * a);
        if (t <= tMin) t = (-b + sq) / (2 * a);
        if (t <= tMin) return false;
        hit.t = t;
        setNormal(p, o[0]! + t * d[0]!, o[1]! + t * d[1]!, o[2]! + t * d[2]!, hit);
        return true;
    }
    // A cone with its top cut off.
    const { r0, k, h } = p;
    let best = Infinity;
    let which = 0;
    const consider = (t: number) => {
        if (t > tMin && t < best) {
            const y = o[1]! + t * d[1]!;
            if (y >= -1e-6 && y <= h + 1e-6 && r0 + k * y >= 0) {
                best = t;
                which = 1;
            }
        }
    };
    const ra = r0 + k * o[1]!;
    const rb = k * d[1]!;
    const a = d[0]! * d[0]! + d[2]! * d[2]! - rb * rb;
    const b = 2 * (o[0]! * d[0]! + o[2]! * d[2]! - ra * rb);
    const c = o[0]! * o[0]! + o[2]! * o[2]! - ra * ra;
    if (Math.abs(a) < 1e-9) {
        if (Math.abs(b) > 1e-12) consider(-c / b);
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sq = Math.sqrt(disc);
            consider((-b - sq) / (2 * a));
            consider((-b + sq) / (2 * a));
        }
    }
    if (Math.abs(d[1]!) > 1e-9) {
        for (const [planeY, radius, id] of [
            [0, r0, 2],
            [h, p.r1, 3],
        ] as const) {
            if (radius <= 0) continue;
            const t = (planeY - o[1]!) / d[1]!;
            if (t > tMin && t < best) {
                const x = o[0]! + t * d[0]!;
                const z = o[2]! + t * d[2]!;
                if (x * x + z * z <= radius * radius) {
                    best = t;
                    which = id;
                }
            }
        }
    }
    if (which === 0) return false;
    hit.t = best;
    if (which === 1) {
        const x = o[0]! + best * d[0]!;
        const y = o[1]! + best * d[1]!;
        const z = o[2]! + best * d[2]!;
        setNormal(p, x, -k * (r0 + k * y), z, hit);
    } else {
        setNormal(p, 0, which === 2 ? -1 : 1, 0, hit);
    }
    return true;
}

/** Whether the ray O + t D meets the bounds of a part. */
function hitsBounds(p: Prepared, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): boolean {
    let t0 = 0;
    let t1 = Infinity;
    const origin = [ox, oy, oz];
    const direction = [dx, dy, dz];
    for (let i = 0; i < 3; i++) {
        const lo = p.box[i]!;
        const hi = p.box[i + 3]!;
        if (Math.abs(direction[i]!) < 1e-9) {
            if (origin[i]! < lo || origin[i]! > hi) return false;
            continue;
        }
        let ta = (lo - origin[i]!) / direction[i]!;
        let tb = (hi - origin[i]!) / direction[i]!;
        if (ta > tb) {
            const swap = ta;
            ta = tb;
            tb = swap;
        }
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
        if (t0 > t1) return false;
    }
    return true;
}

function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

interface Scene {
    parts: Prepared[];
    oy: number;
    top: number;
    width: number;
    height: number;
}

const probe: Hit = { t: 0, nx: 0, ny: 0, nz: 0 };

/** Whether something solid stands between a point and the light (or any direction). */
function blocked(scene: Scene, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): boolean {
    for (const part of scene.parts) {
        if (part.opacity < 0.5) continue;
        if (!hitsBounds(part, ox, oy, oz, dx, dy, dz)) continue;
        if (hitPart(part, ox, oy, oz, dx, dy, dz, 1e-3, probe)) return true;
    }
    return false;
}

interface Sample {
    r: number;
    g: number;
    b: number;
    a: number;
    id: number;
    t: number;
}

const hit: Hit = { t: 0, nx: 0, ny: 0, nz: 0 };
const bestHit: Hit = { t: 0, nx: 0, ny: 0, nz: 0 };

function lit(scene: Scene, part: Prepared, px: number, py: number, h: Hit): V3 {
    // The point on the surface.
    const y = scene.top - h.t;
    const x = px;
    const z = py - scene.oy + HEIGHT_SCALE * (scene.top - h.t);
    let diffuse = Math.max(0, h.nx * LIGHT[0] + h.ny * LIGHT[1] + h.nz * LIGHT[2]);
    if (
        diffuse > 0 &&
        blocked(scene, x + h.nx * 0.05, y + h.ny * 0.05, z + h.nz * 0.05, LIGHT[0], LIGHT[1], LIGHT[2])
    ) {
        diffuse *= 1 - SHADOW_STRENGTH;
    }
    // A little darker close to the ground, so that things sit on it.
    const nearGround = 0.8 + 0.2 * clamp01(y / 18);
    let shade = (AMBIENT + DIFFUSE * diffuse) * nearGround;
    if (part.glow > 0) shade = shade * (1 - part.glow) + 1.12 * part.glow;
    return [Math.min(255, part.rgb[0] * shade), Math.min(255, part.rgb[1] * shade), Math.min(255, part.rgb[2] * shade)];
}

function shootCamera(scene: Scene, px: number, py: number, out: Sample): void {
    const ox = px;
    const oy = scene.top;
    const oz = py - scene.oy + HEIGHT_SCALE * scene.top;
    const skipped: number[] = [];
    let tMin = 0;
    // Layers seen through glass, nearest first, and what is behind them.
    const layers: { rgb: V3; opacity: number }[] = [];
    let base: { rgb: V3; alpha: number } | undefined;
    out.id = -1;
    out.t = Infinity;
    for (let step = 0; step < 5; step++) {
        let found = -1;
        bestHit.t = Infinity;
        for (let i = 0; i < scene.parts.length; i++) {
            const part = scene.parts[i]!;
            if (px < part.sx0 || px > part.sx1 || py < part.sy0 || py > part.sy1 || skipped.includes(i)) continue;
            if (hitPart(part, ox, oy, oz, CAMERA[0], CAMERA[1], CAMERA[2], tMin, hit) && hit.t < bestHit.t) {
                bestHit.t = hit.t;
                bestHit.nx = hit.nx;
                bestHit.ny = hit.ny;
                bestHit.nz = hit.nz;
                found = i;
            }
        }
        if (found < 0) break;
        const part = scene.parts[found]!;
        const rgb = lit(scene, part, px, py, bestHit);
        if (step === 0) {
            out.id = found;
            out.t = bestHit.t;
        }
        if (part.opacity >= 0.98) {
            base = { rgb, alpha: 1 };
            break;
        }
        layers.push({ rgb, opacity: part.opacity });
        skipped.push(found);
        tMin = bestHit.t + 1e-4;
    }
    if (!base) {
        // Nothing solid: the ground, which only shows the shadow of the model.
        const gx = px;
        const gz = py - scene.oy;
        let alpha = 0;
        if (gx >= 0 && gx <= scene.width && py >= 0 && py <= scene.height) {
            if (blocked(scene, gx, 0.05, gz, LIGHT[0], LIGHT[1], LIGHT[2])) alpha += 0.2;
            if (blocked(scene, gx, 0.05, gz, 0, 1, 0)) alpha += 0.22;
        }
        base = { rgb: GROUND_SHADOW, alpha };
    }
    let r = base.rgb[0] * base.alpha;
    let g = base.rgb[1] * base.alpha;
    let b = base.rgb[2] * base.alpha;
    let a = base.alpha;
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i]!;
        r = layer.rgb[0] * layer.opacity + r * (1 - layer.opacity);
        g = layer.rgb[1] * layer.opacity + g * (1 - layer.opacity);
        b = layer.rgb[2] * layer.opacity + b * (1 - layer.opacity);
        a = layer.opacity + a * (1 - layer.opacity);
    }
    out.r = r;
    out.g = g;
    out.b = b;
    out.a = a;
}

/**
 * Where the shapes of a model fall on its picture: the smallest box (in pixels) that holds them all. A model whose box
 * is not inside the picture would be cut off by it.
 */
export function modelBounds(model: Model3D): { x0: number; y0: number; x1: number; y1: number } {
    const oy = model.height - model.depth - 2;
    const parts = model.parts.map((part) => prepare(part, oy));
    return {
        x0: Math.min(...parts.map((p) => p.sx0)),
        y0: Math.min(...parts.map((p) => p.sy0)),
        x1: Math.max(...parts.map((p) => p.sx1)),
        y1: Math.max(...parts.map((p) => p.sy1)),
    };
}

/** Draws a model: a `width` x `height` picture, transparent around the furniture. */
export function renderModel(model: Model3D, options: RenderOptions = {}): RenderedModel {
    const samples = Math.max(1, Math.min(6, Math.floor(options.samples ?? 3)));
    const { width, height } = model;
    const oy = height - model.depth - 2;
    const parts = model.parts.map((part) => prepare(part, oy));
    const top = parts.reduce((max, part) => Math.max(max, part.box[4]), 0) + 2;
    const scene: Scene = { parts, oy, top, width, height };

    const count = width * height;
    const data = new Uint8ClampedArray(count * 4);
    const ids = new Int16Array(count).fill(-1);
    const depths = new Float32Array(count).fill(Infinity);
    const sample: Sample = { r: 0, g: 0, b: 0, a: 0, id: -1, t: Infinity };
    const total = samples * samples;
    const centre = Math.floor(samples / 2);

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            for (let v = 0; v < samples; v++) {
                for (let u = 0; u < samples; u++) {
                    shootCamera(scene, i + (u + 0.5) / samples, j + (v + 0.5) / samples, sample);
                    r += sample.r;
                    g += sample.g;
                    b += sample.b;
                    a += sample.a;
                    if (u === centre && v === centre) {
                        ids[j * width + i] = sample.id;
                        depths[j * width + i] = sample.t;
                    }
                }
            }
            const k = (j * width + i) * 4;
            if (a > 0) {
                data[k] = r / a;
                data[k + 1] = g / a;
                data[k + 2] = b / a;
                data[k + 3] = (a / total) * 255;
            }
        }
    }

    if (options.outline !== false) outline(data, ids, depths, width, height);
    return { width, height, data };
}

/** Darkens the edges between shapes at different depths, then draws a dark line just outside the silhouette. */
function outline(data: Uint8ClampedArray, ids: Int16Array, depths: Float32Array, width: number, height: number): void {
    // Between shapes: the one that is farther gets a dark edge.
    const darken = new Uint8Array(width * height);
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const here = j * width + i;
            for (const there of [i + 1 < width ? here + 1 : -1, j + 1 < height ? here + width : -1]) {
                if (there < 0 || ids[here]! < 0 || ids[there]! < 0 || ids[here] === ids[there]) continue;
                if (Math.abs(depths[here]! - depths[there]!) < 1.5) continue;
                darken[depths[here]! > depths[there]! ? here : there] = 1;
            }
        }
    }
    for (let p = 0; p < width * height; p++) {
        if (!darken[p]) continue;
        data[p * 4] = data[p * 4]! * 0.62;
        data[p * 4 + 1] = data[p * 4 + 1]! * 0.62;
        data[p * 4 + 2] = data[p * 4 + 2]! * 0.62;
    }
    // Around the silhouette: transparent pixels next to solid ones.
    const edge: { p: number; r: number; g: number; b: number }[] = [];
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const p = j * width + i;
            if (data[p * 4 + 3]! >= 90 || ids[p]! >= 0) continue;
            let best = -1;
            let strongest = 160;
            for (const [di, dj] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ] as const) {
                const ni = i + di;
                const nj = j + dj;
                if (ni < 0 || nj < 0 || ni >= width || nj >= height) continue;
                const q = nj * width + ni;
                if (ids[q]! >= 0 && data[q * 4 + 3]! > strongest) {
                    strongest = data[q * 4 + 3]!;
                    best = q;
                }
            }
            if (best >= 0) {
                edge.push({ p, r: data[best * 4]! * 0.3, g: data[best * 4 + 1]! * 0.3, b: data[best * 4 + 2]! * 0.3 });
            }
        }
    }
    for (const { p, r, g, b } of edge) {
        data[p * 4] = r;
        data[p * 4 + 1] = g;
        data[p * 4 + 2] = b;
        data[p * 4 + 3] = 230;
    }
}
