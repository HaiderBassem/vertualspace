/**
 * The garden room template: an open-air room with its own tileset (grass, flowers, path, hedge, deck), so the office
 * tileset and the office templates stay exactly as they were. Same map rules as templates.ts: a "floorLayer" object
 * layer, a "start" layer, and the "collides" property on the walls (here, the hedge).
 */
import { Canvas, shade } from "./canvas";
import type { Localized } from "./furniture";
import type { TemplateDefinition } from "./templates";
import type { TemplateSection } from "../../src/lib/catalog/manifest";

/** Tile ids (gid = id + 1). */
const G = { grass: 0, meadow: 1, path: 2, hedge: 3, deck: 4, empty: 5 } as const;
const COLUMNS = 6;
export const GARDEN_TILESET_FILE = "garden-tiles.png";

function seeded(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

export function drawGardenTileset(): Canvas {
    const c = new Canvas(COLUMNS * 32, 32);
    const at = (id: number) => id * 32;
    const random = seeded(2024);
    // Lawn, plain and with small flowers.
    for (const id of [G.grass, G.meadow]) {
        c.rect(at(id), 0, 32, 32, "#5aa24a");
        for (let i = 0; i < 70; i++) {
            const x = Math.floor(random() * 32);
            const y = Math.floor(random() * 30);
            c.vline(at(id) + x, y, 2, random() < 0.5 ? shade("#5aa24a", 0.18) : shade("#5aa24a", -0.16));
        }
    }
    const colors = ["#f6e45a", "#ffffff", "#e87aa6", "#9a7ae0"];
    for (let i = 0; i < 6; i++) {
        const x = 3 + Math.floor(random() * 26);
        const y = 3 + Math.floor(random() * 24);
        c.rect(at(G.meadow) + x, y, 2, 2, colors[i % colors.length]!);
        c.pixel(at(G.meadow) + x, y + 2, "#2f7a45");
    }
    // Garden path: pale gravel with pebbles.
    c.rect(at(G.path), 0, 32, 32, "#d9caa3");
    for (let i = 0; i < 40; i++) {
        const x = Math.floor(random() * 30);
        const y = Math.floor(random() * 30);
        c.rect(at(G.path) + x, y, 2, 1, random() < 0.5 ? "#c4b28a" : "#ebdfc0");
    }
    c.vline(at(G.path), 0, 32, "#c4b28a");
    c.vline(at(G.path) + 31, 0, 32, "#c4b28a");
    // Hedge seen from above: dense dark foliage.
    c.rect(at(G.hedge), 0, 32, 32, "#2c6a46");
    for (let i = 0; i < 110; i++) {
        const x = Math.floor(random() * 30);
        const y = Math.floor(random() * 30);
        c.rect(at(G.hedge) + x, y, 2, 2, ["#245c3a", "#3a8a4f", "#46985a"][Math.floor(random() * 3)]!);
    }
    c.hline(at(G.hedge), 0, 32, "#1d4a30");
    c.hline(at(G.hedge), 31, 32, "#1d4a30");
    // Wooden deck planks.
    c.rect(at(G.deck), 0, 32, 32, "#b98a55");
    for (let y = 0; y < 32; y += 8) {
        c.hline(at(G.deck), y, 32, "#8f6636");
        c.hline(at(G.deck), y + 1, 32, "#cfa06a");
        c.vline(at(G.deck) + ((y / 8) % 2 === 0 ? 9 : 22), y, 8, "#8f6636");
    }
    // G.empty stays fully transparent: used by the start layer.
    return c;
}

interface GardenLayout {
    width: number;
    height: number;
    /** Columns of the opening in the bottom hedge. */
    door: [number, number];
    /** Cells (x, y) of the garden path, drawn over the lawn. */
    path: (x: number, y: number) => boolean;
    deck?: (x: number, y: number) => boolean;
}

const LAYOUT: GardenLayout = {
    width: 22,
    height: 14,
    door: [10, 11],
    // An avenue across the garden and a path from the door to the fountain.
    path: (x, y) => ((y === 7 || y === 8) && x >= 2 && x <= 19) || ((x === 10 || x === 11) && y >= 6),
    // A small deck under the hammock.
    deck: (x, y) => x >= 2 && x <= 4 && y >= 10 && y <= 11,
};

export function gardenMap(template: TemplateDefinition): object {
    const { width, height, door, path, deck } = LAYOUT;
    void template;
    const random = seeded(77);
    const floor: number[] = [];
    const hedge: number[] = [];
    const start: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const inDoor = y === height - 1 && x >= door[0] && x <= door[1];
            let tile: number = random() < 0.12 ? G.meadow : G.grass;
            if (path(x, y) || inDoor) tile = G.path;
            if (deck?.(x, y)) tile = G.deck;
            floor.push(tile + 1);
            const border = y === 0 || x === 0 || x === width - 1 || (y === height - 1 && !inDoor);
            hedge.push(border ? G.hedge + 1 : 0);
            start.push(y === height - 2 && x >= door[0] && x <= door[1] ? G.empty + 1 : 0);
        }
    }
    const layer = (id: number, name: string, data: number[]) => ({
        id,
        name,
        type: "tilelayer",
        width,
        height,
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        data,
    });
    return {
        type: "map",
        version: "1.10",
        tiledversion: "1.10.2",
        orientation: "orthogonal",
        renderorder: "right-down",
        infinite: false,
        width,
        height,
        tilewidth: 32,
        tileheight: 32,
        nextlayerid: 5,
        nextobjectid: 1,
        compressionlevel: -1,
        layers: [
            layer(1, "floor", floor),
            layer(2, "hedge", hedge),
            layer(3, "start", start),
            {
                id: 4,
                name: "floorLayer",
                type: "objectgroup",
                draworder: "topdown",
                objects: [],
                opacity: 1,
                visible: true,
                x: 0,
                y: 0,
            },
        ],
        tilesets: [
            {
                firstgid: 1,
                name: "adminspace-garden",
                image: GARDEN_TILESET_FILE,
                imagewidth: COLUMNS * 32,
                imageheight: 32,
                tilewidth: 32,
                tileheight: 32,
                tilecount: COLUMNS,
                columns: COLUMNS,
                margin: 0,
                spacing: 0,
                tiles: [{ id: G.hedge, properties: [{ name: "collides", type: "bool", value: true }] }],
            },
        ],
    };
}

const L = (en: string, fr: string, de: string, es: string, ar: string): Localized => ({ en, fr, de, es, ar });
const px = (tiles: number) => tiles * 32;

const entities: TemplateSection["entities"] = [
    // The centre: a fountain at the end of the path, flowers either side.
    { component: "fountain", variant: "stone", x: px(10), y: px(3) },
    { component: "flower-bed", variant: "tulips", x: px(7), y: px(1) },
    { component: "flower-bed", variant: "daisies", x: px(13), y: px(1) },
    { component: "flower-bed", variant: "lavender", x: px(7), y: px(5) },
    { component: "flower-bed", variant: "lavender", x: px(13), y: px(5) },
    // Trees along the north hedge.
    { component: "oak-tree", variant: "summer", x: px(2), y: px(1) },
    { component: "pine-tree", variant: "green", x: px(5), y: px(1) },
    { component: "pine-tree", variant: "green", x: px(15), y: px(1) },
    { component: "oak-tree", variant: "blossom", x: px(18), y: px(1) },
    // A pond with rocks to the west, a picnic table to the east.
    { component: "pond", variant: "lilies", x: px(2), y: px(4) },
    { component: "rock-cluster", variant: "mossy", x: px(5), y: px(6) },
    { component: "picnic-table", variant: "oak", x: px(17), y: px(4) },
    { component: "planter-box", variant: "herbs", x: px(19), y: px(6) },
    // A hammock on a deck, and two benches facing each other for a quiet chat.
    { component: "hammock", variant: "blue", x: px(2), y: px(10) },
    { component: "garden-bench", variant: "oak-down", x: px(6), y: px(10) },
    { component: "garden-bench", variant: "oak-up", x: px(6), y: px(12) },
    // A circle of beanbags and a log bench around stepping stones, south-east.
    { component: "log-bench", variant: "oak", x: px(15), y: px(10) },
    { component: "beanbag", variant: "terracotta", x: px(13), y: px(11) },
    { component: "beanbag", variant: "blue", x: px(18), y: px(11) },
    { component: "beanbag", variant: "mustard", x: px(14), y: px(12) },
    { component: "beanbag", variant: "green", x: px(17), y: px(12) },
    { component: "stepping-stones", variant: "sand", x: px(15), y: px(11) },
    { component: "stepping-stones", variant: "sand", x: px(16), y: px(12) },
    { component: "stump-stool", variant: "birch", x: px(16), y: px(11) },
    { component: "rattan-chair", variant: "natural-left", x: px(19), y: px(10) },
    // Light at the entrance.
    { component: "garden-lantern", variant: "black", x: px(9), y: px(10) },
    { component: "garden-lantern", variant: "black", x: px(12), y: px(10) },
    { component: "bush", variant: "flowering", x: px(8), y: px(12) },
    { component: "bush", variant: "flowering", x: px(12), y: px(12) },
];

export const GARDEN_TEMPLATES: (TemplateDefinition & { meetings: NonNullable<TemplateSection["meetings"]> })[] = [
    {
        key: "garden-terrace",
        name: L("Garden terrace", "Jardin-terrasse", "Gartenterrasse", "Jardín-terraza", "حديقة شرفة"),
        description: L(
            "An open-air room: a fountain at the end of the path, a pond, trees, a picnic table, benches, a hammock and a beanbag circle, with a video meeting zone at the picnic table and one among the beanbags.",
            "Une pièce à ciel ouvert : fontaine au bout de l’allée, bassin, arbres, table de pique-nique, bancs, hamac et cercle de poufs, avec une zone de visioconférence à la table de pique-nique et une parmi les poufs.",
            "Ein Raum unter freiem Himmel: Brunnen am Ende des Weges, Teich, Bäume, Picknicktisch, Bänke, Hängematte und Sitzsack-Kreis, mit Videobesprechungszone am Picknicktisch und eine bei den Sitzsäcken.",
            "Una sala al aire libre: fuente al final del camino, estanque, árboles, mesa de picnic, bancos, hamaca y círculo de pufs, con una zona de videoreunión en la mesa de picnic y otra entre los pufs.",
            "غرفة في الهواء الطلق: نافورة في نهاية الممر وبركة وأشجار وطاولة نزهة ومقاعد وأرجوحة ودائرة من الوسائد، مع منطقة اجتماع مرئي عند الطاولة وأخرى بين الوسائد.",
        ),
        tags: ["garden", "nature", "outdoor", "lounge", "meeting"],
        layout: { width: LAYOUT.width, height: LAYOUT.height, floor: G.grass, door: LAYOUT.door },
        entities,
        meetings: [
            { name: "Picnic table", x: px(16), y: px(3), width: px(5), height: px(4) },
            { name: "Beanbag circle", x: px(12), y: px(10) - 8, width: px(8), height: px(4) },
        ],
    },
];
