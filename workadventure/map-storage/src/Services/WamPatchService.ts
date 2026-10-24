import jsonpatch from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { ZodIssue } from "zod";
import { WAMFileFormat } from "@workadventure/map-editor";
import type { WamFile } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";

/** What the patch needs from the rest of map-storage. The real ones are the file system and the MapsManager. */
export interface WamPatchDependencies {
    fileSystem: {
        readFileAsString(virtualPath: string): Promise<string>;
        writeStringAsFile(virtualPath: string, content: string): Promise<void>;
    };
    /** The maps that players are editing right now, kept in memory and saved to the file every few seconds. */
    liveMaps: {
        getWamFile(key: string): WamFile | undefined;
        clearAfterUpload(key: string): void;
        waitForLock(key: string, callback: () => Promise<void>): Promise<void>;
    };
    /** Checks that a WAM file is valid, with the checks of the upload (and the resources it points to). */
    validateWam(content: string): { ok: true; value: WAMFileFormat } | { ok: false; issues: ZodIssue[] };
}

export type WamPatchResult =
    | { status: "ok"; wam: WAMFileFormat }
    /** The patch is not a JSON Patch, or does not apply to this file. */
    | { status: "badPatch"; message: string }
    /** The patch gives a file that is not a valid WAM file. Nothing was changed. */
    | { status: "invalidWam"; issues: ZodIssue[] };

/**
 * Applies a JSON Patch to the stored WAM file of a map.
 *
 * Players edit a map in memory, and map-storage only saves it to the file every few seconds. A patch that worked from
 * the file alone would therefore erase what players did in the last seconds, and the next save could in turn erase the
 * patch. So, in the lock that the players' edits take as well:
 *   1. the map in memory is first saved to the file, so the patch starts from what players see;
 *   2. the patch is applied and the result saved;
 *   3. the map in memory is dropped, since it is out of date now: the next edit loads the patched file.
 */
export async function patchStoredWam(
    dependencies: WamPatchDependencies,
    virtualPath: string,
    operations: unknown,
): Promise<WamPatchResult> {
    if (!Array.isArray(operations)) {
        return {
            status: "badPatch",
            message: "Invalid patch: expected a JSON-Patch document (an array of operations)",
        };
    }

    let result: WamPatchResult | undefined;
    await dependencies.liveMaps.waitForLock(virtualPath, async () => {
        const liveMap = dependencies.liveMaps.getWamFile(virtualPath);
        if (liveMap) {
            await dependencies.fileSystem.writeStringAsFile(virtualPath, JSON.stringify(liveMap.getWam()));
        }

        const content = WAMFileFormat.parse(
            wamFileMigration.migrate(JSON.parse(await dependencies.fileSystem.readFileAsString(virtualPath))),
        );
        // Let's make things easy: if "vendor" or "metadata" is not defined, let's add an empty object.
        content.vendor ??= {};
        content.metadata ??= {};

        // `validateOperation = true` makes fast-json-patch validate every operation and refuse to resolve a JSON
        // Pointer through an inherited (prototype) property, so a patch cannot reach shared, process-wide state instead
        // of the map document. `mutateDocument = false` returns a fresh document and leaves `content` untouched;
        // prototype modifications are banned by default. The operations are entirely client-supplied, so any failure
        // applying them is a bad request, not a server error.
        let patchedContent: WAMFileFormat;
        try {
            patchedContent = jsonpatch.applyPatch(content, operations as Operation[], true, false).newDocument;
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Failed to apply patch on WAM file:`, e);
            result = { status: "badPatch", message: e instanceof Error ? e.message : "Invalid patch" };
            return;
        }

        const patchedContentString = JSON.stringify(patchedContent);
        const validation = dependencies.validateWam(patchedContentString);
        if (!validation.ok) {
            result = { status: "invalidWam", issues: validation.issues };
            return;
        }

        await dependencies.fileSystem.writeStringAsFile(virtualPath, patchedContentString);
        dependencies.liveMaps.clearAfterUpload(virtualPath);
        result = { status: "ok", wam: validation.value };
    });

    if (result === undefined) {
        throw new Error(`The patch of ${virtualPath} did not run`);
    }
    return result;
}
