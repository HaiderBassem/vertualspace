import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Server code reads its configuration from process.env (src/lib/server/config.ts). In development,
// expose .env there too; variables already set in the real environment win.
for (const [key, value] of Object.entries(loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""))) {
    process.env[key] ??= value;
}

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    server: {
        port: 4000,
        host: true,
    },
    preview: {
        port: 4000,
    },
    test: {
        include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
        environment: "node",
        // One file at a time: database tests share the .env database, and some change instance-wide state
        // (instance settings, the job queue) that other files read.
        fileParallelism: false,
    },
});
