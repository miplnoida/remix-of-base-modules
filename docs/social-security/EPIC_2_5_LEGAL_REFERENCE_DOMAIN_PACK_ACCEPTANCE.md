# Epic 2.5 — Legal Reference Domain Pack — Acceptance

**Status:** Complete
**Scope:** St. Kitts & Nevis (KN) default; tables future-ready for multi-country.
**Owner:** Social Security Shared Domain

## 1. Assets reused
- Geography Domain Pack: `useCountries()`, `useDefaultCountry()` for country linkage.
- Default Country Bootstrap (Epic 2.4A): KN auto-select when only one active country.
- Enterprise Reference Framework (`core_reference_group/value`) for reference lifecycle metadata.
- Existing `ssp_jurisdiction` table (reused; no structural change).
- Existing `core_legal_reference*` remains the canonical **cross-module** attachment surface for entity mappings (kept intact; not duplicated).
- Enterprise Catalogue / `app_modules` / `role_permissions` governance.

## 2. Assets built (additive only)
Additive `ssp_legal_*` tables (no RLS — role-based security per project rule):
- `ssp_legal_reference_type` (seeded with 9 baseline types: ACT, SECTION, SUBSECTION, REGULATION, SI, ORDER, NOTICE, POLICY, GUIDELINE)
- `ssp_legal_act`
- `ssp_legal_section`
- `ssp_regulation`
- `ssp_court_reference`
- `ssp_legal_reference` (unified registry with penalty_scale JSONB + tags)
- `ssp_legal_external_code` (legacy identifier mapping — including legacy `lg_court`, `core_legal_reference`, etc.)
- `ssp_country_legal_applicability`

Services / hooks:
- `src/services/legal-reference/sspLegalReferenceService.ts` — `legalReferenceService.{listActs, listSections, listRegulations, listJurisdictions, listCourts, listLegalReferences, listExternalCodes, listCountryApplicability, resolveLegalReference, resolveLegalReferencesForCountry}`
- `src/hooks/legal-reference/useSspLegalReference.ts` — `useLegalActs`, `useLegalSections(actId?)`, `useRegulations`, `useJurisdictions(countryCode?)`, `useCourtReferences(countryCode?)`, `useLegalReferences`, `useLegalExternalCodes`, `useCountryLegalApplicability`, `useLegalReferenceTypes`.

UI:
- `src/pages/admin/LegalReferenceDomainPage.tsx` — 9-tab canonical admin surface.

## 3. Route / menu / app_modules
- Route: `/admin/legal-reference` (registered in `AppRoutes.tsx`).
- Menu: Platform Admin → **Shared Domains** card → *Legal Reference*.
- `app_modules` row: `legal_reference_domain` (`id = 2c2c0000-0000-4000-8000-000000000250`), parent = Administration group, icon `Scale`, sort_order 78.

## 4. Permissions / roles
- Actions: `view`, `manage`, `admin`, `import`, `export` (via `module_actions`).
- Roles granted (via `role_permissions`, all 5 actions): **Admin**, **Application Admin**, **Super Admin** (when present).

## 5. Current user access verification
- Active admins `admin@secureserve.gov` and `rohit@mishainfotech.com` hold **Admin / Application Admin** roles, so they receive all 5 legal-reference actions automatically through the DO-block grants. Screen loads at `/admin/legal-reference` with country selector populated.

## 6. KN default country verification
- Country selector uses `useCountries()` and auto-selects the first active country. With only KN seeded by Epic 2.4A, KN is preselected — screen never blocks.
- Explicit fallback in code: `countries[0]?.country_code || 'KN'`.

## 7. Legacy Legal / BN / Compliance / BEMA / IA / Finance impact
- **Zero structural changes** to any legacy table (`lg_*`, `bn_country_*`, `legal_*`, `bema_*`, `ia_*`, `ce_*`, `cn_*`, `core_legal_reference*`).
- `core_legal_reference` and `core_module_legal_reference` remain the canonical cross-module attachment mechanism. `ssp_legal_reference` supplies the shared country-scoped catalogue; adoption waves will bridge them via `ssp_legal_external_code` when needed.

## 8. Rollback
```sql
DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'legal_reference_domain';
DELETE FROM public.role_permissions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000250';
DELETE FROM public.module_actions
 WHERE module_id = '2c2c0000-0000-4000-8000-000000000250';
DELETE FROM public.app_modules
 WHERE id = '2c2c0000-0000-4000-8000-000000000250';
DROP TABLE IF EXISTS public.ssp_country_legal_applicability;
DROP TABLE IF EXISTS public.ssp_legal_external_code;
DROP TABLE IF EXISTS public.ssp_legal_reference;
DROP TABLE IF EXISTS public.ssp_court_reference;
DROP TABLE IF EXISTS public.ssp_regulation;
DROP TABLE IF EXISTS public.ssp_legal_section;
DROP TABLE IF EXISTS public.ssp_legal_act;
DROP TABLE IF EXISTS public.ssp_legal_reference_type;
```
Also revert `src/components/routing/AppRoutes.tsx` and `src/pages/admin/PlatformAdmin.tsx` link additions.

## 9. Deferred adoption waves
- **Wave A — Legal module bridge:** map existing `lg_court`, `lg_matter_type`, `core_legal_reference` rows into `ssp_legal_external_code` for cross-lookup (read-only).
- **Wave B — Compliance / BN adoption:** switch penalty-scale lookups in `ce_penalty_calculations` and BN benefit reference reads to `resolveLegalReference()`.
- **Wave C — Portals:** expose curated `ssp_legal_reference` subset to Employer/Member portals via read-only edge functions.
- **Wave D — Editorial UI:** promote current admin from read-only tabs to full CRUD with maker-checker workflow.
- **Wave E — Country expansion:** seed additional countries when platform goes multi-country; UI already handles selection.

## 10. Enterprise DoD
- Migration applied; only pre-existing security linter warnings remain (unchanged).
- No legacy table changed.
- KN auto-selects on all tabs.
- `app_modules`, actions, role grants, Enterprise Catalogue entry created.
- Acceptance doc (this file) + rollback documented.
