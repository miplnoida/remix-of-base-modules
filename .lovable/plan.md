# Phase 4B3 — Unified Go-Live Certification Foundation

Goal: replace scattered manual checks with one server-owned certification runner that proves an event is ready for a target stage before any runtime row is created. No real email. No provider call.

The work lands in one iteration, sequenced so each layer is complete before the next depends on it.

## What ships (four foundations, together)

1. Targeted Controlled Stub message safety completed
2. Canonical business-event envelope (typed contract)
3. Platform-wide template renderability assessment (all 165 versions)
4. One event-level Go-Live Certification Runner + immutable manifest

Pilot event: `APPEALS / APPEAL_RECEIVED_NOTICE / email`.

## Sequence

### 1. Inspection (read-only)
- Confirm APPEALS event registration, template mapping, template version, active variable contract, payload schema.
- Enumerate all 165 active/published template versions with purpose classification.
- Confirm sender profile candidate + current readiness state.
- Confirm dispatcher/orchestrator wiring from Slice 2 is still in place.

### 2. Targeted-message safety completion
Slice 2 already landed authoritative creation + atomic targeted claim. Verify and close the remaining gaps:
- Confirm generic queue/cron/manual/batch/bulk claim paths exclude `targeted_dispatch_only = true`.
- Add missing rejection in any residual claim path found in step 1.
- Confirm `send_communication_v1` validator rejects reserved targeted fields.
- Confirm targeted evidence immutability trigger covers all frozen fields.

No new runtime rows created.

### 3. Canonical business-event envelope
- New TypeScript type `BusinessEventEnvelope` (module/event/entity/reference/occurredAt/schemaVersion/eventPayload/recipientIntent/correlationId/idempotencyKey/source).
- Static regression test proves envelope never carries: template code, version, flat tokens, sender, provider, From, recipient email, request number, generated timestamp, governance IDs, dependency hashes.

### 4. APPEALS pilot canonical payload + variable contract
- Confirm/land the APPEALS event payload schema (`appeal.id/reference/case_reference/submitted_at`) in `communication_hub_event_payload_schema`.
- Confirm/land contract entries for `appeal_reference`, `case_reference`, `submitted_at`, `recipient_name`, `request_no`, `generated_at` bound to canonical paths (`event_payload.appeal.*`, `recipient_context.display_name`, `request_context.request_no`, `system_context.generated_at`).
- Governed synthetic test fixture stores canonical `eventPayload` only (never flat tokens).
- Pilot adapter (or governed fixture) emits canonical envelope; strips flat template aliases if present in current adapter.

### 5. System-owned context resolvers
Server-side builders (all in Postgres, invoked by the runner):
- `recipient_context` — approved test recipient + policy version.
- `request_context` — request-no capability probe + correlation + timestamp.
- `system_context` — generated_at, module, event, channel, platform IDs.
- `sender_context` — profile ID, From/display/reply-to, readiness version.
Event payload cannot override these namespaces (assertion in resolver).

### 6. Platform-wide renderability assessment
New RPC `public.check_all_comm_hub_template_renderability()` returning one row per active/published version with: template/version ID, purpose, module/event, detected variables, contract status, source ownership, fixture status, recipient/sender requirements, resolved/unresolved counts, raw-token count, renderable flag, blockers, recommended action, dependency hash, checked timestamp. Purpose-specific rules for EVENT_COMMUNICATION / MANUAL_CORRESPONDENCE / DOCUMENT_GENERATION / FORM_OUTPUT.

### 7. Event-level Go-Live Certification Runner
New RPC `public.run_comm_hub_go_live_certification(p_module_code, p_event_code, p_channel, p_target_stage, p_execute default false)` performing all 30 checks listed in the brief and returning every blocker, not just the first. Stages: READINESS_ONLY / PREVIEW_READY / DRY_RUN_READY / CONTROLLED_STUB_READY. `p_execute` ignored (kept false) in this iteration.

### 8. Immutable event certification manifest + freshness
- Deterministic canonicalisation of safe identifiers and versions.
- SHA-256 manifest hash stored in a new/extended certification row.
- States: CURRENT / STALE / POSSIBLY_STALE / NOT_CERTIFIED / BLOCKED / SUPERSEDED.
- Staleness attributed to exactly one cause (template/contract/schema/mapping/scenario/recipient_policy/sender/code/dispatcher_contract).

### 9. Pre-runtime stop gate
`prepare_comm_hub_preview` (and downstream approve/dry-run/controlled-stub RPCs) refuse to create rows unless the current certification returns `ready_for_requested_stage = true` for the requested stage.

### 10. Other-adapter audit (read-only)
Classify each business-module comm adapter into: CANONICAL_EVENT_PAYLOAD / LEGACY_FLAT_TEMPLATE_TOKENS / DIRECT_SEND_BYPASS / NO_EVENT_SCHEMA / NO_VARIABLE_CONTRACT / NO_MAPPING / READY_FOR_MIGRATION. Report only; do not migrate.

### 11. Sender handling for the pilot
Run the existing sender verification pipeline against the resolved APPEALS sender profile. Record TEST_READY only from real evidence. No manual insertion. REAL_EMAIL_READY untouched.

### 12. Regression test — decoupling proof
Test that:
1. APPEALS canonical payload unchanged.
2. A template alias renamed in a test version.
3. Only the variable contract updated.
4. No adapter change.
5. New alias resolves.
6. Renders with zero raw tokens.

### 13. Tests, typecheck, build
Full suite listed in section P of the brief. All run headless. No provider calls.

### 14. Runner invocation (report only)
Call the runner READINESS_ONLY → PREVIEW_READY → DRY_RUN_READY → CONTROLLED_STUB_READY for APPEALS/APPEAL_RECEIVED_NOTICE/email. Report every field required in section Q. Do not execute Controlled Stub.

### 15. Documentation
`docs/communication-hub/PHASE_4B3_UNIFIED_GO_LIVE_CERTIFICATION.md` covering all sections in R.

## Technical details

### New/changed database objects (additive only)
- `communication_hub_event_payload_schema` — confirm APPEALS row (add if missing).
- `communication_hub_template_variable_contract` — confirm APPEALS mappings (add if missing).
- `communication_hub_event_certification` (new) — manifest hash, stage, state, blockers, superseded_by. Or extended `comm_hub_certification` if already suitable.
- Function `public.check_all_comm_hub_template_renderability() returns table(...)`.
- Function `public.run_comm_hub_go_live_certification(...) returns jsonb`.
- Function `public._build_comm_hub_event_manifest(...) returns jsonb`.
- Triggers on template/contract/schema/mapping/scenario/recipient_policy/sender to mark event certifications STALE with attribution.
- Guard in `prepare_comm_hub_preview` to require `ready_for_requested_stage=true`.
- All GRANTs kept minimal (service_role + authenticated where policies allow).

### New/changed code
- `src/platform/communication-hub/contracts/BusinessEventEnvelope.ts` — typed envelope + zod schema.
- `src/services/communication-hub/certificationRunnerService.ts` — thin RPC wrapper.
- `src/services/communication-hub/renderabilityService.ts` — thin RPC wrapper.
- Pilot APPEALS adapter/fixture normalised to canonical envelope.
- No changes to Preview/renderer/snapshot logic beyond the stop gate.

### Tests
`src/platform/communication-hub/__tests__/` and `src/__tests__/comm-hub/`:
- envelope purity tests
- APPEALS schema/contract resolution tests
- protected-namespace tests
- renderability RPC purpose-rule tests (mocked)
- manifest determinism tests
- freshness attribution tests
- runner readiness tests
- targeted queue-exclusion static tests
- decoupling regression test (section M)
- typecheck via `tsgo`
- build via existing pipeline

### Zero side effects
- No Controlled Stub execution.
- No provider invocation.
- No new runtime rows in `communication_request`, `communication_message`, `communication_controlled_live_execution`, `communication_controlled_live_grant`, `communication_delivery_attempt`.
- All row counts asserted before/after.

## Out of scope this iteration
- SEND_ONE_REAL_EMAIL and REAL_EMAIL_READY.
- Migrating any adapter other than APPEALS.
- `body_html_hash` / `body_text_hash` columns (still deferred).

## Progress estimate (post-iteration)
- Controlled Stub: ~1 iteration remaining (execute against certified APPEALS).
- One controlled live test email: ~3 remaining.
- First Manual Production event: ~5–7 remaining.

## Completion status target
`PHASE_4B3_UNIFIED_GO_LIVE_CERTIFICATION_FOUNDATION_COMPLETE` when every criterion in section T is met, otherwise `_PARTIAL` with the exact remaining blockers.
