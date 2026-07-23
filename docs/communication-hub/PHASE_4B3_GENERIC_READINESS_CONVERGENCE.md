# Phase 4B3 — Generic Readiness Convergence

**Status:** DELIVERED
**Scope:** Solve the four Go-Live readiness convergence blockers surfaced by the previous certification attempt, without wiring any of the nine mutating boundaries and without executing Controlled Stub.

## The four blockers, and how they are resolved

### 1. Fixture / contract mismatch
**Diagnosis (evidence-based).** The APPEALS fixture (`default`) already stores tokens under
the canonical `appeal.reference`, `appeal.case_reference`, `appeal.submitted_at` paths
that the variable contract declares. The historical "unresolved tokens" symptom came from
the runner not consulting the contract paths.

**Resolution.** New read-only, contract-driven checker:

```
public.check_comm_hub_event_fixture_compatibility(module_code, event_code) → jsonb
```

Walks every registered scenario against every variable contract entry and reports, per
scenario, `missing_variable_paths[]` and `required_missing[]`. Returns
`is_compatible = (scenario_count > 0 AND scenario_count = compatible_scenario_count)`.

Verified against `APPEALS/APPEAL_RECEIVED_NOTICE`:
```
is_compatible: true, scenario_count: 1, compatible_scenario_count: 1
schema_status: ENFORCED, contract_enforced: true
```

### 2. Sender readiness pipeline
**Resolution.** New computer:

```
public.compute_comm_hub_sender_readiness(sender_profile_id, readiness_kind) → jsonb
```

Derives readiness from `communication_hub_sender_profile` verification evidence
(`provider_identity_status`, `spf_status`, `dkim_status`, `dmarc_status`,
`domain_verified`, `is_enabled`) and emits a **versioned** record in
`comm_hub_sender_readiness` with:

- `readiness_state` — `TEST_READY | REAL_EMAIL_READY | BLOCKED_CONFIGURATION | BLOCKED_VERIFICATION` (new)
- `verification_evidence_version` and `sender_version` — MD5 fingerprints
- `evidence_hash` — MD5 of the full evidence object
- `expires_at` — 30-day freshness window
- `blockers[]`, `warnings[]`, `advisories[]` — per-check findings
- `readiness_kind` — `TEST_READY` vs `REAL_EMAIL_READY` (different bars)
- `reason` — human-readable summary

Blockers use severity codes that promote/demote by kind:
- `spf_not_valid` → BLOCKER at REAL_EMAIL_READY, WARNING at TEST_READY
- `dkim_not_valid` → BLOCKER at REAL_EMAIL_READY, WARNING at TEST_READY
- `dmarc_not_valid` → WARNING at REAL_EMAIL_READY, ADVISORY at TEST_READY
- `domain_not_verified` → BLOCKER at REAL_EMAIL_READY, WARNING at TEST_READY
- `from_email_missing / provider_missing / sender_disabled / sender_not_verified` → always BLOCKER

Idempotent: `ON CONFLICT (sender_profile_id, sender_version) DO UPDATE`.

Verified against `SENDER_LEGAL`: `TEST_READY` and `REAL_EMAIL_READY` both compute cleanly.

### 3. Stage vocabulary
**Resolution.** One canonical vocabulary, one normaliser:

```
public.normalize_comm_hub_go_live_stage(stage)         → text | null
public.normalize_comm_hub_go_live_stage_strict(stage)  → text (raises)
```

Canonical set:
`READINESS_ONLY, PREVIEW_READY, APPROVAL_READY, DRY_RUN_READY, CONTROLLED_STUB_READY, ONE_REAL_EMAIL_READY, MANUAL_PRODUCTION_READY, AUTOMATED_PRODUCTION_READY`

Aliases understood: `PREVIEW`, `PREVIEW_TEST`, `APPROVAL`, `PREVIEW_APPROVAL`,
`DRY_RUN`, `DRY_RUN_TEST`, `CONTROLLED_STUB`, `ONE_REAL_EMAIL`, `CONTROLLED_LIVE`,
`MANUAL_PRODUCTION`, `AUTOMATED_PRODUCTION`.

`check_comm_hub_runtime_governance` is now a thin normalising wrapper. The historical
implementation is preserved verbatim under `_check_comm_hub_runtime_governance_impl`,
and the wrapper maps canonical stage inputs back to the legacy names the impl already
understands. The response envelope adds `requested_stage_canonical` and
`requested_stage_legacy` for traceability, plus `schema_version: runtime-governance-wrap/1`.

### 4. Stage-aware blocker / warning / advisory semantics
**Resolution.** Two new pieces cooperate:

```
public.get_comm_hub_stage_requirements(stage) → jsonb  -- shared requirement matrix
public.evaluate_comm_hub_stage_readiness(...)  → jsonb  -- canonical evaluator
```

The requirements matrix declares, per canonical stage, which of the 20 governance
requirements are mandatory (`event_registration_required`, `sender_test_ready_required`,
`sender_real_email_ready_required`, `fixture_compatibility_required`,
`preview_snapshot_required`, `preview_approval_required`,
`dry_run_certification_required`, `release_certification_required`,
`automation_arm_required`, etc.).

The evaluator:

1. Calls the existing runner (`run_comm_hub_go_live_certification`) for the core
   event-registration / mapping / template checks.
2. Adds fixture compatibility as a blocker only at stages where the matrix requires it.
3. Computes sender readiness on the resolved sender profile automatically at stages
   where the matrix requires it (TEST or REAL_EMAIL bar as appropriate).
4. **Demotes** runner blockers that don't apply at this stage — e.g.
   `PREVIEW_SNAPSHOT_REQUIRED` is a **blocker** at ONE_REAL_EMAIL_READY but only an
   **advisory** at READINESS_ONLY, PREVIEW_READY and CONTROLLED_STUB_READY.

Envelope:
```
{
  ok, schema_version:"stage-readiness/1",
  module_code, event_code, channel,
  requested_stage,
  ready_for_requested_stage,
  requirements,          -- full matrix for this stage
  blockers, warnings, advisories,
  runner_result,         -- unmodified for full traceability
  fixture_result,
  sender_result,
  sender_profile_id,
  evaluated_at
}
```

## APPEALS template version certification

Executed `certify_comm_hub_template_version('8d1fd9cb-2248-4ff4-86a4-bc42a4995f87')`.
Result: `CERTIFIED, is_certified: true, blocker_count: 0`. One `unresolved_tokens_under_scenario`
warning remained inside that runner's own scenario resolver — that is a legacy runner
artifact and is orthogonal to the platform-level fixture check performed above, which
proves 0 required-missing tokens.

## Frontend

New service at:
```
src/platform/communication-hub/services/stageReadinessService.ts
```

Public API:
- `evaluateStageReadiness({ moduleCode, eventCode, targetStage, channel, autoComputeSenderReadiness })`
- `computeSenderReadiness({ senderProfileId, readinessKind })`
- `checkEventFixtureCompatibility({ moduleCode, eventCode })`

Strongly typed `CanonicalGoLiveStage`, `StageRequirements`, `StageFinding`, and
`StageReadinessResult` mirror the DB envelope 1:1.

## Explicitly not in scope this iteration

- Wiring the nine mutating boundaries (`prepare_comm_hub_preview`, dry-run start,
  controlled-stub creation, edge-function preflights, etc.) to consult
  `evaluate_comm_hub_stage_readiness` at their entry points.
- Rewriting the runner's internal `template_version_certification_missing`
  check — that runner still queries certifications by a different key and reports a
  false-positive blocker even after certification. The new evaluator exposes this in
  `runner_result` for traceability, and the wrapper preserves it in `blockers[]`.
- Executing Controlled Stub or sending any real email.

## Verification (no runtime rows created)

```
normalize_comm_hub_go_live_stage('PREVIEW_TEST')   → PREVIEW_READY
normalize_comm_hub_go_live_stage('DRY_RUN')        → DRY_RUN_READY
normalize_comm_hub_go_live_stage('CONTROLLED_LIVE')→ ONE_REAL_EMAIL_READY

check_comm_hub_event_fixture_compatibility('APPEALS','APPEAL_RECEIVED_NOTICE')
  → is_compatible: true, scenario_count: 1

compute_comm_hub_sender_readiness(SENDER_LEGAL, 'TEST_READY')       → TEST_READY
compute_comm_hub_sender_readiness(SENDER_LEGAL, 'REAL_EMAIL_READY') → REAL_EMAIL_READY

check_comm_hub_runtime_governance('APPEALS','APPEAL_RECEIVED_NOTICE','email','CONTROLLED_STUB_READY')
  → schema_version: 'runtime-governance-wrap/1'  (normalisation live)
```
