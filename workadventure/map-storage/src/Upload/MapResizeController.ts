import type { Express } from "express";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { MapResizeError, MapResizeRequest } from "@workadventure/map-editor";
import { passportAuthenticator } from "../Services/Authentication";
import { resizeStoredMap, toResizeMapResultMessage } from "../Services/MapResizeService";
import { getRequestDomain, mapPathUsingUrl } from "../Services/PathMapper";
import { uploadDetector } from "../Services/UploadDetector";
import { mapsManager } from "../MapsManager";
import type { MapListService } from "../Services/MapListService";
import type { FileSystemInterface } from "./FileSystemInterface";

const ResizeBody = MapResizeRequest.extend({
    /** The public URL of the WAM file, as WorkAdventure loads it (e.g. https://example.com/map-storage/office.wam). */
    wamUrl: z.string().url(),
    /** Computes the result without changing anything: for previews. */
    dryRun: z.boolean().default(false),
});

/**
 * POST /resize: resizes a map (its Tiled map and its WAM file). See resizeMap in libs/map-editor.
 *
 * The people in the room are moved with the map: the backs replay the resize as a resizeMapMessage edit command.
 */
export class MapResizeController {
    constructor(
        private app: Express,
        private fileSystem: FileSystemInterface,
        private mapListService: MapListService,
    ) {
        this.app.post("/resize", passportAuthenticator, (req, res, next) => {
            (async () => {
                const body = ResizeBody.safeParse(req.body);
                if (!body.success) {
                    res.status(400).json({ error: "Invalid request", issues: body.error.issues });
                    return;
                }
                const { wamUrl, dryRun, ...request } = body.data;

                const url = new URL(wamUrl);
                // A token is only valid for its own world: the WAM file must belong to the domain of the request.
                if (url.hostname !== getRequestDomain(req).split(":")[0] || !url.pathname.endsWith(".wam")) {
                    res.status(400).json({ error: "The WAM URL does not belong to this map-storage domain." });
                    return;
                }
                let wamKey: string;
                try {
                    wamKey = mapPathUsingUrl(url);
                } catch {
                    res.status(400).json({ error: "Invalid WAM URL" });
                    return;
                }
                if (!(await this.fileSystem.exist(wamKey))) {
                    res.status(404).json({ error: "No such map" });
                    return;
                }

                try {
                    await mapsManager.waitForLock(wamKey, async () => {
                        const { report } = await resizeStoredMap(
                            wamKey,
                            url.hostname,
                            wamKey.replace(url.hostname, ""),
                            request,
                            this.mapListService,
                            { dryRun },
                        );
                        if (!dryRun) {
                            uploadDetector
                                .notifyResized(wamUrl, {
                                    width: request.width,
                                    height: request.height,
                                    anchor: request.anchor,
                                    fill: request.fill,
                                    result: toResizeMapResultMessage(report),
                                })
                                .catch((e: unknown) => {
                                    console.error(`[${new Date().toISOString()}] Could not notify the backs`, e);
                                    Sentry.captureException(e);
                                });
                        }
                        res.json({ dryRun, report });
                    });
                } catch (e) {
                    if (e instanceof MapResizeError) {
                        res.status(422).json({ error: e.message });
                        return;
                    }
                    throw e;
                }
            })().catch((e: unknown) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }
}
