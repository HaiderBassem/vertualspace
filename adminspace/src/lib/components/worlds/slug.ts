/** Suggests a URL identifier from a human name (ASCII-folding accented characters). Client-safe. */
export function suggestSlug(name: string, max = 64): string {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, max)
        .replace(/-+$/, "");
}

/** HTML pattern attribute equivalent of SLUG_PATTERN (src/lib/server/workadventure/playUri.ts). */
export const SLUG_INPUT_PATTERN = "[a-z0-9]([a-z0-9_\\-]{0,62}[a-z0-9])?";
