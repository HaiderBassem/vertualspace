/**
 * Keeps the 3D model code identical in AdminSpace and in WorkAdventure's play front: this directory is the original,
 * WorkAdventure's `libs/map-editor/src/Model3D/` holds the copy the game uses.
 *
 *   npm run model3d:sync            # copies the files
 *   npm run model3d:sync -- --check # fails when the copy differs (used by the tests)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const FILES = ["types.ts", "render.ts"];
const from = path.resolve(import.meta.dirname, "../src/lib/catalog/model3d");
const to = path.resolve(import.meta.dirname, "../../workadventure/libs/map-editor/src/Model3D");

if (process.argv.includes("--check")) {
    const different = FILES.filter(
        (file) =>
            !existsSync(path.join(to, file)) ||
            readFileSync(path.join(from, file), "utf8") !== readFileSync(path.join(to, file), "utf8"),
    );
    if (different.length > 0) {
        console.error(`Out of step with ${to}: ${different.join(", ")}. Run npm run model3d:sync.`);
        process.exit(1);
    }
    console.info("model3d: in step");
} else {
    mkdirSync(to, { recursive: true });
    for (const file of FILES) copyFileSync(path.join(from, file), path.join(to, file));
    console.info(`model3d: ${FILES.join(", ")} copied to ${path.relative(process.cwd(), to)}`);
}
