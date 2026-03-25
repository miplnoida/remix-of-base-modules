

# Fix: Offline Payment Page Crash + Missing Remark Field

## Root Causes

### 1. Page Crash
- When `wiz-admin-api` calls fail, `pageData` stays `null` after loading. The page renders without showing a meaningful error — potentially accessing null properties.
- `validation_warnings` may be `undefined` from the external API but is accessed as `.length` without null check (OfflinePaymentPage.tsx line 718, SelectPaymentModal.tsx line 62).

### 2. Missing Remark
- The Remarks column (10) in EmployerReport and C3ContributionPreview renders an empty `<td>` — never displays `emp.remark`.

## Changes

### File 1: `src/pages/c3Management/c3Details/OfflinePaymentPage.tsx`
- **Add null-state guard**: After loading completes, if `pageData` is still `null`, show an error card with a "Back" button instead of rendering the broken page.
- **Fix validation_warnings null check** (line 718): Change `selectedPayment.validation_warnings.length > 0` → `(selectedPayment.validation_warnings?.length ?? 0) > 0`
- **Display remark in EmployerReport** (line 114): Change empty `<td>` → `<td>{emp.remark || ''}</td>`

### File 2: `src/components/c3/SelectPaymentModal.tsx`
- **Fix validation_warnings null check** (line 62): Change `p.validation_warnings.length > 0` → `(p.validation_warnings?.length ?? 0) > 0`

### File 3: `src/pages/c3Management/c3Details/previews/C3ContributionPreview.tsx`
- **Display remark** (line 164): Change empty `<td>` → `<td>{emp.remark || ''}</td>`

## Summary

| File | Change |
|------|--------|
| `OfflinePaymentPage.tsx` | Add null-state error guard, fix validation_warnings null check, display remark |
| `SelectPaymentModal.tsx` | Fix validation_warnings null check |
| `C3ContributionPreview.tsx` | Display remark in Remarks column |

