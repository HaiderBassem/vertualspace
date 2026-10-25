# syntax=docker/dockerfile:1

# ---- Build ---------------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The server validates its configuration when SvelteKit analyses it during the build: give it
# throwaway values. They are NOT part of the final image.
ARG BUILD_ONLY_SECRET=build-only-not-a-secret-0123456789abcdef0123456789abcdef
RUN ADMIN_API_TOKEN=$BUILD_ONLY_SECRET APP_SECRET=$BUILD_ONLY_SECRET npx svelte-kit sync \
    && ADMIN_API_TOKEN=$BUILD_ONLY_SECRET APP_SECRET=$BUILD_ONLY_SECRET npm run build \
    # The CLI scripts are TypeScript: bundle them so the runtime image does not need tsx.
    #   node build/cli/migrate.js | create-superadmin.js --email .. --name .. | retention.js
    #   node build/cli/seed.js --from <dir with woka.json and companions.json>
    #   node build/cli/catalog-import.js (built-in office components, from /app/catalog/builtin)
    #   node build/cli/catalog-install.js --org <slug> [--world <slug>] [--category nature] | --all
    && for script in migrate create-superadmin retention seed catalog-import catalog-install; do \
        npx esbuild "scripts/$script.ts" --bundle --platform=node --format=esm --target=node22 \
            --packages=external --alias:@sveltejs/kit=./scripts/shims/sveltejs-kit.ts \
            --outfile="build/cli/$script.js" || exit 1; \
    done \
    && npm prune --omit=dev --no-audit --no-fund

# ---- Runtime -------------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=UTC \
    # The CSV member import accepts up to 1 MB; adapter-node's default body limit is 512K.
    BODY_SIZE_LIMIT=2M

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/catalog ./catalog
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/adminspace-entrypoint
RUN chmod 0755 /usr/local/bin/adminspace-entrypoint

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/adminspace-entrypoint"]
CMD ["node", "build/index.js"]
