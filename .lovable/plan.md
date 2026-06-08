# Rule Catalogue ↔ Rule Group ↔ Product Catalogue Linkage

Wire the existing `bn_rule_group` table to the Rule Catalogue and Product eligibility editor so business users can manage rules by group instead of one-by-one.

## 1. Database (single migration)

**`bn_rule_catalogue`** — add:
- `rule_group_id uuid` (FK → `bn_rule_group.id`, nullable)
- `rule_group_code text`
- `default_group_sort_order int`
- `default_rule_sort_order int`
- index on `rule_group_id`

**`bn_eligibility_rule`** — add (most already exist; fill gaps):
- `rule_group_id uuid`, `rule_group_code text`
- `catalogue_rule_id uuid`, `catalogue_rule_version int`
- `sort_order int` (if missing)

No data destruction. No RLS changes.

## 2. Seed recommended group ↔ rule links

Update `bn_rule_catalogue` rows by `rule_code` to populate `rule_group_code` / `rule_group_id` for the groups listed in the request (COMMON_ELIGIBILITY, EMPLOYMENT_CHECKS, EMPLOYMENT_INJURY_CHECKS, CONTRIBUTION_CHECKS, TIMING_CHECKS, DOCUMENT_MEDICAL_CHECKS, DEATH_DOCUMENT_CHECKS, MEDICAL_BOARD_CHECKS, FUNERAL_CHECKS, SURVIVOR_DEPENDENCY_CHECKS, MATERNITY_CHECKS). Create any of these groups in `bn_rule_group` if missing (active=true).

## 3. Rule Catalogue UI (`RuleCatalogue.tsx` / `RulesTab`)

- Add **Rule Group** dropdown to Add/Edit dialog (loads active `bn_rule_group`, optional).
- Add **Group filter** above the Rules table.
- Table columns: Code, Name, **Group**, Fact Key, Operator, Default Value, Fail Action, Active, Fact Coverage, Used By Products, Actions.
- Do NOT add a new Rule Groups tab — Rule Group screen already exists.

## 4. Existing Rule Group screen — Linked Rules tab

In the existing Rule Group detail screen, add a **Linked Rules** section:
- List `bn_rule_catalogue` rows where `rule_group_id = current group`.
- Reorder (updates `default_rule_sort_order`).
- Unlink (sets `rule_group_id = null`).
- Per-rule readiness badge (reuses fact implementation_status + legal readiness).
- Group readiness: READY / WARNING / BLOCKED based on linked-rule statuses.

## 5. Product Catalogue → Eligibility Rules

Two new actions on the eligibility rules tab:
1. **Add Rule from Catalogue** — existing per-rule picker (extend with group column).
2. **Add Rule Group from Catalogue** — pick a group, preview linked active rules with coverage, confirm → insert one `bn_eligibility_rule` per linked catalogue rule, copying defaults and stamping `rule_group_id`, `rule_group_code`, `catalogue_rule_id`, `catalogue_rule_code`, `catalogue_rule_version`, `fact_key`, `operator`, `value_from/to/values`, `fail_action`, `failure_message`, `sort_order`, `is_active=true`.

In the product rule editor:
- **Editable:** value_from, value_to, values, fail_action, failure_message, sort_order, is_active.
- **Locked (read-only):** fact_key, resolver_function, source_table, source_column, catalogue_rule_code, rule_group_code.

## 6. Publish guard (`publishGateService.ts`)

Add checks that block publish when any active product eligibility rule has:
- missing `catalogue_rule_code`
- missing `fact_key`
- fact `implementation_status = NOT_IMPLEMENTED` or unlinked
- invalid operator
- required threshold missing for operator (e.g., BETWEEN without value_to)
- linked group readiness = BLOCKED
- a required group (per product config) absent entirely

## 7. Out of scope
- No new Rule Groups CRUD screen (use existing).
- No changes to resolver code or fact definitions.
- No changes to legal readiness logic (already in place).

## Files touched (approx.)
- `supabase/migrations/<new>.sql` — schema additions + group seeding
- `src/services/bn/ruleCatalogueService.ts` — new fields, group filter
- `src/hooks/bn/useRuleCatalogue.ts` — group list hook
- `src/pages/bn/config/RuleCatalogue.tsx` + RulesTab/FactEditorDialog — Group dropdown, filter, columns
- Existing Rule Group detail page — add Linked Rules section
- Product eligibility editor + new `AddRuleGroupFromCatalogueDialog.tsx`
- `src/services/bn/config/publishGateService.ts` — new guards
