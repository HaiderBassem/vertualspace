/**
 * AdminSpace's original office tileset and room templates (Tiled JSON maps, orthogonal, 32 px tiles).
 * Every map has what WorkAdventure requires (libs/map-editor MapValidator): a "floorLayer" object layer
 * and a "start" layer; walls carry the "collides" tile property.
 */
import { Canvas, shade } from "./canvas";
import type { Localized } from "./furniture";
import type { TemplateSection } from "../../src/lib/catalog/manifest";

/** Tile ids (gid = id + 1). */
const T = { wood: 0, carpet: 1, stone: 2, wallTop: 3, wallFace: 4, window: 5, mat: 6, empty: 7 } as const;
const COLUMNS = 8;

export function drawTileset(): Canvas {
    const c = new Canvas(COLUMNS * 32, 32);
    const at = (id: number) => id * 32;
    // Oak planks, offset joints.
    c.rect(at(T.wood), 0, 32, 32, "#c9975f");
    for (let y = 0; y < 32; y += 8) {
        c.hline(at(T.wood), y, 32, "#a87a45");
        c.vline(at(T.wood) + ((y / 8) % 2 === 0 ? 10 : 24), y, 8, "#a87a45");
        c.hline(at(T.wood) + 2, y + 3, 6, shade("#c9975f", 0.08));
    }
    // Carpet: fine weave.
    c.rect(at(T.carpet), 0, 32, 32, "#59657a");
    for (let y = 0; y < 32; y += 2) for (let x = (y / 2) % 2; x < 32; x += 2) c.pixel(at(T.carpet) + x, y, "#606c82");
    // Stone tiles.
    c.rect(at(T.stone), 0, 32, 32, "#e3e0da");
    c.hline(at(T.stone), 0, 32, "#c9c5bd");
    c.vline(at(T.stone), 0, 32, "#c9c5bd");
    c.hline(at(T.stone), 16, 32, "#d3cfc8");
    c.vline(at(T.stone) + 16, 0, 32, "#d3cfc8");
    // Wall top (seen from above) and wall face.
    c.rect(at(T.wallTop), 0, 32, 32, "#3a3f48");
    c.hline(at(T.wallTop), 0, 32, "#4b515b");
    c.rect(at(T.wallFace), 0, 32, 32, "#eceae5");
    c.hline(at(T.wallFace), 0, 32, "#cfccc4");
    c.rect(at(T.wallFace), 26, 32, 6, "#b9b4aa");
    c.hline(at(T.wallFace), 26, 32, "#9c968a");
    // Window in the wall face.
    c.rect(at(T.window), 0, 32, 32, "#eceae5");
    c.box(at(T.window) + 4, 3, 24, 20, "#a9d4ef", "#7a828e");
    c.vline(at(T.window) + 16, 4, 18, "#7a828e");
    c.rect(at(T.window) + 6, 5, 3, 8, "#e6f4ff");
    c.rect(at(T.window), 26, 32, 6, "#b9b4aa");
    // Entrance mat.
    c.rect(at(T.mat), 0, 32, 32, "#2e3239");
    c.box(at(T.mat) + 2, 2, 28, 28, "#3d424b", "#262a31");
    // T.empty stays fully transparent: used by the start layer.
    return c;
}

export const TILESET_FILE = "office-tiles.png";

interface Layout {
    width: number;
    height: number;
    floor: number;
    /** Columns of the doorway in the bottom wall. */
    door: [number, number];
    windows?: number[];
}

function tiled(layout: Layout) {
    const { width, height, floor } = layout;
    const floorData: number[] = [];
    const walls: number[] = [];
    const start: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const inDoor = y === height - 1 && x >= layout.door[0] && x <= layout.door[1];
            floorData.push(inDoor ? T.mat + 1 : floor + 1);
            let wall = 0;
            if (y === 0 || x === 0 || x === width - 1 || (y === height - 1 && !inDoor)) wall = T.wallTop + 1;
            else if (y === 1) wall = (layout.windows?.includes(x) ? T.window : T.wallFace) + 1;
            walls.push(wall);
            start.push(y === height - 2 && x >= layout.door[0] && x <= layout.door[1] ? T.empty + 1 : 0);
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
            layer(1, "floor", floorData),
            layer(2, "walls", walls),
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
                name: "adminspace-office",
                image: TILESET_FILE,
                imagewidth: COLUMNS * 32,
                imageheight: 32,
                tilewidth: 32,
                tileheight: 32,
                tilecount: COLUMNS,
                columns: COLUMNS,
                margin: 0,
                spacing: 0,
                tiles: [T.wallTop, T.wallFace, T.window].map((id) => ({
                    id,
                    properties: [{ name: "collides", type: "bool", value: true }],
                })),
            },
        ],
    };
}

export interface TemplateDefinition {
    key: string;
    name: Localized;
    description: Localized;
    tags: string[];
    layout: Layout;
    entities: TemplateSection["entities"];
    /** Video meeting zones, provisioned as native areas (the meeting room's are set where the manifests are built). */
    meetings?: TemplateSection["meetings"];
}

const L = (en: string, fr: string, de: string, es: string, ar: string): Localized => ({ en, fr, de, es, ar });
const px = (tiles: number) => tiles * 32;

function deskRow(x0: number, y: number, count: number, wood = "oak"): TemplateSection["entities"] {
    const out: TemplateSection["entities"] = [];
    for (let i = 0; i < count; i++) {
        const x = px(x0 + i * 2);
        out.push({ component: "desk-classic", variant: wood, x, y: px(y) });
        out.push({ component: "dual-monitor", variant: "standard", x, y: px(y) + 4 });
        out.push({ component: "office-chair", variant: "charcoal-up", x: x + 16, y: px(y) + 44 });
    }
    return out;
}

export const TEMPLATES: TemplateDefinition[] = [
    {
        key: "open-office",
        name: L("Open office", "Plateau de bureaux", "Großraumbüro", "Oficina abierta", "مكتب مفتوح"),
        description: L(
            "Eight workstations in two rows, a meeting corner with a whiteboard, and a coffee point. Wood floor, windows on the north wall.",
            "Huit postes de travail sur deux rangées, un coin réunion avec tableau blanc et un point café. Parquet, fenêtres au nord.",
            "Acht Arbeitsplätze in zwei Reihen, eine Besprechungsecke mit Whiteboard und eine Kaffeeecke. Holzboden, Fenster im Norden.",
            "Ocho puestos en dos filas, un rincón de reuniones con pizarra y un punto de café. Suelo de madera, ventanas al norte.",
            "ثماني محطات عمل في صفين، وركن اجتماعات مع سبورة، وركن للقهوة. أرضية خشبية ونوافذ في الجدار الشمالي.",
        ),
        tags: ["office", "desks", "team"],
        layout: { width: 22, height: 14, floor: T.wood, door: [10, 11], windows: [3, 6, 9, 12, 15, 18] },
        entities: [
            ...deskRow(2, 3, 4),
            ...deskRow(2, 7, 4, "white"),
            { component: "meeting-table", variant: "walnut", x: px(13), y: px(4) },
            { component: "office-chair", variant: "blue-down", x: px(13) + 16, y: px(3) + 24 },
            { component: "office-chair", variant: "blue-down", x: px(14) + 16, y: px(3) + 24 },
            { component: "office-chair", variant: "blue-down", x: px(15) + 16, y: px(3) + 24 },
            { component: "office-chair", variant: "blue-up", x: px(13) + 16, y: px(6) + 12 },
            { component: "office-chair", variant: "blue-up", x: px(14) + 16, y: px(6) + 12 },
            { component: "office-chair", variant: "blue-up", x: px(15) + 16, y: px(6) + 12 },
            { component: "whiteboard", variant: "standard", x: px(18), y: px(2) },
            { component: "coffee-machine", variant: "standard", x: px(19), y: px(9) },
            { component: "water-cooler", variant: "standard", x: px(20), y: px(9) },
            { component: "plant-large", variant: "terracotta", x: px(1), y: px(10) },
            { component: "plant-large", variant: "white", x: px(20), y: px(2) },
            { component: "plant-small", variant: "white", x: px(12), y: px(2) },
        ],
    },
    {
        key: "meeting-room",
        name: L("Meeting room", "Salle de réunion", "Besprechungsraum", "Sala de reuniones", "غرفة اجتماعات"),
        description: L(
            "A six-seat meeting room with a presentation screen. Carpet floor.",
            "Une salle de réunion de six places avec écran de présentation. Moquette.",
            "Ein Besprechungsraum für sechs Personen mit Präsentationsbildschirm. Teppichboden.",
            "Una sala de reuniones para seis con pantalla de presentación. Moqueta.",
            "غرفة اجتماعات لستة أشخاص مع شاشة عرض. أرضية مفروشة بالسجاد.",
        ),
        tags: ["meeting", "conference", "presentation"],
        layout: { width: 12, height: 10, floor: T.carpet, door: [5, 6], windows: [2, 9] },
        entities: [
            { component: "presentation-screen", variant: "standard", x: px(5), y: px(1) },
            { component: "meeting-table", variant: "walnut", x: px(4) + 16, y: px(4) },
            ...[0, 1, 2].flatMap((i) => [
                { component: "office-chair", variant: "charcoal-down", x: px(5 + i) - 16 + 16, y: px(3) + 24 },
                { component: "office-chair", variant: "charcoal-up", x: px(5 + i) - 16 + 16, y: px(6) + 12 },
            ]),
            { component: "plant-large", variant: "charcoal", x: px(1), y: px(2) },
            { component: "plant-large", variant: "charcoal", x: px(10), y: px(2) },
        ],
    },
    {
        key: "reception-lobby",
        name: L("Reception lobby", "Hall d’accueil", "Empfangshalle", "Vestíbulo de recepción", "بهو الاستقبال"),
        description: L(
            "A welcoming entrance with a reception desk, a waiting area and accessible wayfinding from the door.",
            "Une entrée accueillante avec banque d’accueil, espace d’attente et guidage accessible depuis la porte.",
            "Ein einladender Eingang mit Empfangstheke, Wartebereich und barrierefreier Wegführung ab der Tür.",
            "Una entrada acogedora con mostrador, zona de espera y señalización accesible desde la puerta.",
            "مدخل مرحّب مع مكتب استقبال ومنطقة انتظار وإرشاد ميسّر من الباب.",
        ),
        tags: ["reception", "lobby", "accessibility"],
        layout: { width: 16, height: 11, floor: T.stone, door: [7, 8], windows: [3, 12] },
        entities: [
            { component: "reception-desk", variant: "walnut", x: px(6) + 16, y: px(2) },
            { component: "rug", variant: "sand", x: px(1) + 16, y: px(5) },
            { component: "sofa", variant: "blue-down", x: px(2), y: px(4) },
            { component: "coffee-table", variant: "oak", x: px(2), y: px(7) },
            { component: "armchair", variant: "terracotta", x: px(12), y: px(5) },
            { component: "armchair", variant: "terracotta", x: px(13), y: px(5) },
            { component: "plant-large", variant: "terracotta", x: px(14), y: px(2) },
            { component: "plant-large", variant: "terracotta", x: px(1), y: px(2) },
            { component: "signpost", variant: "standard", x: px(10), y: px(7) },
            { component: "tactile-paving", variant: "standard", x: px(7), y: px(9) },
            { component: "tactile-paving", variant: "standard", x: px(8), y: px(9) },
            { component: "floor-arrow", variant: "up", x: px(7), y: px(7) },
            { component: "floor-arrow", variant: "up", x: px(8), y: px(7) },
        ],
    },
    {
        key: "lounge",
        name: L("Lounge", "Espace détente", "Lounge", "Sala de descanso", "صالة استراحة"),
        description: L(
            "A relaxed break room with sofas, a reading corner and a vending machine.",
            "Une salle de pause conviviale avec canapés, coin lecture et distributeur.",
            "Ein entspannter Pausenraum mit Sofas, Leseecke und Verkaufsautomat.",
            "Una sala de descanso con sofás, rincón de lectura y máquina expendedora.",
            "غرفة استراحة مريحة مع أرائك وركن للقراءة وآلة بيع.",
        ),
        tags: ["lounge", "break", "social"],
        layout: { width: 14, height: 10, floor: T.wood, door: [6, 7], windows: [3, 10] },
        entities: [
            { component: "rug", variant: "sage", x: px(2), y: px(4) },
            { component: "sofa", variant: "green-down", x: px(3), y: px(2) + 16 },
            { component: "coffee-table", variant: "walnut", x: px(3), y: px(5) + 8 },
            { component: "armchair", variant: "green", x: px(2), y: px(6) },
            { component: "armchair", variant: "green", x: px(5), y: px(6) },
            { component: "floor-lamp", variant: "brass", x: px(1), y: px(2) },
            { component: "bookshelf", variant: "oak", x: px(9), y: px(1) + 16 },
            { component: "armchair", variant: "terracotta", x: px(10), y: px(4) },
            { component: "floor-lamp", variant: "black", x: px(12), y: px(3) },
            { component: "vending-machine", variant: "standard", x: px(12), y: px(6) },
            { component: "plant-large", variant: "white", x: px(12), y: px(1) + 16 },
        ],
    },
];

export function templateMap(template: TemplateDefinition): object {
    return tiled(template.layout);
}

/** A small top-down preview of a template: its floor plan with furniture footprints. */
export function templatePreview(
    template: TemplateDefinition,
    tileset: Canvas,
    sprites: Map<string, Canvas>,
    map: { layers: { data?: number[] }[] } = tiled(template.layout) as { layers: { data?: number[] }[] },
): Canvas {
    const { width, height } = template.layout;
    const full = new Canvas(width * 32, height * 32);
    for (const layer of map.layers.slice(0, 2)) {
        layer.data?.forEach((gid, index) => {
            if (gid === 0) return;
            const tile = new Canvas(32, 32);
            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    const k = (y * tileset.width + (gid - 1) * 32 + x) * 4;
                    tile.data.set(tileset.data.subarray(k, k + 4), (y * 32 + x) * 4);
                }
            }
            full.draw(tile, (index % width) * 32, Math.floor(index / width) * 32);
        });
    }
    for (const entity of [...template.entities].sort((a, b) => a.y - b.y)) {
        const sprite = sprites.get(`${entity.component}/${entity.variant}`);
        if (sprite) full.draw(sprite, entity.x, entity.y);
    }
    // Downscale by 2 (nearest neighbor) for a light preview.
    const preview = new Canvas(full.width / 2, full.height / 2);
    for (let y = 0; y < preview.height; y++) {
        for (let x = 0; x < preview.width; x++) {
            const k = (y * 2 * full.width + x * 2) * 4;
            preview.data.set(full.data.subarray(k, k + 4), (y * preview.width + x) * 4);
        }
    }
    return preview;
}
