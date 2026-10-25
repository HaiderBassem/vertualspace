/**
 * The 3D models of AdminSpace's built-in furniture (see src/lib/catalog/model3d/types.ts for the space they live in).
 *
 * One builder per component, called for each of its variants: the variant keys, colors and directions are the ones
 * of the catalog, so the furniture already placed in maps keeps working. The picture of a variant is drawn from its
 * model, and the model itself is published with it for the game to draw.
 *
 * Reminder of the camera: a point at height y is drawn y pixels above the ground point under it, so a model of depth d
 * in a picture of height h can be at most `h - d - 2` tall at its back edge (taller parts must stand further forward).
 */
import { shade } from "./canvas";
import { HEIGHT_SCALE } from "../../src/lib/catalog/model3d/render";
import { MODEL_SCHEMA, type ModelSeat, type Model3D, type Part } from "../../src/lib/catalog/model3d/types";
import type { Direction } from "../../src/lib/catalog/manifest";

export interface VariantInfo {
    key: string;
    color: string;
    direction: Direction;
}

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

type Extra = Partial<Pick<Part, "yaw" | "opacity" | "glow">>;

const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    extra: Extra = {},
): Part => ({
    shape: "box",
    at: [x, y, z],
    size: [w, h, d],
    color,
    ...extra,
});

/** A cylinder with an oval base (radii rx along x and rz along z). */
const cyl = (
    cx: number,
    y: number,
    cz: number,
    rx: number,
    rz: number,
    h: number,
    color: string,
    extra: Extra = {},
): Part => ({
    shape: "cone",
    at: [cx, y, cz],
    r0: 1,
    r1: 1,
    h,
    squash: [rx, rz],
    color,
    ...extra,
});

/** A cone with its top cut off (radii r0 at the base and r1 at the top). */
const cone = (
    cx: number,
    y: number,
    cz: number,
    r0: number,
    r1: number,
    h: number,
    color: string,
    extra: Extra = {},
): Part => ({
    shape: "cone",
    at: [cx, y, cz],
    r0,
    r1,
    h,
    color,
    ...extra,
});

const ball = (
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    color: string,
    extra: Extra = {},
): Part => ({
    shape: "ellipsoid",
    at: [cx, cy, cz],
    r: [rx, ry, rz],
    color,
    ...extra,
});

const wrap = (yaw: number): number => (((yaw % 360) + 540) % 360) - 180;

/** The parts turned by `degrees` around the vertical axis through (cx, cz): the front of the model then looks another way. */
function turned(parts: Part[], cx: number, cz: number, degrees: number): Part[] {
    const a = (degrees * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const move = (x: number, z: number): [number, number] => [
        cx + cos * (x - cx) + sin * (z - cz),
        cz - sin * (x - cx) + cos * (z - cz),
    ];
    return parts.map((part) => {
        const yaw = wrap((part.yaw ?? 0) + degrees);
        if (part.shape === "box") {
            const [nx, nz] = move(part.at[0] + part.size[0] / 2, part.at[2] + part.size[2] / 2);
            return { ...part, at: [nx - part.size[0] / 2, part.at[1], nz - part.size[2] / 2], yaw };
        }
        const [nx, nz] = move(part.at[0], part.at[2]);
        return { ...part, at: [nx, part.at[1], nz], yaw };
    });
}

/** A place to sit, in the world of the model: where the person is on the ground (x, z), how high the seat is, and the way they face. */
interface WorldSeat {
    x: number;
    z: number;
    y: number;
    direction: Direction;
}

function build(width: number, height: number, depth: number, parts: Part[], seats?: WorldSeat[]): Model3D {
    const oy = height - depth - 2;
    const toScreen = (seat: WorldSeat): ModelSeat => ({
        x: Math.round(seat.x * 10) / 10,
        y: Math.round((seat.z - seat.y * HEIGHT_SCALE + oy) * 10) / 10,
        direction: seat.direction,
    });
    return {
        schema: MODEL_SCHEMA,
        width,
        height,
        depth,
        parts,
        ...(seats && seats.length > 0 ? { seats: seats.map(toScreen) } : {}),
    };
}

const FACING: Record<Direction, number> = { Down: 0, Right: 90, Up: 180, Left: -90 };

/** A square piece of furniture drawn facing down, turned to face the direction of the variant. */
function facing(parts: Part[], size: number, depth: number, direction: Direction): Part[] {
    return FACING[direction] === 0 ? parts : turned(parts, size / 2, depth / 2, FACING[direction]);
}

function turnSeat(seat: WorldSeat, size: number, depth: number, direction: Direction): WorldSeat {
    const degrees = FACING[direction];
    if (degrees === 0) return seat;
    const a = (degrees * Math.PI) / 180;
    const cx = size / 2;
    const cz = depth / 2;
    const dx = seat.x - cx;
    const dz = seat.z - cz;
    const order: Direction[] = ["Down", "Right", "Up", "Left"];
    return {
        ...seat,
        x: cx + Math.cos(a) * dx + Math.sin(a) * dz,
        z: cz - Math.sin(a) * dx + Math.cos(a) * dz,
        direction: order[(order.indexOf(seat.direction) + order.indexOf(direction)) % 4]!,
    };
}

// ---------------------------------------------------------------------------------------------
// Palettes (the colors of the catalog)
// ---------------------------------------------------------------------------------------------

const WOOD: Record<string, string> = {
    oak: "#c99860",
    walnut: "#8a5a3a",
    white: "#e9ebee",
    graphite: "#4b515b",
    birch: "#e8dcc0",
};
const FABRIC: Record<string, string> = {
    blue: "#4060c8",
    slate: "#6e7889",
    green: "#3f8b69",
    terracotta: "#c5653f",
    charcoal: "#3d4149",
};
const POT: Record<string, string> = { terracotta: "#c46b41", white: "#e9ebee", charcoal: "#40444c" };
const METAL = { light: "#b9c0ca", mid: "#8a929e", dark: "#4b515b", black: "#23262c" };
const word = (key: string): string => key.split("-")[0]!;
const wood = (key: string): string => WOOD[word(key)] ?? WOOD.oak!;
const fabric = (key: string): string => FABRIC[word(key)] ?? FABRIC.blue!;

// ---------------------------------------------------------------------------------------------
// Desks and tables
// ---------------------------------------------------------------------------------------------

function desk(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const leg = shade(top, -0.3);
    const parts = [
        ...[
            [3, 2],
            [57, 2],
            [3, 19],
            [57, 19],
        ].map(([x, z]) => box(x!, 0, z!, 4, 23, 4, leg)),
        box(40, 4, 3, 19, 18, 18, shade(top, -0.08)),
        ...[0, 1, 2].map((i) => box(42, 5 + i * 6, 21.2, 15, 4.6, 0.8, shade(top, 0.1))),
        ...[0, 1, 2].map((i) => box(48, 6.6 + i * 6, 22, 3, 1.4, 0.8, METAL.light)),
        box(1, 22, 0, 62, 5, 24, top),
    ];
    return build(64, 64, 26, parts);
}

function standingDesk(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const parts = [
        box(5, 0, 18, 12, 2, 5, METAL.dark),
        box(47, 0, 18, 12, 2, 5, METAL.dark),
        box(5, 0, 3, 12, 2, 5, METAL.dark),
        box(47, 0, 3, 12, 2, 5, METAL.dark),
        box(9, 2, 4, 4, 30, 18, METAL.mid),
        box(51, 2, 4, 4, 30, 18, METAL.mid),
        box(1, 32, 0, 62, 4, 24, top),
        box(8, 29, 6, 48, 3, 12, shade(top, -0.2)),
    ];
    return build(64, 64, 26, parts);
}

function meetingTable(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const parts = [
        ...[
            [6, 2],
            [86, 2],
            [6, 19],
            [86, 19],
        ].map(([x, z]) => box(x!, 0, z!, 4, 23, 4, shade(top, -0.3))),
        box(2, 22, 0, 92, 5, 24, top),
        box(36, 27, 9, 24, 0.8, 6, shade(top, -0.3)),
        box(40, 27.8, 10.5, 4, 0.6, 3, METAL.light),
        box(52, 27.8, 10.5, 4, 0.6, 3, METAL.light),
    ];
    return build(96, 64, 26, parts);
}

function roundTable(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const parts = [
        cyl(32, 0, 16, 15, 9, 2, shade(top, -0.35)),
        cyl(32, 2, 16, 4, 3, 18, shade(top, -0.3)),
        cyl(32, 20, 16, 27, 16, 4, top),
        cyl(32, 24, 16, 24, 14, 0.8, shade(top, 0.12)),
    ];
    return build(64, 64, 34, parts);
}

function coffeeTable(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const parts = [
        ...[
            [7, 2],
            [53, 2],
            [7, 10],
            [53, 10],
        ].map(([x, z]) => box(x!, 0, z!, 3, 8, 3, shade(top, -0.3))),
        box(5, 8, 1, 54, 3, 13, top),
        box(18, 11, 4, 8, 4, 6, "#c94f4f"),
        cyl(22, 14.4, 7, 2.6, 2.6, 0.8, "#7a4a2a"),
        box(36, 11, 4, 12, 1, 8, "#e6ebf2"),
    ];
    return build(64, 32, 16, parts);
}

function receptionDesk(v: VariantInfo): Model3D {
    const top = wood(v.key);
    const parts = [
        box(2, 0, 4, 92, 22, 26, shade(top, -0.12)),
        box(3, 9, 30.2, 90, 5, 0.8, "#3b5cc8", { glow: 0.3 }),
        ...[12, 32, 52, 72].map((x) => box(x, 3, 30.2, 0.8, 18, 0.8, shade(top, -0.4))),
        box(0, 22, 2, 96, 4, 28, top),
        box(4, 26, 0, 88, 5, 9, shade(top, -0.1)),
        box(8, 31, 2, 14, 0.8, 5, METAL.light),
    ];
    return build(96, 64, 32, parts);
}

// ---------------------------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------------------------

function officeChair(v: VariantInfo): Model3D {
    const cloth = fabric(v.key);
    // A square footprint (x 8 to 24, z 0 to 16) so that the chair turns without leaving the picture.
    const parts = [
        ...[
            [11, 12],
            [21, 12],
            [16, 14.4],
            [11, 4.4],
            [21, 4.4],
        ].map(([x, z]) => box(x! - 1.3, 0, z! - 1.3, 2.6, 2, 2.6, METAL.black)),
        cyl(16, 1.4, 9, 1.8, 1.8, 6.4, METAL.dark),
        cyl(16, 1.2, 9, 6.4, 5.6, 1.4, METAL.dark),
        box(9, 7.6, 4.5, 14, 3.2, 11, cloth),
        box(10, 10.8, 1.6, 12, 10, 3, shade(cloth, -0.1)),
        box(8, 10, 5, 2, 5, 8, METAL.dark),
        box(22, 10, 5, 2, 5, 8, METAL.dark),
    ];
    return build(32, 32, 16, facing(parts, 32, 16, v.direction), [
        turnSeat({ x: 16, z: 10, y: 9, direction: "Down" }, 32, 16, v.direction),
    ]);
}

function sofa(v: VariantInfo): Model3D {
    const cloth = fabric(v.key);
    const parts = [
        box(3, 0, 5, 58, 6, 21, shade(cloth, -0.3)),
        box(3, 6, 4, 58, 14, 8, shade(cloth, -0.1)),
        box(7, 6, 11, 24.5, 6, 15, cloth),
        box(32.5, 6, 11, 24.5, 6, 15, cloth),
        box(1, 6, 5, 8, 14, 21, shade(cloth, -0.05)),
        box(55, 6, 5, 8, 14, 21, shade(cloth, -0.05)),
        box(2.5, 20, 5, 7, 2, 21, shade(cloth, 0.12)),
        box(54.5, 20, 5, 7, 2, 21, shade(cloth, 0.12)),
        ...[0, 1].map((i) => ball(19 + i * 26, 14, 9.6, 8, 5, 3, shade(cloth, 0.2))),
    ];
    const seats: WorldSeat[] = [
        { x: 19, z: 18, y: 12, direction: "Down" },
        { x: 45, z: 18, y: 12, direction: "Down" },
    ];
    return build(
        64,
        64,
        30,
        facing(parts, 64, 30, v.direction === "Up" ? "Up" : "Down"),
        seats.map((seat) => turnSeat(seat, 64, 30, v.direction === "Up" ? "Up" : "Down")),
    );
}

function armchair(v: VariantInfo): Model3D {
    const cloth = fabric(v.key);
    const parts = [
        box(4, 0, 3, 24, 5, 12, shade(cloth, -0.3)),
        box(5, 5, 1.5, 22, 11, 5, shade(cloth, -0.1)),
        box(9, 5, 6, 14, 4, 9, cloth),
        box(3, 5, 3, 6, 8, 12, shade(cloth, -0.05)),
        box(23, 5, 3, 6, 8, 12, shade(cloth, -0.05)),
        box(3, 13, 3, 6, 1.4, 12, shade(cloth, 0.12)),
        box(23, 13, 3, 6, 1.4, 12, shade(cloth, 0.12)),
    ];
    return build(32, 32, 16, parts, [{ x: 16, z: 10, y: 9, direction: "Down" }]);
}

const BEANBAG_COLORS: Record<string, string> = {
    terracotta: "#c5653f",
    blue: "#4060c8",
    green: "#3f8b69",
    mustard: "#d9a63a",
    plum: "#7a4f8f",
};

function beanbag(v: VariantInfo): Model3D {
    const c = BEANBAG_COLORS[v.key] ?? v.color;
    const parts = [
        ball(16, 7, 13, 13.5, 7, 11, shade(c, -0.12)),
        ball(16, 10, 10, 11, 5.4, 7.5, c),
        ball(16, 9.6, 14, 8.5, 3.4, 5.5, shade(c, -0.18)),
        ball(11, 12.6, 8.6, 4.4, 1.8, 2.4, shade(c, 0.22)),
    ];
    return build(32, 32, 22, parts, [{ x: 16, z: 14, y: 9, direction: "Down" }]);
}

function bench(length: number, wd: string): { parts: Part[]; seats: WorldSeat[] } {
    const top = WOOD[wd] ?? WOOD.oak!;
    const L = length;
    // Centred on x = L / 2, z = 7.5 (it spans z 0 to 15).
    const parts: Part[] = [
        box(2, 0, 3, 3, 8, 10, METAL.black),
        box(L - 5, 0, 3, 3, 8, 10, METAL.black),
        box(1, 8, 4, L - 2, 2.4, 10, top),
        box(0.5, 10.4, 4, L - 1, 0.8, 10, shade(top, 0.08)),
        box(2, 10, 2, 3, 10, 2, METAL.black),
        box(L - 5, 10, 2, 3, 10, 2, METAL.black),
        ...[0, 1, 2].map((i) => box(1, 11 + i * 3.2, 2, L - 2, 2.2, 2, shade(top, i === 1 ? -0.08 : 0))),
    ];
    const seats: WorldSeat[] =
        L > 40
            ? [
                  { x: L * 0.3, z: 9, y: 9.5, direction: "Down" },
                  { x: L * 0.7, z: 9, y: 9.5, direction: "Down" },
              ]
            : [{ x: L / 2, z: 9, y: 9.5, direction: "Down" }];
    return { parts, seats };
}

function gardenBench(v: VariantInfo): Model3D {
    const wd = word(v.key);
    if (v.direction === "Down" || v.direction === "Up") {
        const { parts, seats } = bench(64, wd);
        const face = v.direction === "Up" ? "Up" : "Down";
        return build(
            64,
            32,
            15,
            facing(parts, 64, 15, face),
            seats.map((seat) => turnSeat(seat, 64, 15, face)),
        );
    }
    // Seen from the side the bench is shorter, so that it fits the picture: it is built lengthways, centred, then turned.
    const { parts, seats } = bench(28, wd);
    const centred = (x: number, z: number) => [x + 2, z + 7] as const;
    const moved = parts.map((p) => {
        if (p.shape !== "box") return p;
        const [x, z] = centred(p.at[0], p.at[2]);
        return { ...p, at: [x, p.at[1], z] as [number, number, number] };
    });
    const turnedParts = turned(moved, 16, 14.5, FACING[v.direction]);
    const turnedSeats = seats.map((seat) => {
        const [x, z] = centred(seat.x, seat.z);
        return turnSeat({ ...seat, x, z }, 32, 29, v.direction);
    });
    return build(32, 64, 29, turnedParts, turnedSeats);
}

function stumpStool(v: VariantInfo): Model3D {
    const birch = v.key === "birch";
    const bark = birch ? "#e4e1d8" : "#6b4a2b";
    const wd = birch ? "#efe3c4" : "#d9aa6c";
    const ring = birch ? "#d3c08f" : "#b98648";
    const parts = [
        cyl(16, 0, 13, 11, 9, 9, bark),
        ...(birch ? [box(8, 3, 21.2, 4, 1, 0.5, "#2f2f33"), box(18, 5.5, 21.4, 5, 1, 0.5, "#2f2f33")] : []),
        cyl(16, 9, 13, 11, 9, 1.4, wd),
        cyl(16, 10.4, 13, 8, 6.5, 0.2, ring),
        cyl(16, 10.6, 13, 5, 4, 0.2, wd),
        cyl(16, 10.8, 13, 2, 1.6, 0.2, ring),
    ];
    return build(32, 32, 24, parts, [{ x: 16, z: 13, y: 11, direction: "Down" }]);
}

function logBench(v: VariantInfo): Model3D {
    const birch = v.key === "birch";
    const bark = birch ? "#e4e1d8" : "#6b4a2b";
    const wd = birch ? "#efe3c4" : "#d9aa6c";
    const parts = [
        ball(32, 7, 12, 30, 7.5, 7.5, bark),
        box(8, 12.4, 6.5, 48, 1.6, 11, wd),
        ...[10, 20, 30, 40, 50].map((x) => box(x, 3, 19, 0.8, 8, 0.8, shade(bark, -0.3))),
        ...(birch ? [box(14, 6, 19.4, 5, 1, 0.5, "#2f2f33"), box(40, 8, 19.4, 4, 1, 0.5, "#2f2f33")] : []),
    ];
    const seats: WorldSeat[] = [
        { x: 22, z: 12, y: 14, direction: "Down" },
        { x: 42, z: 12, y: 14, direction: "Down" },
    ];
    return build(64, 32, 20, parts, seats);
}

const RATTAN: Record<string, string> = { natural: "#c89b5e", dark: "#8a5e3b", white: "#efe9dc" };
const CUSHION: Record<string, string> = { natural: "#f1e6cf", dark: "#d98c6a", white: "#9db79a" };

function rattanChair(v: VariantInfo): Model3D {
    const tone = word(v.key);
    const r = RATTAN[tone] ?? RATTAN.natural!;
    const cushion = CUSHION[tone] ?? CUSHION.natural!;
    const parts = [
        ...[
            [10.5, 4.5],
            [21.5, 4.5],
            [10.5, 12.5],
            [21.5, 12.5],
        ].map(([x, z]) => box(x! - 1, 0, z! - 1, 2, 6, 2, shade(r, -0.3))),
        cyl(16, 6, 9, 8, 7, 2, r),
        cyl(16, 8, 9, 6.8, 5.8, 1.6, cushion),
        ball(16, 12, 3.4, 8, 7.4, 2.4, r),
        ball(16, 12, 4.8, 6, 5.6, 1, shade(r, 0.14)),
    ];
    return build(32, 32, 16, facing(parts, 32, 16, v.direction), [
        turnSeat({ x: 16, z: 9.5, y: 9, direction: "Down" }, 32, 16, v.direction),
    ]);
}

const HAMMOCK: Record<string, [string, string]> = {
    blue: ["#4060c8", "#e8eefc"],
    coral: ["#e0705a", "#fbe7e1"],
    green: ["#3f8b69", "#e5f2ea"],
};

function hammock(v: VariantInfo): Model3D {
    const [main, stripe] = HAMMOCK[v.key] ?? HAMMOCK.blue!;
    const parts: Part[] = [
        box(4, 0, 22, 7, 38, 7, "#6b4a2b"),
        box(85, 0, 22, 7, 38, 7, "#6b4a2b"),
        box(2, 0, 24, 11, 2, 3, "#432c19"),
        box(83, 0, 24, 11, 2, 3, "#432c19"),
    ];
    for (let i = 0; i < 24; i++) {
        const t = (i + 0.5) / 24;
        const sag = Math.sin(t * Math.PI) * 16;
        parts.push(box(11 + i * 3.1, 34 - sag, 18, 3.3, 3, 14, Math.floor(i / 2) % 2 === 0 ? main : stripe));
    }
    parts.push(ball(40, 22, 25, 9, 3, 5, "#fbf2d8"));
    return build(96, 64, 40, parts, [{ x: 48, z: 25, y: 20, direction: "Down" }]);
}

// ---------------------------------------------------------------------------------------------
// Storage, presentation, computers
// ---------------------------------------------------------------------------------------------

const BOOKS = ["#3f5fc6", "#c5653f", "#3f8b69", "#e0b44b", "#6e7889", "#8b4fb3", "#2f3f5f"];

function bookshelf(v: VariantInfo): Model3D {
    const w = wood(v.key);
    const parts: Part[] = [
        box(2, 0, 0, 3, 44, 16, w),
        box(59, 0, 0, 3, 44, 16, w),
        box(2, 41, 0, 60, 3, 16, shade(w, 0.08)),
        box(5, 3, 0, 54, 38, 2, shade(w, -0.4)),
        box(5, 0, 0, 54, 3, 16, shade(w, -0.1)),
    ];
    [14, 27].forEach((y) => parts.push(box(5, y, 0, 54, 2, 16, shade(w, 0.04))));
    let k = 0;
    for (const base of [3, 16, 29]) {
        let x = 6;
        while (x < 56) {
            const width = 3 + (k % 3);
            const height = 7 + ((k * 5) % 4);
            parts.push(box(x, base === 3 ? 3 : base + 1, 3, width, height, 11, BOOKS[k % BOOKS.length]!));
            x += width + 0.6;
            k++;
        }
    }
    return build(64, 64, 18, parts);
}

function whiteboard(): Model3D {
    const parts = [
        box(10, 0, 3, 3, 22, 3, METAL.dark),
        box(51, 0, 3, 3, 22, 3, METAL.dark),
        box(6, 0, 1, 12, 2, 7, METAL.dark),
        box(46, 0, 1, 12, 2, 7, METAL.dark),
        box(3, 20, 3, 58, 32, 3, METAL.mid),
        box(5, 22, 6, 54, 28, 0.8, "#fbfcfd"),
        box(10, 42, 6.8, 22, 2, 0.4, "#3f5fc6"),
        box(10, 38, 6.8, 32, 1, 0.4, "#9aa3b0"),
        box(10, 34, 6.8, 28, 1, 0.4, "#9aa3b0"),
        box(10, 30, 6.8, 16, 1, 0.4, "#9aa3b0"),
        cyl(48, 33, 6.9, 6, 0.4, 0.6, "#c5653f"),
        box(18, 20, 6, 28, 2, 3, METAL.light),
        box(22, 22, 6.5, 5, 1.2, 1.2, "#3f5fc6"),
        box(29, 22, 6.5, 5, 1.2, 1.2, "#c94f4f"),
    ];
    return build(64, 64, 10, parts);
}

function presentationScreen(): Model3D {
    const parts = [
        cyl(32, 0, 7, 14, 4, 2, METAL.dark),
        cyl(32, 2, 7, 2, 1.6, 22, METAL.dark),
        box(2, 22, 5, 60, 32, 3, "#0f1218"),
        box(4, 24, 8, 56, 28, 0.6, "#26355e", { glow: 0.75 }),
        ...[10, 16, 12, 22, 18].map((h, i) =>
            box(12 + i * 9, 26, 8.7, 6, h, 0.4, i === 3 ? "#7fa2ff" : "#4f6fd6", { glow: 0.9 }),
        ),
        box(8, 26, 8.7, 48, 1, 0.4, "#5a6888", { glow: 0.8 }),
    ];
    return build(64, 64, 12, parts);
}

function dualMonitor(): Model3D {
    const parts: Part[] = [];
    for (const x of [4, 33]) {
        parts.push(box(x + 8, 0, 7, 11, 1.5, 5, METAL.dark));
        parts.push(box(x + 12.5, 1.5, 8.5, 2, 6, 2, METAL.dark));
        parts.push(box(x, 7, 5, 27, 17, 2.6, "#1b2130"));
        parts.push(box(x + 1.6, 8.6, 7.7, 23.8, 13.8, 0.4, "#3d5fc4", { glow: 0.8 }));
        parts.push(box(x + 4, 17, 8.3, 12, 1, 0.3, "#a9bdff", { glow: 0.9 }));
        parts.push(box(x + 4, 14, 8.3, 16, 1, 0.3, "#7f97df", { glow: 0.9 }));
    }
    return build(64, 32, 14, parts);
}

function laptop(): Model3D {
    const parts = [
        box(3, 0, 6, 26, 1.8, 15, METAL.light),
        box(5, 1.8, 14, 22, 0.4, 5, METAL.mid),
        box(12, 1.8, 19, 8, 0.4, 1.4, METAL.dark),
        box(5, 1.8, 4, 22, 14, 2.2, "#20262f"),
        box(6.6, 3.2, 6.1, 18.8, 11, 0.4, "#3d5fc4", { glow: 0.8 }),
    ];
    return build(32, 32, 20, parts);
}

function printer(): Model3D {
    const parts = [
        box(3, 0, 3, 26, 11, 16, "#e7eaee"),
        box(4, 6, 19, 24, 3, 0.8, METAL.mid),
        box(9, 11, 5, 14, 6, 8, "#ffffff"),
        box(6, 9, 18.4, 20, 1, 0.8, METAL.dark),
        box(22, 7, 19, 4, 2, 0.6, "#3f8b69", { glow: 0.7 }),
    ];
    return build(32, 32, 20, parts);
}

function coffeeMachine(): Model3D {
    const parts = [
        box(2, 0, 2, 28, 22, 11, "#d2d7de"),
        box(15, 1, 12.4, 0.8, 19, 0.8, "#8f97a3"),
        box(5, 22, 3, 22, 22, 9, "#2b3038"),
        box(7, 36, 11.8, 18, 6, 0.6, "#3d4350"),
        box(9, 38, 12.4, 4, 2, 0.4, "#5ac8a0", { glow: 0.9 }),
        box(11, 26, 10, 10, 3, 2.4, "#15171b"),
        box(12.5, 22, 8, 7, 5, 4, "#f4f1ea"),
        box(13.5, 25, 9, 5, 2, 0.8, "#7a4a2a"),
    ];
    return build(32, 64, 14, parts);
}

function waterCooler(): Model3D {
    const parts = [
        box(7, 0, 3, 18, 32, 10, "#e3e7ec"),
        box(10, 20, 13.2, 3, 3, 1, "#3f7fd0"),
        box(19, 20, 13.2, 3, 3, 1, "#c94f4f"),
        box(11, 12, 13.2, 10, 1.6, 1, METAL.mid),
        ball(16, 42, 8, 8, 10, 6, "#6fb6e8", { opacity: 0.62 }),
        cyl(16, 32, 8, 4.4, 3, 3, "#d6dde5"),
    ];
    return build(32, 64, 14, parts);
}

function vendingMachine(): Model3D {
    const parts: Part[] = [
        box(1, 0, 2, 30, 48, 11, "#2f4fb5"),
        box(4, 14, 12.6, 19, 30, 0.6, "#d9e7f5", { opacity: 0.85 }),
        box(25, 28, 12.6, 4, 12, 0.6, "#15171b"),
        box(26, 22, 12.8, 2, 2, 0.4, "#5ac8a0", { glow: 0.9 }),
        box(4, 3, 12.6, 19, 8, 0.8, "#15171b"),
    ];
    const colors = ["#c94f4f", "#e0b44b", "#3f8b69", "#8b4fb3"];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
            parts.push(box(6 + col * 5.4, 17 + row * 7, 11.6, 4, 5, 1, colors[(row + col) % 4]!));
        }
    }
    return build(32, 64, 14, parts);
}

function glassDoor(): Model3D {
    const parts = [
        box(1, 0, 1, 30, 2, 3, METAL.dark),
        box(1, 54, 1, 30, 2, 3, METAL.dark),
        box(1, 0, 1, 2.4, 56, 3, METAL.dark),
        box(28.6, 0, 1, 2.4, 56, 3, METAL.dark),
        box(15, 2, 1, 2, 52, 3, METAL.dark),
        box(3.4, 2, 2, 11.6, 52, 1, "#9fd0ee", { opacity: 0.38 }),
        box(17, 2, 2, 11.6, 52, 1, "#9fd0ee", { opacity: 0.38 }),
        box(12, 24, 4, 1.4, 9, 1.4, METAL.light),
        box(18.6, 24, 4, 1.4, 9, 1.4, METAL.light),
    ];
    return build(32, 64, 6, parts);
}

function exitSign(v: VariantInfo): Model3D {
    const parts: Part[] = [box(2, 8, 0, 28, 16, 3, "#0f5c31"), box(3, 9, 2.8, 26, 14, 0.6, "#1f9d55", { glow: 0.65 })];
    const white = (x: number, y: number, w: number, h: number) => box(x, y, 3.4, w, h, 0.4, "#ffffff", { glow: 0.9 });
    parts.push(
        white(7, 15, 3, 3),
        white(7, 11, 3, 4),
        white(5, 13, 2, 2),
        white(10, 12, 2, 2),
        white(6, 10, 2, 2),
        white(9, 10, 2, 2),
    );
    parts.push(white(15, 14, 10, 2), white(22, 12, 2, 6), white(24, 13, 2, 4));
    const model = build(32, 32, 4, parts);
    return v.direction === "Left" ? mirrored(model) : model;
}

/** The model seen in a mirror (left and right swapped). */
function mirrored(model: Model3D): Model3D {
    const parts = model.parts.map((part): Part => {
        if (part.shape === "box") {
            return {
                ...part,
                at: [model.width - part.at[0] - part.size[0], part.at[1], part.at[2]],
                yaw: part.yaw === undefined ? undefined : -part.yaw,
            };
        }
        return {
            ...part,
            at: [model.width - part.at[0], part.at[1], part.at[2]],
            yaw: part.yaw === undefined ? undefined : -part.yaw,
        };
    });
    return {
        ...model,
        parts,
        ...(model.seats ? { seats: model.seats.map((s) => ({ ...s, x: model.width - s.x })) } : {}),
    };
}

function floorArrow(v: VariantInfo): Model3D {
    const blue = "#2b47c2";
    const arrow: Part[] = [
        box(6, 0, 13, 14, 1, 5, blue, { opacity: 0.85 }),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) =>
            box(18 + i * 1.4, 0, 8 + i * 1.4, 1.6, 1, 16 - i * 2.8, blue, { opacity: 0.85 }),
        ),
    ];
    // Drawn pointing right; turned to point the way of the variant.
    const degrees: Record<Direction, number> = { Right: 0, Down: 90, Left: 180, Up: -90 };
    return build(32, 32, 30, turned(arrow, 16, 15, degrees[v.direction]));
}

function tactilePaving(): Model3D {
    const parts: Part[] = [box(0, 0, 1.4, 32, 1.4, 30.6, "#e8b931")];
    for (let y = 4; y < 31; y += 7)
        for (let x = 4; x < 32; x += 7) parts.push(cyl(x, 1.4, y, 1.8, 1.8, 0.8, "#c99a17"));
    return build(32, 32, 30, parts);
}

function signpost(): Model3D {
    const parts = [
        cyl(16, 0, 7, 5, 3, 2, METAL.dark),
        box(14.6, 2, 5, 2.8, 44, 2.8, METAL.dark),
        box(3, 40, 7.5, 26, 9, 1.6, "#2b47c2"),
        box(6, 43.4, 9.1, 14, 1.6, 0.4, "#ffffff", { glow: 0.5 }),
        box(22, 42.6, 9.1, 4, 3, 0.4, "#ffffff", { glow: 0.5 }),
        box(5, 29, 7.5, 24, 8, 1.6, "#3f8b69"),
        box(10, 32.6, 9.1, 13, 1.6, 0.4, "#ffffff", { glow: 0.5 }),
    ];
    return build(32, 64, 12, parts);
}

function wallArt(v: VariantInfo): Model3D {
    const accent = v.color;
    const parts = [
        box(3, 5, 0, 26, 22, 2, "#3b3f46"),
        box(5, 7, 1.8, 22, 18, 0.6, "#f4f1ea"),
        box(7, 9, 2.2, 18, 14, 0.4, "#e6ebf2"),
        ball(13.5, 15, 2.6, 5, 5, 0.6, accent),
        box(15, 11, 2.6, 9, 7, 0.4, shade(accent, -0.3)),
        box(8, 10, 2.8, 16, 1, 0.3, "#9aa3b0"),
    ];
    return build(32, 32, 4, parts);
}

// ---------------------------------------------------------------------------------------------
// Plants, lighting, rugs
// ---------------------------------------------------------------------------------------------

const LEAVES = ["#2f6f43", "#3d8a52", "#56a664", "#7cc27a"];

function plantLarge(v: VariantInfo): Model3D {
    const pot = POT[v.key] ?? POT.terracotta!;
    const parts = [
        cone(16, 0, 11, 7, 9, 13, pot),
        cyl(16, 13, 11, 9.4, 9.4, 1.4, shade(pot, -0.2)),
        cyl(16, 13.5, 11, 8, 8, 1, "#5b4026"),
        cyl(16, 14, 11, 1.4, 1.4, 12, "#5b4026"),
        ball(10, 28, 10, 8, 9, 8, LEAVES[0]!),
        ball(22, 27, 11, 8, 9, 8, LEAVES[0]!),
        ball(16, 35, 11, 10, 10, 9, LEAVES[1]!),
        ball(9, 36, 13, 7, 8, 7, LEAVES[2]!),
        ball(23, 37, 12, 7, 8, 7, LEAVES[1]!),
        ball(16, 44, 11, 7, 7, 7, LEAVES[2]!),
        ball(14, 47, 12, 4.4, 4, 4.4, LEAVES[3]!),
    ];
    return build(32, 64, 22, parts);
}

function plantSmall(v: VariantInfo): Model3D {
    const pot = POT[v.key] ?? POT.terracotta!;
    const parts = [
        cone(16, 0, 11, 5, 6.4, 8, pot),
        cyl(16, 8, 11, 6.6, 6.6, 0.8, "#5b4026"),
        ball(11, 13, 10, 5, 6, 5, LEAVES[0]!),
        ball(21, 13, 10, 5, 6, 5, LEAVES[1]!),
        ball(16, 16, 11, 6, 7, 6, LEAVES[2]!),
        ball(15, 19, 11, 3, 3.4, 3, LEAVES[3]!),
    ];
    return build(32, 32, 18, parts);
}

function floorLamp(v: VariantInfo): Model3D {
    const metal = v.key === "black" ? "#2a2d33" : "#b8913f";
    const parts = [
        ball(16, 24, 9, 15, 15, 12, "#ffe9a8", { opacity: 0.12, glow: 1 }),
        cyl(16, 0, 9, 7, 4.4, 2, metal),
        cyl(16, 2, 9, 1.2, 1.2, 36, metal),
        cone(16, 36, 9, 7.6, 5, 11, "#f4ead7", { glow: 0.65 }),
        cyl(16, 46, 9, 5, 5, 0.8, shade(metal, 0.2)),
    ];
    return build(32, 64, 18, parts);
}

function rug(v: VariantInfo): Model3D {
    const c = v.color;
    const parts: Part[] = [
        box(2, 0, 2, 92, 1.2, 56, shade(c, -0.1)),
        box(7, 1.2, 7, 82, 0.6, 46, shade(c, 0.14)),
        box(14, 1.8, 14, 68, 0.6, 32, c),
        box(22, 2.4, 20, 52, 0.4, 20, shade(c, 0.3)),
    ];
    for (let x = 4; x < 94; x += 4) {
        parts.push(box(x, 0, 0, 1.6, 0.8, 2, shade(c, 0.4)));
        parts.push(box(x, 0, 58, 1.6, 0.8, 2, shade(c, 0.4)));
    }
    return build(96, 64, 60, parts);
}

// ---------------------------------------------------------------------------------------------
// Nature
// ---------------------------------------------------------------------------------------------

interface FoliageTones {
    dark: string;
    base: string;
    light: string;
}
const TONES: Record<string, FoliageTones> = {
    summer: { dark: "#245c3a", base: "#3a8a4f", light: "#62b062" },
    autumn: { dark: "#9a3f1c", base: "#d1722b", light: "#e8a03a" },
    blossom: { dark: "#c46a8e", base: "#e58fb0", light: "#f6bfd3" },
    pine: { dark: "#1c4a33", base: "#2c6a46", light: "#46885a" },
    green: { dark: "#245c3a", base: "#3a8a4f", light: "#62b062" },
};
const TRUNK = "#6b4a2b";

function oakTree(v: VariantInfo): Model3D {
    const t = TONES[v.key] ?? TONES.summer!;
    const parts = [
        cone(32, 0, 17, 7, 5, 6, TRUNK),
        cone(32, 5, 17, 5, 4, 26, TRUNK),
        box(26, 0, 19, 4, 3, 4, shade(TRUNK, -0.2)),
        ball(32, 32, 17, 22, 12, 15, t.dark),
        ball(20, 40, 17, 14, 11, 13, t.base),
        ball(44, 40, 17, 14, 11, 13, t.base),
        ball(32, 46, 16, 17, 12, 13, t.base),
        ball(24, 52, 16, 11, 9, 10, t.light),
        ball(41, 53, 16, 11, 9, 10, t.light),
        ball(32, 57, 15, 11, 8, 10, t.light),
        ball(27, 50, 26, 8, 6, 5, t.light),
        ball(39, 44, 27, 9, 6, 4, t.base),
    ];
    return build(64, 96, 34, parts);
}

function pineTree(v: VariantInfo): Model3D {
    const t = TONES.pine!;
    const snow = v.key === "snow";
    const parts: Part[] = [cone(32, 0, 22, 5, 4, 14, TRUNK)];
    // [radius at the base, height of the base, height of the tier], from the bottom tier up.
    const tiers: [number, number, number][] = [
        [22, 8, 22],
        [18, 24, 20],
        [14, 40, 18],
        [10, 54, 17],
        [6, 66, 16],
    ];
    tiers.forEach(([r, y, h], i) => {
        parts.push(cone(32, y, 22, r, r * 0.1, h, i % 2 === 0 ? t.base : t.dark));
        if (snow) parts.push(cone(32, y + h * 0.4, 22, r * 0.64, r * 0.06, h * 0.6, "#f4f8fb"));
    });
    return build(64, 96, 44, parts);
}

function bush(v: VariantInfo): Model3D {
    const bloom = v.key === "flowering" ? "#f6bfd3" : v.key === "berries" ? "#d94a4a" : undefined;
    const t = TONES.green!;
    const parts: Part[] = [
        ball(16, 6, 12, 14, 6.5, 9, t.dark),
        ball(10, 10, 11, 8, 6, 7, t.base),
        ball(22, 10, 11, 8, 6, 7, t.base),
        ball(16, 12.5, 11, 9, 6, 7, t.light),
    ];
    if (bloom) {
        const spots: [number, number, number][] = [
            [8, 11, 17],
            [14, 14, 17],
            [20, 11, 18],
            [24, 14, 16],
            [12, 8, 19],
            [18, 16, 14],
        ];
        for (const [x, y, z] of spots) parts.push(ball(x, y, z, 1.5, 1.5, 1.5, bloom));
    }
    return build(32, 32, 22, parts);
}

function hedge(v: VariantInfo): Model3D {
    const bloom = v.key === "flowering" ? "#f6bfd3" : undefined;
    const t = TONES.green!;
    const parts: Part[] = [box(1, 0, 3, 62, 11, 11, t.dark)];
    for (let i = 0; i < 6; i++)
        parts.push(ball(6.6 + i * 10.16, 11, 8.5, 6.4, 3.6, 7.5, i % 2 === 0 ? t.base : t.light));
    parts.push(box(1, 4, 14, 62, 6, 0.4, shade(t.base, -0.12)));
    if (bloom) for (let i = 0; i < 12; i++) parts.push(ball(5 + i * 5, 7 + (i % 3) * 2.4, 14.6, 1.4, 1.4, 1, bloom));
    return build(64, 32, 16, parts);
}

function flowerBed(v: VariantInfo): Model3D {
    const parts: Part[] = [
        box(2, 0, 2, 60, 5, 11, "#5b4026"),
        ...Array.from({ length: 8 }, (_, i) => box(2 + i * 7.5, 0, 12.4, 6.4, 3.4, 1.8, i % 2 ? "#9aa0a3" : "#c4c8c9")),
        ...Array.from({ length: 8 }, (_, i) => box(2 + i * 7.5, 0, 1, 6.4, 3.4, 1.8, i % 2 ? "#9aa0a3" : "#c4c8c9")),
    ];
    const kind = v.key;
    for (let i = 0; i < 12; i++) {
        const x = 6 + i * 4.6;
        const z = 5 + (i % 3) * 2.6;
        const height = 11 + (i % 4) * 1.4;
        parts.push(box(x - 0.4, 5, z, 0.8, height - 5, 0.8, "#3f8a4f"));
        if (kind === "tulips") {
            const c = ["#d94a4a", "#f2c53d", "#e86aa0"][i % 3]!;
            parts.push(ball(x, height + 1, z + 0.4, 2.1, 2.6, 2, c));
        } else if (kind === "daisies") {
            parts.push(cyl(x, height, z + 0.4, 2.6, 2.4, 0.7, "#fbfcfd"));
            parts.push(cyl(x, height + 0.7, z + 0.4, 1.1, 1, 0.5, "#f2c53d"));
        } else {
            const c = ["#8b6bd0", "#7556c0", "#a58be0"][i % 3]!;
            parts.push(box(x - 0.9, height - 2, z - 0.2, 1.8, 6, 1.6, c));
        }
    }
    return build(64, 32, 15, parts);
}

function planterBox(v: VariantInfo): Model3D {
    const w = v.key === "herbs" ? WOOD.oak! : WOOD.walnut!;
    const parts: Part[] = [
        box(2, 0, 2, 60, 11, 11, w),
        box(1, 11, 1, 62, 1.6, 13, shade(w, 0.12)),
        box(3, 11.6, 3, 58, 0.8, 9, "#5b4026"),
        ...[0, 1, 2].map((i) => box(2.4, 2 + i * 3.4, 12.8, 59.2, 0.5, 0.4, shade(w, -0.3))),
    ];
    for (let i = 0; i < 9; i++) {
        const x = 7 + i * 6.2;
        if (v.key === "herbs") {
            const tone = ["#4aa05a", "#6bbd6a", "#3a8a4f"][i % 3]!;
            parts.push(ball(x, 15, 8 + (i % 2) * 1.2, 3.4, 4, 3.2, tone));
        } else {
            parts.push(box(x - 0.4, 12, 8, 0.8, 5, 0.8, "#3f8a4f"));
            const c = i % 3 === 0 ? "#d94a4a" : i % 3 === 1 ? "#e8923a" : "#7cc27a";
            parts.push(ball(x, 18, 8.4 + (i % 2) * 1.2, 2.6, 2.6, 2.6, c));
        }
    }
    return build(64, 32, 16, parts);
}

function frondArc(
    cx: number,
    cy: number,
    cz: number,
    angle: number,
    length: number,
    tone: string,
    light: string,
    size: number,
): Part[] {
    const parts: Part[] = [];
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const r = t * length;
        const x = cx + Math.cos(angle) * r;
        const z = cz + Math.sin(angle) * r * 0.8;
        // Rises a little, then arches over and droops, as palm and fern fronds do.
        const y = cy + length * 0.32 * Math.sin(t * Math.PI * 0.5) - length * 0.6 * t * t;
        parts.push(ball(x, y, z, size * (1.1 - t * 0.35), size * 0.34, size * (0.8 - t * 0.2), i % 2 ? tone : light));
    }
    return parts;
}

function palm(v: VariantInfo): Model3D {
    const pot = POT[v.key] ?? POT.terracotta!;
    const parts: Part[] = [
        cone(32, 0, 12, 10, 12, 16, pot),
        cyl(32, 16, 12, 12.4, 12.4, 1.6, shade(pot, -0.2)),
        cyl(32, 17, 12, 11, 11, 1, "#5b4026"),
        cyl(32, 17, 12, 2.2, 2.2, 42, "#7a5a3a"),
        ...[22, 30, 38, 46, 54].map((y) => cyl(32, y, 12, 2.7, 2.7, 1.4, "#5b4026")),
    ];
    const count = 8;
    for (let i = 0; i < count; i++) {
        parts.push(...frondArc(32, 60, 12, (i / count) * Math.PI * 2 + 0.3, 24, "#2f7a45", "#6bbd6a", 5.4));
    }
    parts.push(ball(32, 62, 12, 4, 3.4, 4, "#46985a"));
    return build(64, 96, 24, parts);
}

function fern(v: VariantInfo): Model3D {
    const pot = POT[v.key] ?? POT.terracotta!;
    const parts: Part[] = [cone(16, 0, 9, 5.4, 7, 8, pot), cyl(16, 8, 9, 7.4, 7.4, 0.8, "#5b4026")];
    for (let i = 0; i < 7; i++) parts.push(...frondArc(16, 9, 9, (i / 7) * Math.PI * 2, 11, "#2f7a45", "#7cc27a", 2.6));
    return build(32, 32, 16, parts);
}

function bamboo(): Model3D {
    const parts: Part[] = [cone(16, 0, 10, 8, 10, 12, "#40444c"), cyl(16, 12, 10, 10.4, 8.4, 1, "#5b4026")];
    const stalks: [number, number, number][] = [
        [11, 9, 38],
        [17, 11, 44],
        [22, 8, 34],
    ];
    for (const [x, z, h] of stalks) {
        parts.push(cyl(x, 12, z, 2, 2, h, "#79b24f"));
        for (let y = 20; y < 12 + h; y += 8) parts.push(cyl(x, y, z, 2.5, 2.5, 1.2, "#3d6e2a"));
        parts.push(ball(x + 4, 12 + h - 6, z, 5, 1.4, 2, "#4aa05a"), ball(x - 4, 12 + h - 14, z, 5, 1.4, 2, "#4aa05a"));
    }
    return build(32, 64, 18, parts);
}

function pond(v: VariantInfo): Model3D {
    const parts: Part[] = [cyl(48, 0, 29, 46, 27, 4, "#5f6669")];
    for (let a = 0; a < 36; a++) {
        const t = (a / 36) * Math.PI * 2;
        const x = 48 + Math.cos(t) * 43;
        const z = 29 + Math.sin(t) * 24.5;
        parts.push(ball(x, 3.4, z, 4.6, 3.4, 4, a % 3 === 0 ? "#c4c8c9" : a % 3 === 1 ? "#9aa0a3" : "#b0b5b7"));
    }
    parts.push(cyl(48, 3.4, 29, 39, 21, 0.8, "#2c6fa8"));
    if (v.key === "koi") {
        for (const [x, z, a] of [
            [38, 24, 0],
            [60, 34, 180],
            [48, 20, 20],
        ] as const) {
            parts.push(
                ball(x, 3.8, z, 5, 0.9, 2, "#f08a3c", { yaw: a }),
                ball(x + (a === 180 ? 5 : -5), 3.8, z, 2.2, 0.6, 1.8, "#fbfcfd", { yaw: a }),
            );
        }
        parts.push(cyl(62, 4.2, 22, 6, 4, 0.5, "#3f8a4f"));
    } else {
        for (const [x, z, r] of [
            [34, 34, 5.5],
            [58, 24, 6.5],
            [66, 36, 5],
            [44, 40, 4.5],
        ] as const) {
            parts.push(cyl(x, 4.2, z, r, r * 0.7, 0.5, "#3f8a4f"));
        }
        parts.push(ball(60, 5.4, 23, 2.4, 1.4, 2, "#f6bfd3"), ball(35, 5.4, 33, 2.2, 1.3, 1.8, "#f6bfd3"));
    }
    parts.push(cyl(48, 4.2, 29, 39, 21, 0.6, "#8fd3ef", { opacity: 0.42 }));
    return build(96, 64, 58, parts);
}

function fountain(v: VariantInfo): Model3D {
    const sand = v.key === "sandstone";
    const stone = sand ? "#cbb384" : "#9aa0a3";
    const light = sand ? "#ecd9ae" : "#c4c8c9";
    const parts: Part[] = [
        cyl(32, 0, 28, 29, 25, 7, stone),
        cyl(32, 7, 28, 29.5, 25.5, 2.4, light),
        cyl(32, 9.4, 28, 25, 21.5, 0.6, "#2c6fa8"),
        cyl(32, 9.4, 28, 25, 21.5, 0.5, "#8fd3ef", { opacity: 0.45 }),
        cyl(32, 9.4, 28, 5, 4.4, 24, stone),
        cone(32, 28, 28, 9, 15, 5, light),
        cyl(32, 33, 28, 14, 12, 0.8, "#2c6fa8"),
        cyl(32, 33, 28, 14, 12, 0.6, "#8fd3ef", { opacity: 0.45 }),
        cyl(32, 33.8, 28, 1.6, 1.4, 14, "#cdeefb", { opacity: 0.7, glow: 0.6 }),
        ball(32, 49, 28, 3, 2.4, 2.6, "#e6f7ff", { opacity: 0.8 }),
    ];
    for (const [x, y, z] of [
        [22, 40, 28],
        [42, 41, 28],
        [27, 45, 24],
        [37, 46, 32],
    ] as const)
        parts.push(ball(x, y, z, 1.4, 1.4, 1.4, "#bfe6f6", { opacity: 0.8 }));
    return build(64, 96, 56, parts);
}

function rockCluster(v: VariantInfo): Model3D {
    const sand = v.key === "sand";
    const base = sand ? "#c9b583" : "#9aa0a3";
    const light = sand ? "#e6d6ae" : "#c4c8c9";
    const parts: Part[] = [
        ball(14, 5, 14, 12, 5, 8.5, base),
        ball(34, 7.5, 13, 14, 7, 9.5, shade(base, 0.06)),
        ball(52, 4.5, 14, 8.5, 4.5, 7, shade(base, -0.06)),
        ball(30, 10, 10, 7, 3, 4, light),
    ];
    if (v.key === "mossy") {
        parts.push(
            ball(12, 8, 13, 8, 2, 6, "#5f8f4e"),
            ball(34, 13, 12, 8, 2, 6, "#5f8f4e"),
            ball(52, 7, 13, 5, 1.6, 4.4, "#5f8f4e"),
        );
    }
    return build(64, 32, 22, parts);
}

function steppingStones(v: VariantInfo): Model3D {
    const sand = v.key === "sand";
    const base = sand ? "#c9b583" : "#9aa0a3";
    const parts = [
        ball(10, 1.4, 9, 7, 1.6, 5, base),
        ball(23, 1.4, 15, 6.4, 1.6, 4.8, shade(base, 0.08)),
        ball(13, 1.4, 23, 7.4, 1.6, 5.4, shade(base, -0.06)),
    ];
    return build(32, 32, 30, parts);
}

function grassPatch(v: VariantInfo): Model3D {
    // A whole tile of lawn: it covers the picture down to its bottom edge.
    const parts: Part[] = [box(0, 0, 1, 32, 1, 31, "#5aa24a")];
    let seed = v.key.length * 7 + 3;
    const next = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    for (let i = 0; i < 46; i++) {
        const x = 1 + next() * 29;
        const z = 3 + next() * 27;
        parts.push(box(x, 1, z, 1, 0.8 + next() * 1.2, 0.8, next() < 0.5 ? "#7bc267" : "#3f8a3d"));
    }
    if (v.key === "wildflowers") {
        const colors = ["#f6e45a", "#ffffff", "#e87aa6", "#9a7ae0"];
        for (let i = 0; i < 9; i++)
            parts.push(ball(3 + next() * 26, 2.2, 4 + next() * 24, 1.3, 1, 1.2, colors[i % 4]!));
    }
    if (v.key === "clover") {
        for (let i = 0; i < 7; i++) parts.push(cyl(3 + next() * 26, 1, 4 + next() * 24, 2, 1.6, 0.6, "#6dbb64"));
    }
    return build(32, 32, 30, parts);
}

function picnicTable(v: VariantInfo): Model3D {
    const w = wood(v.key);
    const parts: Part[] = [
        box(4, 0, 2, 4, 9, 6, shade(w, -0.3)),
        box(56, 0, 2, 4, 9, 6, shade(w, -0.3)),
        box(4, 0, 42, 4, 9, 6, shade(w, -0.3)),
        box(56, 0, 42, 4, 9, 6, shade(w, -0.3)),
        box(3, 9, 1.5, 58, 2.4, 8, shade(w, -0.06)),
        box(3, 9, 40.5, 58, 2.4, 8, shade(w, -0.06)),
        box(8, 0, 14, 5, 17, 24, shade(w, -0.3)),
        box(51, 0, 14, 5, 17, 24, shade(w, -0.3)),
        box(1, 17, 12, 62, 3, 26, w),
        ...[14, 26, 38, 50].map((x) => box(x, 20, 12.4, 0.5, 0.4, 25, shade(w, -0.2))),
    ];
    const seats: WorldSeat[] = [
        { x: 20, z: 5.5, y: 11, direction: "Down" },
        { x: 44, z: 5.5, y: 11, direction: "Down" },
        { x: 20, z: 44.5, y: 11, direction: "Up" },
        { x: 44, z: 44.5, y: 11, direction: "Up" },
    ];
    return build(64, 64, 50, parts, seats);
}

function gardenLantern(v: VariantInfo): Model3D {
    const metal = v.key === "black" ? "#2a2d33" : "#b8693a";
    const parts = [
        ball(16, 40, 9, 14, 14, 12, "#fff1a8", { opacity: 0.12, glow: 1 }),
        cyl(16, 0, 9, 4.4, 3, 3, metal),
        cyl(16, 3, 9, 1.2, 1.2, 33, metal),
        box(10, 36, 5, 12, 2, 8, metal),
        box(11, 38, 6, 10, 10, 6, "#ffe27a", { glow: 0.95, opacity: 0.9 }),
        box(10, 48, 5, 12, 1.6, 8, metal),
        cone(16, 49.6, 9, 6.6, 1, 4, shade(metal, 0.12)),
    ];
    return build(32, 64, 18, parts);
}

// ---------------------------------------------------------------------------------------------
// The models by component
// ---------------------------------------------------------------------------------------------

const BUILDERS: Record<string, (variant: VariantInfo) => Model3D> = {
    "desk-classic": desk,
    "desk-standing": standingDesk,
    "meeting-table": meetingTable,
    "round-table": roundTable,
    "coffee-table": coffeeTable,
    "reception-desk": receptionDesk,
    "office-chair": officeChair,
    sofa,
    armchair,
    beanbag,
    "garden-bench": gardenBench,
    "stump-stool": stumpStool,
    "log-bench": logBench,
    "rattan-chair": rattanChair,
    hammock,
    bookshelf,
    whiteboard,
    "presentation-screen": presentationScreen,
    "dual-monitor": dualMonitor,
    laptop,
    printer,
    "coffee-machine": coffeeMachine,
    "water-cooler": waterCooler,
    "vending-machine": vendingMachine,
    "glass-door": glassDoor,
    "exit-sign": exitSign,
    "floor-arrow": floorArrow,
    "tactile-paving": tactilePaving,
    signpost,
    "wall-art": wallArt,
    "plant-large": plantLarge,
    "plant-small": plantSmall,
    "floor-lamp": floorLamp,
    rug,
    "oak-tree": oakTree,
    "pine-tree": pineTree,
    bush,
    hedge,
    "flower-bed": flowerBed,
    "planter-box": planterBox,
    palm,
    fern,
    bamboo,
    pond,
    fountain,
    "rock-cluster": rockCluster,
    "stepping-stones": steppingStones,
    "grass-patch": grassPatch,
    "picnic-table": picnicTable,
    "garden-lantern": gardenLantern,
};

/** The 3D model of a variant of a component, or undefined when the component has none yet. */
export function modelOf(component: string, variant: VariantInfo): Model3D | undefined {
    return BUILDERS[component]?.(variant);
}

export const MODELLED_COMPONENTS = Object.keys(BUILDERS);
