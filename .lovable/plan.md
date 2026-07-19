
# Benefits Gap Epic — Means-Test Assessment

Following the same discipline established for Overpayment Recovery: portable command pipeline, server-authorised handlers, no direct Supabase mutations from UI, canonical facts published into the **existing** eligibility engine (no second engine).

## Guiding constraints

- Reuse `gapCommandPipeline`, `gapCapabilityRegistry`, `bn_actor_has_capability`, and the modernisation transition pack conventions.
- Relational columns for all defined financial values; JSONB only for country-specific extensions and the calculation trace.
- Replace the placeholder `MEANS_TEST_PASSED` fact with a real resolver — the eligibility engine must **refuse** expired/unapproved assessments.
- Communications go through the Communication Hub façade; documents through `core_generated_document`. No new sending, template, or provider tables.
- Never overwrite IP / employer / contribution / finance source systems — read-only adapters + assessment snapshots.

## Slice plan

### Slice 1 — Foundation (types, state machine, commands, capabilities, facts contract)
Files:
- `src/types/bn/gap/means/meansStateMachine.ts` — 13 lifecycle states + 5 outcomes, transition matrix, terminal states, legacy status mapping.
- `src/types/bn/gap/means/meansCommands.ts` — 18 command definitions with maker-checker, authority tier, evidence, ledger-impact-none, communication metadata.
- `src/types/bn/gap/means/meansFactContract.ts` — canonical `means.*` facts published to eligibility engine, plus refusal rules for expired/unapproved.
- `src/services/bn/gap/meansAssessableCalculator.ts` — pure functions: income annualisation, disregards, deductions, asset valuation, household threshold, excess/shortfall, rounding precision.
- Extend `gapCapabilityRegistry.ts` with the full verb map (policy authoring, assessment authoring, verification, adjustment, approval, activation, reassessment, supersede, close, config).
- Tests: `meansAssessmentFoundation.test.ts` covering state reachability, command invariants, calculator boundary/precision/frequency cases, fact contract shape, refusal of expired/unapproved.

Acceptance: Foundation tests green; no runtime code touched yet.

### Slice 2 — Data model migration (14 tables)
One migration, ordered:
1. `bn_means_policy` — code, name, scope, legal_reference, status
2. `bn_means_policy_version` — policy_id, version_no, effective_from/to, approval, methodology
3. `bn_means_policy_threshold` — version_id, household_size, region, base_threshold, per_person_adjustment, max_assets
4. `bn_means_policy_disregard` — version_id, category (income|asset), rule_type, amount/percent, condition
5. `bn_means_assessment` — assessment_no, claim_id, ip_id, product_version_id, policy_version_id, status, valid_from/until, decided_by, approved_by
6. `bn_means_household_member` — assessment_id, ip_link, relationship, dob, treatment
7. `bn_means_income` — assessment_id, member_id, category, gross_amount, frequency, annualised_amount, disregarded_amount, assessable_amount, source_ref
8. `bn_means_asset` — assessment_id, member_id, category, gross_value, disregarded_value, assessable_value, valuation_basis, source_ref
9. `bn_means_deduction` — assessment_id, category, amount, evidence_ref
10. `bn_means_evidence` — assessment_id, requirement_code, document_id, verification_status, verified_by
11. `bn_means_adjustment` — assessment_id, field_path, before_value, after_value, justification, authority, requested_by, approved_by
12. `bn_means_result` — assessment_id, gross_household_income, disregarded_income, assessable_income, gross_assets, disregarded_assets, assessable_assets, allowable_deductions, household_size, threshold, excess_amount, passed, policy_version_id, trace (jsonb), valid_from, valid_until, reassessment_due
13. `bn_means_event` — assessment_id, event_type, from_status, to_status, actor, payload
14. `bn_means_reassessment_schedule` — assessment_id, due_date, reason, status

Each table: GRANT to authenticated + service_role, ENABLE RLS, policies scoped through `bn_actor_has_capability`, `updated_at` trigger. Indexes on assessment_id, claim_id, ip_id, policy_version_id, status.

### Slice 3 — Server-authorised command handlers
Edge functions (or `SECURITY DEFINER` RPCs where transactional):
- `bn-means-policy-command` — Create/Version/Approve/Retire policy; effective-date guardrails.
- `bn-means-assessment-command` — 18 commands from Slice 1. Handlers enforce state machine, capability check, idempotency (`bn_gap_idempotency`), evidence gates, maker-checker for adjustments and approval, atomic writes to result + event tables, and publish facts to `bn_eligibility_fact` on ACTIVATE.
- `bn-means-fact-resolver` (RPC) — replaces placeholder `MEANS_TEST_PASSED`. Reads the currently-active, non-expired, approved result for the claim; refuses otherwise with a diagnostic code.
- All handlers use `gapCommandPipeline` envelope and write `bn_gap_command_log`.

Tests: per-command scenarios including permission denial, invalid transition, idempotency, concurrency (two approvers), expired-assessment refusal, fact publication.

### Slice 4 — UI (routes, wizard, workspace)
Add all 8 routes; register in `AppRoutes.tsx` and admin menus:
- `MeansTestDashboardPage` — worklist tiles + KPIs.
- `MeansTestPolicyManagerPage` + version manager.
- `MeansAssessmentWizardPage` — household → income → assets → deductions/disregards → evidence → calculation trace → adjustments → approval.
- `MeansAssessmentDetailPage` — result panel, comparison with prior, appeal linkage, communication/audit timeline, reassessment tab.
- `MeansReassessmentsPage`, `MeansReportsPage`, `MeansConfigPage`.
- Integrations: Claim Workbench tab, Product Catalog binding editor, Eligibility Review chip, Award 360 alert card for reassessment due, claimant portal declaration form.
- All mutations dispatch through the gap command envelope — architecture test extended to forbid direct inserts in `src/pages/bn/means/**` and `src/features/bn/means/**`.

### Slice 5 — Eligibility & Award integration
- Register `means.*` facts in `bn_data_field_registry` and wire the new resolver into the existing eligibility engine.
- Delete/deprecate the placeholder `MEANS_TEST_PASSED` rule; migrate any product versions using it to reference the new fact set.
- Award 360: subscribe to `bn_means_event` for ACTIVATED / EXPIRED / REASSESSMENT_DUE; add mutation guard so awards linked to means-tested products refuse activation without an ACTIVE result.
- Communication Hub events: `MEANS_ASSESSMENT_SUBMITTED`, `EVIDENCE_REQUESTED`, `ASSESSMENT_APPROVED`, `ASSESSMENT_REJECTED`, `REASSESSMENT_DUE`, `ASSESSMENT_EXPIRED` — registered through the Hub façade, no new templates tables.

### Slice 6 — Reporting, diagnostics, OpenAPI, certification
- Reports listed in the epic (by result, average assessable income, threshold utilisation, reassessments due, expired, adjustment usage, override analysis, category analysis, appeals).
- Extend `gapDiagnosticsService.ts` and the gap completion register with the Means-Test module entry, capability coverage matrix, command inventory, fact coverage, and route registration proof.
- OpenAPI spec additions for the two edge functions + resolver RPC.
- End-to-end scenario tests covering all 21 acceptance test cases enumerated in the epic (single person → concurrency → audit → fact output).

## Technical section

- State machine implementation mirrors `overpaymentStateMachine.ts` (typed `MeansAssessmentStatus`, `TRANSITIONS`, `TERMINAL_STATUSES`, `mapLegacyStatus`).
- Calculator uses `Decimal`-style integer minor-units + explicit rounding precision from policy; never JS float for money.
- Idempotency: `(command_type, assessment_id, idempotency_key)` unique in `bn_gap_idempotency`.
- Concurrency: optimistic version column `row_version` on `bn_means_assessment` and `bn_means_result`.
- Fact publication is transactional with status transition to `ACTIVE`; superseding writes a new fact row and marks prior `valid_until = now()`.
- All 8 routes are behind capabilities: `bn.means.view`, `bn.means.author`, `bn.means.verify`, `bn.means.adjust`, `bn.means.approve`, `bn.means.activate`, `bn.means.reassess`, `bn.means.config`.

## Deliverable per slice

I'll implement one slice per turn, run the platform test suite, and report the total pass count before proceeding — same cadence as the Overpayment epic. Say the word and I'll start Slice 1.
