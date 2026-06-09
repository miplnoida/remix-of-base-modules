# BN Rule Governance Implementation Plan

Scope is large and crosses DB seeding, the workflow engine, Rule Library UI, validation gates, Product Catalog gating, and audit. I want your sign-off on the phasing and a few key decisions before I start changing code, so we don't end up half-wiring two parallel systems.

## Phasing

### Phase 1 — Foundation (DB seed + governance state on rules)
Single migration + seed:
- Seed 7 roles in `roles` (idempotent on `role_name`).
- Seed `app_modules` row `bn_rule_governance` + 14 `module_actions` (one per `bn.rules.*` permission).
- Seed `role_permissions` matrix per spec.
- Seed 6 `bn_workbasket` rows mapped to roles.
- Add `governance_status` column to `bn_eligibility_rule` (enum-as-text: DRAFT, TECHNICAL_REVIEW, LEGAL_REVIEW, LEGAL_CONFIRMED, READY_FOR_PRODUCT_USE, ACTIVE, RETIRED) defaulting from existing `status` field, plus `legal_reference`, `legal_notes`, `jurisdiction_country`, `effective_date`, `legal_approver_comment`, `legal_approved_by`, `legal_approved_at`, `technical_validated_by`, `technical_validated_at`.
- Backfill `governance_status` from existing `status` where possible.

### Phase 2 — Workflow template
- Create `workflow_definitions` row `RULE_GOVERNANCE_WORKFLOW` (process_type `BN_ELIGIBILITY_RULE`, secured_table `bn_eligibility_rule`).
- Create 7 `workflow_steps` (one per stage) with `assigned_role`.
- Create `workflow_action_configurations` + `workflow_action_outcomes` for the 9 transitions in the spec, each tied to the correct role.
- Audit: writes to `workflow_logs`, `workflow_execution_logs`, `system_audit_trail` happen automatically via existing engine — verify, don't re-implement.

### Phase 3 — Rule Library UI rewiring
- Remove manual status select on rule detail.
- Replace with `WorkflowActionsBar` driven by `useWorkflowActions(workflowName='RULE_GOVERNANCE_WORKFLOW', recordId=rule.id)` — same hook other modules use.
- Each action button calls existing `useExecuteWorkflowAction` mutation. No new approval system.
- Show current `governance_status` badge + read-only legacy `status`.

### Phase 4 — Validation gates (server-side, in transition)
Implement as Postgres functions invoked by the transition action handler (or as a guard in `useExecuteWorkflowAction` precheck — confirm pattern used elsewhere first):
- `bn_validate_rule_technical(rule_id)` → checks fact exists/implemented, operator allowed, value present, dates valid, no cycles. Returns `{ok, errors[]}`.
- `bn_validate_rule_legal(rule_id)` → checks legal_reference, legal_notes, jurisdiction, effective_date, approver_comment all populated.
- Transitions PASS_TECHNICAL_REVIEW / APPROVE_LEGAL block on failures; errors surface in toast.

### Phase 5 — Product Catalog integration
- `EligibilityTabRedesigned` "Add rules" dialog filters to `governance_status IN ('READY_FOR_PRODUCT_USE','ACTIVE')`.
- If product version is DRAFT, allow attaching `LEGAL_REVIEW`+ rules with an inline warning chip.
- On product version activation (existing activate flow), add precheck: every attached rule's `governance_status` must be `LEGAL_CONFIRMED | READY_FOR_PRODUCT_USE | ACTIVE`. Otherwise block with list of offending rules. On successful activation, system transitions each attached READY rule → ACTIVE via `ACTIVATE_WHEN_USED`.

### Phase 6 — Configuration Validation card + Audit verification
- New card on the existing `bn/config/validation` page: "Rule Governance Workflow" running 8 checks listed in spec.
- Quick audit sanity script confirms `workflow_logs` + `system_audit_trail` entries land per action.

## Key decisions I need from you

1. **`bn_eligibility_rule.status` vs new `governance_status`** — keep both (status = legacy/display, governance_status = workflow truth) or migrate status fully? I recommend keeping both for one release and deprecating `status` once UI is migrated.
2. **Validation gates** — implement as Postgres SECURITY DEFINER functions called from a thin edge function the workflow action invokes, or as TS-side precheck in `useExecuteWorkflowAction`? Most other modules use TS precheck. I recommend TS precheck for parity.
3. **Backfill** — for existing rules with status='active', set `governance_status='ACTIVE'` and stamp legal_approved_at=now with a system marker, or leave them in DRAFT and require re-governance? I recommend auto-stamp ACTIVE with `legal_notes='Backfilled from legacy status'` so live products don't break.
4. **Scope of this turn** — do you want all 6 phases in one go, or ship Phase 1+2+3 first (governance live but Product Catalog still permissive) and follow up with 4+5+6? Given the size I strongly recommend splitting.

Reply with your picks (or "all defaults, ship phases 1–3 now") and I'll execute.
