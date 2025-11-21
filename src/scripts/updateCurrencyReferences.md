# Currency Reference Update Guide

## Overview
This document tracks the systematic replacement of "EC" and "EC$" with "XCD" throughout the Social Security application to standardize currency references to XCD (Eastern Caribbean Dollar) as the base/functional currency.

## Base Currency Policy
- **Base/Functional Currency**: XCD (Eastern Caribbean Dollar)
- **All ledger postings, statutory reports, liability statements, legal documents, and balances**: Expressed in XCD
- **Foreign currency transactions**: Converted to XCD using applicable exchange rates at transaction date
- **Multi-currency support**: Available for transaction entry, but all accounting and balances maintained in XCD

## Replacement Rules

### Direct Replacements
- `EC$` → `XCD`
- `Cash EC$` → `Cash XCD`
- `Total EC$` → `Total XCD`
- `EC` (when referring to currency) → `XCD`

### Code Variable Names
- `ec` (currency-related) → `xcd`
- `ecTotal` → `xcdTotal`
- `ecDenominations` → `xcdDenominations`
- `cashEC` → `cashXCD`
- `ecVariance` → `xcdVariance`
- `physicalEcTotal` → `physicalXcdTotal`

### Display Labels
- "EC$ Cash Count" → "XCD Cash Count"
- "EC$ Denomination Count" → "XCD Denomination Count"
- "EC$ Collections" → "XCD Collections"
- "Amount (EC$)" → "Amount (XCD)"

## Files Updated

### Finance Module
- [x] src/utils/formatCurrency.ts - Updated with BASE_CURRENCY constant and XCD functions
- [x] src/utils/currencyConverter.ts - Created with multi-currency conversion logic
- [x] src/pages/finance/settings/MultiCurrencySettings.tsx - Created multi-currency management interface
- [x] src/components/sidebar/menuItems/financeMenuItems.ts - Added Multi-Currency Settings menu item
- [x] src/components/routing/AppRoutes.tsx - Added Multi-Currency Settings route

### Cashier Module (Pending Updates)
- [ ] src/pages/cashier/BatchClosing.tsx - 17 EC$ references
- [ ] src/pages/cashier/BatchManagement.tsx - 9 EC$ references  
- [ ] src/pages/cashier/CashDetails.tsx - 17 EC$ references
- [ ] src/pages/cashier/CashierReports.tsx - 17 EC$ references
- [ ] src/pages/cashier/CheckManagement.tsx
- [ ] src/pages/cashier/GLPostingSummary.tsx
- [ ] src/pages/cashier/ContributionReceipts.tsx
- [ ] src/pages/cashier/RentReceipts.tsx
- [ ] src/pages/cashier/LoanReceipts.tsx
- [ ] src/pages/cashier/ServiceReceipts.tsx

### Other Modules (To Be Reviewed)
- [ ] Compliance Module
- [ ] Legal Module
- [ ] Benefits Module
- [ ] C3 Module
- [ ] Reports across all modules

## Integration Points

### Multi-Currency Module Features
1. **Currency Master**: Manage supported currencies with XCD as base
2. **Exchange Rate Management**: Configure rates from foreign currencies to XCD
3. **Transaction Entry**: Support multiple currencies with automatic XCD conversion
4. **Financial Reporting**: All reports show XCD amounts with optional foreign currency detail

### Updated Functions
- `formatCurrency(amount)` - Formats in XCD
- `formatXCD(amount)` - Explicitly formats with XCD label
- `convertToXCD(amount, fromCurrency, date)` - Converts foreign to XCD
- `convertFromXCD(xcdAmount, toCurrency, date)` - Converts XCD to foreign

## Next Steps
1. Update remaining cashier module pages with XCD references
2. Update compliance and legal module currency references  
3. Update all report pages with XCD
4. Update invoice and payment forms
5. Update employer statements and liability documents
6. Create migration guide for database currency fields
7. Update API documentation with multi-currency specifications

## Notes
- All changes maintain backward compatibility with existing data
- Foreign currency support is additive - does not break existing XCD-only flows
- Exchange rate effective dates enable historical accuracy
- FX gain/loss accounts capture currency conversion differences
