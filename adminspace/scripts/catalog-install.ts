/**
 * Installs the platform's built-in furniture in worlds, so that it appears in the map editor of WorkAdventure without
 * opening every component one by one. Idempotent: what is already installed at its newest version is left alone.
 *
 *   npm run catalog:install -- --all [--category nature]
 *   node build/cli/catalog-install.js --org acme [--world office] [--category nature]     (production image)
 *
 * Without --all, --org is required. Only entity components published by the platform are installed.
 */
import { closeDb } from "../src/lib/server/db/client";
import { bulkInstallSucceeded, installPlatformComponents } from "../src/lib/server/catalog/bulkInstall";

function option(name: string): string | undefined {
    const index = process.argv.indexOf(`--${name}`);
    const value = index > 0 ? process.argv[index + 1] : undefined;
    return value && !value.startsWith("--") ? value : undefined;
}

const all = process.argv.includes("--all");
const organizationSlug = option("org");
if (!all && !organizationSlug) {
    console.error("Usage: catalog-install --all | --org <slug> [--world <slug>] [--category <category>]");
    process.exit(2);
}

try {
    const report = await installPlatformComponents({
        all,
        organizationSlug,
        worldSlug: option("world"),
        category: option("category"),
    });
    if (report.worlds.length === 0) console.error("No world matches.");
    for (const world of report.worlds) {
        console.info(`${world.organizationSlug}/${world.worldSlug}: ${report.components} components handled`);
    }
    console.info(
        `catalog: ${Object.entries(report.results)
            .map(([result, count]) => `${count} ${result}`)
            .join(", ")}`,
    );
    process.exitCode = bulkInstallSucceeded(report) ? 0 : 1;
} finally {
    await closeDb();
}
