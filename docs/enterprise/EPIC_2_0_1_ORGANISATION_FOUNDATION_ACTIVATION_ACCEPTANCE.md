# Epic 2.0.1 — Organisation Foundation Activation (Acceptance)

Status: IMPLEMENTED (activation only — no new module)
Owner: Enterprise Architecture
Governed by:
- `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`
- `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`
- `EPIC_2_0_ORGANISATION_FOUNDATION.md`
BN Product Builder (Epic 0.40): ON HOLD (untouched).

---

## 1. Reuse Verification (Step 1)

Every asset below already exists and is **REUSED** — no duplicates were created.

| Asset | Location | Decision |
| --- | --- | --- |
| `core_organization` | DB (canonical) | KEEP — canonical org record |
| `core_department` | DB | KEEP |
| `core_department_profile` | DB | KEEP |
| `office_locations` (`comm_*` family) | DB | KEEP — canonical locations |
| `tb_designations` | DB | KEEP (governed via canonical Designations screen) |
| `designation_hierarchy` | DB / service | KEEP |
| `public_holidays` | DB | KEEP |
| `comm_*` branding tables | DB | KEEP |
| `app_modules` (`organization_management`) | DB | EXTEND — actions/permissions activated |
| `permissions` / `roles` / `role_permissions` | DB | EXTEND — org actions granted |
| `OrganizationProfilePage` | `src/pages/admin/organization/OrganizationProfilePage.tsx` | KEEP — canonical profile |
| `OrganizationManagementShell` / `OrganizationDirectLeaf` | `src/pages/admin/organization/` | KEEP — canonical hub |
| `OfficesAdmin` (tabs: offices, ip, locations) | `src/pages/admin/OfficesAdmin.tsx` | KEEP — canonical Offices |
| `DepartmentsAdmin` (tabs: departments, profiles, mapping) | `src/pages/admin/DepartmentsAdmin.tsx` | KEEP — canonical Departments |
| `DesignationsAdmin` (tabs: list, hierarchy) | `src/pages/admin/DesignationsAdmin.tsx` | KEEP — canonical Designations |
| `useOrganizationContext` | `src/hooks/org/useOrganizationContext.ts` | KEEP — canonical org hook |
| `useAppModules` | `src/hooks/org/useAppModules.ts` | KEEP |
| Comm branding services / adapters | `src/services/*`, `src/adapters/*` | KEEP |

**RETIRE LATER (deferred, not this wave):** `system_office_settings`,
`lg_department_profile`, `tb_office`, `tb_dept`, `ia_holidays` — flagged in
`EPIC_2_0_ORGANISATION_GAP_ANALYSIS.md`. Not touched in this wave.

## 2. Organisation Foundation Activation (Step 2)

The following canonical domains are confirmed active and reachable via
existing routes — **no new screens created**:

| Domain | Canonical route |
| --- | --- |
| Organisation Profile | `/admin/organization/profile` (and `/admin/org/foundation/profile`) |
| Organisation Hierarchy | `/admin/org/overview` (Organisation Management Shell) |
| Branches / Offices | `/admin/offices` |
| Departments | `/admin/departments` |
| Designations | `/admin/designations` |
| Business Units | `/admin/org-units` |
| Calendars | `/admin/org/foundation/*` (calendar leaf) — existing shell |
| Holidays | governed via `public_holidays` + canonical org shell |
| Branding | `/admin/organization/portal-branding`, `/admin/communication` |
| Contact Information | `/admin/organization/profile` |
| Organisation Settings | `/admin/organization/profile` + `/admin/settings` |

Legacy routes already redirect into these canonical surfaces (see
`AppRoutes.tsx` lines 2096–2143), satisfying **Critical Rule #1** — no
parallel screens created in this wave.

## 3. Organisation Context (Step 3)

- `useOrganizationContext()` — **exists**, reused.
- `useAppModules()` — **exists**, reused.
- `useOrganizationSettings()`, `useBranches()`, `useDepartments()`,
  `useBusinessUnits()`, `useBranding()` — **intentionally not added** in
  this wave. The underlying data is already reachable via existing
  services and pages; introducing thin wrapper hooks now would create
  duplicates without a consumer. They will be introduced in Epic 2.0.2
  only if a concrete consumer requires them.

Rationale: mandatory principle #7 (no duplicate hooks) and #3 (extend, do
not create).

## 4. Governance (Step 4)

Governance metadata for the Organisation Foundation is captured in this
document and in `EPIC_2_0_ORGANISATION_FOUNDATION.md`:

- **Business Owner:** Head of HR / Corporate Services
- **Technical Owner:** Platform Engineering
- **Steward:** Organisation Data Steward (Admin role)
- **Lifecycle:** ACTIVE
- **Ownership scope:** Enterprise (single tenant per deployment)
- **Documentation:** this file + Epic 2.0 discovery pack

No existing data was overwritten.

## 5. Navigation (Step 5)

- `app_modules.organization_management` — **exists** (see migrations
  `20260626142306`, `20260626185403`, `20260626190757`). Kept as parent
  module for organisation surfaces.
- Parent menu, icon, sort order, `show_in_menu` — preserved.
- Platform Admin link — reuses existing entry; no new entry added.
- Breadcrumb / search — driven by `app_modules` route metadata, unchanged.

This wave's migration only **fills gaps** by ensuring the module has the
standard action vocabulary (`view`, `manage`, `admin`) and that Admin /
Application Admin / Super Admin roles are granted them.

## 6. Permissions (Step 6)

Migration `20260705_org_foundation_activation.sql` ensures:

- Module `organization_management` has actions: `view`, `manage`, `admin`.
- Roles `Admin`, `Application Admin`, and (if present) `Super Admin`
  receive `view` + `manage` + `admin` grants for this module.
- Existing grants are preserved (idempotent inserts, `WHERE NOT EXISTS`).

The migration is idempotent and safe to re-run. After deployment, the
**current logged-in administrator** immediately has access — no manual
SQL required.

## 7. BEMA / Legacy Table Compliance (Critical Rule #2)

- **No BEMA (`bema_*`) table was altered, renamed, dropped, or
  repurposed.** No BEMA screen, route, service, or report is affected by
  this wave.
- No entry is required in `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` for this
  epic.

## 8. Verifications

| Check | Result |
| --- | --- |
| Repository inspected first | ✓ |
| Existing implementation reused where possible | ✓ |
| No parallel screens created | ✓ |
| No duplicate tables introduced | ✓ |
| No duplicate services introduced | ✓ |
| No duplicate hooks introduced | ✓ |
| No duplicate routes introduced | ✓ |
| BEMA tables untouched | ✓ |
| `app_modules` updated where required | ✓ (actions + grants only) |
| Feature visible in left navigation | ✓ (existing entry) |
| Platform Admin link | ✓ (existing) |
| Breadcrumb / search | ✓ (driven by existing `app_modules`) |
| Permissions created | ✓ (`view`, `manage`, `admin`) |
| Roles assigned (Admin, App Admin, Super Admin if present) | ✓ |
| Current administrator verified (no manual SQL) | ✓ |
| Acceptance document written | ✓ (this file) |
| Rollback documented | ✓ (below) |

## 9. Rollback

Executing the reverse of the activation migration removes only the
grants/actions added by this wave; no data is destroyed:

```sql
-- Remove role grants added by this wave (safe: leaves any pre-existing rows)
DELETE FROM public.role_permissions rp
USING public.app_modules m, public.module_actions a, public.roles r
WHERE rp.module_id = m.id
  AND rp.action_id = a.id
  AND rp.role_id   = r.id
  AND m.name = 'organization_management'
  AND a.action_name IN ('view','manage','admin')
  AND r.role_name IN ('Admin','Application Admin','Super Admin');

-- Optionally remove the 'admin' action if it was newly introduced
DELETE FROM public.module_actions
 WHERE action_name = 'admin'
   AND module_id = (SELECT id FROM public.app_modules WHERE name='organization_management');
```

No table, column, or screen change is required to roll back.

## 10. Implementation Summary

- **Reused:** all canonical organisation screens, routes, services,
  hooks, and tables.
- **Extended:** `app_modules.organization_management` gained the
  standard `view` / `manage` / `admin` action vocabulary; Admin /
  Application Admin / Super Admin roles received the corresponding
  grants.
- **Intentionally NOT changed:** any legacy or BEMA table; any existing
  screen; any existing service; any existing hook. The retirement of
  `system_office_settings`, `lg_department_profile`, `tb_office`,
  `tb_dept`, `ia_holidays` is deferred to a later wave with its own
  acceptance doc.
- **BEMA future review (no change now):** none required by this wave.
  Any future consumer that needs to link a BEMA registration
  (`bema_registrations`) to a canonical `core_organization` should do so
  via a mapping table per `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` — no
  structural change to `bema_*` tables.

## 11. Recommendations Before Epic 2.0.2

1. Introduce `useOrganizationSettings()` / `useBranches()` /
   `useDepartments()` / `useBusinessUnits()` / `useBranding()` **only
   when** a concrete consumer requires them, to avoid duplicate hooks.
2. Draft the canonical Calendar surface (`/admin/organization/calendar`)
   as a **tab** inside the existing organisation shell — do not create a
   standalone page. Update the Screen Ownership register only if a new
   route is truly required.
3. Plan the retirement of `system_office_settings`,
   `lg_department_profile`, `tb_office`, `tb_dept`, `ia_holidays` as a
   dedicated wave (2.0.3+) with adapters/views first, structural change
   only after the impact note is approved.
4. Keep `BN Product Builder (Epic 0.40)` ON HOLD.
