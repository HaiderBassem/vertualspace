/**
 * POST /api/room/rename: an administrator renames a room from inside WorkAdventure's map editor.
 *
 * The pusher has already checked that the browser holds a valid player token; the permission is checked again here,
 * from the person's account and the room's workspace (`room.manage`), never from what the browser claims.
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../../audit";
import { organizationAccess } from "../../auth/rbac";
import { db, schema } from "../../db/client";
import { json } from "../../http/problem";
import { resolvePlayUri } from "../../services/worlds";
import { readJson, type ApiContext } from "../router";

const RenameRoom = z.object({
    roomUrl: z.string().min(1).max(2048),
    userIdentifier: z.string().min(1).max(320),
    name: z.string().trim().min(1).max(200),
});

export async function postRenameRoom({ request, clientIp }: ApiContext): Promise<Response> {
    const body = RenameRoom.safeParse(await readJson(request));
    if (!body.success) return json({ status: "error", message: "Invalid body" }, { status: 400 });
    const { roomUrl, userIdentifier, name } = body.data;

    const resolved = await resolvePlayUri(roomUrl);
    if (resolved.kind !== "room") return json({ status: "error", message: "Room not found" }, { status: 404 });
    const { context, room } = resolved;

    const account = await db().query.accounts.findFirst({
        where: and(
            sql`lower(${schema.accounts.email}) = ${userIdentifier.toLowerCase()}`,
            eq(schema.accounts.status, "active"),
        ),
    });
    if (!account) return json({ status: "error", message: "Forbidden" }, { status: 403 });

    let allowed = false;
    try {
        const access = await organizationAccess(account, context.organization.slug);
        allowed = access.can("room.manage", { workspaceId: context.world.workspaceId });
    } catch {
        allowed = false;
    }
    if (!allowed) return json({ status: "error", message: "Forbidden" }, { status: 403 });

    const [updated] = await db()
        .update(schema.rooms)
        .set({ name })
        .where(and(eq(schema.rooms.worldId, context.world.id), eq(schema.rooms.id, room.id)))
        .returning({ id: schema.rooms.id, name: schema.rooms.name });
    if (!updated) return json({ status: "error", message: "Room not found" }, { status: 404 });

    await audit({
        action: "room.update",
        account,
        organizationId: context.organization.id,
        worldId: context.world.id,
        targetType: "room",
        targetId: room.id,
        ipAddress: clientIp ?? null,
        details: { from: room.name, to: updated.name, via: "workadventure" },
    });
    return json({ status: "ok", name: updated.name });
}
