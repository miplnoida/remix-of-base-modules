# Epic 1.1.2 — Enterprise Reference Governance & Administration

**Status:** Delivered
**Depends on:** Epic 1.1.1 (Enterprise Reference Framework hardening)
**Non-goal reminder:** BN Product Builder (Epic 0.40) remains ON HOLD.

---

## 1. Implemented features

### 1.1 Governance schema (additive only)
Added to `core_reference_group`:
- `business_owner`, `technical_owner`, `steward`
- `scope_default`, `version_strategy`
- `documentation_url`, `governance_notes`

Added to `core_reference_category`:
- `is_platform_category` (default `true`)
- `lifecycle_status` (default `ACTIVE`)

Grants re-affirmed on both tables (`authenticated` + `service_role`, per project policy — no RLS).

### 1.2 Seeded enterprise categories
Seventeen permanent, platform-owned categories seeded into
`core_reference_category` (idempotent `ON CONFLICT DO NOTHING`):

`PLATFORM`, `ORGANISATION`, `GEOGRAPHY`, `IDENTITY`, `FINANCE`, `LEGAL`,
`SOCIAL_SECURITY`, `MEDICAL`, `WORKFLOW`, `COMMUNICATION`, `COMPLIANCE`,
`INTEGRATION`, `HUMAN_RESOURCES`, `PAYROLL`, `DOCUMENT_MANAGEMENT`,
`LICENSING`, `PRISON`, `SYSTEM`.

### 1.3 Governance backfill (fills nulls only, never overwrites)
- `category_code` inferred from `module_code` (FINANCE / LEGAL / COMPLIANCE / BENEFITS → SOCIAL_SECURITY, BN_MEDICAL_* → MEDICAL, COMMON/PLATFORM/CORE → PLATFORM, remainder → SYSTEM).
- `lifecycle_status` defaults to `ACTIVE`.
- `scope_default` defaults to `PLATFORM`.
- `version_strategy` defaults to `ROW_VERSION`.
- `ownership_module_code` mirrors `module_code` when null.
- `is_platform_owned` set to true for COMMON/PLATFORM/CORE; false otherwise.
- `is_org_overridable`, `supports_hierarchy`, `supports_i18n`, `supports_external_codes` defaulted to `false`.

Verification:
```
category_code   | count
----------------+------
LEGAL           |   29
SOCIAL_SECURITY |   30
PLATFORM        |    5
```

### 1.4 Governance service
New read-only service `src/services/core/referenceGovernanceService.ts`:
- `loadCategories()`, `loadGroups()`
- `loadHealth()` — dashboard health signals
- `analyseConsumers()` — current / potential / duplicate / migration / retirement candidates
- `loadDependencies()` — category → group → module dependency map

No writes, no duplication of the existing framework; every query targets
`core_reference_category`, `core_reference_group`, `core_reference_value`.

### 1.5 Enterprise Governance Console
Route: `/admin/reference-framework` (registered in `AppRoutes.tsx`, linked from
the Governance card on `/admin/platform`).

Tabs delivered (governance, not CRUD):
Dashboard · Categories · Groups · Ownership · Hierarchy · Lifecycle ·
Version · Consumers · Dependencies · Search · Impact · Health.

Uses existing `PageHeader`, `Card`, `Tabs`, `Table`, `Badge`, `Alert`, `Input`
primitives — no new UI framework.

---

## 2. Backward compatibility

- No existing table renamed, no column dropped, no data overwritten.
- `coreReferenceDataService.ts` public API unchanged; all existing consumers
  (`/admin/master-data/*`, benefits, legal, compliance modules) keep working.
- Backfill only writes where the target column was `NULL`.
- `/admin/master-data/*` routes remain fully operational; the new console is
  additive and read-only.

---

## 3. Governance model

| Concern            | Location                                             |
|--------------------|------------------------------------------------------|
| Category taxonomy  | `core_reference_category` (17 seeded)                |
| Group ownership    | `core_reference_group.ownership_module_code`         |
| Business owner     | `core_reference_group.business_owner`                |
| Technical owner    | `core_reference_group.technical_owner`               |
| Steward            | `core_reference_group.steward`                       |
| Scope              | `core_reference_group.scope_default`                 |
| Lifecycle          | `core_reference_group.lifecycle_status`              |
| Version strategy   | `core_reference_group.version_strategy` (default `ROW_VERSION`) |
| Hierarchy          | `core_reference_group.supports_hierarchy`            |
| i18n               | `core_reference_group.supports_i18n`                 |
| External codes     | `core_reference_group.supports_external_codes`       |
| Documentation      | `core_reference_group.documentation_url`             |

---

## 4. Seeded categories (reference)

| Code                 | Name                | Owner module |
|----------------------|---------------------|--------------|
| PLATFORM             | Platform            | PLATFORM     |
| ORGANISATION         | Organisation        | PLATFORM     |
| GEOGRAPHY            | Geography           | PLATFORM     |
| IDENTITY             | Identity            | PLATFORM     |
| FINANCE              | Finance             | FINANCE      |
| LEGAL                | Legal               | LEGAL        |
| SOCIAL_SECURITY      | Social Security     | BENEFITS     |
| MEDICAL              | Medical             | MEDICAL      |
| WORKFLOW             | Workflow            | PLATFORM     |
| COMMUNICATION        | Communication       | PLATFORM     |
| COMPLIANCE           | Compliance          | COMPLIANCE   |
| INTEGRATION          | Integration         | PLATFORM     |
| HUMAN_RESOURCES      | Human Resources     | HRMS         |
| PAYROLL              | Payroll             | PAYROLL      |
| DOCUMENT_MANAGEMENT  | Document Management | DMS          |
| LICENSING            | Licensing           | LICENSING    |
| PRISON               | Prison              | PRISON       |
| SYSTEM               | System              | PLATFORM     |

---

## 5. Outstanding migration work (feeds Epic 0.36D and later)

- **BN_* groups (30):** candidates for eventual migration to SSP-owned
  categories under `SOCIAL_SECURITY` / `MEDICAL`.
- **Legacy tb_* enum tables** (`tb_country`, `tb_district`, `tb_village`,
  `tb_bank_code`, `tb_currencies`, etc.) surfaced under Migration Candidates
  in the Consumers tab.
- **Ownership backfill (people):** `business_owner`, `technical_owner`,
  `steward` are null on all groups until owners are named. The Ownership tab
  highlights every missing value.
- **Documentation URLs:** `documentation_url` currently unset for all groups.
- **Duplicate reconciliation:** the Impact / Health tabs list duplicate
  candidates for later merge decisions; no automated merging is performed.

---

## 6. Known limitations

- Consumer analysis today derives "current consumers" from `module_code`
  ownership on stored values, not from static route/component scans; a
  compile-time consumer index will follow in a later epic.
- Duplicate candidate detection is label-based (case-insensitive). Semantic
  merging still requires human judgement.
- The console is read-only. Editing categories, owners and lifecycle values
  is intentionally deferred so this epic cannot corrupt production reference
  data; edit surfaces will land in Epic 1.1.3.
- No history/audit view yet for governance field changes.

---

## 7. Rollback

Fully reversible; the epic is purely additive.

1. Delete the console page and route:
   - `src/pages/admin/ReferenceFramework.tsx`
   - the two `ReferenceFramework` references in
     `src/components/routing/AppRoutes.tsx`
   - the `Reference Framework` link in `src/pages/admin/PlatformAdmin.tsx`
2. Delete the governance service:
   - `src/services/core/referenceGovernanceService.ts`
3. (Optional) Drop the additive columns:
   ```sql
   ALTER TABLE public.core_reference_group
     DROP COLUMN IF EXISTS business_owner,
     DROP COLUMN IF EXISTS technical_owner,
     DROP COLUMN IF EXISTS steward,
     DROP COLUMN IF EXISTS scope_default,
     DROP COLUMN IF EXISTS version_strategy,
     DROP COLUMN IF EXISTS documentation_url,
     DROP COLUMN IF EXISTS governance_notes;
   ALTER TABLE public.core_reference_category
     DROP COLUMN IF EXISTS is_platform_category,
     DROP COLUMN IF EXISTS lifecycle_status;
   ```
4. Seeded categories can be pruned per `category_code` if required, but
   removing them will null out `core_reference_group.category_code` via the
   existing `ON DELETE SET NULL` foreign key — do not drop unless the
   downstream backfill is also reversed.

---

## 8. Next epic

**Epic 1.1.3 — Reference Framework Editable Governance & Adoption Wave 2**

Scope preview (planning only, no implementation started):
- Editable governance fields (owners, stewards, lifecycle, docs) with audit.
- Governance approvals workflow.
- First real migration wave for `tb_country`, `tb_district`, `tb_bank_code`
  into governed categories.
- Consumer index generated from static analysis of the repo.

BN Product Builder (Epic 0.40) continues to be **ON HOLD** until the SSP
foundation waves complete.
