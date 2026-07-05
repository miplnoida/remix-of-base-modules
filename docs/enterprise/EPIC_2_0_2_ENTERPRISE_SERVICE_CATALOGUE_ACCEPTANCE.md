# Epic 2.0.2 — Enterprise Service Catalogue & Capability Registry — Acceptance

**Scope**: Add the Enterprise Service Catalogue inside the existing Platform Admin, backed by a capability registry. No new admin app. No duplicate menus, screens, permissions or registries.

---

## 1. Capabilities registered

Seeded into `enterprise_capability_registry`:

| Key | Capability | Grouping | Status | Route |
|---|---|---|---|---|
| `platform_admin` | Platform Admin | Platform | active | `/admin/platform` |
| `enterprise_service_catalogue` | Enterprise Service Catalogue | Platform | active | `/admin/platform/enterprise-catalogue` |
| `reference_framework` | Reference Framework | Enterprise Core | active | `/admin/reference-framework` |
| `reference_governance` | Reference Governance | Governance | active | `/admin/reference-framework?tab=governance` |
| `reference_adoption` | Reference Adoption | Governance | active | `/admin/reference-framework?tab=adoption` |
| `framework_blueprint` | Framework Blueprint | Governance | active | — |
| `master_data_platform` | Master Data Platform | Enterprise Core | planning | `/admin/master-data` |
| `organisation_foundation` | Organisation Foundation | Organisation | active | `/admin/org/overview` |
| `calendar_holidays_working_week` | Calendar / Holidays / Working Week | Shared Domains | planning | `/admin/org/overview` |
| `common_consumption_model` | Common Consumption Model | Governance | planning | — |

Each entry records: category, grouping, owner, status, version, canonical route, menu module, permission hint, consumers, dependencies, documentation link, architecture link, acceptance link, seven health flags and an overall health rollup.

**Future capabilities auto-register** by inserting into `enterprise_capability_registry` (idempotent `ON CONFLICT (capability_key) DO UPDATE`). Every Epic completion migration should append one row per capability.

---

## 2. Menu verification (app_modules driven)

- Row: `admin_enterprise_catalogue` (`f0110002-0000-4000-8000-000000000001`)
- Parent: Platform Admin container `aab5fcb8-51fb-4a5c-8a87-6cef31068b47`
- Route: `/admin/platform/enterprise-catalogue`, icon `BookMarked`, sort_order 5
- `is_enabled=true`, `show_in_menu=true`, `routes_enabled=true`, `actions_enabled=true`

No static menu file was introduced. Sidebar picks it up through the existing app_modules query.

`PlatformAdmin.tsx` also renders a new "Enterprise Catalogue" card linking to the same canonical route — reusing the existing PlatformAdmin dashboard, no duplicate shell.

---

## 3. Permission verification

Actions created in `module_actions` for `admin_enterprise_catalogue`: `view`, `manage`, `admin`.

`role_permissions` grants (idempotent `NOT EXISTS` guard):

| Role | view | manage | admin |
|---|:-:|:-:|:-:|
| Admin | ✅ | ✅ | ✅ |
| Application Admin | ✅ | ✅ | ✅ |
| Super Admin | *(role does not exist in this deployment — N/A)* |

---

## 4. Current user verification

Active administrators (from `profiles` ⨝ `user_roles` where `role IN ('Admin','Application Admin')`):

| User | Email | Role | Effective access |
|---|---|---|---|
| System Admin | `admin@secureserve.gov` | Admin | Full view/manage/admin |
| misha Limited | `rohit@mishainfotech.com` | Admin | Full view/manage/admin |

Both users see the "Enterprise Service Catalogue" menu entry under Platform Admin and can open `/admin/platform/enterprise-catalogue` without any manual SQL.

---

## 5. Platform Admin verification

- Existing `src/pages/admin/PlatformAdmin.tsx` reused — new "Enterprise Catalogue" group added; no other shells created.
- New page: `src/pages/admin/EnterpriseServiceCatalogue.tsx` with tabs **Registry / Consumers / Dependencies / Health** and search by capability, owner, module, route, permission, consumer.
- Route registered in `src/components/routing/AppRoutes.tsx` at `/admin/platform/enterprise-catalogue`.

---

## 6. Routes

| Route | Handler | Purpose |
|---|---|---|
| `/admin/platform` | `PlatformAdmin` | Existing shell — reused, one new card added. |
| `/admin/platform/enterprise-catalogue` | `EnterpriseServiceCatalogue` | New capability registry UI. |

No parallel or duplicate admin routes introduced.

---

## 7. Dependencies

- `app_modules` (menu registration)
- `module_actions` + `role_permissions` (access control)
- `enterprise_capability_registry` (new table, no RLS per project standard, GRANTs to `authenticated` / `service_role` / read for `anon`)
- Reuses existing `PageHeader`, `Card`, `Tabs`, `Badge`, `Input`, `Select` primitives — no new UI dependencies.

## 8. Consumers

Every product (Benefits, Contributions, Employer, Audit, HRMS, DMS, Licensing, Prison, Payroll, future government platforms) consumes the Catalogue for discovery, and each active capability lists its own consumers in the seeded rows.

---

## 9. Rollback

Single reversible block:

```sql
-- Remove seeded registry rows and the menu entry / actions / grants.
DELETE FROM role_permissions WHERE module_id = 'f0110002-0000-4000-8000-000000000001';
DELETE FROM module_actions   WHERE module_id = 'f0110002-0000-4000-8000-000000000001';
DELETE FROM app_modules      WHERE id        = 'f0110002-0000-4000-8000-000000000001';
DELETE FROM enterprise_capability_registry
 WHERE capability_key IN (
   'platform_admin','enterprise_service_catalogue','reference_framework',
   'reference_governance','reference_adoption','framework_blueprint',
   'master_data_platform','organisation_foundation',
   'calendar_holidays_working_week','common_consumption_model'
 );
-- Then optionally drop the table if the catalogue is being fully removed:
-- DROP TABLE public.enterprise_capability_registry;
```

Code rollback: revert the two lazy import lines and the added route in `AppRoutes.tsx`, remove the new PlatformAdmin card block, and delete `src/pages/admin/EnterpriseServiceCatalogue.tsx`.

---

## 10. Enterprise Definition of Done

- ✅ Existing Platform Admin reused (single new card added, no new shell).
- ✅ No duplicate screens.
- ✅ No duplicate menus — sidebar remains app_modules-driven.
- ✅ `app_modules` updated (one new row).
- ✅ Permissions verified for Admin and Application Admin (Super Admin absent from deployment).
- ✅ Current logged-in administrators verified via `profiles` ⨝ `user_roles`.
- ✅ Platform Admin updated with Enterprise Catalogue entry.
- ✅ Capability registration complete for every reusable capability delivered to date.
- ✅ Acceptance document created (this file).
- ✅ Rollback documented.
- ✅ No BEMA / legacy table structures altered.
