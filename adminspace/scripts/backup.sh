#!/usr/bin/env bash
# Backs up the Adminspace PostgreSQL database with pg_dump (custom format), writes a SHA-256 checksum next
# to the dump, verifies that the archive is readable, and prunes old dumps.
#
# Where pg_dump runs (pick one):
#   (default)             local pg_dump, connection from --database-url or $DATABASE_URL
#   --compose-file FILE   `docker compose exec` in the PostgreSQL service of a compose project
#                         (with --env-file, --project-name, --service; deploy/docker-compose.prod.yaml)
#   --container NAME      `docker exec` in a running PostgreSQL container
# In the container modes, pg_dump runs inside the container (same major version as the server) and the
# role and database default to the container's POSTGRES_USER and POSTGRES_DB.
#
# Examples:
#   scripts/backup.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod \
#       --output-dir /var/backups/adminspace --keep 14 --max-age-days 35
#   DATABASE_URL=postgres://user:pass@db:5432/adminspace scripts/backup.sh --output-dir ./backups
#
# Output: <output-dir>/<prefix>_<YYYYMMDDTHHMMSSZ>.dump (ISO 8601 basic format, UTC) and <same>.dump.sha256
# (verify with: sha256sum -c <file>.sha256). The path of the new dump is printed on stdout; everything
# else goes to stderr. Exit status is non-zero on any failure; a failed run leaves no partial dump.
#
# Dumps contain personal data, password hashes and encrypted 2FA secrets: they are created with mode 0600.
# Restoring a dump also needs the APP_SECRET of the instance (2FA secrets are encrypted with it).
set -euo pipefail

usage() {
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    cat <<'EOF'
Options:
  --database-url URL     connection URL for the local mode (default: $DATABASE_URL)
  --compose-file FILE    compose mode: compose file (repeatable is not supported; use one file)
  --env-file FILE        compose mode: --env-file given to docker compose
  --project-name NAME    compose mode: compose project name
  --service NAME         compose mode: PostgreSQL service (default: postgres)
  --container NAME       container mode: container name or id
  --dbname NAME          container modes: database (default: the container's POSTGRES_DB)
  --username NAME        container modes: role (default: the container's POSTGRES_USER)
  --output-dir DIR       where dumps are written (default: $BACKUP_DIR or ./backups)
  --prefix NAME          file name prefix (default: adminspace)
  --keep N               keep the N newest dumps (default: 14; 0 disables count-based pruning)
  --max-age-days D       delete dumps older than D days (default: 35; 0 disables age-based pruning)
                         The dump made by this run is never deleted.
  -h, --help             this help
EOF
}

die() {
    echo "backup: $*" >&2
    exit 1
}

DATABASE_URL_ARG="${DATABASE_URL:-}"
COMPOSE_FILE=""
COMPOSE_ENV_FILE=""
COMPOSE_PROJECT=""
SERVICE="postgres"
CONTAINER=""
DBNAME=""
DBUSER=""
OUTPUT_DIR="${BACKUP_DIR:-./backups}"
PREFIX="adminspace"
KEEP=14
MAX_AGE_DAYS=35

while [ $# -gt 0 ]; do
    case "$1" in
        --database-url) DATABASE_URL_ARG="${2:?}"; shift 2 ;;
        --compose-file) COMPOSE_FILE="${2:?}"; shift 2 ;;
        --env-file) COMPOSE_ENV_FILE="${2:?}"; shift 2 ;;
        --project-name) COMPOSE_PROJECT="${2:?}"; shift 2 ;;
        --service) SERVICE="${2:?}"; shift 2 ;;
        --container) CONTAINER="${2:?}"; shift 2 ;;
        --dbname) DBNAME="${2:?}"; shift 2 ;;
        --username) DBUSER="${2:?}"; shift 2 ;;
        --output-dir) OUTPUT_DIR="${2:?}"; shift 2 ;;
        --prefix) PREFIX="${2:?}"; shift 2 ;;
        --keep) KEEP="${2:?}"; shift 2 ;;
        --max-age-days) MAX_AGE_DAYS="${2:?}"; shift 2 ;;
        -h | --help) usage; exit 0 ;;
        *) die "unknown option: $1 (see --help)" ;;
    esac
done

case "$KEEP" in '' | *[!0-9]*) die "--keep must be a non-negative integer" ;; esac
case "$MAX_AGE_DAYS" in '' | *[!0-9]*) die "--max-age-days must be a non-negative integer" ;; esac
case "$PREFIX" in '' | *[!A-Za-z0-9_.-]*) die "--prefix may only contain letters, digits, '.', '_' and '-'" ;; esac
[ -n "$COMPOSE_FILE" ] && [ -n "$CONTAINER" ] && die "use either --compose-file or --container, not both"

# --- How to run the PostgreSQL client tools -------------------------------------------------
# RUNNER is the command prefix (empty in local mode); CONN the connection arguments.
RUNNER=()
MODE="local"
if [ -n "$COMPOSE_FILE" ]; then
    MODE="compose"
    RUNNER=(docker compose -f "$COMPOSE_FILE")
    [ -n "$COMPOSE_ENV_FILE" ] && RUNNER+=(--env-file "$COMPOSE_ENV_FILE")
    [ -n "$COMPOSE_PROJECT" ] && RUNNER+=(-p "$COMPOSE_PROJECT")
    RUNNER+=(exec -T "$SERVICE")
elif [ -n "$CONTAINER" ]; then
    MODE="container"
    RUNNER=(docker exec -i "$CONTAINER")
fi

run() {
    # bash 3.2 (macOS) treats an empty array as unset under `set -u`: expand it conditionally.
    ${RUNNER[@]+"${RUNNER[@]}"} "$@"
}

if [ "$MODE" = "local" ]; then
    [ -n "$DATABASE_URL_ARG" ] || die "no database: pass --database-url, set DATABASE_URL, or use --compose-file/--container"
    command -v pg_dump >/dev/null || die "pg_dump not found: install the PostgreSQL client (same major version as the server or newer)"
    CONN=(--dbname="$DATABASE_URL_ARG")
    TARGET_LABEL="$(printf '%s' "$DATABASE_URL_ARG" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#')"
else
    [ -n "$DBUSER" ] || DBUSER="$(run printenv POSTGRES_USER 2>/dev/null || true)"
    [ -n "$DBNAME" ] || DBNAME="$(run printenv POSTGRES_DB 2>/dev/null || true)"
    [ -n "$DBUSER" ] || die "could not read POSTGRES_USER in the container: pass --username"
    [ -n "$DBNAME" ] || DBNAME="$DBUSER"
    CONN=(--username="$DBUSER" --dbname="$DBNAME")
    TARGET_LABEL="$MODE:${CONTAINER:-$SERVICE}/$DBNAME"
fi

sha256_of() {
    if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi
}

# --- Dump ------------------------------------------------------------------------------------
umask 077
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

LOCK_DIR="$OUTPUT_DIR/.backup.lock"
mkdir "$LOCK_DIR" 2>/dev/null || die "another backup is running in $OUTPUT_DIR (remove $LOCK_DIR if it is stale)"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="${PREFIX}_${STAMP}.dump"
FINAL="$OUTPUT_DIR/$NAME"
PARTIAL="$OUTPUT_DIR/.${NAME}.partial"

cleanup() {
    rm -f "$PARTIAL"
    rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

[ -e "$FINAL" ] && die "$FINAL already exists (one backup per second at most)"

echo "backup: dumping $TARGET_LABEL" >&2
started=$(date +%s)
# Custom format: compressed, restorable table by table, read by pg_restore. --no-owner/--no-privileges
# are applied at restore time (scripts/restore.sh), so the dump stays complete.
run pg_dump --format=custom --compress=6 "${CONN[@]}" >"$PARTIAL"
[ -s "$PARTIAL" ] || die "pg_dump produced an empty file"

# The archive must be readable: list its table of contents (pg_restore reads it from stdin).
entries="$(run pg_restore --list <"$PARTIAL" | grep -c -v '^;' || true)"
[ "$entries" -gt 0 ] || die "the dump cannot be read back by pg_restore"

mv "$PARTIAL" "$FINAL"
(cd "$OUTPUT_DIR" && sha256_of "$NAME" >"$NAME.sha256")
size=$(wc -c <"$FINAL" | tr -d ' ')
echo "backup: wrote $FINAL ($size bytes, $entries archive entries, $(($(date +%s) - started))s)" >&2

# --- Retention -------------------------------------------------------------------------------
# Dumps sort by name (UTC timestamp). Never delete the dump of this run.
pruned=0
index=0
dumps="$(
    for path in "$OUTPUT_DIR/${PREFIX}"_*.dump; do
        [ -f "$path" ] && basename "$path"
    done | grep -E "^${PREFIX}_[0-9]{8}T[0-9]{6}Z\.dump$" | sort -r || true
)"
while IFS= read -r file; do
    [ -n "$file" ] || continue
    index=$((index + 1))
    [ "$file" = "$NAME" ] && continue
    reason=""
    if [ "$KEEP" -gt 0 ] && [ "$index" -gt "$KEEP" ]; then
        reason="beyond the $KEEP newest"
    elif [ "$MAX_AGE_DAYS" -gt 0 ] && [ -n "$(find "$OUTPUT_DIR/$file" -mmin +$((MAX_AGE_DAYS * 1440)) 2>/dev/null)" ]; then
        reason="older than $MAX_AGE_DAYS days"
    fi
    if [ -n "$reason" ]; then
        rm -f "$OUTPUT_DIR/$file" "$OUTPUT_DIR/$file.sha256"
        echo "backup: pruned $file ($reason)" >&2
        pruned=$((pruned + 1))
    fi
done <<EOF
$dumps
EOF
echo "backup: retention done ($pruned pruned)" >&2

echo "$FINAL"
