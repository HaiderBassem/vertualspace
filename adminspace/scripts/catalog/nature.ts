/**
 * AdminSpace's original nature set: places to sit outdoors, trees, hedges, flowers, water and stone, drawn in code
 * with the same conventions as furniture.ts (32 px grid, 3/4 top-down view, hard pixels, collision rows in front
 * and a sorting line moved to the first blocking row).
 *
 * Pieces to sit on are named for what they are ("Beanbag", "Garden bench"...): WorkAdventure offers a seat on any
 * piece of furniture whose name says it is one (libs/map-editor/src/PersonalDesk/Seats.ts).
 */
import { Canvas, shade, type Color } from "./canvas";
import type { Direction } from "../../src/lib/catalog/manifest";
import type { EntityDefinition, Localized } from "./furniture";

const L = (en: string, fr: string, de: string, es: string, ar: string): Localized => ({ en, fr, de, es, ar });
const ALL_DIRECTIONS: Direction[] = ["Down", "Up", "Left", "Right"];

const INK = "#1d2a21";
const BARK = { light: "#8a5e3b", mid: "#6b4a2b", dark: "#432c19" };
const STONE = { light: "#c4c8c9", mid: "#9aa0a3", dark: "#5f6669", moss: "#5f8f4e" };
const WATER = { light: "#8fd3ef", mid: "#4aa3d6", deep: "#2c6fa8" };

/** Small deterministic generator: the same art on every run, so `git diff` shows real changes only. */
function rng(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

const WOODS = {
    oak: { top: "#d6a46b", front: "#b07c45", line: "#5c3b1d" },
    walnut: { top: "#96613f", front: "#73452a", line: "#3b2214" },
    white: { top: "#f2f3f5", front: "#d2d7de", line: "#6f7682" },
} as const;
type Wood = keyof typeof WOODS;

// ---------------------------------------------------------------------------------------------
// Foliage
// ---------------------------------------------------------------------------------------------

interface Foliage {
    dark: Color;
    base: Color;
    light: Color;
    spark: Color;
}

const GREEN: Foliage = { dark: "#245c3a", base: "#3a8a4f", light: "#62b062", spark: "#8fd37f" };
const AUTUMN: Foliage = { dark: "#9a3f1c", base: "#d1722b", light: "#e8a03a", spark: "#f5cf5c" };
const BLOSSOM: Foliage = { dark: "#b5557a", base: "#e58fb0", light: "#f6bfd3", spark: "#fff0f5" };
const PINE: Foliage = { dark: "#1c4a33", base: "#2c6a46", light: "#46885a", spark: "#6fae77" };

/** Whether a pixel touches transparency (the outline of a shape). */
function isRim(c: Canvas, x: number, y: number): boolean {
    return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ].some(([dx, dy]) => (c.data[((y + dy!) * c.width + x + dx!) * 4 + 3] ?? 0) === 0);
}

/** A round mass of leaves: dark rim, lit top-left, speckles of light. */
function canopy(c: Canvas, x: number, y: number, w: number, h: number, f: Foliage, seed: number): void {
    const random = rng(seed);
    const lobes = 7;
    const parts: [number, number, number, number][] = [];
    for (let i = 0; i < lobes; i++) {
        const lw = w * (0.42 + random() * 0.18);
        const lh = h * (0.42 + random() * 0.18);
        parts.push([x + random() * (w - lw), y + random() * (h - lh), lw, lh]);
    }
    parts.push([x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6]);
    for (const [px, py, pw, ph] of parts) c.ellipse(px - 1, py - 1, pw + 2, ph + 2, INK);
    for (const [px, py, pw, ph] of parts) c.ellipse(px, py, pw, ph, f.base);
    for (const [px, py, pw, ph] of parts) c.ellipse(px + pw * 0.08, py + ph * 0.02, pw * 0.7, ph * 0.5, f.light);
    for (const [px, py, pw, ph] of parts.slice(0, 4))
        c.ellipse(px + pw * 0.3, py + ph * 0.62, pw * 0.6, ph * 0.34, f.dark);
    for (let i = 0; i < w * 0.9; i++) {
        const sx = Math.floor(x + random() * w);
        const sy = Math.floor(y + random() * h * 0.7);
        // Light only falls on leaves, never in the air around the tree.
        if (c.data[(sy * c.width + sx) * 4 + 3]! === 255 && !isRim(c, sx, sy)) c.pixel(sx, sy, f.spark);
    }
}

function trunk(c: Canvas, x: number, y: number, w: number, h: number): void {
    c.rect(x - 1, y, w + 2, h, INK);
    c.rect(x, y, w, h, BARK.mid);
    c.rect(x, y, Math.ceil(w / 3), h, BARK.light);
    c.rect(x + w - 3, y, 3, h, BARK.dark);
    for (let j = y + 3; j < y + h; j += 5) c.hline(x + 2, j, 2, BARK.dark);
    // Roots.
    c.rect(x - 3, y + h - 3, 4, 3, BARK.mid);
    c.rect(x + w - 1, y + h - 3, 4, 3, BARK.dark);
}

function oakTree(foliage: Foliage, seed: number): Canvas {
    const c = new Canvas(64, 96);
    c.shadow(10, 80, 44, 12);
    trunk(c, 27, 58, 10, 30);
    canopy(c, 3, 3, 58, 62, foliage, seed);
    return c;
}

function pineTree(foliage: Foliage, snow: boolean): Canvas {
    const c = new Canvas(64, 96);
    c.shadow(12, 82, 40, 10);
    trunk(c, 28, 74, 8, 14);
    const tiers: [number, number, number][] = [
        [32, 2, 10],
        [32, 17, 15],
        [32, 33, 20],
        [32, 50, 25],
    ];
    for (const [cx, top, half] of tiers) {
        const height = Math.round(half * 1.15);
        for (let j = 0; j < height; j++) {
            const span = Math.round((half * (j + 1)) / height);
            c.rect(cx - span - 1, top + j, span * 2 + 2, 1, INK);
        }
        for (let j = 0; j < height; j++) {
            const span = Math.round((half * (j + 1)) / height);
            c.rect(cx - span, top + j, span * 2, 1, j % 6 < 3 ? foliage.base : foliage.dark);
            c.rect(cx - span, top + j, Math.max(1, Math.floor(span / 2)), 1, foliage.light);
            if (snow && j < height * 0.4) c.rect(cx - span + 1, top + j, span * 2 - 2, 1, "#f4f8fb");
        }
    }
    return c;
}

function bush(foliage: Foliage, bloom: Color | undefined, seed: number): Canvas {
    const c = new Canvas(32, 32);
    c.shadow(2, 22, 28, 8);
    canopy(c, 2, 8, 28, 20, foliage, seed);
    if (bloom) {
        const random = rng(seed + 11);
        for (let i = 0; i < 9; i++) {
            const x = 5 + Math.floor(random() * 21);
            const y = 11 + Math.floor(random() * 13);
            if (c.data[(y * c.width + x) * 4 + 3]! === 255) {
                c.rect(x, y, 2, 2, bloom);
                c.pixel(x, y, shade(bloom, 0.5));
            }
        }
    }
    return c;
}

function hedge(foliage: Foliage, bloom: Color | undefined, seed: number): Canvas {
    const c = new Canvas(64, 32);
    c.shadow(2, 24, 60, 7);
    c.box(1, 6, 62, 22, INK, INK);
    c.rect(2, 7, 60, 20, foliage.base);
    c.rect(2, 7, 60, 6, foliage.light);
    c.rect(2, 21, 60, 6, foliage.dark);
    const random = rng(seed);
    for (let i = 0; i < 70; i++) {
        const tone = [foliage.light, foliage.dark, foliage.spark][Math.floor(random() * 3)]!;
        c.rect(3 + random() * 57, 8 + random() * 17, 2, 1, tone);
    }
    for (let x = 6; x < 60; x += 9) c.pixel(x, 5, INK);
    if (bloom) {
        for (let i = 0; i < 16; i++) {
            const x = 4 + Math.floor(random() * 56);
            const y = 9 + Math.floor(random() * 15);
            c.rect(x, y, 2, 2, bloom);
        }
    }
    return c;
}

// ---------------------------------------------------------------------------------------------
// Flowers, planters, indoor greenery
// ---------------------------------------------------------------------------------------------

function soilBed(c: Canvas, x: number, y: number, w: number, h: number, edge: Color): void {
    c.box(x, y, w, h, "#5b4026", shade(edge, -0.5));
    c.rect(x + 1, y + 1, w - 2, 2, "#6b4d2f");
    for (let i = x + 1; i < x + w - 1; i += 6) {
        c.rect(i, y + h - 4, 5, 3, shade(edge, 0.05));
        c.hline(i, y + h - 4, 5, shade(edge, 0.3));
    }
}

function flowerBed(kind: "tulips" | "daisies" | "lavender"): Canvas {
    const c = new Canvas(64, 32);
    c.shadow(3, 24, 58, 6);
    soilBed(c, 2, 12, 60, 16, STONE.mid);
    const random = rng(kind.length * 31);
    const leaf = "#3f8a4f";
    for (let i = 0; i < 12; i++) {
        const x = 6 + i * 4.6;
        const base = 24 - (i % 3) * 2;
        const top = base - 9 - (i % 4);
        c.vline(x, top, base - top, leaf);
        if (kind === "tulips") {
            const color = ["#d94a4a", "#f2c53d", "#e86aa0"][i % 3]!;
            c.rect(x - 2, top - 3, 5, 5, color);
            c.rect(x - 1, top - 4, 3, 1, shade(color, 0.3));
            c.pixel(x, top + 2, shade(color, -0.3));
        } else if (kind === "daisies") {
            c.rect(x - 2, top - 2, 5, 5, "#fbfcfd");
            c.rect(x - 1, top - 1, 3, 3, "#f2c53d");
            c.pixel(x - 3, top, "#fbfcfd");
            c.pixel(x + 3, top, "#fbfcfd");
        } else {
            const color = ["#8b6bd0", "#7556c0", "#a58be0"][i % 3]!;
            for (let j = 0; j < 7; j++) c.rect(x - 1 + (j % 2), top - 2 + j, 2, 1, color);
            c.vline(x, top + 5, 3, leaf);
        }
        void random;
    }
    return c;
}

function planterBox(crop: "herbs" | "vegetables", wood: Wood): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(64, 32);
    c.shadow(3, 25, 58, 6);
    c.box(2, 14, 60, 14, w.front, w.line);
    c.rect(3, 15, 58, 3, w.top);
    c.hline(3, 20, 58, shade(w.front, -0.2));
    c.hline(3, 24, 58, shade(w.front, -0.2));
    c.rect(3, 11, 58, 5, "#5b4026");
    const random = rng(crop.length * 17);
    for (let i = 0; i < 9; i++) {
        const x = 6 + i * 6.2;
        if (crop === "herbs") {
            const tone = ["#4aa05a", "#6bbd6a", "#3a8a4f"][i % 3]!;
            c.ellipse(x - 3, 3 + (i % 2) * 2, 7, 9, tone);
            c.ellipse(x - 2, 4 + (i % 2) * 2, 4, 4, shade(tone, 0.3));
        } else {
            const color = i % 3 === 0 ? "#d94a4a" : i % 3 === 1 ? "#e8923a" : "#7cc27a";
            c.vline(x, 4, 8, "#3f8a4f");
            c.ellipse(x - 2, 4 + (i % 2) * 2, 5, 5, color);
            c.pixel(x - 1, 5 + (i % 2) * 2, shade(color, 0.5));
        }
        void random;
    }
    return c;
}

const POTS = { terracotta: "#c46b41", white: "#e9ebee", charcoal: "#40444c" } as const;
type Pot = keyof typeof POTS;

function pot(c: Canvas, x: number, y: number, w: number, h: number, color: Color): void {
    c.box(x, y, w, h, color, shade(color, -0.5));
    c.hline(x + 1, y + 1, w - 2, shade(color, 0.25));
    c.rect(x + 1, y + 2, w - 2, 2, shade(color, -0.15));
}

function frond(
    c: Canvas,
    x: number,
    y: number,
    dx: number,
    dy: number,
    length: number,
    tone: Color,
    light: Color,
): void {
    // The rib curves down towards its tip; leaflets hang off both sides of it.
    const norm = Math.hypot(dx, dy) || 1;
    const nx = -dy / norm;
    const ny = dx / norm;
    for (let i = 0; i < length; i++) {
        const t = i / length;
        const px = x + dx * i;
        const py = y + dy * i + t * t * length * 0.7;
        c.rect(px, py, 2, 2, tone);
        const leaflet = Math.round(2 + 3 * Math.sin(t * Math.PI));
        for (let k = 1; k <= leaflet; k++) {
            c.pixel(px + nx * k, py + ny * k + k * 0.6, k === leaflet ? light : tone);
            c.pixel(px - nx * k, py - ny * k + k * 0.6, k === leaflet ? light : tone);
        }
    }
}

function palm(potColor: Pot): Canvas {
    const c = new Canvas(64, 96);
    c.shadow(16, 82, 32, 10);
    c.rect(30, 34, 4, 46, BARK.mid);
    c.rect(30, 34, 1, 46, BARK.light);
    for (let y = 38; y < 78; y += 6) c.hline(30, y, 4, BARK.dark);
    const fronds: [number, number][] = [
        [-1.6, -0.6],
        [-1.2, -1.0],
        [-0.6, -1.3],
        [0, -1.4],
        [0.6, -1.3],
        [1.2, -1.0],
        [1.6, -0.6],
    ];
    for (const [dx, dy] of fronds) frond(c, 32, 36, dx * 1.4, dy * 1.6, 18, "#2f7a45", "#6bbd6a");
    for (const [dx, dy] of fronds) frond(c, 32, 36, dx * 1.1, dy * 1.3 + 0.2, 13, "#46985a", "#8fd37f");
    pot(c, 20, 74, 24, 18, POTS[potColor]);
    c.rect(21, 76, 22, 2, "#5b4026");
    return c;
}

function fern(potColor: Pot): Canvas {
    const c = new Canvas(32, 32);
    c.shadow(5, 25, 22, 6);
    const arcs: [number, number][] = [
        [-1.5, -0.2],
        [-1.1, -0.7],
        [-0.5, -1],
        [0.5, -1],
        [1.1, -0.7],
        [1.5, -0.2],
    ];
    for (const [dx, dy] of arcs) frond(c, 16, 18, dx * 1.2, dy * 1.2, 11, "#2f7a45", "#7cc27a");
    pot(c, 9, 17, 14, 11, POTS[potColor]);
    return c;
}

function bamboo(): Canvas {
    const c = new Canvas(32, 64);
    c.shadow(5, 55, 22, 7);
    const stalks: [number, number, number][] = [
        [9, 6, 46],
        [15, 2, 50],
        [21, 8, 44],
    ];
    for (const [x, top, height] of stalks) {
        c.rect(x - 1, top, 5, height, INK);
        c.rect(x, top, 3, height, "#79b24f");
        c.vline(x, top, height, "#a6d36f");
        c.vline(x + 2, top, height, "#4f8a35");
        for (let j = top + 8; j < top + height; j += 9) c.hline(x - 1, j, 5, "#3d6e2a");
        // Leaves.
        for (const [lx, ly, dir] of [
            [x + 3, top + 6, 1],
            [x - 1, top + 14, -1],
            [x + 3, top + 24, 1],
        ] as const) {
            for (let i = 0; i < 7; i++) c.rect(lx + dir * i, ly + (i > 3 ? i - 3 : 0), 2, 1, "#4aa05a");
        }
    }
    pot(c, 4, 48, 24, 14, "#40444c");
    c.rect(5, 50, 22, 2, "#5b4026");
    return c;
}

// ---------------------------------------------------------------------------------------------
// Water and stone
// ---------------------------------------------------------------------------------------------

function pond(kind: "lilies" | "koi"): Canvas {
    const c = new Canvas(96, 64);
    c.shadow(4, 52, 88, 10);
    // Rim of stones, then water with a darker middle.
    c.ellipse(2, 6, 92, 52, STONE.dark);
    c.ellipse(3, 7, 90, 49, STONE.mid);
    const random = rng(kind.length * 13);
    for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        const x = 47 + Math.cos(t) * 44;
        const y = 32 + Math.sin(t) * 24;
        c.ellipse(x - 3, y - 2, 7, 5, a % 3 === 0 ? STONE.light : STONE.mid);
        c.ellipse(x - 3, y, 7, 3, STONE.dark);
        void random;
    }
    c.ellipse(8, 12, 80, 40, WATER.mid);
    c.ellipse(14, 16, 68, 30, WATER.deep);
    c.ellipse(18, 17, 40, 10, WATER.light);
    c.hline(30, 22, 18, "#e6f7ff");
    c.hline(52, 38, 10, "#e6f7ff");
    if (kind === "lilies") {
        for (const [x, y, s] of [
            [24, 28, 11],
            [50, 22, 13],
            [62, 32, 10],
            [38, 36, 9],
        ] as const) {
            c.ellipse(x, y, s, Math.round(s * 0.6), "#3f8a4f");
            c.ellipse(x + 1, y, s - 3, Math.round(s * 0.6) - 2, "#5db062");
            c.rect(x + s - 4, y + 1, 4, 2, WATER.deep);
        }
        for (const [x, y] of [
            [53, 24],
            [27, 29],
        ] as const) {
            c.ellipse(x - 3, y - 3, 7, 5, "#f6bfd3");
            c.rect(x - 1, y - 3, 3, 3, "#fff0f5");
            c.pixel(x, y - 1, "#f2c53d");
        }
    } else {
        for (const [x, y, flip] of [
            [30, 26, false],
            [58, 34, true],
            [44, 22, false],
        ] as const) {
            const fish = new Canvas(16, 8);
            fish.ellipse(2, 2, 11, 5, "#f08a3c");
            fish.rect(10, 3, 3, 3, "#fbfcfd");
            fish.rect(0, 3, 3, 3, "#d96a22");
            fish.pixel(11, 3, "#1d2a21");
            c.draw(flip ? fish.flipped() : fish, x, y);
        }
        c.ellipse(60, 22, 12, 8, "#3f8a4f");
        c.ellipse(61, 22, 9, 5, "#5db062");
    }
    return c;
}

function rockCluster(tone: "gray" | "mossy" | "sand"): Canvas {
    const c = new Canvas(64, 32);
    c.shadow(2, 22, 60, 8);
    const base =
        tone === "sand"
            ? { l: "#e6d6ae", m: "#c9b583", d: "#8f7d52" }
            : { l: STONE.light, m: STONE.mid, d: STONE.dark };
    const rocks: [number, number, number, number][] = [
        [3, 12, 24, 15],
        [22, 6, 28, 21],
        [44, 13, 17, 13],
    ];
    for (const [x, y, w, h] of rocks) {
        c.ellipse(x - 1, y - 1, w + 2, h + 2, INK);
        c.ellipse(x, y, w, h, base.m);
        c.ellipse(x + 2, y + 1, Math.round(w * 0.6), Math.round(h * 0.45), base.l);
        c.ellipse(x + Math.round(w * 0.3), y + Math.round(h * 0.6), Math.round(w * 0.65), Math.round(h * 0.38), base.d);
        if (tone === "mossy") {
            c.ellipse(x + 1, y + 1, Math.round(w * 0.55), Math.round(h * 0.3), STONE.moss);
            c.pixel(x + 3, y + 3, "#8fd37f");
        }
    }
    return c;
}

function steppingStones(tone: "gray" | "sand"): Canvas {
    const c = new Canvas(32, 32);
    const base =
        tone === "sand"
            ? { l: "#e6d6ae", m: "#c9b583", d: "#8f7d52" }
            : { l: STONE.light, m: STONE.mid, d: STONE.dark };
    for (const [x, y, w, h] of [
        [3, 3, 13, 11],
        [17, 8, 12, 10],
        [6, 18, 14, 11],
    ] as const) {
        c.ellipse(x - 1, y, w + 2, h + 1, base.d);
        c.ellipse(x, y, w, h, base.m);
        c.ellipse(x + 1, y + 1, w - 4, Math.round(h / 2), base.l);
    }
    return c;
}

function grassPatch(kind: "meadow" | "clover" | "wildflowers"): Canvas {
    const c = new Canvas(32, 32);
    const base = kind === "clover" ? "#4f9a52" : "#5aa24a";
    c.rect(0, 0, 32, 32, base);
    const random = rng(kind.length * 7 + 3);
    for (let i = 0; i < 90; i++) {
        const x = Math.floor(random() * 32);
        const y = Math.floor(random() * 30);
        const tone = random() < 0.5 ? shade(base, 0.18) : shade(base, -0.16);
        c.vline(x, y, 2, tone);
    }
    if (kind === "clover") {
        for (let i = 0; i < 7; i++) {
            const x = 3 + Math.floor(random() * 26);
            const y = 3 + Math.floor(random() * 26);
            c.rect(x, y, 2, 2, "#6dbb64");
            c.rect(x + 2, y + 1, 2, 2, "#6dbb64");
            c.rect(x + 1, y + 2, 2, 2, "#6dbb64");
        }
    }
    if (kind === "wildflowers") {
        const colors = ["#f6e45a", "#ffffff", "#e87aa6", "#9a7ae0"];
        for (let i = 0; i < 11; i++) {
            const x = 2 + Math.floor(random() * 27);
            const y = 2 + Math.floor(random() * 26);
            c.rect(x, y, 2, 2, colors[i % colors.length]!);
            c.pixel(x, y + 2, "#2f7a45");
        }
    }
    return c;
}

function fountain(tone: "stone" | "sandstone"): Canvas {
    const c = new Canvas(64, 96);
    const s =
        tone === "stone"
            ? { l: STONE.light, m: STONE.mid, d: STONE.dark }
            : { l: "#ecd9ae", m: "#cbb384", d: "#8f7d52" };
    c.shadow(4, 80, 56, 12);
    // Basin.
    c.ellipse(2, 44, 60, 44, INK);
    c.ellipse(3, 45, 58, 40, s.d);
    c.ellipse(3, 43, 58, 38, s.m);
    c.ellipse(3, 42, 58, 34, s.l);
    c.ellipse(8, 47, 48, 26, WATER.deep);
    c.ellipse(9, 48, 46, 22, WATER.mid);
    c.ellipse(14, 50, 24, 7, WATER.light);
    // Column and upper bowl.
    c.rect(28, 28, 8, 34, INK);
    c.rect(29, 28, 6, 34, s.m);
    c.rect(29, 28, 2, 34, s.l);
    c.ellipse(16, 20, 32, 16, INK);
    c.ellipse(17, 21, 30, 13, s.m);
    c.ellipse(19, 22, 26, 9, WATER.mid);
    c.ellipse(22, 22, 12, 4, WATER.light);
    // Jet and drops.
    c.rect(31, 6, 2, 16, "#cdeefb");
    c.rect(30, 4, 4, 4, "#e6f7ff");
    for (const [x, y] of [
        [24, 10],
        [38, 11],
        [20, 16],
        [43, 16],
        [27, 5],
        [36, 6],
    ] as const) {
        c.rect(x, y, 2, 2, "#bfe6f6");
    }
    return c;
}

function picnicTable(wood: Wood): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(64, 64);
    c.shadow(2, 54, 60, 9);
    // Back bench, table, front bench.
    c.box(4, 12, 56, 7, w.front, w.line);
    c.rect(5, 13, 54, 2, w.top);
    c.rect(8, 18, 3, 8, shade(w.front, -0.3));
    c.rect(53, 18, 3, 8, shade(w.front, -0.3));
    c.box(2, 20, 60, 20, w.top, w.line);
    c.rect(3, 33, 58, 6, w.front);
    for (const x of [14, 26, 38, 50]) c.vline(x, 21, 12, shade(w.top, -0.12));
    c.rect(6, 38, 4, 12, shade(w.front, -0.3));
    c.rect(54, 38, 4, 12, shade(w.front, -0.3));
    c.box(4, 46, 56, 8, w.front, w.line);
    c.rect(5, 47, 54, 2, w.top);
    return c;
}

function gardenLantern(finish: "black" | "copper"): Canvas {
    const metal = finish === "black" ? "#2a2d33" : "#b8693a";
    const c = new Canvas(32, 64);
    c.ellipse(1, 2, 30, 28, "#fff1a833");
    c.ellipse(5, 6, 22, 18, "#fff1a833");
    c.shadow(8, 57, 16, 5);
    c.rect(13, 58, 6, 3, metal);
    c.rect(15, 24, 2, 34, metal);
    c.rect(14, 38, 4, 2, shade(metal, 0.25));
    c.box(9, 8, 14, 17, metal, shade(metal, -0.5));
    c.rect(11, 11, 10, 11, "#fff7c9");
    c.rect(13, 13, 6, 7, "#ffe27a");
    c.hline(10, 7, 12, shade(metal, 0.25));
    c.rect(14, 4, 4, 3, metal);
    return c;
}

// ---------------------------------------------------------------------------------------------
// Places to sit
// ---------------------------------------------------------------------------------------------

const BEANBAGS = {
    terracotta: "#c5653f",
    blue: "#4060c8",
    green: "#3f8b69",
    mustard: "#d9a63a",
    plum: "#7a4f8f",
} as const;
type Beanbag = keyof typeof BEANBAGS;

function beanbag(color: Beanbag): Canvas {
    const f = BEANBAGS[color];
    const c = new Canvas(32, 32);
    c.shadow(3, 23, 26, 7);
    c.ellipse(3, 9, 26, 19, shade(f, -0.55));
    c.ellipse(4, 9, 24, 18, shade(f, -0.18));
    c.ellipse(4, 7, 24, 17, f);
    c.ellipse(9, 9, 14, 8, shade(f, -0.14));
    c.ellipse(7, 8, 9, 5, shade(f, 0.25));
    c.vline(16, 12, 11, shade(f, -0.32));
    c.pixel(15, 11, shade(f, -0.4));
    c.pixel(17, 11, shade(f, -0.4));
    return c;
}

function benchSlats(c: Canvas, x: number, y: number, w: number, rows: number, wood: (typeof WOODS)[Wood]): void {
    for (let i = 0; i < rows; i++) {
        c.rect(x, y + i * 4, w, 3, wood.top);
        c.hline(x, y + i * 4, w, shade(wood.top, 0.25));
        c.hline(x, y + i * 4 + 2, w, wood.front);
        c.hline(x, y + i * 4 + 3, w, wood.line);
    }
}

function gardenBench(wood: Wood, direction: Direction): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(64, 32);
    c.shadow(3, 24, 58, 7);
    const metal = "#2f3238";
    if (direction === "Up") {
        // Seen from behind: the backrest in front, the seat just visible above it.
        c.rect(5, 6, 54, 4, shade(w.top, -0.08));
        c.rect(6, 10, 3, 16, metal);
        c.rect(55, 10, 3, 16, metal);
        benchSlats(c, 4, 9, 56, 4, w);
        c.rect(4, 8, 3, 18, metal);
        c.rect(57, 8, 3, 18, metal);
    } else if (direction === "Down") {
        benchSlats(c, 4, 3, 56, 3, w);
        c.rect(5, 2, 3, 20, metal);
        c.rect(56, 2, 3, 20, metal);
        c.box(3, 14, 58, 8, w.front, w.line);
        c.rect(4, 15, 56, 2, w.top);
        c.rect(6, 22, 3, 6, metal);
        c.rect(55, 22, 3, 6, metal);
    } else {
        // Side view: the long bench turned, drawn as a short one with its back on one side.
        const side = new Canvas(64, 32);
        side.shadow(3, 24, 58, 7);
        side.box(12, 14, 44, 8, w.front, w.line);
        side.rect(13, 15, 42, 2, w.top);
        side.rect(14, 22, 3, 6, metal);
        side.rect(50, 22, 3, 6, metal);
        side.box(8, 3, 6, 20, shade(w.front, -0.1), w.line);
        side.rect(9, 5, 4, 2, w.top);
        side.rect(9, 10, 4, 2, w.top);
        return direction === "Right" ? side : side.flipped();
    }
    return c;
}

const STUMPS = {
    oak: { top: "#d9aa6c", ring: "#b98648", bark: "#6b4a2b", mark: "#432c19" },
    birch: { top: "#efe3c4", ring: "#d3c08f", bark: "#e4e1d8", mark: "#2f2f33" },
} as const;
type Stump = keyof typeof STUMPS;

function stumpStool(kind: Stump): Canvas {
    const s = STUMPS[kind];
    const c = new Canvas(32, 32);
    c.shadow(4, 23, 24, 7);
    c.rect(6, 13, 20, 10, INK);
    c.ellipse(5, 18, 22, 10, INK);
    c.rect(7, 13, 18, 10, s.bark);
    c.ellipse(6, 18, 20, 8, s.bark);
    c.vline(10, 14, 9, shade(s.bark, -0.25));
    c.vline(16, 14, 11, shade(s.bark, 0.2));
    c.vline(22, 14, 9, shade(s.bark, -0.25));
    if (kind === "birch")
        for (const [x, y] of [
            [9, 17],
            [18, 19],
            [21, 15],
        ] as const)
            c.rect(x, y, 3, 1, s.mark);
    c.ellipse(5, 8, 22, 12, INK);
    c.ellipse(6, 9, 20, 10, s.top);
    c.ellipse(9, 11, 14, 6, s.ring);
    c.ellipse(11, 12, 10, 4, s.top);
    c.ellipse(13, 13, 5, 2, s.ring);
    c.pixel(16, 13, shade(s.ring, -0.3));
    return c;
}

function logBench(kind: Stump): Canvas {
    const s = STUMPS[kind];
    const c = new Canvas(64, 32);
    c.shadow(2, 22, 60, 8);
    c.rect(6, 8, 52, 16, INK);
    c.ellipse(1, 8, 12, 16, INK);
    c.ellipse(52, 8, 12, 16, INK);
    c.rect(7, 9, 50, 14, s.bark);
    c.rect(7, 9, 50, 4, shade(s.bark, 0.2));
    c.rect(7, 19, 50, 4, shade(s.bark, -0.25));
    for (let x = 12; x < 54; x += 9) c.vline(x, 10, 12, shade(s.bark, -0.2));
    // The cut ends, with their rings.
    c.ellipse(2, 9, 10, 14, s.top);
    c.ellipse(4, 11, 6, 10, s.ring);
    c.ellipse(5, 13, 3, 5, s.top);
    c.ellipse(53, 9, 10, 14, s.top);
    c.ellipse(55, 11, 6, 10, s.ring);
    c.ellipse(56, 13, 3, 5, s.top);
    // A flat seat cut along the top.
    c.rect(12, 6, 40, 4, s.top);
    c.hline(12, 6, 40, shade(s.top, 0.25));
    c.hline(12, 9, 40, shade(s.top, -0.25));
    return c;
}

const RATTAN = { natural: "#c89b5e", dark: "#8a5e3b", white: "#efe9dc" } as const;
type RattanTone = keyof typeof RATTAN;
const CUSHIONS = { cream: "#f1e6cf", sage: "#9db79a", clay: "#d98c6a" } as const;

function weave(c: Canvas, x: number, y: number, w: number, h: number, tone: Color): void {
    for (let j = 0; j < h; j += 2)
        for (let i = (j / 2) % 2 ? 1 : 0; i < w; i += 3) c.pixel(x + i, y + j, shade(tone, -0.22));
}

function rattanChair(tone: RattanTone, direction: Direction): Canvas {
    const r = RATTAN[tone];
    const cushion = tone === "dark" ? CUSHIONS.clay : tone === "white" ? CUSHIONS.sage : CUSHIONS.cream;
    const c = new Canvas(32, 32);
    c.shadow(5, 25, 22, 6);
    if (direction === "Down") {
        c.ellipse(4, 1, 24, 22, INK);
        c.ellipse(5, 2, 22, 20, r);
        weave(c, 6, 3, 20, 18, r);
        c.ellipse(9, 5, 14, 10, shade(r, 0.18));
        c.box(7, 14, 18, 10, cushion, shade(cushion, -0.45));
        c.hline(8, 15, 16, shade(cushion, 0.3));
    } else if (direction === "Up") {
        c.box(7, 15, 18, 8, cushion, shade(cushion, -0.45));
        c.ellipse(4, 3, 24, 23, INK);
        c.ellipse(5, 4, 22, 21, r);
        weave(c, 6, 5, 20, 19, r);
        c.ellipse(9, 7, 12, 9, shade(r, 0.18));
        c.vline(16, 6, 18, shade(r, -0.3));
    } else {
        const side = new Canvas(32, 32);
        side.shadow(5, 25, 22, 6);
        side.box(8, 14, 17, 9, cushion, shade(cushion, -0.45));
        side.ellipse(3, 2, 12, 22, INK);
        side.ellipse(4, 3, 10, 20, r);
        weave(side, 5, 4, 8, 18, r);
        side.rect(14, 22, 2, 5, shade(r, -0.35));
        side.rect(23, 22, 2, 5, shade(r, -0.35));
        return direction === "Right" ? side : side.flipped();
    }
    c.rect(8, 24, 2, 4, shade(r, -0.4));
    c.rect(22, 24, 2, 4, shade(r, -0.4));
    return c;
}

const HAMMOCKS = {
    blue: ["#4060c8", "#e8eefc"],
    coral: ["#e0705a", "#fbe7e1"],
    green: ["#3f8b69", "#e5f2ea"],
} as const;
type HammockTone = keyof typeof HAMMOCKS;

function hammock(tone: HammockTone): Canvas {
    const [main, stripe] = HAMMOCKS[tone];
    const c = new Canvas(96, 64);
    c.shadow(6, 56, 84, 7);
    // Two posts.
    for (const x of [4, 86]) {
        c.rect(x, 8, 6, 50, INK);
        c.rect(x + 1, 8, 4, 50, BARK.mid);
        c.rect(x + 1, 8, 1, 50, BARK.light);
    }
    // The cloth hangs in a curve between the posts.
    for (let x = 10; x < 86; x++) {
        const t = (x - 10) / 75;
        const sag = Math.sin(t * Math.PI) * 20;
        const top = 14 + sag;
        c.rect(x, top, 1, 12, INK);
        c.rect(x, top + 1, 1, 10, Math.floor(x / 5) % 2 === 0 ? main : stripe);
        c.pixel(x, top + 1, shade(main, 0.35));
        c.pixel(x, top + 10, shade(main, -0.35));
    }
    // Ropes.
    c.rect(10, 12, 2, 5, "#e8dcc0");
    c.rect(84, 12, 2, 5, "#e8dcc0");
    // A pillow.
    c.ellipse(36, 28, 14, 7, "#fbf2d8");
    c.ellipse(38, 29, 8, 3, "#e8d9ae");
    return c;
}

// ---------------------------------------------------------------------------------------------
// The nature catalog
// ---------------------------------------------------------------------------------------------

const none = undefined;

export const NATURE_ENTITIES: EntityDefinition[] = [
    // --- Places to sit -----------------------------------------------------------------------
    {
        key: "beanbag",
        category: "seating",
        tags: ["beanbag", "seat", "lounge", "relax"],
        name: L("Beanbag", "Pouf poire", "Sitzsack", "Puf pera", "وسادة حبيبات"),
        description: L(
            "A slouchy beanbag you can sit on anywhere: break corners, gardens, reading nooks.",
            "Un pouf poire moelleux sur lequel s’asseoir partout : coins pause, jardins, coins lecture.",
            "Ein gemütlicher Sitzsack für jede Ecke: Pausenbereiche, Gärten, Leseecken.",
            "Un puf pera mullido para sentarse en cualquier sitio: zonas de descanso, jardines, rincones de lectura.",
            "وسادة حبيبات مريحة يمكن الجلوس عليها في أي مكان: ركن الاستراحة والحدائق وزوايا القراءة.",
        ),
        variants: (Object.keys(BEANBAGS) as Beanbag[]).map((color) => ({
            key: color,
            color: BEANBAGS[color],
            direction: "Down" as const,
            draw: () => beanbag(color),
        })),
    },
    {
        key: "garden-bench",
        category: "seating",
        tags: ["bench", "seat", "garden", "outdoor"],
        name: L("Garden bench", "Banc de jardin", "Gartenbank", "Banco de jardín", "مقعد حديقة"),
        description: L(
            "A slatted wooden bench for gardens and terraces, facing four ways.",
            "Un banc à lattes en bois pour jardins et terrasses, orienté dans les quatre directions.",
            "Eine Holzlattenbank für Gärten und Terrassen, in vier Richtungen.",
            "Un banco de listones de madera para jardines y terrazas, en cuatro orientaciones.",
            "مقعد خشبي بألواح للحدائق والشرفات بأربعة اتجاهات.",
        ),
        variants: (["oak", "walnut", "white"] as const).flatMap((wood) =>
            ALL_DIRECTIONS.map((direction) => ({
                key: `${wood}-${direction.toLowerCase()}`,
                color: WOODS[wood].top,
                direction,
                draw: () => gardenBench(wood, direction),
            })),
        ),
    },
    {
        key: "stump-stool",
        category: "seating",
        tags: ["stool", "seat", "log", "nature"],
        name: L("Tree stump stool", "Tabouret souche", "Baumstumpfhocker", "Taburete de tocón", "مقعد جذع شجرة"),
        description: L(
            "A cut tree stump used as a stool: oak or birch.",
            "Une souche d’arbre coupée utilisée comme tabouret : chêne ou bouleau.",
            "Ein gefällter Baumstumpf als Hocker: Eiche oder Birke.",
            "Un tocón de árbol cortado usado como taburete: roble o abedul.",
            "جذع شجرة مقطوع يُستخدم كمقعد: من البلوط أو البتولا.",
        ),
        variants: (Object.keys(STUMPS) as Stump[]).map((kind) => ({
            key: kind,
            color: STUMPS[kind].top,
            direction: "Down" as const,
            draw: () => stumpStool(kind),
        })),
    },
    {
        key: "log-bench",
        category: "seating",
        tags: ["bench", "seat", "log", "nature", "campfire"],
        name: L("Log bench", "Banc en rondin", "Baumstammbank", "Banco de tronco", "مقعد جذع"),
        description: L(
            "A long log with a flat seat, for campfire circles and woodland corners.",
            "Un long rondin à assise plane, pour les cercles autour du feu et les coins de sous-bois.",
            "Ein langer Baumstamm mit flacher Sitzfläche für Lagerfeuerrunden und Waldecken.",
            "Un tronco largo con asiento plano, para corros de fogata y rincones de bosque.",
            "جذع طويل بمقعد مسطح لحلقات نار المخيم وزوايا الغابة.",
        ),
        variants: (Object.keys(STUMPS) as Stump[]).map((kind) => ({
            key: kind,
            color: STUMPS[kind].top,
            direction: "Down" as const,
            draw: () => logBench(kind),
        })),
    },
    {
        key: "rattan-chair",
        category: "seating",
        tags: ["chair", "seat", "rattan", "wicker", "outdoor"],
        name: L("Rattan chair", "Fauteuil en rotin", "Rattanstuhl", "Silla de ratán", "كرسي روطان"),
        description: L(
            "A round-backed wicker chair with a cushion, in four directions.",
            "Un fauteuil en osier à dossier arrondi avec coussin, dans les quatre directions.",
            "Ein Korbstuhl mit runder Lehne und Kissen, in vier Richtungen.",
            "Una silla de mimbre con respaldo redondo y cojín, en cuatro direcciones.",
            "كرسي من الخوص بظهر مستدير ووسادة، بأربعة اتجاهات.",
        ),
        variants: (Object.keys(RATTAN) as RattanTone[]).flatMap((tone) =>
            ALL_DIRECTIONS.map((direction) => ({
                key: `${tone}-${direction.toLowerCase()}`,
                color: RATTAN[tone],
                direction,
                draw: () => rattanChair(tone, direction),
            })),
        ),
    },
    {
        key: "hammock",
        category: "seating",
        tags: ["hammock", "seat", "relax", "garden"],
        name: L("Hammock", "Hamac", "Hängematte", "Hamaca", "أرجوحة شبكية"),
        description: L(
            "A striped hammock strung between two posts, for the laziest meeting spot.",
            "Un hamac rayé tendu entre deux poteaux, pour le coin de réunion le plus paresseux.",
            "Eine gestreifte Hängematte zwischen zwei Pfosten – der gemütlichste Treffpunkt.",
            "Una hamaca de rayas entre dos postes, para el rincón de reunión más relajado.",
            "أرجوحة مخططة معلّقة بين عمودين لأكثر أماكن اللقاء استرخاءً.",
        ),
        variants: (Object.keys(HAMMOCKS) as HammockTone[]).map((tone) => ({
            key: tone,
            color: HAMMOCKS[tone][0],
            direction: "Down" as const,
            draw: () => hammock(tone),
            collisionGrid: [
                [1, 0, 1],
                [1, 0, 1],
            ],
            depthOffset: -64,
        })),
    },

    // --- Trees and hedges ----------------------------------------------------------------------
    {
        key: "oak-tree",
        category: "nature",
        tags: ["tree", "oak", "garden", "outdoor"],
        name: L("Oak tree", "Chêne", "Eiche", "Roble", "شجرة بلوط"),
        description: L(
            "A broad shade tree in summer green, autumn gold or spring blossom. Walk behind the leaves, not through the trunk.",
            "Un grand arbre d’ombrage en vert d’été, or d’automne ou fleurs de printemps. On passe derrière le feuillage, pas à travers le tronc.",
            "Ein breiter Schattenbaum in Sommergrün, Herbstgold oder Frühlingsblüte. Man geht hinter dem Laub, nicht durch den Stamm.",
            "Un árbol de sombra en verde de verano, oro de otoño o flor de primavera. Se camina tras el follaje, no por el tronco.",
            "شجرة ظليلة بخضرة الصيف أو ذهب الخريف أو أزهار الربيع. يمكن المشي خلف الأوراق لا عبر الجذع.",
        ),
        variants: (
            [
                ["summer", GREEN, 11],
                ["autumn", AUTUMN, 23],
                ["blossom", BLOSSOM, 37],
            ] as const
        ).map(([key, foliage, seed]) => ({
            key,
            color: foliage.base,
            direction: "Down" as const,
            draw: () => oakTree(foliage, seed),
            collisionGrid: [
                [0, 0],
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "pine-tree",
        category: "nature",
        tags: ["tree", "pine", "evergreen", "outdoor"],
        name: L("Pine tree", "Pin", "Kiefer", "Pino", "شجرة صنوبر"),
        description: L(
            "A tiered evergreen, plain or snow-dusted.",
            "Un conifère étagé, nu ou saupoudré de neige.",
            "Ein gestufter Nadelbaum, schlicht oder mit Schnee bestäubt.",
            "Un conífero en niveles, liso o con una capa de nieve.",
            "شجرة دائمة الخضرة متدرجة، عادية أو مغطاة بالثلج.",
        ),
        variants: [
            { key: "green", color: PINE.base, direction: "Down" as const, draw: () => pineTree(PINE, false) },
            { key: "snow", color: "#f4f8fb", direction: "Down" as const, draw: () => pineTree(PINE, true) },
        ].map((variant) => ({
            ...variant,
            collisionGrid: [
                [0, 0],
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "bush",
        category: "nature",
        tags: ["bush", "shrub", "garden", "outdoor"],
        name: L("Bush", "Buisson", "Strauch", "Arbusto", "شجيرة"),
        description: L(
            "A round shrub, plain, flowering or with red berries.",
            "Un arbuste rond, simple, fleuri ou garni de baies rouges.",
            "Ein runder Strauch, schlicht, blühend oder mit roten Beeren.",
            "Un arbusto redondo, liso, florido o con bayas rojas.",
            "شجيرة مستديرة، عادية أو مزهرة أو بثمار حمراء.",
        ),
        variants: [
            { key: "green", color: GREEN.base, bloom: none, seed: 5 },
            { key: "flowering", color: "#e58fb0", bloom: "#f6bfd3", seed: 9 },
            { key: "berries", color: "#c94f4f", bloom: "#d94a4a", seed: 14 },
        ].map(({ key, color, bloom, seed }) => ({
            key,
            color,
            direction: "Down" as const,
            draw: () => bush(GREEN, bloom, seed),
            collisionGrid: [[1]],
        })),
    },
    {
        key: "hedge",
        category: "nature",
        tags: ["hedge", "fence", "garden", "outdoor", "wall"],
        name: L("Hedge", "Haie", "Hecke", "Seto", "سياج نباتي"),
        description: L(
            "A trimmed hedge section, two tiles wide. Chain them to fence a garden or separate areas.",
            "Un tronçon de haie taillée, large de deux cases. Enchaînez-les pour clore un jardin ou séparer des espaces.",
            "Ein beschnittenes Heckenstück, zwei Felder breit. Aneinandergereiht umzäunt es Gärten oder trennt Bereiche.",
            "Un tramo de seto recortado, de dos casillas. Encadénalos para cercar un jardín o separar zonas.",
            "قطعة سياج مشذّبة بعرض مربعين. صفّها لتسوير حديقة أو فصل المساحات.",
        ),
        variants: [
            { key: "green", color: GREEN.base, bloom: none, seed: 3 },
            { key: "flowering", color: "#e58fb0", bloom: "#f6bfd3", seed: 8 },
        ].map(({ key, color, bloom, seed }) => ({
            key,
            color,
            direction: "Down" as const,
            draw: () => hedge(GREEN, bloom, seed),
            collisionGrid: [[1, 1]],
        })),
    },

    // --- Flowers and plants --------------------------------------------------------------------
    {
        key: "flower-bed",
        category: "nature",
        tags: ["flowers", "garden", "outdoor", "bed"],
        name: L("Flower bed", "Parterre de fleurs", "Blumenbeet", "Parterre de flores", "حوض زهور"),
        description: L(
            "A stone-edged bed of tulips, daisies or lavender.",
            "Un parterre bordé de pierres, avec tulipes, marguerites ou lavande.",
            "Ein steingefasstes Beet mit Tulpen, Gänseblümchen oder Lavendel.",
            "Un parterre bordeado de piedra con tulipanes, margaritas o lavanda.",
            "حوض محاط بالحجارة بالتوليب أو الأقحوان أو اللافندر.",
        ),
        variants: (["tulips", "daisies", "lavender"] as const).map((kind) => ({
            key: kind,
            color: kind === "tulips" ? "#d94a4a" : kind === "daisies" ? "#fbfcfd" : "#8b6bd0",
            direction: "Down" as const,
            draw: () => flowerBed(kind),
            collisionGrid: [[1, 1]],
        })),
    },
    {
        key: "planter-box",
        category: "nature",
        tags: ["planter", "herbs", "vegetables", "garden", "urban"],
        name: L("Raised planter", "Bac potager", "Hochbeet", "Jardinera elevada", "حوض زراعة مرتفع"),
        description: L(
            "A wooden raised bed growing herbs or vegetables: a rooftop-garden classic.",
            "Un bac potager en bois avec aromates ou légumes : un classique des jardins sur les toits.",
            "Ein Holzhochbeet mit Kräutern oder Gemüse – ein Klassiker für Dachgärten.",
            "Una jardinera de madera con hierbas o verduras: un clásico de los huertos urbanos.",
            "حوض زراعة خشبي مرتفع بالأعشاب أو الخضروات، من أساسيات حدائق الأسطح.",
        ),
        variants: (
            [
                ["herbs", "oak", "#4aa05a"],
                ["vegetables", "walnut", "#d94a4a"],
            ] as const
        ).map(([crop, wood, color]) => ({
            key: crop,
            color,
            direction: "Down" as const,
            draw: () => planterBox(crop, wood),
            collisionGrid: [[1, 1]],
        })),
    },
    {
        key: "palm",
        category: "nature",
        tags: ["palm", "tree", "tropical", "indoor"],
        name: L("Potted palm", "Palmier en pot", "Topfpalme", "Palmera en maceta", "نخلة في أصيص"),
        description: L(
            "A tall indoor palm for lobbies, lounges and terraces.",
            "Un grand palmier d’intérieur pour halls, salons et terrasses.",
            "Eine hohe Zimmerpalme für Foyers, Lounges und Terrassen.",
            "Una palmera de interior alta para vestíbulos, salas y terrazas.",
            "نخلة داخلية طويلة للأبهاء والصالات والشرفات.",
        ),
        variants: (Object.keys(POTS) as Pot[]).map((p) => ({
            key: p,
            color: POTS[p],
            direction: "Down" as const,
            draw: () => palm(p),
            collisionGrid: [
                [0, 0],
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "fern",
        category: "nature",
        tags: ["fern", "plant", "green", "indoor"],
        name: L("Fern", "Fougère", "Farn", "Helecho", "سرخس"),
        description: L(
            "A feathery fern in a pot, soft for desks and corners.",
            "Une fougère plumeuse en pot, douce pour bureaux et coins.",
            "Ein gefiederter Farn im Topf, weich für Schreibtische und Ecken.",
            "Un helecho plumoso en maceta, suave para escritorios y rincones.",
            "سرخس ريشي في أصيص يلطّف المكاتب والزوايا.",
        ),
        variants: (Object.keys(POTS) as Pot[]).map((p) => ({
            key: p,
            color: POTS[p],
            direction: "Down" as const,
            draw: () => fern(p),
            collisionGrid: [[1]],
        })),
    },
    {
        key: "bamboo",
        category: "nature",
        tags: ["bamboo", "plant", "zen", "indoor"],
        name: L("Bamboo", "Bambou", "Bambus", "Bambú", "خيزران"),
        description: L(
            "Three bamboo stalks in a dark pot, a calm vertical accent.",
            "Trois tiges de bambou dans un pot sombre, un accent vertical apaisant.",
            "Drei Bambushalme im dunklen Topf, ein ruhiger vertikaler Akzent.",
            "Tres cañas de bambú en una maceta oscura, un acento vertical sereno.",
            "ثلاث سيقان خيزران في أصيص داكن، لمسة عمودية هادئة.",
        ),
        variants: [
            {
                key: "standard",
                color: "#79b24f",
                direction: "Down" as const,
                draw: bamboo,
                collisionGrid: [[0], [1]],
                depthOffset: -32,
            },
        ],
    },

    // --- Water, stone, ground ------------------------------------------------------------------
    {
        key: "pond",
        category: "nature",
        tags: ["pond", "water", "garden", "lilies", "koi"],
        name: L("Pond", "Bassin", "Teich", "Estanque", "بركة"),
        description: L(
            "A stone-rimmed pond with lily pads or koi. It cannot be walked through.",
            "Un bassin bordé de pierres avec nénuphars ou carpes koï. On ne le traverse pas.",
            "Ein Teich mit Steinrand und Seerosen oder Koi. Er ist nicht begehbar.",
            "Un estanque con borde de piedra, con nenúfares o carpas koi. No se puede cruzar.",
            "بركة بحافة حجرية مع أوراق النيلوفر أو أسماك الكوي. لا يمكن عبورها.",
        ),
        variants: (["lilies", "koi"] as const).map((kind) => ({
            key: kind,
            color: WATER.mid,
            direction: "Down" as const,
            draw: () => pond(kind),
            collisionGrid: [
                [1, 1, 1],
                [1, 1, 1],
            ],
            depthOffset: -64,
        })),
    },
    {
        key: "fountain",
        category: "nature",
        tags: ["fountain", "water", "garden", "plaza"],
        name: L("Fountain", "Fontaine", "Brunnen", "Fuente", "نافورة"),
        description: L(
            "A two-tier stone fountain, the centrepiece of a plaza or garden.",
            "Une fontaine en pierre à deux vasques, le centre d’une place ou d’un jardin.",
            "Ein zweistufiger Steinbrunnen, Mittelpunkt von Platz oder Garten.",
            "Una fuente de piedra de dos niveles, el centro de una plaza o jardín.",
            "نافورة حجرية بطبقتين تتوسط ساحة أو حديقة.",
        ),
        variants: (["stone", "sandstone"] as const).map((tone) => ({
            key: tone,
            color: tone === "stone" ? STONE.mid : "#cbb384",
            direction: "Down" as const,
            draw: () => fountain(tone),
            collisionGrid: [
                [0, 0],
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "rock-cluster",
        category: "nature",
        tags: ["rock", "stone", "boulder", "garden"],
        name: L("Rock cluster", "Groupe de rochers", "Felsengruppe", "Grupo de rocas", "مجموعة صخور"),
        description: L(
            "Three boulders: grey, mossy or sandy.",
            "Trois rochers : gris, moussus ou sableux.",
            "Drei Felsbrocken: grau, bemoost oder sandig.",
            "Tres rocas: grises, musgosas o arenosas.",
            "ثلاث صخور: رمادية أو مغطاة بالطحلب أو رملية.",
        ),
        variants: (["gray", "mossy", "sand"] as const).map((tone) => ({
            key: tone,
            color: tone === "sand" ? "#c9b583" : STONE.mid,
            direction: "Down" as const,
            draw: () => rockCluster(tone),
            collisionGrid: [[1, 1]],
        })),
    },
    {
        key: "stepping-stones",
        category: "nature",
        tags: ["path", "stones", "garden", "floor"],
        name: L("Stepping stones", "Pas japonais", "Trittsteine", "Piedras de paso", "حجارة عبور"),
        description: L(
            "Flat stones for a garden path. Walk over them, they sit on the ground.",
            "Des pierres plates pour un chemin de jardin. On marche dessus, elles sont au sol.",
            "Flache Steine für einen Gartenweg. Man geht darüber, sie liegen am Boden.",
            "Piedras planas para un sendero de jardín. Se pisan, están en el suelo.",
            "حجارة مسطحة لممر في الحديقة. يمكن المشي عليها فهي على الأرض.",
        ),
        variants: (["gray", "sand"] as const).map((tone) => ({
            key: tone,
            color: tone === "sand" ? "#c9b583" : STONE.mid,
            direction: "Down" as const,
            draw: () => steppingStones(tone),
            depthOffset: -32,
        })),
    },
    {
        key: "grass-patch",
        category: "nature",
        tags: ["grass", "lawn", "garden", "floor", "outdoor"],
        name: L("Grass patch", "Carré de pelouse", "Rasenstück", "Parche de césped", "رقعة عشب"),
        description: L(
            "A tile of lawn to lay over any floor: plain meadow, clover or wildflowers.",
            "Une case de pelouse à poser sur n’importe quel sol : prairie, trèfle ou fleurs sauvages.",
            "Ein Rasenfeld zum Auslegen auf jedem Boden: Wiese, Klee oder Wildblumen.",
            "Una casilla de césped para cubrir cualquier suelo: prado, trébol o flores silvestres.",
            "مربع عشب يوضع فوق أي أرضية: مرج أو برسيم أو أزهار برية.",
        ),
        variants: (["meadow", "clover", "wildflowers"] as const).map((kind) => ({
            key: kind,
            color: "#5aa24a",
            direction: "Down" as const,
            draw: () => grassPatch(kind),
            depthOffset: -32,
        })),
    },
    {
        key: "picnic-table",
        category: "nature",
        tags: ["table", "picnic", "garden", "outdoor", "meeting"],
        name: L("Picnic table", "Table de pique-nique", "Picknicktisch", "Mesa de picnic", "طاولة نزهة"),
        description: L(
            "A wooden table with two attached benches for lunch outdoors or a walking meeting.",
            "Une table en bois avec deux bancs attachés, pour déjeuner dehors ou tenir une réunion au grand air.",
            "Ein Holztisch mit zwei festen Bänken für das Mittagessen im Freien oder ein Gespräch an der frischen Luft.",
            "Una mesa de madera con dos bancos fijos, para comer al aire libre o reunirse fuera.",
            "طاولة خشبية بمقعدين ملتصقين للغداء في الهواء الطلق أو لقاء خارجي.",
        ),
        variants: (["oak", "walnut", "white"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => picnicTable(wood),
            collisionGrid: [
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "garden-lantern",
        category: "lighting",
        tags: ["lantern", "lamp", "light", "garden", "outdoor"],
        name: L("Garden lantern", "Lanterne de jardin", "Gartenlaterne", "Farol de jardín", "فانوس حديقة"),
        description: L(
            "A lantern on a post that spreads a warm glow along paths.",
            "Une lanterne sur poteau qui diffuse une lueur chaude le long des allées.",
            "Eine Laterne auf einem Pfosten, die Wege in warmes Licht taucht.",
            "Un farol sobre un poste que da una luz cálida a los senderos.",
            "فانوس على عمود ينشر وهجًا دافئًا على الممرات.",
        ),
        variants: (["black", "copper"] as const).map((finish) => ({
            key: finish,
            color: finish === "black" ? "#2a2d33" : "#b8693a",
            direction: "Down" as const,
            draw: () => gardenLantern(finish),
            collisionGrid: [[0], [1]],
            depthOffset: -32,
        })),
    },
];
