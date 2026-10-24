/**
 * Validates and publishes the built-in component pack (catalog/builtin) as platform components.
 * Idempotent: unchanged components are left as they are; a changed manifest needs a new version.
 *
 *   npm run catalog:import
 *   node build/cli/catalog-import.js [--from <dir>]     (production image)
 */
import path from "node:path";
import { closeDb } from "../src/lib/server/db/client";
import { importCatalogDirectory } from "../src/lib/server/catalog/builtin";

const fromIndex = process.argv.indexOf("--from");
const directory =
    fromIndex > 0 && process.argv[fromIndex + 1]
        ? path.resolve(process.argv[fromIndex + 1]!)
        : path.resolve(process.cwd(), "catalog/builtin");

try {
    const report = await importCatalogDirectory(directory);
    for (const item of report)
        console.info(`${item.result.padEnd(14)} ${item.key}${item.issues ? ` ${item.issues}` : ""}`);
    const failed = report.filter((r) => r.result !== "created" && r.result !== "unchanged");
    console.info(`catalog: ${report.length - failed.length} imported or up to date, ${failed.length} refused`);
    process.exitCode = failed.length > 0 ? 1 : 0;
} finally {
    await closeDb();
}
