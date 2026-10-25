import path from "node:path";
import { expect, it } from "vitest";
import { readPackage } from "../src/lib/server/catalog/builtin";
import { validatePackage } from "../src/lib/server/catalog/validate";

const village = "https://workadventure.github.io/wa-village/wa-headquarters.tmj";

it("accepts the hosted Village scenery without copying its map or tilesets into the package", () => {
    const pack = readPackage(path.resolve("catalog/builtin/reception-lobby"));
    const manifest = structuredClone(pack.manifest) as Record<string, unknown>;
    manifest.template = { map: village, files: [], width: 200, height: 120, requires: [], entities: [] };
    const files = new Map([["preview.png", pack.files.get("preview.png")!]]);
    const result = validatePackage(manifest, files);
    expect(result.ok).toBe(true);
    expect(result.files.map((f) => f.path)).toEqual(["preview.png"]);
});

it.each(["http://127.0.0.1/private.tmj", "https://untrusted.example/map.tmj", "javascript:alert(1)"])(
    "does not allow an arbitrary hosted template map: %s",
    (map) => {
        const pack = readPackage(path.resolve("catalog/builtin/reception-lobby"));
        const manifest = structuredClone(pack.manifest) as Record<string, unknown>;
        manifest.template = { map, files: [], width: 200, height: 120, requires: [], entities: [] };
        expect(validatePackage(manifest, pack.files).ok).toBe(false);
    },
);
