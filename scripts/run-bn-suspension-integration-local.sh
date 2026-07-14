#!/usr/bin/env sh
# BN-ENV-T1 — local wrapper for the BN suspension integration suite.
# Refuses every non-local Supabase URL. Cleans up on any exit.
#
# Requirements on developer machine:
#   * Docker running
#   * Supabase CLI installed and on PATH
#   * Bun installed (matches packageManager)

set -eu

LIVE_REF="xynceskeiiisiefqlgxo"

log() { printf '[bn-env-t1] %s\n' "$*"; }

cleanup() {
  status=$?
  log "cleaning up local Supabase (exit=$status)"
  supabase stop --no-backup >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM HUP

command -v supabase >/dev/null 2>&1 || {
  log "ERROR: supabase CLI not found on PATH"; exit 2;
}
command -v docker >/dev/null 2>&1 || {
  log "ERROR: docker not found on PATH"; exit 2;
}
command -v bun >/dev/null 2>&1 || {
  log "ERROR: bun not found on PATH"; exit 2;
}

log "starting local Supabase"
supabase start

log "resetting local database (applying all migrations)"
supabase db reset --local

log "loading local credentials"
supabase status -o env > .supabase.local.env
# shellcheck disable=SC1091
. ./.supabase.local.env
rm -f .supabase.local.env

# Enforce local-only URL.
case "${API_URL:-}" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *)
    log "ERROR: refusing non-local API_URL: ${API_URL:-<unset>}"; exit 3 ;;
esac

# Denylist the live project ref anywhere in credentials.
if printf '%s%s%s' "${API_URL:-}" "${ANON_KEY:-}" "${SERVICE_ROLE_KEY:-}" \
   | grep -q "$LIVE_REF"; then
  log "ERROR: denylisted live project ref found in credentials"; exit 3
fi

BN_TEST_SUPABASE_URL="${API_URL}"
BN_TEST_ANON_KEY="${ANON_KEY}"
BN_TEST_SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
BN_TEST_CONFIRM_NONPROD="YES"
BN_TEST_ENVIRONMENT="LOCAL_SUPABASE"
export BN_TEST_SUPABASE_URL BN_TEST_ANON_KEY BN_TEST_SUPABASE_SERVICE_ROLE_KEY \
       BN_TEST_CONFIRM_NONPROD BN_TEST_ENVIRONMENT

log "running BN suspension integration tests"
bun run test:bn-suspension-integration

log "done"
