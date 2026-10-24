/**
 * AdminSpace's original office furniture, drawn in code (32 px grid, 3/4 top-down view, one palette).
 * Conventions follow WorkAdventure's own collections: the back row of a collision grid is passable and
 * the rows in front block; depthOffset moves the sorting line to the back row; floor items (rugs,
 * markings) sort below players.
 */
import { Canvas, shade, type Color } from "./canvas";
import type { Category, Direction } from "../../src/lib/catalog/manifest";

export interface Localized {
    en: string;
    fr: string;
    de: string;
    es: string;
    ar: string;
}

export interface VariantDefinition {
    key: string;
    color: Color;
    direction: Direction;
    draw: () => Canvas;
    collisionGrid?: (0 | 1)[][];
    depthOffset?: number;
}

export interface EntityDefinition {
    key: string;
    category: Category;
    tags: string[];
    name: Localized;
    description: Localized;
    variants: VariantDefinition[];
}

const LINE = "#262a31";

const WOODS = {
    oak: { top: "#d6a46b", front: "#b07c45", line: "#5c3b1d" },
    walnut: { top: "#96613f", front: "#73452a", line: "#3b2214" },
    white: { top: "#f2f3f5", front: "#d2d7de", line: "#6f7682" },
    graphite: { top: "#555b66", front: "#3b4048", line: "#17191d" },
} as const;
type Wood = keyof typeof WOODS;

const FABRICS = {
    blue: "#4060c8",
    slate: "#6e7889",
    green: "#3f8b69",
    terracotta: "#c5653f",
    charcoal: "#3d4149",
} as const;
type Fabric = keyof typeof FABRICS;

const METAL = { light: "#b9c0ca", mid: "#8a929e", dark: "#4b515b" };

/** A table-like top seen from the 3/4 view: lit surface, darker front face, legs, shadow. */
function tableTop(
    c: Canvas,
    x: number,
    y: number,
    w: number,
    depth: number,
    front: number,
    wood: { top: Color; front: Color; line: Color },
    legs = true,
): void {
    c.shadow(x + 2, y + depth + front + 2, w - 4, 8);
    if (legs) {
        c.rect(x + 3, y + depth + front - 1, 3, 8, shade(wood.front, -0.35));
        c.rect(x + w - 6, y + depth + front - 1, 3, 8, shade(wood.front, -0.35));
    }
    c.box(x, y, w, depth + front, wood.top, wood.line);
    c.rect(x + 1, y + depth, w - 2, front - 1, wood.front);
    c.hline(x + 1, y + depth, w - 2, shade(wood.front, -0.15));
    c.hline(x + 2, y + 1, w - 4, shade(wood.top, 0.25));
    // Subtle grain on wood tops.
    if (wood !== WOODS.white) {
        for (let gy = y + 5; gy < y + depth - 2; gy += 5) c.hline(x + 4 + (gy % 3), gy, w - 12, shade(wood.top, -0.06));
    }
}

// ---------------------------------------------------------------------------------------------
// Desks, tables
// ---------------------------------------------------------------------------------------------

function desk(wood: Wood): Canvas {
    const c = new Canvas(64, 64);
    tableTop(c, 2, 22, 60, 20, 10, WOODS[wood]);
    // Drawer pedestal under the right side.
    c.box(42, 42, 18, 16, shade(WOODS[wood].front, -0.05), WOODS[wood].line);
    c.hline(44, 49, 14, shade(WOODS[wood].front, -0.3));
    c.rect(50, 45, 2, 1, METAL.light);
    c.rect(50, 52, 2, 1, METAL.light);
    return c;
}

function standingDesk(wood: Wood): Canvas {
    const c = new Canvas(64, 64);
    c.shadow(6, 56, 52, 7);
    c.rect(10, 34, 3, 24, METAL.dark);
    c.rect(51, 34, 3, 24, METAL.dark);
    c.rect(6, 57, 12, 3, METAL.dark);
    c.rect(46, 57, 12, 3, METAL.dark);
    c.box(2, 14, 60, 22, WOODS[wood].top, WOODS[wood].line);
    c.rect(3, 30, 58, 5, WOODS[wood].front);
    c.hline(4, 15, 56, shade(WOODS[wood].top, 0.25));
    return c;
}

function meetingTable(wood: Wood): Canvas {
    const c = new Canvas(96, 64);
    tableTop(c, 2, 12, 92, 32, 10, WOODS[wood]);
    // Inset cable tray.
    c.rect(36, 26, 24, 4, shade(WOODS[wood].top, -0.25));
    return c;
}

function roundTable(wood: Wood): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(64, 64);
    c.shadow(10, 52, 44, 9);
    c.rect(29, 38, 6, 16, shade(w.front, -0.3));
    c.ellipse(18, 52, 28, 6, shade(w.front, -0.4));
    c.ellipse(4, 14, 56, 30, w.line);
    c.ellipse(5, 15, 54, 28, w.front);
    c.ellipse(5, 13, 54, 26, w.top);
    c.ellipse(14, 16, 30, 8, shade(w.top, 0.2));
    return c;
}

function coffeeTable(wood: Wood): Canvas {
    const c = new Canvas(64, 32);
    tableTop(c, 6, 6, 52, 14, 6, WOODS[wood]);
    c.rect(18, 9, 8, 6, "#c94f4f");
    c.rect(19, 10, 6, 2, shade("#c94f4f", 0.3));
    return c;
}

function receptionDesk(wood: Wood): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(96, 64);
    c.shadow(4, 54, 88, 9);
    c.box(4, 10, 88, 14, shade(w.top, -0.08), w.line);
    c.box(2, 20, 92, 40, w.front, w.line);
    c.hline(3, 21, 90, shade(w.top, 0.1));
    c.rect(3, 22, 90, 6, w.top);
    c.rect(3, 42, 90, 4, "#3b5cc8");
    c.hline(3, 42, 90, shade("#3b5cc8", 0.3));
    for (let x = 12; x < 92; x += 20) c.vline(x, 29, 12, shade(w.front, -0.12));
    return c;
}

// ---------------------------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------------------------

function chairBase(c: Canvas): void {
    c.shadow(6, 25, 20, 6);
    c.rect(15, 22, 2, 6, METAL.dark);
    c.hline(9, 28, 14, METAL.dark);
    for (const [x, y] of [
        [8, 29],
        [15, 30],
        [23, 29],
    ] as const) {
        c.rect(x, y, 2, 2, "#1b1d22");
    }
}

function officeChair(fabric: Fabric, direction: Direction): Canvas {
    const f = FABRICS[fabric];
    const c = new Canvas(32, 32);
    chairBase(c);
    if (direction === "Down") {
        c.box(9, 3, 14, 13, shade(f, -0.12), LINE);
        c.hline(10, 4, 12, shade(f, 0.2));
        c.box(7, 15, 18, 8, f, LINE);
        c.hline(8, 16, 16, shade(f, 0.25));
        c.rect(5, 14, 3, 6, METAL.dark);
        c.rect(24, 14, 3, 6, METAL.dark);
    } else if (direction === "Up") {
        c.box(7, 14, 18, 7, f, LINE);
        c.box(9, 6, 14, 16, shade(f, -0.28), LINE);
        c.vline(16, 8, 12, shade(f, -0.4));
    } else {
        // Facing right: backrest on the left.
        const side = new Canvas(32, 32);
        chairBase(side);
        side.box(8, 15, 16, 8, f, LINE);
        side.hline(9, 16, 14, shade(f, 0.25));
        side.box(6, 3, 6, 18, shade(f, -0.18), LINE);
        side.rect(13, 13, 9, 2, METAL.dark);
        return direction === "Right" ? side : side.flipped();
    }
    return c;
}

function sofa(fabric: Fabric, direction: Direction): Canvas {
    const f = FABRICS[fabric];
    const c = new Canvas(64, 64);
    c.shadow(4, 52, 56, 9);
    if (direction === "Down") {
        c.box(6, 16, 52, 20, shade(f, -0.14), LINE);
        c.hline(7, 17, 50, shade(f, 0.15));
        c.box(4, 32, 56, 14, f, LINE);
        c.vline(32, 33, 12, shade(f, -0.18));
        c.box(2, 22, 8, 32, shade(f, -0.06), LINE);
        c.box(54, 22, 8, 32, shade(f, -0.06), LINE);
        c.rect(4, 46, 56, 8, shade(f, -0.3));
    } else {
        c.box(4, 22, 56, 14, f, LINE);
        c.box(2, 24, 8, 30, shade(f, -0.06), LINE);
        c.box(54, 24, 8, 30, shade(f, -0.06), LINE);
        c.box(6, 30, 52, 24, shade(f, -0.3), LINE);
        c.vline(32, 32, 20, shade(f, -0.42));
    }
    return c;
}

function armchair(fabric: Fabric): Canvas {
    const f = FABRICS[fabric];
    const c = new Canvas(32, 32);
    c.shadow(3, 25, 26, 6);
    c.box(6, 3, 20, 13, shade(f, -0.14), LINE);
    c.box(5, 13, 22, 10, f, LINE);
    c.hline(6, 14, 20, shade(f, 0.2));
    c.box(2, 8, 6, 20, shade(f, -0.06), LINE);
    c.box(24, 8, 6, 20, shade(f, -0.06), LINE);
    c.rect(5, 23, 22, 5, shade(f, -0.3));
    return c;
}

// ---------------------------------------------------------------------------------------------
// Storage, presentation, computers
// ---------------------------------------------------------------------------------------------

function bookshelf(wood: Wood): Canvas {
    const w = WOODS[wood];
    const c = new Canvas(64, 64);
    c.shadow(4, 56, 56, 7);
    c.box(4, 2, 56, 58, w.front, w.line);
    c.rect(5, 3, 54, 3, w.top);
    const books = ["#3f5fc6", "#c5653f", "#3f8b69", "#e0b44b", "#6e7889", "#8b4fb3", "#2f3f5f"];
    for (const [shelf, y] of [8, 23, 38].entries()) {
        c.rect(7, y, 50, 12, shade(w.front, -0.35));
        let x = 8;
        let i = shelf * 2;
        while (x < 54) {
            const width = 3 + ((i * 7) % 3);
            const height = 8 + ((i * 5) % 4);
            c.rect(x, y + 12 - height, width, height, books[i % books.length]!);
            c.vline(x, y + 12 - height, height, shade(books[i % books.length]!, 0.25));
            x += width + 1;
            i++;
        }
        c.hline(5, y + 12, 54, w.top);
    }
    c.rect(7, 53, 50, 5, shade(w.front, -0.2));
    return c;
}

function whiteboard(): Canvas {
    const c = new Canvas(64, 64);
    c.shadow(8, 56, 48, 7);
    c.rect(10, 40, 2, 18, METAL.dark);
    c.rect(52, 40, 2, 18, METAL.dark);
    c.rect(6, 56, 10, 2, METAL.dark);
    c.rect(48, 56, 10, 2, METAL.dark);
    c.box(3, 4, 58, 38, "#fbfcfd", METAL.mid);
    c.rect(5, 6, 54, 1, "#ffffff");
    c.rect(10, 12, 22, 2, "#3f5fc6");
    c.rect(10, 17, 32, 1, "#9aa3b0");
    c.rect(10, 21, 28, 1, "#9aa3b0");
    c.rect(10, 25, 16, 1, "#9aa3b0");
    c.ellipse(42, 20, 12, 12, "#c5653f");
    c.ellipse(44, 22, 8, 8, "#fbfcfd");
    c.rect(18, 40, 28, 3, METAL.mid);
    c.rect(22, 39, 5, 2, "#3f5fc6");
    c.rect(29, 39, 5, 2, "#c94f4f");
    return c;
}

function presentationScreen(): Canvas {
    const c = new Canvas(64, 64);
    c.shadow(16, 56, 32, 7);
    c.rect(30, 40, 4, 18, METAL.dark);
    c.ellipse(20, 54, 24, 6, METAL.dark);
    c.box(2, 4, 60, 38, "#1c2230", "#0f1218");
    c.gradient(4, 6, 56, 34, "#26355e", "#1c2740", 3);
    for (const [i, h] of [10, 16, 12, 22, 18].entries())
        c.rect(12 + i * 9, 34 - h, 6, h, i === 3 ? "#7fa2ff" : "#4f6fd6");
    c.hline(8, 34, 48, "#5a6888");
    return c;
}

function dualMonitor(): Canvas {
    const c = new Canvas(64, 32);
    for (const x of [4, 33]) {
        c.rect(x + 12, 20, 3, 6, METAL.dark);
        c.rect(x + 7, 26, 13, 2, METAL.dark);
        c.box(x, 3, 27, 18, "#1b2130", "#0e1117");
        c.gradient(x + 2, 5, 23, 14, "#3d5fc4", "#24366e", 2);
        c.hline(x + 4, 8, 12, "#a9bdff");
        c.hline(x + 4, 11, 16, "#7f97df");
        c.hline(x + 4, 14, 9, "#7f97df");
    }
    return c;
}

function laptop(): Canvas {
    const c = new Canvas(32, 32);
    c.box(6, 6, 20, 14, "#20262f", "#0e1117");
    c.gradient(8, 8, 16, 10, "#3d5fc4", "#24366e", 2);
    c.box(3, 19, 26, 7, METAL.light, METAL.dark);
    c.rect(6, 21, 20, 2, METAL.mid);
    c.rect(13, 24, 6, 1, METAL.dark);
    return c;
}

function printer(): Canvas {
    const c = new Canvas(32, 32);
    c.shadow(3, 25, 26, 6);
    c.rect(9, 3, 14, 7, "#ffffff");
    c.box(3, 8, 26, 18, "#e7eaee", METAL.dark);
    c.rect(4, 9, 24, 4, "#f6f7f9");
    c.rect(5, 18, 22, 4, METAL.mid);
    c.rect(23, 11, 3, 2, "#3f8b69");
    return c;
}

// ---------------------------------------------------------------------------------------------
// Plants, lighting, decoration
// ---------------------------------------------------------------------------------------------

const POTS = { terracotta: "#c46b41", white: "#e9ebee", charcoal: "#40444c" } as const;
type Pot = keyof typeof POTS;

function leaves(c: Canvas, x: number, y: number, w: number, h: number): void {
    const greens = ["#2f6f43", "#3d8a52", "#56a664", "#7cc27a"];
    const blobs = [
        [0.1, 0.35, 0.5, 0.5, 0],
        [0.45, 0.3, 0.5, 0.55, 0],
        [0.2, 0.05, 0.55, 0.5, 1],
        [0.3, 0.45, 0.45, 0.5, 1],
        [0.05, 0.15, 0.4, 0.45, 2],
        [0.55, 0.1, 0.4, 0.45, 2],
        [0.35, 0.2, 0.3, 0.3, 3],
    ] as const;
    for (const [bx, by, bw, bh, tone] of blobs) {
        c.ellipse(x + bx * w, y + by * h, Math.max(4, bw * w), Math.max(4, bh * h), greens[tone]!);
    }
}

function plant(pot: Pot, size: "large" | "small"): Canvas {
    const p = POTS[pot];
    if (size === "small") {
        const c = new Canvas(32, 32);
        c.shadow(7, 26, 18, 5);
        leaves(c, 6, 2, 20, 18);
        c.box(10, 18, 12, 10, p, shade(p, -0.5));
        c.hline(11, 19, 10, shade(p, 0.25));
        return c;
    }
    const c = new Canvas(32, 64);
    c.shadow(5, 57, 22, 6);
    leaves(c, 2, 4, 28, 40);
    c.rect(15, 38, 2, 8, "#5b4026");
    c.box(7, 44, 18, 16, p, shade(p, -0.5));
    c.hline(8, 45, 16, shade(p, 0.25));
    c.rect(8, 46, 16, 2, shade(p, -0.15));
    return c;
}

function floorLamp(finish: "black" | "brass"): Canvas {
    const metal = finish === "black" ? "#2a2d33" : "#b8913f";
    const c = new Canvas(32, 64);
    c.ellipse(4, 2, 24, 20, "#ffe9a833");
    c.shadow(8, 57, 16, 5);
    c.ellipse(10, 56, 12, 4, metal);
    c.rect(15, 18, 2, 39, metal);
    c.rect(9, 6, 14, 12, "#f4ead7");
    c.hline(9, 6, 14, shade(metal, 0.2));
    c.rect(9, 17, 14, 1, shade(metal, -0.2));
    c.rect(10, 7, 3, 10, "#fff7e6");
    return c;
}

function rug(color: Color): Canvas {
    const c = new Canvas(96, 64);
    c.box(2, 4, 92, 56, color, shade(color, -0.35));
    c.box(8, 10, 80, 44, shade(color, 0.12), shade(color, -0.2));
    c.box(16, 18, 64, 28, color, shade(color, 0.3));
    for (let x = 4; x < 94; x += 4) {
        c.vline(x, 1, 3, shade(color, 0.4));
        c.vline(x, 60, 3, shade(color, 0.4));
    }
    return c;
}

function wallArt(accent: Color): Canvas {
    const c = new Canvas(32, 32);
    c.box(3, 5, 26, 22, "#f4f1ea", "#3b3f46");
    c.rect(6, 8, 20, 16, "#e6ebf2");
    c.ellipse(9, 10, 10, 10, accent);
    c.rect(15, 15, 9, 8, shade(accent, -0.3));
    c.hline(6, 21, 20, "#9aa3b0");
    return c;
}

// ---------------------------------------------------------------------------------------------
// Break area, navigation, wayfinding
// ---------------------------------------------------------------------------------------------

function coffeeMachine(): Canvas {
    const c = new Canvas(32, 64);
    c.shadow(2, 57, 28, 6);
    c.box(2, 32, 28, 28, WOODS.white.front, WOODS.white.line);
    c.rect(3, 33, 26, 4, WOODS.white.top);
    c.vline(16, 38, 20, shade(WOODS.white.front, -0.15));
    c.box(6, 10, 20, 24, "#2b3038", "#15171b");
    c.rect(8, 12, 16, 6, "#3d4350");
    c.rect(10, 14, 4, 2, "#5ac8a0");
    c.rect(12, 22, 8, 3, "#15171b");
    c.rect(13, 27, 6, 5, "#f4f1ea");
    c.rect(14, 28, 4, 2, "#7a4a2a");
    return c;
}

function waterCooler(): Canvas {
    const c = new Canvas(32, 64);
    c.shadow(5, 57, 22, 6);
    c.ellipse(9, 4, 14, 18, "#6fb6e8cc");
    c.ellipse(11, 6, 5, 10, "#d6efffcc");
    c.box(7, 20, 18, 38, "#eef1f4", "#7a828e");
    c.rect(11, 28, 3, 3, "#3f7fd0");
    c.rect(18, 28, 3, 3, "#c94f4f");
    c.rect(10, 36, 12, 2, METAL.mid);
    return c;
}

function vendingMachine(): Canvas {
    const c = new Canvas(32, 64);
    c.shadow(1, 57, 30, 6);
    c.box(1, 2, 30, 58, "#2f4fb5", "#162453");
    c.box(4, 6, 18, 40, "#d9e7f5", "#162453");
    const colors = ["#c94f4f", "#e0b44b", "#3f8b69", "#8b4fb3"];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) c.rect(6 + col * 5, 9 + row * 9, 4, 6, colors[(row + col) % 4]!);
        c.hline(5, 16 + row * 9, 16, "#9fb3c9");
    }
    c.rect(24, 10, 4, 10, "#15171b");
    c.rect(25, 24, 2, 2, "#5ac8a0");
    c.rect(4, 49, 18, 6, "#15171b");
    return c;
}

function glassDoor(): Canvas {
    const c = new Canvas(32, 64);
    c.box(1, 2, 30, 60, "#9fd0eecc", METAL.dark);
    c.rect(3, 4, 26, 56, "#bfe3f7aa");
    c.vline(16, 4, 56, METAL.dark);
    c.rect(12, 30, 2, 8, METAL.light);
    c.rect(18, 30, 2, 8, METAL.light);
    c.rect(5, 6, 3, 22, "#ffffff88");
    return c;
}

function exitSign(): Canvas {
    const c = new Canvas(32, 32);
    c.box(2, 8, 28, 16, "#1f9d55", "#0f5c31");
    // Running figure and arrow, the ISO 7010 E001 motif in pixel form.
    c.rect(7, 11, 3, 3, "#ffffff");
    c.rect(7, 14, 3, 5, "#ffffff");
    c.rect(5, 15, 2, 2, "#ffffff");
    c.rect(10, 16, 2, 2, "#ffffff");
    c.rect(6, 19, 2, 3, "#ffffff");
    c.rect(9, 19, 2, 3, "#ffffff");
    c.rect(15, 15, 10, 2, "#ffffff");
    c.rect(22, 13, 2, 6, "#ffffff");
    c.rect(24, 14, 2, 4, "#ffffff");
    return c;
}

function floorArrow(direction: Direction): Canvas {
    const c = new Canvas(32, 32);
    const color = "#2b47c2cc";
    const draw = (cc: Canvas) => {
        cc.rect(6, 14, 14, 4, color);
        for (let i = 0; i < 8; i++) cc.rect(18 + i, 8 + i, 2, 16 - 2 * i, color);
    };
    if (direction === "Right") draw(c);
    else if (direction === "Left") {
        draw(c);
        return c.flipped();
    } else {
        // Up and down: drawn vertically.
        const tall = new Canvas(32, 32);
        tall.rect(14, 6, 4, 14, color);
        for (let i = 0; i < 8; i++) tall.rect(8 + i, 18 + i, 16 - 2 * i, 2, color);
        if (direction === "Down") return tall;
        const up = new Canvas(32, 32);
        for (let y = 0; y < 32; y++)
            for (let x = 0; x < 32; x++) {
                const from = ((31 - y) * 32 + x) * 4;
                up.data.set(tall.data.subarray(from, from + 4), (y * 32 + x) * 4);
            }
        return up;
    }
    return c;
}

function tactilePaving(): Canvas {
    const c = new Canvas(32, 32);
    c.rect(0, 0, 32, 32, "#e8b931");
    c.hline(0, 0, 32, "#c99b17");
    for (let y = 3; y < 32; y += 7) for (let x = 3; x < 32; x += 7) c.ellipse(x, y, 4, 4, "#c99b17");
    return c;
}

function signpost(): Canvas {
    const c = new Canvas(32, 64);
    c.shadow(8, 57, 16, 5);
    c.rect(15, 14, 3, 44, METAL.dark);
    c.box(3, 6, 26, 10, "#2b47c2", "#162453");
    c.rect(6, 10, 14, 2, "#ffffff");
    c.rect(22, 9, 2, 4, "#ffffff");
    c.rect(24, 10, 2, 2, "#ffffff");
    c.box(5, 18, 24, 9, "#3f8b69", "#1f4d38");
    c.rect(10, 22, 13, 2, "#ffffff");
    c.rect(8, 21, 2, 4, "#ffffff");
    return c;
}

// ---------------------------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------------------------

const L = (en: string, fr: string, de: string, es: string, ar: string): Localized => ({ en, fr, de, es, ar });
const ALL_DIRECTIONS: Direction[] = ["Down", "Up", "Left", "Right"];

export const ENTITIES: EntityDefinition[] = [
    {
        key: "desk-classic",
        category: "desks",
        tags: ["desk", "workstation", "wood"],
        name: L("Classic desk", "Bureau classique", "Klassischer Schreibtisch", "Escritorio clásico", "مكتب كلاسيكي"),
        description: L(
            "A two-person-wide desk with a drawer pedestal. Pairs with the office chair and the dual monitor.",
            "Un bureau large avec caisson à tiroirs. S’associe à la chaise de bureau et au double écran.",
            "Ein breiter Schreibtisch mit Schubladenelement. Passt zum Bürostuhl und zum Doppelmonitor.",
            "Un escritorio amplio con cajonera. Combina con la silla de oficina y la doble pantalla.",
            "مكتب عريض مع خزانة أدراج. يتناسق مع كرسي المكتب والشاشة المزدوجة.",
        ),
        variants: (["oak", "walnut", "white", "graphite"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => desk(wood),
            collisionGrid: [
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "desk-standing",
        category: "desks",
        tags: ["desk", "standing", "ergonomic"],
        name: L(
            "Standing desk",
            "Bureau assis-debout",
            "Steh-Sitz-Schreibtisch",
            "Escritorio elevable",
            "مكتب للعمل وقوفًا",
        ),
        description: L(
            "A height-adjustable desk on a steel frame, for focused work standing up.",
            "Un bureau réglable en hauteur sur piétement acier, pour travailler debout.",
            "Ein höhenverstellbarer Schreibtisch mit Stahlgestell für konzentriertes Arbeiten im Stehen.",
            "Un escritorio regulable en altura con estructura de acero, para trabajar de pie.",
            "مكتب قابل لتعديل الارتفاع بهيكل فولاذي، للعمل وقوفًا بتركيز.",
        ),
        variants: (["white", "oak", "graphite"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => standingDesk(wood),
            collisionGrid: [
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "office-chair",
        category: "seating",
        tags: ["chair", "seat", "ergonomic"],
        name: L("Office chair", "Chaise de bureau", "Bürostuhl", "Silla de oficina", "كرسي مكتب"),
        description: L(
            "A swivel task chair in four directions, to face any desk or table.",
            "Une chaise pivotante dans les quatre directions, pour faire face à n’importe quel bureau.",
            "Ein Drehstuhl in vier Richtungen, passend zu jedem Schreibtisch oder Tisch.",
            "Una silla giratoria en cuatro direcciones, para cualquier escritorio o mesa.",
            "كرسي دوّار بأربعة اتجاهات ليقابل أي مكتب أو طاولة.",
        ),
        variants: (["charcoal", "blue", "slate"] as const).flatMap((fabric) =>
            ALL_DIRECTIONS.map((direction) => ({
                key: `${fabric}-${direction.toLowerCase()}`,
                color: FABRICS[fabric],
                direction,
                draw: () => officeChair(fabric, direction),
            })),
        ),
    },
    {
        key: "meeting-table",
        category: "meeting",
        tags: ["table", "meeting", "conference"],
        name: L("Meeting table", "Table de réunion", "Besprechungstisch", "Mesa de reuniones", "طاولة اجتماعات"),
        description: L(
            "A six-seat conference table with a cable tray. Surround it with office chairs.",
            "Une table de conférence six places avec passe-câbles. À entourer de chaises de bureau.",
            "Ein Konferenztisch für sechs Personen mit Kabelkanal. Mit Bürostühlen umgeben.",
            "Una mesa de conferencias para seis con pasacables. Rodéala de sillas de oficina.",
            "طاولة اجتماعات لستة أشخاص مع مجرى للكابلات. ضع حولها كراسي المكتب.",
        ),
        variants: (["walnut", "oak", "white"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => meetingTable(wood),
            collisionGrid: [
                [0, 0, 0],
                [1, 1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "round-table",
        category: "meeting",
        tags: ["table", "round", "huddle"],
        name: L("Round table", "Table ronde", "Runder Tisch", "Mesa redonda", "طاولة مستديرة"),
        description: L(
            "A pedestal table for quick huddles of three or four people.",
            "Une table sur pied central pour des points rapides à trois ou quatre.",
            "Ein Säulentisch für kurze Abstimmungen zu dritt oder viert.",
            "Una mesa de pie central para reuniones rápidas de tres o cuatro personas.",
            "طاولة بقاعدة مركزية للاجتماعات السريعة لثلاثة أو أربعة أشخاص.",
        ),
        variants: (["oak", "white", "graphite"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => roundTable(wood),
            collisionGrid: [
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "sofa",
        category: "lounge",
        tags: ["sofa", "couch", "lounge"],
        name: L("Lounge sofa", "Canapé lounge", "Lounge-Sofa", "Sofá lounge", "أريكة استراحة"),
        description: L(
            "A two-seat sofa for break areas, facing the room or the wall.",
            "Un canapé deux places pour les espaces de pause, face à la pièce ou au mur.",
            "Ein Zweisitzer-Sofa für Pausenbereiche, zum Raum oder zur Wand gerichtet.",
            "Un sofá de dos plazas para zonas de descanso, hacia la sala o la pared.",
            "أريكة بمقعدين لمناطق الاستراحة، باتجاه الغرفة أو الجدار.",
        ),
        variants: (["blue", "green", "terracotta", "slate"] as const).flatMap((fabric) =>
            (["Down", "Up"] as const).map((direction) => ({
                key: `${fabric}-${direction.toLowerCase()}`,
                color: FABRICS[fabric],
                direction,
                draw: () => sofa(fabric, direction),
                collisionGrid: [
                    [0, 0],
                    [1, 1],
                ],
                depthOffset: -32,
            })),
        ),
    },
    {
        key: "armchair",
        category: "lounge",
        tags: ["armchair", "seat", "lounge"],
        name: L("Armchair", "Fauteuil", "Sessel", "Butaca", "كرسي بذراعين"),
        description: L(
            "A deep armchair for reading corners and receptions.",
            "Un fauteuil profond pour les coins lecture et les accueils.",
            "Ein tiefer Sessel für Leseecken und Empfangsbereiche.",
            "Una butaca amplia para rincones de lectura y recepciones.",
            "كرسي عميق بذراعين لزوايا القراءة والاستقبال.",
        ),
        variants: (["terracotta", "green", "blue", "charcoal"] as const).map((fabric) => ({
            key: fabric,
            color: FABRICS[fabric],
            direction: "Down" as const,
            draw: () => armchair(fabric),
        })),
    },
    {
        key: "coffee-table",
        category: "lounge",
        tags: ["table", "low", "lounge"],
        name: L("Coffee table", "Table basse", "Couchtisch", "Mesa de centro", "طاولة قهوة"),
        description: L(
            "A low table to place between sofas and armchairs.",
            "Une table basse à placer entre canapés et fauteuils.",
            "Ein niedriger Tisch zwischen Sofas und Sesseln.",
            "Una mesa baja para colocar entre sofás y butacas.",
            "طاولة منخفضة توضع بين الأرائك والكراسي.",
        ),
        variants: (["oak", "walnut", "white"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => coffeeTable(wood),
            collisionGrid: [[1, 1]],
        })),
    },
    {
        key: "reception-desk",
        category: "reception",
        tags: ["reception", "counter", "welcome"],
        name: L("Reception desk", "Banque d’accueil", "Empfangstheke", "Mostrador de recepción", "مكتب استقبال"),
        description: L(
            "A three-tile counter with a raised ledge, for the entrance of your office.",
            "Un comptoir de trois cases avec tablette surélevée, pour l’entrée de vos bureaux.",
            "Eine drei Felder breite Theke mit erhöhter Ablage für den Eingang Ihres Büros.",
            "Un mostrador de tres casillas con repisa elevada, para la entrada de tu oficina.",
            "منضدة بعرض ثلاث خانات مع رف مرتفع لمدخل مكتبك.",
        ),
        variants: (["white", "oak", "walnut"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => receptionDesk(wood),
            collisionGrid: [
                [0, 0, 0],
                [1, 1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "plant-large",
        category: "plants",
        tags: ["plant", "green", "decoration"],
        name: L("Large plant", "Grande plante", "Große Pflanze", "Planta grande", "نبتة كبيرة"),
        description: L(
            "A leafy floor plant in a ceramic pot, to soften corners and corridors.",
            "Une plante d’intérieur feuillue en pot céramique, pour adoucir angles et couloirs.",
            "Eine üppige Zimmerpflanze im Keramiktopf für Ecken und Flure.",
            "Una planta frondosa en maceta de cerámica para esquinas y pasillos.",
            "نبتة كثيفة الأوراق في أصيص خزفي لتلطيف الزوايا والممرات.",
        ),
        variants: (["terracotta", "white", "charcoal"] as const).map((pot) => ({
            key: pot,
            color: POTS[pot],
            direction: "Down" as const,
            draw: () => plant(pot, "large"),
            collisionGrid: [[0], [1]],
            depthOffset: -32,
        })),
    },
    {
        key: "plant-small",
        category: "plants",
        tags: ["plant", "desk", "decoration"],
        name: L("Small plant", "Petite plante", "Kleine Pflanze", "Planta pequeña", "نبتة صغيرة"),
        description: L(
            "A compact plant for shelves, desks and window sills.",
            "Une plante compacte pour étagères, bureaux et rebords de fenêtre.",
            "Eine kompakte Pflanze für Regale, Schreibtische und Fensterbänke.",
            "Una planta compacta para estantes, escritorios y alféizares.",
            "نبتة صغيرة للرفوف والمكاتب وحواف النوافذ.",
        ),
        variants: (["terracotta", "white", "charcoal"] as const).map((pot) => ({
            key: pot,
            color: POTS[pot],
            direction: "Down" as const,
            draw: () => plant(pot, "small"),
        })),
    },
    {
        key: "bookshelf",
        category: "decoration",
        tags: ["shelf", "books", "storage"],
        name: L("Bookshelf", "Bibliothèque", "Bücherregal", "Estantería", "رف كتب"),
        description: L(
            "A tall shelf filled with books, to set against a wall.",
            "Une haute étagère garnie de livres, à placer contre un mur.",
            "Ein hohes, mit Büchern gefülltes Regal für die Wand.",
            "Una estantería alta llena de libros, para apoyar contra la pared.",
            "رف طويل مليء بالكتب يوضع مقابل الجدار.",
        ),
        variants: (["oak", "walnut", "white"] as const).map((wood) => ({
            key: wood,
            color: WOODS[wood].top,
            direction: "Down" as const,
            draw: () => bookshelf(wood),
            collisionGrid: [
                [0, 0],
                [1, 1],
            ],
            depthOffset: -32,
        })),
    },
    {
        key: "rug",
        category: "decoration",
        tags: ["rug", "carpet", "floor"],
        name: L("Area rug", "Tapis", "Teppich", "Alfombra", "سجادة"),
        description: L(
            "A bordered rug that stays under people's feet, to mark a lounge or meeting area.",
            "Un tapis bordé qui reste sous les pieds, pour délimiter un salon ou un espace de réunion.",
            "Ein umrandeter Teppich unter den Füßen, um eine Lounge oder einen Besprechungsbereich zu markieren.",
            "Una alfombra con borde que queda bajo los pies, para marcar una zona de descanso o reunión.",
            "سجادة بإطار تبقى تحت الأقدام لتحديد منطقة استراحة أو اجتماع.",
        ),
        variants: (
            [
                ["indigo", "#4458a8"],
                ["sand", "#c9a878"],
                ["sage", "#7f9f86"],
                ["clay", "#b9694a"],
            ] as const
        ).map(([key, color]) => ({ key, color, direction: "Down" as const, draw: () => rug(color), depthOffset: -64 })),
    },
    {
        key: "wall-art",
        category: "decoration",
        tags: ["art", "frame", "wall"],
        name: L("Framed print", "Affiche encadrée", "Gerahmter Druck", "Lámina enmarcada", "لوحة مؤطرة"),
        description: L(
            "An abstract framed print for walls and partitions.",
            "Une affiche abstraite encadrée pour murs et cloisons.",
            "Ein abstrakter gerahmter Druck für Wände und Trennwände.",
            "Una lámina abstracta enmarcada para paredes y mamparas.",
            "لوحة تجريدية مؤطرة للجدران والفواصل.",
        ),
        variants: (
            [
                ["coral", "#e0765a"],
                ["ocean", "#3f7fd0"],
                ["sun", "#e0b44b"],
            ] as const
        ).map(([key, color]) => ({ key, color, direction: "Down" as const, draw: () => wallArt(color) })),
    },
    {
        key: "floor-lamp",
        category: "lighting",
        tags: ["lamp", "light", "lounge"],
        name: L("Floor lamp", "Lampadaire", "Stehleuchte", "Lámpara de pie", "مصباح أرضي"),
        description: L(
            "A fabric-shade floor lamp with a warm glow.",
            "Un lampadaire à abat-jour en tissu à la lumière chaude.",
            "Eine Stehleuchte mit Stoffschirm und warmem Licht.",
            "Una lámpara de pie con pantalla de tela y luz cálida.",
            "مصباح أرضي بغطاء قماشي وإضاءة دافئة.",
        ),
        variants: (["black", "brass"] as const).map((finish) => ({
            key: finish,
            color: finish === "black" ? "#2a2d33" : "#b8913f",
            direction: "Down" as const,
            draw: () => floorLamp(finish),
            collisionGrid: [[0], [1]],
            depthOffset: -32,
        })),
    },
    {
        key: "whiteboard",
        category: "presentation",
        tags: ["whiteboard", "brainstorm", "meeting"],
        name: L("Whiteboard", "Tableau blanc", "Whiteboard", "Pizarra blanca", "سبورة بيضاء"),
        description: L(
            "A mobile whiteboard. In the editor, give it an “Open website” property to link your online whiteboard.",
            "Un tableau blanc mobile. Dans l’éditeur, ajoutez-lui une propriété « Ouvrir un site » vers votre tableau en ligne.",
            "Ein mobiles Whiteboard. Im Editor mit der Eigenschaft „Website öffnen“ mit Ihrem Online-Whiteboard verknüpfen.",
            "Una pizarra móvil. En el editor, añádele la propiedad «Abrir sitio web» hacia tu pizarra en línea.",
            "سبورة متنقلة. في المحرر، أضف لها خاصية «فتح موقع» لربطها بسبورتك على الإنترنت.",
        ),
        variants: [
            {
                key: "standard",
                color: "#fbfcfd",
                direction: "Down",
                draw: whiteboard,
                collisionGrid: [
                    [0, 0],
                    [1, 1],
                ],
                depthOffset: -32,
            },
        ],
    },
    {
        key: "presentation-screen",
        category: "presentation",
        tags: ["screen", "presentation", "display"],
        name: L(
            "Presentation screen",
            "Écran de présentation",
            "Präsentationsbildschirm",
            "Pantalla de presentación",
            "شاشة عرض",
        ),
        description: L(
            "A large display on a stand. Link it to a slide deck or a dashboard with the editor's properties.",
            "Un grand écran sur pied. Reliez-le à une présentation ou à un tableau de bord avec les propriétés de l’éditeur.",
            "Ein großer Bildschirm auf Ständer. Mit den Editor-Eigenschaften mit Folien oder einem Dashboard verknüpfen.",
            "Una gran pantalla con soporte. Enlázala a una presentación o a un panel con las propiedades del editor.",
            "شاشة كبيرة على حامل. اربطها بعرض تقديمي أو لوحة متابعة عبر خصائص المحرر.",
        ),
        variants: [
            {
                key: "standard",
                color: "#26355e",
                direction: "Down",
                draw: presentationScreen,
                collisionGrid: [
                    [0, 0],
                    [1, 1],
                ],
                depthOffset: -32,
            },
        ],
    },
    {
        key: "dual-monitor",
        category: "computers",
        tags: ["monitor", "screen", "desk"],
        name: L("Dual monitor", "Double écran", "Doppelmonitor", "Doble monitor", "شاشتان"),
        description: L(
            "Two monitors to set on a desk.",
            "Deux écrans à poser sur un bureau.",
            "Zwei Monitore für den Schreibtisch.",
            "Dos monitores para colocar sobre un escritorio.",
            "شاشتان توضعان على المكتب.",
        ),
        variants: [{ key: "standard", color: "#3d5fc4", direction: "Down", draw: dualMonitor }],
    },
    {
        key: "laptop",
        category: "computers",
        tags: ["laptop", "computer", "desk"],
        name: L("Laptop", "Ordinateur portable", "Laptop", "Portátil", "حاسوب محمول"),
        description: L(
            "An open laptop for desks and meeting tables.",
            "Un ordinateur portable ouvert pour bureaux et tables de réunion.",
            "Ein aufgeklappter Laptop für Schreib- und Besprechungstische.",
            "Un portátil abierto para escritorios y mesas de reuniones.",
            "حاسوب محمول مفتوح للمكاتب وطاولات الاجتماعات.",
        ),
        variants: [{ key: "standard", color: "#b9c0ca", direction: "Down", draw: laptop }],
    },
    {
        key: "printer",
        category: "computers",
        tags: ["printer", "office", "equipment"],
        name: L("Printer", "Imprimante", "Drucker", "Impresora", "طابعة"),
        description: L(
            "A multifunction printer for the copy corner.",
            "Une imprimante multifonction pour le coin reprographie.",
            "Ein Multifunktionsdrucker für die Kopierecke.",
            "Una impresora multifunción para la zona de copias.",
            "طابعة متعددة الوظائف لركن النسخ.",
        ),
        variants: [{ key: "standard", color: "#e7eaee", direction: "Down", draw: printer, collisionGrid: [[1]] }],
    },
    {
        key: "coffee-machine",
        category: "interactive",
        tags: ["coffee", "kitchen", "break"],
        name: L("Coffee station", "Machine à café", "Kaffeestation", "Estación de café", "ركن القهوة"),
        description: L(
            "A coffee machine on its cabinet, the natural meeting point. Add a “Meeting room” property in the editor for spontaneous chats.",
            "Une machine à café sur son meuble, point de rencontre naturel. Ajoutez une propriété « Salle de réunion » dans l’éditeur.",
            "Eine Kaffeemaschine auf ihrem Schrank, der natürliche Treffpunkt. Im Editor eine Eigenschaft „Besprechungsraum“ hinzufügen.",
            "Una cafetera sobre su mueble, el punto de encuentro natural. Añade una propiedad «Sala de reuniones» en el editor.",
            "آلة قهوة على خزانتها، نقطة لقاء طبيعية. أضف خاصية «غرفة اجتماعات» في المحرر للأحاديث العفوية.",
        ),
        variants: [
            {
                key: "standard",
                color: "#2b3038",
                direction: "Down",
                draw: coffeeMachine,
                collisionGrid: [[0], [1]],
                depthOffset: -32,
            },
        ],
    },
    {
        key: "water-cooler",
        category: "interactive",
        tags: ["water", "kitchen", "break"],
        name: L("Water cooler", "Fontaine à eau", "Wasserspender", "Fuente de agua", "مبرد مياه"),
        description: L(
            "A water fountain for corridors and break areas.",
            "Une fontaine à eau pour couloirs et espaces de pause.",
            "Ein Wasserspender für Flure und Pausenbereiche.",
            "Una fuente de agua para pasillos y zonas de descanso.",
            "مبرد مياه للممرات ومناطق الاستراحة.",
        ),
        variants: [
            {
                key: "standard",
                color: "#6fb6e8",
                direction: "Down",
                draw: waterCooler,
                collisionGrid: [[0], [1]],
                depthOffset: -32,
            },
        ],
    },
    {
        key: "vending-machine",
        category: "interactive",
        tags: ["snacks", "kitchen", "break"],
        name: L("Vending machine", "Distributeur", "Verkaufsautomat", "Máquina expendedora", "آلة بيع"),
        description: L(
            "A snack and drinks machine for the cafeteria.",
            "Un distributeur de boissons et d’en-cas pour la cafétéria.",
            "Ein Automat für Snacks und Getränke in der Cafeteria.",
            "Una máquina de bebidas y aperitivos para la cafetería.",
            "آلة للوجبات الخفيفة والمشروبات في الكافتيريا.",
        ),
        variants: [
            {
                key: "standard",
                color: "#2f4fb5",
                direction: "Down",
                draw: vendingMachine,
                collisionGrid: [[0], [1]],
                depthOffset: -32,
            },
        ],
    },
    {
        key: "glass-door",
        category: "navigation",
        tags: ["door", "glass", "entrance"],
        name: L("Glass door", "Porte vitrée", "Glastür", "Puerta de cristal", "باب زجاجي"),
        description: L(
            "A double glass door. Combine it with an exit area in the editor to link rooms.",
            "Une porte vitrée double. Associez-la à une zone de sortie dans l’éditeur pour relier des salles.",
            "Eine doppelte Glastür. Im Editor mit einem Ausgangsbereich kombinieren, um Räume zu verbinden.",
            "Una puerta doble de cristal. Combínala con una zona de salida en el editor para conectar salas.",
            "باب زجاجي مزدوج. ادمجه مع منطقة خروج في المحرر لربط الغرف.",
        ),
        variants: [{ key: "standard", color: "#9fd0ee", direction: "Down", draw: glassDoor }],
    },
    {
        key: "exit-sign",
        category: "navigation",
        tags: ["exit", "sign", "safety"],
        name: L("Exit sign", "Panneau de sortie", "Notausgangsschild", "Señal de salida", "لافتة خروج"),
        description: L(
            "A green exit sign with a running figure and an arrow.",
            "Un panneau de sortie vert avec silhouette et flèche.",
            "Ein grünes Ausgangsschild mit laufender Figur und Pfeil.",
            "Una señal de salida verde con figura y flecha.",
            "لافتة خروج خضراء مع شخص يركض وسهم.",
        ),
        variants: [
            { key: "right", color: "#1f9d55", direction: "Right", draw: exitSign },
            { key: "left", color: "#1f9d55", direction: "Left", draw: () => exitSign().flipped() },
        ],
    },
    {
        key: "floor-arrow",
        category: "wayfinding",
        tags: ["arrow", "floor", "wayfinding", "accessibility"],
        name: L("Floor arrow", "Flèche au sol", "Bodenpfeil", "Flecha de suelo", "سهم أرضي"),
        description: L(
            "A high-contrast floor marking that guides people along a route, in four directions.",
            "Un marquage au sol contrasté qui guide le long d’un parcours, dans quatre directions.",
            "Eine kontrastreiche Bodenmarkierung, die entlang eines Weges führt, in vier Richtungen.",
            "Una señal de suelo de alto contraste que guía por un recorrido, en cuatro direcciones.",
            "علامة أرضية عالية التباين ترشد الأشخاص على المسار بأربعة اتجاهات.",
        ),
        variants: ALL_DIRECTIONS.map((direction) => ({
            key: direction.toLowerCase(),
            color: "#2b47c2",
            direction,
            draw: () => floorArrow(direction),
            depthOffset: -32,
        })),
    },
    {
        key: "tactile-paving",
        category: "wayfinding",
        tags: ["accessibility", "floor", "tactile"],
        name: L("Tactile paving", "Bande podotactile", "Taktiles Bodenleitsystem", "Pavimento podotáctil", "بلاط لمسي"),
        description: L(
            "Yellow warning studs, as found before stairs and crossings, to signal an accessible route.",
            "Des plots jaunes d’éveil de vigilance, comme avant les escaliers, pour signaler un parcours accessible.",
            "Gelbe Aufmerksamkeitsnoppen wie vor Treppen, um einen barrierefreien Weg zu kennzeichnen.",
            "Tacos amarillos de advertencia, como antes de escaleras, para señalar un recorrido accesible.",
            "نتوءات تحذيرية صفراء كالتي قبل السلالم، للإشارة إلى مسار ميسّر.",
        ),
        variants: [{ key: "standard", color: "#e8b931", direction: "Down", draw: tactilePaving, depthOffset: -32 }],
    },
    {
        key: "signpost",
        category: "wayfinding",
        tags: ["sign", "directions", "wayfinding"],
        name: L("Direction signpost", "Panneau directionnel", "Wegweiser", "Poste indicador", "لافتة إرشادية"),
        description: L(
            "A two-panel signpost. Give it a name in the editor so people can find it in the map search.",
            "Un panneau à deux flèches. Nommez-le dans l’éditeur pour qu’on le retrouve dans la recherche.",
            "Ein Wegweiser mit zwei Schildern. Im Editor benennen, damit er in der Suche gefunden wird.",
            "Un poste con dos placas. Ponle nombre en el editor para encontrarlo en la búsqueda.",
            "لافتة بلوحتين. سمّها في المحرر ليعثر عليها الناس في البحث.",
        ),
        variants: [
            {
                key: "standard",
                color: "#2b47c2",
                direction: "Down",
                draw: signpost,
                collisionGrid: [[0], [1]],
                depthOffset: -32,
            },
        ],
    },
];
