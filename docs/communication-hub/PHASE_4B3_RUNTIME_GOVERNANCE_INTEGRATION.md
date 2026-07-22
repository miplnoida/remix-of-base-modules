# Phase 4B3 — Runtime Governance Integration

Status: **PHASE_4B3_RUNTIME_GOVERNANCE_INTEGRATION_PARTIAL**

This document tracks the runtime integration of the Phase 4B1/B2 governance
evidence into the operator journey:

```
Prepare Preview → Approve Preview → Dry Run → Controlled Stub → production eligibility
```

## Slice 1 (this turn) — delivered

1. **Canonical runtime governance evaluator**
   `public.check_comm_hub_runtime_governance(module, event, channel, target_stage, preview_snapshot_id, preview_approval_id, dry_run_certification_id) returns jsonb`
   - Read-only, `STABLE`, `SECURITY DEFINER`, `EXECUTE` to `authenticated`.
   - Resolves module/event/channel → active `communication_hub_event_template_map`.
   - Resolves the active `core_template_version` (accepts `active`, `published`,
     `approved_internal`, `approved_external`).
   - Resolves the active `comm_hub_governance_record` and current PASS
     `comm_hub_certification` (superseded excluded).
   - Recomputes the current dependency manifest via
     `build_comm_hub_dependency_manifest` and hash via
     `compute_comm_hub_dependency_hash`.
   - Reads the freshness sidecar (`comm_hub_certification_freshness`).
   - For downstream stages (`PREVIEW_APPROVAL`, `DRY_RUN_TEST`,
     `CONTROLLED_STUB`) it validates the caller-supplied preview snapshot
     against the current certification and hash.
   - Production stages (`ONE_REAL_EMAIL`, `MANUAL_PRODUCTION`,
     `AUTOMATED_PRODUCTION`) fail closed with
     `GOVERNANCE_EVIDENCE_INCOMPLETE` /
     `AUTOMATION_GOVERNANCE_EVIDENCE_INCOMPLETE` until a matching row exists
     in `comm_hub_event_release_certification`.
   - **Never** creates snapshots, requests, or messages; **never** calls a
     provider; **never** mutates governance records.
   - Returns a single structured envelope with blockers, warnings, evidence
     ids, freshness, `certified_dependency_hash`, `current_dependency_hash`,
     `changed_dependency_categories`, and `evaluator_version = 4b3.slice1`.

2. **Preview snapshot governance bindings** (additive, nullable)
   `communication_preview_snapshot` now records:
   `governance_certification_id`, `governance_record_id`,
   `certified_dependency_hash`, `current_dependency_hash`,
   `governance_freshness_status`, `changed_dependency_categories`,
   `canonical_renderer_version`, `manifest_schema_version`,
   `event_template_map_id`, `governance_evidence` (jsonb).
   Index: `communication_preview_snapshot_gov_cert_idx`.

3. **Frontend client**
   `src/platform/communication-hub/runtimeGovernanceService.ts` —
   read-only wrapper `checkCommHubRuntimeGovernance()` returning the same
   envelope, plus `humanizeGovernanceBlocker()` for plain-language operator
   text.

## Slice 2+ — remaining scope (not yet integrated)

To reach `PHASE_4B3_RUNTIME_GOVERNANCE_INTEGRATION_COMPLETE`, the following
must still be delivered on top of this slice. All items must remain additive
and must not alter B1/B2 immutability or freshness semantics.

- Extract legacy `prepare_comm_hub_preview` body into
  `_prepare_comm_hub_preview_core` and wire the PREVIEW_TEST governance gate
  in the outer function; persist all governance evidence fields on the
  created snapshot in the same transaction.
- Integrate the evaluator into Preview approval (`PREVIEW_APPROVAL` stage),
  Dry Run (`DRY_RUN_TEST`), and Controlled Stub (`CONTROLLED_STUB`) with
  identity-of-evidence checks (same snapshot, same certification, same
  content hash — no rerendering).
- Extend `evaluate_comm_hub_send_decision` to include governance blockers in
  the canonical envelope for every send context, without duplicating rules.
- Add controlled server operations for issuing `CONTROLLED_STUB_CERTIFIED`,
  `MANUAL_PRODUCTION_CERTIFIED`, `AUTOMATED_PRODUCTION_CERTIFIED` release
  certifications with evidence-chain checks.
- Refine `arm_comm_hub_automation` eligibility to consume authoritative
  release certifications and return precise blockers
  (`NO_AUTOMATION_CERTIFIED_EVENT`, `AUTOMATION_CERTIFICATION_STALE`, …).
- Minimal Go Live UI: surface template/mapping/certification/freshness state
  and plain-language blockers in Step 2 (no full governance dashboard).
- Reset downstream Preview/Approval/Dry Run/Controlled Stub state when the
  authoritative certification changes or becomes stale.
- Deterministic test suites for Preview, Approval, Dry Run, Controlled Stub,
  send-decision, stale-cert regression, and Phase 4A/B1/B2 regression.

## Non-goals for this turn

- No full certification dashboard.
- No One Real Email execution.
- No Manual Production send.
- No live automation arming.
- No cron / batch / bulk.

## Verification (this slice)

- `check_comm_hub_runtime_governance('APPEALS','APPEAL_RECEIVED_NOTICE','email','PREVIEW_TEST',…)`
  returns `ready=false` with `TEMPLATE_VERSION_NOT_CERTIFIED` (as expected —
  no current PASS certification for the appeals sample event).
- `check_comm_hub_runtime_governance(…, 'MANUAL_PRODUCTION', …)` returns
  `ready=false` with `GOVERNANCE_EVIDENCE_INCOMPLETE` because no release
  certification row exists yet.
- Unknown module/event returns `ready=false` with `EVENT_MAPPING_NOT_ACTIVE`
  and no template/version fields resolved.
- The existing stale test certification (`d2bafdcd-…`) continues to
  evaluate as `STALE` in the freshness sidecar; no immutable certification
  fields were altered by this migration.
- Phase 4A/B1/B2 objects were untouched: only additive columns on
  `communication_preview_snapshot` and one new function.
