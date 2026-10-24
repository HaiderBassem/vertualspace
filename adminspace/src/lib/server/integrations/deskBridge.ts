import { and, eq } from "drizzle-orm";
import { db } from "$lib/server/db/client";
import { accounts, rooms, worlds } from "$lib/server/db/schema";
import type { DeskEvent } from "$lib/server/services/deskEvents";
import { setDeskEventListener } from "$lib/server/services/deskEvents";
import type { DeskReleaseReason, EventActor, EventPerson } from "./events";
import { emitDeskEvent } from "./events";

/**
 * Sends the Desk Manager's changes to the Integration Center: a desk given to someone ("desk.assigned") or taken back
 * ("desk.released") reaches the endpoints subscribed to it (Slack, Teams, Discord, webhooks...). Reservations stay inside
 * AdminSpace for now. A failure here never undoes nor blocks the desk change: deskEvents logs it.
 */
export function connectDeskEventsToIntegrations(): () => void {
    return setDeskEventListener(async (event) => {
        if (event.type !== "desk.assigned" && event.type !== "desk.released") return;
        const place = await placeOf(event);
        if (!place) return;
        const desk = { id: event.deskId, name: event.deskName };
        const by = await actorOf(event.actorAccountId);
        if (event.type === "desk.assigned") {
            await emitDeskEvent(event.organizationId, "desk.assigned", {
                desk,
                ...place,
                person: await personOf(event.ownerId),
                by,
            });
            return;
        }
        await emitDeskEvent(event.organizationId, "desk.released", {
            desk,
            ...place,
            person: await personOf(event.previousOwnerId),
            by,
            reason: RELEASE_REASONS[event.reason],
        });
    });
}

const RELEASE_REASONS: Record<Extract<DeskEvent, { type: "desk.released" }>["reason"], DeskReleaseReason> = {
    administrator: "released",
    type_changed: "released",
    person_left: "left",
};

async function placeOf(event: DeskEvent) {
    const [row] = await db()
        .select({
            roomId: rooms.id,
            roomName: rooms.name,
            worldId: worlds.id,
            worldSlug: worlds.slug,
            worldName: worlds.name,
        })
        .from(rooms)
        .innerJoin(worlds, eq(worlds.id, rooms.worldId))
        .where(and(eq(rooms.id, event.roomId), eq(worlds.organizationId, event.organizationId)))
        .limit(1);
    if (!row) return undefined;
    return {
        room: { id: row.roomId, name: row.roomName },
        world: { id: row.worldId, slug: row.worldSlug, name: row.worldName },
    };
}

/** A desk owner is known by their WorkAdventure identifier: the email of a signed-in person. */
async function personOf(ownerId: string): Promise<EventPerson> {
    const email = ownerId.includes("@") ? ownerId.toLowerCase() : null;
    if (!email) return { id: ownerId, name: null, email: null };
    const [account] = await db()
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(eq(accounts.email, email))
        .limit(1);
    return { id: account?.id ?? ownerId, name: account?.name ?? null, email };
}

async function actorOf(accountId: string | null): Promise<EventActor | null> {
    if (!accountId) return null;
    const [account] = await db()
        .select({ name: accounts.name, email: accounts.email })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
    return account ? { name: account.name ?? account.email, email: account.email } : null;
}
