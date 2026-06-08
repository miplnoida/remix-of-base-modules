## Goal
Rule Catalogue currently conflates a static "Group" enum (AGE/CONTRIBUTION/…) with the real master Rule Groups (CONTRIB-STB, COMMON_ELIGIBILITY, …). Split into two concepts:

- **Rule Category** — broad classification (renamed from current `group_type`).
- **Rule Group** — FK to `bn_rule_group` (existing master).

## 1. Database migration
File: `supabase/migrations/<new>.sql`

- `bn_rule_catalogue`:
  - Keep `group_type` but treat as **Category**. Add CHECK against expanded enum: AGE, CONTRIBUTION, EMPLOYMENT, MEDICAL, DOCUMENT, TIMING, DEPENDENCY, FUNERAL, MATERNITY, MEANS_TEST, RESIDENCE, COMMON, INJURY.
  - Ensure FK `rule_group_id → bn_rule_group(id)` exists (added in prior migration); add `rule_group_name` (denormalized for display) — refreshed on upsert.
  - Backfill `group_type` mapping where currently invalid.
- `bn_rule_group`:
  - Ensure master rows exist (insert if missing, idempotent): COMMON_ELIGIBILITY, AGE-RULES, EMPLOYMENT_CHECKS, EMPLOYMENT_INJURY_CHECKS, CONTRIB-STB, CONTRIB-LTB, CONTRIB-EI, TIMING_CHECKS, MEDICAL, DOCUMENT_CHECKS, DEPENDENCY_CHECKS, FUNERAL_CHECKS, MATERNITY_CHECKS, MEANS-TEST.
- **Seed mapping**: UPDATE `bn_rule_catalogue` SET `rule_group_id/code/name` for every rule listed in the user's spec (NO_DUPLICATE_CLAIM → COMMON_ELIGIBILITY, PERSON_REACHED_PENSION_AGE → AGE-RULES, etc.). Skip rule codes that don't exist.

## 2. Service layer
File: `src/services/bn/ruleCatalogueService.ts`

- Add `RULE_CATEGORIES` constant (the 13 categories above). Keep `RULE_GROUP_TYPES` export aliased for back-compat but mark deprecated.
- Extend `RuleCatalogueItem` and input to include `rule_group_name`.
- `upsertRuleCatalogue`: when `rule_group_id` is set, look up code+name from `bn_rule_group` and persist all three.

File: `src/services/bn/ruleGroupService.ts` (extend or create helper)
- `listLinkedCatalogueRules(groupId)` — returns catalogue rows + coverage status.
- `unlinkCatalogueRule(catalogueId)` and `reorderLinkedCatalogueRules(groupId, ordered[])`.

## 3. Rule Catalogue UI
- `src/components/bn/ruleCatalogue/RuleEditorDialog.tsx` (current Add/Edit dialog):
  - Rename "Group" field label → **Rule Category** (dropdown sourced from `RULE_CATEGORIES`).
  - Add new **Linked Rule Group** dropdown loaded from `bn_rule_group` (filter active, optional Category match hint).
- `src/pages/bn/config/RuleCatalogue.tsx` rules table columns:
  - Code, Name, **Category**, **Linked Rule Group**, Fact Key, Operator, Default Value, Fail Action, Coverage, Active.
  - Update group filter to filter by `rule_group_code` (real master); add separate Category filter.

## 4. Rule Groups screen — Linked Rules tab
File: `src/pages/bn/config/RuleConfiguration.tsx` (existing edit dialog) — embed `RuleGroupLinkedRules.tsx` (already exists). Enhance to:
- Show readiness badge per rule (READY/PARTIAL/BLOCKED) using `computeRuleCoverage`.
- Aggregate group readiness in header: READY all ready • WARNING if any partial • BLOCKED if any blocked/unlinked fact.
- Reorder via drag handles updating `default_rule_sort_order`.
- Unlink button → sets `rule_group_id = null` on the catalogue row.

## 5. Product Catalogue → Eligibility
File: `src/components/bn/config/EligibilityRulesTab.tsx`
- Two distinct actions: **Add Rule from Catalogue** (existing per-rule dialog) and **Add Rule Group from Catalogue** (`AddRuleGroupFromCatalogueDialog.tsx`, already exists — verify it now sources rules via `rule_group_id` rather than the old `group_type`).
- When importing a group: bulk-insert one `bn_eligibility_rule` per linked rule with `fact_key`/`operator`/`catalogue_rule_code` locked; product-editable: `value_from/to/values`, `fail_action`, `failure_message`, `is_active`, `sort_order`.

## 6. Publish guard
File: `src/services/bn/eligibility/publishGuard.ts`
Add blockers:
- Active rule missing `fact_key`.
- Active rule's fact `implementation_status = NOT_IMPLEMENTED`.
- Active rule missing required threshold (operator needs value but value_from/to/values empty).
- Catalogue rule references a `rule_group_id` whose group has any BLOCKED member (warn-only) — keep current rule-coverage block.
- Product version flagged `requires_grouped_eligibility` (new optional column? — skip; rely on per-rule checks).

## 7. Verification
- Rebuild types after migration, run typecheck.
- Reload `/bn/config/rules` and confirm Category vs Rule Group are distinct.
- Open a Rule Group → linked rules show with readiness.
- Product Catalogue → "Add Rule Group" picks from real master groups.

## Technical notes
- `group_type` CHECK constraint will be DROP'd and recreated with expanded list to avoid breaking existing rows.
- `rule_group_name` is denormalized; not auto-synced via trigger to keep migration light — refreshed on upsert and via a one-time backfill UPDATE.
- No new tables; all changes hit existing tables → no new GRANT/RLS work.