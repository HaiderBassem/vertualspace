#!/bin/sh
# Applies pending database migrations, then starts the given command (the SvelteKit server).
# Set SKIP_MIGRATIONS=true when migrations are run separately (e.g. a Kubernetes Job).
set -eu

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
    node build/cli/migrate.js
fi

# Publish the shared built-in maps and furniture on fresh installations and upgrades.
# Import is idempotent: existing versions and organization-owned components are preserved.
if [ "${SKIP_CATALOG_IMPORT:-false}" != "true" ]; then
    node build/cli/catalog-import.js
fi

exec "$@"
