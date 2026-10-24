/**
 * Image inspection from the bytes themselves: the format comes from the file signature ("magic
 * numbers") and the size from the format's header, never from a declared content type or file name.
 * Only the raster formats WorkAdventure's map editor accepts are recognized (PNG, JPEG, WebP; see
 * libs/map-editor EntityUploadSupportedFormats). SVG is refused on purpose: it can carry scripts.
 */

export type ImageFormat = "png" | "jpeg" | "webp";

export interface ImageInfo {
    format: ImageFormat;
    contentType: `image/${ImageFormat}`;
    width: number;
    height: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngInfo(bytes: Buffer): ImageInfo | undefined {
    // Signature, then the IHDR chunk: length (4), "IHDR" (4), width (4), height (4).
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
    if (bytes.toString("latin1", 12, 16) !== "IHDR") return undefined;
    return { format: "png", contentType: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegInfo(bytes: Buffer): ImageInfo | undefined {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return undefined;
        const marker = bytes[offset + 1]!;
        // Start-of-frame markers (baseline, progressive, ...) carry the size; DHT/JPG/DAC do not.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return {
                format: "jpeg",
                contentType: "image/jpeg",
                height: bytes.readUInt16BE(offset + 5),
                width: bytes.readUInt16BE(offset + 7),
            };
        }
        offset += 2 + bytes.readUInt16BE(offset + 2);
    }
    return undefined;
}

function webpInfo(bytes: Buffer): ImageInfo | undefined {
    if (bytes.length < 30 || bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") {
        return undefined;
    }
    const chunk = bytes.toString("latin1", 12, 16);
    const info = (width: number, height: number): ImageInfo => ({
        format: "webp",
        contentType: "image/webp",
        width,
        height,
    });
    if (chunk === "VP8 ") return info(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
    if (chunk === "VP8L") {
        const b = bytes.readUInt32LE(21);
        return info((b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1);
    }
    if (chunk === "VP8X") return info(bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1);
    return undefined;
}

/** Format and size of an image, or undefined when the bytes are not a supported raster image. */
export function inspectImage(bytes: Buffer): ImageInfo | undefined {
    const info = pngInfo(bytes) ?? jpegInfo(bytes) ?? webpInfo(bytes);
    if (!info || info.width < 1 || info.height < 1) return undefined;
    return info;
}
