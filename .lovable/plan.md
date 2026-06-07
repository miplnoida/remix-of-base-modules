
# Benefit Product Approval / Override Policies — Implementation Plan

This is a large, foundational refactor. I'll deliver it in 6 phased PRs so you can review, test, and stop at any phase. Nothing existing breaks until a phase is merged.

## Current state (from scan)

- Only **Eligibility** has an override flow today: `bn_eligibility_override_request`, `eligibilityOverrideService.ts`, `EligibilityOverridesPanel.tsx`, `OverrideEligibilityDialog.tsx`, and a partial policy on `bn_product_version` (`override_*` columns) + `bn_override_policy` table (exists, but barely consumed).
- Hardcoded role arrays in `ActiveEligibilityPanel.tsx` (`SUPERVISOR_ROLES`, `REQUESTER_ROLES`) and self-approve guard in `eligibilityOverrideService.ts` (`SUPER_ADMIN` literal).
- `amendmentPolicyService.ts` exists for amendments but is not unified with overrides.
- Calculation, Documents, Workflow, Award, Payment, Communication, Participant — **no override mechanism**.
- No central policy evaluator. No unified override request table. No Product Catalog → Approval/Override Policies tab.

## Target architecture

```text
Product Catalog (Approval/Override Policies tab)
        │ writes
        ▼
 bn_approval_policy  (one row per product_version × policy_area × action_code)
        │ read by
        ▼
 bnPolicyEvaluator  ── canRequest / canApprove / evaluatePolicy
        │ used by
        ▼
 bnPolicyActionHandler  (one handler per area)
        │ writes
        ▼
 bn_override_request (unified)  +  system_audit_trail  +  bn_claim_event
        │ consumed by
        ▼
 Workbench panels (Eligibility, Calc, Docs, Amend, Workflow, Award, Payment)
```

## Phase 1 — Schema (single migration)

New tables (all in `public`, RLS off per project rule, GRANTs included):

1. **`bn_approval_policy`** — one row per `product_version_id` × `policy_area` × `action_code`. Columns: `is_enabled`, `requires_reason_code`, `requires_justification`, `requires_document`, `requires_supervisor_approval`, `approval_role`, `approval_workbasket_id`, `allowed_statuses text[]`, `blocked_statuses text[]`, `max_override_amount numeric`, `max_override_percent numeric`, `allowed_rule_codes text[]`, `blocked_rule_codes text[]`, `expiry_status text`, `audit_required bool default true`, `self_approval_allowed bool default false`, `reason_code_group text`, `non_waivable bool default false`.
2. **`bn_override_request`** (unified, per the spec): all fields from #5 in your brief. Statuses: `DRAFT|PENDING_APPROVAL|APPROVED|REJECTED|CANCELLED|EXPIRED`.
3. **`bn_override_request_event`** — append-only history (status, actor, notes).
4. **`bn_policy_area`** (lookup) — seed: `ELIGIBILITY, CALCULATION, DOCUMENTS, AMENDMENTS, PARTICIPANTS, WORKFLOW, AWARD, PAYMENT, COMMUNICATION`.

Migration also:
- Backfills one default `bn_approval_policy` row per existing product version × area (disabled by default, except `ELIGIBILITY` which mirrors current `bn_product_version.override_*` columns so behavior doesn't regress).
- Leaves the existing `bn_eligibility_override_request` table in place; a Phase-6 cleanup will dual-write then deprecate.

## Phase 2 — Central evaluator + handler scaffolding

- `src/services/bn/policies/bnPolicyEvaluator.ts` — pure read/decision layer. Exports: `getProductPolicies`, `evaluatePolicy(policyCode, ctx)`, `canRequestOverride`, `canApproveOverride`, `canWaiveDocument`, `canOverrideCalculation`, `canAmendClaim`, `canOverrideWorkflow`, `canApproveAward`, `canApprovePayment`. Returns `{ allowed: boolean; reasons: string[]; requires: { reasonCode, justification, document, supervisorApproval }; approverRole?, workbasketId? }`.
- `src/services/bn/policies/bnPolicyActionHandler.ts` — write layer. One handler per area, all going through a single `submitOverrideRequest(ctx)` + `reviewOverrideRequest(ctx)` core that: validates via evaluator → inserts `bn_override_request` → writes `system_audit_trail` (critical) + `bn_claim_event` → returns request id. On approve: marks downstream stale, applies effect via area-specific applier.
- `src/services/bn/policies/types.ts` — `PolicyArea`, `PolicyContext`, `PolicyDecision`, `OverrideRequest`.
- `src/hooks/bn/usePolicy.ts` — React hook wrappers (`usePolicyDecision`, `useSubmitOverride`, `useReviewOverride`, `usePendingOverrides`).

## Phase 3 — Product Catalog UI (Approval / Override Policies tab)

- New tab in `ProductEditor.tsx` → `OverridePoliciesTab.tsx` with 9 grouped cards (Eligibility, Calculation, Documents, Amendments, Participants, Workflow, Award, Payment, Communication).
- Each card has the toggles/inputs from §13. Saves to `bn_approval_policy`.
- Adds **Coverage Validation card** (§15): runs checks, lists gaps, links to fix.

## Phase 4 — Workbench wiring (remove hardcoded checks)

- Replace `SUPERVISOR_ROLES`/`REQUESTER_ROLES` arrays in `ActiveEligibilityPanel.tsx` with `usePolicyDecision({ area: 'ELIGIBILITY', action: 'REQUEST'|'APPROVE', ... })`.
- Replace `SUPER_ADMIN` literal in `eligibilityOverrideService.ts` with `policy.self_approval_allowed`.
- Add Override/Approval panels to:
  - `ActiveCalculationPanel.tsx` — Request Calculation Override, Manual Adjustment
  - Documents tab (`EvidenceChecklist.tsx` area) — Request Waiver / Accept Alternate
  - Benefit Details / Amendments — Request Amendment Override (consume existing `amendmentPolicyService`, wrapped by evaluator)
  - Workflow actions — Request Workflow Override
  - Awards/Payments panels — Request Payment/Award Override
- Each panel: `<OverridePanel area="CALCULATION" claimId=... />` — one shared component, area-specific config from policy.

## Phase 5 — Area handlers (effect appliers)

For each area, the "apply on approval" effect:
- ELIGIBILITY: set rule result to `OVERRIDDEN`, recompute overall → `ELIGIBLE_WITH_OVERRIDE`, mark calc stale.
- CALCULATION: write `bn_calc_override` row, mark payment blocked until re-run.
- DOCUMENTS: set `bn_claim_document.status='WAIVED'` with reason; respect `non_waivable`.
- AMENDMENTS: unlock specified field area in `bn_product_amendment_policy` scope for this claim only.
- PARTICIPANTS: allow add/remove/edit participant outside normal stage lock.
- WORKFLOW: allow re-routing or skipping a step in current workflow instance.
- AWARD: write `bn_award_status_event` with override reason; backdate effective date.
- PAYMENT: release hold, override method/bank, adjust amount within policy thresholds.
- COMMUNICATION: re-send / suppress / re-template.

Every applier: audit (critical) + claim event + downstream-stale markers.

## Phase 6 — Cleanup, codemod, tests

- Codemod scan & replace remaining hardcoded role/status checks (will produce a report first; not blind-replace).
- Dual-write `bn_eligibility_override_request` → `bn_override_request`, switch reads, deprecate old table in a follow-up.
- Vitest cases per §17 acceptance list.
- Update `.lovable/rules/workflow-maker-checker.md` to point to the new evaluator.

## What I need from you before starting

1. **Confirm scope** — should I execute all 6 phases now, or stop after Phase 1+2+3 (foundation + catalog UI) so you can review before wiring up every workbench tab?
2. **Self-approval rule** — keep current "Super Admin can self-approve" as the *default* value of `self_approval_allowed` per area? Or default to `false` everywhere and require explicit opt-in per product?
3. **Existing `bn_override_policy` table** (already in schema, barely used) — fold into the new `bn_approval_policy` and drop, or keep both? Recommend: fold + drop in Phase 6 after data backfill.
4. **Threshold currency** — `max_override_amount` per product currency from `bn_country_payment_config`, correct?

Once you answer these I'll start with Phase 1 (the migration).
