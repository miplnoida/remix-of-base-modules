

# Hide "$ Pay" Button from Report List on Three C3 Detail Routes

## Problem
The "$ Pay" button currently appears alongside "Payment" in rows where `payment_status === '$ Pay'` on all three C3 detail routes. The requirement is to hide only the "$ Pay" button while keeping "Payment" visible under the same eligibility condition.

## Approach
Pure UI change across 3 files. When `payment_status === '$ Pay'`, render only the "Payment" button — remove the "$ Pay" button from the JSX. No backend or data-layer changes needed; the existing `payment_status` field continues to drive when "Payment" appears.

## Files to Modify

### 1. `src/pages/c3Management/c3Details/C3ContributionList.tsx` (lines 293-311)
Replace the `'$ Pay'` branch to render only the "Payment" button:
```tsx
) : c.payment_status === '$ Pay' ? (
  <Button
    variant="outline"
    size="sm"
    className="border-blue-500 text-blue-600 text-xs h-7"
    onClick={() => handlePayment(c)}
  >
    Payment
  </Button>
) : ...
```

### 2. `src/pages/c3Management/c3Details/NwDirectorList.tsx` (lines 260-270)
Same change — remove the "$ Pay" button, keep only "Payment".

### 3. `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` (lines 254-264)
Same change — remove the "$ Pay" button, keep only "Payment".

## What Does NOT Change
- The `handlePay` function can remain (dead code, harmless) or be removed — no functional impact
- "Paid" button with receipt modal — unchanged
- "BEMA" status display — unchanged
- `payment_status` logic from the backend — unchanged
- No other routes or components affected

