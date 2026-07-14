#!/usr/bin/env sh
# BN-ENV-T1.2 — local wrapper for the BN environment + suspension static suite.
#
# Sequence:
#   check CLI + psql versions -> supabase start -> supabase db reset --local ->
#   load local credentials -> local safety verification (API_URL + DB_URL) ->
#   install auth.uid() probe via psql -> run verification SQL via psql ->
#   run environment integration tests -> run static suspension tests ->
#   run typecheck -> stop via trap.

set -eu

LIVE_REF="xynceskeiiisiefqlgxo"
REQUIRED_CLI_VERSION="1.200.3"

log() { printf '[bn-env-t1] %s\n' "$*"; }

cleanup() {
  status=$?
  log "cleaning up local Supabase (exit=$status)"
  supabase stop --no-backup >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM HUP

command -v supabase >/dev/null 2>&1 || { log "ERROR: supabase CLI not found on PATH"; exit 2; }
command -v docker   >/dev/null 2>&1 || { log "ERROR: docker not found on PATH"; exit 2; }
command -v bun      >/dev/null 2>&1 || { log "ERROR: bun not found on PATH"; exit 2; }
command -v psql     >/dev/null 2>&1 || { log "ERROR: psql not found on PATH"; exit 2; }

CLI_VERSION="$(supabase --version 2>/dev/null | awk '{print $NF}')"
log "supabase CLI version: ${CLI_VERSION} (required: ${REQUIRED_CLI_VERSION})"
if [ "${CLI_VERSION}" != "${REQUIRED_CLI_VERSION}" ]; then
  log "ERROR: pinned CLI version ${REQUIRED_CLI_VERSION} required"; exit 4
fi
log "psql version: $(psql --version)"

log "starting local Supabase"
supabase start

log "resetting local database (applying all migrations)"
supabase db reset --local

log "loading local credentials"
supabase status -o env > .supabase.local.env
# shellcheck disable=SC1091
. ./.supabase.local.env
rm -f .supabase.local.env

# API URL must be local.
case "${API_URL:-}" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) log "ERROR: refusing non-local API_URL: ${API_URL:-<unset>}"; exit 3 ;;
esac

# Explicit DB_URL guard.
if [ -z "${DB_URL:-}" ]; then
  log "ERROR: DB_URL is empty"; exit 3
fi
case "${DB_URL}" in
  postgresql://*@127.0.0.1:*|postgresql://*@localhost:*|postgres://*@127.0.0.1:*|postgres://*@localhost:*) ;;
  *) log "ERROR: refusing non-local DB_URL host"; exit 3 ;;
esac
case "${DB_URL}" in
  *supabase.co*|*supabase.com*|*pooler.supabase*)
    log "ERROR: refusing hosted Supabase DB_URL"; exit 3 ;;
esac

if printf '%s%s%s%s' "${API_URL:-}" "${ANON_KEY:-}" "${SERVICE_ROLE_KEY:-}" "${DB_URL:-}" \
   | grep -q "$LIVE_REF"; then
  log "ERROR: denylisted live project ref found in credentials"; exit 3
fi

BN_TEST_SUPABASE_URL="${API_URL}"
BN_TEST_ANON_KEY="${ANON_KEY}"
BN_TEST_SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
BN_TEST_CONFIRM_NONPROD="YES"
BN_TEST_ENVIRONMENT="LOCAL_SUPABASE"
BN_REQUIRE_LOCAL_SUPABASE_TESTS="YES"
export BN_TEST_SUPABASE_URL BN_TEST_ANON_KEY BN_TEST_SUPABASE_SERVICE_ROLE_KEY \
       BN_TEST_CONFIRM_NONPROD BN_TEST_ENVIRONMENT BN_REQUIRE_LOCAL_SUPABASE_TESTS

log "installing auth.uid() probe (via psql)"
psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/test-support/bn_env_auth_uid_probe.sql

if [ -f supabase/verify/bn_award_suspension_backend.sql ]; then
  log "running verify: bn_award_suspension_backend.sql"
  psql "$DB_URL" -v ON_ERROR_STOP=1 \
    -f supabase/verify/bn_award_suspension_backend.sql
fi
if [ -f supabase/verify/bn_award_suspension_access_seed.sql ]; then
  log "running verify: bn_award_suspension_access_seed.sql"
  psql "$DB_URL" -v ON_ERROR_STOP=1 \
    -f supabase/verify/bn_award_suspension_access_seed.sql
fi

log "running BN environment integration tests"
bun run test:bn-environment-integration

log "running BN suspension static tests"
bun run test:bn-suspension-static

log "running typecheck"
bunx tsgo --noEmit

log "done"
