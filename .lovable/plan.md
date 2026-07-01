# Legal Templates → Core Template consolidation ✅ COMPLETE (2026-07-01)

**Status:** Consolidation complete and verified. Legal Template Management
shows only Core (module=LEGAL) templates; Core Template Admin lists all 68
migrated Legal templates; `/legal/notices` and workflow-triggered generation
resolve exclusively through `coreTemplateResolverService`. Grep-verified:
zero runtime reads remain on `legal_templates` or on
`notification_templates WHERE category='legal'` (only deprecation comments
and the audit doc reference the names). Legacy tables kept read-only for
one release cycle per the retirement gate in
`docs/legal/lg-template-cutover-comparison.md`. Build/typecheck clean.

---


## Current state (from exploration + DB counts)

Three parallel stores exist today:

| Store | Rows | Role today |
|---|---:|---|
| `legal_templates` (Legal-only, raw HTML, no versioning) | 15 | Legacy seed, referenced by string type in `module_legal_reference_mapping`. Not bridged to Core. |
| `notification_templates` where `category='legal'` | 9 | **Runtime path** — `NoticeGeneration` (`/legal/notices`) reads from here via `lgTemplateService`. |
| `core_template` where `module_code='LEGAL'` | 66 (61 active) | Target store. `LegalTemplateManagement` already writes here. `lg_stage_template_mapping` (42 rows) points to it. `core_template_token` already has 19 LEGAL tokens. |

The admin UI is already Core-backed; the **runtime notice path is not**. Two stores hold Legal content that must move.

## Guiding rule

Core stores template content. Legal stores only *which template to use when*. After cut-over, `legal_templates` and Legal rows in `notification_templates` are deprecated, and every runtime path resolves through `core_template` + `lg_stage_template_mapping` + `coreTemplateResolverService`.

## Phases

### Phase 1 — Data migration (non-destructive)

Migration `legal_templates_to_core_migration.sql`:

1. For each row in `legal_templates` not already present in `core_template` (matched by normalized code from `type`), insert:
   - `core_template` with `module_code='LEGAL'`, `template_category='LEGAL'`, `template_type` derived from `type` (LETTER / NOTICE / SUMMONS / ORDER), `status='ACTIVE'`, `source_system='COMPLIANCE_LEGACY'`, `source_ref_id = legal_templates.id`.
   - `core_template_version` with `version_no=1`, `status='PUBLISHED'`, `body_html = legal_templates.content`, `published_at/by` copied.
   - Point `core_template.active_version_id` at the new version.
2. For each row in `notification_templates` where `category='legal'` and not yet in `core_template` (matched by `name`/`code`), insert equivalent `core_template` + `core_template_version` (channel = EMAIL/NOTIFICATION as appropriate).
3. Repoint `module_legal_reference_mapping` entries that reference legacy `legal_templates.type` strings to the new `core_template.id`.
4. Repoint existing `lg_notice.template_ref_id` values that match a legacy `legal_templates.id` to the corresponding `core_template.id`.
5. For each legal event code that is not yet in `lg_stage_template_mapping`, insert a default mapping row pointing to the migrated Core template (event → template, `is_active=true`, `country_code='KN'`, `case_type_code='ANY'`).
6. Mark migrated `legal_templates` rows `is_active=false` and stamp `description` with `[MIGRATED_TO_CORE:<core_template_id>]`. Same for the 9 `notification_templates` legal rows via a `deprecated_at` column already present, or via `is_active=false`.

No table drops in this phase — legacy tables remain readable during cut-over verification.

### Phase 2 — Runtime path swap

- `src/services/legal/lgTemplateService.ts`: replace the `notification_templates` query with a call to `coreTemplateResolverService.resolve({ moduleCode: 'LEGAL', code | event_code | stage_code })`, then load the published `core_template_version` body.
- `src/pages/legal/NoticeGeneration.tsx`: use the new resolver; use `legalTemplateContextService.buildContext()` (already rich) for tokens; render via the central token resolver used by `coreDocumentGenerationService`.
- `useLegalTemplates()` hook: return Core templates filtered by module=LEGAL, joined to the mapping table so the UI shows which event/stage/channel each one is bound to.

### Phase 3 — Legal Template Management screen

`src/pages/legal/LegalTemplateManagement.tsx` (already wraps `CoreTemplateManagement fixedModuleCode="LEGAL"`) gets a single toolbar:

- **Create Core Legal Template** → opens Core editor pre-filled with `module=LEGAL`, `category=LEGAL`.
- **Assign Template to Event** → opens the existing `LegalStageTemplateMapping` dialog, pre-filled with the selected template.
- **Preview** / **Edit Core Template** / **Deactivate Mapping** — all route into existing Core screens; no duplicate "New Template" button.
- Read-only enforcement via `useLegalReadOnly` — hides the four action buttons for `LEGAL_READ_ONLY`.

`LegalTemplateEditor` already writes to `core_template` / `core_template_version` — verified, no change needed beyond hiding save actions for read-only users and ensuring `coreTemplateApprovalService` is used for SUBMIT / APPROVE / PUBLISH transitions.

### Phase 4 — Token audit

Compare the 23-namespace context built by `legalTemplateContextService` against the 19 existing `core_template_token` LEGAL rows. Insert any missing tokens (`case_number`, `hearing_date`, `court_name`, `officer_name`, `party_name`, `decision_summary`, etc.) with `module_code='LEGAL'`, `token_group='LEGAL'`, `resolver_service='legalTemplateContextService'`.

### Phase 5 — Verification & documentation

- `docs/legal/lg-template-cutover-comparison.md`: side-by-side of legacy vs core rows, event-mapping coverage, and a checklist to confirm every legacy template has a Core equivalent and every legal event has a mapping row.
- `/legal/admin/policy` and `legal_templates` legacy screen stay read-only (same pattern as the workflow-policy cut-over) until the comparison is signed off.
- Build + typecheck.

## Files that will change

Created:
- `supabase/migrations/<ts>_legal_templates_to_core_migration.sql`
- `docs/legal/lg-template-cutover-comparison.md`

Edited:
- `src/services/legal/lgTemplateService.ts`
- `src/pages/legal/NoticeGeneration.tsx`
- `src/pages/legal/LegalTemplateManagement.tsx` (toolbar + read-only)
- `src/pages/legal/admin/LegalTemplateEditor.tsx` (approval wiring + read-only)

Not touched (kept read-only during cut-over):
- `legal_templates` table
- `notification_templates` legal rows
- `/legal/admin/policy` page

## Pending business confirmations

1. **Channel defaults for the 15 legacy `legal_templates`** — should each migrate as `LETTER` only, or also seed a `PDF` channel variant? Default recommendation: `LETTER` + `PDF`, no `EMAIL` unless the source row was already email-tagged.
2. **Approval state on migration** — publish migrated templates directly (`ACTIVE` + `PUBLISHED v1`) or land them as `DRAFT` awaiting Legal Admin review? Default recommendation: publish, since the legacy rows are already `status='PUBLISHED'`.
3. **Legacy screen retirement date** — leave `legal_templates` read-only for how long after cut-over? (mirrors the `lg_workflow_policy` cadence).

I'll implement Phases 1–5 in order once you confirm — or answer #1–#3 and I'll roll them into the migration on the first pass.
