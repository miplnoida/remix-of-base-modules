# Formula Library + Medical Engine Cleanup

This is a large, two-track cleanup. I'll do it in clearly separated phases so you can stop or redirect after any phase.

---

## Track A — Formula Library lifecycle

### A1. Audit current state (read-only)
- Inventory: `src/pages/bn/config/Formula*`, `src/components/bn/config/formula/*`, `src/services/bn/formulaService*`, `src/hooks/bn/useBnFormula*`, types in `src/types/bn/formula*`.
- DB: `bn_formula_template`, `bn_formula_version`, `bn_formula_variable_registry`, `bn_product_formula_binding`, `bn_product_formula_variable_mapping`, `bn_rate_table*`.
- Output: short doc `docs/bn/formula-library-audit.md` listing existing screens, actions, gaps vs. requested actions.

### A2. Service layer — lifecycle operations
Add (or consolidate) in `src/services/bn/formulaLifecycleService.ts`:
- `addFormula(input)` → creates template + v1 DRAFT
- `cloneFormula(templateId)` → new template, copies latest version as DRAFT
- `editDraft(versionId, patch)` → only allowed when status=DRAFT
- `createNewVersion(templateId)` → copies latest ACTIVE/RETIRED to new DRAFT version
- `submitForReview(versionId)` → DRAFT → PENDING_APPROVAL
- `activateVersion(versionId)` → PENDING_APPROVAL → ACTIVE; demotes prior ACTIVE to SUPERSEDED
- `retireFormula(templateId)` → all versions → RETIRED (blocked if any active product binding)
- `deleteFormula(templateId)` → only if **zero** rows in `bn_product_formula_binding` across all versions
- `getUsage(templateId)` → list of products/versions referencing it

Guardrails enforced server-side via single RPC `bn_formula_lifecycle_guard(action, ids)` so UI cannot bypass.

### A3. Screen: Formula Library (`src/pages/bn/config/FormulaLibrary.tsx`)
Tabs:
1. Active Formulas
2. Drafts
3. Retired
4. Variable Registry (reuse existing)
5. Rate / Matrix Tables (reuse existing)
6. Product Usage (new: formula × product matrix)
7. Simulation (reuse existing)

Each row/card columns: code, name, category, active version, variable count, used-by count, governance status, last updated, action menu.

Action menu maps 1:1 to A2 service calls. Destructive actions show usage before confirm. Raw JSON/expression is collapsed behind "Show technical detail" (gated by `bn.config.rules.advanced`).

### A4. Add Formula wizard (`src/components/bn/config/formula/AddFormulaWizard.tsx`)
8 steps as specified. State held in a single typed reducer. Step 8 calls `addFormula` then redirects to detail page with status=DRAFT.

### A5. Product Catalog linkage
Confirm `bn_product_formula_binding` already stores only `formula_template_id` + `formula_version_id` (per Phase F audit). Update `ProductCatalog` Bindings tab to:
- hide raw expression
- show "View formula" link to Formula Library
- block save if selected version is not ACTIVE

---

## Track B — Medical engine consolidation

### B1. Audit (read-only) → `docs/bn/medical-engine-audit.md`
Tables, screens, services, runtime resolvers, duplicate concepts. Compare:

```
Concept              Medical Policy Library         New Tariff
-------------------- ------------------------------ ------------------------------
Procedure            bn_medical_procedure           bn_medical_tariff_row.procedure
Facility avail.      bn_medical_facility_procedure  (none)
Referral             bn_medical_referral_rule       (embedded in tariff)
Reimb. limits        bn_medical_reimbursement_limit bn_medical_tariff_row
Documents            bn_medical_authorization_rule  (none)
Tariff rows          (none — pre-cleanup)           bn_medical_tariff_table/row
```

(Phase prior already extended `bn_medical_reimbursement_limit` with location/provider/method/etc., and pointed the resolver at it. This phase finishes the job.)

### B2. Decision
**Medical Policy Library wins.** Tariff tables (`bn_medical_tariff_table`, `bn_medical_tariff_row`) are marked DEPRECATED and hidden from UI. Any remaining data migrated into `bn_medical_reimbursement_limit` (idempotent re-run of prior migration covers this).

### B3. Schema
Migration:
- Ensure `bn_medical_reimbursement_limit` supports all fields in section 6 (procedure, treatment type, expense type, location region incl. `CARIBBEAN`/`INTERNATIONAL`, provider type, referral, pre-auth, emergency, board, method, percent, ceiling, fixed amount, currency, effective dates, legal ref). Add any missing columns.
- Add CHECK on `location_code` allowing `LOCAL_ST_KITTS | NEVIS | CARIBBEAN | INTERNATIONAL | ANY`.
- `COMMENT ON TABLE bn_medical_tariff_table IS 'DEPRECATED …'` (already partly done; ensure both tables marked).
- Optional: revoke `SELECT` from `authenticated` on deprecated tables so runtime cannot read them.

### B4. Single resolver
- Rename/consolidate to `src/services/bn/calc/medicalPolicyResolver.ts` exposing `resolveReimbursement(input)`.
- Delete `medicalTariffLookup.ts` and any `reimbursementLimitResolver`. Re-export shim for one release if needed.
- Update calculation engine call sites + tests.

### B5. Screens
- Keep `/bn/config/medical/*` set (procedures, facility-availability, referral-rules, reimbursement-limits, expense-types, review-rules, documents).
- `ReimbursementLimitsPage`: expose new columns (location region incl. Caribbean, provider type, method, fixed amount, ceiling, referral/emergency/pre-auth flags, legal ref).
- Remove/redirect any `/bn/config/medical/tariff*` routes and the legacy `MedicalRulesConfig` page if duplicative. Keep `/bn/config/medical` index as landing.

### B6. Product Catalog linkage
Product Catalog Medical tab stores only references:
- `medical_policy_set_id` (group of `bn_medical_reimbursement_limit` rows scoped by tag/version), `referral_policy_id`, `document_policy_id`, `procedure_group_id`. No inline JSON tariff.

### B7. Configuration Validation
Extend `CalculationReadiness` (or add `ConfigValidation.tsx`) with checks:
- duplicate medical engine detected (any deprecated table has rows newer than cutoff)
- product linked to deprecated table
- medical policy row missing `location_code`
- no rules covering `CARIBBEAN` / `INTERNATIONAL`
- formula references unknown resolver name
- simulation run on representative claim fails

### B8. Acceptance
- `bunx vitest run src/__tests__/bn-calc/medical-tariff.test.ts` (renamed to `medical-policy.test.ts`) green.
- `product-bindings.test.ts` green.
- TypeScript build passes.

---

## Sequencing & checkpoints
1. **A1 + B1 audits** (docs only) — review before code changes.
2. **A2 + A3 + A4** Formula Library UX.
3. **B3 + B4** Medical schema + resolver consolidation (single migration).
4. **B5 + B6** Medical UI + Product Catalog linkage.
5. **A5 + B7** Product Catalog gating + Configuration Validation.
6. Build + tests.

## Technical details
- No RLS changes (project rule).
- All destructive table/column changes preceded by a Live row check.
- New columns get safe defaults; no NOT NULL on existing tables without backfill.
- Deprecated tables: comment + revoke SELECT from `authenticated`; do not drop until a later release.

## Out of scope
- Reworking the simulation engine internals.
- Net-new calculation types beyond the five listed.
- Migration of legacy `bn_calc_legacy_snapshot` data.

Shall I start with Phase 1 (audits only) and come back with the two audit docs before touching code?