# Phase 4B3 — Dry Run Stage-Wide Diagnosis

**Status:** DIAGNOSIS COMMITTED (Slice 1, Section A).
**Scope:** describe the currently deployed Dry Run boundary chain (SQL RPCs, Edge
Function, frontend service, UI) and every mismatch we intend to correct in
Slices 1 and 2. No runtime rows are created by writing this document.

The inspection was performed against live definitions (`pg_get_functiondef`,
`information_schema.columns`) and current repository files — not stale migration
text.

---

## 1. Boundary inventory

Deployed public RPCs (identity args from `pg_proc`):

| RPC | Args | Purpose |
|-----|------|---------|
| `prepare_comm_hub_preview` | `p_payload jsonb` | Render + freeze Preview snapshot. |
| `approve_comm_hub_preview` | `p_payload jsonb` | Reserve + freeze approval evidence. |
| `begin_comm_hub_dry_run` | `p_payload jsonb` | Create Dry Run execution, request, message, recipient rows; enter `REQUEST_CREATED`. |
| `process_comm_hub_dry_run_execution` | `p_execution_id uuid, p_correlation_id uuid` | Atomically claim → verify → `PROCESSED`. |
| `certify_comm_hub_dry_run` | `p_execution_id uuid` | Emit `communication_dry_run_certification`. |
| `check_comm_hub_preview_runtime_evidence` | `p_snapshot_id, p_module_code, p_event_code, p_channel, p_correlation_id, p_expected_content_hash, p_expected_recipient_hash, p_expected_template_version_id, p_expected_configuration_hash, p_transition_stage` | Attest Preview is still bindable. |
| `check_comm_hub_preview_approval_binding` | `p_preview_approval_id, p_preview_snapshot_id, p_expected_correlation_id, p_expected_content_hash, p_expected_recipient_hash, p_expected_configuration_hash` | Attest approval frozen evidence binds to snapshot. |
| `check_comm_hub_dry_run_certification_binding` | `p_dry_run_certification_id, p_dry_run_execution_id, p_preview_approval_id, p_preview_snapshot_id, p_expected_correlation_id` | Bind certification to execution. |
| `check_comm_hub_runtime_transition_safe` | `p_action text, p_context jsonb` | Gate `START_DRY_RUN`, `PROCESS_DRY_RUN`, etc. |
| `assert_comm_hub_service_operation` | `p_operation text, p_expected_transition text` | Assert operator identity + operation whitelist. |
| `evaluate_comm_hub_send_decision` | `p_payload jsonb` | Canonical send-decision. |
| `inspect_comm_hub_dry_run_preflight` | **NOT DEPLOYED** — added in Slice 1 (Section F). |

Callers:

| Layer | File | Direct callees |
|-------|------|----------------|
| Edge | `supabase/functions/comm-hub-dry-run/index.ts` | `begin_comm_hub_dry_run`, `process_comm_hub_dry_run_execution`, `certify_comm_hub_dry_run`. |
| Service | `src/platform/communication-hub/dryRunService.ts` | Invokes Edge Function only. |
| UI | `src/pages/admin/communicationHub/controlCenter/DryRunPanel.tsx` | Calls service. |
| UI | `src/pages/admin/communicationHub/GoLivePage.tsx` (Step 4) | Wires `DryRunPanel` state into stage machine. |
| Send-decision | `src/platform/communication-hub/sendDecisionService.ts` | Calls `evaluate_comm_hub_send_decision`. |

---

## 2. Observed Preview / Approval pair (Section E — read-only)

| Field | Preview `9a7fc2cd-…-e0b76d` | Approval `aec5dcf1-…-ca8891b` | Match |
|-------|-----------------------------|-------------------------------|-------|
| status | `PREPARED` | `ACTIVE` (row) — **expired** by clock | — |
| correlation | `33c4a4ab-1bb4-4ec8-84ce-e0bf31ce3966` | `33c4a4ab-1bb4-4ec8-84ce-e0bf31ce3966` (`correlation_id_at_approval`) | ✅ |
| content_hash | `a2cf3ea6…14966c2d` | `a2cf3ea6…14966c2d` | ✅ |
| recipient_set_hash | `adcad87e…f8539b57` | `adcad87e…f8539b57` | ✅ |
| template_version_id | `8d1fd9cb-…-bc42a4995f87` | `8d1fd9cb-…-bc42a4995f87` | ✅ |
| configuration_hash | *(empty on snapshot)* | *(empty on approval)* | **INSUFFICIENT** — required hash is missing on both sides |
| expiry | `2026-07-24 13:20:16 UTC` | `2026-07-23 13:50:18 UTC` (**expired**) | Approval expires ~24h earlier |
| evidence_version | — | `comm-hub-approval-evidence/v1` | canonical hash `a04ba428…cb27e49a` present |
| scanner | `comm-hub-raw-placeholder-scanner/v2` | (attested at approval) | ✅ |
| raw_placeholder_count | `0` | — | ✅ |

**Corrected verdict:**
- Approval `aec5dcf1-…-ca8891b` is **expired**; the historical pair is no
  longer eligible for a successful `begin` under any code path.
- Both the Preview snapshot and the approval have **empty
  `configuration_hash` / `certified_dependency_hash`** — configuration/
  dependency-hash evidence was never frozen. Re-approving the same Preview
  would still fail preflight with `CONFIGURATION_HASH_MISSING`.
- The eventual successful chain therefore requires a **fresh Preview and a
  fresh approval** produced against the corrected canonical resolver so that
  `certified_dependency_hash` is populated end-to-end.
- The historical pair remains useful only as a deterministic fixture for
  preflight-blocker tests (it will emit `APPROVAL_EXPIRED_BEFORE_BEGIN` and
  `CONFIGURATION_HASH_MISSING` together, with correlation/content/recipient
  hashes matching). Do NOT extend, reactivate, or rewrite the approval.

## 2a. Repository path corrections

- Go Live screen: `src/pages/admin/communicationHub/GoLivePage.tsx`
  (Step 4 wiring lives in the same file).
- Dry Run panel: `src/pages/admin/communicationHub/controlCenter/DryRunPanel.tsx`.
- Dry Run service: `src/platform/communication-hub/dryRunService.ts`.
- Dry Run contract (Checkpoint 2): `src/platform/communication-hub/contracts/DryRunContractV1.ts`.
- Dry Run contract tests: `src/platform/communication-hub/contracts/__tests__/DryRunContractV1.test.ts`.
- Edge Function: `supabase/functions/comm-hub-dry-run/index.ts` (unchanged in
  this checkpoint — additive begin v1 is exposed for direct contract tests
  only).

---

## 3. Boundary-by-boundary record

### 3.1 `prepare_comm_hub_preview` (Preview creation)

- **Caller identity:** operator JWT.
- **Accepted input:** module/event/channel/recipients/context.
- **Authoritative evidence source:** canonical renderer + placeholder scanner v2.
- **First mutation:** insert into `communication_preview_snapshot` (status `PREPARED`).
- **Response statuses:** `PREPARED` / `BLOCKED`.
- **Idempotency:** none — each call yields a new snapshot.
- **Retry:** safe (pre-mutation blockers are pre-mutation; success creates new snapshot).
- **Provider/simulator reachability:** none.
- **Known mismatch:** none; snapshot correctly stores `correlation_id`,
  `content_hash`, `recipient_set_hash`, `template_version_id`.

### 3.2 `approve_comm_hub_preview` (Approval reservation)

- **Caller identity:** operator JWT with approve capability.
- **Authoritative evidence:** snapshot fields at approval time; freezes
  `content_hash_at_approval`, `recipient_set_hash_at_approval`,
  `template_version_id_at_approval`, `configuration_hash_at_approval`,
  `correlation_id_at_approval`, `canonical_approval_evidence_hash`,
  `evidence_version=comm-hub-approval-evidence/v1`.
- **First mutation:** insert into `communication_preview_approval` (`ACTIVE`).
- **State transitions:** `ACTIVE → RESERVED → CONSUMED` or `REVOKED` /
  `EXPIRED`.
- **Idempotency:** one active approval per snapshot; second call errors.
- **Retry:** safe until active approval exists.
- **Known mismatch:** none.

### 3.3 `begin_comm_hub_dry_run` — **DEFECTIVE — correlation ownership**

- **Caller identity:** operator JWT (`auth.uid()` — SERVER-DERIVED).
- **Accepted input:** `module_code`, `event_code`, `channel`, `recipients`,
  `preview_snapshot_id`, `preview_approval_id`, `idempotency_key`,
  `operator_reason`, **`correlation_id`** (currently REQUIRED from caller),
  optional `expected_content_hash`, `expected_recipient_hash`,
  `expected_template_version_id`, `expected_configuration_hash`.
- **Authoritative evidence source:** `communication_preview_approval` frozen
  columns.
- **First mutation:** `communication_dry_run_execution` INSERT, then
  `communication_request`, `communication_message`, per-role
  `communication_recipient`, `communication_hub_trace`, transition log.
- **Response statuses (current):** `STARTED` / `BLOCKED`.  Repository
  contract tests already expect `BEGIN_OK` / `BEGIN_REPLAY` (see Section G).
- **State transitions:** target `REQUEST_CREATED`.
- **Idempotency:** unique on `idempotency_key`; second call with same key +
  same scope returns existing execution (currently emitted as `STARTED`, must
  become `BEGIN_REPLAY`).
- **Retry:** pre-mutation blockers are retry-safe; server does not yet emit
  `retry_safe`/`retry_reason` flags — deferred to Section Q.
- **Provider/simulator reachability:** none.
- **Known mismatch — root cause of `CORRELATION_ID_MISMATCH`:**
  1. Frontend `dryRunService` and Edge Function currently mint a fresh
     `crypto.randomUUID()` when the caller does not supply one.
  2. That UUID is forwarded as `payload.correlation_id`.
  3. `begin_comm_hub_dry_run` requires it, then calls
     `check_comm_hub_preview_runtime_evidence(..., v_correlation_id, ...)`,
     which compares against the frozen `correlation_id` on the snapshot
     (`33c4a4ab…`). Any browser-minted UUID fails this check.
- **Chosen correction (Slice 1, Section D):**
  - Remove client-side correlation generation entirely.
  - Server loads Preview correlation + `correlation_id_at_approval`,
    requires match, and uses that as the authoritative correlation.
  - Caller may pass only `expected_correlation_id` for optimistic concurrency.
  - Introduce distinct blockers `PREVIEW_CORRELATION_MISSING`,
    `APPROVAL_CORRELATION_MISSING`, `APPROVAL_PREVIEW_CORRELATION_MISMATCH`,
    `CALLER_EXPECTED_CORRELATION_MISMATCH`.
  - Rename response `STARTED` → `BEGIN_OK`, existing-execution replay →
    `BEGIN_REPLAY`. Response envelope aligned to
    `comm-hub-dry-run-contract/v1` (Section B).

### 3.4 `process_comm_hub_dry_run_execution`

- **Caller identity:** service-role Edge Function (post-JWT begin).
- **Authoritative evidence:** frozen execution row + linked request/message.
- **Response statuses:** `PROCESSED` / `FAILED`.
- **State transitions:** `REQUEST_CREATED → PROCESSING → PROCESSED`
  (target — actual current transitions require inspection in Slice 1
  Section L when the migration lands).
- **Idempotency:** atomic `REQUEST_CREATED → PROCESSING` claim; duplicate
  claim must reconcile without double-mutation.
- **Retry:** on `FAILED`, no automatic retry.
- **Provider/simulator reachability:** must remain zero — verified in Section L.
- **Known mismatch:** service-operation gate previously threw
  `assert_comm_hub_service_operation('PROCESS_DRY_RUN','START_DRY_RUN')`;
  Slice 1 Section L aligns expected transition to `PROCESS_DRY_RUN`.

### 3.5 `certify_comm_hub_dry_run`

- **Caller identity:** service-role.
- **Authoritative evidence:** frozen execution + linked request/message/recipients.
- **First mutation:** insert into `communication_dry_run_certification`.
- **Response statuses:** `CERTIFIED` / `IDEMPOTENT` / `BLOCKED`.
- **Idempotency:** currently indexed by execution — must be narrowed in
  Section N to `(dry_run_execution_id, certification_evidence_hash)`.
- **Retry:** valid replay returns same certification row.
- **Known mismatch:** `IDEMPOTENT` may currently be returned even when a
  different execution reused the same Preview + approval. Section N
  requires the existing certification to belong to the **same** execution
  and evidence hash.

### 3.6 `comm-hub-dry-run` Edge Function

- **Caller identity:** operator JWT for `begin`, service-role for `process`
  and `certify` (validated in Phase 4B3 Slice 0).
- **Accepted input:** JSON body containing action + Preview/approval IDs
  + operator reason + idempotency key.
- **First mutation:** none directly — it invokes RPCs.
- **Response statuses (current):** `STARTED`, `PROCESSED`, `CERTIFIED`,
  `BLOCKED`. Target set: `BEGIN_OK`, `BEGIN_REPLAY`, `PROCESSED`,
  `CERTIFIED`, `IDEMPOTENT`, `BLOCKED`.
- **Known mismatches:**
  1. Mints `crypto.randomUUID()` for correlation — must be removed
     (Section D).
  2. Currently expects `STARTED` from begin — must accept `BEGIN_OK` and
     `BEGIN_REPLAY` (Section G, M).
  3. Does not yet emit contract-version envelope — Section B.

### 3.7 `dryRunService.ts`

- **First mutation:** none.
- **Correlation behaviour:** `generateIdempotencyKey()` exists; correlation
  is currently minted via `crypto.randomUUID()` — must be removed
  (Section D).
- **Response contract:** exports envelope type; must switch to
  `DryRunContractV1Envelope` from `contracts/DryRunContractV1.ts`.

### 3.8 `DryRunPanel.tsx` / Go Live Step 4

- **First mutation:** none.
- **Blocker rendering:** already Phase 4B3 auth-aware.
- **Required corrections (deferred to Slice 2):** display authoritative
  correlation returned by server; do not display client-generated
  correlation; render `retry_safe`/`retry_reason` from envelope.

### 3.9 Certification validator (`check_comm_hub_dry_run_certification_binding`)

- **Authoritative evidence:** certification row + execution row.
- **Known mismatch:** must consult
  `(dry_run_execution_id, certification_evidence_hash)` uniqueness
  — Section N.

### 3.10 Send-decision evaluator (`evaluate_comm_hub_send_decision`)

- **Authoritative recipient source:** currently accepts caller-supplied
  arrays.
- **Required correction (Section I):** in the Dry Run boundary, the caller
  is the server itself, and it must pass the frozen snapshot recipients.

### 3.11 Trace creation (`communication_hub_trace` inserts inside begin)

- **Correlation source:** currently `v_correlation_id` (browser UUID).
- **Required correction (Section K):** use Preview-chain correlation.

### 3.12 Recipient snapshot source

- **Current:** snapshot stores `to_recipients`, `cc_recipients`,
  `bcc_recipients` JSONB arrays + `recipient_set_hash`.
- **Frozen snapshot version:** implicit. Section H formalises it as
  `comm-hub-recipient-snapshot/v1` and records role, normalised address,
  display name, ordering, source ref, snapshot version, count, canonical
  hash. If reconstruction fails, `begin` MUST block with
  `PREVIEW_FROZEN_RECIPIENT_EVIDENCE_MISSING`.

### 3.13 Normal queue exclusions

- Dry Run messages MUST NOT be visible to `claim_comm_hub_targeted_message`
  or to the normal dispatcher. Current implementation sets
  `send_context = 'dry_run'` and `dry_run_locked = true` on the message —
  Section L asserts this must remain enforced at process time.

---

## 4. Correction summary → slice mapping

| Section | Correction | Slice |
|---------|-----------|-------|
| B | Introduce `comm-hub-dry-run-contract/v1` envelope | 1 (this turn) |
| C | Normalise helper `{allowed,ok,blockers,evidence,evaluator_version}` | 1 |
| D, G | Server-derived correlation; `BEGIN_OK` / `BEGIN_REPLAY` | 1 |
| F | Deploy `inspect_comm_hub_dry_run_preflight` | 1 |
| H, I | Frozen `comm-hub-recipient-snapshot/v1` drives runtime rows | 1 |
| J, K | Freeze execution evidence; trace uses authoritative correlation | 1 |
| L | Processor state + identity alignment | 1 |
| N, O | Certification identity + replay/reconciliation | 1 |
| M | Edge Function accepts new statuses; no correlation minting | 1 |
| P | Expiry blocker separation | 1 |
| Q | Server-authoritative retry classification | 1 |
| R, S | Focused tests + non-permanent rehearsal | 1 |
| Go Live Step 4 final UI, full failure matrix, one real certified Dry Run | | **2** |

---

## 5. What did NOT happen while writing this diagnosis

- No RPC was called.
- No migration was applied.
- No row was created, updated, or deleted.
- No Edge Function was invoked.
- No provider or simulator was contacted.
- No approval was extended, reactivated, or rewritten.
