# BN Calculation Engine — Configurable Build Plan

This is a large, multi-phase build. Given the size (15 sections, ~10 new tables, engine rewrites, seed data, simulation tests), I'll execute it in **5 sequenced phases**, each delivered as its own migration + code drop so you can review and reject before the next phase starts.

## Phase 1 — Schema Foundation (DB migration)

Create/verify tables (with GRANTs, audit columns, no RLS per project rule):

**Formula Library (verify existing, add columns if missing):**
- `bn_formula_template`, `bn_formula_version` (add `MEDICAL_TARIFF_LOOKUP` to `expression_type`)
- `bn_formula_variable_registry`, `bn_product_formula_binding`, `bn_product_formula_variable_mapping`
- `bn_calculation_trace`

**Rate / Matrix (verify + extend):**
- `bn_rate_table` — add `table_type`, `lookup_mode`, `legal_reference`, audit cols
- `bn_rate_table_dimension` — add `match_type`, `dimension_type`
- `bn_rate_table_row` — add `dimension_values_json`, `output_key`, `output_type`, effective dates

**Medical Tariff Engine (new):**
- `bn_medical_procedure` (extend existing with `treatment_type`, `procedure_category`)
- `bn_medical_location_type` (new)
- `bn_medical_provider_type` (new)
- `bn_medical_tariff_table` (new)
- `bn_medical_tariff_row` (new)
- `bn_medical_authorization_rule` (new — replaces single-cap logic)

All tables: GRANT to authenticated + service_role, no RLS (per project rule), audit triggers for updated_at, change-log triggers writing to `system_audit_trail`.

## Phase 2 — Seed Data (insert tool)

- Variable registry (~30 entries from section 6)
- Derived facts (section 7)
- Rate tables: `AGE_PENSION_RATE_TABLE`, `DISABLEMENT_RATE_TABLE`
- Matrix: `SURVIVOR_SHARE_MATRIX`
- Medical procedures (MRI_BRAIN, CARDIAC_SURGERY, DIALYSIS)
- Location types (LOCAL_SK, CARIBBEAN, INTERNATIONAL)
- Provider types (PUBLIC, PRIVATE, OVERSEAS, APPROVED_NETWORK, NON_NETWORK)
- Medical tariff rows (section 9 examples)
- Formula templates (section 10, all 8 templates)

All seed rows tagged with `SEED-` prefix per project memory rule.

## Phase 3 — Engine Code

**New / updated files:**
- `src/services/bn/calc/medicalTariffLookup.ts` — Step 1–4 logic from section 5
- `src/services/bn/calc/rateTableLookup.ts` — extend with MATRIX_MATCH, range overlap detection
- `src/services/bn/calc/formulaRunner.ts` — add `MEDICAL_TARIFF_LOOKUP` step kind
- `src/services/bn/calc/calculationEngine.ts` — orchestrator: resolve variables → execute formula → write trace
- `src/services/bn/calc/validation.ts` — formula/rate/matrix/tariff/product validators (section 12)
- `src/services/bn/calc/legacyAudit.ts` — scanner that reports all usage from section 1

**Legacy cleanup:**
- Search & report usages of `calculationRules.formula`, `MOCK_BENEFIT_RULES`, hardcoded `{AWE}/{AIW}/{PensionRate}/{TotalContributions}` placeholders
- Quarantine to `src/services/bn/_legacy/` (not deleted, but no longer imported by Product Catalog / Workbench / Entitlement / Payment / Simulation runtime)

## Phase 4 — Product Catalog UI

Replace legacy Calculation tab in Product Catalog with new sections:
- Formula picker (from `bn_formula_template`)
- Stage selector
- Variable mapping grid (resolver-driven)
- Rate / Matrix / Medical Tariff table pickers
- Product parameter editor
- Cap / min / max / rounding controls
- Simulation runner with trace viewer
- **Medical product mode:** procedure availability matrix, tariff binding, authorization rules, referral/emergency/approval-level controls

## Phase 5 — Simulation Tests + Acceptance

Vitest specs covering section 13:
- Age Pension AIW 1000 × weeks 1200 → 400
- Age Grant AWW 500, 250 wks, 5 units × 6 → 15000
- Medical MRI Local 3000 @ 80% capped 2000 → 2000
- Medical Cardiac Caribbean 90000 capped 75000 → 75000

Plus validator unit tests and a CI check that fails build if `MOCK_BENEFIT_RULES` or legacy placeholders re-enter runtime imports.

## Technical notes

- Per project memory: **no RLS**, role-based security only
- Per project memory: seed rows use `SEED-` tag
- Per project memory: `user_code` (VARCHAR 50) used for created_by/updated_by audit fields
- Per project memory: RPCs dropped + recreated with explicit signatures
- All schema changes use the migration tool with full GRANT blocks
- Existing `bn_medical_*` tables already have data — Phase 1 migration uses `ADD COLUMN IF NOT EXISTS` and never drops existing columns
- Formula expression evaluation continues using existing `safeExpressionParser`

## Open questions before I start

1. **Scope of legacy removal** — section 1 says "Move legacy/demo calculation config out of runtime." Do you want me to physically delete the legacy files, or quarantine to `_legacy/` and remove imports only (safer rollback)?
2. **Product Catalog UI** (Phase 4) — should I rebuild the existing Calculation tab in-place, or create a new "Calculation v2" tab and keep the old one read-only during transition?
3. **Currency** — seed examples use XCD. Confirm that's correct for St. Kitts & Nevis tariffs.
4. **Phase delivery** — proceed phase-by-phase with your approval between each, or run all 5 in sequence and you review at the end?

Once you answer (or say "go ahead with defaults: quarantine, in-place rebuild, XCD, all 5 phases sequential"), I'll start with the Phase 1 migration.