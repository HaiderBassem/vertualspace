/**
 * Parsing and building of WorkAdventure play URLs.
 *
 *   /@/{organization}/{world}/{room...}   rooms managed by this admin
 *   /~/{path}                             maps hosted in map-storage (path to a .wam file)
 *   /_/{instance}/{host}/{path}           any Tiled map reachable over HTTP(S)
 *
 * WorkAdventure sends full URLs (playUri, roomUrl) and sometimes paths only (reportWorldSlug,
 * /api/room/sameWorld roomUrl): both are accepted.
 */

export type ParsedPlayUri =
    | { kind: "root"; origin: string }
    | {
          kind: "world";
          origin: string;
          organizationSlug: string;
          worldSlug: string;
          /** Undefined when the URL points at the world itself (no room). */
          roomSlug: string | undefined;
      }
    | { kind: "mapStorage"; origin: string; path: string }
    | { kind: "global"; origin: string; instance: string; mapUrl: string }
    | { kind: "invalid"; origin: string; reason: string };

const PLACEHOLDER_ORIGIN = "http://workadventure.invalid";

export function parsePlayUri(input: string): ParsedPlayUri {
    let url: URL;
    try {
        url = new URL(input, PLACEHOLDER_ORIGIN);
    } catch {
        return { kind: "invalid", origin: "", reason: "Malformed URL" };
    }
    const origin = url.origin === PLACEHOLDER_ORIGIN ? "" : url.origin;
    const pathname = url.pathname;

    if (pathname === "/" || pathname === "") {
        return { kind: "root", origin };
    }

    const segments = pathname.split("/").filter((s) => s.length > 0);
    const decoded = segments.map((s) => safeDecode(s));
    const [prefix, ...rest] = decoded;

    if (prefix === "@") {
        const [organizationSlug, worldSlug, ...roomParts] = rest;
        if (!organizationSlug || !worldSlug) {
            return { kind: "invalid", origin, reason: "A world URL needs an organization and a world" };
        }
        const roomSlug = roomParts.length > 0 ? roomParts.join("/") : undefined;
        return { kind: "world", origin, organizationSlug, worldSlug, roomSlug };
    }

    if (prefix === "~") {
        if (rest.length === 0) {
            return { kind: "invalid", origin, reason: "A map-storage URL needs a map path" };
        }
        return { kind: "mapStorage", origin, path: segments.slice(1).join("/") };
    }

    if (prefix === "_") {
        const [instance, ...mapParts] = segments.slice(1);
        if (!instance || mapParts.length === 0) {
            return { kind: "invalid", origin, reason: "A global URL needs an instance and a map URL" };
        }
        const protocol = origin.startsWith("https:") || origin === "" ? "https:" : "http:";
        return {
            kind: "global",
            origin,
            instance,
            mapUrl: `${protocol}//${mapParts.join("/")}${url.search}`,
        };
    }

    return { kind: "invalid", origin, reason: `Unsupported path: ${pathname}` };
}

function safeDecode(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function encodePath(path: string): string {
    return path
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");
}

/** URL of a world: every room URL of the world starts with it (FetchMemberDataByUuidResponse.world). */
export function buildWorldUrl(origin: string, organizationSlug: string, worldSlug: string): string {
    return `${trimSlash(origin)}/@/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(worldSlug)}/`;
}

export function buildRoomUrl(origin: string, organizationSlug: string, worldSlug: string, roomSlug: string): string {
    return buildWorldUrl(origin, organizationSlug, worldSlug) + encodePath(roomSlug);
}

export function trimSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

/** Slugs used in /@/ URLs: lowercase letters, digits, dashes and underscores. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

/** Room slugs may additionally contain slashes, e.g. "floor-1/meeting". */
export const ROOM_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_/-]{0,126}[a-z0-9])?$/;

/** Builds a slug from a human name (ASCII-folding accented characters). */
export function slugify(name: string): string {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}
