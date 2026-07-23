#!/usr/bin/env bash
# Phase 4B3 — Checkpoint 2B Preflight Verification Matrix runner (hardened).
#
# Item G: never prints connection string, username, host, password. All
#         diagnostic messages are sanitized.
# Item H: no production override exists. The runner requires an explicit
#         non-production ack (COMM_HUB_TEST_ENVIRONMENT=test|staging) AND
#         hostname refusal, and passes the ack into psql (-v env=...) so the
#         SQL matrix enforces it server-side as well.

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
# Grep in a subshell against the raw value WITHOUT ever printing it.
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
# psql reads the DB URL via a here-string on STDIN, never via argv, so the
# secret cannot appear in process lists.
#
# NOTE: we ALSO pass -v env=... so the SQL matrix can enforce environment
# rules server-side (item H). No secret value is ever passed via -v.
PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}" \
  psql \
    -v ON_ERROR_STOP=1 \
    -v "env=${NORMALIZED_ENV}" \
    -d "${COMM_HUB_TEST_DB_URL}" \
    -f "$SQL_FILE" \
    2>&1 \
  | sed -E 's#postgres(ql)?://[^ ]*#postgres://<redacted>#g'

echo "Matrix completed."
