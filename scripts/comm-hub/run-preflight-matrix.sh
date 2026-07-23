#!/usr/bin/env bash
# Phase 4B3 — Checkpoint 2B Preflight Verification Matrix runner.
#
# Item G: never prints connection string, username, host, or password. All
#         diagnostic messages are sanitized. Output stream is piped through
#         a sed redaction filter.
# Item H: the connection URI is passed to psql via the PGDATABASE environment
#         variable — NEVER on the command line. This keeps the secret out of
#         `ps`, /proc/*/cmdline, shell history, and CI job logs. psql treats
#         PGDATABASE as a connection URI when its value begins with
#         `postgres://` or `postgresql://` (libpq behaviour).
# Item J: no production override exists. The runner requires an explicit
#         non-production ack (COMM_HUB_TEST_ENVIRONMENT=test|staging), the
#         URL must not look like production, and the same env marker is
#         passed into psql (-v env=...) so the SQL matrix enforces server ↔
#         client agreement.

set -euo pipefail

# --- 1. Required environment ------------------------------------------------
if [ -z "${COMM_HUB_TEST_DB_URL:-}" ]; then
  echo "ERROR: COMM_HUB_TEST_DB_URL is not set (never echoed)." >&2
  exit 2
fi

TEST_ENV="${COMM_HUB_TEST_ENVIRONMENT:-}"
case "$(printf '%s' "$TEST_ENV" | tr '[:upper:]' '[:lower:]')" in
  test|staging) ;;
  *)
    echo "ERROR: COMM_HUB_TEST_ENVIRONMENT must equal 'test' or 'staging'." >&2
    echo "       Production and unmarked environments are rejected unconditionally." >&2
    exit 3
    ;;
esac
NORMALIZED_ENV="$(printf '%s' "$TEST_ENV" | tr '[:upper:]' '[:lower:]')"

# --- 2. Production refusal --------------------------------------------------
if printf '%s' "${COMM_HUB_TEST_DB_URL}" \
     | grep -qiE 'prod|xynceskeiiisiefqlgxo'; then
  echo "ERROR: connection target looks like production. Refusing." >&2
  exit 4
fi

SQL_FILE="supabase/tests/comm-hub/preflight_verification_matrix.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: matrix file not found at $SQL_FILE" >&2
  exit 5
fi

echo "Running Communication Hub preflight matrix against approved non-production database."

# --- 3. Execute -------------------------------------------------------------
# The DB URI is passed via PGDATABASE (env, not argv). Never pass the URL via
# `-d "$COMM_HUB_TEST_DB_URL"` or as any positional argument.
PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}" \
PGDATABASE="${COMM_HUB_TEST_DB_URL}" \
  psql \
    -v ON_ERROR_STOP=1 \
    -v "env=${NORMALIZED_ENV}" \
    -f "$SQL_FILE" \
    2>&1 \
  | sed -E 's#postgres(ql)?://[^ ]*#postgres://<redacted>#g'

echo "Matrix completed."
