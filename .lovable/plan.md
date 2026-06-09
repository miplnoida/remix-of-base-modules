
## Context

A previous pass already updated the three TS registries:
- `workflowRolesRegistry.ts` — all 19 `BN_*` (and generic) roles used by `bn_workbasket` are registered.
- `smartFieldRegistry.ts` — `ACTIVE_AWARD_LOOKUP` is registered.
- `formulaVariableRegistry.ts` — added `rate`, `base_rate`, `base_pension`, `flat_weekly_rate`, `grant_amount`.

Validating against live DB:
- `bn_workbasket.assigned_role` distinct values are all in registry → **Workflow Roles: 0 ERROR** already.
- `bn_field_metadata.field_type` includes `ACTIVE_AWARD_LOOKUP` → already covered.
- `bn_formula_template.formula_expression` still references **4 unregistered variables**:
  - `TIERED-PENSION` → `increment_rate`, `extra_years`
  - `SURVIVOR-SPLIT` → `share_pct`
  - `EI-DISABLEMENT` → `degree`
- Transition Matrix is already drift-WARNING only with `generateRegistrySuggestions()` available.

So the only real remaining noise is 4 formula-variable warnings and the lack of a one-click "fix drift" UI.

## Plan

### 1. Extend formula variable registry (eliminates remaining 4 WARNINGs)
Edit `src/services/bn/registries/formulaVariableRegistry.ts`. Append:
- `increment_rate` — percent, sample 1 — Tiered pension increment rate per extra year.
- `extra_years` — number, sample 10 — Years above qualifying threshold for tiered pension.
- `share_pct` — percent, sample 50 — Survivor beneficiary share %.
- `degree` — percent, sample 35 — Disablement degree % (EI).

### 2. Verify workflow role + smart field registries (no edits expected)
Re-read `workflowRolesRegistry.ts` and `smartFieldRegistry.ts` to confirm the prior pass persisted. If anything is missing (e.g., the listed BN_* roles or `ACTIVE_AWARD_LOOKUP`), re-add it.

### 3. Add "Fix Registry Drift" action on the Configuration Validation page
In `src/pages/bn/config/BenefitConfigurationValidation.tsx` add a card/button group beside the existing run-validation button with three actions:
- **Copy missing workflow roles** — diff `bn_workbasket.assigned_role` ∪ `bn_escalation_policy.escalation_target_role` against `BN_WORKFLOW_ROLES`; show the missing list and a copy-to-clipboard snippet to paste into `workflowRolesRegistry.ts`.
- **Copy missing formula variables** — diff parsed variables in `bn_formula_template` against `FORMULA_VARIABLES`; show snippet for `formulaVariableRegistry.ts`.
- **Copy missing smart-field types** — diff `bn_field_metadata.field_type` against `SMART_FIELD_TYPES`; show snippet for `smartFieldRegistry.ts`.
- **Generate transition registry suggestions** — already exists via `generateRegistrySuggestions()`, wire it into the same card and show a download/copy JSON.

Each click logs an entry to `system_audit_trail` via the existing `useBnConfigAudit` hook so the change request is auditable. After copying the snippet, the user (or follow-up Lovable turn) pastes it into the TS file — keeping the source-of-truth model intact (DB seed + TS registry both updated explicitly, no silent code mutation).

### 4. Re-run validation
After step 1, the report should show:
- Workflow Roles: 0 ERROR
- Formula Variables: 0 WARNING for the listed templates
- Smart Field Types: 0 WARNING for `ACTIVE_AWARD_LOOKUP`
- Transition Matrix: drift WARNING only (or clean), with regenerate JSON available.

## Files Touched
- `src/services/bn/registries/formulaVariableRegistry.ts` (extend)
- `src/services/bn/registries/workflowRolesRegistry.ts` (verify)
- `src/services/bn/registries/smartFieldRegistry.ts` (verify)
- `src/pages/bn/config/BenefitConfigurationValidation.tsx` (add Fix Drift card)
- possibly a small helper `src/services/bn/registryDriftService.ts` for snippet generation

No DB migration is needed — the role/field-type DB seeds are already in place; this pass only realigns the TS registries and adds the operator UX.
