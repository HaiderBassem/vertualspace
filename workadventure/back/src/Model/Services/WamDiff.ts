import { isDeepStrictEqual } from "util";
import type { WAMFileFormat } from "@workadventure/map-editor";
import type { EditMapMessage } from "@workadventure/messages";

export type EditMapPayload = NonNullable<EditMapMessage["message"]>;

export interface WamDiff {
    /** The edits that turn the current map into the new one, in an order that can be applied one after the other. */
    messages: EditMapPayload[];
    /**
     * The new map differs in ways no edit can carry (its picture, settings, metadata, furniture collections): the
     * players have to load it again.
     */
    needsReload: boolean;
}

/**
 * The edits between the map a room has in memory and the map as it is now stored, when it was changed from outside the
 * game (an administration tool patching the WAM file, a script, an upload). Applying them as ordinary edits keeps the
 * players where they are: the desk given to someone shows it at once, a removed chair disappears, and so on.
 */
export function diffWam(current: WAMFileFormat, next: WAMFileFormat): WamDiff {
    const needsReload =
        current.mapUrl !== next.mapUrl ||
        !isDeepStrictEqual(current.settings ?? {}, next.settings ?? {}) ||
        !isDeepStrictEqual(current.metadata ?? {}, next.metadata ?? {}) ||
        !isDeepStrictEqual(current.entityCollections, next.entityCollections);

    const messages: EditMapPayload[] = [];

    // Areas, matched by id.
    const nextAreas = new Map(next.areas.map((area) => [area.id, area]));
    const currentAreaIds = new Set(current.areas.map((area) => area.id));
    for (const area of current.areas) {
        if (!nextAreas.has(area.id)) {
            messages.push({ $case: "deleteAreaMessage", deleteAreaMessage: { id: area.id } });
        }
    }
    for (const area of current.areas) {
        const updated = nextAreas.get(area.id);
        if (!updated || isDeepStrictEqual(area, updated)) continue;
        messages.push({
            $case: "modifyAreaMessage",
            modifyAreaMessage: {
                id: updated.id,
                name: updated.name,
                x: updated.x,
                y: updated.y,
                width: updated.width,
                height: updated.height,
                properties: updated.properties,
                modifyProperties: true,
                modifyServerData: undefined,
            },
        });
    }
    for (const area of next.areas) {
        if (currentAreaIds.has(area.id)) continue;
        messages.push({
            $case: "createAreaMessage",
            createAreaMessage: {
                id: area.id,
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
                name: area.name,
                properties: area.properties,
            },
        });
    }

    // Objects, matched by key. An object whose piece of furniture changed is removed and placed again.
    for (const [id, entity] of Object.entries(current.entities)) {
        const updated = next.entities[id];
        if (!updated || !isDeepStrictEqual(entity.prefabRef, updated.prefabRef)) {
            messages.push({ $case: "deleteEntityMessage", deleteEntityMessage: { id } });
        }
    }
    for (const [id, updated] of Object.entries(next.entities)) {
        const entity = current.entities[id];
        if (entity && isDeepStrictEqual(entity.prefabRef, updated.prefabRef)) {
            if (isDeepStrictEqual(entity, updated)) continue;
            messages.push({
                $case: "modifyEntityMessage",
                modifyEntityMessage: {
                    id,
                    x: updated.x,
                    y: updated.y,
                    properties: updated.properties ?? [],
                    modifyProperties: true,
                    name: updated.name,
                    width: 0,
                    height: 0,
                },
            });
            continue;
        }
        messages.push({
            $case: "createEntityMessage",
            createEntityMessage: {
                id,
                x: updated.x,
                y: updated.y,
                collectionName: updated.prefabRef.collectionName,
                prefabId: updated.prefabRef.id,
                properties: updated.properties ?? [],
                name: updated.name,
                width: 0,
                height: 0,
            },
        });
    }

    return { messages, needsReload };
}

/**
 * Whether two addresses of WAM files name the same file of map-storage. Map-storage is reached at an internal address
 * by the tools that change it and at a public one (often under a path prefix) by the players, so the addresses are
 * compared by the path of the file, after the public prefix.
 */
export function isSameStoredWam(roomWamUrl: string, notifiedWamUrl: string, publicPrefix: string | undefined): boolean {
    const pathOf = (url: string, prefix?: string): string | undefined => {
        let pathname: string;
        try {
            pathname = decodeURIComponent(new URL(url).pathname);
        } catch {
            return undefined;
        }
        const normalizedPrefix = prefix ? prefix.replace(/\/+$/, "") : "";
        if (normalizedPrefix && pathname.startsWith(`${normalizedPrefix}/`)) {
            pathname = pathname.slice(normalizedPrefix.length);
        }
        return pathname.replace(/^\/+/, "");
    };
    if (roomWamUrl === notifiedWamUrl) return true;
    const roomPath = pathOf(roomWamUrl, publicPrefix);
    const notifiedPath = pathOf(notifiedWamUrl, publicPrefix);
    return roomPath !== undefined && roomPath !== "" && roomPath === notifiedPath;
}
