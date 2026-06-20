## Goal

Turn Legal Reference into a **module-agnostic** domain shared by Benefits, Legal, and future modules — no `bn_*` tables remain for shared Legal Reference functionality. Done once, preserving all existing data.

## Current state (verified)

- `bn_legal_reference` — 14 rows. Structured master used by Benefits (Country Pack, templates, validation, selectors).
- `bn_country_legal_ref` — 14 rows. Legacy loose-text table referenced by older country-package services.
- Code touching `bn_legal_reference`:
  - `src/services/bn/legalReferenceService.ts`
  - `src/hooks/bn/useLegalReferences.ts`
  - `src/components/bn/selectors/LegalReferenceSelector.tsx`
  - `src/pages/bn/config/country/CountryLegalRefs.tsx`
  - `src/components/bn/validation/CountryLegalValidationCard.tsx`
  - `src/components/bn/templates/TemplatePreview.tsx`
  - `src/lib/bn/templateTokens.ts`
  - `src/services/bn/{governance/countryPackageService,countryPackService,countryMasterService}.ts`
- No usage in Legal module yet.

## Target schema (single migration)

New tables in `public`:

1. `legal_reference` — same columns as `bn_legal_reference` minus the BN-specific `applicable_products` (kept as generic `tags`). Preserves PK so existing IDs continue to work after copy.
2. `legal_reference_type` — small lookup (`ACT`, `REGULATION`, `RULE`, `POLICY`, `CIRCULAR`, `CASE_LAW`) seeded with defaults.
3. `module_legal_reference_mapping` — `(id, module_code, entity_table, entity_id, legal_reference_id, role, notes, created_by, created_at)` with unique `(module_code, entity_table, entity_id, legal_reference_id, role)`. `module_code` is a short token (`BN`, `LG`, `CE`, …). Indexed on `(legal_reference_id)` and `(module_code, entity_id)`.

```text
legal_reference 1───* module_legal_reference_mapping *───1 <any module entity>
```

Data migration (same migration, before drop):

- `INSERT INTO legal_reference SELECT … FROM bn_legal_reference` (keep IDs, map `applicable_products` into `tags` array).
- Recreate `bn_legal_reference` as an updatable **view** over `legal_reference` so any code we miss keeps working until follow-up. The view is marked deprecated in a comment.
- Leave the legacy `bn_country_legal_ref` table untouched (out of scope — it's loose text, different shape, only used by Country Pack import/export).

GRANTs on both new tables for `authenticated` and `service_role`. No RLS (project rule).

## Backend / service layer

New shared layer under `src/services/legal-reference/`:

- `legalReferenceService.ts` — `list/get/upsert/delete/setStatus`, country-scoped, module-agnostic. Mirrors the old BN service signatures.
- `moduleLegalReferenceMappingService.ts` — `listForEntity`, `attach`, `detach`, `listEntitiesForReference`.
- `types.ts` — `LegalReference`, `ModuleLegalReferenceMapping`, `ModuleCode`.

`src/services/bn/legalReferenceService.ts` becomes a thin re-export wrapper around the shared service so existing imports keep compiling.

New hooks under `src/hooks/legal-reference/`:

- `useLegalReferences`, `useLegalReference`, `useUpsertLegalReference`, `useDeleteLegalReference`, `useSetLegalReferenceStatus`
- `useEntityLegalReferences(moduleCode, entityTable, entityId)`, `useAttachLegalReference`, `useDetachLegalReference`

`src/hooks/bn/useLegalReferences.ts` re-exports from the shared hooks (zero call-site churn in BN).

## Shared UI

Move and generalise components into `src/components/legal-reference/`:

- `LegalReferenceSelector` (ported from `components/bn/selectors/LegalReferenceSelector.tsx`, country-scoped, optional tag/module filter).
- `LegalReferenceSearchDialog` — full-screen search with code/title/act filters.
- `LegalReferenceDetail` — read-only detail card.
- `EntityLegalReferenceManager` — add / remove / list mappings for a given `(moduleCode, entityTable, entityId)`. Drop-in for any module's detail screen.

`components/bn/selectors/LegalReferenceSelector.tsx` becomes a re-export shim.

## Module integrations

**Benefits**

- Update `pages/bn/config/country/CountryLegalRefs.tsx` to read/write `legal_reference` via the shared hooks (drop direct `bn_legal_reference` access). No UX change.
- `CountryLegalValidationCard`, `TemplatePreview`, `templateTokens`, country-pack services: switch table name to `legal_reference`.

**Legal**

- New page `src/pages/legal/admin/LegalReferenceLibrary.tsx` — same management UI as Benefits but module-scoped to `LG`. Mounted at `/legal/admin/legal-references` and added to the Legal Admin submenu.
- New tab inside `LgCaseDetail` ("Legal References") that uses `EntityLegalReferenceManager` with `(moduleCode='LG', entityTable='lg_case', entityId=caseId)`.

## Validation & rollback

- After-migration check (run in same SQL): `SELECT count(*) FROM legal_reference` must equal `(SELECT count(*) FROM bn_legal_reference_backup)` (raise exception if not).
- Mapping integrity: no orphan rows (FK `ON DELETE RESTRICT` on `legal_reference_id`).
- Rollback: a companion `-- ROLLBACK` comment block in the migration documents the inverse (drop view, recreate table from `legal_reference`, drop new tables).

## File-by-file plan

```text
supabase/migrations/<ts>_legal_reference_shared.sql       NEW
src/services/legal-reference/types.ts                     NEW
src/services/legal-reference/legalReferenceService.ts     NEW
src/services/legal-reference/moduleMappingService.ts      NEW
src/hooks/legal-reference/useLegalReferences.ts           NEW
src/hooks/legal-reference/useEntityLegalReferences.ts     NEW
src/components/legal-reference/LegalReferenceSelector.tsx NEW
src/components/legal-reference/LegalReferenceSearchDialog NEW
src/components/legal-reference/LegalReferenceDetail.tsx   NEW
src/components/legal-reference/EntityLegalReferenceManager NEW
src/pages/legal/admin/LegalReferenceLibrary.tsx           NEW

src/services/bn/legalReferenceService.ts                  shim → shared
src/hooks/bn/useLegalReferences.ts                        shim → shared
src/components/bn/selectors/LegalReferenceSelector.tsx    shim → shared
src/pages/bn/config/country/CountryLegalRefs.tsx          use shared hooks
src/components/bn/validation/CountryLegalValidationCard   table rename
src/components/bn/templates/TemplatePreview.tsx           table rename
src/lib/bn/templateTokens.ts                              table rename
src/services/bn/governance/countryPackageService.ts       table rename
src/services/bn/countryPackService.ts                     table rename
src/services/bn/countryMasterService.ts                   table rename

src/components/routing/AppRoutes.tsx                      + legal ref route
src/components/sidebar/menuItems/legalMenuItems.ts        + submenu entry
src/pages/legal/LgCaseDetail.tsx                          + Legal Refs tab
```

## Acceptance

- `legal_reference` and `module_legal_reference_mapping` exist; 14 rows migrated; IDs preserved.
- `bn_legal_reference` survives only as a deprecated view for one release (no direct writes from new code).
- Benefits Country Pack and templates work unchanged; selectors still resolve refs.
- Legal Admin has a "Legal References" page; Legal Case Detail can attach/detach references.
- TypeScript build passes.

---

**Question before I build:** OK to keep `bn_legal_reference` as a **deprecated view** for one release (safer), or do you want it fully dropped now (riskier, requires touching every BN import in this single change)? i think you can keep it , but i would like to use the other core 