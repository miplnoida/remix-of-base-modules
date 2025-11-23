# Export & Print Implementation Guide

This guide explains how to add Excel export, PDF export, and print functionality to report pages throughout the application.

## Overview

All reports should provide three key capabilities:
1. **Export to Excel** - Data with formulas preserved for user editing
2. **Export to PDF** - Data-only format with proper formatting
3. **Print Report** - Browser print functionality

## Quick Start

### 1. Add Required Imports

```typescript
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';
```

### 2. Define Export Columns

Define the structure of your export data with column headers, keys, widths, and optional formulas:

```typescript
const exportColumns: ExportColumn[] = [
  { header: 'Employer ID', key: 'employerId', width: 15 },
  { header: 'Employer Name', key: 'employerName', width: 30 },
  { header: 'Total Amount', key: 'totalAmount', width: 20 },
  // For calculated columns, add formulas:
  { 
    header: 'Balance', 
    key: 'balance', 
    width: 20,
    formula: '=C{row}-D{row}' // {row} will be replaced with actual row number
  },
];
```

### 3. Prepare Export Data

Ensure your table data matches the column keys:

```typescript
const exportData = [
  { 
    employerId: 'EMP001', 
    employerName: 'ABC Corp',
    totalAmount: 50000,
    // balance will be calculated via formula in Excel
  },
  // ... more rows
];
```

### 4. Add ExportActions Component

Place the ExportActions component in your report's header section next to the PageHeader:

```typescript
export default function YourReport() {
  return (
    <div className="container mx-auto p-6 space-y-6" id="your-report-id">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Your Report Title"
          subtitle="Report description"
          breadcrumbs={[
            { label: "Module", href: "#" },
            { label: "Reports" },
            { label: "Report Name" }
          ]}
        />
        <ExportActions
          reportTitle="Your Report Title"
          fileName="your-report-filename"
          data={exportData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Records', value: String(exportData.length) }
          ]}
        />
      </div>

      <div className="no-print">
        {/* QueryByFilter or other filter components */}
      </div>

      {/* Rest of your report content */}
    </div>
  );
}
```

> **Important**: Add the `no-print` class to filter panels and action buttons so they don't appear when printing.

## Excel Formula Support

### Formula Syntax

Use `{row}` as a placeholder for the current row number in formulas:

```typescript
{ 
  header: 'Total', 
  key: 'total',
  formula: '=SUM(B{row}:E{row})' // Sums columns B through E
}

{ 
  header: 'Balance', 
  key: 'balance',
  formula: '=C{row}-D{row}' // Subtracts column D from C
}

{ 
  header: 'Percentage', 
  key: 'percentage',
  formula: '=(F{row}/G{row})*100' // Calculates percentage
}
```

### Common Formula Examples

```typescript
// Summation
formula: '=SUM(B{row}:E{row})'

// Subtraction (Balance = Amount Due - Amount Paid)
formula: '=C{row}-D{row}'

// Division with percentage
formula: '=(B{row}/C{row})*100'

// Conditional (IF statement)
formula: '=IF(B{row}>1000,"High","Low")'

// Multiple conditions
formula: '=IF(AND(B{row}>1000,C{row}<5000),"Medium","Other")'

// VLOOKUP (reference another sheet)
formula: '=VLOOKUP(A{row},RefData!A:B,2,FALSE)'
```

## Component Props Reference

### ExportActions Props

| Prop | Type | Description | Required |
|------|------|-------------|----------|
| `reportTitle` | string | Title displayed in PDF header | Yes |
| `fileName` | string | Base filename (without extension) | Yes |
| `data` | ExportData[] | Array of data objects to export | Yes |
| `columns` | ExportColumn[] | Column definitions | Yes |
| `additionalInfo` | Array<{label: string, value: string}> | Extra info for PDF header | No |
| `className` | string | CSS classes for button | No |

### ExportColumn Interface

```typescript
interface ExportColumn {
  header: string;      // Column header text
  key: string;         // Data object property key
  width?: number;      // Column width in Excel (default: 15)
  formula?: string;    // Excel formula for calculated columns
}
```

## Print Functionality

The application includes automatic print styles via CSS. To use:

### Hiding Elements from Print

Add the `no-print` class to elements that shouldn't appear when printing:

```tsx
<div className="no-print">
  {/* Filter panels, action buttons, etc. */}
  <QueryByFilter ... />
  <ExportActions ... />
</div>
```

### Print Button

The `ExportActions` component includes a Print button that calls `window.print()`. This triggers the browser's print dialog with optimized styles applied.

### Print Styles

The following CSS is automatically applied during printing:
- `.no-print` elements are hidden
- Charts and tables are optimized for printing
- Page breaks are controlled to avoid splitting content
- Background colors are adjusted for print

### Testing Print Output

1. Click the Print button
2. Use "Print Preview" in your browser
3. Verify layout and content
4. Adjust page orientation if needed (Portrait/Landscape)

## Implementation Checklist

For each report page:
- [ ] Import `ExportActions` and `ExportColumn`
- [ ] Define `exportColumns` array matching table structure
- [ ] Prepare `exportData` array with all table data
- [ ] Add unique `id` to main report container div
- [ ] Place `ExportActions` component in header section
- [ ] Add `no-print` class to filters and actions
- [ ] Test Excel export with formulas
- [ ] Test PDF export with formatting
- [ ] Test Print functionality

## Reports Requiring Export Implementation

This export and print functionality should be applied to ALL report pages across the application including:

### Employer Reports (33+ reports)
- Registered Employers Summary
- Active vs Inactive Employers  
- Contribution Compliance
- Top Missing C3 Submissions
- All 33 employer reports throughout the module

### C3 Management Reports
- Monthly Collections Report
- Contribution Arrears Report
- Top Contributors Report
- All C3 reports

### Insured Persons Reports (CRD Reports)
- Insured Persons Summary
- Active Coverage by Age
- Contribution History
- All CRD department reports

### Finance Reports
- Contributions vs Benefits
- Cash Flow & Reserves
- Investments
- All finance reports

### Benefits Reports
- Payments by Type
- Claims Volume
- Overpayments
- All benefits reports

### Compliance Reports
- Employer Status
- Inspection Findings
- Penalties
- All compliance reports

### Internal Audit Reports
- Engagement Summary
- Open Findings
- Resolution History
- All audit reports

### System Administration Reports
- Account & Roles
- Permission Changes
- Configuration Audit
- All admin reports

### Legal Reports
- All legal module reports

Each report should follow the same pattern for consistency and user experience.

## Advanced Features

### Conditional Formatting (Future Enhancement)

```typescript
// Future: Add cell styling based on conditions
const exportColumns: ExportColumn[] = [
  { 
    header: 'Status',
    key: 'status',
    width: 15,
    style: (value) => value === 'Overdue' ? { color: 'red', bold: true } : {}
  },
];
```

### Multiple Sheets (Future Enhancement)

```typescript
// Future: Export multiple sheets in one workbook
exportToExcel(
  [
    { sheetName: 'Summary', data: summaryData, columns: summaryCols },
    { sheetName: 'Details', data: detailsData, columns: detailsCols }
  ],
  fileName
);
```

## Troubleshooting

### Formula not calculating in Excel
- Ensure formula uses correct column letters (A, B, C, etc.)
- Use `{row}` placeholder for row numbers
- Test formula syntax in Excel first

### Export button not appearing
- Check imports are correct
- Verify data and columns arrays are defined
- Check console for errors

### PDF missing data
- Verify `additionalInfo` prop format
- Check column keys match data object keys
- Ensure data array is not empty

## Support

For issues or questions about export functionality:
1. Check console for error messages
2. Verify data structure matches column definitions
3. Review formula syntax
4. Test with minimal data first
