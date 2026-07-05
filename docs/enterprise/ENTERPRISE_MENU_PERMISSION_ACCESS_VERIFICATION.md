# Enterprise Menu & Permission Access Verification

**Scope**: Verify menu registration and permission access for all Enterprise Foundation features created/activated in Epic 1.1.x (Reference Framework), Epic 1.2 (Master Data Platform planning) and Epic 2.0.x (Organisation Foundation activation + Calendar/Holidays planning).

**Method**: Live inspection of `app_modules`, `module_actions`, `role_permissions`, `roles`, `user_roles`, and route registrations in `src/components/routing/AppRoutes.tsx`. No static menu edits — the live left menu is fully driven by `app_modules`.

---

## 1. Features verified

| Feature | Route | app_modules row (id / name) | Parent | is_enabled | show_in_menu |
|---|---|---|---|---|---|
| Reference Framework | `/admin/reference-framework` | `693bfd28-…a89f` / `admin_reference_framework` | `admin_master_data` (`e1a0…0003`) | ✅ | ✅ |
| Organisation Management (shell) | *(group)* | `e1a0…0001` / `admin_organization` | Platform Admin (`aab5fcb8-…`) | ✅ | ✅ |
| Organisation Overview | `/admin/org/overview` | `f0110000-…0000` / `admin_org_overview` | `admin_organization` | ✅ | ✅ |
| Organisation Foundation (group) | *(group)* | `f0110001-…0001` / `admin_org_foundation` | `admin_organization` | ✅ | ✅ |
| Brand Assets (group) | *(group)* | `f0110001-…0002` / `admin_org_brand_assets` | `admin_organization` | ✅ | ✅ |
| Communication Library (group) | *(group)* | `f0110001-…0003` / `admin_org_comm_library` | `admin_organization` | ✅ | ✅ |
| Configuration Center (group) | *(group)* | `f0110001-…0004` / `admin_org_config_center` | `admin_organization` | ✅ | ✅ |
| Validation & Impact (group) | *(group)* | `f0110001-…0005` / `admin_org_validation` | `admin_organization` | ✅ | ✅ |
| Master Data (shell) | *(group)* | `e1a0…0003` / `admin_master_data` | Platform Admin | ✅ | ✅ |

**Deprecated duplicates left disabled (no menu impact)**:
- `7b40b5f9-…4427a` `organization_management` — `is_enabled=false`, `show_in_menu=false`. Retained only for historical `role_permissions` links; retirement deferred to a later wave.
- `d7aae631-…46b60` `Master Data (deprecated dup)` — `is_enabled=false`, `show_in_menu=false`.

No new duplicate screens introduced.

---

## 2. Actions per module (module_actions)

| Module | view | manage | admin | approve | retire | import | export |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `admin_reference_framework` | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| `admin_org_overview` | ✅ | — | — | — | — | — | — |
| `admin_org_foundation` (group) | ✅ | — | — | — | — | — | — |
| `admin_org_brand_assets` (group) | ✅ | — | — | — | — | — | — |
| `admin_org_comm_library` (group) | ✅ | — | — | — | — | — | — |
| `admin_org_config_center` (group) | ✅ | — | — | — | — | — | — |
| `admin_org_validation` (group) | ✅ | — | — | — | — | — | — |

**Design note**: The `f01100…` rows are menu **grouping shells** (route is null except `admin_org_overview`). Only `view` is meaningful for visibility; leaf actions (`manage`, `admin`, `approve`, …) live on the underlying leaf modules (`org_profile`, `org_locations`, `dept_profiles`, `admin_master_data`, etc.), which were verified in Epic 2.0.1 and left unchanged here.

The `admin` action for Reference Framework is intentionally not modelled — Reference Framework governance uses `manage` + `approve` + `retire` rather than a generic `admin` flag. Documented in `EPIC_1_1_REFERENCE_FRAMEWORK_STANDARD.md`.

---

## 3. Role assignments (role_permissions)

**Before this pass**:
- Admin: full grants on Reference Framework + `view` on all six Organisation Foundation grouping modules. ✅
- Application Admin: only `view` + `manage` on Reference Framework. **Gap**: no `approve/retire/import/export`, no access to any Organisation Foundation grouping.
- Super Admin: role does not exist in this deployment (`roles` contains Admin, Application Admin, BN_CONFIG_ADMIN, ComplianceAdmin, LEGAL_ADMIN). N/A.

**Fixes applied** (additive only, no schema change):
1. Granted `Application Admin` → `admin_reference_framework` actions: `approve`, `retire`, `import`, `export`.
2. Granted `Application Admin` → `view` on `admin_org_overview`, `admin_org_foundation`, `admin_org_brand_assets`, `admin_org_comm_library`, `admin_org_config_center`, `admin_org_validation`.

**After**:
| Role | Reference Framework | Org Foundation groupings |
|---|---|---|
| Admin | view, manage, approve, retire, import, export | view (all 6) |
| Application Admin | view, manage, approve, retire, import, export | view (all 6) |

---

## 4. Current logged-in user

Active administrators with role→permission inheritance verified:

| User | Email | user_roles.role | Effective access |
|---|---|---|---|
| System Admin | `admin@secureserve.gov` | `Admin` | Full — inherits every grant above. |
| misha Limited | `rohit@mishainfotech.com` | `Admin` | Full — inherits every grant above. |

`user_roles.role` (text) resolves to `roles.role_name` which drives `role_permissions`. Both active Admin users can therefore reach every recently added Enterprise Foundation surface **without any manual SQL**.

---

## 5. Left menu (live, app_modules-driven)

The sidebar renderer reads `app_modules` filtered by `is_enabled=true AND show_in_menu=true` and joins to `role_permissions` (via user's `roles`) for `view`. All rows in section 1 satisfy these criteria for both Admin and Application Admin after the fix in section 3.

No static menu file was created or edited. Confirmed no menu constants under `src/config/menu*`, `src/constants/menu*`, or `src/lib/menu*` gate these entries.

---

## 6. Platform Admin linkage

`admin_organization` and `admin_master_data` are children of the canonical **Platform Admin** container (`aab5fcb8-51fb-4a5c-8a87-6cef31068b47`). Reference Framework sits under `admin_master_data`. Platform Admin dashboard route `/admin/platform` (`PlatformAdmin.tsx`) already surfaces these groups; no additional linking required.

---

## 7. Routes verified (no parallel screens)

From `src/components/routing/AppRoutes.tsx`:

| Route | Handler | Notes |
|---|---|---|
| `/admin/platform` | `PlatformAdmin` | Canonical shell. |
| `/admin/reference-framework` | `ReferenceFramework` | Single canonical page. |
| `/admin/org/overview` (+ `:section/:leaf`) | `OrganizationManagementShell` | Canonical shell for all Organisation Foundation leaves. |
| `/admin/organization-management` | Redirect → `/admin/org/foundation/profile` | Legacy path preserved via redirect. |
| `/admin/organization-management/legacy` | `OrganizationManagementAdmin` | Read-only legacy fallback, not linked from menu. |
| `/admin/organization/profile` | `OrganizationProfilePage` | Existing canonical leaf reused by Epic 2.0.1. |
| `/admin/organization/locations` | Redirect → `/admin/offices?tab=locations` | Reuses `OfficesAdmin`. |
| `/admin/organization/departments` | Redirect → `/admin/departments?tab=profiles` | Reuses `DepartmentsAdmin`. |

All redirects prevent duplicate/parallel screens per `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`.

---

## 8. Issues fixed

| # | Issue | Fix |
|---|---|---|
| 1 | Application Admin lacked `approve/retire/import/export` on Reference Framework. | Inserted 4 `role_permissions` rows. |
| 2 | Application Admin lacked `view` on all six Organisation Foundation menu groupings — menu items hidden for that role. | Inserted 6 `role_permissions` rows. |

Both fixes are **additive `INSERT`s guarded by `NOT EXISTS`** — idempotent, no updates to existing data, no schema changes.

---

## 9. Rollback

Single reversible statement (safe — deletes only the rows added in this pass):

```sql
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE role_name='Application Admin')
  AND module_id IN (
    '693bfd28-12d9-4711-9b42-883adb08a89f',
    'f0110000-0000-4000-8000-000000000000',
    'f0110001-0000-4000-8000-000000000001',
    'f0110001-0000-4000-8000-000000000002',
    'f0110001-0000-4000-8000-000000000003',
    'f0110001-0000-4000-8000-000000000004',
    'f0110001-0000-4000-8000-000000000005'
  )
  AND action_id IN (
    SELECT id FROM module_actions
    WHERE (module_id='693bfd28-12d9-4711-9b42-883adb08a89f'
           AND action_name IN ('approve','retire','import','export'))
       OR (module_id IN (
             'f0110000-0000-4000-8000-000000000000',
             'f0110001-0000-4000-8000-000000000001',
             'f0110001-0000-4000-8000-000000000002',
             'f0110001-0000-4000-8000-000000000003',
             'f0110001-0000-4000-8000-000000000004',
             'f0110001-0000-4000-8000-000000000005')
           AND action_name='view')
  );
```

---

## 10. Acceptance

- ✅ Every recently added Enterprise Foundation feature is visible in the live left menu (driven exclusively by `app_modules`).
- ✅ Current logged-in Admin users (`admin@secureserve.gov`, `rohit@mishainfotech.com`) can access every feature via role inheritance — no manual SQL required.
- ✅ `Admin` and `Application Admin` roles both hold the required view + management permissions. `Super Admin` role is not present in this deployment.
- ✅ No static menu file dependency introduced or relied on.
- ✅ No duplicate screens created; legacy paths redirect to the canonical `OrganizationManagementShell`.
- ✅ No BEMA or legacy table structures were altered.
