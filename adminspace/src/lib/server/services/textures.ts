/**
 * Avatar catalog: Woka textures and companions, served to WorkAdventure as WokaList and
 * CompanionTextureCollection[] (contract: JsonMessages/PlayerTextures and CompanionTextures).
 *
 * URLs are stored as WorkAdventure's catalog writes them: relative URLs ("resources/...") are resolved
 * by the WorkAdventure front against its own origin.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { CompanionDetail, CompanionTextureCollection, WokaDetail, WokaList } from "../../contract/workadventure";

/** Parts a Woka must have, as in WorkAdventure's default catalog (play/src/pusher/data/woka.json). */
export const REQUIRED_WOKA_PARTS = new Set(["body", "eyes", "accessory"]);

export async function buildWokaList(): Promise<WokaList> {
    const rows = await db()
        .select({ collection: schema.wokaCollections, texture: schema.wokaTextures })
        .from(schema.wokaTextures)
        .innerJoin(schema.wokaCollections, eq(schema.wokaCollections.id, schema.wokaTextures.collectionId))
        .where(eq(schema.wokaTextures.enabled, true))
        .orderBy(asc(schema.wokaCollections.position), asc(schema.wokaTextures.position));

    const list: WokaList = {};
    for (const { collection, texture } of rows) {
        const part = (list[collection.part] ??= {
            collections: [],
            ...(REQUIRED_WOKA_PARTS.has(collection.part) ? { required: true } : {}),
        });
        let target = part.collections.find((c) => c.name === collection.name);
        if (!target) {
            target = { name: collection.name, textures: [] };
            part.collections.push(target);
        }
        target.textures.push({
            id: texture.id,
            name: texture.name,
            url: texture.url,
            ...(texture.tintable ? { tintable: true } : {}),
        });
    }
    return list;
}

export async function buildCompanionList(): Promise<CompanionTextureCollection[]> {
    const rows = await db()
        .select({ collection: schema.companionCollections, texture: schema.companionTextures })
        .from(schema.companionTextures)
        .innerJoin(
            schema.companionCollections,
            eq(schema.companionCollections.id, schema.companionTextures.collectionId),
        )
        .where(eq(schema.companionTextures.enabled, true))
        .orderBy(asc(schema.companionCollections.position), asc(schema.companionTextures.position));

    const collections: CompanionTextureCollection[] = [];
    for (const { collection, texture } of rows) {
        let target = collections.find((c) => c.name === collection.name);
        if (!target) {
            target = { name: collection.name, textures: [] };
            collections.push(target);
        }
        target.textures.push({
            id: texture.id,
            name: texture.name,
            url: texture.url,
            ...(texture.behavior ? { behavior: texture.behavior } : {}),
        });
    }
    return collections;
}

/**
 * Resolves the textures a player chose. Returns undefined when one of them is unknown or disabled,
 * or when a required part is missing, which makes WorkAdventure send the player back to the Woka
 * selection screen (isCharacterTexturesValid = false).
 */
export async function resolveWokaTextures(ids: string[]): Promise<WokaDetail[] | undefined> {
    if (ids.length === 0) return undefined;
    const rows = await db()
        .select({ id: schema.wokaTextures.id, url: schema.wokaTextures.url, part: schema.wokaCollections.part })
        .from(schema.wokaTextures)
        .innerJoin(schema.wokaCollections, eq(schema.wokaCollections.id, schema.wokaTextures.collectionId))
        .where(and(inArray(schema.wokaTextures.id, ids), eq(schema.wokaTextures.enabled, true)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (ids.some((id) => !byId.has(id))) return undefined;

    // A full Woka ("woka" part) stands alone; a customized one must contain every required part.
    const parts = new Set<string>(rows.map((r) => r.part));
    if (!parts.has("woka") && [...REQUIRED_WOKA_PARTS].some((part) => !parts.has(part))) {
        return undefined;
    }
    return ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [{ id: row.id, url: row.url }] : [];
    });
}

export async function resolveCompanionTexture(id: string): Promise<CompanionDetail | undefined> {
    const texture = await db().query.companionTextures.findFirst({
        where: and(eq(schema.companionTextures.id, id), eq(schema.companionTextures.enabled, true)),
    });
    return texture ? { id: texture.id, url: texture.url } : undefined;
}
