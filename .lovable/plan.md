# Phase 4B — Lifecycle Certification & Governance

## Deployed inventory (Section 1 — completed)

Existing lifecycle fields (kept as-is; no rewrite):

- `core_template.status` — 343 `ACTIVE`, 6 `PUBLISHED` (publishing status).
- `core_template_version.status` — 137 `PUBLISHED`, 27 `ACTIVE`, 1 lowercase `published` (publishing status; casing drift noted).
- `communication_hub_template_variable_contract.contract_status` — 20 `DISCOVERED` (Phase 3 discovery status).
- `communication_hub_event_payload_schema.status` — 2 `DISCOVERED`.
- `communication_hub_event_template_map.active` (boolean).
- `communication_hub_event_test_scenario.is_active` (boolean).
- `communication_hub_event_live_control.status` — `dry_run_only`, `live_manual_only` (operator control).
- `communication_hub_module_event_registry.{integration,template,mapping,live}_status` (integration UX).
- `communication_hub_sender_profile.{provider_identity,spf,dkim,dmarc}_status` (readiness signals).

Existing certification/governance-adjacent tables and functions we will reuse rather than duplicate:

- `communication_dry_run_certification`, `communication_controlled_live_certification` — kept; new governance sidecar references them by ID.
- `certify_comm_hub_template_version`, `certify_all_comm_hub_template_versions` — Phase 3 assessment runner; will be delegated to by the new certification RPCs.
- `core_release_readiness_attestation` / `_run` — release runs, not per-entity governance; not overloaded.

Conclusion: statuses mean different things (publishing vs discovery vs operator control vs readiness). We will **not** migrate existing status columns. We add a **governance sidecar** keyed by `(entity_type, entity_id, entity_version)`.

## Deliverables

### 1. Governance sidecar schema (Sections 2–3, 5, 10)

Additive tables (all in `public`, RLS on, GRANTs to `authenticated` + `service_role`, no `anon`):

- `comm_hub_governance_record` — lifecycle rows with `(entity_type, entity_id, entity_version)`, `governance_status`, `governance_version`, `validation_status`, `certification_status`, `enforcement_status`, `dependency_hash`, `dependency_manifest jsonb`, `is_stale`, `stale_reason`, timestamps, actor columns, `reason`, `correlation_id`. Unique on `(entity_type, entity_id, entity_version)`. Enum `comm_hub_governance_entity_type` (7 values), one enum per lifecycle model.
- `comm_hub_certification` — immutable evidence rows (append-only via trigger). `certification_kind`, `result`, `dependency_manifest`, `dependency_hash`, `renderer_version`, `template_purpose`, `channel`, `template_type`, error/warning counts, `certified_by/at`, `stale_*`, `superseded_by`.
- `comm_hub_governance_audit` — one row per transition; ties to `correlation_id`.
- `comm_hub_sender_readiness` — computed readiness (`BLOCKED`/`TEST_READY`/`REAL_EMAIL_READY`/`STALE`) per sender profile version.
- `comm_hub_event_release_certification` — per-(module,event,channel) release ladder (`NOT_CERTIFIED`, `CONTROLLED_STUB_CERTIFIED`, `MANUAL_PRODUCTION_CERTIFIED`, `AUTOMATED_PRODUCTION_CERTIFIED`, `STALE`, `SUSPENDED`, `RETIRED`).

Immutability enforced via `BEFORE UPDATE`/`BEFORE DELETE` triggers that reject writes to `ACTIVE`/`RETIRED` and to certification rows (only `is_stale`/`stale_*`/`superseded_by` may change).

### 2. Canonical transition core (Section 4)

`_comm_hub_governance_transition_core(entity_type, entity_id, entity_version, target_status, expected_version, reason, actor)` — the only path allowed to move a governance row. Auth, admin check, reason required, row lock, version check, transition matrix per entity type, gate function dispatch, audit write, single version bump. Correction transitions (`VALIDATED→DRAFT`, `CERTIFIED→VALIDATED`, `DISCOVERED→DRAFT`) allowed with reason and dependency-active check.

Public RPCs: `comm_hub_validate_template_version`, `comm_hub_certify_template_version`, `comm_hub_activate_template_version`, `..._retire_...`, and equivalents for contract / schema / mapping / scenario / sender / event release. All delegate to core.

### 3. Dependency manifest & deterministic hash (Sections 6–7)

`comm_hub_build_dependency_manifest(entity_type, entity_id, entity_version)` returns a sorted `jsonb` with the fields listed in Section 6 for each entity type. Purpose-aware: `MANUAL_CORRESPONDENCE` and `DOCUMENT_GENERATION` skip event-only dependencies. Hash: `md5(regexp_replace(canonical_jsonb_text, '\s+', '', 'g'))` on a sorted rewrite (`comm_hub_canonicalize_jsonb`), never including secrets/timestamps/display names.

### 4. Stale detection (Sections 8–9)

Two-layer defence:

1. Targeted `AFTER INSERT/UPDATE` triggers on `core_template_version`, `communication_hub_template_variable_contract`, `..._event_payload_schema`, `..._event_template_map`, `..._event_test_scenario`, `..._sender_profile`, `..._event_send_policy`, `..._event_review_policy` → call `comm_hub_mark_dependent_certifications_stale(entity_type, entity_id)` which flips `is_stale=true` and records `stale_reason`.
2. Runtime re-check in every eligibility function: recompute current hash and compare against stored certification hash. Missed trigger cannot make stale config appear certified.

Historical evidence preserved: certifications never deleted, `superseded_by` chain, dry-run and controlled-stub snapshots retained.

### 5. Legacy backfill (Section 11)

`comm_hub_backfill_governance_assessment()` — one-shot RPC (idempotent, per-row upsert) that inserts a governance row for each of the 165 `PUBLISHED`/`ACTIVE` template versions with classification: `LEGACY_ASSESSED_CERTIFIABLE`, `LEGACY_REVIEW_REQUIRED`, `BLOCKED_CONFIGURATION`, `NOT_APPLICABLE_TO_EVENT_MAPPING`. Reuses the Phase 3 155-certifiable / 10-blocked outcome. Governance status starts at `DISCOVERED`; **not** auto-`ACTIVE`. Immutability rules apply only after admin explicit `CERTIFY`+`ACTIVATE`. Backfill report returned as `jsonb`.

### 6. Read-only validators (Section 12)

`comm_hub_validate_*` RO functions per entity type + `comm_hub_validate_event_release_eligibility(module,event,channel)`. Return `{entity, version, governance_status, dependency_hash, errors[], warnings[], blockers[], recommended_action, eligible_transitions[], renderable, test_ready, real_email_ready, manual_eligible, automated_eligible}`. No side effects.

### 7. Activation gates (Sections 13–18)

Gate functions called from the transition core. Template certify gate uses Phase 3 `certify_comm_hub_template_version` + variable-mapping + representative render (via canonical `render_comm_hub_template_version`). Contract/schema/mapping/scenario gates as specified. Manual and Automated event certification gates as specified. Automation-arm RPC (`arm_comm_hub_automation` from Phase 4A) will consume `comm_hub_event_release_certification` and return precise blockers replacing `automation_certification_evidence_incomplete`.

### 8. Preview / Dry Run / Controlled Stub integration (Sections 19–20)

- `prepare_comm_hub_preview` and callers extended: precheck governance before render; persist `governance_certification_id`, `dependency_hash`, versions on the snapshot (add columns to `communication_preview_snapshot`).
- `begin_comm_hub_dry_run` and `begin_comm_hub_controlled_live` extended to verify snapshot's `dependency_hash` still matches current certification; block on stale/superseded/suspended with structured codes.

### 9. Send-decision evaluator (Section 21)

Extend `_evaluate_comm_hub_send_rules` / `evaluate_comm_hub_send_decision` with structured governance blocker codes listed in Section 21. Frontend blocker catalogue extended accordingly.

### 10. Governance dashboard (Sections 22–24)

New admin route `/admin/communication-hub/governance`:

- Overview tiles (all 16 platform totals from Section 22) fed by `comm_hub_get_governance_dashboard_totals()` RPC.
- Searchable/filterable matrix by module/event/channel/blocker/stale from `comm_hub_list_governance_matrix()` RPC (paginated, permission-checked).
- Row drawer with dependency manifest diff (certified hash vs current), changed categories, required recertification sequence.
- Action buttons wired to the RPCs (Run Validation, Certify, Activate, Retire, Re-certify, View Manifest, View Stale Changes). Every action requires reason + expected version. No direct DB writes.

### 11. Auditing (Section 25)

Single `comm_hub_governance_audit` table. Every transition, stale detection, recertification writes exactly one row via the transition core. Correlation IDs generated per user action.

### 12. Tests & reports (Sections 26–31)

- Deterministic pgTAP-style SQL block in the migration exercising Sections 27/28/29 (valid/invalid transitions, hash determinism, dependency changes, gate rejections, RETIRED/ACTIVE immutability, historical readability, missed-trigger runtime stale detection).
- Vitest suite for the dashboard totals, matrix filtering, action wiring, RPC-only mutation invariant, permission gating.
- Regression exercise the Phase 4A 14-transition matrix + reason/version guards + Emergency Stop + STANDBY invariant.
- `comm_hub_backfill_governance_assessment()` execution + report of the 165 versions (movement vs Phase 3's 155/10).

### 13. Documentation (Section 32)

`docs/communication-hub/PHASE_4B_LIFECYCLE_CERTIFICATION_GOVERNANCE.md` covering every subsection listed in Section 32, plus a "what did NOT change from Phase 4A" invariant list and remaining blockers.

## Rollout order and safety

1. Additive schema + immutability triggers only (no writes to existing tables' data).
2. Transition core + RPCs + gates.
3. Manifest + hash + stale detection + runtime re-check.
4. Preview/Dry Run/Controlled Stub integration (add columns, no breaking rename).
5. Send evaluator blocker extension.
6. Legacy backfill in `DISCOVERED` state (never auto-active, never auto-retire).
7. Dashboard.
8. Tests + regression + backfill report.
9. Docs.

Nothing in Phase 4B sends a real email, runs cron, arms live automation, or executes batch/bulk. Manual and Automated Production remain **selectable** modes (Phase 4A behaviour preserved); only per-event send eligibility is gated by new governance evidence.

## Sequencing across turns

Given the scope, delivery will be split into 4 turns (each ending with a working, verifiable slice; nothing left half-applied):

- **Turn B1** — Schema (sidecar, certification, audit, readiness, event release) + immutability triggers + transition core + entity-type enums + backfill in `DISCOVERED`. Includes deterministic transition and immutability tests. Ends with 165 legacy versions assessed and visible.
- **Turn B2** — Manifest builder + deterministic hash + all validator RPCs + gates + stale detection (triggers + runtime re-check). Includes determinism / dependency-change tests.
- **Turn B3** — Preview / Dry Run / Controlled Stub / send-evaluator integration + automation-arm blocker refinement (RPC returns precise codes; still cannot arm live). Includes activation-gate tests.
- **Turn B4** — Governance dashboard (page, RPCs, drawer, actions) + Vitest suite + full regression + Phase 4A regression + PHASE_4B doc + final status.

After B4 the state is `PHASE_4B_LIFECYCLE_CERTIFICATION_GOVERNANCE_COMPLETE`. If any slice remains, the state is `PHASE_4B_LIFECYCLE_CERTIFICATION_GOVERNANCE_PARTIAL`.

Approve to proceed with Turn B1.
