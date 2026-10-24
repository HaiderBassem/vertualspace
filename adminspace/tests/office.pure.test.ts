/**
 * Pure tests of room sizes, the "Create an office" plans, door placement on the built-in room templates, room slugs
 * of webhook rooms and the error codes of resize jobs. No database.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
    anchoredOffset,
    presetOf,
    presetSize,
    resizeReasonOf,
    summarizeReport,
    targetSize,
} from "../src/lib/rooms/size";
import { FOCUS_ROOMS, planOffice, plannedSize } from "../src/lib/rooms/office";
import { exitArea, placeDoors, stableUuid, walkGrid, type CellRect } from "../src/lib/server/catalog/doors";
import { TiledMap } from "../src/lib/server/catalog/mapStorage";
import { uniqueRoomSlug } from "../src/lib/server/services/mapStorageWebhook";
import { resizeJobProblem } from "../src/lib/server/services/bulkResize";

/**
 * Copy of WorkAdventure's AreaData with an ExitPropertyData (libs/map-editor/src/types.ts, PropertyBase,
 * ExitPropertyData and AreaData at commit b579166), strict: what map-storage validates a JSON Patch of /areas with.
 */
const WorkAdventureExitArea = z
    .object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        visible: z.boolean(),
        name: z.string(),
        properties: z.array(
            z
                .object({
                    id: z.string(),
                    buttonLabel: z.string().optional(),
                    hideButtonLabel: z.boolean().optional(),
                    resourceUrl: z.string().optional(),
                    serverData: z.unknown().optional(),
                    type: z.literal("exit"),
                    url: z.string(),
                    areaName: z.string(),
                })
                .strict(),
        ),
    })
    .strict();

function template(key: string): TiledMap {
    return TiledMap.parse(JSON.parse(readFileSync(`catalog/builtin/${key}/map.tmj`, "utf8")));
}

/**
 * Stretches a template the way map-storage's "extend" fill does with anchor "top": edges kept, a uniform inner
 * column repeated on each side, and the rows grown above the spawn row (WorkAdventure picks the most uniform slice;
 * the spawn and doorway rows are never the most uniform). The spawn layer is not repeated.
 */
function extend(map: TiledMap, width: number, height: number): TiledMap {
    const axis = (old: number, size: number, center: boolean) => {
        const delta = size - old;
        const before = center ? Math.trunc(delta / 2) : 0;
        const after = delta - before;
        const cells: number[] = [];
        for (let cell = 0; cell < old; cell++) {
            cells.push(cell);
            if (cell === 1) cells.push(...Array<number>(before).fill(1));
            if (cell === old - 3) cells.push(...Array<number>(after).fill(old - 3));
        }
        return cells;
    };
    const columns = axis(map.width, width, true);
    const rows = axis(map.height, height, false);
    return {
        ...map,
        width,
        height,
        layers: map.layers.map((layer) => {
            const data = (layer as { data?: unknown }).data;
            if (!Array.isArray(data)) return layer;
            const isStart = layer.name === "start";
            const next: number[] = [];
            for (const [y, oldY] of rows.entries()) {
                for (const [x, oldX] of columns.entries()) {
                    const repeated = (x > 0 && columns[x - 1] === oldX) || (y > 0 && rows[y - 1] === oldY);
                    next.push(isStart && repeated ? 0 : (data[oldY * map.width + oldX] as number));
                }
            }
            return { ...layer, width, height, data: next };
        }),
    };
}

function cellsOf(rect: CellRect): [number, number][] {
    const cells: [number, number][] = [];
    for (let y = rect.y; y < rect.y + rect.height; y++)
        for (let x = rect.x; x < rect.x + rect.width; x++) cells.push([x, y]);
    return cells;
}

describe("room sizes", () => {
    it("knows the team-size presets", () => {
        expect(presetSize("small")).toEqual({ width: 20, height: 15 });
        expect(presetSize("medium")).toEqual({ width: 32, height: 24 });
        expect(presetSize("large")).toEqual({ width: 48, height: 36 });
        expect(presetSize("huge")).toEqual({ width: 64, height: 48 });
        expect(presetOf({ width: 48, height: 36 })).toBe("large");
        expect(presetOf({ width: 21, height: 15 })).toBeUndefined();
    });

    it("computes bulk targets inside 1 to 500 tiles", () => {
        const current = { width: 20, height: 15 };
        expect(targetSize(current, { mode: "exact", width: 32, height: 24 })).toEqual({ width: 32, height: 24 });
        expect(targetSize(current, { mode: "grow", tiles: 4 })).toEqual({ width: 24, height: 19 });
        expect(targetSize(current, { mode: "shrink", tiles: 5 })).toEqual({ width: 15, height: 10 });
        expect(targetSize(current, { mode: "shrink", tiles: 15 })).toBeUndefined();
        expect(targetSize({ width: 498, height: 10 }, { mode: "grow", tiles: 3 })).toBeUndefined();
    });

    it("places the current map inside the new one as the anchor says", () => {
        const from = { width: 10, height: 10 };
        const to = { width: 20, height: 16 };
        expect(anchoredOffset(from, to, "top-left")).toEqual({ x: 0, y: 0 });
        expect(anchoredOffset(from, to, "center")).toEqual({ x: 5, y: 3 });
        expect(anchoredOffset(from, to, "bottom-right")).toEqual({ x: 10, y: 6 });
        expect(anchoredOffset(to, from, "top")).toEqual({ x: -5, y: 0 });
    });

    it("summarizes map-storage's report and reads its refusals", () => {
        const summary = summarizeReport({
            oldWidth: 20,
            oldHeight: 15,
            newWidth: 18,
            newHeight: 24,
            tileWidth: 32,
            tileHeight: 32,
            displacedEntities: ["a", "b"],
            displacedAreas: ["c"],
        });
        expect(summary).toMatchObject({ columns: -2, rows: 9, movedObjects: 2, movedAreas: 1 });
        expect(
            resizeReasonOf("Infinite maps cannot be resized. Save the map as a fixed-size map in Tiled first."),
        ).toBe("infinite");
        expect(resizeReasonOf('The layer "floor" is compressed (zlib). Save the map in Tiled with the CSV')).toBe(
            "compressed",
        );
        expect(resizeReasonOf("The Tiled map of this room is outside of its world, so it cannot be resized.")).toBe(
            "outside",
        );
        expect(resizeReasonOf('The Tiled map "./map.tmj" of this room could not be read.')).toBe("unreadable");
        expect(resizeReasonOf(undefined)).toBe("unknown");
    });

    it("reads the error codes of resize jobs", () => {
        expect(resizeJobProblem("PermanentJobError: unresizable:infinite (422)")).toEqual({
            problem: "unresizable",
            reason: "infinite",
        });
        expect(resizeJobProblem("Error: unavailable (503)")).toEqual({ problem: "unavailable", reason: null });
        expect(resizeJobProblem("PermanentJobError: roomGone")).toEqual({ problem: "roomGone", reason: null });
        expect(resizeJobProblem("Error: timed out after 60000 ms").problem).toBe("unavailable");
        expect(resizeJobProblem(null)).toEqual({ problem: null, reason: null });
    });
});

describe("office plans", () => {
    it("has the rooms of each layout, the main one first and default", () => {
        expect(planOffice("open", "small").map((r) => r.slug)).toEqual(["open-office", "meeting-room"]);
        expect(planOffice("hybrid", "medium").map((r) => r.slug)).toEqual([
            "reception",
            "open-office",
            "meeting-room-1",
            "meeting-room-2",
            "lounge",
        ]);
        expect(planOffice("private", "large")).toHaveLength(1 + FOCUS_ROOMS.large);
        for (const layout of ["open", "hybrid", "private"] as const) {
            const plan = planOffice(layout, "huge");
            expect(plan.filter((r) => r.isDefault)).toHaveLength(1);
            expect(plan[0]!.isDefault).toBe(true);
            expect(new Set(plan.map((r) => r.slug)).size).toBe(plan.length);
        }
    });

    it("sizes the main room for the team and keeps meeting rooms comfortable", () => {
        const hybrid = planOffice("hybrid", "large");
        expect(hybrid.find((r) => r.kind === "openOffice")!.size).toEqual({ width: 48, height: 36 });
        expect(hybrid.find((r) => r.kind === "reception")!.size).toEqual({ width: 32, height: 24 });
        expect(hybrid.find((r) => r.kind === "meeting")!.size).toBeUndefined();
        expect(plannedSize(hybrid.find((r) => r.kind === "meeting")!)).toEqual({ width: 12, height: 10 });
        // Below Small, the secondary rooms keep their template's size.
        expect(planOffice("hybrid", "small").find((r) => r.kind === "reception")!.size).toBeUndefined();
    });

    it("uses only built-in templates whose manifests declare the sizes the previews assume", () => {
        for (const room of planOffice("hybrid", "small").concat(planOffice("private", "small"))) {
            const manifest = JSON.parse(readFileSync(`catalog/builtin/${room.template}/manifest.json`, "utf8")) as {
                kind: string;
                template: { width: number; height: number };
            };
            expect(manifest.kind).toBe("room_template");
            const { width, height } = manifest.template;
            if (!room.size) expect(plannedSize(room)).toEqual({ width, height });
        }
    });
});

describe("doors", () => {
    it("reads walls and the spawn point of a template", () => {
        const map = template("meeting-room");
        const grid = walkGrid(map);
        expect(grid.blocked[0]).toBe(1);
        expect(grid.blocked[2 * map.width + 1]).toBe(0);
        // The doorway (bottom row, middle) is walkable; the spawn point is right above it.
        expect(grid.blocked[(map.height - 1) * map.width + 5]).toBe(0);
        expect(grid.blocked[(map.height - 1) * map.width + 4]).toBe(1);
        expect(grid.start[(map.height - 2) * map.width + 5]).toBe(1);
    });

    for (const key of ["meeting-room", "lounge", "open-office", "reception-lobby"]) {
        it(`puts the entrance door of ${key} in its doorway, at its size and resized`, () => {
            for (const map of [template(key), extend(template(key), 32, 24), extend(template(key), 64, 48)]) {
                const [door] = placeDoors({ map, obstacles: [], count: 1, placement: "entrance" });
                expect(door).toBeDefined();
                expect(door).toMatchObject({ y: map.height - 1, width: 2, height: 1 });
                const grid = walkGrid(map);
                for (const [x, y] of cellsOf(door!)) {
                    expect(grid.blocked[y * map.width + x]).toBe(0);
                    expect(grid.start[y * map.width + x]).toBe(0);
                }
                expect(Math.abs(door!.x + 1 - map.width / 2)).toBeLessThanOrEqual(1);
            }
        });
    }

    it("spreads one door per room along the walls of the default room, clear of furniture and of the entrance", () => {
        const map = extend(template("reception-lobby"), 32, 24);
        const sofa = { x: 4 * 32, y: 2 * 32, width: 96, height: 64 };
        const doors = placeDoors({ map, obstacles: [sofa], count: 8, placement: "walls" });
        expect(doors).toHaveLength(8);
        const grid = walkGrid(map);
        const at = (x: number, y: number) => grid.blocked[y * map.width + x] === 1;
        for (const [i, door] of doors.entries()) {
            for (const [x, y] of cellsOf(door)) {
                expect(at(x, y)).toBe(false);
                // Not on the furniture, not near the entrance or the spawn point (bottom middle).
                expect(x >= 4 && x < 7 && y >= 2 && y < 4).toBe(false);
                expect(y >= map.height - 4 && x >= map.width / 2 - 3 && x <= map.width / 2 + 2).toBe(false);
            }
            // Against a wall.
            const horizontal = door.width === 2;
            const touches = horizontal
                ? (at(door.x, door.y - 1) && at(door.x + 1, door.y - 1)) ||
                  (at(door.x, door.y + 1) && at(door.x + 1, door.y + 1))
                : (at(door.x - 1, door.y) && at(door.x - 1, door.y + 1)) ||
                  (at(door.x + 1, door.y) && at(door.x + 1, door.y + 1));
            expect(touches).toBe(true);
            // Doors never touch each other.
            for (const other of doors.slice(i + 1)) {
                const apart =
                    door.x + door.width < other.x ||
                    other.x + other.width < door.x ||
                    door.y + door.height < other.y ||
                    other.y + other.height < door.y;
                expect(apart).toBe(true);
            }
        }
        // Several walls are used, not only one.
        expect(new Set(doors.map((d) => (d.width === 2 ? `h${d.y}` : `v${d.x}`))).size).toBeGreaterThan(1);
    });

    it("places as many doors as fit in a tiny room", () => {
        const doors = placeDoors({ map: template("meeting-room"), obstacles: [], count: 40, placement: "walls" });
        expect(doors.length).toBeGreaterThan(0);
        expect(doors.length).toBeLessThan(40);
    });

    it("builds exit areas WorkAdventure accepts, with stable ids", () => {
        const area = exitArea({
            seed: "room-1:/@/acme/hq/reception",
            name: "Reception",
            url: "/@/acme/hq/reception",
            cells: { x: 15, y: 23, width: 2, height: 1 },
            tileWidth: 32,
            tileHeight: 32,
        });
        expect(WorkAdventureExitArea.parse(area)).toEqual(area);
        expect(area).toMatchObject({ x: 480, y: 736, width: 64, height: 32, visible: true });
        expect(area.properties[0]).toMatchObject({ type: "exit", url: "/@/acme/hq/reception", areaName: "" });
        expect(area.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(stableUuid("x")).toBe(stableUuid("x"));
        expect(area.id).not.toBe(area.properties[0]!.id);
    });
});

describe("rooms registered from map-storage", () => {
    it("gets a slug unique in its world, following the room slug rules", () => {
        expect(uniqueRoomSlug(["focus-room", "Focus room"], new Set())).toBe("focus-room");
        expect(uniqueRoomSlug(["focus-room"], new Set(["focus-room", "focus-room-2"]))).toBe("focus-room-3");
        expect(uniqueRoomSlug(["Salle de réunion"], new Set())).toBe("salle-de-reunion");
        expect(uniqueRoomSlug(["قاعة", "!!!"], new Set())).toBe("room");
        expect(uniqueRoomSlug(["a".repeat(300)], new Set()).length).toBeLessThanOrEqual(128);
    });
});
