

# Implement Typable Search in All C3 Management Dropdowns

## Problem
Most dropdowns in the C3 Management module use the basic `Select` component (Radix), which only supports prefix-character matching (typing first letter jumps to match). The `SearchableSelect` combobox component already exists and supports full free-text, case-insensitive, substring matching -- but it is only used in 3 places (entity selection on C3ContributionList, NwDirectorList, SelfEmployedContributionList).

## Scope of Changes

Dropdowns are categorized into two groups:
1. **Large/dynamic lists** -- these MUST be converted to `SearchableSelect` for usability
2. **Small/static lists** (2-6 fixed items like status, gender, pay period) -- these do NOT need search; the current `Select` is appropriate

### Dropdowns to Convert (large dynamic lists)

| File | Dropdown | Data Source |
|------|----------|-------------|
| `C3Management.tsx` | Entered By filter | profiles list |
| `C3Management.tsx` | Verified By filter | profiles list |
| `C3Management.tsx` | Status filter | c3Statuses list |
| `WizEmployerList.tsx` | Parent Company selector | companies list |
| `WizEmployerList.tsx` | Child Companies selector | companies list |
| `WizEmployeeList.tsx` | Employer selector | companies list |
| `WizPaymentDetails.tsx` | Employer filter | companies list |
| `WizPaymentDetails.tsx` | Employer User filter | companyUsers list |
| `WizPaymentDetails.tsx` | Self Employee filter | selfEmployedList |
| `WizSelfEmployedDetailsEdit.tsx` | Category selector | categories list |
| `WizSelfEmployedDetailsEdit.tsx` | Country selector | countries list |
| `WizSelfEmployedDetailsEdit.tsx` | Security Question 1 | SECURITY_QUESTIONS |
| `WizSelfEmployedDetailsEdit.tsx` | Security Question 2 | SECURITY_QUESTIONS |
| `WizEmployerDetailsEdit.tsx` | Country selector | COUNTRIES |
| `WizEmployerDetailsEdit.tsx` | Security Question 1 | SECURITY_QUESTIONS |
| `WizEmployerDetailsEdit.tsx` | Security Question 2 | SECURITY_QUESTIONS |
| `WizEmployerDetailsEdit.tsx` | Dial Code (x2) | DIAL_CODES |
| `ReceivedBySelect.tsx` | Received By | profiles list |
| `OtherPaymentsSection.tsx` | Income Code | incomeCodes list |

### Dropdowns to Leave As-Is (small static lists)

- Pay Period (4 items: Weekly, Bi-Weekly, Monthly, 2 Monthly)
- Payer Type (3 items: Employer, Self-Employed, Voluntary)
- Status filters with < 6 fixed items (Pending/Approved/Rejected, Gender, Marital Status)
- Payment status (AUTHORIZED/DECLINED/INVALID_REQUEST)
- Payment type (3 items)

## Implementation Approach

### Step 1: Enhance SearchableSelect with "All" option support
Add an optional `includeAllOption` prop (label like "All") so filter dropdowns can include an "All" choice without custom wiring.

### Step 2: Convert each file
For each file listed above:
- Replace `Select`/`SelectContent`/`SelectItem` with `SearchableSelect`
- Map data into `{ value, label, searchText? }` format
- Wire `onValueChange` to existing handler
- For filter dropdowns with "All" option, handle the `__all__` → empty string mapping

### Step 3: Convert ReceivedBySelect component
Replace its internal `Select` with `SearchableSelect`, making the profiles list searchable by name and user code.

### Step 4: Convert OtherPaymentsSection income code selector
Replace the income code `Select` with `SearchableSelect` to allow searching by code or description.

## Technical Details

- **No API changes** -- all data is already loaded client-side
- **No new dependencies** -- reuses existing `SearchableSelect` component built on `cmdk`
- **Performance** -- cmdk handles filtering efficiently; no debounce needed for pre-loaded lists
- **Consistency** -- all large-list dropdowns will use the same combobox pattern with substring matching

## Files Modified
- `src/components/ui/searchable-select.tsx` (minor: add `includeAllOption` support)
- `src/pages/c3Management/C3Management.tsx`
- `src/pages/c3Management/employers/WizEmployerList.tsx`
- `src/pages/c3Management/employers/WizEmployeeList.tsx`
- `src/pages/c3Management/employers/WizEmployerDetailsEdit.tsx`
- `src/pages/c3Management/payments/WizPaymentDetails.tsx`
- `src/pages/c3Management/selfEmployed/WizSelfEmployedDetailsEdit.tsx`
- `src/components/c3/ReceivedBySelect.tsx`
- `src/components/c3/OtherPaymentsSection.tsx`

