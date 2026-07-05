# Epic 2.2 — Geography Domain Pack — Acceptance

**Phase**: 2 — Social Security Shared Domains
**Owner**: Social Security Shared Domain
**Status**: Delivered
**Canonical route**: `/admin/geography`
**Capability key**: `geography_domain`

---

## 1. Assets reused (no duplication)

- `core_reference_group` / `core_reference_value` / `core_reference_category` — future country reference-list adoption.
- `coreReferenceDataService` — pattern reused for read facades.
- `core_organization`, `office_locations`, `public_holidays` — untouched; consumed downstream.
- `bn_country`, `bn_country_address_model`, `bn_country_id_rule`, `tb_country` — untouched.
- `app_modules` / `module_actions` / `role_permissions` — canonical menu + permission plane extended, no static menu file changed.
- `enterprise_capability_registry` — extended with a new row; table not re-created.
- `PageHeader`, `Tabs`, `Card`, `Select`, `PermissionWrapper` — shared UI primitives reused, no parallel shell built.
- Platform Admin landing (`/admin/platform`) — Geography linked into existing Organisation card; no parallel admin page created.

## 2. New assets added (all additive)

**Schema (Supabase migration `20260705_geography_domain_pack`)**

| Table | Purpose |
| --- | --- |
| `ssp_country_profile` | Canonical SSP country profile (code, ISO codes, timezone, locale, currency). |
| `ssp_admin_level` | Configurable per-country administrative levels (state, parish, district, village, …). |
| `ssp_geo_area` | Hierarchical geo areas keyed by level; supports `geo_codes` + `external_codes` JSON. |
| `ssp_address_format` | Per-country address model / display template / sample. |
| `ssp_postal_rule` | Per-country postal-code validation rules. |
| `ssp_jurisdiction` | Per-country jurisdictions with optional link to a geo area. |
| `ssp_country_policy` | Per-country policy key/JSON store. |
| `ssp_geo_external_code` | Mapping to external / ISO code systems. |

All tables carry the mandatory `GRANT` block (`authenticated`, `service_role`, read-only `anon`) per the Enterprise Registration Pipeline. No RLS added (project-wide architectural rule — role-based security only).

**Facade + hooks**

- `src/services/geography/geographyService.ts` — canonical read facade (`listCountries`, `listAdminLevels`, `listGeoAreas`, `listAddressFormats`, `listJurisdictions`, `listPolicies`, `listExternalCodes`).
- `src/hooks/geography/useGeography.ts` — `useCountries`, `useAdminLevels`, `useGeoAreas`, `useAddressFormats`, `useJurisdictions`, `useCountryPolicies`, `useGeoExternalCodes`, aggregate `useGeography`.

**UI**

- `src/pages/admin/GeographyDomainPage.tsx` — tabbed shell (Countries · Administrative Levels · Geo Areas · Address Formats · Jurisdictions · Policies · External Codes), gated by `PermissionWrapper moduleName="geography_domain"`.

## 3. Screens / routes

| Route | File | Notes |
| --- | --- | --- |
| `/admin/geography` | `GeographyDomainPage.tsx` | Registered lazily in `src/components/routing/AppRoutes.tsx`. |

Link added on Platform Admin landing under **Organisation** card. Left menu is `app_modules`-driven; no static menu file was touched.

## 4. `app_modules` registration

```
id            = 2c2c0000-0000-4000-8000-000000000220
name          = geography_domain
display_name  = Geography
route         = /admin/geography
parent_id     = aab5fcb8-51fb-4a5c-8a87-6cef31068b47  (Administration)
icon          = Globe
sort_order    = 75
is_enabled    = true
show_in_menu  = true
routes_enabled / actions_enabled = true
```

## 5. Permissions created

`module_actions` on `geography_domain`:

- `view` — View Geography Domain
- `manage` — Manage Geography Domain
- `admin` — Administer Geography Domain
- `import` — Import Geography reference data
- `export` — Export Geography reference data

## 6. Roles assigned

`role_permissions` grants (idempotent, guarded by `NOT EXISTS`):

- **Admin** → view, manage, admin, import, export
- **Application Admin** → view, manage, admin, import, export
- **Super Admin** → same set when the role exists

Verification query (Automation Guide §3.4 pattern) executed against Live:

```
role_name           actions
Admin               5
Application Admin   5
```

## 7. Current logged-in administrator verification

```
email                            role   actions
admin@secureserve.gov            Admin  5
rohit@mishainfotech.com          Admin  5
```

Both currently active admin identities inherit every declared `geography_domain` action through role mapping — no manual SQL required to reach `/admin/geography`.

## 8. Enterprise Catalogue registration

Row upserted in `enterprise_capability_registry`:

```
capability_key     = geography_domain
capability_name    = Geography Domain Pack
category           = shared_domain
grouping           = Social Security Shared Domain
owner              = Social Security Shared Domain
status             = active
version            = 1.0.0
canonical_route    = /admin/geography
menu_module_name   = geography_domain
permission_hint    = geography_domain:view
consumers          = { organisation, identity, employer, member, bn,
                       contributions, compliance, legal, finance, hrms,
                       prison, licensing }
dependencies       = { reference_framework, master_data_platform,
                       organisation_foundation }
health_* / overall = green
```

Visible in `/admin/platform/enterprise-catalogue`.

## 9. BEMA / IA / Legacy impact

**None.** No `tb_*`, `ip_*`, `er_*`, `cn_*`, `au_*`, `ia_*`, `lg_*`, `bema_*`, `bn_country*` table was altered or dropped. BN country pack tables continue to serve BN as-is; migration to the SSP geography facade is a separate downstream epic (see §12).

## 10. Consumption readiness

- Read-only facade (`geographyService`) + hooks are the ONLY supported entry-point for downstream modules.
- Direct table access (`from('ssp_*')` outside the facade) is forbidden by the Common Consumption Model.
- Adapter views over legacy `bn_country` / `tb_country` (`v_geography_country`) will be added in Epic 2.2.1 when the first consumer (Identity) adopts the facade.

## 11. Rollback

Idempotent, reversible:

```sql
-- 1. Remove capability, menu, permissions
DELETE FROM public.role_permissions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000220'::uuid;
DELETE FROM public.module_actions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000220'::uuid;
DELETE FROM public.app_modules
 WHERE id = '2c2c0000-0000-4000-8000-000000000220'::uuid;
DELETE FROM public.enterprise_capability_registry
 WHERE capability_key = 'geography_domain';

-- 2. Drop additive tables (only after confirming no data is in use)
DROP TABLE IF EXISTS public.ssp_geo_external_code;
DROP TABLE IF EXISTS public.ssp_country_policy;
DROP TABLE IF EXISTS public.ssp_jurisdiction;
DROP TABLE IF EXISTS public.ssp_postal_rule;
DROP TABLE IF EXISTS public.ssp_address_format;
DROP TABLE IF EXISTS public.ssp_geo_area;
DROP TABLE IF EXISTS public.ssp_admin_level;
DROP TABLE IF EXISTS public.ssp_country_profile;

-- 3. Code rollback: revert AppRoutes.tsx, PlatformAdmin.tsx, and delete
--    src/pages/admin/GeographyDomainPage.tsx,
--    src/hooks/geography/, src/services/geography/.
```

Rollback is safe because every asset introduced is additive.

## 12. Deferred items

- Seeding of St. Kitts + Nevis (and other pilot countries) into `ssp_country_profile` / `ssp_admin_level` — will follow via a data-only migration on request.
- Adapter view `v_geography_country` over `bn_country` — will land with first consumer adoption (Identity).
- Write-side admin forms (create/edit) — current release ships read-only shells; edit surfaces will follow once seed model is agreed.
- Bulk import/export tooling wiring on the `import` / `export` actions.
- Migration of BN Product Builder to `useGeography` — kept ON HOLD per instructions.

## 13. Next domain

Proceed to **Epic 2.3 — Identity Domain Pack** (member + external identity facades) as the next Social Security Shared Domain, per the Phase 2 programme sequence.

---

**Definition of Done — checklist**

- [x] No duplicate screens introduced.
- [x] No duplicate tables introduced.
- [x] No BEMA / IA / legacy table changed.
- [x] `app_modules` row exists with `is_enabled=true`, `show_in_menu=true`.
- [x] Permissions (`module_actions`) created for view/manage/admin/import/export.
- [x] Admin + Application Admin roles receive all 5 actions.
- [x] Current logged-in admin verified without manual SQL.
- [x] Platform Admin navigation surfaces `/admin/geography`.
- [x] Enterprise Catalogue row registered with green health.
- [x] Acceptance document present (this file).
- [x] Rollback documented above.
