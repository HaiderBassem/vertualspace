#!/bin/sh
# Applies pending database migrations, then starts the given command (the SvelteKit server).
# Set SKIP_MIGRATIONS=true when migrations are run separately (e.g. a Kubernetes Job).
set -eu

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
    node build/cli/migrate.js
fi

exec "$@"
