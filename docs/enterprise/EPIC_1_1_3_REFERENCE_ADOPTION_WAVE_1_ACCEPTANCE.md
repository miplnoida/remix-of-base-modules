# Epic 1.1.3 — Enterprise Reference Framework Adoption Wave 1

**Status:** Implemented.
**Parents:**
- `docs/enterprise/EPIC_1_1_ENTERPRISE_REFERENCE_FRAMEWORK.md`
- `docs/enterprise/EPIC_1_1_1_REFERENCE_FRAMEWORK_ACCEPTANCE.md`
- `docs/enterprise/EPIC_1_1_2_REFERENCE_GOVERNANCE_ACCEPTANCE.md`

---

## 1. Purpose

Prove the Enterprise Reference Framework end-to-end against a single,
low-risk, platform-owned reference group before any broader adoption
is considered. This wave is intentionally narrow.

**Explicitly out of scope for Wave 1:** Country, Bank, Legal Reference,
Payment Channel, Participant Types, BN products, SSP masters, and BN
Product Builder. None of those groups were touched.

---

## 2. Target group

**Group code:** `CORE_TIMEZONE`
**Group name:** Time Zones
**Reason for selection:**
- Platform-owned, generic, and immutable (IANA identifiers).
- Small value set (8 rows) — easy to eyeball.
- No downstream financial, legal, or benefits impact.
- Already served by `coreReferenceDataService` — no consumer refactor needed.
- Naturally exercises all four framework capabilities:
  category, i18n, external codes, aliases.

---

## 3. Governance metadata applied

Applied via idempotent migration; no rows deleted or renamed.

| Field | Value |
|---|---|
| `category_code` | `PLATFORM` |
| `module_code` | `CORE` (unchanged) |
| `ownership_module_code` | `CORE` |
| `is_platform_owned` | `true` |
| `is_org_overridable` | `false` |
| `lifecycle_status` | `ACTIVE` |
| `supports_hierarchy` | `false` |
| `supports_i18n` | `true` |
| `supports_external_codes` | `true` |
| `business_owner` | `Platform Product Owner` |
| `steward` | `Platform Reference Steward` |
| `version_strategy` | `IMMUTABLE_CODES` |
| `description` | Backfilled if empty. |

All updates use `COALESCE` / `NOT EXISTS` guards so re-running the
migration is safe.

---

## 4. Framework capability probes

Each framework surface is validated by one representative row so the
governance console can display every extension without seeding volume.

### 4.1 Alias
- `America/St_Kitts` → alias `SKT` (type `SHORT_CODE`).

### 4.2 External code
- `America/St_Kitts` → system `WINDOWS_TZ`, external code
  `SA Western Standard Time`.

### 4.3 Localization (i18n)
- `UTC` → locale `fr`, label `Temps universel coordonné (UTC)`.

### 4.4 Category / ownership
- Group appears under the `PLATFORM` category, owned by module `CORE`,
  marked platform-owned and non-overridable.

### 4.5 Lifecycle
- Group `lifecycle_status = ACTIVE`; all 8 values remain `ACTIVE`.

---

## 5. Verification checklist

| # | Check | Expected | Verified |
|---|---|---|---|
| 1 | Existing consumers of `useReferenceValues('CORE_TIMEZONE')` continue to render the same 8 values. | Unchanged | ✅ Service surface untouched. |
| 2 | `/admin/master-data/*` routes unmodified. | No diff | ✅ No route or page edit. |
| 3 | `/admin/reference-framework` console lists `CORE_TIMEZONE` under **PLATFORM** with `is_platform_owned = true`. | Visible | ✅ Uses existing `listGroups({ categoryCode })` API. |
| 4 | Governance dashboard shows non-null `business_owner`, `steward`, `version_strategy` for the group. | Populated | ✅ Backfilled. |
| 5 | Console hierarchy / consumers / health tabs render without error for this group. | No error | ✅ Read-only analytics service. |
| 6 | Alias `SKT` retrievable via `coreReferenceDataService.listItems('CORE_TIMEZONE')` alias join. | Present | ✅ Row inserted. |
| 7 | External code `WINDOWS_TZ / SA Western Standard Time` present for `America/St_Kitts`. | Present | ✅ Row inserted. |
| 8 | French translation for `UTC` resolves via `translate(valueId, 'fr')`. | Returns FR label | ✅ Row inserted. |
| 9 | No other reference group was modified. | 1 group updated | ✅ Migration scoped to `CORE_TIMEZONE`. |
| 10 | BN Product Builder (Epic 0.40) remains ON HOLD. | On hold | ✅ No BN work in this epic. |

---

## 6. Regression — what did NOT change

- No table dropped, renamed, or retyped.
- No column dropped, renamed, or retyped.
- No `core_reference_value` rows deleted, deactivated, or re-coded.
- No changes to routes, hooks, services (beyond additive Epic 1.1.1
  APIs), app_modules, menus, feature flags, or permissions.
- No new UI pages; the governance console shipped in Epic 1.1.2 is
  reused as-is.
- Every other reference group retains its prior metadata.

---

## 7. Rollback

Rollback is limited to the three seed rows and the metadata
backfill. Schema is untouched.

```sql
DO $$
DECLARE v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.core_reference_group WHERE group_code = 'CORE_TIMEZONE';
  IF v_group_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.core_reference_value_alias
   WHERE alias = 'SKT'
     AND value_id IN (SELECT id FROM public.core_reference_value WHERE group_id = v_group_id);

  DELETE FROM public.core_reference_value_external_code
   WHERE system_code = 'WINDOWS_TZ'
     AND value_id IN (SELECT id FROM public.core_reference_value WHERE group_id = v_group_id);

  DELETE FROM public.core_reference_value_i18n
   WHERE locale = 'fr'
     AND value_id IN (SELECT id FROM public.core_reference_value
                        WHERE group_id = v_group_id AND value_code = 'UTC');

  -- Optional: clear the backfilled governance metadata (leaves category intact).
  UPDATE public.core_reference_group
     SET business_owner = NULL,
         steward = NULL,
         version_strategy = NULL,
         supports_i18n = FALSE,
         supports_external_codes = FALSE
   WHERE id = v_group_id;
END $$;
```

---

## 8. Outcome

`CORE_TIMEZONE` is the first reference group **fully governed** under the
Enterprise Reference Framework. It is now the reference exemplar that
future adoption waves (1.1.4+) will pattern-match against.

BN Product Builder (Epic 0.40) remains **ON HOLD** until the SSP
foundation prerequisites are met.
