/**
 * A tiny raster canvas for drawing AdminSpace's original pixel-art components, and a PNG encoder
 * (RFC 2083: 8-bit RGBA, filter 0, zlib). Pixel art is drawn with hard edges only: no antialiasing.
 */
import { crc32, deflateSync } from "node:zlib";

export type Color = string; // "#rrggbb" or "#rrggbbaa"

function parse(color: Color): [number, number, number, number] {
    const hex = color.replace("#", "");
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
    ];
}

/** Mixes a color toward white (amount > 0) or black (amount < 0), -1..1. */
export function shade(color: Color, amount: number): Color {
    const [r, g, b, a] = parse(color);
    const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
    const hex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${hex(mix(r))}${hex(mix(g))}${hex(mix(b))}${a === 255 ? "" : hex(a)}`;
}

export class Canvas {
    readonly data: Uint8Array;

    constructor(
        readonly width: number,
        readonly height: number,
    ) {
        this.data = new Uint8Array(width * height * 4);
    }

    /** Blends one pixel (source-over). Out-of-bounds pixels are ignored. */
    pixel(x: number, y: number, color: Color): void {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
        const [r, g, b, a] = parse(color);
        const i = (y * this.width + x) * 4;
        const alpha = a / 255;
        const under = this.data[i + 3]! / 255;
        const out = alpha + under * (1 - alpha);
        if (out === 0) return;
        this.data[i] = Math.round((r * alpha + this.data[i]! * under * (1 - alpha)) / out);
        this.data[i + 1] = Math.round((g * alpha + this.data[i + 1]! * under * (1 - alpha)) / out);
        this.data[i + 2] = Math.round((b * alpha + this.data[i + 2]! * under * (1 - alpha)) / out);
        this.data[i + 3] = Math.round(out * 255);
    }

    rect(x: number, y: number, w: number, h: number, color: Color): void {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.pixel(x + i, y + j, color);
    }

    /** Filled rectangle with a 1 px outline and its top-left corners rounded by one pixel. */
    box(x: number, y: number, w: number, h: number, fill: Color, outline: Color): void {
        this.rect(x + 1, y + 1, w - 2, h - 2, fill);
        this.rect(x + 1, y, w - 2, 1, outline);
        this.rect(x + 1, y + h - 1, w - 2, 1, outline);
        this.rect(x, y + 1, 1, h - 2, outline);
        this.rect(x + w - 1, y + 1, 1, h - 2, outline);
    }

    hline(x: number, y: number, w: number, color: Color): void {
        this.rect(x, y, w, 1, color);
    }

    vline(x: number, y: number, h: number, color: Color): void {
        this.rect(x, y, 1, h, color);
    }

    /** Filled ellipse inside the given box. */
    ellipse(x: number, y: number, w: number, h: number, color: Color): void {
        const cx = x + w / 2 - 0.5;
        const cy = y + h / 2 - 0.5;
        const rx = w / 2;
        const ry = h / 2;
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                const dx = (x + i - cx) / rx;
                const dy = (y + j - cy) / ry;
                if (dx * dx + dy * dy <= 1) this.pixel(x + i, y + j, color);
            }
        }
    }

    /** Soft floor shadow under an object. */
    shadow(x: number, y: number, w: number, h: number): void {
        this.ellipse(x, y, w, h, "#10121738");
    }

    /** Vertical gradient between two colors (inclusive), hard-stepped every `step` rows. */
    gradient(x: number, y: number, w: number, h: number, top: Color, bottom: Color, step = 2): void {
        for (let j = 0; j < h; j++) {
            const t = h <= 1 ? 0 : Math.floor(j / step) / Math.max(1, Math.floor((h - 1) / step));
            const [r1, g1, b1] = parse(top);
            const [r2, g2, b2] = parse(bottom);
            const hex = (a: number, b: number) =>
                Math.round(a + (b - a) * t)
                    .toString(16)
                    .padStart(2, "0");
            this.rect(x, y + j, w, 1, `#${hex(r1, r2)}${hex(g1, g2)}${hex(b1, b2)}`);
        }
    }

    /** Copies another canvas at (x, y). */
    draw(source: Canvas, x: number, y: number): void {
        for (let j = 0; j < source.height; j++) {
            for (let i = 0; i < source.width; i++) {
                const k = (j * source.width + i) * 4;
                const a = source.data[k + 3]!;
                if (a === 0) continue;
                const hex = (n: number) => n.toString(16).padStart(2, "0");
                this.pixel(
                    x + i,
                    y + j,
                    `#${hex(source.data[k]!)}${hex(source.data[k + 1]!)}${hex(source.data[k + 2]!)}${hex(a)}`,
                );
            }
        }
    }

    /** Mirror image (left-right), for the other direction of an asymmetric object. */
    flipped(): Canvas {
        const out = new Canvas(this.width, this.height);
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const from = (j * this.width + i) * 4;
                const to = (j * this.width + (this.width - 1 - i)) * 4;
                out.data.set(this.data.subarray(from, from + 4), to);
            }
        }
        return out;
    }

    png(): Buffer {
        const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
        for (let y = 0; y < this.height; y++) {
            raw[y * (this.width * 4 + 1)] = 0; // filter: none
            Buffer.from(this.data.buffer, y * this.width * 4, this.width * 4).copy(raw, y * (this.width * 4 + 1) + 1);
        }
        const chunk = (type: string, body: Buffer) => {
            const length = Buffer.alloc(4);
            length.writeUInt32BE(body.length);
            const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
            const crc = Buffer.alloc(4);
            crc.writeUInt32BE(crc32(typed) >>> 0);
            return Buffer.concat([length, typed, crc]);
        };
        const header = Buffer.alloc(13);
        header.writeUInt32BE(this.width, 0);
        header.writeUInt32BE(this.height, 4);
        header[8] = 8; // bit depth
        header[9] = 6; // RGBA
        return Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            chunk("IHDR", header),
            chunk("IDAT", deflateSync(raw, { level: 9 })),
            chunk("IEND", Buffer.alloc(0)),
        ]);
    }
}
