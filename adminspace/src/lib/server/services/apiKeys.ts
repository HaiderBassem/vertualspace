/**
 * Room API keys. WorkAdventure checks a key on every Room API call through
 * GET /api/room-api/authorization (src/lib/server/adminApi/handlers/platform.ts), which compares the
 * SHA-256 of the X-API-Key header with key_hash. The clear key is only returned at creation.
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomToken, sha256Hex } from "../crypto";
import { db, schema } from "../db/client";

export const ROOM_API_KEY_PREFIX = "wa_rk_";
/** Number of leading characters kept in clear to recognize a key in lists. */
export const ROOM_API_KEY_VISIBLE_LENGTH = 12;

export type RoomApiKey = typeof schema.roomApiKeys.$inferSelect;
export type RoomApiKeyStatus = "active" | "revoked" | "expired";

/** A new key: 256 random bits, its SHA-256 (stored) and its visible prefix (stored). */
export function generateRoomApiKey(): { key: string; hash: string; prefix: string } {
    const key = ROOM_API_KEY_PREFIX + randomToken(32);
    return { key, hash: sha256Hex(key), prefix: key.slice(0, ROOM_API_KEY_VISIBLE_LENGTH) };
}

export function roomApiKeyStatus(key: Pick<RoomApiKey, "revokedAt" | "expiresAt">, now = new Date()): RoomApiKeyStatus {
    if (key.revokedAt) return "revoked";
    if (key.expiresAt && key.expiresAt <= now) return "expired";
    return "active";
}

export async function createRoomApiKey(input: {
    organizationId: string;
    worldId: string | null;
    name: string;
    expiresAt: Date | null;
    createdBy: string;
}): Promise<{ row: RoomApiKey; key: string }> {
    const { key, hash, prefix } = generateRoomApiKey();
    const [row] = await db()
        .insert(schema.roomApiKeys)
        .values({ ...input, keyHash: hash, keyPrefix: prefix })
        .returning();
    if (!row) throw new Error("API key creation returned no row");
    return { row, key };
}

export function listRoomApiKeys(organizationId: string) {
    return db()
        .select({ key: schema.roomApiKeys, worldName: schema.worlds.name })
        .from(schema.roomApiKeys)
        .leftJoin(schema.worlds, eq(schema.worlds.id, schema.roomApiKeys.worldId))
        .where(eq(schema.roomApiKeys.organizationId, organizationId))
        .orderBy(desc(schema.roomApiKeys.createdAt));
}

export async function revokeRoomApiKey(organizationId: string, keyId: string): Promise<RoomApiKey | undefined> {
    const [row] = await db()
        .update(schema.roomApiKeys)
        .set({ revokedAt: new Date() })
        .where(
            and(
                eq(schema.roomApiKeys.id, keyId),
                eq(schema.roomApiKeys.organizationId, organizationId),
                isNull(schema.roomApiKeys.revokedAt),
            ),
        )
        .returning();
    return row;
}
