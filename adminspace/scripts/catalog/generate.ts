/**
 * Generates AdminSpace's built-in component pack into catalog/builtin/ (committed: the files are
 * reviewable and their provenance is this repository). Deterministic: running it twice gives the same
 * bytes, so `git diff` shows real changes only.
 *
 *   npm run catalog:generate     # writes catalog/builtin/
 *   npm run catalog:import       # validates and publishes it as platform components
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Canvas } from "./canvas";
import { ENTITIES, type Localized } from "./furniture";
import { drawTileset, templateMap, templatePreview, TEMPLATES, TILESET_FILE } from "./templates";
import { MANIFEST_SCHEMA, WORKADVENTURE_FORMATS, type ComponentManifest } from "../../src/lib/catalog/manifest";

const OUT = path.resolve(import.meta.dirname, "../../catalog/builtin");
const VERSION = "1.0.0";
const LICENSE = "LicenseRef-AdminSpace";
const ATTRIBUTION = "Original artwork created for AdminSpace by its contributors.";

function translations(name: Localized, description: Localized): ComponentManifest["translations"] {
    return {
        "fr-FR": { name: name.fr, description: description.fr },
        "de-DE": { name: name.de, description: description.de },
        "es-ES": { name: name.es, description: description.es },
        "ar-SA": { name: name.ar, description: description.ar },
    };
}

/** A preview: up to three variants side by side, centered on a transparent canvas. */
function entityPreview(images: Canvas[]): Canvas {
    const shown = images.slice(0, 3);
    const width = Math.max(
        96,
        shown.reduce((sum, c) => sum + c.width + 8, 8),
    );
    const height = Math.max(64, ...shown.map((c) => c.height + 8));
    const preview = new Canvas(width, height);
    let x = Math.floor((width - shown.reduce((sum, c) => sum + c.width + 8, -8)) / 2);
    for (const image of shown) {
        preview.draw(image, x, Math.floor((height - image.height) / 2));
        x += image.width + 8;
    }
    return preview;
}

function write(dir: string, files: Record<string, Buffer | string>): void {
    mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
}

rmSync(OUT, { recursive: true, force: true });
const sprites = new Map<string, Canvas>();
const index: string[] = [];

for (const entity of ENTITIES) {
    const files: Record<string, Buffer | string> = {};
    const images: Canvas[] = [];
    for (const variant of entity.variants) {
        const image = variant.draw();
        images.push(image);
        sprites.set(`${entity.key}/${variant.key}`, image);
        files[`${variant.key}.png`] = image.png();
    }
    files["preview.png"] = entityPreview(images).png();
    const manifest: ComponentManifest = {
        schema: MANIFEST_SCHEMA,
        key: entity.key,
        version: VERSION,
        kind: "entity",
        name: entity.name.en,
        description: entity.description.en,
        translations: translations(entity.name, entity.description),
        category: entity.category,
        tags: entity.tags,
        license: LICENSE,
        attribution: ATTRIBUTION,
        provenance: { source: "original", author: "AdminSpace contributors" },
        preview: "preview.png",
        entity: {
            variants: entity.variants.map((v) => ({
                key: v.key,
                color: v.color.slice(0, 7),
                direction: v.direction,
                image: `${v.key}.png`,
                ...(v.collisionGrid ? { collisionGrid: v.collisionGrid } : {}),
                ...(v.depthOffset !== undefined ? { depthOffset: v.depthOffset } : {}),
            })),
        },
        compatibility: { entityCollection: WORKADVENTURE_FORMATS.entityCollection },
    };
    files["manifest.json"] = `${JSON.stringify(manifest, null, 2)}\n`;
    write(path.join(OUT, entity.key), files);
    index.push(entity.key);
}

const tileset = drawTileset();
for (const template of TEMPLATES) {
    const requires = [...new Set(template.entities.map((e) => e.component))].sort();
    const manifest: ComponentManifest = {
        schema: MANIFEST_SCHEMA,
        key: template.key,
        version: VERSION,
        kind: "room_template",
        name: template.name.en,
        description: template.description.en,
        translations: translations(template.name, template.description),
        category: "templates",
        tags: template.tags,
        license: LICENSE,
        attribution: ATTRIBUTION,
        provenance: { source: "original", author: "AdminSpace contributors" },
        preview: "preview.png",
        template: {
            map: "map.tmj",
            files: [TILESET_FILE],
            width: template.layout.width,
            height: template.layout.height,
            requires,
            entities: template.entities,
        },
        compatibility: { wam: WORKADVENTURE_FORMATS.wam },
    };
    write(path.join(OUT, template.key), {
        "manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
        "map.tmj": `${JSON.stringify(templateMap(template), null, 2)}\n`,
        [TILESET_FILE]: tileset.png(),
        "preview.png": templatePreview(template, tileset, sprites).png(),
    });
    index.push(template.key);
}

// Entities first: templates require them.
writeFileSync(path.join(OUT, "index.json"), `${JSON.stringify({ version: VERSION, components: index }, null, 2)}\n`);
writeFileSync(
    path.join(OUT, "README.md"),
    `# Built-in components\n\nGenerated by \`npm run catalog:generate\` from \`scripts/catalog/\`. Do not edit by hand.\n\n` +
        `- ${ENTITIES.length} entities and ${TEMPLATES.length} room templates, version ${VERSION}.\n` +
        `- Provenance: original artwork drawn in code for AdminSpace (no third-party asset is copied or adapted).\n` +
        `- License: \`${LICENSE}\`: the same terms as AdminSpace itself, which are not decided yet (see docs/LICENSING.md).\n` +
        `  Owners may choose to dedicate these files to the public domain (CC0-1.0) independently of the code.\n`,
);
console.info(
    `catalog: ${ENTITIES.length} entities and ${TEMPLATES.length} templates written to ${path.relative(process.cwd(), OUT)}`,
);
