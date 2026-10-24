import path from "path";
import type { MapResizeReport, MapResizeRequest, WAMFileFormat } from "@workadventure/map-editor";
import { MapResizeError, resizeMap, WAMFileFormat as WAMFileFormatSchema } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import type { ResizeMapResultMessage } from "@workadventure/messages";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { fileSystem } from "../fileSystem";
import { mapsManager } from "../MapsManager";
import type { MapListService } from "./MapListService";
import { mapPathUsingDomain } from "./PathMapper";

export interface StoredMapResize {
    report: MapResizeReport;
    /** The resized WAM file (also written to storage unless it was a dry run). */
    wam: WAMFileFormat;
}

/**
 * Resizes a map stored in map-storage: its Tiled map and its WAM file, through resizeMap (libs/map-editor).
 *
 * The caller must hold the edition lock of the WAM file (mapsManager.waitForLock): the WAM file is read from memory
 * when it is loaded (it may hold edits not saved yet), and is dropped from memory once both files are written, along
 * with its command queue, so that no older command is replayed on top of the resized map.
 *
 * @param wamKey the storage key of the WAM file (see PathMapper)
 * @param wamPath the path of the WAM file in its domain, as listed by the /maps endpoint
 * @throws MapResizeError when the map cannot be resized (the caller should report it to the user)
 */
export async function resizeStoredMap(
    wamKey: string,
    domain: string,
    wamPath: string,
    request: MapResizeRequest,
    mapListService: Pick<MapListService, "updateWAMFileInCache">,
    options: { dryRun?: boolean } = {},
): Promise<StoredMapResize> {
    const wam = mapsManager.getWamFile(wamKey)?.getWam() ?? (await readWamFile(wamKey));
    const tmjKey = resolveTiledMapKey(wamKey, domain, wam.mapUrl);

    let tiledMap: unknown;
    try {
        tiledMap = JSON.parse(await fileSystem.readFileAsString(tmjKey));
    } catch {
        throw new MapResizeError(`The Tiled map "${wam.mapUrl}" of this room could not be read.`);
    }
    // Only validated: the original object is resized so that properties the schema does not know are kept.
    if (!isTiledMap(tiledMap)) {
        throw new MapResizeError(`The Tiled map "${wam.mapUrl}" of this room is not a valid Tiled map.`);
    }

    const result = resizeMap(tiledMap, wam, request);
    if (!result.wam) {
        throw new Error("resizeMap did not return the resized WAM file");
    }
    const resizedWam = WAMFileFormatSchema.parse(result.wam);

    if (!options.dryRun) {
        await fileSystem.writeStringAsFile(tmjKey, JSON.stringify(result.map));
        await fileSystem.writeStringAsFile(wamKey, JSON.stringify(resizedWam));
        mapsManager.clearAfterUpload(wamKey);
        await mapListService.updateWAMFileInCache(domain, wamPath, resizedWam);
    }

    return { report: result.report, wam: resizedWam };
}

/** The result part of a ResizeMapMessage, as sent to the back and the clients. */
export function toResizeMapResultMessage(report: MapResizeReport): ResizeMapResultMessage {
    return {
        oldWidth: report.oldWidth,
        oldHeight: report.oldHeight,
        tileWidth: report.tileWidth,
        tileHeight: report.tileHeight,
        columns: report.columns,
        rows: report.rows,
        displacedEntities: report.displacedEntities,
        displacedAreas: report.displacedAreas,
    };
}

function isTiledMap(value: unknown): value is ITiledMap {
    return ITiledMap.safeParse(value).success;
}

async function readWamFile(wamKey: string): Promise<WAMFileFormat> {
    return WAMFileFormatSchema.parse(wamFileMigration.migrate(JSON.parse(await fileSystem.readFileAsString(wamKey))));
}

/**
 * The storage key of the Tiled map of a WAM file. Only maps stored next to their WAM file, in the same domain, can
 * be resized: a map loaded from another server is not ours to change.
 */
export function resolveTiledMapKey(wamKey: string, domain: string, mapUrl: string): string {
    if (/^[a-z][a-z0-9+.-]*:/i.test(mapUrl) || mapUrl.startsWith("/")) {
        throw new MapResizeError(
            "The Tiled map of this room is not stored next to it in map-storage, so it cannot be resized here.",
        );
    }
    // Decoded segment by segment (like decodeStoragePath) but keeping ".." segments: the result is checked below.
    const segments = mapUrl
        .split(/[?#]/)[0]
        .split("/")
        .map((segment) => {
            let decoded = segment;
            try {
                decoded = decodeURIComponent(segment);
            } catch {
                // Not valid percent-encoding: the segment is already literal.
            }
            if (decoded.includes("/") || decoded.includes("\\")) {
                throw new MapResizeError("The address of the Tiled map of this room is not valid.");
            }
            return decoded;
        });
    const tmjKey = path.posix.normalize(path.posix.join(path.posix.dirname(wamKey), ...segments));
    const domainRoot = mapPathUsingDomain("", domain);
    if (tmjKey.startsWith("..") || (domainRoot !== "" && !tmjKey.startsWith(domainRoot))) {
        throw new MapResizeError("The Tiled map of this room is outside of its world, so it cannot be resized.");
    }
    return tmjKey;
}
