# BN Approval / Override Policy Consolidation

## Goal
Make `bn_approval_policy` + `bnPolicyEvaluator` the **only** runtime authority for every override / approval / waiver / amendment decision in Benefits. Demote `bn_override_policy` to a legacy migration source. Unify Product Catalog UX, fix Workbench eligibility override visibility for claim `BN-20260607-75991` (EI-EMP-ACTIVE), and add a runtime-consistency diagnostic.

---

## Phase 1 — Inventory (no code changes)
Search and classify every reference to:
- `bn_override_policy`, `fetchOverridePolicies`, `upsertOverridePolicy`, `deleteOverridePolicy`, `OverridePolicies`, `Overrides (Legacy)`
- `bn_approval_policy`, `useProductPolicies`, `bnPolicyEvaluator`, `eligibilityOverrideService`

Deliverable: short report listing
- runtime files reading `bn_override_policy` (to be cut over)
- Product Catalog UI files
- Workbench override path
- Eligibility override service path

## Phase 2 — Runtime cutover to `bn_approval_policy`
Refactor each runtime consumer to call `bnPolicyEvaluator` (`canRequestOverride`, `canApproveOverride`, area-specific helpers):
- `services/bn/eligibilityOverrideService.ts`
- Calculation override action
- Document waiver action
- Amendment / participant change actions
- Workflow / award / payment / communication override actions
- Workbench claim-detail action resolver

Remove direct `from('bn_override_policy')` reads from any non-migration file.

## Phase 3 — Policy evaluator hardening
Extend `bnPolicyEvaluator.evaluatePolicy` to return a richer diagnostic:
```
{ allowed, reasons, policyId, productVersionId, policyArea,
  currentUserRoles, requiredRole, claimStatus, allowedStatuses,
  ruleCode, allowedRuleCodes, blockedRuleCodes,
  makerCheckerRequired, requesterUser, requires }
```
Cover: enabled, status allowed/blocked, rule allowed/blocked, role/permission, maker-checker, self-approval, reason/document required, amount/percent thresholds. Add unit-style smoke logging.

## Phase 4 — Eligibility override flow (Workbench)
On the Workbench Eligibility tab:
- Fetch latest failed rules from `bn_claim_eligibility`.
- For each failed rule call `canRequestOverride({area:'ELIGIBILITY', ruleCode, claimStatus, ...})`.
- Show **Request Override** button when allowed; show denial reason inline when blocked (never hide silently).
- Show **Pending Override** badge when `bn_override_request` row exists for that rule.
- Show **Approve / Reject** only when `canApproveOverride` returns allowed (different reviewer than requester unless `self_approval_allowed`).
- On approval: insert/update eligibility override, recompute overall result → `ELIGIBLE_WITH_OVERRIDE` only if no other blocking failures, mark calc stale, write `bn_claim_event` + `system_audit_trail`.

Backed by existing `bn_override_request` (acts as the eligibility-override-request table).

## Phase 5 — Product Catalog UI cleanup
- Keep a single **Approval / Override Policies** tab covering all 9 policy areas (ELIGIBILITY, CALCULATION, DOCUMENTS, AMENDMENTS, PARTICIPANTS, WORKFLOW, AWARD, PAYMENT, COMMUNICATION).
- Remove / hide the legacy Overrides tab and menu entries from the normal UI.
- Add a Super-Admin-only **Legacy Override Policies** diagnostic panel listing old rows, migration status, and the target `bn_approval_policy` row id.

## Phase 6 — ApprovalPoliciesTab UX upgrade
Replace free-text fields with structured pickers:
- Approver role → dropdown from `roles` master
- Reason code group → dropdown from `bn_reason_code` groups
- Allowed / blocked statuses → multi-select from `bn_claim_status_def`
- Allowed / blocked rule codes → searchable multi-select from product-version `bn_eligibility_rule` / `bn_calculation_rule`
- Workbasket → dropdown from `bn_workbasket`
- Live policy diagnostic preview (sample claim → evaluator output)
- Help text differentiating **Workflow** ("controls claim movement between stages") vs **Approval / Override Policies** ("controls exceptions, overrides, waivers, amendments, and who approves").

## Phase 7 — Migration utility
Add `migrateLegacyOverridePoliciesToApprovalPolicies()` (server RPC + admin button):
- `target` → `policy_area`
- `field_path` / rule → `allowed_rule_codes`
- `allowed_role` → `approval_role`
- `requires_maker_checker` → `requires_supervisor_approval`
- `requires_justification` → `requires_justification`
- `max_amount` → `max_override_amount`
- `is_active` → `is_enabled`
Idempotent — never overwrite existing `bn_approval_policy` rows unless `force=true` confirmed.

## Phase 8 — Configuration Validation card
New "Policy Runtime Consistency" card in Product Catalog Admin:
- 0 runtime reads of `bn_override_policy` (static scan flag)
- every active product version has ≥1 `bn_approval_policy` row
- enabled policies requiring supervisor approval have an `approval_role`
- reason group exists when `requires_reason_code`
- allowed statuses ⊂ `bn_claim_status_def`
- allowed rule codes ⊂ product rules
- unmigrated legacy rows count
- duplicate / conflicting policy rows

## Phase 9 — Targeted fix for claim `BN-20260607-75991` (EI-EMP-ACTIVE)
After cutover:
1. Insert / verify `bn_approval_policy` row: `policy_area=ELIGIBILITY`, `action_code=DEFAULT`, `is_enabled=true`, `approval_role=Admin`, `allowed_rule_codes={EI-EMP-ACTIVE}`, `allowed_statuses={INTAKE,ELIGIBILITY_REVIEW,...}`, `requires_justification=true`, `requires_supervisor_approval=false`, `self_approval_allowed=true`.
2. Run evaluator and surface diagnostics in the Workbench panel.
3. Expected: **Request Override** is now visible to `admin@secureserve.gov`.

## Acceptance
- Single Approval / Override Policies tab in Product Catalog.
- Legacy override UI hidden from normal users; Super-Admin diagnostic only.
- Workbench reads `bn_approval_policy` exclusively.
- Override buttons show with diagnostic denial reasons, never silently hidden.
- Maker-checker enforced; self-approval gated by policy.
- All override actions write `bn_claim_event` + `system_audit_trail`.
- TypeScript build passes.

## Technical notes
- `bn_override_request` is reused as the cross-area request table (`policy_area=ELIGIBILITY` plays the role of `bn_eligibility_override_request`).
- No RLS added (per project rule); access stays role-gated.
- Migration file only for any new helper RPC (`migrate_legacy_override_policies`, `evaluate_policy_diagnostic`). No schema-destructive changes; `bn_override_policy` table stays for migration input.
- All `created_by` / `updated_by` use logged-in user's `user_code`.

## Scope size
Large — touches Product Catalog UI, Workbench, services layer, and one DB helper. No destructive migrations. Estimate ~15–25 files changed plus 1 SQL migration.
