# Report Templates (Compliance Report Templates)

> **Module 28** · Section G — Communication & Reports

| Field | Value |
|---|---|
| Route | `/compliance/admin/report-templates` |
| Page component | `src/pages/compliance/admin/ComplianceReportTemplates.tsx` (469 lines) |
| Mode | `defaultTab="templates"`, `foundationFocused=false`. Same component renders Module 29 with different props. |
| Hooks | `src/hooks/useComplianceDocumentTemplates.ts` |
| Primary tables | `ce_document_template_sections`, `ce_document_template_settings` |
| Library / cross-ref tables | `ce_document_section_library`, `ce_audit_communication_templates` |
| Banner | `<AdminAreaBanner area="report" />` |

---

## 1. Purpose

Configures the **structure and per-template settings** for every
employer-audit document type — Audit Report, Findings Memo, Evidence
Summary, Violation Notice, Enforcement Pack, Management Summary. The
module is intentionally separate from Internal Audit (`ia_*`) document
templates: only the `ce_*` tables are read or written here.

The screen is the document-side counterpart of Module 26: a
communication template *attaches* a report (via
`linked_report_template_type`), but the report's content blueprint is
maintained here.

---

## 2. Layout

Tabs (driven by `defaultTab` prop):

1. **Report Templates** (only when `foundationFocused=false`)
   - Left rail: list of `CE_TEMPLATE_TYPES` (6 entries hard-coded in
     the hooks file). Selecting one drives the right-hand
     `TemplateEditor`.
   - Right pane: `TemplateEditor`.
2. **Section Library** — read-only catalogue of reusable sections.
3. **Foundation** — branding & pagination defaults shared across
   reports.

### 2.1 `TemplateEditor` (lines 125-232)

For the active `templateType`:

- **Header card** — type label + description from `CE_TEMPLATE_TYPES`.
- **`UsedByCommunications`** (lines 234-280) — calls
  `auditCommunicationTemplateService.listLinkedToReport(reportType)`
  and renders chips of comm templates pointing at this report
  (template name, code, lifecycle stage). Read-only — linkages are
  managed from the Communication Template Editor's Content tab.
- **`RecommendedLibrarySections`** (lines 427-468) — surfaces library
  rows whose `applies_to` includes this report type but whose
  `section_key` is not yet in the template's section list. Pure hint;
  does not mutate.
- **Sections card** — driven by `useComplianceTemplateSections`. Each
  row has three switches calling `useUpdateComplianceTemplateSection`:
  - `include_in_toc`
  - `start_on_new_page`
  - `is_enabled` (disabled when `is_required = true`)
  No reorder UI; ordering is by `sort_order` (DB-managed).
- **Template Settings card** — free-form `config_json` editor for
  per-type knobs (e.g. paper size, watermark). Pre-fills the textarea
  with `JSON.stringify(settings.config_json)`. Save calls
  `updateSettings.mutate(parsedJson)`. Invalid JSON is silently
  swallowed (toast handled inside the hook on success/error paths
  only).

### 2.2 `SectionLibraryTab` (lines 282-363)

Read-only browse of `ce_document_section_library`:

- Pill bar filter on `lifecycle_tags` (the 10 lifecycle stages from
  `COMM_LIFECYCLE_STAGE_ORDER`); "All stages" reset.
- Per-row: label, `is_mandatory` chip, `category` chip, lifecycle tag
  chips, optional description, and the list of report types in
  `applies_to` (each rendered as a chip with the friendly type label).

### 2.3 `FoundationTab` (lines 365-420)

Edits `ce_org_document_foundation` (one row, key `default`) via
`useComplianceFoundation`. Today only two fields are surfaced:
`branding.organization_name` and `pagination.footer_text`. The save
button merges the patch into the existing JSON object and persists.

> Branding rule from project memory (`mem://design/document-branding`):
> all generated documents must include Misha Infotech branding on the
> cover page. The Foundation tab is where that organisation name lives.

---

## 3. Hook layer (`useComplianceDocumentTemplates.ts`)

| Hook | Purpose |
|---|---|
| `useComplianceFoundation` | One-row read+update on `ce_org_document_foundation` (`foundation_key='default'`). |
| `useComplianceSectionLibrary` | List `ce_document_section_library` ordered by `default_order`. |
| `useComplianceTemplates` | List `ce_document_templates` (not currently used by this page; reserved for future "saved customisations" UI). |
| `useComplianceTemplateSections(templateType)` | List sections for one type, ordered by `sort_order`. |
| `useUpdateComplianceTemplateSection` | Patch one row by id; invalidates the matching query. |
| `useComplianceTemplateSettings(templateType)` | Read+update `ce_document_template_settings.config_json` for the type. |

`CE_TEMPLATE_TYPES` (the 6-row table-of-types) is also exported here
and is the **only** source of truth for template-type strings. Any new
report type requires a code change.

All mutations success-toast with `sonner`; errors fall back to a
generic message so downstream callers never see raw Postgres errors.

---

## 4. Data sources & writes

| Action | Table | Write |
|---|---|---|
| Toggle TOC / new page / enabled | `ce_document_template_sections` | `update` by id |
| Save settings JSON | `ce_document_template_settings` | `update` where `template_type = …` |
| Save foundation | `ce_org_document_foundation` | `update` where `foundation_key='default'` |
| List linked comms | `ce_audit_communication_templates` | `select` by `linked_report_template_type` |

No inserts/deletes happen on this page. Section rows and settings rows
are seeded by migrations (one row per `(template_type, section_key)`
and one settings row per `template_type`).

---

## 5. Cross-references

- Module 27 (Communication Template Editor) writes
  `linked_report_template_type` — the inverse of the "Used by
  Communications" card here.
- Module 29 (Shared Sections & Foundation) is the *same component*
  rendered with `foundationFocused={true}` so that the Foundation tab
  owns its own admin URL while the Templates tab stays out of the way.
- Internal Audit document templates (`ia_*`) are intentionally **not**
  shared with this module; the separation is enforced by hard-coding
  the `ce_…` table names inside the hooks.

---

## 6. Findings & risks

1. **No section reorder UI.** `sort_order` is editable in the DB only.
   Acceptable because the seed migration sets a sensible order, but a
   future UX iteration should expose drag-handles.
2. **Settings JSON editor swallows parse errors silently.** A
   malformed JSON click on Save is a no-op without user feedback. The
   hook only toasts on a successful PostgREST update or its error.
   Adding an inline JSON-parse error badge would be a small win.
3. **Foundation tab uses `defaultValue` + `onChange`** (not controlled
   `value`). Switching the underlying record from elsewhere will not
   refresh the inputs until the page remounts. Consider migrating to a
   controlled pattern keyed on `data?.id` if multi-org support is
   added.
4. **`useComplianceTemplates` is unused.** Either wire it (custom
   per-tenant template overrides) or remove it to avoid drift.
5. **Hard-coded type list.** Adding a 7th report type today requires
   editing both `CETemplateType` and `CE_TEMPLATE_TYPES`, plus
   shipping a seed migration for the new sections/settings rows.
   Acceptable while the count is small, but should become DB-driven if
   the catalogue grows.
6. **Recommended sections are read-only hints.** There is no
   single-click "Add to template" affordance. Officers must coordinate
   with whoever maintains the seed migration. Worth promoting if usage
   grows.

---

_Last updated: see git history of this file._
