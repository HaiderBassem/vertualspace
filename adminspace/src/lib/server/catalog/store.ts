/**
 * The component catalog in the database: storing validated packages (content-addressed assets,
 * immutable versions), searching what an organization may see, favorites and collections.
 *
 * Visibility rule, applied in every query: platform components (organization_id null) that are
 * published, and the viewer organization's own components. Never another organization's.
 */
import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "../db/client";
import { compareVersions, prefabId, type Category, type ComponentManifest } from "../../catalog/manifest";
import type { Locale } from "../../i18n";
import type { ValidationResult } from "./validate";

export type Component = typeof schema.components.$inferSelect;
export type ComponentVersion = typeof schema.componentVersions.$inferSelect;

function hashManifest(manifest: ComponentManifest): string {
    return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export type StoreResult =
    | { result: "created"; componentId: string; versionId: string }
    | { result: "unchanged"; componentId: string; versionId: string }
    | { result: "invalid" }
    | { result: "versionExists" }
    | { result: "kindChanged" };

/**
 * Stores a validated package as a component version. Re-storing the same manifest is a no-op
 * ("unchanged", idempotent imports); a different manifest under an existing version is refused:
 * versions never change once stored.
 */
export async function storeComponentVersion(input: {
    organizationId: string | null;
    publisher: string;
    createdBy: string | null;
    publish: boolean;
    validation: ValidationResult;
}): Promise<StoreResult> {
    const { validation } = input;
    const manifest = validation.manifest;
    if (!validation.ok || !manifest) return { result: "invalid" };
    const manifestHash = hashManifest(manifest);

    return db().transaction(async (tx): Promise<StoreResult> => {
        const ownerCondition =
            input.organizationId === null
                ? isNull(schema.components.organizationId)
                : eq(schema.components.organizationId, input.organizationId);
        let [component] = await tx
            .select()
            .from(schema.components)
            .where(and(ownerCondition, eq(schema.components.key, manifest.key)))
            .for("update");
        const fields = {
            name: manifest.name,
            description: manifest.description ?? null,
            category: manifest.category,
            tags: manifest.tags,
            license: manifest.license,
            attribution: manifest.attribution ?? null,
            provenance:
                manifest.provenance.source === "original"
                    ? `original: ${manifest.provenance.author}`
                    : `${manifest.provenance.author} <${manifest.provenance.url ?? ""}>`,
            publisher: input.publisher,
        };
        if (component && component.kind !== manifest.kind) return { result: "kindChanged" };
        if (!component) {
            [component] = await tx
                .insert(schema.components)
                .values({
                    key: manifest.key,
                    organizationId: input.organizationId,
                    kind: manifest.kind,
                    status: input.publish ? "published" : "draft",
                    createdBy: input.createdBy,
                    ...fields,
                })
                .returning();
        }
        if (!component) throw new Error("Component creation returned no row");

        const [existing] = await tx
            .select({ id: schema.componentVersions.id, manifestHash: schema.componentVersions.manifestHash })
            .from(schema.componentVersions)
            .where(
                and(
                    eq(schema.componentVersions.componentId, component.id),
                    eq(schema.componentVersions.version, manifest.version),
                ),
            );
        if (existing) {
            return existing.manifestHash === manifestHash
                ? { result: "unchanged", componentId: component.id, versionId: existing.id }
                : { result: "versionExists" };
        }

        // Content-addressed: identical files are stored once, whoever uploads them.
        for (const file of validation.files) {
            await tx
                .insert(schema.assets)
                .values({
                    sha256: file.sha256,
                    contentType: file.contentType,
                    byteSize: file.bytes.length,
                    width: file.image?.width ?? null,
                    height: file.image?.height ?? null,
                    data: file.bytes,
                })
                .onConflictDoNothing();
        }
        const [version] = await tx
            .insert(schema.componentVersions)
            .values({
                componentId: component.id,
                version: manifest.version,
                manifest: manifest as unknown as Record<string, unknown>,
                manifestHash,
                validation: { ok: true, issues: validation.issues },
                publishedAt: input.publish ? new Date() : null,
                createdBy: input.createdBy,
            })
            .returning({ id: schema.componentVersions.id });
        if (!version) throw new Error("Version creation returned no row");
        if (validation.files.length > 0) {
            await tx
                .insert(schema.componentVersionAssets)
                .values(validation.files.map((f) => ({ versionId: version.id, path: f.path, sha256: f.sha256 })));
        }
        // The catalog entry follows its newest version.
        await tx
            .update(schema.components)
            .set({ ...fields, ...(input.publish ? { status: "published" as const } : {}) })
            .where(eq(schema.components.id, component.id));
        return { result: "created", componentId: component.id, versionId: version.id };
    });
}

export async function setComponentStatus(
    componentId: string,
    organizationId: string | null,
    status: Component["status"],
): Promise<boolean> {
    const rows = await db()
        .update(schema.components)
        .set({ status })
        .where(
            and(
                eq(schema.components.id, componentId),
                organizationId === null
                    ? isNull(schema.components.organizationId)
                    : eq(schema.components.organizationId, organizationId),
            ),
        )
        .returning({ id: schema.components.id });
    return rows.length > 0;
}

/** Visibility of components for an organization (see the module comment). */
function visibleTo(organizationId: string, includeUnpublished: boolean): SQL {
    return or(
        and(isNull(schema.components.organizationId), eq(schema.components.status, "published")),
        and(
            eq(schema.components.organizationId, organizationId),
            includeUnpublished ? undefined : eq(schema.components.status, "published"),
        ),
    )!;
}

/** Newest published version of each component (semantic version order). */
export async function latestPublishedVersions(componentIds: string[]): Promise<Map<string, ComponentVersion>> {
    const result = new Map<string, ComponentVersion>();
    if (componentIds.length === 0) return result;
    const rows = await db()
        .select()
        .from(schema.componentVersions)
        .where(
            and(
                inArray(schema.componentVersions.componentId, componentIds),
                isNotNull(schema.componentVersions.publishedAt),
            ),
        );
    for (const row of rows) {
        const current = result.get(row.componentId);
        if (!current || compareVersions(row.version, current.version) > 0) result.set(row.componentId, row);
    }
    return result;
}

/** Public URL path of an asset of a published version (served by /wa/assets). */
export function assetPath(versionId: string, sha256: string, contentType: string): string {
    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    return `/wa/assets/${versionId}/${sha256}.${extension}`;
}

async function assetsOf(
    versionIds: string[],
): Promise<
    Map<string, Map<string, { sha256: string; contentType: string; width: number | null; height: number | null }>>
> {
    const result = new Map<
        string,
        Map<string, { sha256: string; contentType: string; width: number | null; height: number | null }>
    >();
    if (versionIds.length === 0) return result;
    const rows = await db()
        .select({
            versionId: schema.componentVersionAssets.versionId,
            path: schema.componentVersionAssets.path,
            sha256: schema.assets.sha256,
            contentType: schema.assets.contentType,
            width: schema.assets.width,
            height: schema.assets.height,
        })
        .from(schema.componentVersionAssets)
        .innerJoin(schema.assets, eq(schema.assets.sha256, schema.componentVersionAssets.sha256))
        .where(inArray(schema.componentVersionAssets.versionId, versionIds));
    for (const row of rows) {
        const files = result.get(row.versionId) ?? new Map();
        files.set(row.path, { sha256: row.sha256, contentType: row.contentType, width: row.width, height: row.height });
        result.set(row.versionId, files);
    }
    return result;
}

export function localizedName(
    manifest: ComponentManifest,
    locale: Locale,
): { name: string; description: string | undefined } {
    const translation = manifest.translations?.[locale];
    return {
        name: translation?.name ?? manifest.name,
        description: translation?.description ?? manifest.description,
    };
}

export type CatalogSort = "name" | "newest" | "popular";

export interface CatalogFilter {
    query?: string;
    category?: Category;
    kind?: Component["kind"];
    owned?: boolean;
    favoritesOf?: string;
    sort: CatalogSort;
    limit: number;
    offset: number;
}

export interface CatalogItem {
    id: string;
    key: string;
    kind: Component["kind"];
    name: string;
    description: string | undefined;
    category: string;
    tags: string[];
    license: string;
    publisher: string;
    owned: boolean;
    status: Component["status"];
    version: string | null;
    versionId: string | null;
    previewUrl: string | null;
    variantCount: number;
    favorite: boolean;
    installedWorlds: number;
}

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Catalog page for an organization: search, filters, sort, pagination. */
export async function searchCatalog(
    viewer: { organizationId: string; accountId: string; locale: Locale; canManage: boolean },
    filter: CatalogFilter,
): Promise<{ items: CatalogItem[]; total: number }> {
    const terms = (filter.query ?? "").trim().slice(0, 100);
    const pattern = terms ? `%${escapeLike(terms)}%` : undefined;
    const tagTerms = terms
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => /^[a-z0-9-]{1,32}$/.test(t));
    const where = and(
        visibleTo(viewer.organizationId, viewer.canManage),
        filter.category ? eq(schema.components.category, filter.category) : undefined,
        filter.kind ? eq(schema.components.kind, filter.kind) : undefined,
        filter.owned ? eq(schema.components.organizationId, viewer.organizationId) : undefined,
        filter.favoritesOf
            ? sql`exists (select 1 from ${schema.componentFavorites} f where f.component_id = ${schema.components.id} and f.account_id = ${filter.favoritesOf})`
            : undefined,
        pattern
            ? or(
                  sql`to_tsvector('simple', ${schema.components.name} || ' ' || coalesce(${schema.components.description}, '')) @@ plainto_tsquery('simple', ${terms})`,
                  ilike(schema.components.name, pattern),
                  ilike(schema.components.description, pattern),
                  tagTerms.length > 0
                      ? sql`${schema.components.tags} && ${sql`array[${sql.join(
                            tagTerms.map((t) => sql`${t}`),
                            sql`, `,
                        )}]::text[]`}`
                      : undefined,
              )
            : undefined,
    );
    const installs = sql<number>`(select count(*)::int from ${schema.componentInstallations} i where i.component_id = ${schema.components.id})`;
    const order =
        filter.sort === "newest"
            ? [desc(schema.components.updatedAt)]
            : filter.sort === "popular"
              ? [desc(installs), asc(schema.components.name)]
              : [asc(schema.components.category), asc(schema.components.name)];
    const [rows, totals] = await Promise.all([
        db()
            .select({
                component: schema.components,
                favorite: sql<boolean>`exists (select 1 from ${schema.componentFavorites} f where f.component_id = ${schema.components.id} and f.account_id = ${viewer.accountId})`,
                installedWorlds: sql<number>`(select count(*)::int from ${schema.componentInstallations} i where i.component_id = ${schema.components.id} and i.organization_id = ${viewer.organizationId})`,
            })
            .from(schema.components)
            .where(where)
            .orderBy(...order)
            .limit(filter.limit)
            .offset(filter.offset),
        db().select({ value: count() }).from(schema.components).where(where),
    ]);
    const versions = await latestPublishedVersions(rows.map((r) => r.component.id));
    const assets = await assetsOf([...versions.values()].map((v) => v.id));
    return {
        total: totals[0]?.value ?? 0,
        items: rows.map(({ component, favorite, installedWorlds }) => {
            const version = versions.get(component.id);
            const manifest = version?.manifest as ComponentManifest | undefined;
            const preview = manifest && version ? assets.get(version.id)?.get(manifest.preview) : undefined;
            const text = manifest
                ? localizedName(manifest, viewer.locale)
                : { name: component.name, description: component.description ?? undefined };
            return {
                id: component.id,
                key: component.key,
                kind: component.kind,
                name: text.name,
                description: text.description,
                category: component.category,
                tags: component.tags,
                license: component.license,
                publisher: component.publisher,
                owned: component.organizationId === viewer.organizationId,
                status: component.status,
                version: version?.version ?? null,
                versionId: version?.id ?? null,
                previewUrl: preview && version ? assetPath(version.id, preview.sha256, preview.contentType) : null,
                variantCount: manifest?.entity?.variants.length ?? 0,
                favorite,
                installedWorlds,
            };
        }),
    };
}

/** Category counts of what an organization may see (catalog sidebar). */
export async function catalogCategories(
    organizationId: string,
    canManage: boolean,
): Promise<{ category: string; value: number }[]> {
    return db()
        .select({ category: schema.components.category, value: count() })
        .from(schema.components)
        .where(visibleTo(organizationId, canManage))
        .groupBy(schema.components.category);
}

export interface ComponentDetail {
    component: Component;
    owned: boolean;
    version: ComponentVersion;
    manifest: ComponentManifest;
    versions: { id: string; version: string; publishedAt: string | null }[];
    previewUrl: string | null;
    variants: {
        key: string;
        prefabId: string;
        color: string;
        direction: string;
        imageUrl: string | null;
        width: number | null;
        height: number | null;
        collides: boolean;
    }[];
    favorite: boolean;
}

/** A component the organization may see, with its newest published version (404 otherwise). */
export async function getComponentDetail(
    viewer: { organizationId: string; accountId: string; locale: Locale; canManage: boolean },
    componentId: string,
): Promise<ComponentDetail | undefined> {
    const [row] = await db()
        .select({
            component: schema.components,
            favorite: sql<boolean>`exists (select 1 from ${schema.componentFavorites} f where f.component_id = ${schema.components.id} and f.account_id = ${viewer.accountId})`,
        })
        .from(schema.components)
        .where(and(eq(schema.components.id, componentId), visibleTo(viewer.organizationId, viewer.canManage)));
    if (!row) return undefined;
    const allVersions = await db()
        .select()
        .from(schema.componentVersions)
        .where(eq(schema.componentVersions.componentId, componentId))
        .orderBy(desc(schema.componentVersions.createdAt));
    const published = allVersions.filter((v) => v.publishedAt);
    const version = published.sort((a, b) => compareVersions(b.version, a.version))[0];
    if (!version) return undefined;
    const manifest = version.manifest as ComponentManifest;
    const files = (await assetsOf([version.id])).get(version.id) ?? new Map();
    const url = (path: string) => {
        const file = files.get(path);
        return file ? assetPath(version.id, file.sha256, file.contentType) : null;
    };
    return {
        component: row.component,
        owned: row.component.organizationId === viewer.organizationId,
        version,
        manifest,
        versions: published.map((v) => ({
            id: v.id,
            version: v.version,
            publishedAt: v.publishedAt?.toISOString() ?? null,
        })),
        previewUrl: url(manifest.preview),
        variants: (manifest.entity?.variants ?? []).map((variant) => {
            const file = files.get(variant.image);
            return {
                key: variant.key,
                prefabId: prefabId(componentId, variant.key),
                color: variant.color,
                direction: variant.direction,
                imageUrl: url(variant.image),
                width: file?.width ?? null,
                height: file?.height ?? null,
                collides: Boolean(variant.collisionGrid?.some((r) => r.includes(1))),
            };
        }),
        favorite: row.favorite,
    };
}

/** Adds or removes a favorite (only on a component the organization may see). */
export async function setFavorite(
    viewer: { organizationId: string; accountId: string },
    componentId: string,
    favorite: boolean,
): Promise<boolean> {
    const visible = await db()
        .select({ id: schema.components.id })
        .from(schema.components)
        .where(and(eq(schema.components.id, componentId), visibleTo(viewer.organizationId, false)))
        .limit(1);
    if (visible.length === 0) return false;
    if (favorite) {
        await db()
            .insert(schema.componentFavorites)
            .values({ accountId: viewer.accountId, componentId })
            .onConflictDoNothing();
    } else {
        await db()
            .delete(schema.componentFavorites)
            .where(
                and(
                    eq(schema.componentFavorites.accountId, viewer.accountId),
                    eq(schema.componentFavorites.componentId, componentId),
                ),
            );
    }
    return true;
}

/**
 * The bytes of an asset, if it belongs to a published version of a component that is not a draft and
 * whose organization is active (public asset route): suspending an organization stops serving its files.
 */
export async function publishedAsset(
    versionId: string,
    sha256: string,
): Promise<{ contentType: string; data: Buffer } | undefined> {
    const [row] = await db()
        .select({ contentType: schema.assets.contentType, data: schema.assets.data })
        .from(schema.componentVersionAssets)
        .innerJoin(schema.assets, eq(schema.assets.sha256, schema.componentVersionAssets.sha256))
        .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentVersionAssets.versionId))
        .innerJoin(schema.components, eq(schema.components.id, schema.componentVersions.componentId))
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.components.organizationId))
        .where(
            and(
                eq(schema.componentVersionAssets.versionId, versionId),
                eq(schema.componentVersionAssets.sha256, sha256),
                isNotNull(schema.componentVersions.publishedAt),
                ne(schema.components.status, "draft"),
                or(isNull(schema.components.organizationId), eq(schema.organizations.status, "active")),
            ),
        )
        .limit(1);
    return row;
}

/** Files of a version by manifest path (for map-storage uploads and the collection file). */
export async function versionFiles(
    versionId: string,
): Promise<Map<string, { sha256: string; contentType: string; data: Buffer }>> {
    const rows = await db()
        .select({
            path: schema.componentVersionAssets.path,
            sha256: schema.assets.sha256,
            contentType: schema.assets.contentType,
            data: schema.assets.data,
        })
        .from(schema.componentVersionAssets)
        .innerJoin(schema.assets, eq(schema.assets.sha256, schema.componentVersionAssets.sha256))
        .where(eq(schema.componentVersionAssets.versionId, versionId));
    return new Map(rows.map((r) => [r.path, { sha256: r.sha256, contentType: r.contentType, data: r.data }]));
}

export { assetsOf };

/** Bytes of the distinct files of every version an organization uploaded (its storage use). */
export async function organizationStorageBytes(organizationId: string): Promise<number> {
    const [row] = await db()
        .select({ bytes: sql<number>`coalesce(sum(${schema.assets.byteSize}), 0)::bigint` })
        .from(schema.assets)
        .where(
            sql`${schema.assets.sha256} in (
                select cva.sha256 from ${schema.componentVersionAssets} cva
                join ${schema.componentVersions} v on v.id = cva.version_id
                join ${schema.components} c on c.id = v.component_id
                where c.organization_id = ${organizationId})`,
        );
    return Number(row?.bytes ?? 0);
}
