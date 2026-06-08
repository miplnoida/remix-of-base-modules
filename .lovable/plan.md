
# Rule Catalogue Refactor — Master Configuration Architecture

Goal: cleanly separate **Facts**, **Rules**, **Coverage Types**, **Coverage Dashboard**, **Validation**, **Testing**, **Impact**, and **Readiness** — all independent of claim/SSN data except for an optional Runtime Simulation mode.

---

## 1. Information Architecture (single page, tabbed)

Keep `/bn/config/rule-catalogue` as the single entry point. Replace current tabs with:

1. **Overview** — readiness KPIs (facts ready, rules ready, coverage ready, blocked rules, missing facts).
2. **Facts** — Fact Catalogue master (CRUD + health).
3. **Rules** — Rule Catalogue master (CRUD, conditions reference facts only).
4. **Coverage Types** — assignment layer: pick rules + priority + effective date.
5. **Implementation Coverage** — renamed from "Coverage"; readiness dashboard with filters.
6. **Validation** — metadata-only validation results per rule (no claim).
7. **Test** — two sub-modes:
   - *Metadata Test* (default, no inputs)
   - *Runtime Simulation* (optional, claim/SSN inputs)
8. **Impact** — fact impact analysis (which rules/coverage/products break if fact changes).

Usage tab merges into Overview + Impact.

---

## 2. Database changes (migration)

New / extended tables:

- `bn_eligibility_fact` (existing) — add: `business_domain`, `source_system`, `required_context` (enum: CLAIM/PERSON/EMPLOYER/DEPENDENT/DECEASED/EVENT/NONE), `sample_values` (jsonb), `owner`, `is_resolver_registered` (bool, derived/cached).
- `bn_coverage_type` (new) — `id`, `coverage_code`, `coverage_name`, `description`, `active_flag`, audit cols.
- `bn_coverage_type_rule` (new) — assignment: `coverage_type_id`, `rule_code`, `priority`, `effective_date`, `end_date`.
- `bn_rule_catalogue` (existing) — add: `coverage_type_id` (nullable; rules can be assigned via assignment table — keep column optional for backward compat), `product_type`, `rule_category` (already exists as category), `priority`, `effective_date`, `end_date`, `implementation_status` (cached: READY/WARNING/BLOCKED), `rule_status` (DRAFT/READY/PUBLISHED/RETIRED).
- `bn_rule_condition` (new) — first-class condition rows so rules can hold multiple conditions with AND/OR groups: `id`, `rule_id`, `group_id`, `group_op` (AND/OR), `parent_group_id` (nested), `sequence`, `fact_key`, `operator`, `value_from`, `value_to`, `values jsonb`.

All public tables get standard GRANTs (authenticated + service_role); RLS stays off per project rule (role-based only).

Backfill: copy existing single-condition rules from `bn_rule_catalogue` into `bn_rule_condition` so the UI can render uniformly.

---

## 3. Services / Hooks

- `factCatalogueService.ts` — CRUD + health (`isReady = resolver_registered && source_table && source_column`).
- `ruleCatalogueService.ts` — extend with multi-condition CRUD via `bn_rule_condition`.
- `coverageTypeService.ts` (new) — CRUD + rule assignment.
- `ruleValidationService.ts` (new, metadata-only) — runs the checks in §5 below; returns `PASS/WARNING/FAIL` per check.
- `readinessService.ts` (new) — computes Fact / Rule / Coverage readiness %.
- `factImpactService.ts` (new) — given a fact_key, list rules + coverage types + products affected.
- Existing `factCoverageService.ts` becomes the data source for the Implementation Coverage tab (already metadata-only — good).
- `eligibilityFactResolver` continues to power Runtime Simulation only.

Hooks: `useCoverageTypes`, `useRuleConditions`, `useRuleValidation`, `useReadiness`, `useFactImpact`.

---

## 4. UI components

- `tabs/OverviewTab.tsx` — KPI cards + top-blocked-rules list.
- `tabs/FactsTab.tsx` — table + drawer editor; health badges; usage count column.
- `tabs/RulesTab.tsx` — table + rule editor dialog containing a `ConditionBuilder` (AND/OR groups, nested), fact picker (searchable), operator constrained to fact's `allowed_operators`.
- `tabs/CoverageTypesTab.tsx` — list + assignment editor (pick rules, priority, effective date); shows Readiness %.
- `tabs/ImplementationCoverageTab.tsx` — replaces current "Coverage"; filters (Coverage Type, Product, Category, Status, Fact Status); summary cards; per-rule rows with Readiness %, Implemented/Missing/Partial fact counts.
- `tabs/ValidationTab.tsx` — pick a rule (or run all); show PASS/WARNING/FAIL per check with explanation.
- `tabs/TestTab.tsx` — segmented control: **Metadata Test** (no inputs, runs full readiness + validation) vs **Runtime Simulation** (existing claim/SSN flow).
- `tabs/ImpactTab.tsx` — pick a fact; show affected rules, coverage types, products, and a "what-if disable" readiness delta.

Existing `RuleBuilder.tsx` is reused for conditions inside RulesTab.

---

## 5. Metadata Validation checks (no claim required)

Per rule:
1. `rule_code` present and unique
2. `rule_name` present
3. Each condition's `fact_key` exists in fact catalogue
4. Each referenced fact is `IMPLEMENTED` (else WARNING for PARTIAL, FAIL for NOT_IMPLEMENTED)
5. Operator ∈ fact.allowed_operators
6. Value format matches fact.data_type (number/date/boolean/enum)
7. `effective_date <= end_date` (when both present)
8. No circular fact references (fact pointing at a derived fact that re-enters)
9. Rule assigned to at least one Coverage Type if `rule_status = PUBLISHED`

Result rolled up: any FAIL → BLOCKED, any WARNING → WARNING, else READY.

---

## 6. Readiness formulas

- **Fact ready**: `resolver_function` registered ∧ `source_table` set ∧ `source_column` set ∧ `implementation_status = IMPLEMENTED`.
- **Rule readiness %**: `implemented_facts / total_facts_referenced`. ≥100 READY, 80–99 WARNING, <80 BLOCKED.
- **Coverage Type readiness %**: `ready_rules / assigned_rules`.

---

## 7. Claim independence guarantees

- Facts, Rules, Coverage Types, Validation, Readiness, Impact UIs contain **zero** inputs for claim_id / ssn / employer_no / event_date / deceased_ssn.
- Those inputs only appear inside `TestTab → Runtime Simulation`.
- Save/Publish flows never call resolvers that need claim context.
- `publishGuard.checkProductVersionPublishable()` is reused but the inputs are derived purely from catalogue metadata.

---

## 8. Files to create / edit

Create:
- `supabase/migrations/<ts>_rule_catalogue_refactor.sql` (new tables, columns, backfill, grants)
- `src/services/bn/coverageTypeService.ts`
- `src/services/bn/ruleConditionService.ts`
- `src/services/bn/ruleValidationService.ts`
- `src/services/bn/readinessService.ts`
- `src/services/bn/factImpactService.ts`
- `src/hooks/bn/useCoverageTypes.ts`, `useRuleConditions.ts`, `useRuleValidation.ts`, `useReadiness.ts`, `useFactImpact.ts`
- `src/components/bn/ruleCatalogue/tabs/{Overview,Facts,Rules,CoverageTypes,ImplementationCoverage,Validation,Test,Impact}Tab.tsx`
- `src/components/bn/ruleCatalogue/ConditionGroupBuilder.tsx` (AND/OR + nesting)
- `src/components/bn/ruleCatalogue/FactEditorDialog.tsx`
- `src/components/bn/ruleCatalogue/CoverageTypeEditorDialog.tsx`

Edit:
- `src/pages/bn/config/RuleCatalogue.tsx` — replace tab layout, remove claim inputs from non-Test tabs.
- `src/services/bn/ruleCatalogueService.ts` — extend for multi-condition rules + new fields.
- `src/services/bn/eligibilityFactService.ts` — new fields + health helpers.
- `src/services/bn/eligibility/factCoverageService.ts` — keep; rewire to ImplementationCoverageTab.
- `src/integrations/supabase/types.ts` — regenerated after migration.

No changes to runtime claim evaluation code (`eligibilityFactResolver`, `productEligibilityTest`, `contributionSnapshotService`) beyond reuse from the Runtime Simulation tab.

---

## 9. Rollout sequence

1. Migration (new tables, columns, backfill, grants).
2. Services + hooks.
3. New tabbed `RuleCatalogue.tsx` shell + tab components.
4. Wire validation + readiness everywhere; remove claim inputs from non-Test surfaces.
5. Smoke test in preview: create a fact, create a rule with 2 AND conditions, assign to a coverage type, see readiness %, run metadata validation — all without entering a claim ID.
