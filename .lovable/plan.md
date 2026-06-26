
# Organization & Department Profile Management

Build enterprise configuration screens on top of the foundation we already shipped (`core_organization`, `core_department_profile`, `core_department_location`, `comm_*`, `office_locations`). Add menus, permissions, validation, and wire Legal Admin to reuse the same service layer.

## Scope summary

What already exists (from prior phases — reuse, do not recreate):
- Tables: `core_organization`, `core_department_profile`, `core_department_location`, `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_print_footer`, `office_locations`
- Resolver: `src/lib/comm/communicationResolver.ts` (org + dept + location + asset tokens)
- Hooks: `useCoreDepartmentProfile`, `useCommunicationContext`, `useCommAssets`
- Legal Admin Department Profile page already thin and wired to resolver
- `LegalLetterhead` + `GenerateTemplateDialog` already use resolver

What this plan adds:
1. Schema gap-fill on `core_organization` (registration_no, main_email, main_phone, seal_asset_id, logo_asset_id text columns if missing) and on `office_locations` (location_type, island_or_region, parish_city, office_hours, is_primary — only if missing).
2. Menu + permissions for Organization Management.
3. Five new System Admin pages under `/admin/organization/*`.
4. Generic Department Profiles list (filterable by module/department_type) under System Admin.
5. Validation & "Usage" panels driven by live counts from referencing tables.
6. Permission gates on existing Legal Admin Department Profile page.

## Database changes (single migration)

```text
ALTER core_organization
  ADD COLUMN IF NOT EXISTS registration_no TEXT,
  ADD COLUMN IF NOT EXISTS main_email TEXT,
  ADD COLUMN IF NOT EXISTS main_phone TEXT,
  ADD COLUMN IF NOT EXISTS logo_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS seal_asset_id TEXT;

ALTER office_locations
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'BRANCH',
  ADD COLUMN IF NOT EXISTS island_or_region TEXT,
  ADD COLUMN IF NOT EXISTS parish_city TEXT,
  ADD COLUMN IF NOT EXISTS office_hours TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Seed St. Kitts + Nevis offices if not already present
INSERT … ON CONFLICT (location_code) DO NOTHING;

-- Permissions (insert into app_modules + role_permissions)
-- 10 new permission action rows across org_profile, org_locations,
-- org_comm_assets, dept_profile, lg_profile namespaces.

-- Menu rows in app_modules:
--   System Admin > Organization Management (parent)
--     Organization Profile      → /admin/organization/profile
--     Locations / Branches      → /admin/organization/locations
--     Communication Assets      → /admin/organization/communication-assets
--     Department Profiles       → /admin/organization/departments
--     Usage & Validation        → /admin/organization/usage
```

NO-RLS architecture continues (per project rules). Grants follow project convention.

## New pages

```text
src/pages/admin/organization/
  OrganizationProfilePage.tsx        — tabs: General | Contact | Branding | Defaults | Usage
  LocationsPage.tsx                  — list + create/edit dialog
  CommunicationAssetsPage.tsx        — reuses existing CommunicationAssetsAdmin, adds tabs per asset type
  DepartmentProfilesPage.tsx         — list filtered by module_code/department_type
  DepartmentProfileEditor.tsx        — generic editor (tabs: General | Leadership | Locations | Comm Defaults | DMS & AI | Usage)
  UsageValidationPage.tsx            — aggregated where-used + missing-config panels
src/pages/admin/organization/index.tsx — route shell
```

Routes added in `src/components/routing/AppRoutes.tsx` under existing System Admin section, each guarded by `PermissionProtectedRoute` with the matching permission name.

## Hooks & services

```text
src/hooks/comm/useCoreOrganizationMutation.ts   — update org profile
src/hooks/comm/useOfficeLocations.ts            — list/CRUD office_locations
src/hooks/comm/useDepartmentProfilesList.ts     — list core_department_profile (filterable)
src/hooks/comm/useDepartmentProfileMutation.ts  — upsert dept profile
src/lib/comm/usageScanner.ts                    — counts: templates/notices/letters referencing org/dept/asset IDs
```

`usageScanner` queries existing tables (`core_template`, `lg_notice`, `notification_templates`, `core_generated_document`, etc.) to surface "Used By" counts and inactive-reference warnings.

## Permissions wired

| Permission           | System Admin | Legal Admin | Legal Manager | Legal Officer |
|---------------------|--------------|-------------|---------------|---------------|
| org_profile_view    | ✓            | ✓ (read)    |               |               |
| org_profile_edit    | ✓            |             |               |               |
| org_locations_view  | ✓            | ✓           |               |               |
| org_locations_manage| ✓            |             |               |               |
| org_comm_assets_view| ✓            | ✓           |               |               |
| org_comm_assets_manage| ✓          |             |               |               |
| dept_profile_view   | ✓            |             |               |               |
| dept_profile_edit   | ✓            |             |               |               |
| lg_profile_view     | ✓            | ✓           | ✓             |               |
| lg_profile_edit     | ✓            | ✓           |               |               |

Seeded into `role_permissions` for existing role codes.

## Legal Admin integration

- Existing `LegalAdminDepartmentProfile.tsx` stays in Legal Admin menu, gated by `lg_profile_view` / `lg_profile_edit`.
- It already reuses `core_department_profile` + resolver, so no logic change — only gate + a header link "Manage shared assets →" pointing to `/admin/organization/communication-assets` (visible when user has `org_comm_assets_view`).

## Validation

Client-side (zod-style helpers) on every editor:
- Org: org_code unique (live check), name + country required, primary location must exist
- Location: location_code unique, country required, exactly one primary per organization
- Asset: code unique within asset_type, content not empty, effective_to > effective_from
- Department: department_code unique, manager/location/team/workbasket must be active

Validation Summary banner + inline error pattern per project knowledge `ui/form-validation`.

## Backward compatibility

- `lg_department_profile` columns left intact.
- Resolver already prefers `core_*` + `comm_*`, falls back to legacy fields when asset refs are null.
- No template/notice/AI/DMS code changes — they read through resolver.

## Acceptance

- New menu "Organization Management" visible to System Admin
- St. Kitts + Nevis offices present in Locations
- Communication Assets CRUD with active/effective dates
- Generic Department Profiles list with Legal row visible
- Legal Admin → Department Profile still works, gated by permissions
- Letters/PDFs/notifications continue resolving via communicationResolver
- TypeScript build green
- No RLS added (per project rule)

## Out of scope

- Multi-tenant org isolation
- Migration UI for moving legacy free-text to assets (manual for now, fallback path covers reads)
- Workbasket unification across modules

---

Reply **approve** to execute. I'll ship in two passes: (1) migration + permissions + menu, (2) pages + hooks + route wiring + Legal Admin gate.
