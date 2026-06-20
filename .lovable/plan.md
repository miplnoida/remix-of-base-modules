
# Legal Reference Versioning — Enterprise Refactor Plan

This is a large structural change. Splitting it into 4 sequenced migrations + service/UI updates so each step is reviewable and reversible.

## Scope reminder
Canonical going forward:
- `core_legal_reference` (master record only)
- `core_legal_reference_version` (NEW — versioned regulatory content)
- `core_module_legal_reference` (module/entity mapping)
- `core_template_legal_reference` (template ↔ ref/version link)
- `core_generated_document_legal_reference` (NEW — immutable per-document snapshot)

Legacy `bn_legal_reference` / `bn_country_legal_ref` already replaced by views; no new runtime writes are introduced here.

---

## Migration 1 — Schema split (master vs version)

1. Create `core_legal_reference_version` per spec (all version fields, status enum, supersedes link, audit cols).
2. Add `current_version_id`, `parent_reference_id` to `core_legal_reference`; demote version-specific fields to be sourced from `current_version_id` (kept on master temporarily as denormalized cache for backward compat, populated by trigger).
3. Constraints:
   - UNIQUE `(legal_reference_id, version_number)`
   - UNIQUE `(legal_reference_id, effective_from)`
   - CHECK `effective_to IS NULL OR effective_to > effective_from`
   - Exclusion-style trigger preventing overlapping PUBLISHED effective ranges per `legal_reference_id`.
4. GRANTs for `authenticated` + `service_role`; RLS stays off (project standard).

## Migration 2 — Data migration v1

For each existing `core_legal_reference` row, insert a `v1` `core_legal_reference_version` row mapping:
- section, subsection, regulation, citation_text, full_reference_text, summary, source_url, gazette_number, effective_from/to
- status → version_status (ACTIVE→PUBLISHED, DRAFT→DRAFT, SUPERSEDED→SUPERSEDED, REPEALED→ARCHIVED)
- published_at = updated_at when PUBLISHED
- supersedes_version_id from existing `supersedes_id` master link (resolved to that master's current_version_id)

Set master `current_version_id` to the v1 published row (or latest non-archived).

## Migration 3 — Immutability + lifecycle triggers

- Trigger `trg_core_legal_ref_version_immutable`:
  - On UPDATE: if OLD.version_status = 'PUBLISHED', allow change only to `effective_to`, `version_status` (→ SUPERSEDED/ARCHIVED), `updated_by`, `updated_at`.
  - On DELETE: block when OLD.version_status IN ('PUBLISHED','SUPERSEDED','ARCHIVED').
- Trigger `trg_core_legal_ref_version_sync_master`: after a version becomes PUBLISHED, update master `current_version_id`, `status`='ACTIVE', and refresh denormalized fields.
- Helper SQL functions (SECURITY DEFINER):
  - `core_legal_ref_create_version(master_id, payload)` — clones from current draft if any
  - `core_legal_ref_submit(version_id, user_code)`
  - `core_legal_ref_approve(version_id, user_code)`
  - `core_legal_ref_publish(version_id, user_code)` — sets effective dates, supersedes prior, writes audit
  - `core_legal_ref_supersede(version_id, by_version_id, user_code)`
  - `core_legal_ref_archive(version_id, user_code)`
  - `get_active_legal_reference_version(ref_code, country_code, as_of_date)` returns version row

All lifecycle functions write to `legal_admin_audit` (existing table) with old/new JSONB.

## Migration 4 — Generated document snapshots + template version pinning

- Create `core_generated_document_legal_reference` per spec (immutable snapshot: ref_code, citation_snapshot, full_reference_snapshot, effective_from/to_snapshot).
- Add `legal_reference_version_id` to `core_template_legal_reference` (already has `legal_reference_id`).
- Backfill: for any existing `core_generated_document.legal_references_snapshot` JSONB, expand into rows of the new snapshot table (best-effort; keep JSONB column as legacy).
- Trigger blocking UPDATE/DELETE on snapshot rows (write-once).
- Add `core_module_legal_reference.legal_reference_version_id` column (nullable).

---

## Service layer

- `src/services/legal-reference/legalReferenceService.ts`
  - `listMasters({countryCode, moduleCode})`, `getMaster(id)`, `listVersions(masterId)`, `getActiveVersion(refCode, countryCode, asOfDate)`, `compareVersions(aId, bId)`.
- `src/services/legal-reference/versionLifecycleService.ts` (NEW) — wraps lifecycle RPCs.
- `src/services/legal-reference/impactAnalysisService.ts` (NEW) — counts/lists: templates, cases (`lg_case`), notices (`lg_notice`), products (`bn_product`), rules, generated docs using the version/master.
- `src/services/coreDocumentGenerationService.ts` — when generating a document, resolve active version per linked legal reference, insert snapshot rows in `core_generated_document_legal_reference` (replaces JSONB column as source of truth).
- `src/services/coreTemplateLegalRefService.ts` — when template version is published, freeze `legal_reference_version_id` for each link.

## UI

- `src/pages/legal/admin/LegalReferenceLibrary.tsx`
  - Master list (status pill, current version, country).
  - Detail drawer with tabs: **Current**, **Version history**, **Compare**, **Impact**, **Linked entities**.
  - Lifecycle action buttons gated by `version_status`.
- `src/components/legal-reference/VersionEditor.tsx` (NEW) — read-only when PUBLISHED.
- `src/components/legal-reference/VersionDiff.tsx` (NEW) — field-by-field diff.
- `src/components/legal-reference/ImpactAnalysisPanel.tsx` (NEW).
- `src/components/legal-reference/LegalReferenceSelector.tsx` — show active version label + supersession warning.
- `src/components/templates/CoreTemplateManagement.tsx` — warn when linked reference has no PUBLISHED version or is SUPERSEDED.

## Validation report

Add `src/services/legal-reference/verificationReport.ts` + admin page `src/pages/legal/admin/LegalReferenceVerification.tsx` producing the counts listed in spec §14.

## TypeScript / build

After migrations are approved, regenerated `src/integrations/supabase/types.ts` will surface the new tables; service code will be updated to match. Final `tsc --noEmit` via build pipeline.

---

## Execution order

1. Migration 1 (schema) → approval
2. Migration 2 (data migration) → approval
3. Migration 3 (triggers + lifecycle functions) → approval
4. Migration 4 (snapshots + template pinning) → approval
5. Service refactor + new services
6. UI: Library, VersionEditor, Diff, Impact, Selector, Template warnings
7. Verification report page
8. Audit pass + build check

Each migration is independent enough that we can pause between steps to verify data and catch issues early. Confirm and I'll start with Migration 1.
