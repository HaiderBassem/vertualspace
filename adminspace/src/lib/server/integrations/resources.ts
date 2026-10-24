/**
 * Boards and pages of the organization's productivity tools (Notion, Trello, Miro), listed so administrators can place
 * them in rooms (WorkAdventure "open a website" objects). Read on demand with the organization's connection, cached
 * one minute in this process.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { withAccessToken, type Connection } from "./connections";
import { ProviderError, type ProviderErrorCode } from "./http";
import { listMiroBoards } from "./providers/miro";
import { listNotionPages } from "./providers/notion";
import { listTrelloBoards } from "./providers/trello";
import type { ExternalResource } from "./types";

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; resources: ExternalResource[] }>();

export function hasResources(provider: string): provider is "notion" | "trello" | "miro" {
    return provider === "notion" || provider === "trello" || provider === "miro";
}

export async function listResources(
    connection: Connection,
    untitled: string,
    now = Date.now(),
): Promise<{ ok: true; resources: ExternalResource[] } | { ok: false; problem: ProviderErrorCode | "unexpected" }> {
    if (!hasResources(connection.provider)) return { ok: true, resources: [] };
    const cached = cache.get(connection.id);
    if (cached && now - cached.at < TTL_MS) return { ok: true, resources: cached.resources };
    try {
        const resources = await withAccessToken(connection, (token) => {
            if (connection.provider === "notion") return listNotionPages(token, untitled);
            if (connection.provider === "trello") return listTrelloBoards(token, untitled);
            return listMiroBoards(token, untitled);
        });
        cache.set(connection.id, { at: now, resources });
        await db()
            .update(schema.integrationConnections)
            .set({ lastSyncAt: new Date(now), lastError: null })
            .where(eq(schema.integrationConnections.id, connection.id));
        return { ok: true, resources };
    } catch (error) {
        return { ok: false, problem: error instanceof ProviderError ? error.code : "unexpected" };
    }
}

export function forgetResources(connectionId: string): void {
    cache.delete(connectionId);
}
