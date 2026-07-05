# Epic 2.0 — Organisation Foundation Implementation Plan

**Status:** Planning (no code changes)
**Date:** 2026-07-05
**Companion to:** `EPIC_2_0_ORGANISATION_FOUNDATION.md`, `EPIC_2_0_ORGANISATION_INVENTORY.md`, `EPIC_2_0_ORGANISATION_GAP_ANALYSIS.md`

Wave-based roadmap. Each wave is small, additive, independently deployable, and independently reversible. Every wave must satisfy the Enterprise Definition of Done (12 items).

---

## Wave 2.0.1 — Foundation Registration & Governance

**Goal:** Make the existing Organisation Foundation formally registered and governed.

Scope:
- Add `app_modules` parent row `org_foundation` (route `/admin/org/foundation`) if missing.
- Seed `module_actions` for foundation: `view`, `manage`, `approve`, `retire`, `import`, `export`.
- Grant `view` + `manage` to Admin and Application Admin via `role_permissions`.
- Add governance metadata rows (owner, steward, lifecycle) via reference-framework governance service.
- Ensure `/admin/org/foundation/*` shows in the live left menu.
- Verify current admin can see and open every sub-page.

Deliverables: 1 migration + `docs/enterprise/EPIC_2_0_1_FOUNDATION_REGISTRATION_ACCEPTANCE.md`.

Rollback: DELETE the seeded `app_modules` / `module_actions` / `role_permissions` rows; drop the acceptance doc.

## Wave 2.0.2 — Duplicate Retirement Wave 1 (Legacy Office & Dept Profile)

**Goal:** Mark and stop-writing legacy duplicates.

Scope:
- Rebase `officeSettingsService` onto `office_locations` (read path only).
- Mark `system_office_settings` as `is_legacy=true` (additive column) — do not delete rows.
- Mark `lg_department_profile` as legacy; resolver switches to `core_department_profile`.
- Documentation for one-way sync until backfill completes.

Deliverables: 1 additive migration + service refactor + acceptance doc.

Rollback: revert service, drop `is_legacy` column.

## Wave 2.0.3 — Calendar & Holiday Consolidation

**Goal:** Single holiday/calendar source.

Scope:
- Add `core_calendar` (business calendar with working-day pattern, timezone, scope: platform/org/department/office).
- Migrate `ia_holidays` → `public_holidays` via one-time backfill (additive; ia table becomes read-only view later).
- Add `useHoliday(date, scope)` hook.

Deliverables: 1 migration + backfill script + hook + acceptance doc.

Rollback: drop `core_calendar`; leave `ia_holidays` untouched.

## Wave 2.0.4 — Foundation Consumer Contracts

**Goal:** Every product reads the foundation through typed hooks.

Scope:
- `useOrganizationContext()` — resolves org profile, branding, timezone, currency, language, default office/department.
- `useOffice(id?)`, `useDepartment(id?)`, `useDesignation(id?)`, `useHoliday(date, scope)`.
- DB-back `Position` / `PositionAssignment` (currently mock) → new tables `core_position`, `core_position_assignment` (additive).
- Add contract tests.

Deliverables: hooks + 1 migration + tests + acceptance doc.

Rollback: remove hooks; drop `core_position*` (data lives only in Wave 2.0.4).

## Wave 2.0.5 — SSP & BN Adoption Wave 1

**Goal:** First two products consume the Foundation.

Scope:
- Replace ad-hoc org reads in SSP with `useOrganizationContext`.
- Replace ad-hoc org reads in BN (view-only screens; no builder work — Epic 0.40 ON HOLD).
- Verify no visual/behavioural regressions.

Deliverables: code refactor + acceptance doc + regression checklist.

Rollback: git revert of consumer changes only.

## Wave 2.0.6 — Duplicate Retirement Wave 2 (Legacy Office Tables)

**Goal:** Complete retirement of legacy office/dept structures.

Scope:
- After Waves 2.0.2 + 2.0.5 are stable for one release cycle:
  - Drop or view-only `tb_office`, `tb_dept`, `system_office_settings` (data preserved via archival table).
- Redirect any remaining routes.

Deliverables: 1 migration + acceptance doc.

Rollback: restore from archival table.

---

## Sequencing & Dependencies

```text
2.0.1 Registration ──▶ 2.0.2 Retire Wave 1 ──▶ 2.0.3 Calendars
       │                                              │
       └────────▶ 2.0.4 Consumer Contracts ◀──────────┘
                              │
                              ▼
                      2.0.5 SSP & BN Adoption
                              │
                              ▼
                      2.0.6 Retire Wave 2
```

## Guardrails

- Every wave: additive schema only, no RLS, service/edge-layer authz.
- Every wave: satisfies Enterprise DoD 12-item checklist.
- BN Product Builder (Epic 0.40) remains **ON HOLD** across all waves.
- No `/admin/master-data/*` CRUD screen is modified in Epic 2.0.
- No new "organisation" table is created.

## Risk Register

| Risk | Mitigation |
|------|------------|
| Consumers still read legacy tables | Retirement waves gated on grep-clean check |
| Multi-org expansion (future) | Foundation is single-org today; multi-org deferred to Epic 2.1 |
| Position master overlaps with HRMS | `core_position` is enterprise-scoped; HRMS extends via profile table |
| IA holiday backfill collisions | One-time dedupe key on `(date, scope, name)` |

## Definition of Done (Enterprise, per wave)

Each wave doc must confirm all 12: build passes · `app_modules` updated · left menu · Platform Admin · permissions · role mappings · admin has access · current user has access · route/breadcrumb · acceptance doc · rollback · summary returned.
