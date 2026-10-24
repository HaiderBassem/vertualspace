#!/bin/sh
# Generates integration/live-test/.env with fresh random secrets for the disposable test stack.
# Usage: integration/live-test/make-env.sh /path/to/workadventure-checkout
set -eu
cd "$(dirname "$0")"
REPO="${1:-$(cd ../../.. && pwd)/workadventure}"
[ -d "$REPO/maps" ] || { echo "WorkAdventure checkout not found at $REPO" >&2; exit 1; }
[ -f .env ] && { echo ".env already exists: delete it to regenerate" >&2; exit 1; }
umask 077
{
    echo "VERSION=master"
    echo "WORKADVENTURE_REPO=$REPO"
    echo "SECRET_KEY=$(openssl rand -hex 32)"
    echo "ADMIN_API_TOKEN=$(openssl rand -hex 32)"
    echo "ADMIN_SOCKETS_TOKEN=$(openssl rand -hex 32)"
    echo "ROOM_API_SECRET_KEY=$(openssl rand -hex 32)"
    echo "MAP_STORAGE_API_TOKEN=$(openssl rand -hex 32)"
    echo "APP_SECRET=$(openssl rand -hex 32)"
    echo "SETUP_TOKEN=$(openssl rand -hex 16)"
    echo "ADMIN_API_URL=http://adminspace:3000"
    echo "ADMIN_URL=http://localhost:4100"
    echo "OPID_PROFILE_SCREEN_PROVIDER=http://localhost:4100/profile"
} > .env
openssl rand -base64 24 | tr -d '\n' > admin-password
echo "Wrote .env and admin-password (not printed)."
