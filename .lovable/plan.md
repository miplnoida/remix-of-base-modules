

## Configurable Document Template Settings for Internal Audit Module

### What We're Building

A new settings page at **Internal Audit → Settings → Document Templates** (`/audit/document-templates`) where admins can configure the layout, sections, branding, columns, signatories, and draft/final rules for two document types: **Audit Report** and **Internal Audit Plan**. The report preview and PDF export will read these settings at render time instead of using hardcoded values.

### Current State

- `AuditReportPreview.tsx` (460 lines) and `AuditReportPDFExport.ts` (360 lines) have all layout decisions hardcoded — section order, cover fields, signature labels, watermark rules, column lists
- `AuditReportBuilderStudio.tsx` has a hardcoded `ALL_SECTIONS` array controlling which sections appear
- No Internal Audit Plan PDF export exists yet
- Settings are stored in `ia_audit_settings` table (category/key/value pattern) with existing CRUD hooks

### Database

**New table: `ia_document_template_settings`** — one row per template type, storing the full config as JSONB.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `template_type` | TEXT UNIQUE | `'audit_report'` or `'audit_plan'` |
| `config_json` | JSONB | Full template configuration |
| `updated_by` | TEXT | User code |
| `updated_at` | TIMESTAMPTZ | |

Using a dedicated JSONB column (instead of many key/value rows) keeps the config atomic and avoids dozens of individual settings rows. The JSON schema is defined by TypeScript interfaces in the defaults file.

No RLS per project rules. Migration seeds both rows with sensible defaults matching current hardcoded values.

### TypeScript Interfaces & Defaults

**`src/lib/audit/documentTemplateDefaults.ts`** — defines:

```text
AuditReportTemplateConfig {
  branding: { showLogo, logoSource, orgName, country, address, phone }
  coverPage: { reportTitle, showSubtitle, subtitleText, showAuditPeriod, 
               confidentialityText, fieldOrder: string[] }
  sections: { id, label, enabled, order }[]
  findingsLayout: { showManagementResponseAfterRecommendation, 
                    detailedFindingFields: string[] }
  riskDistribution: { enabled }
  actionPlanSummary: { visibility: 'hidden'|'draft_only'|'final_only'|'always',
                       columns: { key, label, enabled }[] }
  signOff: { signatories: { label, defaultName, roleTitle }[] }
  draftRules: { showWatermark, watermarkText }
  finalRules: { showIssuedStamp }
}

AuditPlanTemplateConfig {
  coverPage: { titleText, showDepartmentLine, fiscalYearMode: 'single'|'range' }
  planSummary: { titleOverride, splitByType, sections: { key, label, enabled }[],
                 hideExactDates }
  columnsBySection: Record<string, { key, label, enabled }[]>
  resourcePlan: { metricOrder: string[], showTotalStaffFirst, 
                  showPercentages, dayTypes: string[] }
  riskCoverage: { enabled }
  governance: { showBoardLine, showApprovedByBlock,
                preparedByLabel, approvedByLabel }
}
```

Each type gets an exported `DEFAULT_AUDIT_REPORT_CONFIG` and `DEFAULT_AUDIT_PLAN_CONFIG` matching the current hardcoded behavior, so the system works identically until an admin changes something.

### Hook

**`src/hooks/useAuditDocumentTemplates.ts`**
- `useAuditDocumentTemplate(templateType)` — fetches from `ia_document_template_settings`, falls back to defaults
- `useAuditDocumentTemplateMutation()` — upserts config_json by template_type

### Settings UI

**`src/pages/audit/DocumentTemplateSettings.tsx`** — new page with two tabs: "Audit Report" and "Internal Audit Plan".

Each tab renders a form-driven editor organized into collapsible cards:

**Audit Report tab** (`src/components/audit/templates/AuditReportTemplateEditor.tsx`):
- **Branding** — toggles for logo, org name input
- **Cover Page** — title input, subtitle toggle + text, audit period toggle, draggable field order
- **Sections** — sortable list with enable/disable toggles per section
- **Findings Layout** — toggle for management response placement, field checklist
- **Risk Distribution** — show/hide toggle
- **Action Plan Summary** — 4-way select (hidden/draft/final/always), column checkboxes
- **Sign-off** — editable list of signatories (label, name, role title)
- **Draft/Final Rules** — watermark toggle + text, issued stamp toggle

**Internal Audit Plan tab** (`src/components/audit/templates/AuditPlanTemplateEditor.tsx`):
- **Cover Page** — title text, department line toggle, fiscal year mode select
- **Plan Summary** — title override, split-by-type toggle, section enables, hide dates toggle
- **Columns** — per-section column configurator
- **Resource Plan** — metric order, percentage toggles, day type list
- **Risk & Governance** — coverage toggle, board line, approved-by block, role label inputs

**`src/components/audit/templates/TemplatePreviewPane.tsx`** — right-side panel showing a miniature live preview of the document with current settings applied. Uses the same rendering logic as the report preview but in a scaled-down iframe/div.

### Wiring to Output

**`src/lib/audit/documentTemplateResolver.ts`** — utility that takes raw report data + template config and returns a resolved structure (ordered sections, filtered columns, resolved signatories, visibility flags). Both the preview component and PDF export call this resolver.

**Modify `AuditReportPreview.tsx`**:
- Accept an optional `templateConfig` prop (defaults loaded from hook)
- Replace hardcoded section ordering, cover text, signature labels, action plan visibility, and watermark rules with resolver output
- Section rendering loop iterates `resolvedSections` instead of hardcoded if/else blocks

**Modify `AuditReportPDFExport.ts`**:
- Accept `templateConfig` parameter
- Use resolver for section order, cover fields, signature labels, column lists, watermark text, action plan visibility logic

### Route & Navigation

- Add route `/audit/document-templates` in `AppRoutes.tsx` with `AuditFeatureGate featureFlag="FEATURE_AUDIT_SYSTEM_CONFIG"`
- Add entry in `auditRouteConfig.ts` under Settings category
- Add menu item in `auditMenuItems.ts` under Settings group: "Document Templates" with `FileText` icon

### Files to Create

| File | Responsibility |
|------|---------------|
| `supabase/migrations/...` | Create `ia_document_template_settings` table + seed defaults |
| `src/lib/audit/documentTemplateDefaults.ts` | TypeScript interfaces + default configs |
| `src/lib/audit/documentTemplateResolver.ts` | Merge config + data → resolved output structure |
| `src/hooks/useAuditDocumentTemplates.ts` | Fetch/upsert hook |
| `src/pages/audit/DocumentTemplateSettings.tsx` | Settings page shell with tabs |
| `src/components/audit/templates/AuditReportTemplateEditor.tsx` | Report template form |
| `src/components/audit/templates/AuditPlanTemplateEditor.tsx` | Plan template form |
| `src/components/audit/templates/TemplatePreviewPane.tsx` | Live mini-preview |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/routing/AppRoutes.tsx` | Add `/audit/document-templates` route |
| `src/config/auditRouteConfig.ts` | Add route entry |
| `src/components/sidebar/menuItems/auditMenuItems.ts` | Add "Document Templates" menu item |
| `src/components/audit/reports/AuditReportPreview.tsx` | Use resolver instead of hardcoded layout |
| `src/components/audit/reports/AuditReportPDFExport.ts` | Use resolver instead of hardcoded layout |
| `src/components/audit/reports/AuditReportBuilderStudio.tsx` | Load section list from template config |

### What Stays Unchanged

- No changes to non-audit modules, global shell, or shared components
- No breaking API changes
- Existing report output is identical until an admin modifies template settings (defaults match current hardcoded values exactly)

