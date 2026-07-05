# Epic 1.1.1 — Enterprise Reference Framework Hardening & Adoption Wave 1

**Status:** Implemented (schema + service). Admin UI deferred.
**Parent:** `docs/enterprise/EPIC_1_1_ENTERPRISE_REFERENCE_FRAMEWORK.md`
**Precondition satisfied:** all changes are additive; no existing consumer breaks.

---

## 1. Scope

Hardens the existing `core_reference_group` / `core_reference_value` foundation
into the enterprise-wide Reference Framework described in Epic 1.1, without
retiring or renaming anything already in production.

Out of scope for 1.1.1:
- Data migration of `tb_*`, `bn_*`, `ce_*`, `lg_*` masters.
- Replacement of existing `/admin/master-data/*` screens.
- BN Product Builder work — remains **ON HOLD** (Epic 0.40 gate).

---

## 2. Delivered

### 2.1 Additive schema (single migration)

New tables (all in `public`, role-based access, no RLS per project rule):

| Table | Purpose |
|---|---|
| `core_reference_category` | Groups related reference types (e.g. GEOGRAPHY, FINANCE). |
| `core_reference_value_i18n` | Locale-specific label/description per value. |
| `core_reference_value_external_code` | Mapping to external / legacy system codes. |
| `core_reference_value_alias` | Search aliases (synonyms, historical spellings). |

Additive columns on `core_reference_group`:
`category_code`, `ownership_module_code`, `is_platform_owned`,
`is_org_overridable`, `lifecycle_status`, `supports_hierarchy`,
`supports_i18n`, `supports_external_codes`.

Additive columns on `core_reference_value`:
`parent_value_id`, `hierarchy_path`, `depth`, `version`, `supersedes_id`,
`scope_type` (default `PLATFORM`), `scope_org_id`, `deleted_at`, `deleted_by`.

Constraint change (widening only, backward-compatible):
`status` now accepts `DRAFT | ACTIVE | INACTIVE | SUPERSEDED | RETIRED`
(previously `ACTIVE | INACTIVE | RETIRED`).

All new tables use `bn_reference_touch_updated_at` for `updated_at`.
GRANTs match existing pattern: `authenticated` full CRUD, `service_role` all.

### 2.2 Service extensions

`src/services/core/coreReferenceDataService.ts` gains read-first APIs:

- `listCategories(opts?)`
- `listGroups(opts?)` — module + category + active filter
- `getGroup(groupCode)`
- `listItems(groupCode, opts?)` — supports parent, scope, soft-delete filters
- `getItem(groupCode, valueCode)`
- `resolveHierarchy(valueId)` — walks parents to root
- `addAlias({ valueId, alias, aliasType?, locale? })`
- `addExternalCode({ valueId, systemCode, externalCode, ... })`
- `translate(valueId, locale)` — falls back to base label

Existing exports (`listReferenceGroups`, `listReferenceValues`,
`listReferenceValuesByGroupId`, `upsertReferenceGroup`,
`upsertReferenceValue`, `deleteReferenceValue`, `setReferenceValueActive`,
`BN_REF_GROUPS`, `BnReferenceGroup`, `BnReferenceValue`) are **unchanged**.
`useReferenceValues(groupCode)` continues to work.

### 2.3 Admin UI

Deferred. The task allowed adding `/admin/reference-framework` "only if
aligned with existing Platform Admin". The current Platform Admin surface
already ships `/admin/master-data/*` for the same tables. Introducing a
parallel route in 1.1.1 would risk duplicate management screens for the
same rows and is not required to unblock downstream service work.

Follow-up epic (1.1.2) will add the framework console once category /
governance data is populated and the master-data screens are ready to fold in.

---

## 3. Backward compatibility

- Every new column has a default or is nullable.
- No existing column dropped, renamed, or retyped.
- No table renamed or dropped.
- Existing `status` values remain valid.
- Existing rows in `core_reference_group` / `core_reference_value` untouched.
- No routes, hooks, `app_modules`, menus, feature flags, or permissions changed.
- BN, Legal, Compliance dropdowns continue to resolve through the pre-existing
  API surface.

---

## 4. Rollback

Rollback is safe because everything is additive.

```sql
-- 1. Restore original status check
ALTER TABLE public.core_reference_value DROP CONSTRAINT IF EXISTS core_reference_value_status_check;
ALTER TABLE public.core_reference_value
  ADD CONSTRAINT bn_reference_value_status_check
  CHECK (status IN ('ACTIVE','INACTIVE','RETIRED'));

-- 2. Drop new child tables (data loss limited to 1.1.1 artefacts)
DROP TABLE IF EXISTS public.core_reference_value_alias;
DROP TABLE IF EXISTS public.core_reference_value_external_code;
DROP TABLE IF EXISTS public.core_reference_value_i18n;

-- 3. Remove FK, then category table
ALTER TABLE public.core_reference_group
  DROP CONSTRAINT IF EXISTS core_reference_group_category_code_fkey;
DROP TABLE IF EXISTS public.core_reference_category;

-- 4. Drop additive columns on core_reference_value
ALTER TABLE public.core_reference_value
  DROP COLUMN IF EXISTS parent_value_id,
  DROP COLUMN IF EXISTS hierarchy_path,
  DROP COLUMN IF EXISTS depth,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS supersedes_id,
  DROP COLUMN IF EXISTS scope_type,
  DROP COLUMN IF EXISTS scope_org_id,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

-- 5. Drop additive columns on core_reference_group
ALTER TABLE public.core_reference_group
  DROP COLUMN IF EXISTS category_code,
  DROP COLUMN IF EXISTS ownership_module_code,
  DROP COLUMN IF EXISTS is_platform_owned,
  DROP COLUMN IF EXISTS is_org_overridable,
  DROP COLUMN IF EXISTS lifecycle_status,
  DROP COLUMN IF EXISTS supports_hierarchy,
  DROP COLUMN IF EXISTS supports_i18n,
  DROP COLUMN IF EXISTS supports_external_codes;
```

To roll back the service layer, revert
`src/services/core/coreReferenceDataService.ts` to its pre-1.1.1 head.
Legacy exports and their signatures are untouched, so no consumer file
needs changes.

---

## 5. Acceptance verification

| Criterion | Status |
|---|---|
| Existing reference consumers still work | ✅ Public API surface unchanged. |
| New schema is additive only | ✅ No drops / renames / retypes. |
| Existing `core_reference_group` / `_value` rows remain intact | ✅ No `UPDATE`/`DELETE` in the migration. |
| `/admin/master-data/*` routes are not changed | ✅ No route or page edits. |
| New service APIs are available | ✅ `listCategories`, `listGroups`, `getGroup`, `listItems`, `getItem`, `resolveHierarchy`, `addAlias`, `addExternalCode`, `translate`. |
| No BN Product Builder work | ✅ Epic 0.40 remains on hold. |
| Rollback documented | ✅ §4 above. |

---

## 6. Next epics

- **1.1.2** — Seed enterprise categories, backfill `category_code` /
  `ownership_module_code`, and introduce `/admin/reference-framework`
  console.
- **1.1.3** — Adoption Wave 1: migrate first module's hard-coded
  dropdowns to the framework using the new read APIs.
- **0.36D** — SSP read-only façades (unblocked once Wave 1 proves the
  pattern).
