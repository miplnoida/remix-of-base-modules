

# Export and Print for Audit Universe and Risk Management

## Current State

- `ExportDropdown` component already provides PDF (via `generateSSBReport`), XLSX (via ExcelJS), and CSV exports
- Both `AuditUniverse.tsx` and `RiskRegister.tsx` already use `ExportDropdown` with their filtered data
- SSB-branded report template (`reportTemplate.ts`) handles PDF headers/footers/table styling
- Print CSS exists in `index.css` with `.no-print` class support
- **Missing**: DOCX export, print-friendly view, grouped reports, metadata (filters applied), risk detail export, mitigation action plan export

## Architecture

### 1. Enhanced `ExportDropdown` Component
Add DOCX and Print options to the existing dropdown. Add support for metadata (filters, user, date) and grouped export modes.

### 2. New Utility: `src/lib/auditReportExports.ts`
Centralized export functions for audit/risk modules:
- `exportAuditUniversePDF(data, filters, groupBy?)` — filtered register with metadata
- `exportRiskRegisterPDF(data, filters, groupBy?)` — risk register with metadata
- `exportRiskDetailPDF(risk, actions, reviews)` — single risk detail report
- `exportMitigationPlanPDF(risks, actions)` — mitigation action plan grouped by risk
- `exportAuditDocx(title, columns, data, metadata)` — DOCX export using `docx` npm package
- `exportGroupedReport(data, groupByField, columns, title)` — grouped PDF/XLSX with section headers

### 3. Print View
- Extend `index.css` print styles with table header repetition, proper typography, and page breaks
- Add a `PrintableReport` wrapper component that renders a print-optimized layout when `window.print()` is called
- Hide sidebar, navigation, filters, and action buttons during print

## File Changes

| File | Changes |
|------|------|
| `package.json` | Add `docx` dependency for DOCX generation |
| `src/lib/auditReportExports.ts` | **New** — All export functions for audit/risk modules |
| `src/components/common/ExportDropdown.tsx` | Add DOCX + Print options; add `metadata`, `groupByOptions`, `onPrint` props |
| `src/pages/audit/AuditUniverse.tsx` | Pass filter metadata to ExportDropdown; add grouped export support |
| `src/pages/audit/RiskRegister.tsx` | Pass filter metadata; add risk detail export button in detail panel; add mitigation plan export |
| `src/index.css` | Enhanced print styles — table header repeat, sidebar hide, typography, page breaks |

## Export Functions Detail

### `auditReportExports.ts`

**Metadata object** passed to all exports:
```typescript
interface ExportMetadata {
  title: string;
  generatedDate: string;
  generatedBy?: string;
  filtersApplied: { label: string; value: string }[];
  totalRecords: number;
}
```

**PDF exports** use existing `addSSBHeader`, `getSSBTableConfig`, `addSSBFooter` from `reportTemplate.ts`.

**DOCX exports** use `docx` npm library:
- SSB-branded header (green header row, gold accent)
- Professional table with column headers
- Metadata section showing filters applied
- Footer with generation date and page numbers

**Grouped reports** (by entity, owner, status, category, severity):
- Each group gets a section header
- Subtotals per group
- Page break between groups in PDF

### Risk Detail Export (PDF only)
Single-risk report containing:
- Risk summary card (title, entity, scores, status, owner)
- Inherent vs residual scoring table
- Mitigation actions table
- Review history timeline
- Generated date and user

### Mitigation Action Plan Export
- Grouped by risk title
- Shows action title, assigned to, due date, status, priority
- Summary counts at top (planned, in progress, completed, overdue)

## Print Stylesheet Enhancements

```css
@media print {
  /* Hide app chrome */
  .sidebar, nav, .no-print, header, footer { display: none !important; }
  main { margin: 0 !important; padding: 0 !important; }
  
  /* Table headers repeat on each page */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  
  /* Typography */
  body { font-size: 10pt; line-height: 1.4; }
  table { font-size: 9pt; border-collapse: collapse; width: 100%; }
  th { background: #0E5F3A !important; color: white !important; -webkit-print-color-adjust: exact; }
  td, th { border: 1px solid #ddd; padding: 4px 8px; }
  
  /* Page breaks */
  .page-break-before { page-break-before: always; }
  h2, h3 { page-break-after: avoid; }
}
```

## ExportDropdown Enhanced Props

```typescript
interface ExportDropdownProps {
  data: any[];
  columns: ExportColumn[];
  fileName: string;
  title?: string;
  metadata?: ExportMetadata;           // NEW: filters applied, user, date
  groupByOptions?: { label: string; key: string }[];  // NEW: grouped export
  onPrint?: () => void;                // NEW: print action
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}
```

The dropdown menu will show:
- Export as Excel
- Export as CSV
- Export as PDF
- Export as DOCX (new)
- Print (new)
- Submenu: "Grouped Report" with options (entity, owner, status, category, severity)

## Implementation Order

| Step | Work |
|------|------|
| 1 | Install `docx` package |
| 2 | Create `auditReportExports.ts` with all export functions |
| 3 | Enhance `ExportDropdown` with DOCX, Print, grouped, and metadata support |
| 4 | Update `AuditUniverse.tsx` — pass metadata, add print handler |
| 5 | Update `RiskRegister.tsx` — pass metadata, add risk detail export, mitigation plan export |
| 6 | Enhance print CSS in `index.css` |

## Test Checklist

- [ ] Export Audit Universe as PDF — verify SSB header, filters shown in metadata, all columns present
- [ ] Export Audit Universe as XLSX — verify branded header, all data rows match filtered view
- [ ] Export Audit Universe as DOCX — verify professional table, metadata section, readable columns
- [ ] Export Risk Register as PDF/XLSX/DOCX — same checks
- [ ] Export Risk Detail (single risk) as PDF — verify scoring, mitigations, reviews shown
- [ ] Export Mitigation Action Plan as PDF — verify grouped by risk, action statuses correct
- [ ] Grouped report by entity — verify section headers and subtotals
- [ ] Grouped report by severity — verify correct grouping
- [ ] Print from browser — verify no sidebar/nav, table headers repeat, clean typography
- [ ] Verify metadata shows correct filters applied and generation date
- [ ] Verify empty data shows appropriate "No records" message in exports
- [ ] Verify large datasets (100+ rows) paginate correctly in PDF

