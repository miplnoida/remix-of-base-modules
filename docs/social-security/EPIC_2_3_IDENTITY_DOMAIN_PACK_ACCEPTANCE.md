# Epic 2.3 — Identity Domain Pack — Acceptance

**Phase**: 2 — Social Security Shared Domains
**Owner**: Social Security Shared Domain
**Status**: Delivered
**Canonical route**: `/admin/identity`
**Capability key**: `identity_domain`
**Depends on**: `geography_domain` (Epic 2.2)

---

## 1. Assets reused (no duplication)

- **Geography Domain Pack** — country selector on Identity uses `useCountries()` from `@/hooks/geography/useGeography`. No parallel country source or country table is introduced.
- `app_modules` / `module_actions` / `role_permissions` — canonical menu + permission plane extended, no static menu file changed.
- `enterprise_capability_registry` — extended with a new row; table not re-created.
- `PageHeader`, `Tabs`, `Card`, `Select`, `Input`, `Button`, `Badge`, `PermissionWrapper` — shared UI primitives reused, no parallel shell built.
- Platform Admin landing (`/admin/platform`) — Identity linked into the existing Organisation card; no parallel admin page created.
- `bn_country_id_rule`, `external_identity_link_attempt`, `ip_master`, `er_master`, BEMA person/employer tables — **untouched**. Legacy identity data continues to be served by legacy tables until adoption waves refactor consumers.

## 2. New assets added (all additive)

**Schema (Supabase migration `20260705_identity_domain_pack`)**

| Table | Purpose |
| --- | --- |
| `ssp_identity_type` | Canonical identity type master (National ID, Passport, TIN, NIS, SSN, Driver License, Voter ID, …). |
| `ssp_identity_validation_pattern` | Reusable validation-pattern library (regex + optional checksum algorithm). |
| `ssp_country_identity_rule` | Per-country identity rules: primary/mandatory, length, regex, checksum, expiry, issuing authority, pattern link. Unique per `(country_code, identity_type_code)`. |
| `ssp_party_identity` | Identity records attached to a party (`member` \| `employer` \| `dependant` \| `nominee` \| `representative` \| `staff` \| `portal_user` \| `other`). Carries verification status. |
| `ssp_external_identity_ref` | External / legacy identity references (system + external_ref + JSON metadata). |
| `ssp_identity_verification_event` | Verification lifecycle events (submitted / verified / failed / expired / manually_reviewed / revoked). |
| `ssp_identity_match_key` | Lightweight matching keys for duplicate detection (`name_dob`, `id_hash`, `phone`, `email`, `address_hash`, …). |

All tables carry the mandatory `GRANT` block (`authenticated`, `service_role`, read-only `anon`) per the Enterprise Registration Pipeline. No RLS added (project-wide architectural rule — role-based security only).

**Facade + hooks**

- `src/services/identity/identityService.ts` — canonical read facade: `listIdentityTypes`, `listValidationPatterns`, `listCountryRules`, `listPartyIdentities`, `listExternalRefs`, `listVerificationEvents`, `listMatchKeys`, plus `validateIdentity(countryCode, identityTypeCode, value)` and `normaliseIdentity(identityTypeCode, value)` helpers.
- `src/hooks/identity/useIdentity.ts` — `useIdentityTypes`, `useValidationPatterns`, `useCountryIdentityRules`, `usePartyIdentities`, `useExternalIdentityRefs`, `useIdentityVerificationEvents`, `useIdentityMatchKeys`, `useIdentityValidation`, aggregate `useIdentityDomain`.

**UI**

- `src/pages/admin/IdentityDomainPage.tsx` — tabbed shell (Identity Types · Country Rules · Validation Patterns · Party Identities · External References · Verification Events · Match Keys), gated by `PermissionWrapper moduleName="identity_domain"`. Includes a live validator panel that consumes the shared facade.

Tabs that would require migrating live person/member data (Party Identities, External References, Verification Events, Match Keys) render read-only empty-states until the respective adoption waves land — per the epic constraint.

## 3. Screens / routes

| Route | File | Notes |
| --- | --- | --- |
| `/admin/identity` | `IdentityDomainPage.tsx` | Registered lazily in `src/components/routing/AppRoutes.tsx`. |

Link added on Platform Admin landing under **Organisation** card (next to Geography). Left menu is `app_modules`-driven; no static menu file was touched.

## 4. `app_modules` registration

```
id            = 2c2c0000-0000-4000-8000-000000000230
name          = identity_domain
display_name  = Identity
route         = /admin/identity
parent_id     = aab5fcb8-51fb-4a5c-8a87-6cef31068b47  (Administration)
icon          = IdCard
sort_order    = 76
is_enabled    = true
show_in_menu  = true
routes_enabled / actions_enabled = true
```

## 5. Permissions created

`module_actions` on `identity_domain`:

- `view` — View Identity Domain
- `manage` — Manage Identity Domain (types, rules, patterns, party identities)
- `admin` — Administer Identity Domain (governance, lifecycle)
- `import` — Import Identity reference data
- `export` — Export Identity reference data
- `verify` — Verify party identities and record verification events

## 6. Roles assigned

`role_permissions` grants (idempotent, guarded by `NOT EXISTS`):

- **Admin** → view, manage, admin, import, export, verify
- **Application Admin** → view, manage, admin, import, export, verify
- **Super Admin** → same set when the role exists

## 7. Current logged-in administrator verification

```
email                            role   actions
admin@secureserve.gov            Admin  6
rohit@mishainfotech.com          Admin  6
```

Both currently active admin identities inherit every declared `identity_domain` action through role mapping — no manual SQL required to reach `/admin/identity`.

## 8. Geography consumption verification

- Country selector on `IdentityDomainPage` imports `useCountries` from `@/hooks/geography/useGeography`.
- `useCountryIdentityRules(countryCode)` is keyed on the Geography-provided `country_code`.
- No import of `bn_country` / `tb_country` in the new identity code paths.

Verified by inspection of `src/pages/admin/IdentityDomainPage.tsx` and `src/services/identity/identityService.ts`.

## 9. Enterprise Catalogue registration

Row upserted in `enterprise_capability_registry`:

```
capability_key     = identity_domain
capability_name    = Identity Domain Pack
category           = shared_domain
grouping           = Social Security Shared Domain
owner              = Social Security Shared Domain
status             = active
version            = 1.0.0
canonical_route    = /admin/identity
menu_module_name   = identity_domain
permission_hint    = identity_domain:view
consumers          = { organisation, geography, employer, member, bn,
                       contributions, compliance, legal, finance, hrms,
                       prison, licensing, portals }
dependencies       = { reference_framework, master_data_platform,
                       geography_domain, organisation_foundation }
health_* / overall = green
```

Visible in `/admin/platform/enterprise-catalogue`.

## 10. BEMA / IA / BN / Legacy impact

**None.** No `tb_*`, `ip_*`, `er_*`, `cn_*`, `au_*`, `ia_*`, `lg_*`, `bema_*`, `bn_country_id_rule`, `external_identity_link_attempt` table was altered or dropped. Existing person/member identity data continues to be served by legacy tables. Migration of BN / BEMA / Member identity data to `ssp_party_identity` is scheduled for later adoption epics (see §12).

## 11. Consumption readiness

- Read-only facade (`identityService`) + hooks are the ONLY supported entry-point for downstream modules.
- Direct table access (`from('ssp_identity_*')` outside the facade) is forbidden by the Common Consumption Model.
- `validateIdentity` and `normaliseIdentity` provide the canonical validation surface consumers must use before writing identity values.

## 12. Rollback

Idempotent, reversible:

```sql
-- 1. Remove capability, menu, permissions
DELETE FROM public.role_permissions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000230'::uuid;
DELETE FROM public.module_actions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000230'::uuid;
DELETE FROM public.app_modules
 WHERE id = '2c2c0000-0000-4000-8000-000000000230'::uuid;
DELETE FROM public.enterprise_capability_registry
 WHERE capability_key = 'identity_domain';

-- 2. Drop additive tables (only after confirming no data is in use)
DROP TABLE IF EXISTS public.ssp_identity_match_key;
DROP TABLE IF EXISTS public.ssp_identity_verification_event;
DROP TABLE IF EXISTS public.ssp_external_identity_ref;
DROP TABLE IF EXISTS public.ssp_party_identity;
DROP TABLE IF EXISTS public.ssp_country_identity_rule;
DROP TABLE IF EXISTS public.ssp_identity_validation_pattern;
DROP TABLE IF EXISTS public.ssp_identity_type;

-- 3. Code rollback: revert AppRoutes.tsx, PlatformAdmin.tsx, and delete
--    src/pages/admin/IdentityDomainPage.tsx,
--    src/hooks/identity/, src/services/identity/.
```

Rollback is safe because every asset introduced is additive.

## 13. Deferred items

- Seed data: canonical identity types (National ID, Passport, TIN, NIS, SSN, Driver License, Voter ID) and St. Kitts / Nevis country rules — data-only migration on request.
- Write-side admin forms for Identity Types, Country Rules, Validation Patterns — read-only tables ship first.
- Adapter view `v_party_identity` unifying legacy BN / BEMA / IP identity fields — lands with first consumer adoption (Member Domain).
- Server-side re-validation via edge function (mirror of `validateIdentity`) — planned once first writer arrives.
- Duplicate matching engine on `ssp_identity_match_key` — this epic only ships the store; matching engine is a separate epic.
- Migration of `external_identity_link_attempt` into `ssp_external_identity_ref` — deferred.
- Adoption in Member / Employer / BN / Compliance / HRMS / Prison / Licensing / Portals — separate downstream epics per the Phase 2 programme.

## 14. Next domain

Recommend proceeding to **Epic 2.4 — Financial Reference Domain Pack** (currency, exchange rates, chart-of-accounts codes, tax reference, bank reference), which unblocks Contributions, BN payment plumbing, Legal recoveries, and Finance simultaneously. Legal-only shared surfaces can follow immediately after as Epic 2.5.

---

**Definition of Done — checklist**

- [x] No duplicate screens introduced.
- [x] No duplicate tables introduced where reuse was possible.
- [x] No BEMA / IA / BN legacy table changed.
- [x] Geography Domain Pack consumed for country linkage (verified §8).
- [x] `app_modules` row exists with `is_enabled=true`, `show_in_menu=true`.
- [x] Permissions (`module_actions`) created for view/manage/admin/import/export/verify.
- [x] Admin + Application Admin roles receive all 6 actions.
- [x] Current logged-in admin verified without manual SQL.
- [x] Platform Admin navigation surfaces `/admin/identity`.
- [x] Enterprise Catalogue row registered with green health.
- [x] Acceptance document present (this file).
- [x] Rollback documented above.
