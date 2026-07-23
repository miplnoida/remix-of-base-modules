# Preflight Verification Matrix — CI Runner (Checkpoint 2B, repaired)

**File:** `supabase/tests/comm-hub/preflight_verification_matrix.sql`
**Runner:** `scripts/comm-hub/run-preflight-matrix.sh`
**Workflow:** `.github/workflows/comm-hub-preflight-matrix.yml`
**npm alias:** `bun run test:comm-hub-preflight-matrix`

## What the repaired matrix proves

- `public.inspect_comm_hub_dry_run_preflight(...)` is read-only for every
  canonical case (Preview lifecycle, approval status, correlation, approval
  evidence completeness/hash, malformed brace / renderer / resolver evidence,
  configuration hash, dependency drift, recipient shape / duplicates / hash).
- The historical production pair
  `9a7fc2cd-a715-4888-b029-83ff1de0b76d` / `aec5dcf1-ee74-4c42-bc53-ca69bcc8891b`
  remains BLOCKED with the exact 4-blocker set, **without being mutated**.
- Historical pair existence is verified up-front and yields
  `HISTORICAL_PREFLIGHT_PAIR_NOT_PRESENT` if either row is missing or the
  approval is not bound to the snapshot.
- Every case uses a **fresh disposable Preview + Approval pair** built in
  final immutable form (no post-insert UPDATE of evidence, no bypass of
  immutable triggers). The valid baseline uses the server-required evidence
  version `comm-hub-approval-evidence/v1` — asserted before preflight is
  invoked.
- Auth/authorization boundaries are proven **separately**:
  - `AUTH_1` unauthenticated → `PREFLIGHT_AUTHENTICATION_REQUIRED`.
  - `AUTH_2` authenticated non-admin → `PREFLIGHT_PERMISSION_REQUIRED`.
  - `AUTH_3` operator-admin: temporary `auth.users` + `user_roles(Admin)`
    row is minted under service-role JWT, then the caller impersonates that
    user (`role=authenticated`, `sub=<uid>`) and preflight reaches the
    evidence branch. The temporary identity is rolled back before the case
    exits.
  - `AUTH_4` service-role JWT reaches the evidence branch.
- Hardened anti-leak on `AUTH_1`/`AUTH_2` — asserts absence of
  `preview_snapshot_id`, `preview_approval_id`, `correlation_id`,
  `authoritative_correlation`, canonical/recipient hashes, approval evidence,
  lifecycle timestamps in both the top-level envelope and the `evidence`
  object.
- No transaction-control statements inside any PL/pgSQL function. Fixtures
  live inside the outer `BEGIN`/`ROLLBACK`; each case is a distinct fixture,
  so no case can mutate another case's fixture.
- Zero-row-delta ledger across 13 required + 3 optional runtime tables. A
  **required** table that is not present in the target database fails the
  run with `REQUIRED_TABLES_MISSING` rather than being silently zeroed.
  Optional tables (`communication_retry_policy`,
  `communication_hub_delivery_event`,
  `communication_controlled_live_certification`) are counted only if present.
- Provider and simulator call counts remain 0 on every case (asserted via
  `provider_call_attempted` / `simulator_call_attempted` in the envelope on
  every assertion).

## Production refusal

The runner refuses to execute unless **both** of these hold:

1. `COMM_HUB_TEST_ENVIRONMENT` is `test` or `staging` (any other value,
   including empty, is rejected). No `COMM_HUB_ALLOW_PROD` escape hatch
   exists.
2. The connection string does not match `/prod/i` and does not contain the
   live project ref `xynceskeiiisiefqlgxo`.

The SQL matrix then re-checks server-side and refuses to continue unless the
server-side GUC `app.environment` OR the client-provided `app.matrix_cli_env`
GUC (set from `psql -v env=…` by the runner) equals `test` or `staging`.

There is no way to run this matrix against production, in Lovable or in CI.

## Credential handling

- The runner never echoes `COMM_HUB_TEST_DB_URL`, the username, host, or any
  credential.
- The DB URL is passed to `psql` via `-d "$COMM_HUB_TEST_DB_URL"` (not on
  argv-visible flags) and every line of psql output is filtered through a
  `sed` redactor that replaces any `postgres://…` substring with
  `postgres://<redacted>` before it reaches stdout or the CI artifact.
- The CI workflow additionally sanitizes captured logs before uploading them
  as an artifact.

## Running locally

```bash
export COMM_HUB_TEST_DB_URL='postgres://service_role:<pw>@<host>:5432/<db>'
export COMM_HUB_TEST_ENVIRONMENT=test        # or 'staging'
bun run test:comm-hub-preflight-matrix
```

The Lovable sandbox `psql` connection cannot execute the mutation matrix —
it lacks INSERT privilege on the preview tables and cannot see the `auth`
schema. This is intentional. Run the matrix in CI or against a
service-role-enabled test/staging database.

## Running in CI

The dedicated workflow at `.github/workflows/comm-hub-preflight-matrix.yml`
is **manual-dispatch only** and executes against a GitHub Environment
(`comm-hub-preflight-test` or `comm-hub-preflight-staging`) that must be
gated by required reviewers. The DB URL is stored as
`secrets.COMM_HUB_TEST_DB_URL` on that environment; the workflow never runs
on `push` or `pull_request` and never targets production.

The workflow:

1. refuses any `environment` input other than `test` or `staging`;
2. installs project dependencies and `postgresql-client`;
3. runs the TypeScript contract tests (`dryRunPreflightService.test.ts`);
4. runs the service/readiness tests (`readinessReadOnly.test.ts`);
5. runs `bun run test:comm-hub-preflight-matrix` against the environment's
   service-role connection;
6. sanitizes captured logs (belt-and-braces redaction) and uploads a single
   artifact named `comm-hub-preflight-matrix-<environment>` for 30 days.

The service-role connection string is never written to any file in the
repository.

## Coverage matrix

| Case | Kind | Expected |
| ---- | ---- | -------- |
| `00_historical_pair_readonly` | read-only | BLOCKED + `{CONFIGURATION_HASH_MISSING, APPROVAL_EXPIRED_BEFORE_BEGIN, APPROVAL_EVIDENCE_MISSING_OR_LEGACY, MALFORMED_BRACE_EVIDENCE_MISSING}` |
| `AUTH_1_unauthenticated` | auth | BLOCKED + `PREFLIGHT_AUTHENTICATION_REQUIRED`; no identifier leak |
| `AUTH_2_authenticated_no_privilege` | auth | BLOCKED + `PREFLIGHT_PERMISSION_REQUIRED`; no identifier leak |
| `AUTH_3_operator_admin` | auth | reaches evidence branch (evidence.authenticated=true) under real `Admin`-scoped JWT |
| `AUTH_4_service_role` | auth | reaches evidence branch under `service_role` JWT |
| `42_valid_disposable_baseline` | success | PREFLIGHT_READY, terminal=false, stage_succeeded=true, passed=false, retry_safe=true, blockers=[] |
| `05_preview_not_prepared` | snapshot | BLOCKED + `PREVIEW_SNAPSHOT_NOT_PREPARED` |
| `07_preview_expired` | snapshot | BLOCKED + `PREVIEW_EXPIRED` |
| `19_scanner_v1` | snapshot | BLOCKED + `PLACEHOLDER_SCANNER_VERSION_STALE` |
| `20_raw_placeholder_residue` | snapshot | BLOCKED + `RAW_PLACEHOLDERS_PRESENT` |
| `21_malformed_brace_evidence_missing` | snapshot | BLOCKED + `MALFORMED_BRACE_EVIDENCE_MISSING` |
| `22_malformed_brace_evidence_invalid` | snapshot | BLOCKED + `MALFORMED_BRACE_EVIDENCE_INVALID` |
| `23_malformed_braces_present` | snapshot | BLOCKED + `MALFORMED_BRACES_PRESENT` |
| `24_renderer_evidence_invalid` | snapshot | BLOCKED + `RENDERER_EVIDENCE_INVALID` |
| `25_renderer_unresolved` | snapshot | BLOCKED + `RENDERER_UNRESOLVED_VARIABLES` |
| `26_resolver_evidence_invalid` | snapshot | BLOCKED + `RESOLVER_EVIDENCE_INVALID` |
| `27_resolver_required_unresolved` | snapshot | BLOCKED + `REQUIRED_VARIABLES_UNRESOLVED` |
| `28_configuration_hash_missing` | snapshot | BLOCKED + `CONFIGURATION_HASH_MISSING` |
| `30_dependency_drift` | snapshot | BLOCKED + `DEPENDENCY_HASH_DRIFT` |
| `31_recipient_container_invalid` | snapshot | BLOCKED + `RECIPIENT_CONTAINERS_INVALID` |
| `35_recipient_address_invalid` | snapshot | BLOCKED + `RECIPIENT_ENTRIES_INVALID` |
| `36_duplicate_within_role` | snapshot | BLOCKED + `RECIPIENT_DUPLICATE_POLICY_VIOLATED` |
| `37_duplicate_across_roles` | snapshot | BLOCKED + `RECIPIENT_DUPLICATE_POLICY_VIOLATED` |
| `38_case_only_duplicate` | snapshot | BLOCKED + `RECIPIENT_DUPLICATE_POLICY_VIOLATED` |
| `40_preview_recipient_hash_mismatch` | snapshot | BLOCKED + `PREVIEW_RECIPIENT_HASH_RECOMPUTE_MISMATCH` |
| `08_approval_reserved` | approval | BLOCKED + `APPROVAL_NOT_ACTIVE` |
| `12_approval_expired` | approval | BLOCKED + `APPROVAL_EXPIRED_BEFORE_BEGIN` |
| `13_approval_evidence_missing_field` | approval | BLOCKED + `APPROVAL_EVIDENCE_MISSING_OR_LEGACY` |
| `15_correlation_mismatch` | approval | BLOCKED + `APPROVAL_CORRELATION_MISMATCH` |
| `18_canonical_approval_hash_mismatch` | approval | BLOCKED + `APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH` |
| `41_approval_recipient_hash_mismatch` | approval | BLOCKED + `APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH` |
| `42_valid_disposable_baseline_recheck` | success | PREFLIGHT_READY (proves fixture inserts do not corrupt state) |
| _(row-count delta)_ | invariant | zero delta across present required tables |

Every case additionally asserts `mutation_started=false`,
`created_this_call=false`, `provider_call_attempted=false`,
`simulator_call_attempted=false`.
