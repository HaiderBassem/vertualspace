import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { installComponent } from "./install";

export interface BulkInstallScope {
    /** Every world of every organization. */
    all?: boolean;
    organizationSlug?: string;
    worldSlug?: string;
    category?: string;
}

export interface BulkInstallReport {
    worlds: { organizationSlug: string; worldSlug: string }[];
    components: number;
    /** How many installations ended with each result ("installed", "updated", "unchanged", or a refusal). */
    results: Record<string, number>;
}

const OK = new Set(["installed", "updated", "unchanged"]);

export function bulkInstallSucceeded(report: BulkInstallReport): boolean {
    return report.worlds.length > 0 && Object.keys(report.results).every((result) => OK.has(result));
}

/**
 * Installs the platform's published furniture in worlds (see scripts/catalog-install.ts). Installing what is already
 * there at its newest version changes nothing, so running it again is safe.
 */
export async function installPlatformComponents(scope: BulkInstallScope): Promise<BulkInstallReport> {
    if (!scope.all && !scope.organizationSlug) throw new Error("Choose the worlds: all, or an organization");
    const components = await db()
        .select({ id: schema.components.id })
        .from(schema.components)
        .where(
            and(
                isNull(schema.components.organizationId),
                eq(schema.components.kind, "entity"),
                eq(schema.components.status, "published"),
                ...(scope.category ? [eq(schema.components.category, scope.category)] : []),
            ),
        );
    const rows = await db()
        .select({ world: schema.worlds, organizationSlug: schema.organizations.slug })
        .from(schema.worlds)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.worlds.organizationId))
        .where(isNull(schema.worlds.archivedAt));
    const worlds = rows.filter(
        (row) =>
            scope.all ||
            (row.organizationSlug === scope.organizationSlug &&
                (!scope.worldSlug || row.world.slug === scope.worldSlug)),
    );
    const report: BulkInstallReport = {
        worlds: worlds.map((row) => ({ organizationSlug: row.organizationSlug, worldSlug: row.world.slug })),
        components: components.length,
        results: {},
    };
    for (const { world } of worlds) {
        for (const component of components) {
            const outcome = await installComponent({ world, componentId: component.id, actorId: null });
            report.results[outcome.result] = (report.results[outcome.result] ?? 0) + 1;
        }
    }
    return report;
}
