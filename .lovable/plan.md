

# Add "Payment" Button to C3 Detail Screens → Navigate to C3 Payments

## Overview

Add a "Payment" button in each row of the Report List table on the three C3 detail screens, visible only when the existing `$ Pay` button is shown and enabled. Clicking it navigates to `/cashier/c3-payments` with query params pre-filled. The C3 Payments page must read those params and auto-populate its header fields.

## Current State

- **C3ContributionList**, **NwDirectorList**, **SelfEmployedContributionList** each have a Payment column with `$ Pay`, `Paid`, and `BEMA` states.
- The `$ Pay` button navigates to the offline payment page.
- The record types (`C3ContributionRecord`, `NwdContributionRecord`, `SeContributionRecord`) have `month`, `year`, `schedule` (ER/NW only).
- The `registration_number` (regNo) is available from the selected company/SE dropdown, not from the row data.
- `C3Payments.tsx` does NOT read any query params or location state — it starts with defaults (`payerType = 'ER'`, empty `payerId`).

## Implementation Plan

### 1. Add "Payment" button to all 3 list screens

In each screen, add a new "Payment" button **next to** the existing `$ Pay` button (inside the same `payment_status === '$ Pay'` conditional block). The button navigates to `/cashier/c3-payments` with query params:

```
/cashier/c3-payments?regNo={regNo}&month={month_number}&year={year}&schedule={schedule}&payerType={type}
```

**Source of values per screen:**

| Param | C3ContributionList | NwDirectorList | SelfEmployedContributionList |
|-------|-------------------|----------------|------------------------------|
| `regNo` | `companies.find(c => c.id === selectedCompanyId).registration_number` | Same from NW companies | `seList.find(s => s.id === selectedSeId).social_security_number` |
| `month` | `c.month_number` | `c.month_number` | `c.month_number` |
| `year` | `c.year` | `c.year` | `c.year` |
| `schedule` | `c.schedule` | `c.schedule` | `0` (SE has no schedule) |
| `payerType` | `ER` | `NW` | `SE` |

**Files**: `C3ContributionList.tsx`, `NwDirectorList.tsx`, `SelfEmployedContributionList.tsx`

Each file gets:
- A helper to resolve `regNo` from the selected dropdown entity
- A `handlePayment(record)` function that builds the URL and calls `navigate()`
- A "Payment" button rendered alongside `$ Pay` in the `payment_status === '$ Pay'` block, styled consistently (outline, blue text)

### 2. Update C3Payments.tsx to read query params

Add `useSearchParams` from `react-router-dom` and on mount:
- Read `regNo`, `month`, `year`, `schedule`, `payerType` from query params
- Pre-set `payerType`, `payerId` (to `regNo`), `selectedMonth`, `selectedYear`
- Auto-trigger `handlePayerBlur()` to validate the payer and load info
- Store schedule in state if needed for downstream use

This ensures the C3 Payments screen opens with the correct context fully loaded from real backend data.

### Files Modified
1. `src/pages/c3Management/c3Details/C3ContributionList.tsx` — add Payment button with `payerType=ER`
2. `src/pages/c3Management/c3Details/NwDirectorList.tsx` — add Payment button with `payerType=NW`
3. `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` — add Payment button with `payerType=SE`
4. `src/pages/cashier/C3Payments.tsx` — read query params and auto-populate header

### No API Changes Required
All required data (regNo, month, year, schedule) is already available from the existing dropdown selections and row data. No new backend calls needed.

