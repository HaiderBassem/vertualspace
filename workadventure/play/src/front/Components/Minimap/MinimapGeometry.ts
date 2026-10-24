/**
 * Pure geometry for the minimap: how big the card is for a given map, and how world pixels map to card pixels.
 * Kept free of Phaser and Svelte so it can be unit tested.
 */

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Rect extends Point, Size {}

export interface MinimapLayout {
    /** Size of the drawing area, in CSS pixels. */
    width: number;
    height: number;
    /** CSS pixels per world pixel. */
    scale: number;
    /** Where the map image starts inside the drawing area: very thin maps are letterboxed. */
    offsetX: number;
    offsetY: number;
    /** Size of the map image inside the drawing area, in CSS pixels. */
    imageWidth: number;
    imageHeight: number;
    /** Size of the map, in world pixels. */
    mapWidth: number;
    mapHeight: number;
}

/** The card never grows beyond this box (CSS pixels), whatever the map's aspect ratio. */
export const MINIMAP_MAX_SIZE: Size = { width: 240, height: 170 };
/** A very thin map still gets a card big enough to aim at. */
export const MINIMAP_MIN_SIZE: Size = { width: 96, height: 56 };

/**
 * Fits the map into the card while keeping its aspect ratio.
 * Returns undefined for a map without a usable size (not loaded yet, or empty).
 */
export function computeMinimapLayout(
    map: Size,
    maxSize: Size = MINIMAP_MAX_SIZE,
    minSize: Size = MINIMAP_MIN_SIZE,
): MinimapLayout | undefined {
    if (!(map.width > 0 && map.height > 0 && maxSize.width > 0 && maxSize.height > 0)) {
        return undefined;
    }

    const scale = Math.min(maxSize.width / map.width, maxSize.height / map.height);
    const imageWidth = map.width * scale;
    const imageHeight = map.height * scale;
    const width = Math.round(Math.min(maxSize.width, Math.max(minSize.width, imageWidth)));
    const height = Math.round(Math.min(maxSize.height, Math.max(minSize.height, imageHeight)));

    return {
        width,
        height,
        scale,
        offsetX: (width - imageWidth) / 2,
        offsetY: (height - imageHeight) / 2,
        imageWidth,
        imageHeight,
        mapWidth: map.width,
        mapHeight: map.height,
    };
}

export function worldToMinimap(point: Point, layout: MinimapLayout): Point {
    return {
        x: layout.offsetX + point.x * layout.scale,
        y: layout.offsetY + point.y * layout.scale,
    };
}

/**
 * Converts a point of the card (CSS pixels, relative to its top-left corner) to world pixels.
 * Points in the letterbox margins are clamped to the map's edge.
 */
export function minimapToWorld(point: Point, layout: MinimapLayout): Point {
    return {
        x: clamp((point.x - layout.offsetX) / layout.scale, 0, layout.mapWidth),
        y: clamp((point.y - layout.offsetY) / layout.scale, 0, layout.mapHeight),
    };
}

/**
 * Converts a world rectangle (the camera viewport, typically) to card pixels, clipped to the map image.
 * Returns undefined when the rectangle does not overlap the map at all.
 */
export function worldRectToMinimap(rect: Rect, layout: MinimapLayout): Rect | undefined {
    const left = Math.max(layout.offsetX, layout.offsetX + rect.x * layout.scale);
    const top = Math.max(layout.offsetY, layout.offsetY + rect.y * layout.scale);
    const right = Math.min(layout.offsetX + layout.imageWidth, layout.offsetX + (rect.x + rect.width) * layout.scale);
    const bottom = Math.min(
        layout.offsetY + layout.imageHeight,
        layout.offsetY + (rect.y + rect.height) * layout.scale,
    );

    if (right <= left || bottom <= top) {
        return undefined;
    }

    return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Size of the offscreen texture the map is drawn into, in device pixels.
 * The map is drawn bigger than displayed (supersampling) so that downscaling it smooths the tiles,
 * capped by the map's own size (no point drawing more pixels than the map has) and by maxSide.
 */
export function computeBackgroundResolution(
    layout: MinimapLayout,
    devicePixelRatio: number,
    supersampling = 2,
    maxSide = 1024,
): Size {
    const ratio = Math.max(1, devicePixelRatio) * Math.max(1, supersampling);
    const wanted = Math.min(
        ratio,
        layout.mapWidth / layout.imageWidth,
        layout.mapHeight / layout.imageHeight,
        maxSide / layout.imageWidth,
        maxSide / layout.imageHeight,
    );
    return {
        width: Math.max(1, Math.round(layout.imageWidth * wanted)),
        height: Math.max(1, Math.round(layout.imageHeight * wanted)),
    };
}

/** Returns the dot closest to the probe, if it lies within maxDistance (CSS pixels). */
export function findClosestDot<T extends Point>(dots: readonly T[], probe: Point, maxDistance: number): T | undefined {
    let closest: T | undefined;
    let closestDistanceSquared = maxDistance * maxDistance;
    for (const dot of dots) {
        const dx = dot.x - probe.x;
        const dy = dot.y - probe.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= closestDistanceSquared) {
            closest = dot;
            closestDistanceSquared = distanceSquared;
        }
    }
    return closest;
}

/** Moves a world point by a number of steps, staying inside the map. Used by the keyboard target. */
export function nudgeWorldPoint(point: Point, dx: number, dy: number, layout: MinimapLayout): Point {
    return {
        x: clamp(point.x + dx, 0, layout.mapWidth),
        y: clamp(point.y + dy, 0, layout.mapHeight),
    };
}

/** 0x68e97a -> "#68e97a" */
export function colorToCss(color: number): string {
    return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
