import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerUnaryCall } from "@grpc/grpc-js";
import { WAMFileFormat } from "@workadventure/map-editor";
import type { AreaData } from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import { mapStorageServer } from "../MapStorageServer";
import { mapsManager } from "../MapsManager";
import { mapPathUsingUrl } from "../Services/PathMapper";
import { patchStoredWam, type WamPatchDependencies } from "../Services/WamPatchService";

/**
 * Patching the stored WAM file of a map that players are editing: the patch of an administrator must neither erase what
 * players just did (map-storage keeps their edits in memory and saves them every few seconds), nor be erased by the
 * next save. The real MapsManager and its lock are used, on a file system kept in memory.
 */

const { files } = vi.hoisted(() => {
    process.env.PUSHER_URL = "https://pusher.example.test";
    process.env.API_URL = "https://back.example.test";
    process.env.MAP_STORAGE_API_TOKEN = "token-for-tests";
    return { files: new Map<string, string>() };
});

vi.mock("../fileSystem", () => ({
    fileSystem: {
        readFileAsString: (path: string) => {
            const content = files.get(path);
            return content === undefined
                ? Promise.reject(new Error(`No such file: ${path}`))
                : Promise.resolve(content);
        },
        writeStringAsFile: (path: string, content: string) => {
            files.set(path, content);
            return Promise.resolve();
        },
        exist: (path: string) => Promise.resolve(files.has(path)),
        listFiles: () => Promise.resolve([]),
    },
}));

const MAP_URL = "https://maps.example.test/office/office.wam";
const KEY = mapPathUsingUrl(new URL(MAP_URL));

function desk(id: string, x: number): AreaData {
    return {
        id,
        name: id,
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
            },
        ],
    };
}

function seed(): void {
    files.set(
        KEY,
        JSON.stringify({
            version: "1.0.0",
            mapUrl: "./map.tmj",
            entities: {},
            areas: [desk("desk-a", 0), desk("desk-b", 100), desk("desk-c", 200)],
            entityCollections: [],
        }),
    );
}

const dependencies = (): WamPatchDependencies => ({
    fileSystem: {
        readFileAsString: (path) => Promise.resolve(files.get(path) ?? ""),
        writeStringAsFile: (path, content) => {
            files.set(path, content);
            return Promise.resolve();
        },
    },
    liveMaps: mapsManager,
    validateWam: (content) => {
        const result = WAMFileFormat.safeParse(JSON.parse(content));
        return result.success ? { ok: true, value: result.data } : { ok: false, issues: result.error.issues };
    },
});

/** What the file holds now: the owner of each desk. */
function ownersInFile(): Record<string, string | null | undefined> {
    const wam = WAMFileFormat.parse(JSON.parse(files.get(KEY) ?? "{}"));
    return Object.fromEntries(
        wam.areas.map((area) => {
            const property = area.properties.find((candidate) => candidate.type === "personalAreaPropertyData");
            return [area.id, property?.type === "personalAreaPropertyData" ? property.ownerId : undefined];
        }),
    );
}

/** An employee claims a desk in the game. The change stays in memory until the map is saved. */
function claimInGame(uuid: string, deskId: string): Promise<EditMapCommandMessage> {
    return new Promise((resolve, reject) => {
        mapStorageServer.handleEditMapCommandWithKeyMessage(
            {
                request: {
                    mapKey: MAP_URL,
                    connectedUserTags: [],
                    userCanEdit: false,
                    userUUID: uuid,
                    editMapCommandMessage: {
                        id: `claim-${uuid}`,
                        editMapMessage: {
                            message: {
                                $case: "modifyAreaMessage",
                                modifyAreaMessage: {
                                    id: deskId,
                                    modifyProperties: true,
                                    properties: [
                                        {
                                            id: `${deskId}-p`,
                                            type: "personalAreaPropertyData",
                                            accessClaimMode: "dynamic",
                                            allowedTags: [],
                                            ownerId: uuid,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            } as unknown as ServerUnaryCall<never, never>,
            (error, value) => {
                if (error || !value) {
                    reject(error instanceof Error ? error : new Error("no answer"));
                    return;
                }
                resolve(value);
            },
        );
    });
}

const assign = (deskIndex: number, ownerId: string) => [
    { op: "add", path: `/areas/${deskIndex}/properties/0/ownerId`, value: ownerId },
];

beforeEach(() => {
    files.clear();
    seed();
});

afterEach(() => {
    mapsManager.clearAfterUpload(KEY);
});

describe("patchStoredWam on a map that players are editing", () => {
    it("keeps what a player did in the last seconds, which is only in memory", async () => {
        await mapsManager.getOrLoadWamFile(KEY);
        await claimInGame("alice", "desk-a");
        // The file does not know about alice's claim yet.
        expect(ownersInFile()["desk-a"]).toBeNull();

        const outcome = await patchStoredWam(dependencies(), KEY, assign(1, "bob"));

        expect(outcome.status).toBe("ok");
        expect(ownersInFile()).toEqual({ "desk-a": "alice", "desk-b": "bob", "desk-c": null });
    });

    it("is not erased by the save that comes after it", async () => {
        await mapsManager.getOrLoadWamFile(KEY);
        await claimInGame("alice", "desk-a");

        await patchStoredWam(dependencies(), KEY, assign(1, "bob"));

        // The map in memory was dropped: there is nothing left that could be saved over the patch.
        expect(mapsManager.getWamFile(KEY)).toBeUndefined();
    });

    it("lets the players edit again from the patched file", async () => {
        await mapsManager.getOrLoadWamFile(KEY);
        await claimInGame("alice", "desk-a");
        await patchStoredWam(dependencies(), KEY, assign(1, "bob"));

        await claimInGame("carol", "desk-c");

        const map = (await mapsManager.getOrLoadWamFile(KEY)).getWam();
        const owners = Object.fromEntries(
            map.areas.map((area) => [
                area.id,
                area.properties[0].type === "personalAreaPropertyData" ? area.properties[0].ownerId : undefined,
            ]),
        );
        expect(owners).toEqual({ "desk-a": "alice", "desk-b": "bob", "desk-c": "carol" });
    });

    it("applies two patches at the same time without one erasing the other", async () => {
        await mapsManager.getOrLoadWamFile(KEY);

        const outcomes = await Promise.all([
            patchStoredWam(dependencies(), KEY, assign(0, "alice")),
            patchStoredWam(dependencies(), KEY, assign(1, "bob")),
            patchStoredWam(dependencies(), KEY, assign(2, "carol")),
        ]);

        expect(outcomes.map((outcome) => outcome.status)).toEqual(["ok", "ok", "ok"]);
        expect(ownersInFile()).toEqual({ "desk-a": "alice", "desk-b": "bob", "desk-c": "carol" });
    });

    it("works on a map that nobody is editing", async () => {
        const outcome = await patchStoredWam(dependencies(), KEY, assign(0, "alice"));

        expect(outcome.status).toBe("ok");
        expect(ownersInFile()["desk-a"]).toBe("alice");
    });
});

describe("patchStoredWam refusing a patch", () => {
    it("refuses what is not a JSON Patch, and changes nothing", async () => {
        const before = files.get(KEY);

        const outcome = await patchStoredWam(dependencies(), KEY, { op: "add" });

        expect(outcome.status).toBe("badPatch");
        expect(files.get(KEY)).toBe(before);
    });

    it("refuses a patch whose check fails, which is how an administrator guards against a change in between", async () => {
        const before = files.get(KEY);
        const guarded = [
            { op: "test", path: "/areas/0/properties/0/ownerId", value: "someone-else" },
            ...assign(0, "bob"),
        ];

        const outcome = await patchStoredWam(dependencies(), KEY, guarded);

        expect(outcome.status).toBe("badPatch");
        expect(files.get(KEY)).toBe(before);
    });

    it("applies a patch whose check holds", async () => {
        const guarded = [{ op: "test", path: "/areas/0/properties/0/ownerId", value: null }, ...assign(0, "bob")];

        const outcome = await patchStoredWam(dependencies(), KEY, guarded);

        expect(outcome.status).toBe("ok");
        expect(ownersInFile()["desk-a"]).toBe("bob");
    });

    it("sees a claim made in the game when the check is run, so it cannot give away a desk that was just claimed", async () => {
        await mapsManager.getOrLoadWamFile(KEY);
        await claimInGame("alice", "desk-a");
        const guarded = [{ op: "test", path: "/areas/0/properties/0/ownerId", value: null }, ...assign(0, "bob")];

        const outcome = await patchStoredWam(dependencies(), KEY, guarded);

        expect(outcome.status).toBe("badPatch");
        expect(ownersInFile()["desk-a"]).toBe("alice");
    });

    it("refuses a patch that makes the file invalid, and changes nothing", async () => {
        const outcome = await patchStoredWam(dependencies(), KEY, [
            { op: "add", path: "/areas/0/width", value: "wide" },
        ]);

        expect(outcome.status).toBe("invalidWam");
        expect(ownersInFile()["desk-a"]).toBeNull();
    });

    it("keeps the map of the players when the patch is refused, so that they can go on editing", async () => {
        await mapsManager.getOrLoadWamFile(KEY);

        await patchStoredWam(dependencies(), KEY, { op: "add" });

        expect(mapsManager.getWamFile(KEY)).toBeDefined();
    });
});
