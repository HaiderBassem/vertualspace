#!/usr/bin/env bash
# Restores a dump made by scripts/backup.sh into a target database, then prints the number of rows of
# every table as a verification summary.
#
#   scripts/restore.sh [connection options] [--create] [--force] <file.dump>
#
# Where pg_restore runs: same modes as scripts/backup.sh (local with --database-url/$DATABASE_URL,
# --compose-file ... [--service postgres], or --container NAME). The target database is the one of the
# URL, or --dbname in the container modes.
#
# Safety:
#   - The checksum file <file.dump>.sha256 is verified when present (--no-verify skips it).
#   - A target database that already holds tables is refused. --force drops every schema of the target
#     database (public, drizzle, ...) before restoring: ALL ITS DATA IS LOST.
#   - The restore runs in a single transaction: on error, the target is left as it was before pg_restore.
#   - Objects are restored without their original owner and privileges (--no-owner --no-privileges): they
#     belong to the role used for the restore, which must be the role Adminspace connects with.
#
# Examples:
#   # disaster recovery into the compose stack (stop the app first, see docs/OPERATIONS.md)
#   scripts/restore.sh --compose-file deploy/docker-compose.prod.yaml --env-file deploy/.env.prod \
#       --force /var/backups/adminspace/adminspace_20261023T020000Z.dump
#   # restore drill into a scratch database
#   scripts/restore.sh --database-url postgres://user:pass@localhost:5432/restore_drill --create backup.dump
set -euo pipefail

usage() {
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    cat <<'EOF'
Options:
  --database-url URL     local mode: URL of the TARGET database (default: $DATABASE_URL)
  --compose-file FILE    compose mode: compose file
  --env-file FILE        compose mode: --env-file given to docker compose
  --project-name NAME    compose mode: compose project name
  --service NAME         compose mode: PostgreSQL service (default: postgres)
  --container NAME       container mode: container name or id
  --dbname NAME          container modes: target database (default: the container's POSTGRES_DB)
  --username NAME        container modes: role (default: the container's POSTGRES_USER)
  --create               create the target database when it does not exist (needs CREATEDB)
  --force                overwrite a non-empty target database (drops all its schemas first)
  --no-verify            do not check <file>.sha256
  -h, --help             this help
EOF
}

die() {
    echo "restore: $*" >&2
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
CREATE=false
FORCE=false
VERIFY=true
DUMP=""

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
        --create) CREATE=true; shift ;;
        --force) FORCE=true; shift ;;
        --no-verify) VERIFY=false; shift ;;
        -h | --help) usage; exit 0 ;;
        -*) die "unknown option: $1 (see --help)" ;;
        *) [ -z "$DUMP" ] || die "only one dump file can be restored"; DUMP="$1"; shift ;;
    esac
done

[ -n "$DUMP" ] || die "missing dump file (see --help)"
[ -f "$DUMP" ] || die "$DUMP: no such file"
[ -n "$COMPOSE_FILE" ] && [ -n "$CONTAINER" ] && die "use either --compose-file or --container, not both"

sha256_check() {
    if command -v sha256sum >/dev/null; then sha256sum -c --status "$1"; else shasum -a 256 -c --status "$1"; fi
}

if [ "$VERIFY" = true ] && [ -f "$DUMP.sha256" ]; then
    (cd "$(dirname "$DUMP")" && sha256_check "$(basename "$DUMP").sha256") || die "checksum mismatch for $DUMP"
    echo "restore: checksum OK" >&2
elif [ "$VERIFY" = true ]; then
    echo "restore: no $DUMP.sha256, checksum not verified" >&2
fi

# --- How to run the PostgreSQL client tools (see scripts/backup.sh) ---------------------------
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
    ${RUNNER[@]+"${RUNNER[@]}"} "$@"
}

if [ "$MODE" = "local" ]; then
    [ -n "$DATABASE_URL_ARG" ] || die "no target: pass --database-url, set DATABASE_URL, or use --compose-file/--container"
    command -v pg_restore >/dev/null || die "pg_restore not found: install the PostgreSQL client"
    command -v psql >/dev/null || die "psql not found: install the PostgreSQL client"
    base="${DATABASE_URL_ARG%%\?*}"
    query=""
    [ "$base" != "$DATABASE_URL_ARG" ] && query="?${DATABASE_URL_ARG#*\?}"
    DBNAME="${base##*/}"
    [ -n "$DBNAME" ] && [ "$DBNAME" != "$base" ] || die "the URL must name the target database"
    MAINTENANCE_URL="${base%/*}/postgres${query}"
    CONN=(--dbname="$DATABASE_URL_ARG")
    MAINT_CONN=(--dbname="$MAINTENANCE_URL")
else
    [ -n "$DBUSER" ] || DBUSER="$(run printenv POSTGRES_USER 2>/dev/null || true)"
    [ -n "$DBNAME" ] || DBNAME="$(run printenv POSTGRES_DB 2>/dev/null || true)"
    [ -n "$DBUSER" ] || die "could not read POSTGRES_USER in the container: pass --username"
    [ -n "$DBNAME" ] || DBNAME="$DBUSER"
    CONN=(--username="$DBUSER" --dbname="$DBNAME")
    MAINT_CONN=(--username="$DBUSER" --dbname=postgres)
fi
case "$DBNAME" in *[!A-Za-z0-9_]*) die "target database name must only contain letters, digits and '_': $DBNAME" ;; esac

psql_q() {
    # psql_q <connection args...> -- <sql>: one value per line, unaligned, stop on error.
    run psql -X -q -v ON_ERROR_STOP=1 -At "$@"
}

# --- Target checks ---------------------------------------------------------------------------
exists="$(psql_q "${MAINT_CONN[@]}" -c "select 1 from pg_database where datname = '$DBNAME'")"
if [ "$exists" != "1" ]; then
    [ "$CREATE" = true ] || die "database $DBNAME does not exist (use --create)"
    psql_q "${MAINT_CONN[@]}" -c "create database \"$DBNAME\""
    echo "restore: created database $DBNAME" >&2
fi

SCHEMA_FILTER="nspname not in ('pg_catalog', 'information_schema') and nspname not like 'pg\\_toast%' and nspname not like 'pg\\_temp%'"
relations="$(psql_q "${CONN[@]}" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r', 'p', 'v', 'm', 'S') and $SCHEMA_FILTER")"
if [ "$relations" != "0" ]; then
    [ "$FORCE" = true ] || die "database $DBNAME is not empty ($relations tables, views or sequences): refusing to overwrite it without --force"
    echo "restore: --force: dropping every schema of $DBNAME ($relations relations)" >&2
    psql_q "${CONN[@]}" -1 <<SQL
set local client_min_messages = warning;
do \$\$
declare s record;
begin
    for s in select nspname from pg_namespace where $SCHEMA_FILTER loop
        execute format('drop schema %I cascade', s.nspname);
    end loop;
end
\$\$;
create schema if not exists public;
SQL
fi

# --- Restore ---------------------------------------------------------------------------------
echo "restore: restoring $DUMP into $DBNAME" >&2
started=$(date +%s)
run pg_restore --exit-on-error --single-transaction --no-owner --no-privileges "${CONN[@]}" <"$DUMP"
echo "restore: done in $(($(date +%s) - started))s" >&2

# --- Verification: rows per table -----------------------------------------------------------
echo "restore: rows per table in $DBNAME" >&2
psql_q "${CONN[@]}" -F $'\t' <<SQL
select format('select %L as "table", count(*) as "rows" from %I.%I', n.nspname || '.' || c.relname, n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and $SCHEMA_FILTER
order by n.nspname, c.relname
\gexec
SQL
