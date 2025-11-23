# Export Functionality Implementation Guide

This guide explains how to add Excel and PDF export functionality to all report pages throughout the application.

## Overview

The export system supports:
- **Excel Export**: Exports tabular data with formulas preserved so users can continue working in Excel
- **PDF Export**: Exports report data in PDF format with headers, footers, and branding

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

Place the ExportActions component near your PageHeader:

```typescript
<div className="flex justify-between items-start">
  <PageHeader
    title="Your Report Title"
    subtitle="Report description"
    breadcrumbs={[...]}
  />
  <ExportActions
    reportTitle="Your Report Title"
    fileName="report-file-name"
    data={exportData}
    columns={exportColumns}
    additionalInfo={[
      { label: 'Report Date', value: new Date().toLocaleDateString() },
      { label: 'Total Records', value: String(exportData.length) }
    ]}
  />
</div>
```

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

## Implementation Checklist

For each report page, follow this checklist:

- [ ] Import `ExportActions` and `ExportColumn`
- [ ] Define `exportColumns` array matching your table structure
- [ ] Prepare `exportData` array with all table data
- [ ] Add formulas to calculated columns in `exportColumns`
- [ ] Place `ExportActions` component in header area
- [ ] Test Excel export and verify formulas work
- [ ] Test PDF export and verify formatting
- [ ] Verify all data exports correctly

## Reports Requiring Export Implementation

### Employer Reports
- [x] Registered Employers Summary (example implementation)
- [ ] Active vs Inactive Employers
- [ ] Employer Contribution Compliance
- [ ] Top Missing C3 Submissions
- [ ] All 33 employer reports...

### C3 Management Reports
- [ ] Monthly Collections Report
- [ ] Contribution Arrears Report
- [ ] Top Contributors Report
- [ ] All C3 reports...

### Compliance Reports
- [ ] Case Analytics
- [ ] Inspector Performance
- [ ] Arrears Reports
- [ ] All compliance reports...

### Benefits Reports
- [ ] Payments by Type
- [ ] Claims Volume
- [ ] Overpayments
- [ ] All benefits reports...

### Internal Audit Reports
- [ ] Engagement Summary
- [ ] Open Findings
- [ ] Resolution History
- [ ] All audit reports...

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
