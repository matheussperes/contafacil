#!/usr/bin/env bash
# Valida o banco da FASE 02 sem Docker/Supabase CLI:
# sobe um Postgres local efêmero, aplica o shim de auth, todas as
# migrations, o seed e a suíte de testes (RLS + comportamento).
#
# Uso: supabase/tests/run-local.sh [diretório-de-trabalho]
# Requisitos: binários do PostgreSQL 15+ no PATH (initdb, pg_ctl, psql).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKDIR="${1:-$(mktemp -d)}"
PGDATA="$WORKDIR/pgdata"
PGPORT="${PGPORT:-55432}"
PGHOST="$WORKDIR"
DB=contafacil_test

export PGHOST PGPORT

cleanup() {
  if [ -f "$PGDATA/postmaster.pid" ]; then
    pg_ctl -D "$PGDATA" stop -m immediate -s || true
  fi
}
trap cleanup EXIT

if [ ! -d "$PGDATA" ]; then
  initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 >/dev/null
fi

pg_ctl -D "$PGDATA" -o "-p $PGPORT -k $PGHOST -c listen_addresses=''" -l "$WORKDIR/pg.log" start -s

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qc "drop database if exists $DB;"
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qc "create database $DB;"

echo "==> shim de auth (somente local)"
psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$REPO_ROOT/supabase/tests/auth-shim.sql"

echo "==> migrations"
for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
  echo "    - $(basename "$f")"
  psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "==> seed"
psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$REPO_ROOT/supabase/seed.sql"

echo "==> testes"
psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$REPO_ROOT/supabase/tests/database.test.sql"

echo "OK: migrations + seed + testes verdes."
