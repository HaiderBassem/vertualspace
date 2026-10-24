/**
 * The Desk Manager's changes reach the Integration Center: a desk given or taken back becomes a "desk.assigned" or
 * "desk.released" event with its room, world and people, read from the database.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const emitted = vi.hoisted(() => [] as { organizationId: string; type: string; data: unknown }[]);
vi.mock("../src/lib/server/integrations/events", async (importOriginal) => {
    const original = await importOriginal<typeof import("../src/lib/server/integrations/events")>();
    return {
        ...original,
        emitDeskEvent: vi.fn((organizationId: string, type: string, data: unknown) => {
            emitted.push({ organizationId, type, data });
            return Promise.resolve({ eventId: null, deliveries: 0 });
        }),
    };
});

import { closeDb, db, schema } from "../src/lib/server/db/client";
import { connectDeskEventsToIntegrations } from "../src/lib/server/integrations/deskBridge";
import { onDeskChanged } from "../src/lib/server/services/deskEvents";

const SUFFIX = Date.now().toString(36);
let organizationId = "";
let worldId = "";
let roomId = "";
let adminId = "";
let disconnect: () => void = () => {};

async function waitForEvents(count: number): Promise<void> {
    for (let i = 0; i < 100 && emitted.length < count; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
}

beforeAll(async () => {
    const [org] = await db()
        .insert(schema.organizations)
        .values({ slug: `desk-bridge-${SUFFIX}`, name: "Desk bridge test" })
        .returning();
    organizationId = org!.id;
    const [workspace] = await db()
        .insert(schema.workspaces)
        .values({ organizationId, slug: "main", name: "Main" })
        .returning();
    const [world] = await db()
        .insert(schema.worlds)
        .values({ organizationId, workspaceId: workspace!.id, slug: "office", name: "Office" })
        .returning();
    worldId = world!.id;
    const [room] = await db()
        .insert(schema.rooms)
        .values({ worldId, slug: "floor-1", name: "Floor 1", mapKind: "wam", wamUrl: "https://maps.example/f1.wam" })
        .returning();
    roomId = room!.id;
    const [admin] = await db()
        .insert(schema.accounts)
        .values({ email: `desk-admin-${SUFFIX}@bridge.test`, name: "Ada Admin", passwordHash: "x" })
        .returning();
    adminId = admin!.id;
    await db()
        .insert(schema.accounts)
        .values({ email: `desk-owner-${SUFFIX}@bridge.test`, name: "Olga Owner", passwordHash: "x" });
    disconnect = connectDeskEventsToIntegrations();
});

afterAll(async () => {
    disconnect();
    await db().delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    await db()
        .delete(schema.accounts)
        .where(eq(schema.accounts.email, `desk-admin-${SUFFIX}@bridge.test`));
    await db()
        .delete(schema.accounts)
        .where(eq(schema.accounts.email, `desk-owner-${SUFFIX}@bridge.test`));
    await closeDb();
});

describe("Desk Manager → Integration Center", () => {
    const base = () => ({
        organizationId,
        worldId,
        roomId,
        deskId: "desk-1",
        deskName: "Desk 1",
        at: new Date().toISOString(),
        actorAccountId: adminId,
    });

    it("turns a desk given to someone into desk.assigned, with names from the database", async () => {
        emitted.length = 0;
        onDeskChanged({
            ...base(),
            type: "desk.assigned",
            ownerId: `DESK-OWNER-${SUFFIX}@bridge.test`,
            previousOwnerId: null,
        });
        await waitForEvents(1);
        expect(emitted).toEqual([
            {
                organizationId,
                type: "desk.assigned",
                data: {
                    desk: { id: "desk-1", name: "Desk 1" },
                    room: { id: roomId, name: "Floor 1" },
                    world: { id: worldId, slug: "office", name: "Office" },
                    person: expect.objectContaining({ name: "Olga Owner", email: `desk-owner-${SUFFIX}@bridge.test` }),
                    by: { name: "Ada Admin", email: `desk-admin-${SUFFIX}@bridge.test` },
                },
            },
        ]);
    });

    it("turns a desk taken back from someone who left into desk.released (left)", async () => {
        emitted.length = 0;
        onDeskChanged({
            ...base(),
            actorAccountId: null,
            type: "desk.released",
            previousOwnerId: "not-an-email",
            reason: "person_left",
        });
        await waitForEvents(1);
        expect(emitted[0]).toMatchObject({
            type: "desk.released",
            data: { person: { id: "not-an-email", name: null, email: null }, by: null, reason: "left" },
        });
    });

    it("keeps reservations to itself, and ignores rooms of another organization", async () => {
        emitted.length = 0;
        onDeskChanged({
            ...base(),
            type: "desk.reserved",
            reservation: {
                id: "r",
                userId: "x@bridge.test",
                start: "2026-11-02T08:00:00Z",
                end: "2026-11-02T17:00:00Z",
            },
        });
        onDeskChanged({
            ...base(),
            organizationId: "00000000-0000-0000-0000-000000000000",
            type: "desk.assigned",
            ownerId: "x@bridge.test",
            previousOwnerId: null,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(emitted).toEqual([]);
    });
});
