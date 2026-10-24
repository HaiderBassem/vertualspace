/**
 * Builds the production server for the end-to-end tests and copies it to
 * node_modules/.cache/adminspace-e2e/build (ignored by git, ESLint and Prettier).
 *
 * The copy keeps the e2e server independent from later `npm run build` runs (SvelteKit loads route
 * chunks lazily, so rebuilding build/ under a running server would break it). Node resolves the
 * server's external dependencies from the project's node_modules.
 *
 *   npx tsx scripts/e2e-build.ts            # build + copy
 *   npx tsx scripts/e2e-build.ts --no-build # copy the existing build/ only
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "node_modules/.cache/adminspace-e2e/build");

if (!process.argv.includes("--no-build")) {
    // Throwaway secrets: the build validates the configuration at import time, the values are not kept.
    const result = spawnSync("npm", ["run", "build"], {
        cwd: root,
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_ENV: "production",
            ADMIN_API_TOKEN: randomBytes(32).toString("hex"),
            APP_SECRET: randomBytes(32).toString("hex"),
        },
    });
    if (result.status !== 0) {
        console.error("e2e: npm run build failed");
        process.exit(result.status ?? 1);
    }
}

const source = path.join(root, "build");
if (!existsSync(path.join(source, "index.js"))) {
    console.error("e2e: build/index.js is missing; run without --no-build");
    process.exit(1);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.info(`e2e: production server copied to ${path.relative(root, target)}`);
