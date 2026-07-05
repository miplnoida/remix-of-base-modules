# Epic 2.0 — Organisation Foundation

**Status:** Discovery, Inventory & Planning (no code changes)
**Date:** 2026-07-05
**Owner:** Enterprise Architecture / Misha Infotech
**Depends on:** Epic 1.1 (Reference Framework), Epic 1.1.4 (Framework Blueprint), Epic 1.2 (Master Data Platform)
**Blocks:** SSP adoption, BN adoption, HRMS, DMS, Licensing, Prison, Payroll, Finance, Compliance

---

## 1. Purpose

Establish a single, canonical **Organisation Foundation** that every product (present and future) consumes for:

- Organisation identity & branding
- Hierarchy (org units, departments, business units)
- Physical presence (offices, branches, locations)
- People-structure primitives (designations, positions)
- Time context (calendars, holidays, time zone)
- Contact information & communication defaults
- Organisation-level settings

The Foundation is **not** a new module — the platform already ships ~95% of it. This epic **inventories, deduplicates, standardises, and governs** what exists, then closes the small remaining gaps.

## 2. Non-Goals

- ❌ Do not create a new "organisation" table
- ❌ Do not create a parallel department/office/designation module
- ❌ Do not migrate SSP or BN business data
- ❌ Do not change `/admin/master-data/*` CRUD screens in this epic
- ❌ Do not implement UI or schema in this epic — planning only

## 3. Canonical Domains

| # | Domain | Canonical Source |
|---|--------|------------------|
| 1 | Organisation Profile | `core_organization` + `/admin/organization/profile` |
| 2 | Organisation Hierarchy (Org Units) | `OrgUnit` (systemAdmin) + `/admin/org-units` |
| 3 | Branches / Offices / Locations | `office_locations` + `/admin/offices` |
| 4 | Departments | `core_department` + `core_department_profile` + `/admin/departments` |
| 5 | Designations | `tb_designations` + `/admin/designations` |
| 6 | Business Units | Modelled on `OrgUnit.type = 'Division'` (reuse) |
| 7 | Calendars | `public_holidays` + `ia_holidays` (consolidation candidate) |
| 8 | Holidays | `public_holidays` |
| 9 | Time Zone | `core_organization.timezone` + `CORE_TIMEZONE` reference group |
| 10 | Branding | `comm_media_asset` + `comm_letterhead` + `comm_email_signature` + `comm_disclaimer` + `comm_print_footer` |
| 11 | Contact Information | `core_organization` (main_email/phone) + `rf_mail_address` |
| 12 | Organisation Settings | `system_settings` + `core_organization` |
| 13 | Module Registry | `app_modules` + `/admin/modules` |
| 14 | Teams & Workbaskets | `core_team` + `core_workbasket` |

## 4. Deliverables (This Epic)

Documentation only, under `docs/enterprise/`:

| File | Purpose |
|------|---------|
| `EPIC_2_0_ORGANISATION_FOUNDATION.md` | This charter |
| `EPIC_2_0_ORGANISATION_INVENTORY.md` | Full inventory of every existing org asset |
| `EPIC_2_0_ORGANISATION_GAP_ANALYSIS.md` | Classification (reusable / enhance / duplicate / missing) |
| `EPIC_2_0_ORGANISATION_IMPLEMENTATION_PLAN.md` | Wave-based roadmap |

## 5. Guiding Principles

1. **No duplicate masters.** Every org concept has one owner table.
2. **Reuse before build.** ~95% of infrastructure already exists (see `docs/organization/AUDIT.md`).
3. **Additive schema only.** No breaking migrations.
4. **Governance via Framework Blueprint** (Epic 1.1.4) — same lifecycle, permissions, adoption stages.
5. **Consumed by every product.** SSP, BN, HRMS, DMS, Compliance all read from the same foundation.
6. **RLS OFF.** Authorization stays at service/edge layer per project rule.

## 6. Success Criteria

- ✅ Every existing organisation asset is inventoried
- ✅ Duplicates are identified and marked for retirement (not deleted)
- ✅ Gaps are minimal and explicitly listed
- ✅ Implementation waves are sequenced with clear scope
- ✅ No new organisation module is proposed
- ✅ No code, schema, route, `app_modules`, menu, permission, or data change in this epic

## 7. Next Epics (Sequenced)

- **2.0.1** — Organisation Foundation Registration (register foundation in `app_modules`, permissions, governance metadata)
- **2.0.2** — Duplicate Retirement Wave 1 (mark `lg_department_profile`, `er_locations`, `tb_office` legacy)
- **2.0.3** — Calendar & Holiday Consolidation (merge `ia_holidays` into `public_holidays`)
- **2.0.4** — Foundation Consumer Contracts (typed hooks: `useOrganizationContext`, `useOffice`, `useDepartment`, `useDesignation`, `useHoliday`)
- **2.0.5** — SSP & BN Adoption Wave 1

## 8. Rollback

No changes in this epic — nothing to roll back. Delete the four documents to revert.

## 9. Definition of Done (Enterprise)

| # | Item | Status |
|---|------|--------|
| 1 | Build passes | ✅ (docs only) |
| 2 | `app_modules` updated | N/A (planning) |
| 3 | Feature in live left menu | N/A (planning) |
| 4 | Platform Admin updated | N/A (planning) |
| 5 | Permissions created | N/A (planning) |
| 6 | Role mappings | N/A (planning) |
| 7 | Current admin role has access | N/A (planning) |
| 8 | Current user has access | N/A (planning) |
| 9 | Route & breadcrumb verified | N/A (planning) |
| 10 | Acceptance document updated | ✅ this doc |
| 11 | Rollback documented | ✅ §8 |
| 12 | Implementation summary | ✅ returned in chat |

**BN Product Builder (Epic 0.40) remains ON HOLD.**
