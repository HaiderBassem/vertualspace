/**
 * Office component manifest, schema "adminspace.component/1" (shared by the server, the pages and the
 * catalog scripts). A component is either:
 *
 * - an "entity": furniture or decoration for WorkAdventure's inline map editor, with one image per
 *   variant (color x direction). It becomes prefabs of an entity collection file (WorkAdventure
 *   libs/map-editor EntityCollectionRaw, version "1.0").
 * - a "room_template": a complete room (Tiled .tmj map + tilesets, optional placed entities), uploaded to
 *   map-storage as a new WAM room (WAM 2.1.0).
 *
 * The kind-specific part lives in its own optional section (`entity` / `template`), so new kinds extend
 * the schema without forcing every component into one shape. `schema` is versioned: a future
 * "adminspace.component/2" can be read alongside this one.
 */
import { z } from "zod";

export const MANIFEST_SCHEMA = "adminspace.component/1";

/** Verified formats of WorkAdventure at commit b579166 (see docs/ENTERPRISE_ARCHITECTURE.md). */
export const WORKADVENTURE_FORMATS = { entityCollection: "1.0", wam: "2.1.0" } as const;

export const CATEGORIES = [
    "desks",
    "seating",
    "meeting",
    "lounge",
    "reception",
    "plants",
    "decoration",
    "lighting",
    "presentation",
    "computers",
    "interactive",
    "navigation",
    "wayfinding",
    "templates",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIRECTIONS = ["Down", "Up", "Left", "Right"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** WorkAdventure collision cells and tiles are 32x32 pixels. */
export const TILE_SIZE = 32;

const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
/** Relative file name inside a component package: no "..", no absolute path, no backslash. */
const ASSET_PATH_PATTERN = /^(?!.*\.\.)(?!\/)[a-z0-9][a-z0-9._/-]{0,190}\.(png|webp|jpg|jpeg|tmj|json|wam)$/;

export const ComponentKey = z.string().regex(KEY_PATTERN);
export const SemVer = z.string().regex(SEMVER_PATTERN);
export const AssetPath = z.string().regex(ASSET_PATH_PATTERN);
/** A file that must be an image (variant images, previews): checked again by its bytes at validation. */
const ImagePath = AssetPath.refine((path) => /\.(png|webp|jpe?g)$/.test(path), "an image file (.png, .webp, .jpg)");
/** Links shown to people: http(s) only (no javascript:, data: or other schemes). */
const HttpUrl = z
    .string()
    .url()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), "an http(s) URL");
const Tag = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,31}$/);

export const EntityVariant = z.object({
    /** Stable within the component: part of the prefab id stored in maps. */
    key: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/),
    /** Hexadecimal color the variant is grouped by in the editor (WorkAdventure "color"). */
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    direction: z.enum(DIRECTIONS),
    image: ImagePath,
    /** One row per 32 px of height, one cell per 32 px of width; 1 = blocks movement. */
    collisionGrid: z
        .array(
            z
                .array(z.union([z.literal(0), z.literal(1)]))
                .min(1)
                .max(32),
        )
        .min(1)
        .max(32)
        .optional(),
    /** Depth adjustment in pixels (how the entity sorts against players). */
    depthOffset: z.number().int().min(-1024).max(1024).optional(),
});
export type EntityVariant = z.infer<typeof EntityVariant>;

export const TemplateSection = z.object({
    /** The Tiled map (orthogonal, 32 px tiles) and every file it references (tilesets). */
    map: AssetPath,
    files: z.array(AssetPath).max(32),
    /** Map size in tiles. */
    width: z.number().int().min(4).max(200),
    height: z.number().int().min(4).max(200),
    /** Entity components the template places; installed in the world with it. */
    requires: z.array(ComponentKey).max(50),
    /** Furniture placed in the room: prefab of a required component, position in pixels. */
    entities: z
        .array(
            z.object({
                component: ComponentKey,
                variant: z.string().max(40),
                x: z
                    .number()
                    .int()
                    .min(0)
                    .max(200 * TILE_SIZE),
                y: z
                    .number()
                    .int()
                    .min(0)
                    .max(200 * TILE_SIZE),
            }),
        )
        .max(500),
});
export type TemplateSection = z.infer<typeof TemplateSection>;

export const ComponentManifest = z
    .object({
        schema: z.literal(MANIFEST_SCHEMA),
        key: ComponentKey,
        version: SemVer,
        kind: z.enum(["entity", "room_template"]),
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        /** Names and descriptions in other languages, by BCP 47 tag. */
        translations: z
            .record(
                z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
                z.object({
                    name: z.string().trim().min(1).max(200),
                    description: z.string().trim().max(2000).optional(),
                }),
            )
            .optional(),
        category: z.enum(CATEGORIES),
        tags: z.array(Tag).max(20),
        /** SPDX license identifier (spdx.org/licenses), or LicenseRef-… for a custom license. */
        license: z.string().regex(/^(LicenseRef-[A-Za-z0-9.-]+|[A-Za-z0-9.+-]+)$/),
        attribution: z.string().trim().max(500).optional(),
        provenance: z.object({
            source: z.enum(["original", "third-party"]),
            author: z.string().trim().min(1).max(200),
            url: HttpUrl.optional(),
        }),
        preview: ImagePath,
        entity: z.object({ variants: z.array(EntityVariant).min(1).max(16) }).optional(),
        template: TemplateSection.optional(),
        /** Formats this component was validated against. */
        compatibility: z.object({
            entityCollection: z.literal(WORKADVENTURE_FORMATS.entityCollection).optional(),
            wam: z.literal(WORKADVENTURE_FORMATS.wam).optional(),
        }),
    })
    .superRefine((manifest, context) => {
        if (manifest.kind === "entity" && !manifest.entity) {
            context.addIssue({ code: "custom", path: ["entity"], params: { code: "entitySectionMissing" } });
        }
        if (manifest.kind === "room_template" && !manifest.template) {
            context.addIssue({ code: "custom", path: ["template"], params: { code: "templateSectionMissing" } });
        }
        if (manifest.provenance.source === "third-party" && !manifest.provenance.url) {
            context.addIssue({ code: "custom", path: ["provenance", "url"], params: { code: "provenanceUrlMissing" } });
        }
        const keys = new Set<string>();
        for (const [index, variant] of (manifest.entity?.variants ?? []).entries()) {
            if (keys.has(variant.key)) {
                context.addIssue({
                    code: "custom",
                    path: ["entity", "variants", index, "key"],
                    params: { code: "duplicateVariant" },
                });
            }
            keys.add(variant.key);
        }
    });
export type ComponentManifest = z.infer<typeof ComponentManifest>;

/**
 * Prefab id of a variant, as stored in WorkAdventure maps. WorkAdventure looks prefabs up by id only,
 * across every collection of a map, so ids are globally unique (component UUID) and never depend on
 * the version: updating a component keeps the furniture already placed.
 */
export function prefabId(componentId: string, variantKey: string): string {
    return `adminspace:${componentId}:${variantKey}`;
}

/** The component id of an AdminSpace prefab id, or undefined for any other prefab. */
export function componentIdOfPrefab(prefab: string): string | undefined {
    const match = /^adminspace:([0-9a-f-]{36}):[a-z0-9-]+$/.exec(prefab);
    return match?.[1];
}

/** Every file a manifest references (to check that a package is complete). */
export function referencedFiles(manifest: ComponentManifest): string[] {
    const files = new Set<string>([manifest.preview]);
    for (const variant of manifest.entity?.variants ?? []) files.add(variant.image);
    if (manifest.template) {
        files.add(manifest.template.map);
        for (const file of manifest.template.files) files.add(file);
    }
    return [...files];
}

/** Compares two semantic versions: negative, zero or positive like Array.prototype.sort. */
export function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/**
 * Why a room's last change on map-storage failed (rooms.sync_error): a code, translated by the pages
 * (catalog.world.problems). The technical detail stays in the job's last error and the server log.
 */
export const ROOM_SYNC_PROBLEMS = [
    "originMissing",
    "mapNotFound",
    "otherOrganization",
    "unauthorized",
    "unavailable",
    "rejected",
    "mapRejected",
    "templateMissing",
    /** Map-storage reported the room's map deleted (webhook): the room is kept, never deleted automatically. */
    "mapDeleted",
    /** The room was created from a template but map-storage refused the chosen size (it keeps the template's). */
    "resizeRejected",
    "unexpected",
] as const;
export type RoomSyncProblem = (typeof ROOM_SYNC_PROBLEMS)[number];

export function roomSyncProblem(value: string | null): RoomSyncProblem | undefined {
    if (value === null) return undefined;
    return (ROOM_SYNC_PROBLEMS as readonly string[]).includes(value) ? (value as RoomSyncProblem) : "unexpected";
}
