#!/usr/bin/env bash
# Phase 4B3 — Checkpoint 2B Preflight Verification Matrix runner.
#
# Executes supabase/tests/comm-hub/preflight_verification_matrix.sql against
# an approved test or staging database using a service-role connection.
#
# Contract:
#   * Never targets production by default. If the connection string / database
#     name contains "prod" the runner exits with an error unless the caller
#     sets COMM_HUB_ALLOW_PROD=YES (still gated by the SQL matrix, which will
#     refuse to run against a database whose name matches /prod/i without an
#     equivalent server-side flag).
#   * The SQL file wraps every case in BEGIN/ROLLBACK, so no rows persist even
#     on success.
#   * The whole matrix aborts on the first failed assertion (ON_ERROR_STOP=1)
#     and the CI job fails.
#   * Requires a connection string with sufficient privilege to INSERT/UPDATE
#     communication_preview_snapshot and communication_preview_approval — in
#     practice, the Supabase service-role or the postgres superuser role.
#
# Usage (locally / CI):
#   COMM_HUB_TEST_DB_URL='postgres://service_role:...@host:5432/db' \
#     scripts/comm-hub/run-preflight-matrix.sh
#
# Never place service-role credentials in the repository. In GitHub Actions
# they must come from a secret (e.g. secrets.COMM_HUB_TEST_DB_URL).

set -euo pipefail

CONN="${COMM_HUB_TEST_DB_URL:-${DATABASE_URL:-}}"
if [ -z "$CONN" ]; then
  echo "ERROR: set COMM_HUB_TEST_DB_URL (or DATABASE_URL) to a service-role connection string." >&2
  exit 2
fi

# Refuse production unless explicitly allowed.
if echo "$CONN" | grep -qiE 'prod|xynceskeiiisiefqlgxo'; then
  if [ "${COMM_HUB_ALLOW_PROD:-}" != "YES" ]; then
    echo "ERROR: connection string looks like production. Set COMM_HUB_ALLOW_PROD=YES to override (not recommended)." >&2
    exit 3
  fi
fi

SQL_FILE="supabase/tests/comm-hub/preflight_verification_matrix.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: matrix file not found at $SQL_FILE" >&2
  exit 4
fi

echo "Running preflight verification matrix against: ${CONN%%@*}@***"
psql "$CONN" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
