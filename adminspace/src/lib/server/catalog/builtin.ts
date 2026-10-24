/**
 * Import of component packages from a directory (the built-in pack, catalog/builtin): each
 * sub-directory holds a manifest.json and the files it references. Packages go through the same
 * validation as uploads; the platform publishes them.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { validatePackage } from "./validate";
import { storeComponentVersion } from "./store";

export interface ImportReportItem {
    key: string;
    result: "created" | "unchanged" | "invalid" | "versionExists" | "kindChanged";
    issues?: string;
}

/** Reads a package directory (files at any depth, paths relative to it, "/" separators). */
export function readPackage(directory: string): { manifest: unknown; files: Map<string, Buffer> } {
    const files = new Map<string, Buffer>();
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = path.join(dir, entry);
            if (statSync(full).isDirectory()) walk(full);
            else files.set(path.relative(directory, full).split(path.sep).join("/"), readFileSync(full));
        }
    };
    walk(directory);
    const manifest = files.get("manifest.json");
    files.delete("manifest.json");
    return { manifest: manifest ? (JSON.parse(manifest.toString("utf8")) as unknown) : undefined, files };
}

export async function importCatalogDirectory(directory: string): Promise<ImportReportItem[]> {
    const indexFile = path.join(directory, "index.json");
    const order: string[] = existsSync(indexFile)
        ? (JSON.parse(readFileSync(indexFile, "utf8")) as { components: string[] }).components
        : readdirSync(directory).filter((d) => statSync(path.join(directory, d)).isDirectory());
    const report: ImportReportItem[] = [];
    for (const key of order) {
        const { manifest, files } = readPackage(path.join(directory, key));
        const validation = validatePackage(manifest, files);
        if (!validation.ok) {
            report.push({
                key,
                result: "invalid",
                issues: validation.issues
                    .filter((i) => i.code !== "fileUnreferenced")
                    .map((i) => `${i.code}@${i.path}`)
                    .join(", "),
            });
            continue;
        }
        const stored = await storeComponentVersion({
            organizationId: null,
            publisher: "AdminSpace",
            createdBy: null,
            publish: true,
            validation,
        });
        report.push({ key, result: stored.result });
    }
    return report;
}
