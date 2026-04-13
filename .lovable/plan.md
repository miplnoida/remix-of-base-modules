

## Fix Plan: Submit Button Loader Isolation + Validation Timing

### Issue 1 — All Submit buttons show loader when one C3 is submitted

**Root Cause**: `useC3Submit()` exposes a single `isSubmitting` boolean. In `C3Management.tsx` (line 1463-1467), every row's Submit button checks the same `isSubmittingC3` flag. When any record is submitted, all draft rows show the spinner and become disabled.

**Fix**: Track the ID of the record currently being submitted instead of a boolean.

**Changes in `src/hooks/useC3Submit.ts`**:
- Replace `isSubmitting: boolean` with `submittingId: string | null`
- Set `submittingId = c3Id` when submission starts, reset to `null` on completion
- Export `submittingId` instead of `isSubmitting`

**Changes in `src/pages/c3Management/C3Management.tsx`**:
- Destructure `submittingId` from `useC3Submit()` (line 55)
- Update Submit button (line 1463): `disabled={submittingId === record.id}`
- Update loader check (line 1466): `{submittingId === record.id ? <Loader2 ... /> : <Send ... />}`
- Keep `isSubmitting` as a derived boolean (`!!submittingId`) for backward compatibility in `ViewC3Record.tsx` and other consumers

### Issue 2 — Week selection validation timing

**Current state**: The "Please select at least one week or mark as Nil Return" validation in SE (line 508) and VC (line 437) only fires inside `handleSave`, which is correct per the user's requirement.

**Observed problem**: The proactive `useEffect` (SE line 412, VC similar) that checks `findAllC3ForPeriod` on SSN+period change fires a toast ("Existing Record Found") or triggers `onSave?.({ autoLoad: true })` immediately when SSN and period are filled. This can cause a form re-render or navigation that the user perceives as premature validation. However, the actual week validation is not triggered early.

**Confirmation**: No code change needed for week validation logic — it already only fires on save/submit. The user's concern is addressed by confirming this behavior. If they're seeing a toast prematurely, it's the schedule/existing-record check toast (not the week validation), which is intentional and correct per the approved plan.

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useC3Submit.ts` | Add `submittingId` state; export both `submittingId` and `isSubmitting` (derived) |
| `src/pages/c3Management/C3Management.tsx` | Use `submittingId` for per-row loader/disabled logic on Submit buttons |

### Summary
- Single targeted fix: isolate Submit button loader to the specific row being submitted
- Week validation is already correctly gated behind save/submit — no change needed there

