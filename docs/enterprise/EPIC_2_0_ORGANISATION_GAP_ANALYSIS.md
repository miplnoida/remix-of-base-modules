# Epic 2.0 — Organisation Gap Analysis

**Status:** Analysis (no code changes)
**Date:** 2026-07-05
**Companion to:** `EPIC_2_0_ORGANISATION_FOUNDATION.md`, `EPIC_2_0_ORGANISATION_INVENTORY.md`

Classification of every organisation capability against the target Foundation.

---

## Legend

- ✅ **Reusable** — exists and meets target with no change
- 🔧 **Enhance** — exists; needs small additive change (columns/index/policy/UI wiring)
- ⚠️ **Duplicate** — parallel implementation exists; mark for retirement (do not delete now)
- ❌ **Missing** — capability not present; must be built
- 🧪 **Prototype** — exists in code (mock/typed) but not backed by DB

---

## 1. Organisation Profile

| Capability | Source | Class | Action |
|---|---|---|---|
| Enterprise identity, defaults, branding refs | `core_organization` | ✅ Reusable | Keep |
| Profile admin UI | `/admin/organization/profile` | ✅ Reusable | Keep |
| Multi-tenant / multi-org | `core_organization` (single-row today) | 🔧 Enhance | Defer to Epic 2.1 |
| Governance metadata (owner, steward, lifecycle) | — | ❌ Missing | Add in Epic 2.0.1 |

## 2. Organisation Hierarchy

| Capability | Source | Class | Action |
|---|---|---|---|
| Org unit tree (Division/Department/Unit/Branch/Office) | `OrgUnit` (mock) | 🧪 Prototype | Back with DB table in Epic 2.0.3 |
| Department tree | `core_department` + `core_module_department_map` | ✅ Reusable | Keep |
| Business Units | Modelled as `OrgUnit.type='Division'` | ✅ Reusable | Keep (no new table) |
| Designation hierarchy | `designation_hierarchy` | ✅ Reusable | Keep |

## 3. Branches / Offices / Locations

| Capability | Source | Class | Action |
|---|---|---|---|
| Canonical offices | `office_locations` | ✅ Reusable | Keep |
| Employer-owned locations | `er_locations` | ✅ Reusable | Scoped, keep |
| Dept ↔ Location M:N | `core_department_location` | ✅ Reusable | Keep |
| Legacy issuing-office branding | `system_office_settings` | ⚠️ Duplicate | Retire — migrate into `office_locations` + `comm_*` in Epic 2.0.2 |
| Legacy office table | `tb_office` (product-legacy) | ⚠️ Duplicate | Retire later |

## 4. Departments

| Capability | Source | Class | Action |
|---|---|---|---|
| Department master | `core_department` | ✅ Reusable | Keep |
| Department profile w/ inherit flags | `core_department_profile` | ✅ Reusable | Keep |
| Legal-only dept profile | `lg_department_profile` | ⚠️ Duplicate | Retire — read-only until backfill complete |
| Legacy dept code list | `tb_dept` | ⚠️ Duplicate | Retire |

## 5. Designations / Positions

| Capability | Source | Class | Action |
|---|---|---|---|
| Designation master | `tb_designations` + `/admin/designations` | ✅ Reusable | Keep |
| Designation tree | `designation_hierarchy` | ✅ Reusable | Keep |
| Positions & assignments | `Position`, `PositionAssignment` (mock) | 🧪 Prototype | Back with DB in Epic 2.0.4 |

## 6. Calendars & Holidays

| Capability | Source | Class | Action |
|---|---|---|---|
| Platform holiday calendar | `public_holidays` | ✅ Reusable | Keep as canonical |
| IA holiday copy | `ia_holidays` | ⚠️ Duplicate | Merge into `public_holidays` (Epic 2.0.3) |
| Business calendars (working days, cycles) | — | ❌ Missing | Add `core_calendar` in Epic 2.0.3 |

## 7. Time Zone

| Capability | Source | Class | Action |
|---|---|---|---|
| Org default timezone | `core_organization.timezone` | ✅ Reusable | Keep |
| Timezone lookup | `CORE_TIMEZONE` reference group | ✅ Reusable | Keep |

## 8. Branding

| Capability | Source | Class | Action |
|---|---|---|---|
| Media assets (logo/seal/signature/watermark) | `comm_media_asset` | ✅ Reusable | Keep |
| Letterheads / signatures / disclaimers / footers | `comm_*` family | ✅ Reusable | Keep |
| Asset mapping / assignment | `comm_asset_mapping`, `comm_asset_assignment` | ✅ Reusable | Keep |
| Reusable text blocks | `core_text_block` | ✅ Reusable | Keep |

## 9. Contact Information

| Capability | Source | Class | Action |
|---|---|---|---|
| Org main email/phone | `core_organization` | ✅ Reusable | Keep |
| Addresses | `rf_mail_address` + `rf_address_link` | ✅ Reusable | Keep |
| Address vocab | `tb_address_type`, `tb_address_link_type` | ✅ Reusable | Keep |

## 10. Organisation Settings

| Capability | Source | Class | Action |
|---|---|---|---|
| Global platform settings | `system_settings` | ✅ Reusable | Keep |
| Org-scoped defaults | `core_organization` | ✅ Reusable | Keep |
| Per-module config | `core_module_profile` | ✅ Reusable | Keep |
| Configuration assignments | `core_configuration_assignment` | ✅ Reusable | Keep |

## 11. Module Registry

| Capability | Source | Class | Action |
|---|---|---|---|
| Module master | `app_modules` | ✅ Reusable | Keep |
| Actions & bindings | `module_actions`, `module_button_bindings` | ✅ Reusable | Keep |
| Registry admin | `/admin/modules` | ✅ Reusable | Keep |

## 12. Consumer Contracts (Hooks / Services)

| Capability | Source | Class | Action |
|---|---|---|---|
| `useCurrencyOptions/useLanguageOptions/useTimezoneOptions` | Reference Framework | ✅ Reusable | Keep |
| `useOrganizationContext` (unified resolver) | — | ❌ Missing | Add in Epic 2.0.4 |
| `useOffice`, `useDepartment`, `useDesignation`, `useHoliday` | — | ❌ Missing | Add in Epic 2.0.4 |
| `officeSettingsService` | `src/services/system/officeSettingsService.ts` | 🔧 Enhance | Rebase onto `office_locations` (Epic 2.0.2) |

---

## Summary

| Class | Count |
|-------|-------|
| ✅ Reusable | 28 |
| 🔧 Enhance | 3 |
| ⚠️ Duplicate (retire) | 6 |
| 🧪 Prototype (DB-back) | 2 |
| ❌ Missing | 6 |

**Verdict:** ~85–95% of the Organisation Foundation already exists and is reusable. No new "organisation module" is required. The remaining work is (a) retire duplicates, (b) DB-back two prototypes, (c) add a small number of hooks/tables, and (d) register governance metadata.
