import {generateConfig} from "@workadventure/eslint-config";

export default [
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            // Custom rules for map-editor goes here.
        }
    },
    {
        // The model code is shared, character for character, with AdminSpace (see Model3D/types.ts), whose stricter
        // TypeScript settings need the non-null assertions this rule would remove.
        files: ["src/Model3D/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unnecessary-type-assertion": "off",
        }
    }
];
