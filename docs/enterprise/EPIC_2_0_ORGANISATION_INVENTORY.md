# Epic 2.0 — Organisation Inventory

**Status:** Discovery (no code changes)
**Date:** 2026-07-05
**Companion to:** `EPIC_2_0_ORGANISATION_FOUNDATION.md`

Complete inventory of every organisation-related asset already in the repository.

---

## 1. Tables (DB)

### 1.1 Organisation Identity
| Table | Cols | Purpose | Status |
|-------|------|---------|--------|
| `core_organization` | 43 | Canonical enterprise identity, defaults, branding refs, contact, currency, language, timezone, country | **Canonical** |
| `system_settings` | 13 | Global platform settings | **Canonical** (org-adjacent) |
| `system_office_settings` | 20 | Issuing-office branding for letters | **Legacy — merge into `office_locations` / `comm_*`** |

### 1.2 Hierarchy
| Table | Purpose | Status |
|-------|---------|--------|
| `OrgUnit` (typed via `src/types/systemAdmin.ts`, mock-backed) | Division/Department/Unit/Branch/Office tree | **Prototype** (mock data) — needs DB backing |
| `core_module_department_map` | Module ↔ Department mapping | **Canonical** |
| `role_hierarchy` | Role tree | **Canonical** (adjacent) |
| `designation_hierarchy` | Designation tree | **Canonical** |

### 1.3 Physical Presence
| Table | Cols | Purpose | Status |
|-------|------|---------|--------|
| `office_locations` | 24 | Canonical branches/offices | **Canonical** |
| `er_locations` | 9 | Employer-owned locations | **Scoped (keep)** |
| `core_department_location` | 12 | Department ↔ Location M:N | **Canonical** |
| `office_ip_addresses` | 12 | Office IP whitelist | **Canonical** |
| `bema_zones`, `ce_zones`, `inspector_zones` | — | Compliance zones | **Product-scoped (keep)** |

### 1.4 Departments
| Table | Cols | Purpose | Status |
|-------|------|---------|--------|
| `core_department` | 9 | Department master | **Canonical** |
| `core_department_profile` | 94 | Full per-department config, inherit flags, overrides | **Canonical** |
| `core_module_department_map` | 6 | Module ownership | **Canonical** |
| `lg_department_profile` | 57 | Legacy legal-only department profile | **Retire** (superseded by `core_department_profile`) |
| `tb_dept` | 2 | Legacy code list | **Retire** |

### 1.5 Designations / Positions
| Table | Purpose | Status |
|-------|---------|--------|
| `tb_designations` (8 cols) | Designation master | **Canonical** |
| `designation_hierarchy` (6 cols) | Designation tree | **Canonical** |
| `Position` / `PositionAssignment` (typed, mock) | Positions & people | **Prototype** — needs DB backing |

### 1.6 Time / Calendars
| Table | Cols | Purpose | Status |
|-------|------|---------|--------|
| `public_holidays` | 11 | Platform-wide holiday calendar | **Canonical** |
| `ia_holidays` | 11 | Internal Audit holiday copy | **Duplicate — merge into `public_holidays`** |
| `core_organization.timezone` | — | Org default timezone | **Canonical** |
| Reference group `CORE_TIMEZONE` | — | Timezone lookup | **Canonical** |

### 1.7 Branding / Communication Assets
| Table | Purpose | Status |
|-------|---------|--------|
| `comm_media_asset` (56) + `_version` (12) | Logos, seals, signatures, watermarks | **Canonical** |
| `comm_letterhead` (40) | Letterhead definitions | **Canonical** |
| `comm_email_signature` (20) | Email signatures | **Canonical** |
| `comm_disclaimer` (13) | Disclaimers | **Canonical** |
| `comm_print_footer` (12) | Print footers | **Canonical** |
| `comm_asset_mapping` (16) + `comm_asset_assignment` (16) | Context bindings | **Canonical** |
| `comm_asset_category_master` (16) | Categorisation | **Canonical** |
| `core_text_block` (24) | Reusable text blocks | **Canonical** |

### 1.8 Contact
| Table | Purpose | Status |
|-------|---------|--------|
| `core_organization.main_email / main_phone` | Org contact | **Canonical** |
| `rf_mail_address` (9) + `rf_address_link` (13) | Addresses | **Canonical** |
| `tb_address_type` (6), `tb_address_link_type` (6) | Address vocab | **Canonical** |

### 1.9 Module Registry
| Table | Cols | Purpose | Status |
|-------|------|---------|--------|
| `app_modules` | 27 | Every module registered | **Canonical** |
| `module_actions` | 7 | Action vocabulary | **Canonical** |
| `module_button_bindings` | 7 | Button ↔ action | **Canonical** |
| `role_permissions` | 7 | Role ↔ (module, action) | **Canonical** |
| `core_module_profile` | 36 | Per-module config overrides | **Canonical** |

### 1.10 Teams / Workbaskets
| Table | Purpose | Status |
|-------|---------|--------|
| `core_team` (12) | Team master | **Canonical** |
| `core_workbasket` (13) | Workbasket master | **Canonical** |

---

## 2. Services (Code)

| Service | Path | Purpose |
|---------|------|---------|
| Office settings | `src/services/system/officeSettingsService.ts` | Default office resolver |
| Core template resolver | `src/services/coreTemplateResolverService.ts` | Template + branding resolution |
| Core template dispatcher | `src/services/coreTemplateDispatcherService.ts` | Template rendering |
| Core document generation | `src/services/coreDocumentGenerationService.ts` | Document build |
| Reference data | `src/services/core/coreReferenceDataService.ts` | Reference groups/values |
| Reference governance | `src/services/core/referenceGovernanceService.ts` | Governance metadata |

---

## 3. Pages / Routes

### 3.1 Organisation Admin (canonical)
- `/admin/organization/profile` → `OrganizationProfilePage`
- `/admin/organization/media-library`, `/letterheads`, `/portal-branding`, `/document-assets`, `/text-blocks`
- `/admin/organization/usage` (Usage Validation)
- `/admin/org/foundation/{profile,locations,departments,modules}` (new nav)
- `/admin/org/assets/{media,categories}`, `/admin/org/library/text-blocks`
- `/admin/org/validation/usage`, `/admin/org/configuration-center`

### 3.2 Hierarchy / Structure
- `/admin/org-units` → `OrgUnitList` (mock-backed)
- `/admin/offices` → `OfficesAdmin`
- `/admin/departments` → Departments admin
- `/admin/designations` → `DesignationsAdmin`
- `/admin/designation-hierarchy` → redirect to `/admin/designations?tab=hierarchy`
- `/admin/modules` → `ModuleManagement`

### 3.3 Legacy / Deprecated
- `/admin/organization-management` → redirects to `/admin/org/foundation/profile`
- `/admin/organization-management/legacy` → legacy admin
- `/admin/master-data/designations` → redirects to `/admin/designations`
- `/admin/office-ip-management` → redirects to `/admin/offices?tab=ip`

---

## 4. Permissions / Roles

- `role_permissions` table already models role ↔ (module, action).
- `roles` table (10 cols) holds Admin, Application Admin, Super Admin, product-specific roles.
- Six framework actions already seeded for `admin_reference_framework` (Epic 1.1.2A).
- No dedicated `org_foundation` permission bundle yet — deferred to Epic 2.0.1.

---

## 5. `app_modules` Entries (Org-related)

Existing rows already cover (verified via routes above):

- Organization Profile, Media Library, Letterheads, Portal Branding, Document Assets, Text Blocks
- Org Units, Offices, Departments, Designations, Modules
- Reference Framework (Epic 1.1.2A)
- Master Data parent (`e1a00000-0000-4000-8000-000000000003`)

No new `app_modules` row required in this epic.

---

## 6. Reference Data (Reference Framework)

Reference groups already used by org foundation:

- `CORE_CURRENCY` — currency lookup
- `CORE_LANGUAGE` — language lookup
- `CORE_TIMEZONE` — timezone lookup

Consumed via `useCurrencyOptions`, `useLanguageOptions`, `useTimezoneOptions`.

---

## 7. Related Prior Documents

- `docs/organization/AUDIT.md` — 98% coverage audit (2026-06-27)
- `docs/enterprise/EPIC_1_1_ENTERPRISE_REFERENCE_FRAMEWORK.md`
- `docs/enterprise/EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`
- `docs/enterprise/EPIC_1_2_MASTER_CATALOGUE.md`
