

## Fix: Decouple BIMA Badge from Payment Status Logic

### Problem
The C3-Wizard API no longer returns `payment_status: "BEMA"` for BIMA-imported records. Instead, it now returns the real payment status (`"$ Pay"`, `"Paid"`, `"Partial"`). The current UI checks for `payment_status === 'BEMA'` and renders a static "BEMA" label with no payment action — meaning BIMA-imported records that need payment will now fall through to `null` (no button rendered) since the API no longer sends that value.

The fix is to:
1. Remove the `payment_status === 'BEMA'` branch from all three list components
2. Add an independent BIMA badge based on `is_imported_from_bema` (already in the API response and type definitions)

### Changes

#### 1. `C3ContributionList.tsx` — Payment column (lines 296-332)
- Remove the `payment_status === 'BEMA'` branch (lines 328-331)
- Add a BIMA badge after each payment status display when `c.is_imported_from_bema` is true
- For `Paid`: show "Paid" + printer icon + BIMA badge
- For `Partial`: show Payment button + pending amount + BIMA badge
- For `$ Pay`: show Payment button + BIMA badge

#### 2. `NwDirectorList.tsx` — Payment column (lines 252-282)
- Same change: remove `payment_status === 'BEMA'` branch (lines 280-281)
- Add BIMA badge alongside each payment status when `c.is_imported_from_bema` is true

#### 3. `SelfEmployedContributionList.tsx` — Payment column (lines 247-276)
- Same change: remove `payment_status === 'BEMA'` branch (lines 274-275)
- Add BIMA badge alongside each payment status when `c.is_imported_from_bema` is true

### BIMA Badge Component (inline)
```tsx
{c.is_imported_from_bema && (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border ml-1">
    BIMA
  </span>
)}
```

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Remove BEMA branch, add `is_imported_from_bema` badge |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Same |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Same |

### No type changes needed
The `is_imported_from_bema` field is already defined in `wizC3DetailsService.ts` types for all three contributor types.

