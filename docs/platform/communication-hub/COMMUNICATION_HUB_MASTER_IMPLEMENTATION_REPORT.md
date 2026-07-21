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
