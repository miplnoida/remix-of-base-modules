
## Current state (verified)

End-to-end wiring already exists — the gaps are seed data, snapshot completeness, immutability, and validation surfacing.

- ✅ `core_department` has `LEGAL` (id present)
- ✅ `core_department_profile` row for module/department `LEGAL` exists with letterhead, signature, disclaimer, footer assets bound
- ⚠ `app_modules` has **no top-level row** named `LEGAL` / `Legal` (only child rows like `classic_ce_legal_*`). A canonical `LEGAL` module row is missing.
- ⚠ `core_module_profile` has **no row** with `module_code = 'LEGAL'` pointing at the Legal Department.
- ✅ `core_template_category` has 6 LEGAL categories: `LG_NOTICE`, `LG_PRELEGAL`, `GENERAL_LEGAL_CORRESPONDENCE`, `LEGAL_ACTION_REQUISITION`, `LEGAL_OPINION`, `INTERNAL_LEGAL_NOTE`. Missing the requested doc-type categories: `HEARING_NOTICE`, `DEMAND_NOTICE`, `DECISION_NOTICE`, `SUMMONS_TO_APPEAR`, `WARRANT_OF_COMMITMENT`.
- ✅ 6 published `core_template` rows under `LG_NOTICE` / `LG_PRELEGAL`. **No templates exist for any of the 6 requested codes** (HEARING_NOTICE etc.).
- ✅ `GenerateTemplateDialog` and `IssueNoticeDialog` both render via shared `LegalDocumentRenderer` (enterprise context resolver), both persist via `coreTemplateDispatcherService` → `core_generated_document`, both pass `legal_link.lg_case_id` so `coreDmsService.uploadGenerated` creates the `lg_document_link` row.
- ✅ `LegalCaseDocumentsTab` / `GeneratedLettersHistoryPanel` / `AvailableLettersPanel` read from `core_generated_document` + `lg_document_link` — Document Center shows them.
- ⚠ Dispatcher writes `resolved_tokens` but does **not** persist resolved asset IDs (letterhead/signature/seal/watermark/footer/disclaimer) or a typed `resolved_context` snapshot for audit.
- ⚠ `LegalDocumentRenderer` always renders DRAFT only when `draft` prop is true (correct), but generated/issued documents have no "issued, immutable" lock — there is no status transition guard and `core_generated_document` rows can still be UPDATE'd.
- ⚠ Preview crashes are unlikely (uses optional chaining) but there is **no explicit warning** in the renderer when letterhead/signature/seal/disclaimer is missing — currently silently substitutes muted placeholder text.
- ⚠ `UsageValidationPage` has scope `"Legal"` typed but no Legal-specific issue checks are emitted.

## Schema changes (one migration)

Add audit/snapshot + immutability columns to `core_generated_document`:

```sql
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS resolved_context        jsonb,
  ADD COLUMN IF NOT EXISTS resolved_letterhead_id  uuid,
  ADD COLUMN IF NOT EXISTS resolved_signature_id   uuid,
  ADD COLUMN IF NOT EXISTS resolved_seal_asset_id  uuid,
  ADD COLUMN IF NOT EXISTS resolved_watermark_asset_id uuid,
  ADD COLUMN IF NOT EXISTS resolved_footer_id      uuid,
  ADD COLUMN IF NOT EXISTS resolved_disclaimer_id  uuid,
  ADD COLUMN IF NOT EXISTS issued_at               timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by               text,
  ADD COLUMN IF NOT EXISTS is_immutable            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS superseded_by_id        uuid REFERENCES public.core_generated_document(id);
```

Add a BEFORE UPDATE trigger that blocks edits to `generated_html`, `resolved_*`, `template_version_id`, `subject` once `is_immutable = true`, except for `delivery_status` / `delivered_at` / `dms_*` / `sync_*` columns (which must remain writable for delivery pipelines). Versioning is done by inserting a new row and setting `superseded_by_id` on the old one.

## Seed data (data inserts, not migration)

1. Insert `LEGAL` row in `app_modules` (name `LEGAL`, display `Legal`, route `/legal`, `show_in_menu = true`, `owner_department_id` = Legal dept id) — guarded with `ON CONFLICT (name) DO NOTHING`.
2. Insert `core_module_profile` row `module_code = 'LEGAL'`, `owner_department_id = <Legal dept id>`.
3. Insert the 5 missing `core_template_category` rows: `HEARING_NOTICE`, `DEMAND_NOTICE`, `DECISION_NOTICE`, `SUMMONS_TO_APPEAR`, `WARRANT_OF_COMMITMENT` (module_code = `LEGAL`). The existing `LEGAL_ACTION_REQUISITION` is reused.
4. Insert 6 published `core_template` rows (one per category) with sensible body HTML using `{{org.*}}`, `{{department.*}}`, `{{location.*}}`, `{{case.*}}`, `{{party.*}}`, `{{hearing.*}}`, `{{order.*}}`, `{{legal_reference.*}}` tokens. Each gets a published `core_template_version` (`is_active = true`, `status = 'PUBLISHED'`).

All seed rows tagged with `created_by = 'SEED-LEGAL-v1'`.

## Code changes

**`src/services/coreTemplateDispatcherService.ts`**
- After `resolveEnterpriseContext`, capture resolved asset IDs from `ctx.assets` and persist:
  `resolved_context` (org/department/location/profile codes + asset urls trimmed),
  `resolved_letterhead_id`, `resolved_signature_id`, `resolved_seal_asset_id`,
  `resolved_watermark_asset_id`, `resolved_footer_id`, `resolved_disclaimer_id`.
- Treat `channel_code === 'PDF'` issuance as final: set `status = 'ISSUED'`, `is_immutable = true`, `issued_at`, `issued_by`. Preview path (new `previewOnly: true` flag on `DispatchInput`) does not write at all — preview is rendered client-side by `LegalDocumentRenderer` already, so dispatcher is invoked only on Generate/Issue.

**`src/components/legal/LegalDocumentRenderer.tsx`**
- Add `missing[]` derivation: list any of `letterhead`, `signature`, `seal`, `disclaimer`, `footer` that the resolved context lacks. When `draft`, render a yellow `<Alert>` above the document listing missing slots; suppress in non-draft.
- Render DRAFT watermark only when `draft === true` (already correct — keep, document with comment that issued PDFs must pass `draft={false}`).
- Wrap all `dangerouslySetInnerHTML` blocks with try/catch via a small `SafeHtml` helper that catches render-time errors and renders a muted placeholder — prevents preview crash if a token expansion produces malformed HTML.

**`src/components/legal/GenerateTemplateDialog.tsx`** and **`IssueNoticeDialog.tsx`**
- Replace the raw `<Select>` for Document Type and Template with the existing `SearchableSelect` component (per project rule). Same data sources.
- After successful generation, surface returned `reference_no` and link to Document Center tab.

**`src/pages/admin/organization/UsageValidationPage.tsx`**
- Add a `Legal readiness` check block emitting issues when:
  - `LEGAL` row missing in `app_modules`
  - No `core_module_profile.module_code='LEGAL'`
  - No `core_department_profile` with `department_code='LEGAL'`
  - Department profile missing any of: `default_letterhead_id`, `default_email_signature_id`, `default_disclaimer_id`, `default_print_footer_id`
  - Any of the 6 required categories missing (`HEARING_NOTICE`, `DEMAND_NOTICE`, `DECISION_NOTICE`, `SUMMONS_TO_APPEAR`, `WARRANT_OF_COMMITMENT`, `LEGAL_ACTION_REQUISITION`)
  - Any required category has zero `status='PUBLISHED'` templates
- Each issue links to the right admin page (`/admin/organization/departments`, `/admin/templates`, etc.).

## Acceptance flow

1. Run migration → schema columns + immutability trigger live.
2. Run seed insert → `LEGAL` module/profile/categories/templates present.
3. Admin edits Legal Department Profile letterhead/signature → next Generate preview reflects new asset (resolver is uncached per query).
4. Generate a `HEARING_NOTICE` from a case → row in `core_generated_document` with `is_immutable=true`, `resolved_letterhead_id` etc. populated; `lg_document_link` row created; Document Center tab lists it.
5. Attempt UPDATE on `generated_html` of an issued row → trigger rejects.
6. Preview of a template where Disclaimer is missing → yellow warning lists `disclaimer`; no crash.
7. Visit `/admin/organization/usage-validation` → if any of the seed pieces are removed, the Legal section reports them.
8. Build passes (`tsgo`).

## Out of scope

- Physical PDF rendering / DMS file body (already handled by `coreDmsService`).
- Real letterhead / signature design upload (admin task).
- Role-based access to issue vs. draft (existing `LegalRouteGuard` already gates).
