import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({ out: "build" }),
        alias: {
            $contract: "src/lib/contract",
            $server: "src/lib/server",
        },
        csrf: {
            // The Admin API (/api/*) is called server-to-server by WorkAdventure with JSON bodies.
            // Form posts from the back office still get SvelteKit's origin check (see hooks.server.ts).
            trustedOrigins: [],
        },
        csp: {
            mode: "auto",
            directives: {
                "default-src": ["self"],
                "img-src": ["self", "data:", "https:", "http:"],
                "style-src": ["self", "unsafe-inline"],
                "script-src": ["self"],
                "connect-src": ["self"],
                // No page may be framed; hooks.server.ts allows only WorkAdventure's play origin on /profile.
                "frame-ancestors": ["none"],
                "object-src": ["none"],
                "base-uri": ["self"],
                "form-action": ["self"],
            },
        },
    },
};

export default config;
