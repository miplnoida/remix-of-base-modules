#!/usr/bin/env bash
# Phase 4B3 — Checkpoint 2B Pre-Dispatch Static Lint (item I).
#
# Fast, deterministic static checks that must pass before configuring the
# secret and dispatching the workflow. Does NOT touch the database.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MATRIX="$REPO_ROOT/supabase/tests/comm-hub/preflight_verification_matrix.sql"
RUNNER="$REPO_ROOT/scripts/comm-hub/run-preflight-matrix.sh"
WORKFLOW="$REPO_ROOT/.github/workflows/comm-hub-preflight-matrix.yml"

fail() { echo "STATIC_LINT_FAIL: $*" >&2; exit 1; }
pass() { echo "  ok — $*"; }

echo "== Pre-dispatch static lint =="

# 1. No obsolete blocker codes remain in the matrix.
#    Each entry is: "regex|negative-guard" — matches that also match the
#    negative-guard are ignored (used to exclude canonical prefixes/suffixes).
OBSOLETE=(
  "PREVIEW_EXPIRED[^_A-Z]|"
  "PLACEHOLDER_SCANNER_VERSION_STALE|"
  "RAW_PLACEHOLDERS_PRESENT|"
  "RENDERER_UNRESOLVED_VARIABLES|"
  "REQUIRED_VARIABLES_UNRESOLVED|"
  "RECIPIENT_CONTAINERS_INVALID|"
  "RECIPIENT_ENTRIES_INVALID|"
  "RECIPIENT_DUPLICATE_POLICY_VIOLATED|"
  "APPROVAL_NOT_ACTIVE|PREVIEW_APPROVAL_NOT_ACTIVE"
  "APPROVAL_CORRELATION_MISMATCH|APPROVAL_PREVIEW_CORRELATION_MISMATCH"
)
for entry in "${OBSOLETE[@]}"; do
  pat="${entry%%|*}"
  guard="${entry#*|}"
  if [ -n "$guard" ]; then
    hits=$(grep -nE "$pat" "$MATRIX" | grep -vE "$guard" || true)
  else
    hits=$(grep -nE "$pat" "$MATRIX" || true)
  fi
  if [ -n "$hits" ]; then
    printf '%s\n' "$hits" >&2
    fail "obsolete blocker code pattern present in matrix: $pat"
  fi
done
pass "no obsolete blocker codes in matrix"

# 2. Canonical hash inputs are reused (frozen vars) — no separate now() or
#    SELECT id FROM auth.users during compute+insert.
if ! grep -q "v_approved_by\s*uuid" "$MATRIX"; then
  fail "matrix does not declare frozen v_approved_by"
fi
if ! grep -q "v_approval_expires_at\s*timestamptz" "$MATRIX"; then
  fail "matrix does not declare frozen v_approval_expires_at"
fi
# The compute + approval-insert block must NOT re-derive now() / auth.users lookup.
if awk '/BEGIN A: freeze/{p=1} /END A: freeze/{p=0} p' "$MATRIX" \
     | grep -qE '(SELECT id FROM auth\.users|now\(\))'; then
  fail "canonical hash block re-derives now() or SELECT id FROM auth.users"
fi
pass "canonical hash inputs reused (frozen vars)"

# 3. No ALTER TABLE ... DISABLE TRIGGER anywhere in the matrix.
if grep -nE 'ALTER[[:space:]]+TABLE.*DISABLE[[:space:]]+TRIGGER' "$MATRIX"; then
  fail "matrix contains ALTER TABLE DISABLE TRIGGER (item D forbids this)"
fi
pass "no ALTER TABLE DISABLE TRIGGER in matrix"

# 4. AUTH_3 does not SELECT an existing admin — must always synthesize.
if grep -nE "SELECT[[:space:]]+user_id[[:space:]]+INTO[[:space:]]+v_uid[[:space:]]+FROM[[:space:]]+public\.user_roles" "$MATRIX"; then
  fail "AUTH_3 selects an existing admin — must always create synthetic identity (item E)"
fi
if ! grep -q "AUTH_3: synthetic operator admin was rejected" "$MATRIX"; then
  fail "AUTH_3 synthetic-only branch not detected"
fi
pass "AUTH_3 always creates synthetic operator-admin"

# 5. Readiness step exports DATABASE_URL.
if ! awk '/name: Service \/ readiness tests/,/^      - name:/' "$WORKFLOW" \
     | grep -q "DATABASE_URL: \${{ secrets.COMM_HUB_TEST_DB_URL }}"; then
  fail "workflow readiness step does not export DATABASE_URL"
fi
pass "workflow readiness step exports DATABASE_URL"

# 6. SQL requires a server-side environment marker AND server==client.
if ! grep -q "SERVER_ENVIRONMENT_MARKER_REQUIRED" "$MATRIX"; then
  fail "matrix does not require a server-side app.environment marker"
fi
if ! grep -q "SERVER_CLIENT_ENVIRONMENT_MISMATCH" "$MATRIX"; then
  fail "matrix does not require server == client environment marker"
fi
# There must be no "OR" that lets client marker alone satisfy the gate.
if grep -qE "app\.environment.*OR.*app\.matrix_cli_env" "$MATRIX"; then
  fail "matrix still allows client marker to replace server marker (item G)"
fi
pass "matrix enforces server-side env marker and server==client agreement"

# 7. Runner does not pass DB URL through argv.
if grep -qE 'psql[^\n]*-d[[:space:]]+"?\$?\{?COMM_HUB_TEST_DB_URL' "$RUNNER"; then
  fail "runner passes COMM_HUB_TEST_DB_URL via -d (must use PGDATABASE env)"
fi
if ! grep -q 'PGDATABASE="\${COMM_HUB_TEST_DB_URL}"' "$RUNNER"; then
  fail "runner does not pass DB URL via PGDATABASE env (item H)"
fi
pass "runner does not pass DB URL through argv"

# 8. Workflow is manual-dispatch only.
if grep -qE '^on:[[:space:]]*$' "$WORKFLOW" \
   && grep -qE '^\s*(push|pull_request|schedule):' "$WORKFLOW"; then
  fail "workflow has non-manual triggers"
fi
if ! grep -q "workflow_dispatch:" "$WORKFLOW"; then
  fail "workflow is not manual-dispatch"
fi
pass "workflow is manual-dispatch only"

# 9. No production override exists anywhere.
if grep -rniE 'COMM_HUB_ALLOW_PROD|ALLOW_PRODUCTION_MATRIX' "$RUNNER" "$WORKFLOW" "$MATRIX"; then
  fail "production override token present"
fi
pass "no production override present"

echo "STATIC_LINT_OK"
