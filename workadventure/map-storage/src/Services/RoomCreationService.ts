import path from "path";
import { randomUUID } from "crypto";
import type { CreateRoomRequest, WAMFileFormat } from "@workadventure/map-editor";
import { copyRoom, createBlankRoom, WAMFileFormat as WAMFileFormatSchema } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import type { z } from "zod";
import { fileSystem } from "../fileSystem";
import { mapsManager } from "../MapsManager";
import type { MapListService } from "./MapListService";
import { resolveTiledMapKey } from "./MapResizeService";

export class RoomCreationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RoomCreationError";
    }
}

export interface NewRoomKeys {
    wamKey: string;
    tmjKey: string;
    /** mapUrl of the new WAM file. */
    mapUrl: string;
}

/** How many numbered names ("lounge", "lounge-2"...) are tried before giving up. */
const MAX_NAME_ATTEMPTS = 20;

/**
 * Where a new room made from the room stored at `wamKey` goes: next to it, with the same layout. Rooms stored as
 * "<room>/map.wam" (one directory per room, as AdminSpace does) get a sibling directory; other rooms get sibling
 * files. The name is made unique with a number when needed.
 */
export async function newRoomKeys(wamKey: string, name: string): Promise<NewRoomKeys> {
    const base = slugify(name);
    const oneDirectoryPerRoom = path.posix.basename(wamKey) === "map.wam";
    const parent = path.posix.dirname(oneDirectoryPerRoom ? path.posix.dirname(wamKey) : wamKey);
    const candidates = Array.from({ length: MAX_NAME_ATTEMPTS }, (_, index): NewRoomKeys => {
        const slug = index === 0 ? base : `${base}-${index + 1}`;
        return oneDirectoryPerRoom
            ? {
                  wamKey: path.posix.join(parent, slug, "map.wam"),
                  tmjKey: path.posix.join(parent, slug, "map.tmj"),
                  mapUrl: "./map.tmj",
              }
            : {
                  wamKey: path.posix.join(parent, `${slug}.wam`),
                  tmjKey: path.posix.join(parent, `${slug}.tmj`),
                  mapUrl: `./${slug}.tmj`,
              };
    });
    const taken = await Promise.all(
        candidates.map(async (keys) => (await fileSystem.exist(keys.wamKey)) || (await fileSystem.exist(keys.tmjKey))),
    );
    const free = taken.indexOf(false);
    if (free === -1) {
        throw new RoomCreationError(`There are already too many rooms named "${name}" here.`);
    }
    return candidates[free];
}

/**
 * Creates a room next to the room stored at `wamKey` (whose public URL is `wamUrl`), from a template (see
 * CreateRoomRequest in libs/map-editor). The caller holds the edition lock of that room.
 *
 * @returns the public URL of the WAM file of the new room
 */
export async function createStoredRoom(
    wamKey: string,
    wamUrl: URL,
    request: z.output<typeof CreateRoomRequest>,
    mapListService: Pick<MapListService, "updateWAMFileInCache">,
): Promise<{ wamUrl: string }> {
    const domain = wamUrl.hostname;
    const sourceWam: WAMFileFormat =
        mapsManager.getWamFile(wamKey)?.getWam() ??
        WAMFileFormatSchema.parse(wamFileMigration.migrate(JSON.parse(await fileSystem.readFileAsString(wamKey))));
    const sourceTmjKey = resolveTiledMapKey(wamKey, domain, sourceWam.mapUrl);
    let sourceMap: unknown;
    try {
        sourceMap = JSON.parse(await fileSystem.readFileAsString(sourceTmjKey));
    } catch {
        throw new RoomCreationError("The Tiled map of this room could not be read.");
    }
    if (!isTiledMap(sourceMap)) {
        throw new RoomCreationError("The Tiled map of this room is not a valid Tiled map.");
    }

    const keys = await newRoomKeys(wamKey, request.name);
    const options = {
        rebaseUrl: (url: string) => rebaseUrl(url, sourceTmjKey, keys.tmjKey),
        mapUrl: keys.mapUrl,
        wamVersion: wamFileMigration.getLatestVersion(),
        newId: () => randomUUID(),
    };
    const room =
        request.template === "copy"
            ? copyRoom(sourceMap, sourceWam, request, options)
            : createBlankRoom(sourceMap, sourceWam, request, options);
    const wam = WAMFileFormatSchema.parse(room.wam);

    await fileSystem.writeStringAsFile(keys.tmjKey, JSON.stringify(room.map));
    await fileSystem.writeStringAsFile(keys.wamKey, JSON.stringify(wam));
    // Lists the room in /maps and calls the webhook (an administration may register the room from it).
    await mapListService.updateWAMFileInCache(domain, keys.wamKey.replace(domain, ""), wam);

    const relativeWamPath = path.posix
        .relative(path.posix.dirname(wamKey), keys.wamKey)
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return { wamUrl: new URL(relativeWamPath, wamUrl).toString() };
}

function isTiledMap(value: unknown): value is ITiledMap {
    return ITiledMap.safeParse(value).success;
}

/** A URL relative to the source map, made relative to the new map. Absolute URLs (and data URLs) are kept. */
export function rebaseUrl(url: string, sourceTmjKey: string, newTmjKey: string): string {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/")) {
        return url;
    }
    const suffixStart = url.search(/[?#]/);
    const pathPart = suffixStart === -1 ? url : url.substring(0, suffixStart);
    const suffix = suffixStart === -1 ? "" : url.substring(suffixStart);
    let decoded = pathPart;
    try {
        decoded = decodeURI(pathPart);
    } catch {
        // Not valid percent-encoding: already literal.
    }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourceTmjKey), decoded));
    const relative = path.posix.relative(path.posix.dirname(newTmjKey), target);
    return encodeURI(relative) + suffix;
}

/** A file name from a room name: lowercase ASCII letters, digits and dashes. */
function slugify(name: string): string {
    const slug = name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 48)
        .replace(/-+$/g, "");
    return slug === "" ? "room" : slug;
}
