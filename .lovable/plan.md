## Goal
Move from a 1-rule-to-1-group model to a many-to-many model where **Rule Category** is the primary classification and **Rule Groups** become optional reusable bundles. Rebuild Product Catalogue → Eligibility around Category-first selection with Group templates as accelerators, plus pre-save conflict detection.

## 1. Database migration
New migration adds the join table and enriches product eligibility rows.

```sql
-- 1a. Many-to-many: rule <-> group
CREATE TABLE public.bn_rule_group_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_group_id uuid NOT NULL REFERENCES public.bn_rule_group(id) ON DELETE CASCADE,
  catalogue_rule_id uuid NOT NULL REFERENCES public.bn_rule_catalogue(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  default_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text, updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_group_id, catalogue_rule_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rule_group_item TO authenticated;
GRANT ALL ON public.bn_rule_group_item TO service_role;
-- RLS disabled per project standard (role-based only).

-- 1b. Backfill from existing bn_rule_catalogue.rule_group_id
INSERT INTO public.bn_rule_group_item (rule_group_id, catalogue_rule_id, rule_code, sort_order, default_active)
SELECT rule_group_id, id, rule_code, COALESCE(default_rule_sort_order,0), is_active
FROM public.bn_rule_catalogue
WHERE rule_group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 1c. Make rule_group_id on catalogue optional / deprecated (keep column for back-compat, drop NOT NULL/usage in UI).

-- 1d. Enrich bn_eligibility_rule with category + group provenance
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS rule_category text,
  ADD COLUMN IF NOT EXISTS source_rule_group_id uuid REFERENCES public.bn_rule_group(id),
  ADD COLUMN IF NOT EXISTS source_rule_group_code text,
  ADD COLUMN IF NOT EXISTS catalogue_rule_version int;

-- 1e. Helper view for "used in groups" count
CREATE OR REPLACE VIEW public.bn_rule_catalogue_group_usage AS
SELECT catalogue_rule_id, COUNT(*) AS group_count,
       array_agg(DISTINCT rule_group_id) AS group_ids
FROM public.bn_rule_group_item GROUP BY catalogue_rule_id;
GRANT SELECT ON public.bn_rule_catalogue_group_usage TO authenticated;
```

## 2. Service layer
- `src/services/bn/ruleGroupItemService.ts` (new): `listGroupItems(groupId)`, `listGroupsForRule(ruleId)`, `addRulesToGroup(groupId, ruleIds[])`, `removeFromGroup(itemId)`, `reorder(groupId, ordered[])`.
- `src/services/bn/ruleCatalogueService.ts`: drop `rule_group_id` lookup writes; add `getGroupUsageMap()` returning `Record<ruleId, {count, groupCodes[]}>`.
- `src/services/bn/eligibility/productEligibilityService.ts` (extend existing): `bulkAddRulesFromCatalogue(versionId, [{ruleId, sourceGroupId?}])` populating new category + provenance columns.
- `src/services/bn/eligibility/conflictDetectionService.ts` (new — separate from cross-tab `conflictDetectionService`): pre-save analyzer returning `[{ruleA, ruleB, reason, suggestion}]`. Checks:
  - Same `fact_key` with incompatible operators (`>` vs `<`, `EQUALS` vs `NOT_EQUALS` with same value, etc.).
  - Opposite age rules (e.g., `AGE_AT_CLAIM >= 60` AND `< 60`).
  - Duplicate contribution thresholds (same fact_key + operator family).
  - Duplicate timing thresholds.
  - Document status rules expecting different values for same doc.
  - `NOT_IMPLEMENTED` or unlinked facts.
  - Active rule missing threshold for value-bearing operator.

## 3. Rule Catalogue screen (`src/pages/bn/config/RuleCatalogue.tsx` + `RuleEditorDialog`)
- Rename column/field label **Group → Category**. Category is required.
- Remove the single "Linked Rule Group" dropdown from the editor.
- Add **Used in Groups** column showing count + tooltip listing group codes.
- Add a side panel "Manage Group Memberships" launched per row → multi-select Rule Groups to add/remove via `bn_rule_group_item`.

## 4. Rule Groups screen (`src/pages/bn/config/RuleConfiguration.tsx`, `RuleGroupLinkedRules.tsx`)
- Replace current "linked = catalogue.rule_group_id == this group" logic with `bn_rule_group_item` queries.
- "Add Rules to Group" dialog: filter catalogue by category + search + active, multi-select, insert into join table.
- Remove button now deletes the join row instead of nulling catalogue FK.
- Reorder updates `sort_order` on join row.

## 5. Product Catalogue → Eligibility (`EligibilityRulesTab.tsx`)
Replace existing add flow with two entry points:

**A. Add by Category** (`AddRulesByCategoryDialog.tsx` new):
- Accordion per category (12 categories from spec).
- Inside: searchable list of active rules with READY/PARTIAL/BLOCKED badge from `computeRuleCoverage`.
- Multi-select across categories. Save → bulk insert via service.

**B. Add from Rule Group Template** (`AddRulesFromGroupDialog.tsx` new):
- Select group → list all member rules preselected with checkboxes.
- Can deselect / add more from same category. Save bulk-inserts with `source_rule_group_id` set.

Inline conflict panel runs after each add and again pre-save:
- `ConflictPreviewPanel.tsx` (new) — for each conflict shows `Rule A | Rule B | Reason | Suggested Action` with Resolve buttons (Remove A / Remove B / Mark allowed).

Lock UI for `fact_key`, resolver, source table/column, `catalogue_rule_code`. Editable: `value_from/to/values`, `fail_action`, `failure_message`, `is_active`, `sort_order`.

## 6. Publish guard (`publishGuard.ts`)
Add: any unresolved conflict from new detector → BLOCK.

## 7. Verification
- Migration applies; backfill row count > 0.
- `/bn/config/rules` shows Category + Used in Groups; no mandatory group.
- `/bn/config/rule-groups` add/remove rules persists via join table.
- Product → Eligibility: "Add by Category" + "Add from Template" work; conflict panel surfaces opposite-age and duplicate-threshold scenarios.

## Technical notes
- Keep `bn_rule_catalogue.rule_group_id` column for back-compat but stop writing to it (deprecated comment).
- Conflict detector is pure TS over the in-memory rule set — no RPC.
- No RLS (project policy: role-based only).
- All `created_by/updated_by` use logged-in `user_code`.
