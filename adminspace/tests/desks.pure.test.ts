/**
 * Pure tests of the desk model: reading desks from a WAM file, their state at an instant, the rules of reservations,
 * the patches that change desks (with the checks that make a patch built on a stale view fail, including on desks whose
 * file lacks a key), the layout of new desks, the filters and the bulk lines. No database, no map-storage.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
    DEFAULT_RESERVATION_LIMITS,
    MAX_CO_OWNERS,
    MAX_DESKS_PER_BATCH,
    MAX_NAME_ON_DESK,
    activeReservation,
    addReservationOps,
    assignOps,
    cancelReservationOps,
    clearPastReservationsOps,
    combineOps,
    countDesks,
    createOps,
    deleteOps,
    deskHolderIds,
    deskRemovalProblem,
    deskStatus,
    deskTypeChangeProblem,
    extractDesks,
    isDeskHolder,
    liveReservations,
    nameOnDesk,
    normalizeCoOwnerIds,
    normalizeOwnerId,
    planDeskGrid,
    releaseOps,
    removePeopleOps,
    renameOps,
    reservationPhase,
    reservationProblem,
    setAllowedTagsOps,
    setClaimModeOps,
    setCoOwnersOps,
    setDeskTypeOps,
    setDisabledOps,
    type DeskGridRequest,
    type DeskPatchOperation,
    type DeskRecord,
    type DeskReservation,
} from "../src/lib/desks/model";
import { matchesDeskFilters, parseDeskFilters, type FilterableDesk } from "../src/lib/desks/filter";
import { nextDay, parseBulkDays, parseBulkLines } from "../src/lib/desks/bulk";

// ---------------------------------------------------------------------------------------------
// A JSON Patch, as map-storage applies it (RFC 6902 with fast-json-patch, the operations of desk management): `test`
// compares deeply, `add` sets an object member or inserts in an array ("-" appends), `remove` deletes and fails on a
// path that does not exist. The patch travels as JSON, and fast-json-patch validates it: a `test` or an `add` whose
// value is undefined (dropped by JSON) is refused. The document is never changed in place: a patch that fails changes
// nothing.
// ---------------------------------------------------------------------------------------------

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function applyPatch(document: Json, sent: readonly DeskPatchOperation[]): Json {
    const operations = JSON.parse(JSON.stringify(sent)) as DeskPatchOperation[];
    for (const operation of operations as { op: string; path: string; value?: unknown }[]) {
        if (operation.op !== "remove" && !("value" in operation)) {
            throw new Error(`Value required at ${operation.path}`);
        }
    }
    const result = structuredClone(document);
    const walk = (path: string): { parent: Json; key: string } => {
        const keys = path
            .split("/")
            .slice(1)
            .map((key) => key.replace(/~1/g, "/").replace(/~0/g, "~"));
        let parent: Json = result;
        for (const key of keys.slice(0, -1)) {
            if (parent === null || typeof parent !== "object") throw new Error(`Cannot resolve ${path}`);
            const child: Json | undefined = Array.isArray(parent) ? parent[Number(key)] : parent[key];
            if (child === undefined) throw new Error(`Cannot resolve ${path}`);
            parent = child;
        }
        return { parent, key: keys.at(-1) ?? "" };
    };
    const read = (path: string): Json | undefined => {
        const { parent, key } = walk(path);
        if (parent === null || typeof parent !== "object") return undefined;
        return Array.isArray(parent) ? parent[Number(key)] : parent[key];
    };
    for (const operation of operations) {
        if (operation.op === "test") {
            if (JSON.stringify(read(operation.path)) !== JSON.stringify(operation.value)) {
                throw new Error(`Test failed at ${operation.path}`);
            }
            continue;
        }
        const { parent, key } = walk(operation.path);
        if (parent === null || typeof parent !== "object") throw new Error(`Cannot patch ${operation.path}`);
        if (operation.op === "add") {
            if (Array.isArray(parent)) {
                if (key === "-") parent.push(operation.value as Json);
                else parent.splice(Number(key), 0, operation.value as Json);
            } else {
                parent[key] = operation.value as Json;
            }
        } else if (Array.isArray(parent)) {
            if (parent[Number(key)] === undefined) throw new Error(`Cannot remove ${operation.path}`);
            parent.splice(Number(key), 1);
        } else {
            if (!(key in parent)) throw new Error(`Cannot remove ${operation.path}`);
            delete parent[key];
        }
    }
    return result;
}

/**
 * Strict copy of the desk part of WorkAdventure's AreaData (libs/map-editor/src/types.ts, PersonalAreaPropertyData
 * with the desk types, co-owners, owner name, reservations and seats): what map-storage validates.
 */
const StrictArea = z
    .object({
        id: z.string(),
        name: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        visible: z.boolean(),
        properties: z.array(
            z
                .object({
                    id: z.string(),
                    type: z.literal("personalAreaPropertyData"),
                    accessClaimMode: z.enum(["dynamic", "static"]),
                    allowedTags: z.array(z.string()),
                    ownerId: z.string().nullable(),
                    disabled: z.boolean().optional(),
                    deskType: z.enum(["assigned", "hot", "shared"]).optional(),
                    coOwnerIds: z.array(z.string()).optional(),
                    ownerName: z.string().max(64).nullable().optional(),
                    reservations: z
                        .array(
                            z
                                .object({
                                    id: z.string(),
                                    userId: z.string(),
                                    userName: z.string().max(64).optional(),
                                    start: z.string(),
                                    end: z.string(),
                                })
                                .strict(),
                        )
                        .optional(),
                    seats: z
                        .array(
                            z
                                .object({
                                    x: z.number(),
                                    y: z.number(),
                                    direction: z.enum(["Left", "Up", "Down", "Right"]),
                                })
                                .strict(),
                        )
                        .optional(),
                })
                .strict(),
        ),
    })
    .strict();

/** A fixed instant: Saturday 24 October 2026, 10:00 UTC. */
const NOW = Date.parse("2026-10-24T10:00:00.000Z");
/** The instant `hours` after NOW, as stored. */
const at = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

function reservation(id: string, userId: string, startHours: number, endHours: number): DeskReservation {
    return { id, userId, start: at(startHours), end: at(endHours) };
}

function desk(id: string, x: number, overrides: Record<string, unknown> = {}): Json {
    return {
        id,
        name: `Desk ${id}`,
        x,
        y: 0,
        width: 64,
        height: 64,
        visible: true,
        properties: [
            {
                id: `${id}-p`,
                type: "personalAreaPropertyData",
                accessClaimMode: "dynamic",
                allowedTags: [],
                ownerId: null,
                ...(overrides as Record<string, Json>),
            },
        ],
    };
}

/** A desk as written by the Desk Manager once desks had types: every key it can depend on is in the file. */
function fullDesk(id: string, x: number, overrides: Record<string, unknown> = {}): Json {
    return desk(id, x, { deskType: "assigned", coOwnerIds: [], ownerName: null, reservations: [], ...overrides });
}

const room = (areas: Json[]): Json => ({
    version: "1.0.0",
    mapUrl: "./map.tmj",
    entities: {},
    areas,
    entityCollections: [],
});
const areasOf = (document: Json): Json[] => (document as { areas: Json[] }).areas;
const propertyOf = (document: Json, index: number): Record<string, Json> =>
    (areasOf(document)[index] as { properties: Record<string, Json>[] }).properties[0]!;
const ownerOf = (document: Json, index: number): Json => propertyOf(document, index).ownerId ?? null;

/** Somebody else changes the property of the desk at `index` after it was read. */
const meanwhile = (document: Json, index: number, key: string, value: Json): Json =>
    applyPatch(document, [{ op: "add", path: `/areas/${index}/properties/0/${key}`, value }]);

const deskAt = (document: Json, index: number): DeskRecord => {
    const found = extractDesks(areasOf(document)).find((candidate) => candidate.areaIndex === index);
    if (!found) throw new Error(`No desk at ${index}`);
    return found;
};

/** The paths a patch tests, to see what it depends on. */
const testedPaths = (operations: readonly DeskPatchOperation[]) =>
    operations.filter((operation) => operation.op === "test").map((operation) => operation.path);

describe("extractDesks", () => {
    it("finds the desks among the areas, with their state", () => {
        const areas = [
            desk("d1", 0),
            {
                id: "meeting",
                name: "Meeting room",
                x: 200,
                y: 0,
                width: 128,
                height: 128,
                visible: true,
                properties: [],
            },
            desk("d2", 100, {
                ownerId: "alice@example.test",
                accessClaimMode: "static",
                disabled: true,
                allowedTags: ["design"],
            }),
        ];

        expect(extractDesks(areas)).toEqual([
            expect.objectContaining({ areaIndex: 0, id: "d1", ownerId: null, claimMode: "dynamic", disabled: false }),
            expect.objectContaining({
                areaIndex: 2,
                id: "d2",
                ownerId: "alice@example.test",
                claimMode: "static",
                disabled: true,
                allowedTags: ["design"],
            }),
        ]);
    });

    it("remembers where the desk is in the file, which the patches need", () => {
        const areas = [
            {
                id: "meeting",
                name: "Meeting",
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                visible: true,
                properties: [{ id: "x", type: "start" }],
            },
            {
                id: "d1",
                name: "Desk",
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                visible: true,
                properties: [
                    { id: "x", type: "focusable" },
                    { id: "p", type: "personalAreaPropertyData", ownerId: null },
                ],
            },
        ];

        expect(extractDesks(areas)).toEqual([expect.objectContaining({ areaIndex: 1, propertyIndex: 1 })]);
    });

    it("takes a desk without an owner, a claim mode or a type for a free personal desk that employees claim", () => {
        const areas = [
            {
                id: "d1",
                name: "Desk",
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                properties: [{ type: "personalAreaPropertyData" }],
            },
        ];

        expect(extractDesks(areas)[0]).toMatchObject({
            ownerId: null,
            claimMode: "dynamic",
            disabled: false,
            allowedTags: [],
            deskType: "assigned",
            coOwnerIds: [],
            ownerName: null,
            reservations: [],
            seats: [],
        });
    });

    it("reads the type, the co-owners, the name on the desk, the reservations and the seats", () => {
        const [found] = extractDesks([
            desk("d1", 0, {
                deskType: "shared",
                ownerId: "alice@example.test",
                ownerName: "Alice Martin",
                coOwnerIds: ["bob@example.test"],
                reservations: [{ id: "r1", userId: "carol@example.test", userName: "Carol", start: at(1), end: at(2) }],
                seats: [{ x: 10, y: 20, direction: "Up" }],
            }),
        ]);

        expect(found).toMatchObject({
            deskType: "shared",
            ownerName: "Alice Martin",
            coOwnerIds: ["bob@example.test"],
            reservations: [{ id: "r1", userId: "carol@example.test", userName: "Carol", start: at(1), end: at(2) }],
            seats: [{ x: 10, y: 20, direction: "Up" }],
        });
    });

    it("ignores what it cannot read in the new keys, instead of ignoring the desk", () => {
        const [found] = extractDesks([
            desk("d1", 0, {
                deskType: "meeting-pod",
                coOwnerIds: "bob",
                reservations: [{ id: "r1" }, reservation("r2", "bob@example.test", 1, 2)],
                seats: [
                    { x: 1, y: 2, direction: "North" },
                    { x: 3, y: 4, direction: "Down" },
                ],
            }),
        ]);

        expect(found).toMatchObject({
            deskType: "assigned",
            coOwnerIds: [],
            reservations: [reservation("r2", "bob@example.test", 1, 2)],
            seats: [{ x: 3, y: 4, direction: "Down" }],
        });
    });

    it("ignores what is not an area", () => {
        expect(extractDesks([null, 3, "x", {}, { id: 4 }])).toEqual([]);
    });
});

describe("who a desk belongs to", () => {
    it("is its owner, and on a shared desk its co-owners too, each once", () => {
        expect(deskHolderIds({ ownerId: "a@x.test", deskType: "assigned", coOwnerIds: ["b@x.test"] })).toEqual([
            "a@x.test",
        ]);
        expect(
            deskHolderIds({ ownerId: "a@x.test", deskType: "shared", coOwnerIds: ["b@x.test", "A@x.test", ""] }),
        ).toEqual(["a@x.test", "b@x.test"]);
        expect(deskHolderIds({ ownerId: null, deskType: "shared", coOwnerIds: ["b@x.test"] })).toEqual(["b@x.test"]);
    });

    it("counts a co-owner of a shared desk as having that desk, whatever the case of the email", () => {
        const shared = { ownerId: null, deskType: "shared" as const, coOwnerIds: ["bob@x.test"] };

        expect(isDeskHolder(shared, "Bob@X.test")).toBe(true);
        expect(isDeskHolder({ ...shared, deskType: "hot" }, "bob@x.test")).toBe(false);
    });
});

describe("reservations", () => {
    it("are going on from their start included to their end excluded, like in WorkAdventure", () => {
        expect(reservationPhase({ start: at(0), end: at(1) }, NOW)).toBe("active");
        expect(reservationPhase({ start: at(-1), end: at(0) }, NOW)).toBe("past");
        expect(reservationPhase({ start: at(1), end: at(2) }, NOW)).toBe("upcoming");
    });

    it("count as over when their times cannot be read or do not follow each other", () => {
        expect(reservationPhase({ start: "tomorrow", end: at(2) }, NOW)).toBe("past");
        expect(reservationPhase({ start: at(3), end: at(2) }, NOW)).toBe("past");
    });

    it("give the one going on, and those going on or to come by start", () => {
        const kept = {
            reservations: [
                reservation("later", "c@x.test", 5, 6),
                reservation("over", "a@x.test", -3, -1),
                reservation("now", "b@x.test", -1, 1),
            ],
        };

        expect(activeReservation(kept, NOW)?.id).toBe("now");
        expect(liveReservations(kept, NOW).map((r) => r.id)).toEqual(["now", "later"]);
    });

    describe("a new one is refused", () => {
        const free = { ownerId: null, deskType: "hot" as const, coOwnerIds: [], reservations: [] };

        it("on a desk that belongs to someone, owner or co-owner", () => {
            const period = { start: at(1), end: at(2) };
            expect(reservationProblem({ ...free, deskType: "assigned", ownerId: "a@x.test" }, period, NOW)).toEqual({
                kind: "hasHolders",
            });
            expect(reservationProblem({ ...free, deskType: "shared", coOwnerIds: ["b@x.test"] }, period, NOW)).toEqual({
                kind: "hasHolders",
            });
        });

        it("when it does not end after it starts, or cannot be read", () => {
            expect(reservationProblem(free, { start: at(2), end: at(2) }, NOW)).toEqual({ kind: "invalidPeriod" });
            expect(reservationProblem(free, { start: at(3), end: at(2) }, NOW)).toEqual({ kind: "invalidPeriod" });
            expect(reservationProblem(free, { start: "soon", end: at(2) }, NOW)).toEqual({ kind: "invalidPeriod" });
        });

        it("when it is over already", () => {
            expect(reservationProblem(free, { start: at(-5), end: at(0) }, NOW)).toEqual({ kind: "past" });
        });

        it("when it lasts longer, or starts further ahead, than the limits say", () => {
            const days = (n: number) => n * 24;
            expect(reservationProblem(free, { start: at(1), end: at(1 + days(30) + 1) }, NOW)).toEqual({
                kind: "tooLong",
                maxDays: 30,
            });
            expect(reservationProblem(free, { start: at(1), end: at(1 + days(30)) }, NOW)).toBeNull();
            expect(reservationProblem(free, { start: at(days(366)), end: at(days(366) + 1) }, NOW)).toEqual({
                kind: "tooFar",
                maxAdvanceDays: 365,
            });
            const limits = { ...DEFAULT_RESERVATION_LIMITS, maxDays: 1 };
            expect(reservationProblem(free, { start: at(1), end: at(30) }, NOW, limits)).toEqual({
                kind: "tooLong",
                maxDays: 1,
            });
        });

        it("when it shares some time with another one of the desk, but not when it only touches it", () => {
            const busy = { ...free, reservations: [reservation("r1", "a@x.test", 2, 4)] };

            expect(reservationProblem(busy, { start: at(3), end: at(5) }, NOW)).toEqual({
                kind: "overlap",
                with: reservation("r1", "a@x.test", 2, 4),
            });
            expect(reservationProblem(busy, { start: at(1), end: at(6) }, NOW)?.kind).toBe("overlap");
            expect(reservationProblem(busy, { start: at(4), end: at(5) }, NOW)).toBeNull();
            expect(reservationProblem(busy, { start: at(1), end: at(2) }, NOW)).toBeNull();
        });

        it("only against reservations that still count: one that is over does not block", () => {
            const old = { ...free, reservations: [reservation("old", "a@x.test", -4, -1)] };

            expect(reservationProblem(old, { start: at(-2), end: at(1) }, NOW)).toBeNull();
        });

        it("when the desk has too many to come", () => {
            const many = {
                ...free,
                reservations: [reservation("r1", "a@x.test", 1, 2), reservation("r2", "a@x.test", 3, 4)],
            };
            const limits = { ...DEFAULT_RESERVATION_LIMITS, maxPerDesk: 2 };

            expect(reservationProblem(many, { start: at(5), end: at(6) }, NOW, limits)).toEqual({
                kind: "tooMany",
                max: 2,
            });
        });
    });
});

describe("deskStatus", () => {
    const joined = { name: "Alice", email: "alice@example.test", hasJoined: true };
    const notJoined = { name: null, email: "bob@example.test", hasJoined: false };

    it("is available for a desk nobody has", () => {
        expect(deskStatus({ ownerId: null, disabled: false }, undefined)).toBe("available");
    });

    it("is claimed for a desk of somebody who has been in the office", () => {
        expect(deskStatus({ ownerId: "alice@example.test", disabled: false }, joined)).toBe("claimed");
    });

    it("is reserved for a desk of somebody who has not been in the office yet, such as an invited employee", () => {
        expect(deskStatus({ ownerId: "bob@example.test", disabled: false }, notJoined)).toBe("reserved");
        expect(deskStatus({ ownerId: "carol@example.test", disabled: false }, undefined)).toBe("reserved");
    });

    it("is disabled for a desk out of service, whoever has it or is kept for", () => {
        expect(deskStatus({ ownerId: null, disabled: true }, undefined)).toBe("disabled");
        expect(deskStatus({ ownerId: "alice@example.test", disabled: true }, joined)).toBe("disabled");
        const kept = { ownerId: null, disabled: true, reservations: [reservation("r", "a@x.test", -1, 1)] };
        expect(deskStatus(kept, undefined, NOW)).toBe("disabled");
    });

    it("is hot for a free hot desk", () => {
        expect(deskStatus({ ownerId: null, disabled: false, deskType: "hot" }, undefined, NOW)).toBe("hot");
    });

    it("is kept while a reservation is going on, on a hot desk or a personal one, and no longer once it ends", () => {
        const reservations = [reservation("r", "a@x.test", -1, 1)];

        expect(deskStatus({ ownerId: null, disabled: false, deskType: "hot", reservations }, undefined, NOW)).toBe(
            "kept",
        );
        expect(deskStatus({ ownerId: null, disabled: false, reservations }, undefined, NOW)).toBe("kept");
        expect(deskStatus({ ownerId: null, disabled: false, reservations }, undefined, NOW + 3_600_000)).toBe(
            "available",
        );
        const later = [reservation("r", "a@x.test", 2, 3)];
        expect(
            deskStatus({ ownerId: null, disabled: false, deskType: "hot", reservations: later }, undefined, NOW),
        ).toBe("hot");
    });

    it("is shared for a shared desk that belongs to people, even with only co-owners", () => {
        const shared = { ownerId: null, disabled: false, deskType: "shared" as const, coOwnerIds: ["b@x.test"] };

        expect(deskStatus(shared, undefined, NOW)).toBe("shared");
        expect(deskStatus({ ...shared, coOwnerIds: [] }, undefined, NOW)).toBe("available");
    });

    it("puts who a desk belongs to before a reservation, as WorkAdventure does", () => {
        const owned = { ownerId: "a@x.test", disabled: false, reservations: [reservation("r", "b@x.test", -1, 1)] };

        expect(deskStatus(owned, joined, NOW)).toBe("claimed");
    });
});

describe("people", () => {
    it("writes an email in lower case, the way WorkAdventure identifies a signed-in person", () => {
        expect(normalizeOwnerId("  Alice@Example.TEST ")).toBe("alice@example.test");
    });

    it("leaves any other identifier as it is", () => {
        expect(normalizeOwnerId("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe("0f8fad5b-d9cb-469f-a165-70867728950e");
        expect(normalizeOwnerId("Not An Email")).toBe("Not An Email");
    });

    it("keeps each co-owner once, in lower case, without the owner or empty lines", () => {
        expect(
            normalizeCoOwnerIds(["Bob@X.test", " ", "bob@x.test", "alice@x.test", "carol@x.test"], "Alice@x.test"),
        ).toEqual({ ok: true, ids: ["bob@x.test", "carol@x.test"] });
    });

    it("refuses a co-owner that is not one identifier, and too many co-owners", () => {
        expect(normalizeCoOwnerIds(["bob smith"], null)).toEqual({ ok: false, problem: { kind: "invalid" } });
        expect(normalizeCoOwnerIds([`${"x".repeat(320)}@x.test`], null)).toEqual({
            ok: false,
            problem: { kind: "invalid" },
        });
        const crowd = Array.from({ length: MAX_CO_OWNERS + 1 }, (_, i) => `p${i}@x.test`);
        expect(normalizeCoOwnerIds(crowd, null)).toEqual({
            ok: false,
            problem: { kind: "tooMany", max: MAX_CO_OWNERS },
        });
    });

    it("shows a name on a desk on one line, at most 64 characters, never cutting a character in two", () => {
        expect(nameOnDesk("  Alice \n Martin ")).toBe("Alice Martin");
        expect(nameOnDesk("   ")).toBeNull();
        expect(nameOnDesk(null)).toBeNull();
        expect(nameOnDesk("x".repeat(80))).toHaveLength(MAX_NAME_ON_DESK);
        const emoji = `${"x".repeat(63)}😀`;
        expect(nameOnDesk(emoji)).toBe("x".repeat(63));
    });
});

describe("the patches that change a desk", () => {
    const office = () => room([desk("d1", 0), desk("d2", 100), desk("d3", 200)]);

    it("assigns a desk to a person", () => {
        const document = office();

        const result = applyPatch(document, assignOps(deskAt(document, 1), "Bob@Example.test"));

        expect(ownerOf(result, 1)).toBe("bob@example.test");
        expect(ownerOf(result, 0)).toBeNull();
    });

    it("writes the name of the person on the desk when they are given it", () => {
        const document = room([fullDesk("d1", 0)]);

        const result = applyPatch(
            document,
            assignOps(deskAt(document, 0), "bob@example.test", { ownerName: "  Bob   Durand " }),
        );

        expect(propertyOf(result, 0)).toMatchObject({ ownerId: "bob@example.test", ownerName: "Bob Durand" });
        for (const area of areasOf(result)) expect(StrictArea.safeParse(area).success).toBe(true);
    });

    it("clears the name of the previous owner when the new one has no known name", () => {
        const document = room([fullDesk("d1", 0, { ownerId: "alice@example.test", ownerName: "Alice" })]);

        const result = applyPatch(document, assignOps(deskAt(document, 0), "bob@example.test"));

        expect(propertyOf(result, 0)).toMatchObject({ ownerId: "bob@example.test", ownerName: null });
    });

    it("does not add a name to a desk that never had one when there is none to write", () => {
        const document = office();

        const result = applyPatch(document, assignOps(deskAt(document, 0), "bob@example.test"));

        expect("ownerName" in propertyOf(result, 0)).toBe(false);
    });

    it("frees a desk and the name shown on it, and leaves everything else on it as it is", () => {
        const document = room([fullDesk("d1", 0, { ownerId: "alice@example.test", ownerName: "Alice" })]);

        const result = applyPatch(document, releaseOps(deskAt(document, 0)));

        expect(propertyOf(result, 0)).toMatchObject({ ownerId: null, ownerName: null });
        expect((areasOf(result)[0] as { name: string }).name).toBe("Desk d1");
    });

    it("frees a desk of a file without a name key without adding one", () => {
        const document = room([desk("d1", 0, { ownerId: "alice@example.test" })]);

        const result = applyPatch(document, releaseOps(deskAt(document, 0)));

        expect(ownerOf(result, 0)).toBeNull();
        expect("ownerName" in propertyOf(result, 0)).toBe(false);
    });

    it("takes a desk out of service and puts it back, without taking it from whoever has it", () => {
        const document = room([desk("d1", 0, { ownerId: "alice@example.test" })]);

        const off = applyPatch(document, setDisabledOps(deskAt(document, 0), true));
        const on = applyPatch(off, setDisabledOps(deskAt(off, 0), false));

        expect(extractDesks(areasOf(off))[0]).toMatchObject({ disabled: true, ownerId: "alice@example.test" });
        expect(extractDesks(areasOf(on))[0]).toMatchObject({ disabled: false, ownerId: "alice@example.test" });
    });

    it("renames a desk, changes who can claim it and who it is open to", () => {
        const document = office();

        const renamed = applyPatch(document, renameOps(deskAt(document, 0), "Window seat"));
        const assigned = applyPatch(document, setClaimModeOps(deskAt(document, 0), "static"));
        const tagged = applyPatch(document, setAllowedTagsOps(deskAt(document, 0), ["design", "sales"]));

        expect(extractDesks(areasOf(renamed))[0]?.name).toBe("Window seat");
        expect(extractDesks(areasOf(assigned))[0]?.claimMode).toBe("static");
        expect(extractDesks(areasOf(tagged))[0]?.allowedTags).toEqual(["design", "sales"]);
    });

    describe("on a hand-written map whose desk has no ownerId key", () => {
        // A JSON Patch cannot test that a key is absent: the desk is guarded by its whole property instead.
        const bare = () => {
            const document = room([desk("d1", 0)]);
            delete propertyOf(document, 0).ownerId;
            return document;
        };

        it("assigns and frees it, which also writes the missing key", () => {
            const document = bare();
            const assigned = applyPatch(document, assignOps(deskAt(document, 0), "bob@example.test"));
            const freed = applyPatch(assigned, releaseOps(deskAt(assigned, 0)));

            expect(ownerOf(assigned, 0)).toBe("bob@example.test");
            expect(ownerOf(freed, 0)).toBeNull();
        });

        it("still refuses a view that is out of date", () => {
            const document = bare();
            const operations = assignOps(deskAt(document, 0), "bob@example.test");
            const now = meanwhile(document, 0, "ownerId", "alice@example.test");

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
            expect(ownerOf(now, 0)).toBe("alice@example.test");
        });
    });

    describe("what a change checks first", () => {
        it("tests each key it depends on when the file has them all", () => {
            const document = room([fullDesk("d1", 0)]);

            expect(testedPaths(assignOps(deskAt(document, 0), "bob@example.test"))).toEqual([
                "/areas/0/id",
                "/areas/0/properties/0/ownerId",
                "/areas/0/properties/0/deskType",
                "/areas/0/properties/0/reservations",
            ]);
        });

        it("tests the whole property when one of those keys is not in the file (desks made before desk types)", () => {
            const document = office();

            expect(testedPaths(assignOps(deskAt(document, 0), "bob@example.test"))).toEqual([
                "/areas/0/id",
                "/areas/0/properties/0",
            ]);
        });

        it("still gives the desk on such a file, and writes the missing keys it needs", () => {
            const document = office();

            const result = applyPatch(
                document,
                assignOps(deskAt(document, 0), "bob@example.test", { ownerName: "Bob" }),
            );

            expect(propertyOf(result, 0)).toMatchObject({ ownerId: "bob@example.test", ownerName: "Bob" });
        });

        it("refuses to give a desk that became a hot desk in the meantime, even on such a file", () => {
            const seen = office();
            const operations = assignOps(deskAt(seen, 0), "bob@example.test");

            expect(() => applyPatch(meanwhile(seen, 0, "deskType", "hot"), operations)).toThrow(/Test failed/);
        });

        it("refuses to give a desk that was reserved for someone in the meantime", () => {
            const seen = room([fullDesk("d1", 0)]);
            const operations = assignOps(deskAt(seen, 0), "bob@example.test");
            const now = meanwhile(seen, 0, "reservations", [
                reservation("r1", "carol@x.test", 1, 2),
            ] as unknown as Json);

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        });
    });

    describe("on a view that is out of date", () => {
        it("refuses to assign a desk that an employee claimed in the meantime", () => {
            const seen = office();
            const operations = assignOps(deskAt(seen, 0), "bob@example.test");
            const now = meanwhile(seen, 0, "ownerId", "alice@example.test");

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
            expect(ownerOf(now, 0)).toBe("alice@example.test");
        });

        it("refuses to free a desk that was given to somebody else in the meantime", () => {
            const seen = room([desk("d1", 0, { ownerId: "alice@example.test" })]);
            const operations = releaseOps(deskAt(seen, 0));
            const now = meanwhile(seen, 0, "ownerId", "bob@example.test");

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        });

        it("refuses to change the desk that is at that position now, if it is another one", () => {
            const seen = office();
            const operations = assignOps(deskAt(seen, 1), "bob@example.test");
            const now = applyPatch(seen, [{ op: "remove", path: "/areas/0" }]);

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        });

        it("refuses to turn a desk back on if it was already turned on", () => {
            const seen = room([desk("d1", 0, { disabled: true })]);
            const operations = setDisabledOps(deskAt(seen, 0), false);
            const now = meanwhile(seen, 0, "disabled", false);

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        });
    });

    describe("changing the desk of a person", () => {
        it("frees the old desk and gives the new one, or does neither", () => {
            const document = room([desk("d1", 0, { ownerId: "alice@example.test" }), desk("d2", 100)]);
            const operations = combineOps(
                releaseOps(deskAt(document, 0)),
                assignOps(deskAt(document, 1), "alice@example.test"),
            );

            const done = applyPatch(document, operations);

            expect(ownerOf(done, 0)).toBeNull();
            expect(ownerOf(done, 1)).toBe("alice@example.test");

            // Somebody took the new desk in the meantime: the old desk must not be freed either.
            const taken = meanwhile(document, 1, "ownerId", "bob@example.test");
            expect(() => applyPatch(taken, operations)).toThrow(/Test failed/);
            expect(ownerOf(taken, 0)).toBe("alice@example.test");
        });

        it("makes a co-owner who becomes the owner of a shared desk its owner only once", () => {
            const document = room([
                fullDesk("d1", 0, { deskType: "shared", coOwnerIds: ["bob@x.test", "carol@x.test"] }),
            ]);

            const result = applyPatch(document, assignOps(deskAt(document, 0), "Bob@x.test"));

            expect(propertyOf(result, 0)).toMatchObject({ ownerId: "bob@x.test", coOwnerIds: ["carol@x.test"] });
        });

        it("cancels the reservations of the desk in the same change when asked to", () => {
            const document = room([fullDesk("d1", 0, { reservations: [reservation("r1", "carol@x.test", 1, 2)] })]);

            const kept = applyPatch(document, assignOps(deskAt(document, 0), "bob@x.test"));
            const dropped = applyPatch(
                document,
                assignOps(deskAt(document, 0), "bob@x.test", { dropReservations: true }),
            );

            expect(propertyOf(kept, 0).reservations).toHaveLength(1);
            expect(propertyOf(dropped, 0).reservations).toEqual([]);
        });
    });

    describe("removing desks", () => {
        it("removes the desks that were picked, whatever the order they were picked in", () => {
            const document = room([desk("d1", 0), desk("d2", 100), desk("d3", 200), desk("d4", 300)]);
            const picked = [deskAt(document, 1), deskAt(document, 3), deskAt(document, 0)];

            const done = applyPatch(document, deleteOps(picked));

            expect(extractDesks(areasOf(done)).map((candidate) => candidate.id)).toEqual(["d3"]);
        });

        it("will not take a desk away from a patch built on an out-of-date view", () => {
            const seen = room([desk("d1", 0), desk("d2", 100)]);
            const operations = deleteOps([deskAt(seen, 1)]);
            const now = meanwhile(seen, 1, "ownerId", "alice@example.test");

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
            expect(areasOf(now)).toHaveLength(2);
        });

        it("will not remove a desk that was reserved for someone in the meantime", () => {
            const seen = room([fullDesk("d1", 0)]);
            const operations = deleteOps([deskAt(seen, 0)]);
            const now = meanwhile(seen, 0, "reservations", [reservation("r1", "a@x.test", 1, 2)] as unknown as Json);

            expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        });

        it("says that a desk that belongs to someone, or has reservations to come, cannot be removed yet", () => {
            expect(deskRemovalProblem({ ownerId: "alice@example.test" })).toBe("occupied");
            expect(deskRemovalProblem({ ownerId: null, deskType: "shared", coOwnerIds: ["b@x.test"] })).toBe(
                "occupied",
            );
            expect(deskRemovalProblem({ ownerId: null, reservations: [reservation("r", "a@x.test", 1, 2)] }, NOW)).toBe(
                "reservations",
            );
            expect(
                deskRemovalProblem({ ownerId: null, reservations: [reservation("r", "a@x.test", -2, -1)] }, NOW),
            ).toBe(null);
            expect(deskRemovalProblem({ ownerId: null })).toBeNull();
        });
    });
});

describe("changing how a desk is used", () => {
    it("makes a free personal desk a hot desk, and the file valid", () => {
        const document = room([desk("d1", 0)]);

        const result = applyPatch(document, setDeskTypeOps(deskAt(document, 0), "hot"));

        expect(deskAt(result, 0).deskType).toBe("hot");
        expect(StrictArea.safeParse(areasOf(result)[0]).success).toBe(true);
    });

    it("frees a desk that becomes a hot desk, only when the administrator agreed", () => {
        const document = room([fullDesk("d1", 0, { ownerId: "alice@x.test", ownerName: "Alice" })]);
        const owned = deskAt(document, 0);

        expect(deskTypeChangeProblem(owned, "hot")).toBe("ownerMustBeCleared");
        expect(() => setDeskTypeOps(owned, "hot")).toThrow(/confirmation/);

        const result = applyPatch(document, setDeskTypeOps(owned, "hot", { clearOwner: true }));
        expect(propertyOf(result, 0)).toMatchObject({ deskType: "hot", ownerId: null, ownerName: null });
    });

    it("removes the co-owners of a desk that is no longer shared, only when the administrator agreed", () => {
        const document = room([
            fullDesk("d1", 0, { deskType: "shared", ownerId: "a@x.test", coOwnerIds: ["b@x.test"] }),
        ]);
        const shared = deskAt(document, 0);

        expect(deskTypeChangeProblem(shared, "assigned")).toBe("coOwnersMustBeDropped");
        expect(() => setDeskTypeOps(shared, "assigned")).toThrow(/confirmation/);

        const result = applyPatch(document, setDeskTypeOps(shared, "assigned", { dropCoOwners: true }));
        expect(propertyOf(result, 0)).toMatchObject({ deskType: "assigned", ownerId: "a@x.test" });
        expect("coOwnerIds" in propertyOf(result, 0)).toBe(false);
    });

    it("keeps the owner of a desk that becomes shared", () => {
        const document = room([desk("d1", 0, { ownerId: "a@x.test" })]);

        const result = applyPatch(document, setDeskTypeOps(deskAt(document, 0), "shared"));

        expect(propertyOf(result, 0)).toMatchObject({ deskType: "shared", ownerId: "a@x.test" });
        expect(deskTypeChangeProblem(deskAt(document, 0), "shared")).toBeNull();
    });

    it("refuses a change built before an employee claimed the desk", () => {
        const seen = room([desk("d1", 0)]);
        const operations = setDeskTypeOps(deskAt(seen, 0), "hot");

        expect(() => applyPatch(meanwhile(seen, 0, "ownerId", "alice@x.test"), operations)).toThrow(/Test failed/);
    });

    it("refuses to drop co-owners that were changed in the meantime", () => {
        const seen = room([fullDesk("d1", 0, { deskType: "shared", coOwnerIds: [] })]);
        const operations = setDeskTypeOps(deskAt(seen, 0), "hot");

        expect(() => applyPatch(meanwhile(seen, 0, "coOwnerIds", ["b@x.test"]), operations)).toThrow(/Test failed/);
    });
});

describe("co-owners", () => {
    it("are set on a shared desk only", () => {
        const document = room([desk("d1", 0, { deskType: "shared", ownerId: "a@x.test" }), desk("d2", 100)]);

        const result = applyPatch(document, setCoOwnersOps(deskAt(document, 0), ["b@x.test", "c@x.test"]));

        expect(propertyOf(result, 0).coOwnerIds).toEqual(["b@x.test", "c@x.test"]);
        expect(() => setCoOwnersOps(deskAt(document, 1), ["b@x.test"])).toThrow(/not shared/);
    });

    it("are not overwritten when someone changed them in the meantime", () => {
        const seen = room([fullDesk("d1", 0, { deskType: "shared", coOwnerIds: ["b@x.test"] })]);
        const operations = setCoOwnersOps(deskAt(seen, 0), ["c@x.test"]);

        expect(() => applyPatch(meanwhile(seen, 0, "coOwnerIds", ["d@x.test"]), operations)).toThrow(/Test failed/);
    });

    it("cancel the reservations in the same change when the desk gets people and that was agreed", () => {
        const document = room([
            fullDesk("d1", 0, { deskType: "shared", reservations: [reservation("r1", "z@x.test", 1, 2)] }),
        ]);

        const result = applyPatch(
            document,
            setCoOwnersOps(deskAt(document, 0), ["b@x.test"], { dropReservations: true }),
        );

        expect(propertyOf(result, 0)).toMatchObject({ coOwnerIds: ["b@x.test"], reservations: [] });
    });
});

describe("keeping a desk for someone", () => {
    const newReservation = reservation("new", "bob@x.test", 2, 3);

    it("adds the reservation, drops the ones that are over, and gives a file WorkAdventure accepts", () => {
        const document = room([
            fullDesk("d1", 0, {
                deskType: "hot",
                reservations: [reservation("old", "a@x.test", -5, -2), reservation("soon", "c@x.test", 4, 5)],
            }),
        ]);

        const result = applyPatch(document, addReservationOps(deskAt(document, 0), newReservation, NOW));

        expect(deskAt(result, 0).reservations.map((r) => r.id)).toEqual(["soon", "new"]);
        expect(StrictArea.safeParse(areasOf(result)[0]).success).toBe(true);
    });

    it("adds the first reservation of a desk whose file has no reservations key", () => {
        const document = room([desk("d1", 0)]);

        const operations = addReservationOps(deskAt(document, 0), newReservation, NOW);
        const result = applyPatch(document, operations);

        expect(testedPaths(operations)).toEqual(["/areas/0/id", "/areas/0/properties/0"]);
        expect(deskAt(result, 0).reservations).toEqual([newReservation]);
    });

    it("refuses to add a reservation when another one was added in the meantime, so that two cannot overlap", () => {
        const seen = room([fullDesk("d1", 0, { deskType: "hot" })]);
        const operations = addReservationOps(deskAt(seen, 0), newReservation, NOW);
        const now = meanwhile(seen, 0, "reservations", [reservation("other", "c@x.test", 2, 3)] as unknown as Json);

        expect(() => applyPatch(now, operations)).toThrow(/Test failed/);
        expect(deskAt(now, 0).reservations.map((r) => r.id)).toEqual(["other"]);
    });

    it("refuses it on a desk without a reservations key that somebody claimed in the meantime", () => {
        const seen = room([desk("d1", 0)]);
        const operations = addReservationOps(deskAt(seen, 0), newReservation, NOW);

        expect(() => applyPatch(meanwhile(seen, 0, "ownerId", "alice@x.test"), operations)).toThrow(/Test failed/);
    });

    it("refuses it on a desk that was given co-owners in the meantime", () => {
        const seen = room([fullDesk("d1", 0, { deskType: "shared" })]);
        const operations = addReservationOps(deskAt(seen, 0), newReservation, NOW);

        expect(() => applyPatch(meanwhile(seen, 0, "coOwnerIds", ["b@x.test"]), operations)).toThrow(/Test failed/);
    });

    it("cancels one reservation, the one that was read", () => {
        const document = room([
            fullDesk("d1", 0, {
                reservations: [reservation("r1", "a@x.test", 1, 2), reservation("r2", "b@x.test", 3, 4)],
            }),
        ]);

        const result = applyPatch(document, cancelReservationOps(deskAt(document, 0), "r2")!);

        expect(deskAt(result, 0).reservations.map((r) => r.id)).toEqual(["r1"]);
        expect(cancelReservationOps(deskAt(document, 0), "nope")).toBeNull();
    });

    it("refuses to cancel when the list changed and another reservation is now at that place", () => {
        const seen = room([
            fullDesk("d1", 0, {
                reservations: [reservation("r1", "a@x.test", 1, 2), reservation("r2", "b@x.test", 3, 4)],
            }),
        ]);
        const operations = cancelReservationOps(deskAt(seen, 0), "r2")!;
        const now = applyPatch(seen, [{ op: "remove", path: "/areas/0/properties/0/reservations/0" }]);

        expect(() => applyPatch(now, operations)).toThrow(/Test failed|Cannot/);
        expect(deskAt(now, 0).reservations.map((r) => r.id)).toEqual(["r2"]);
    });

    it("removes the reservations that are over, and only those", () => {
        const document = room([
            fullDesk("d1", 0, {
                reservations: [reservation("old", "a@x.test", -5, -2), reservation("now", "b@x.test", -1, 1)],
            }),
        ]);

        const result = applyPatch(document, clearPastReservationsOps(deskAt(document, 0), NOW)!);

        expect(deskAt(result, 0).reservations.map((r) => r.id)).toEqual(["now"]);
        expect(clearPastReservationsOps(deskAt(result, 0), NOW)).toBeNull();
    });
});

describe("when people leave", () => {
    const leaving = (person: string) => ["leaver@x.test"].includes(person.toLowerCase());

    it("frees the desk they own, and the name shown on it", () => {
        const document = room([fullDesk("d1", 0, { ownerId: "Leaver@x.test", ownerName: "Leaver" })]);

        const removal = removePeopleOps(deskAt(document, 0), leaving, NOW)!;
        const result = applyPatch(document, removal.operations);

        expect(removal.releasedOwner).toBe("Leaver@x.test");
        expect(propertyOf(result, 0)).toMatchObject({ ownerId: null, ownerName: null });
    });

    it("removes them from the co-owners of a shared desk, which stays with the others", () => {
        const document = room([
            fullDesk("d1", 0, { deskType: "shared", ownerId: "a@x.test", coOwnerIds: ["leaver@x.test", "b@x.test"] }),
        ]);

        const removal = removePeopleOps(deskAt(document, 0), leaving, NOW)!;
        const result = applyPatch(document, removal.operations);

        expect(removal).toMatchObject({ releasedOwner: null, removedCoOwners: ["leaver@x.test"] });
        expect(propertyOf(result, 0)).toMatchObject({ ownerId: "a@x.test", coOwnerIds: ["b@x.test"] });
    });

    it("cancels their reservations going on or to come, and leaves those of the others", () => {
        const document = room([
            fullDesk("d1", 0, {
                reservations: [
                    reservation("theirs", "leaver@x.test", 1, 2),
                    reservation("now", "leaver@x.test", -1, 1),
                    reservation("other", "b@x.test", 3, 4),
                ],
            }),
        ]);

        const removal = removePeopleOps(deskAt(document, 0), leaving, NOW)!;
        const result = applyPatch(document, removal.operations);

        expect(removal.cancelled.map((r) => r.id)).toEqual(["now", "theirs"]);
        expect(deskAt(result, 0).reservations.map((r) => r.id)).toEqual(["other"]);
    });

    it("changes nothing on a desk that has none of them", () => {
        const document = room([
            fullDesk("d1", 0, { ownerId: "a@x.test", reservations: [reservation("r", "b@x.test", 1, 2)] }),
        ]);

        expect(removePeopleOps(deskAt(document, 0), leaving, NOW)).toBeNull();
    });

    it("does not free a desk that was given to somebody else in the meantime", () => {
        const seen = room([desk("d1", 0, { ownerId: "leaver@x.test" })]);
        const removal = removePeopleOps(deskAt(seen, 0), leaving, NOW)!;

        expect(() => applyPatch(meanwhile(seen, 0, "ownerId", "new@x.test"), removal.operations)).toThrow(
            /Test failed/,
        );
    });
});

describe("planDeskGrid", () => {
    const request = (overrides: Partial<DeskGridRequest> = {}): DeskGridRequest => ({
        originX: 64,
        originY: 64,
        columns: 3,
        rows: 2,
        deskWidth: 64,
        deskHeight: 64,
        gapX: 32,
        gapY: 32,
        namePrefix: "Desk",
        startNumber: 1,
        claimMode: "dynamic",
        allowedTags: [],
        ...overrides,
    });
    const ids = () => {
        let next = 0;
        return () => `id-${++next}`;
    };
    const bounds = { width: 1024, height: 768 };

    it("lays out the desks in rows, left to right", () => {
        const { desks, problems } = planDeskGrid(request(), bounds, [], ids());

        expect(problems).toEqual([]);
        expect(desks.map((planned) => [planned.name, planned.x, planned.y])).toEqual([
            ["Desk 1", 64, 64],
            ["Desk 2", 160, 64],
            ["Desk 3", 256, 64],
            ["Desk 4", 64, 160],
            ["Desk 5", 160, 160],
            ["Desk 6", 256, 160],
        ]);
    });

    it("gives every desk and every property an identifier of its own", () => {
        const { desks } = planDeskGrid(request(), bounds, [], ids());

        const all = desks.flatMap((planned) => [planned.id, planned.properties[0].id]);
        expect(new Set(all).size).toBe(all.length);
    });

    it("gives free desks of the kind and for the tags that were asked", () => {
        const { desks } = planDeskGrid(request({ claimMode: "static", allowedTags: ["design"] }), bounds, [], ids());

        expect(desks[0]?.properties[0]).toMatchObject({
            accessClaimMode: "static",
            allowedTags: ["design"],
            ownerId: null,
        });
    });

    it("makes hot desks when asked, and personal desks of the shape desks always had otherwise", () => {
        const hot = planDeskGrid(request({ deskType: "hot" }), bounds, [], ids()).desks;
        const personal = planDeskGrid(request({ deskType: "assigned" }), bounds, [], ids()).desks;

        expect(hot[0]?.properties[0].deskType).toBe("hot");
        expect("deskType" in personal[0]!.properties[0]).toBe(false);
    });

    it("gives areas that map-storage accepts", () => {
        const { desks } = planDeskGrid(request(), bounds, [], ids());
        const hot = planDeskGrid(request({ deskType: "hot" }), bounds, [], ids()).desks;

        for (const planned of [...desks, ...hot]) expect(StrictArea.safeParse(planned).success).toBe(true);
    });

    it("can be added to the room as it is, and shows up as free desks", () => {
        const document = room([desk("existing", 0)]);
        const { desks } = planDeskGrid(request({ originX: 512 }), bounds, [], ids());

        const done = applyPatch(document, createOps(desks));

        const all = extractDesks(areasOf(done));
        expect(all).toHaveLength(7);
        expect(all.slice(1).every((candidate) => candidate.ownerId === null && !candidate.disabled)).toBe(true);
    });

    it("numbers the desks from where it was asked to start", () => {
        const { desks } = planDeskGrid(
            request({ columns: 2, rows: 1, startNumber: 12, namePrefix: "Seat" }),
            bounds,
            [],
            ids(),
        );

        expect(desks.map((planned) => planned.name)).toEqual(["Seat 12", "Seat 13"]);
    });

    it("makes nothing when a desk would lie outside the map, and says which", () => {
        const { desks, problems } = planDeskGrid(request({ originX: 900 }), bounds, [], ids());

        expect(desks).toEqual([]);
        expect(problems).toContainEqual({ kind: "outOfBounds", index: 1 });
    });

    it("makes nothing when a desk would overlap a desk that is already there, and says which", () => {
        const existing = [{ id: "d9", x: 150, y: 70, width: 64, height: 64 }];

        const { desks, problems } = planDeskGrid(request(), bounds, existing, ids());

        expect(desks).toEqual([]);
        expect(problems).toContainEqual({ kind: "overlaps", index: 1, with: "d9" });
    });

    it("lets desks touch a desk that is already there without overlapping it", () => {
        const existing = [{ id: "d9", x: 0, y: 64, width: 64, height: 64 }];

        expect(planDeskGrid(request(), bounds, existing, ids()).problems).toEqual([]);
    });

    it("refuses too many desks at once", () => {
        const { problems } = planDeskGrid(
            request({ columns: 50, rows: 50, deskWidth: 16, deskHeight: 16, gapX: 0, gapY: 0 }),
            null,
            [],
            ids(),
        );

        expect(problems).toEqual([{ kind: "tooMany", max: MAX_DESKS_PER_BATCH }]);
    });

    it.each([
        ["no column", { columns: 0 }],
        ["a fraction of a row", { rows: 1.5 }],
        ["a negative origin", { originX: -32 }],
        ["a desk too small to stand in", { deskWidth: 4 }],
        ["a desk bigger than a room", { deskHeight: 5000 }],
        ["a negative gap", { gapX: -1 }],
    ])("refuses a layout with %s", (_label, overrides) => {
        expect(planDeskGrid(request(overrides), bounds, [], ids()).problems).toEqual([{ kind: "invalid" }]);
    });

    it("does not look at the bounds when the size of the map is unknown", () => {
        expect(planDeskGrid(request({ originX: 90000 }), null, [], ids()).problems).toEqual([]);
    });
});

describe("searching and filtering desks", () => {
    const alice: FilterableDesk = {
        name: "Window seat",
        ownerId: "alice@example.test",
        status: "claimed",
        owner: { name: "Élodie Martin", email: "alice@example.test" },
    };
    const free: FilterableDesk = { name: "Desk 4", ownerId: null, status: "available", owner: null };

    it("reads the filters of the URL, and ignores anything that is not one", () => {
        const params = new URLSearchParams({
            q: "  window ",
            status: "kept",
            type: "hot",
            room: "0F8FAD5B-D9CB-469F-A165-70867728950E",
        });

        expect(parseDeskFilters(params)).toEqual({
            q: "window",
            status: "kept",
            type: "hot",
            roomId: "0f8fad5b-d9cb-469f-a165-70867728950e",
        });
        expect(parseDeskFilters(new URLSearchParams({ status: "bogus", type: "sofa", room: "not-a-uuid" }))).toEqual({
            q: "",
            status: null,
            type: null,
            roomId: null,
        });
    });

    it("keeps the search short", () => {
        expect(parseDeskFilters(new URLSearchParams({ q: "x".repeat(500) })).q).toHaveLength(100);
    });

    it("matches everything when nothing is asked", () => {
        expect(matchesDeskFilters(alice, { q: "", status: null })).toBe(true);
        expect(matchesDeskFilters(free, { q: "", status: null })).toBe(true);
    });

    it("finds a desk by its name, or by the name or the email of the person who has it", () => {
        expect(matchesDeskFilters(alice, { q: "window", status: null })).toBe(true);
        expect(matchesDeskFilters(alice, { q: "martin", status: null })).toBe(true);
        expect(matchesDeskFilters(alice, { q: "alice@", status: null })).toBe(true);
        expect(matchesDeskFilters(alice, { q: "desk 4", status: null })).toBe(false);
    });

    it("finds a desk by its co-owners and the people it is kept for", () => {
        const shared: FilterableDesk = {
            ...free,
            status: "shared",
            deskType: "shared",
            people: [
                { id: "bob@example.test", name: "Bob Durand", email: "bob@example.test" },
                { id: "zoe@example.test" },
            ],
        };

        expect(matchesDeskFilters(shared, { q: "durand", status: null })).toBe(true);
        expect(matchesDeskFilters(shared, { q: "zoe@", status: null })).toBe(true);
        expect(matchesDeskFilters(shared, { q: "nobody", status: null })).toBe(false);
    });

    it("does not mind case or accents", () => {
        expect(matchesDeskFilters(alice, { q: "ELODIE", status: null })).toBe(true);
        expect(matchesDeskFilters(alice, { q: "élodie", status: null })).toBe(true);
    });

    it("finds a person by what identifies them even when they are not known in the office", () => {
        const reserved: FilterableDesk = {
            name: "Desk 9",
            ownerId: "new.hire@example.test",
            status: "reserved",
            owner: null,
        };

        expect(matchesDeskFilters(reserved, { q: "new.hire", status: null })).toBe(true);
    });

    it("keeps only the desks of the state and the type that are asked", () => {
        expect(matchesDeskFilters(alice, { q: "", status: "claimed" })).toBe(true);
        expect(matchesDeskFilters(alice, { q: "", status: "available" })).toBe(false);
        expect(matchesDeskFilters(free, { q: "", status: "available" })).toBe(true);
        expect(matchesDeskFilters(free, { q: "", status: null, type: "assigned" })).toBe(true);
        expect(matchesDeskFilters(free, { q: "", status: null, type: "hot" })).toBe(false);
        expect(matchesDeskFilters({ ...free, deskType: "hot" }, { q: "", status: null, type: "hot" })).toBe(true);
    });

    it("asks for both the state and the text", () => {
        expect(matchesDeskFilters(alice, { q: "window", status: "available" })).toBe(false);
        expect(matchesDeskFilters(alice, { q: "window", status: "claimed" })).toBe(true);
    });
});

describe("assigning or reserving several desks", () => {
    it("reads the desk and the person, split on the first comma, semicolon or tab", () => {
        expect(parseBulkLines("Desk 1, alice@x.test\n\n  Desk 2;bob@x.test  \nDesk 3")).toEqual([
            { line: 1, desk: "Desk 1", person: "alice@x.test", daysText: "", days: null },
            { line: 3, desk: "Desk 2", person: "bob@x.test", daysText: "", days: null },
            { line: 4, desk: "Desk 3", person: "", daysText: "", days: null },
        ]);
    });

    it("reads the days of a reservation after the person: a span, or one day", () => {
        expect(parseBulkLines("Desk 1, a@x.test, 2026-11-02..2026-11-06\nDesk 2, b@x.test, 2026-11-03")).toEqual([
            {
                line: 1,
                desk: "Desk 1",
                person: "a@x.test",
                daysText: "2026-11-02..2026-11-06",
                days: { first: "2026-11-02", last: "2026-11-06" },
            },
            {
                line: 2,
                desk: "Desk 2",
                person: "b@x.test",
                daysText: "2026-11-03",
                days: { first: "2026-11-03", last: "2026-11-03" },
            },
        ]);
    });

    it("does not read days that are not days of the calendar, or in the wrong order", () => {
        expect(parseBulkDays("2026-02-30")).toBeNull();
        expect(parseBulkDays("2026-11-06..2026-11-02")).toBeNull();
        expect(parseBulkDays("next week")).toBeNull();
        expect(parseBulkLines("Desk 1, a@x.test, tomorrow")[0]).toMatchObject({ daysText: "tomorrow", days: null });
    });

    it("finds the day after, across months and years", () => {
        expect(nextDay("2026-10-31")).toBe("2026-11-01");
        expect(nextDay("2026-12-31")).toBe("2027-01-01");
        expect(nextDay("2028-02-28")).toBe("2028-02-29");
    });
});

describe("countDesks", () => {
    it("counts the desks of each state", () => {
        expect(
            countDesks(["available", "claimed", "claimed", "reserved", "disabled", "hot", "kept", "shared"]),
        ).toEqual({
            available: 1,
            hot: 1,
            kept: 1,
            claimed: 2,
            reserved: 1,
            shared: 1,
            disabled: 1,
            total: 8,
        });
    });

    it("counts nothing for an empty office", () => {
        expect(countDesks([])).toEqual({
            available: 0,
            hot: 0,
            kept: 0,
            claimed: 0,
            reserved: 0,
            shared: 0,
            disabled: 0,
            total: 0,
        });
    });
});
