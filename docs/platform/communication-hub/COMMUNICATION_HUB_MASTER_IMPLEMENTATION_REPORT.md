# Communication Hub — Master Implementation Report

_Last updated: CH-SIMPLE-P3D-B.3 (Final P3D certification)_

---

## Final P3D certification

**Status: `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION`**

All P3D functional gates are closed. Two Vitest role-capable trigger tests
remain skipped because the harness uses the anon key and cannot mint
service-role JWTs; the same invariants are exercised authoritatively by
`run_ch_p3d_b2c_runtime_tests()` (20 / 20 assertions pass) under service
role in the live database. This is a **test-environment limitation, not a
runtime gap** — no P3D behaviour is unverified.

### P3D-B.3 — Operator dry-run experience

- `src/platform/communication-hub/dryRunService.ts` — typed operations
  (`runDryTest`, `fetchDryRunExecution`, `fetchDryRunCertification`,
  `fetchLatestValidDryRunCertification`, `validateDryRunCertification`,
  `revokeDryRunCertification`, `generateIdempotencyKey`). Envelope is
  preserved verbatim; the service NEVER calls internal orchestration RPCs
  or the dispatcher directly — only the public edge function.
- `src/pages/admin/communicationHub/controlCenter/DryRunPanel.tsx` —
  reusable operator panel implementing the canonical sequence:
  Preview status → Readiness (from `canonicalDecision`, no client
  recompute) → Run Dry Test with idempotency key → Evidence display
  (execution id, certification id, request/message/attempt ids,
  provider-call-attempted evidence, blockers/warnings).
- `CommunicationHubPilotsPage.tsx` — embeds `DryRunPanel` after
  `PreviewApprovalPanel`. The panel is intentionally reusable for the
  future unified Go Live workflow.
- Governance tests
  (`src/platform/communication-hub/__tests__/commHubP3DB3DryRunService.test.ts`)
  — **19 / 19 pass**. Assert:
  - only `comm-hub-dry-run` is invoked, never orchestration RPCs;
  - envelope keys are preserved (execution/certification ids, provider
    evidence, failure stage, idempotent-replay flag);
  - `BLOCKED` / `DRY_RUN_FAILED` shapes are surfaced structurally, not
    collapsed to toasts;
  - idempotent replays return the same execution/certification;
  - the panel exposes no queue/dispatcher/cron/provider controls and
    never re-derives readiness.
- Full P3D-B.2.c orchestration suite continues to pass — **24 / 24**.

### Reusability for the future Go Live workflow

Both `PreviewApprovalPanel` (P3C) and `DryRunPanel` (P3D) are component-
scoped, prop-driven, and free of route registration. The upcoming
unified Go Live page (out of scope here) can compose them directly.

---

_Historical entry — retained for traceability:_

---

## Current stage: P3D-B.2.c — Runtime Certification, Execution Orchestration & Certification Finalisation

Status: **PROVISIONALLY ACCEPTED — WAITING ON CONTROLLED LIVE (P3E)**

### 1. What P3D-B.2.c delivers

P3D-B.2.c completes the **targeted-dispatch dry-run** vertical by splitting the
single monolithic RPC into three server-only lifecycle steps and introducing a
durable state machine that makes every dry-run replay-safe, cross-operator-safe
and evidence-verifiable *entirely on the server*.

| Step | RPC | Trust boundary |
|------|-----|----------------|
| 1. `BEGIN`  | `begin_comm_hub_dry_run(p_payload jsonb)`           | JWT-authenticated operator via edge fn; **inputs only** — no evidence accepted |
| 2. `DISPATCH` | `comm-hub-dispatch` (operation: `targeted_dry_run`) | Dispatch secret; produces evidence server-side |
| 3. `MARK`   | `mark_comm_hub_dry_run_dispatching(...)`            | Service role, called by orchestrator immediately after `BEGIN` |
| 4. `FINALIZE` | `finalize_comm_hub_dry_run(execution_id, operator)` | Service role; **re-verifies evidence from source rows** and issues certification |
| 5. `FAIL`   | `fail_comm_hub_dry_run(execution_id, stage, blockers)` | Terminal failure recorder |

### 2. Durable state machine

`communication_dry_run_execution` enforces a monotonic state transition trigger:

```
STARTED → REQUEST_CREATED → DISPATCHING → PROCESSED → CERTIFIED
                                                    ↘ BLOCKED
                                                    ↘ FAILED
```

Immutability trigger rejects:
- backward transitions (e.g. `PROCESSED → REQUEST_CREATED`)
- mutation of `dry_run_scope_hash`, `idempotency_key`, `requested_by`
- any state change once terminal (`CERTIFIED` / `BLOCKED` / `FAILED`)

### 3. Idempotency scope binding

Idempotency key is scoped to `(operator, sha256(scope))`. The orchestrator:
- returns `BEGIN_REPLAY` for same operator + same scope + non-terminal state and short-circuits to `finalize` (never re-dispatches a `CERTIFIED` execution)
- returns `BLOCKED` with `idempotency_key_operator_mismatch` when a different operator reuses the same key/scope pair, without leaking exec-linked ids

### 4. Server-side certification lifecycle

`finalize_comm_hub_dry_run` is the sole certification issuer. It:
1. Locks the execution row.
2. **Re-reads evidence from source tables** (`communication_delivery_attempts`, `communication_hub_send_decision_log`, `communication_dry_run_certification`) — never trusts payload evidence.
3. Verifies subject/body/recipient-set hashes match the locked request.
4. Inserts the certification row via `validate_comm_hub_dry_run_certification` (already immutable per P3D-A).
5. Advances state to `CERTIFIED` and returns the stable envelope.

### 5. Edge function orchestration (`comm-hub-dry-run`)

Refactored into the canonical **begin → mark → dispatch → finalize** sequence:

```
JWT-verified operator → begin_comm_hub_dry_run(inputs)
   ├─ BLOCKED  → recordTerminalFailure(BEGIN) → stable BLOCKED envelope
   ├─ REPLAY   → finalize_comm_hub_dry_run(execution_id, operator)
   └─ STARTED  → mark_comm_hub_dry_run_dispatching(execution_id)
                    → callTargetedDispatch(dispatch_secret, execution_id)
                        ├─ transport-guard/provider-attempt/evidence blockers
                        │   → fail_comm_hub_dry_run(DISPATCH) → BLOCKED
                        └─ DRY_RUN_PROCESSED
                             → finalize_comm_hub_dry_run(execution_id, operator)
                                  ├─ verify-fail → fail_comm_hub_dry_run(FINALIZE) → DRY_RUN_FAILED
                                  └─ CERTIFIED    → DRY_RUN_PASSED
```

Guarantees:
- Client-supplied evidence is **stripped** before calling `begin`.
- Operator identity is **always** derived from the verified JWT, never from body.
- Dispatch secret is loaded from env; never logged, echoed, or returned.
- Only three final statuses are surfaced: `DRY_RUN_PASSED`, `DRY_RUN_FAILED`, `BLOCKED`.

### 6. Governance scans (production frontend boundary)

The orchestration RPCs are **server-only**. The governance scan asserts no
production frontend code calls them (generated `types.ts` catalogue and test
files are excluded — they are not call sites):

- ✓ `finalize_comm_hub_dry_run`
- ✓ `mark_comm_hub_dry_run_dispatching`
- ✓ `fail_comm_hub_dry_run`
- ✓ `operation: "targeted_dry_run"`
- ✓ no browser-callable `GRANT EXECUTE` on internal orchestration RPCs

### 7. Runtime certification (SQL harness)

`run_ch_p3d_b2c_runtime_tests()` — **20 / 20 assertions pass** against the live
database. Covers state-machine monotonicity, write-once identity, idempotency
scope binding, and cross-operator refusal.

### 8. Static + contract tests (Vitest)

`src/platform/communication-hub/__tests__/commHubP3DB2cOrchestration.test.ts`
— **24 / 24 pass**. Full Comm-Hub suite — **98 pass, 2 skipped** (2 skips are
role-capable trigger tests requiring service-role JWT, unchanged since B.2.a).

### 9. Role-capable trigger-test status

The dry-run immutability trigger is exercised via authoritative RPCs during
runtime certification. Direct-mutation trigger tests remain **skipped** in the
Vitest harness because the client uses the anon key; the SQL harness covers the
same invariants under service role.

### 10. P3 gap register — updated

| Gap | Status |
|-----|--------|
| G-P3D-01 Trust boundary on caller evidence | **Closed** (P3D-B.2.c: server re-reads evidence) |
| G-P3D-02 Replay safety across operators    | **Closed** (idempotency scope binding) |
| G-P3D-03 Certification issuance path       | **Closed** (finalize is sole issuer) |
| G-P3D-04 Terminal failure recording        | **Closed** (`fail_comm_hub_dry_run`) |
| G-P3D-05 Role-capable trigger tests in Vitest | Open — deferred; SQL harness covers |
| G-P3E-01 Controlled Live gating            | Open — begins in P3E |

### 11. Do NOT proceed

Per the acceptance envelope for P3D-B.2.c, **Controlled Live (P3E)** and the
Go-Live page are **not** started here. Stop after B.2.c.

## CH-SIMPLE-P3E-A — Controlled Live Authorisation and Execution Foundation

**Status:** Landed — foundation only. **No live email is sent by P3E-A.**
Prior P3D certification `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION`
carries forward unchanged.

### 1. Execution schema

`communication_controlled_live_execution` — durable state machine.

States: `STARTED → AUTHORISED → REQUEST_CREATED → DISPATCHING →
PROVIDER_ACCEPTED → DELIVERY_PENDING → DELIVERED` with terminal branches
`BLOCKED` and `FAILED`.

Write-once identity/evidence fields (enforced by
`communication_controlled_live_execution_immutability` trigger):
`idempotency_key`, `scope_hash`, `requested_by`, `module_code`, `event_code`,
`channel`, `recipient_set_hash`, `recipient`, `preview_approval_id`,
`dry_run_certification_id`.

Access:
- `GRANT SELECT ON communication_controlled_live_execution TO authenticated`
- Writes only through SECURITY DEFINER RPCs — frontend cannot INSERT/UPDATE/DELETE.

### 2. Grant schema

`communication_controlled_live_grant` — one-use, short-lived authorisation
record. Statuses: `ISSUED, RESERVED, CONSUMED, EXPIRED, REVOKED`.

Constraints:
- Partial unique index `uq_cclg_active_per_execution` guarantees **one
  live grant per execution** (states `ISSUED | RESERVED`).
- Write-once identity/evidence fields enforced by trigger.
- 10-minute default expiry.

### 3. Begin operation — `begin_comm_hub_controlled_live`

Server-side workflow:
1. `auth.uid()` present → else raise `controlled_live_unauthenticated`.
2. Admin role check via `has_role(uid, 'admin' | 'super_admin')`.
3. Reason `>= 8` chars.
4. Confirmation phrase equals `CONFIRM CONTROLLED LIVE`.
5. Idempotency key `>= 8` chars.
6. Recipient / preview approval / dry-run cert must be present.
7. Compute canonical `scope_hash` and per-recipient hash.
8. Idempotent replay: return `BEGIN_REPLAY` with existing execution + grant
   when idempotency key matches; return `idempotency_key_scope_mismatch`
   or `idempotency_key_operator_mismatch` on scope drift.
9. `evaluate_comm_hub_send_decision` with `send_context='controlled_live'`,
   exactly one To recipient, empty CC/BCC.
10. Snapshot `configuration_version` and `recipient_policy_version` onto
    the grant to detect drift.
11. Atomically insert execution (state `AUTHORISED`) and grant (`ISSUED`).
12. Return `BEGIN_OK` with `execution_id`, `grant_id`, `scope_hash`, and the
    canonical decision envelope.

No dispatcher, no provider call in P3E-A.

### 4. Recipient configuration behaviour

- No hardcoded addresses. Recipient must pass
  `evaluate_comm_hub_recipient_policy` (database-backed policy).
- Exactly **one** To recipient. New canonical blockers:
  - `controlled_live_single_recipient_required`
  - `controlled_live_cc_not_permitted`
  - `controlled_live_bcc_not_permitted`
- Policy changes take effect immediately — new eligibility is enforced by
  the send-decision evaluator on the next call.

### 5. Preview/Dry-Run binding

The evaluator refuses controlled live when `dry_run_certification_id` is
missing. When a `controlled_live_grant_id` is provided (e.g. dispatcher
re-evaluation in P3E-B), the decision core calls
`validate_comm_hub_controlled_live_grant`, propagating the canonical
blockers:
- `controlled_live_grant_missing`
- `controlled_live_grant_expired`
- `controlled_live_grant_revoked`
- `controlled_live_grant_consumed`
- `controlled_live_grant_scope_mismatch`
- `controlled_live_grant_configuration_changed`
- `controlled_live_grant_policy_changed`

### 6. Idempotency

Scope is bound to operator + module + event + channel + recipient hash +
preview approval + dry-run certification. Replay with the same key on the
same scope returns the existing execution and grant. Replay with a
different scope returns `idempotency_key_scope_mismatch`.

### 7. Permissions

All writes are gated by `SECURITY DEFINER` RPCs owned by the platform:
- `begin_comm_hub_controlled_live(jsonb)` — authenticated + admin.
- `validate_comm_hub_controlled_live_grant(jsonb)` — authenticated + service_role.
- Direct `INSERT`/`UPDATE`/`DELETE` privileges are **not** granted to
  `anon` or `authenticated`.
- No provider credentials are stored in either table.

### 8. Emergency Stop

`emergency_stop_active` remains authoritative in
`_evaluate_comm_hub_send_decision_core`; controlled-live begin is
rejected when the operating mode is `EMERGENCY_STOP`. Dispatcher paths
(P3E-B) will re-evaluate with the grant id, so a stop engaged after
grant issuance blocks provider invocation and leaves the grant
unconsumed.

### 9. Tests

- SQL harness `run_ch_p3e_a_runtime_tests()` — **8/8 pass**:
  single-recipient, CC/BCC blocked, dry-run cert required, cron/batch
  blocked, missing grant detected, unauthenticated begin rejected.
- Vitest harness `CommHubP3EAControlledLive.test.ts` runs the SQL
  harness when `PGHOST` is set (marked pending otherwise — never
  silently green).

### 10. Certification limitation carry-forward

P3D remains `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION`. The
skipped role-capable trigger tests remain in the release checklist and
do **not** relax controlled-live validation.

### 11. Remaining P3E-B work

- Grant reservation / consumption / revocation RPCs.
- Live message creation + delivery-attempt binding.
- Provider dispatch + response capture.
- Operator-facing Controlled Live panel + Go-Live journey.
- Cleanup rules for grants abandoned before dispatch.

### 12. P3 gap register — updated

| Gap | Status |
|-----|--------|
| G-P3E-01 Controlled Live gating              | **Foundation landed (P3E-A)** |
| G-P3E-02 Controlled Live dispatch + provider | Open — P3E-B |
| G-P3E-03 Operator panel + Go Live page       | Open — later P3E stages |
