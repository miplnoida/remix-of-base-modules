

# Redesign: Enterprise-Grade Internal Audit Reporting Suite

## Current State Assessment

The existing implementation already has a solid foundation:
- **AuditReportCenter.tsx** (401 lines) — Report type cards, stats, dashboards, recent drafts/finals, filtered report table
- **AuditReportBuilderStudio.tsx** (709 lines) — 3-panel layout (left nav, center canvas, right metadata), section toggles, auto-populate from engagement, workflow status strip
- **AuditReportPreview.tsx** (328 lines) — Full report preview with cover, TOC, sections, findings, signatures, draft watermark, SSB branding
- **AuditFindingCard.tsx** (146 lines) — Color-coded risk cards with criteria/condition/cause/effect, linked responses and actions
- **AuditReportVersionTimeline.tsx** (49 lines) — Static mock timeline
- **reportTemplate.ts** (300 lines) — SSB branded PDF/Excel generation utilities

The core architecture is sound. The redesign is about **elevating the UI polish, adding structured content editing beyond plain textareas, and creating template-specific section structures**.

## What Changes

### Phase 1: Report Center Enhancement (AuditReportCenter.tsx rewrite)

**File**: `src/components/audit/reports/AuditReportCenter.tsx`

Improvements:
- Add a hero banner with gradient SSB branding and key action buttons
- Add **tab-based sections**: "All Reports", "By Type" (Engagement, Executive, Committee, etc.), "Dashboards"
- Add a **Quick Actions** strip: "New Engagement Report", "Generate Board Pack", "Export Findings Summary"
- Upgrade stats row with mini sparkline-style trend indicators and better card styling
- Add **department filter** and **date range filter** alongside existing search/status/type
- Add **report type badges with counts** in the type cards
- Show engagement name + department + risk rating in the report table rows
- Add bulk export action for selected reports
- Better empty states with illustration-style icons

### Phase 2: Report Builder Studio Enhancement (AuditReportBuilderStudio.tsx rewrite)

**File**: `src/components/audit/reports/AuditReportBuilderStudio.tsx`

Improvements:
- **Template Selector**: When creating new report, show a modal/step to select template type with description. Each template pre-configures which sections are enabled and their order:
  - Engagement Report: all sections
  - Executive Summary: metadata, executive_summary, risk_overview, findings (summary only), conclusion
  - Committee/Board Pack: metadata, executive_summary, risk_overview, portfolio stats, findings summary, actions summary, conclusion
  - Findings & Actions: metadata, findings, responses, actions
  - Portfolio Performance: metadata, plan coverage, engagement status summary, risk distribution, conclusion
  - Follow-up Validation: metadata, action status, validation results, conclusion
- **Structured content editing**: Replace plain textareas with guided fields where appropriate:
  - Executive Summary: textarea + "Overall Opinion" dropdown (Satisfactory/Needs Improvement/Unsatisfactory/Critical) + "Key Highlights" chips
  - Scope: textarea + period date range pickers + "Areas Covered" tag input
  - Risk Overview: auto-generated summary cards + editable narrative
  - Distribution: structured table (Name, Title, Copy Type) instead of free text
  - Approval: structured signature blocks with date pickers and role selectors
- **Sticky top bar** refinement: add breadcrumb, word count, last saved indicator, auto-save
- **Right panel enhancements**: Completeness indicator (progress bar showing % of sections filled), content stats (word count, finding count, action count)
- **Template-specific metadata**: Board Pack gets "Meeting Date", "Agenda Item #"; Executive gets "Reporting Period"

### Phase 3: Template Selector Component (new)

**File**: `src/components/audit/reports/AuditReportTemplateSelector.tsx`

A modal/dialog shown when creating a new report that presents the 6 template types as premium cards with:
- Icon, title, description
- Preview thumbnail showing section structure
- "Use Template" button
- Sets initial sections and report_type on selection

### Phase 4: Premium Finding Card Enhancement (AuditFindingCard.tsx upgrade)

**File**: `src/components/audit/reports/AuditFindingCard.tsx`

Improvements:
- Add finding number badge with sequential numbering
- Add "Impact Area" and "Status" badges in header
- Show criteria/condition/cause/effect in a structured 2x2 grid with labeled sections and subtle background
- Add recommendation in a highlighted callout box
- Show management response inline with responder details
- Show action plan items with owner, due date, status as a mini-table
- Add evidence/working paper reference links
- Better print-safe styling (no dark backgrounds, border-only risk indicators for print)

### Phase 5: Report Preview Upgrade (AuditReportPreview.tsx rewrite)

**File**: `src/components/audit/reports/AuditReportPreview.tsx`

Improvements:
- **Proper cover page**: Full-page cover with SSB logo, report title, type badge, fiscal year, department, engagement, confidentiality notice, report number, date, version — all centered with branded green/gold accents
- **Page-break simulation**: Visual page separators between major sections
- **Section dividers**: Branded green line with section number and title
- **Overall Assessment/Opinion badge**: Visual indicator (Satisfactory/Needs Improvement/Unsatisfactory) with color coding
- **Key Findings Snapshot**: Summary table before detailed findings showing finding#, title, risk, status in a compact table
- **Improved action plan table**: Better styled with alternating rows, risk-colored left border per finding
- **Signature blocks**: Formal layout with signature line, name, title, date
- **Page footer simulation**: Page numbers, confidentiality label, report number
- **Draft watermark**: Keep existing diagonal watermark with opacity 0.12 per standards
- **"Issued" stamp**: When status is Final, show a green "ISSUED" stamp with date

### Phase 6: PDF Export Enhancement (new file)

**File**: `src/components/audit/reports/AuditReportPDFExport.ts`

A dedicated multi-page PDF generator using `jsPDF` + `reportTemplate.ts` SSB branding:
- Cover page with SSB header, report metadata, confidentiality
- Table of contents with page numbers
- Section headers with green accent line
- Structured finding pages with risk-colored headers
- Action plan table
- Signature page
- Footer with page numbers and confidentiality
- Draft watermark when applicable
- Uses `SSB_BRAND` colors from `reportTemplate.ts`

### Phase 7: Executive & Committee Report Sections (new files)

**File**: `src/components/audit/reports/sections/AuditPortfolioSection.tsx`
- Plan progress summary (planned vs completed engagements)
- Risk distribution donut/bar
- Department coverage table
- Used in Committee/Board Pack and Portfolio Performance templates

**File**: `src/components/audit/reports/sections/AuditExecutiveDashboardSection.tsx`
- High-risk open findings count
- Overdue actions aging bars
- Closure performance metrics
- Repeat findings indicator
- Used in Executive Summary and Committee templates

### Phase 8: Version Timeline with Real Data

**File**: `src/components/audit/reports/AuditReportVersionTimeline.tsx`

- Query `system_audit_trail` filtered by `entity_type = 'ia_audit_reports'` and matching `entity_id`
- Show real status transitions, edits, approvals
- Fall back to mock data if no trail entries exist

### Phase 9: Report Workflow Enhancement

**File**: `src/components/audit/reports/AuditReportWorkflowBar.tsx`

A reusable workflow status bar component:
- Visual stepper: Draft → In Review → Submitted → Approved → Final/Issued
- Current step highlighted with primary color
- Completed steps with green checkmarks
- Action buttons contextual to current step
- "Revert to Draft" option for In Review reports
- Confirmation dialogs for status transitions

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| Rewrite | `src/components/audit/reports/AuditReportCenter.tsx` | Premium report center with tabs, filters, hero |
| Rewrite | `src/components/audit/reports/AuditReportBuilderStudio.tsx` | Enhanced builder with template logic, structured editing |
| Rewrite | `src/components/audit/reports/AuditReportPreview.tsx` | Board-ready preview with cover page, section dividers |
| Upgrade | `src/components/audit/reports/AuditFindingCard.tsx` | Polish finding cards for print/executive readability |
| Rewrite | `src/components/audit/reports/AuditReportVersionTimeline.tsx` | Real audit trail data |
| Create | `src/components/audit/reports/AuditReportTemplateSelector.tsx` | Template picker modal |
| Create | `src/components/audit/reports/AuditReportPDFExport.ts` | Multi-page branded PDF generator |
| Create | `src/components/audit/reports/AuditReportWorkflowBar.tsx` | Reusable workflow stepper |
| Create | `src/components/audit/reports/sections/AuditPortfolioSection.tsx` | Plan progress & coverage for board packs |
| Create | `src/components/audit/reports/sections/AuditExecutiveDashboardSection.tsx` | Executive KPI cards |
| Update | `src/components/audit/reports/index.ts` | Export new components |

## What Does NOT Change

- No database schema changes (existing `ia_audit_reports` columns are sufficient)
- No route changes (existing `/audit/audit-reports` and `/audit/report-builder` preserved)
- No hook changes (`useAuditReports.ts` stays as-is)
- No impact to other modules
- No permission changes
- Existing data fully backward-compatible

## Design Direction

- SSB Green (#0E5F3A) and Gold (#F4C430) accent system from `reportTemplate.ts`
- shadcn/ui components throughout
- Print-safe: no dark backgrounds in preview, border-based indicators
- Executive-friendly: large type for headings, generous whitespace, structured data
- ~11 files total, all within `src/components/audit/reports/`

## Implementation Order

Due to size, implementation will be split into 3 batches:
1. **Batch 1**: TemplateSelector, WorkflowBar, updated FindingCard, sections (PortfolioSection, ExecutiveDashboardSection)
2. **Batch 2**: ReportCenter rewrite, ReportBuilderStudio rewrite
3. **Batch 3**: ReportPreview rewrite, PDFExport, VersionTimeline upgrade, index.ts update

