import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerUnaryCall } from "@grpc/grpc-js";
import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import type { EditMapCommandMessage, EditMapCommandWithKeyMessage } from "@workadventure/messages";
import { mapStorageServer } from "../MapStorageServer";
import { mapsManager } from "../MapsManager";
import { mapPathUsingUrl } from "../Services/PathMapper";

/**
 * The map-storage gRPC handler, run for real (the real MapsManager, with its lock, and the real commands) on a map kept
 * in memory. Only the file system is replaced. This is where the rules for what an employee may do on the map are
 * enforced: the browser can say anything, so every case here is a request that a modified browser could send.
 */

const { files } = vi.hoisted(() => {
    // What map-storage insists on, checked when its settings are first imported.
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
const MAP_KEY = mapPathUsingUrl(new URL(MAP_URL));

interface User {
    uuid: string;
    tags: string[];
    canEdit: boolean;
}
const alice: User = { uuid: "alice", tags: [], canEdit: false };
const bob: User = { uuid: "bob", tags: [], canEdit: false };
const carol: User = { uuid: "carol", tags: [], canEdit: false };
const admin: User = { uuid: "admin", tags: ["admin"], canEdit: true };

function desk(
    id: string,
    x: number,
    options: { ownerId?: string | null; mode?: "dynamic" | "static"; disabled?: boolean } = {},
): AreaData {
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
                id: `${id}-property`,
                type: "personalAreaPropertyData",
                accessClaimMode: options.mode ?? "dynamic",
                allowedTags: [],
                ownerId: options.ownerId ?? null,
                ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
            },
        ],
    };
}

const prefabRef = { id: "lamp", collectionName: "office" };

function seedMap(areas: AreaData[]): void {
    const wam: WAMFileFormat = {
        version: "1.0.0",
        mapUrl: "./map.tmj",
        entities: {
            "alice-lamp": { x: 10, y: 10, prefabRef },
            "bob-lamp": { x: 110, y: 10, prefabRef },
            "shared-plant": { x: 300, y: 300, prefabRef },
        },
        areas,
        entityCollections: [],
    };
    files.set(MAP_KEY, JSON.stringify(wam));
}

/** The default office: three free desks, and a plant on the shared floor. */
function seedDefaultMap(): void {
    seedMap([desk("desk-a", 0), desk("desk-b", 100), desk("desk-c", 200)]);
}

type EditMessage = NonNullable<NonNullable<EditMapCommandMessage["editMapMessage"]>["message"]>;

let nextCommandId = 0;
function send(user: User, message: EditMessage): Promise<EditMapCommandMessage> {
    return new Promise((resolve, reject) => {
        const request: EditMapCommandWithKeyMessage = {
            mapKey: MAP_URL,
            editMapCommandMessage: { id: `command-${++nextCommandId}`, editMapMessage: { message } },
            connectedUserTags: user.tags,
            userCanEdit: user.canEdit,
            userUUID: user.uuid,
        };
        mapStorageServer.handleEditMapCommandWithKeyMessage(
            { request } as ServerUnaryCall<never, never>,
            (error, value) => {
                if (error || !value) {
                    reject(error instanceof Error ? error : new Error("the handler gave no answer"));
                    return;
                }
                resolve(value);
            },
        );
    });
}

function refused(answer: EditMapCommandMessage): boolean {
    return answer.editMapMessage?.message?.$case === "errorCommandMessage";
}

function reasonOf(answer: EditMapCommandMessage): string | undefined {
    const message = answer.editMapMessage?.message;
    return message?.$case === "errorCommandMessage" ? message.errorCommandMessage.reason : undefined;
}

/** The map as the server holds it now. */
async function currentMap(): Promise<WAMFileFormat> {
    return (await mapsManager.getOrLoadWamFile(MAP_KEY)).getWam();
}

async function ownerOf(deskId: string): Promise<string | null | undefined> {
    const area = (await currentMap()).areas.find((candidate) => candidate.id === deskId);
    const property = area?.properties.find((candidate) => candidate.type === "personalAreaPropertyData");
    return property?.type === "personalAreaPropertyData" ? property.ownerId : undefined;
}

function claim(user: User, deskId: string): Promise<EditMapCommandMessage> {
    return setOwner(user, deskId, user.uuid);
}

function release(user: User, deskId: string): Promise<EditMapCommandMessage> {
    return setOwner(user, deskId, null);
}

async function setOwner(user: User, deskId: string, ownerId: string | null): Promise<EditMapCommandMessage> {
    const area = (await currentMap()).areas.find((candidate) => candidate.id === deskId);
    return send(user, {
        $case: "modifyAreaMessage",
        modifyAreaMessage: {
            id: deskId,
            modifyProperties: true,
            properties: (area?.properties ?? []).map((property) =>
                property.type === "personalAreaPropertyData" ? { ...property, ownerId } : property,
            ),
        },
    } as unknown as EditMessage);
}

function createEntity(
    user: User,
    id: string,
    x: number,
    y: number,
    width = 16,
    height = 16,
): Promise<EditMapCommandMessage> {
    return send(user, {
        $case: "createEntityMessage",
        createEntityMessage: {
            id,
            x,
            y,
            width,
            height,
            collectionName: prefabRef.collectionName,
            prefabId: prefabRef.id,
            properties: [],
        },
    } as unknown as EditMessage);
}

function modifyEntity(
    user: User,
    id: string,
    x: number,
    y: number,
    width = 16,
    height = 16,
): Promise<EditMapCommandMessage> {
    return send(user, {
        $case: "modifyEntityMessage",
        modifyEntityMessage: { id, x, y, width, height, properties: [], modifyProperties: false },
    } as unknown as EditMessage);
}

function deleteEntity(user: User, id: string): Promise<EditMapCommandMessage> {
    return send(user, { $case: "deleteEntityMessage", deleteEntityMessage: { id } });
}

beforeEach(() => {
    files.clear();
    nextCommandId = 0;
    seedDefaultMap();
});

afterEach(() => {
    // Forgets the map and stops its auto-save timer.
    mapsManager.clearAfterUpload(MAP_KEY);
});

describe("claiming a desk", () => {
    it("gives a free desk to the employee who claims it", async () => {
        const answer = await claim(alice, "desk-a");

        expect(refused(answer)).toBe(false);
        expect(await ownerOf("desk-a")).toBe("alice");
    });

    it("never gives the same desk to two employees claiming it at the same time", async () => {
        const claimers = [alice, bob, carol];
        const answers = await Promise.all(claimers.map((user) => claim(user, "desk-a")));

        expect(answers.filter((answer) => !refused(answer))).toHaveLength(1);
        // The one who got the desk is the one whose claim was accepted.
        const winner = claimers[answers.findIndex((answer) => !refused(answer))];
        expect(await ownerOf("desk-a")).toBe(winner.uuid);
        for (const answer of answers.filter(refused)) {
            expect(reasonOf(answer)).toMatch(/^DESK_TAKEN: /);
        }
    });

    it("never gives two desks to one employee who claims them at the same time", async () => {
        const answers = await Promise.all([claim(alice, "desk-a"), claim(alice, "desk-b"), claim(alice, "desk-c")]);

        expect(answers.filter((answer) => !refused(answer))).toHaveLength(1);
        const owners = await Promise.all(["desk-a", "desk-b", "desk-c"].map(ownerOf));
        expect(owners.filter((owner) => owner === "alice")).toHaveLength(1);
    });

    it("refuses a desk that another employee owns", async () => {
        await claim(bob, "desk-a");

        const answer = await claim(alice, "desk-a");

        expect(refused(answer)).toBe(true);
        expect(reasonOf(answer)).toMatch(/^DESK_TAKEN: /);
        expect(await ownerOf("desk-a")).toBe("bob");
    });

    it("refuses a second desk to an employee who already has one", async () => {
        await claim(alice, "desk-a");

        const answer = await claim(alice, "desk-b");

        expect(refused(answer)).toBe(true);
        expect(reasonOf(answer)).toMatch(/^DESK_ALREADY_OWNED: /);
        expect(await ownerOf("desk-b")).toBeNull();
    });

    it("lets an employee change desk by releasing the first one", async () => {
        await claim(alice, "desk-a");
        await release(alice, "desk-a");

        const answer = await claim(alice, "desk-b");

        expect(refused(answer)).toBe(false);
        expect(await ownerOf("desk-a")).toBeNull();
        expect(await ownerOf("desk-b")).toBe("alice");
    });

    it("refuses a desk that an administrator assigns", async () => {
        seedMap([desk("desk-a", 0, { mode: "static" })]);

        const answer = await claim(alice, "desk-a");

        expect(refused(answer)).toBe(true);
        expect(reasonOf(answer)).toMatch(/^DESK_NOT_CLAIMABLE: /);
        expect(await ownerOf("desk-a")).toBeNull();
    });

    it("refuses a desk that an administrator took out of service", async () => {
        seedMap([desk("desk-a", 0, { disabled: true })]);

        const answer = await claim(alice, "desk-a");

        expect(refused(answer)).toBe(true);
        expect(reasonOf(answer)).toMatch(/^DESK_DISABLED: /);
    });

    it("lets an administrator assign any desk to anyone, even one assigned by hand or out of service", async () => {
        seedMap([desk("desk-a", 0, { mode: "static", disabled: true })]);

        const answer = await setOwner(admin, "desk-a", "alice");

        expect(refused(answer)).toBe(false);
        expect(await ownerOf("desk-a")).toBe("alice");
    });
});

describe("releasing a desk", () => {
    it("lets the owner release their desk", async () => {
        await claim(alice, "desk-a");

        const answer = await release(alice, "desk-a");

        expect(refused(answer)).toBe(false);
        expect(await ownerOf("desk-a")).toBeNull();
    });

    it("refuses to release the desk of someone else", async () => {
        await claim(bob, "desk-a");

        const answer = await release(alice, "desk-a");

        expect(refused(answer)).toBe(true);
        expect(await ownerOf("desk-a")).toBe("bob");
    });

    it("refuses to hand a desk to someone else", async () => {
        await claim(alice, "desk-a");

        const answer = await setOwner(alice, "desk-a", "bob");

        expect(refused(answer)).toBe(true);
        expect(await ownerOf("desk-a")).toBe("alice");
    });
});

describe("the layout of the office", () => {
    it("refuses an employee who creates, deletes or moves an area, such as a new desk", async () => {
        const created = await send(alice, {
            $case: "createAreaMessage",
            createAreaMessage: {
                id: "new-desk",
                name: "new-desk",
                x: 0,
                y: 200,
                width: 64,
                height: 64,
                properties: [],
            },
        } as unknown as EditMessage);
        const deleted = await send(alice, { $case: "deleteAreaMessage", deleteAreaMessage: { id: "desk-b" } });
        const resized = await send(alice, {
            $case: "modifyAreaMessage",
            modifyAreaMessage: {
                id: "desk-a",
                x: 0,
                y: 0,
                width: 5000,
                height: 5000,
                modifyProperties: false,
                properties: [],
            },
        } as unknown as EditMessage);

        expect([created, deleted, resized].every(refused)).toBe(true);
        const map = await currentMap();
        expect(map.areas.map((area) => area.id)).toEqual(["desk-a", "desk-b", "desk-c"]);
        expect(map.areas[0].width).toBe(64);
    });

    it("refuses an employee who changes the settings or the metadata of the map", async () => {
        const settings = await send(alice, {
            $case: "updateWAMSettingsMessage",
            updateWAMSettingsMessage: { payload: { $case: "recording", recording: { enabled: true } } },
        } as unknown as EditMessage);
        const metadata = await send(alice, {
            $case: "modifiyWAMMetadataMessage",
            modifiyWAMMetadataMessage: { name: "Hacked" },
        } as unknown as EditMessage);

        expect(refused(settings)).toBe(true);
        expect(refused(metadata)).toBe(true);
    });

    it("lets an administrator edit the layout", async () => {
        const created = await send(admin, {
            $case: "createAreaMessage",
            createAreaMessage: {
                id: "new-desk",
                name: "new-desk",
                x: 0,
                y: 200,
                width: 64,
                height: 64,
                properties: [],
            },
        } as unknown as EditMessage);
        const deleted = await send(admin, { $case: "deleteAreaMessage", deleteAreaMessage: { id: "desk-c" } });

        expect(refused(created)).toBe(false);
        expect(refused(deleted)).toBe(false);
        expect((await currentMap()).areas.map((area) => area.id)).toEqual(["desk-a", "desk-b", "new-desk"]);
    });

    it("refuses uploads to an employee who can edit nothing on the map", async () => {
        const answer = await send(carol, {
            $case: "uploadFileMessage",
            uploadFileMessage: { id: "f1", name: "poster.png", file: new Uint8Array([1, 2, 3]) },
        } as unknown as EditMessage);

        expect(refused(answer)).toBe(true);
        expect(reasonOf(answer)).toMatch(/cannot edit anything on map/);
    });
});

describe("objects on a desk", () => {
    beforeEach(async () => {
        await claim(alice, "desk-a");
        await claim(bob, "desk-b");
    });

    it("lets an employee put an object in their own desk", async () => {
        const answer = await createEntity(alice, "new-lamp", 30, 30);

        expect(refused(answer)).toBe(false);
        expect((await currentMap()).entities["new-lamp"]).toBeDefined();
    });

    it("refuses an object in the desk of someone else", async () => {
        const answer = await createEntity(alice, "intruder", 130, 30);

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["intruder"]).toBeUndefined();
    });

    it("refuses an object on the shared floor of the office", async () => {
        const answer = await createEntity(alice, "intruder", 300, 300);

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["intruder"]).toBeUndefined();
    });

    it("refuses an object that declares a made-up size to get past the check", async () => {
        const zero = await createEntity(alice, "zero", 300, 300, 0, 0);
        const huge = await createEntity(alice, "huge", 300, 300, 1000, 1000);

        expect(refused(zero)).toBe(true);
        expect(refused(huge)).toBe(true);
        const entities = (await currentMap()).entities;
        expect(entities["zero"]).toBeUndefined();
        expect(entities["huge"]).toBeUndefined();
    });

    it("lets an employee move an object around in their own desk", async () => {
        const answer = await modifyEntity(alice, "alice-lamp", 30, 30);

        expect(refused(answer)).toBe(false);
        expect((await currentMap()).entities["alice-lamp"]).toMatchObject({ x: 30, y: 30 });
    });

    it("refuses to take an object of someone else into their own desk", async () => {
        const answer = await modifyEntity(alice, "bob-lamp", 30, 30);

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["bob-lamp"]).toMatchObject({ x: 110, y: 10 });
    });

    it("refuses to take a shared object into their own desk", async () => {
        const answer = await modifyEntity(alice, "shared-plant", 30, 30);

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["shared-plant"]).toMatchObject({ x: 300, y: 300 });
    });

    it("refuses to throw an object of theirs out of their desk", async () => {
        const answer = await modifyEntity(alice, "alice-lamp", 300, 300);

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["alice-lamp"]).toMatchObject({ x: 10, y: 10 });
    });

    it("lets an employee delete an object of their own desk", async () => {
        const answer = await deleteEntity(alice, "alice-lamp");

        expect(refused(answer)).toBe(false);
        expect((await currentMap()).entities["alice-lamp"]).toBeUndefined();
    });

    it("refuses to delete an object of someone else's desk", async () => {
        const answer = await deleteEntity(alice, "bob-lamp");

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["bob-lamp"]).toBeDefined();
    });

    it("refuses to delete a shared object of the office", async () => {
        const answer = await deleteEntity(alice, "shared-plant");

        expect(refused(answer)).toBe(true);
        expect((await currentMap()).entities["shared-plant"]).toBeDefined();
    });

    it("refuses to delete or change an object that does not exist, instead of announcing it as done", async () => {
        const deleted = await deleteEntity(alice, "ghost");
        const modified = await modifyEntity(alice, "ghost", 30, 30);

        expect(refused(deleted)).toBe(true);
        expect(refused(modified)).toBe(true);
    });

    it("refuses an employee without a desk everything about objects", async () => {
        const created = await createEntity(carol, "carol-lamp", 230, 30);
        const deleted = await deleteEntity(carol, "alice-lamp");

        expect(refused(created)).toBe(true);
        expect(refused(deleted)).toBe(true);
    });

    it("lets an administrator put, move and delete objects anywhere", async () => {
        const created = await createEntity(admin, "admin-lamp", 500, 500);
        const moved = await modifyEntity(admin, "bob-lamp", 600, 600);
        const deleted = await deleteEntity(admin, "shared-plant");

        expect([created, moved, deleted].some(refused)).toBe(false);
        const entities = (await currentMap()).entities;
        expect(entities["admin-lamp"]).toBeDefined();
        expect(entities["bob-lamp"]).toMatchObject({ x: 600, y: 600 });
        expect(entities["shared-plant"]).toBeUndefined();
    });

    it("loses the right to edit a desk once it is released", async () => {
        await release(alice, "desk-a");

        const answer = await createEntity(alice, "late-lamp", 30, 30);

        expect(refused(answer)).toBe(true);
    });
});

describe("what the other players are told", () => {
    it("does not announce a refused command to the other players, nor keep it for those who join later", async () => {
        await claim(bob, "desk-b");

        const refusedAnswer = await createEntity(alice, "intruder", 130, 30);

        expect(refused(refusedAnswer)).toBe(true);
        const queued = mapsManager.getCommandsNewerThan(MAP_KEY, undefined).map((command) => command.id);
        expect(queued).not.toContain(refusedAnswer.id);
    });

    it("announces an accepted command, and keeps it for those who join later", async () => {
        await claim(alice, "desk-a");

        const accepted = await createEntity(alice, "new-lamp", 30, 30);

        expect(refused(accepted)).toBe(false);
        expect(mapsManager.getCommandsNewerThan(MAP_KEY, undefined).map((command) => command.id)).toContain(
            accepted.id,
        );
    });
});
