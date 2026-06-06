## Claim Workbench → Active Processing Cockpit

This is a large redesign touching field-edit rules, business actions, multiple tabs, workflow integration, and permissions. To keep it shippable and verifiable, I'll split it into 4 phases. Each phase is independently testable and leaves the workbench in a working state.

### Phase 1 — Foundation: field ownership, Save behavior, Benefit Details fallback (items 1, 2, 12)
- Add a field-ownership registry (`src/lib/bn/fieldOwnership.ts`) with four classes: `CITIZEN_SUBMITTED`, `STAFF_REVIEW`, `SUPERVISOR_DECISION`, `SYSTEM_DERIVED`, plus an `isFieldEditable(field, status, roles)` resolver.
- Tag Sickness Benefit fields per spec (citizen vs staff). Drive `BenefitDetailSection` field rendering from the registry (read-only chip vs editable input, with reason on hover).
- Confirm merge precedence in workbench: `raw_application_json.benefit_facts` (aliased) → `bn_claim_detail.detail_json` → local edits. Aliases: `incapacity_date ↔ illness_start_date`, `return_date ↔ expected_return_date`.
- Save only writes staff fields to `bn_claim_detail.detail_json`; never overwrites `raw_application_json`.

### Phase 2 — Active business actions (item 3) + Eligibility & Calculation tabs (items 4, 5)
- Rewrite `executeClaimAction` so each action calls real services, not just a status update:
  - `CHECK_ELIGIBILITY` → run engine, persist `bn_claim_eligibility` + rule trace (rule_code, field_key, actual, expected, operator, passed, source, message).
  - `RUN_CALCULATION` → require passing eligibility (or override), run calc engine, persist `bn_claim_calculation` + formula trace.
  - `REQUEST_EVIDENCE`, `SUBMIT_DECISION`, `APPROVE`, `DENY`, `REQUEST_INFO`, `SUSPEND`, `REOPEN`, `WITHDRAW`, `CLOSE` get real preconditions and side-effects (decision row, award/payment scaffolding for APPROVE).
- Eligibility tab: empty state with "Run Eligibility" CTA; result state with rule trace table; buttons Run / Re-run / Request Evidence / Override (gated) / Deny for Ineligibility (supervisor).
- Calculation tab: empty state with "Run Calculation" CTA; result state with formula, inputs, AWW, caps, periodicity, trace lines; buttons Run / Re-run / Override (gated) / Submit for Decision.

### Phase 3 — Documents, Decisions, Overview blockers, per-tab boundaries (items 6, 7, 8, 11)
- Documents tab: required-by-product checklist + uploaded list + verification status + blocking flag. Actions: Upload, Verify, Reject, Request Replacement, Mark Pending, Waive (gated). Mandatory unverified blocks APPROVE.
- Decisions tab: recommendation panel + supervisor decision panel + timeline + buttons (Recommend Approve/Deny, Supervisor Approve/Deny, Send Back).
- Overview tab: processing checklist (identity, docs, staff fields, eligibility run/passed, calc, decision, workflow task) + warnings + next-best-action.
- Confirm every `TabsContent` is wrapped in `ClaimWorkbenchTabBoundary` (already exists from prior work); add consistent loading/empty/error/retry shells in each panel.

### Phase 4 — Workflow integration & real permissions (items 9, 10) + cross-status testing (item 13)
- If `bn_claim.workflow_instance_id` is present: load active task + allowed actions from `workflow_tasks`/`workflow_step_actions`; completion calls workflow step → BN status sync via mapping table. Else fall back to `CLAIM_TRANSITIONS`. Never both at once.
- Replace `userRoles = ['Admin']` hardcodes with `useSupabaseAuth().roles` + a new `useHasBnPermission(permission)` hook backed by `role_permissions`. Wire the 10 BN permissions across action bar, override buttons, doc waiver, supervisor decision.
- Test pass: walk one claim through SUBMITTED → INTAKE_REVIEW → EVIDENCE_REVIEW → ELIGIBILITY_CHECK → CALCULATION → DECISION → APPROVED, plus DENIED / PENDING_INFO / SUSPENDED branches. Verify edit rules, action visibility, real engine execution, doc blocking, decision/award creation, and TypeScript build.

### Technical notes
- New files: `src/lib/bn/fieldOwnership.ts`, `src/services/bn/eligibilityEngine.ts`, `src/services/bn/calculationEngine.ts`, `src/services/bn/decisionService.ts`, `src/hooks/bn/useHasBnPermission.ts`, `src/components/bn/workbench/panels/EligibilityPanel.tsx` (rewrite), `CalculationPanel.tsx` (rewrite), `DocumentsPanel.tsx` (rewrite), `DecisionsPanel.tsx` (new), `OverviewChecklist.tsx` (new).
- Heavy edits: `claimWorkbenchService.executeClaimAction`, `ClaimActionBar` (preconditions + permission gates), `BenefitDetailSection` (field registry), `ClaimWorkbench.tsx` (wire new panels).
- DB: no new tables required; uses existing `bn_claim_eligibility`, `bn_claim_calculation`, `bn_claim_decision`, `bn_award`, `bn_claim_evidence`, `bn_claim_event`, `bn_claim_document`, `workflow_instances/tasks`.
- Risk: eligibility/calculation engines are non-trivial. Phase 2 will ship a working engine for **Sickness Benefit** end-to-end and a generic rule-evaluator skeleton for other products, then expand product coverage incrementally.

### Suggested approval flow
Confirm this phased approach and I'll start Phase 1 immediately. If you'd rather I attempt all four phases in one shot, say so — it will be a much larger single change with higher regression risk.