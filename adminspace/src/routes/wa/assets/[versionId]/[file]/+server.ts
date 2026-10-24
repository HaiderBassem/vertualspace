import type { RequestHandler } from "./$types";
import { isUuid } from "$lib/server/http/forms";
import { publishedAsset } from "$lib/server/catalog/store";

/**
 * Files of published component versions (entity images, previews), addressed by version and content
 * hash: immutable, so cached for a year. Served only when the file belongs to that published version,
 * so the store cannot be probed by hash. Loaded cross-origin by WorkAdventure players' browsers.
 */
export const GET: RequestHandler = async ({ params }) => {
    const headers = {
        "access-control-allow-origin": "*",
        "cross-origin-resource-policy": "cross-origin",
        "x-content-type-options": "nosniff",
        // Opened directly, a file is inert: no script, no plugin, no framing.
        "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    };
    const match = /^([0-9a-f]{64})\.(png|jpg|webp|json|bin)$/.exec(params.file);
    if (!isUuid(params.versionId) || !match) return new Response("Not found", { status: 404, headers });
    const asset = await publishedAsset(params.versionId, match[1]!);
    if (!asset) return new Response("Not found", { status: 404, headers });
    return new Response(new Uint8Array(asset.data), {
        headers: {
            ...headers,
            "content-type": asset.contentType,
            "cache-control": "public, max-age=31536000, immutable",
            etag: `"${match[1]}"`,
        },
    });
};
