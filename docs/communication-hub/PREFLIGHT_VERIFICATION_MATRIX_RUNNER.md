# Preflight Verification Matrix — CI Runner

**File:** `supabase/tests/comm-hub/preflight_verification_matrix.sql`
**Runner:** `scripts/comm-hub/run-preflight-matrix.sh`
**npm alias:** `bun run test:comm-hub-preflight-matrix`

## What it proves

- `public.inspect_comm_hub_dry_run_preflight(...)` is genuinely read-only for
  every canonical case (Preview lifecycle, approval status, correlation,
  approval evidence completeness/hash, malformed brace / renderer / resolver
  evidence, configuration hash, dependency drift, recipient shape /
  duplicates / hash) — 25+ assertive cases.
- The historical production pair
  `9a7fc2cd-a715-4888-b029-83ff1de0b76d` / `aec5dcf1-ee74-4c42-bc53-ca69bcc8891b`
  remains BLOCKED with the exact 4-blocker set, **without being mutated**.
- Authentication/authorization boundary:
  1. unauthenticated → `PREFLIGHT_AUTHENTICATION_REQUIRED`
  2. authenticated but not operator admin → `PREFLIGHT_PERMISSION_REQUIRED`
  3. operator admin (service-role equivalent) → reaches evidence branch
  4. service_role → reaches evidence branch (implicit: whole matrix runs
     under service_role)

  Auth-failure responses do not leak preview IDs, approval IDs, correlation
  IDs, or hashes.
- Zero-row-delta: 13 runtime tables (`communication_dry_run_execution`,
  `communication_dry_run_certification`, `communication_request`,
  `communication_recipient`, `communication_message`,
  `communication_delivery_attempt`, `communication_hub_trace`,
  `communication_hub_trace_step`, `communication_hub_send_decision_log`,
  `communication_hub_runtime_transition_log`,
  `communication_controlled_live_execution`,
  `communication_controlled_live_grant`, `communication_event_log`)
  are counted before/after; any non-zero delta raises before ROLLBACK.
- Provider and simulator call counts remain 0 for every case (asserted via
  `provider_call_attempted` and `simulator_call_attempted` in the envelope on
  every assertion).

## Contract

- **Assertion**: every case calls `pg_temp.assert_preflight(...)` which
  RAISES EXCEPTION on any mismatch (status, terminal, retry_safe,
  blockers_include, first_blocker, ready, or the read-only invariants).
- **Isolation**: whole file wraps in `BEGIN ... ROLLBACK`. Each mutation case
  additionally uses a `SAVEPOINT` and `ROLLBACK TO SAVEPOINT` so cases can
  never leak state to one another.
- **Historical pair is read-only**: no `UPDATE` / `INSERT` / `DELETE`
  targets the historical Preview or approval row.
- **Disposable fixtures**: mutation cases build a fresh Preview + approval
  cloned from the historical pair with new IDs and recomputed hashes.
  Approval evidence fields are immutable via trigger, so approval-side cases
  revoke the baseline and INSERT a fresh approval with the target invalid
  state.
- **Fail fast**: `ON_ERROR_STOP=1`. First failed assertion aborts the run.

## Running locally

```bash
export COMM_HUB_TEST_DB_URL='postgres://service_role:<pw>@<host>:5432/<db>'
bun run test:comm-hub-preflight-matrix
```

Or invoke `psql` directly:

```bash
psql "$COMM_HUB_TEST_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/comm-hub/preflight_verification_matrix.sql
```

The runner refuses connection strings that look like production (`prod` in
the host/DB name, or the live project ref `xynceskeiiisiefqlgxo`) unless
`COMM_HUB_ALLOW_PROD=YES` is set — and the SQL matrix itself refuses
databases named `*prod*` without a matching server-side GUC. Do not set
either flag in CI.

## Running in CI

Store the service-role connection string as a repository secret
(`secrets.COMM_HUB_TEST_DB_URL`) and add a job step:

```yaml
- name: Comm Hub — Preflight Verification Matrix
  env:
    COMM_HUB_TEST_DB_URL: ${{ secrets.COMM_HUB_TEST_DB_URL }}
  run: bun run test:comm-hub-preflight-matrix
```

Service-role credentials MUST NOT be committed to the repository.

## Why service-role is required

`public.inspect_comm_hub_dry_run_preflight` is read-only, but the matrix
must build disposable Preview + approval fixtures to prove behavior across
50+ input states. Those `INSERT`s require write privilege on
`communication_preview_snapshot` and `communication_preview_approval`,
which is scoped to `service_role`. The Lovable sandbox `psql` connection
(read/insert only) cannot execute the mutation matrix.

## Coverage matrix (implemented cases)

| Case | Kind | Expected |
| ---- | ---- | -------- |
| `00_historical_pair_readonly` | read-only | BLOCKED + 4 canonical blockers |
| `AUTH_1_unauthenticated` | auth | PREFLIGHT_AUTHENTICATION_REQUIRED |
| `AUTH_2_authenticated_no_privilege` | auth | PREFLIGHT_PERMISSION_REQUIRED |
| `AUTH_3_operator_admin` | auth | reaches evidence branch |
| `AUTH_4_service_role` | auth | reaches evidence branch |
| `42_valid_disposable_baseline` | success | PREFLIGHT_READY |
| `05_preview_not_prepared` | snapshot | BLOCKED |
| `07_preview_expired` | snapshot | BLOCKED |
| `19_scanner_v1` | snapshot | BLOCKED |
| `20_raw_placeholder_residue` | snapshot | BLOCKED |
| `21_malformed_brace_evidence_missing` | snapshot | BLOCKED + MALFORMED_BRACE_EVIDENCE_MISSING |
| `22_malformed_brace_evidence_invalid` | snapshot | BLOCKED + MALFORMED_BRACE_EVIDENCE_INVALID |
| `23_malformed_braces_present` | snapshot | BLOCKED |
| `24_renderer_evidence_invalid` | snapshot | BLOCKED + RENDERER_EVIDENCE_INVALID |
| `25_renderer_unresolved` | snapshot | BLOCKED |
| `26_resolver_evidence_invalid` | snapshot | BLOCKED + RESOLVER_EVIDENCE_INVALID |
| `27_resolver_required_unresolved` | snapshot | BLOCKED |
| `28_configuration_hash_missing` | snapshot | BLOCKED + CONFIGURATION_HASH_MISSING |
| `30_dependency_drift` | snapshot | BLOCKED |
| `31_recipient_container_invalid` | snapshot | BLOCKED |
| `35_recipient_address_invalid` | snapshot | BLOCKED |
| `36_duplicate_within_role` | snapshot | BLOCKED |
| `37_duplicate_across_roles` | snapshot | BLOCKED |
| `38_case_only_duplicate` | snapshot | BLOCKED |
| `40_preview_recipient_hash_mismatch` | snapshot | BLOCKED + PREVIEW_RECIPIENT_HASH_RECOMPUTE_MISMATCH |
| `08_approval_reserved` | approval | BLOCKED |
| `12_approval_expired` | approval | BLOCKED + APPROVAL_EXPIRED_BEFORE_BEGIN |
| `13_approval_evidence_missing_field` | approval | BLOCKED + APPROVAL_EVIDENCE_MISSING_OR_LEGACY |
| `15_correlation_mismatch` | approval | BLOCKED |
| `18_canonical_approval_hash_mismatch` | approval | BLOCKED + APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH |
| `41_approval_recipient_hash_mismatch` | approval | BLOCKED |
| `42_valid_disposable_baseline_recheck` | success | PREFLIGHT_READY (proves rollbacks) |
| _(row-count delta)_ | invariant | zero delta across 13 runtime tables |
