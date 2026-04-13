

## Fix: Week Validation Firing on Schedule Prompt Confirmation

### Root Cause

In both `SelfContributorC3Form.tsx` (line 940-946) and `VoluntaryC3Form.tsx` (line 906-911), when the user clicks "Create Schedule N" in the confirmation dialog, the `onConfirm` handler does:

```typescript
setScheduleNo(suggestedScheduleNo);
setTimeout(() => { handleSave(); }, 100);
```

This re-triggers `handleSave()`, which runs validation — including the "select at least one week" check (line 508/437). Since the user hasn't filled in the form yet (no weeks selected), it immediately shows the error toast.

The schedule prompt dialog should **only set the schedule number** so the user can continue filling in the form. The actual save should happen when the user clicks the Save button.

The same issue occurs in both places the dialog can appear:
1. **On form mount** (useEffect, line 442/300) — when SSN+period detects existing VAC records
2. **On save attempt** (line 553-556/479-481) — when `saveSelfContributorC3` returns `promptNextSchedule`

### Fix

**Files**: `SelfContributorC3Form.tsx`, `VoluntaryC3Form.tsx`

In the `ConfirmDialog` `onConfirm` handler, remove the `setTimeout(() => handleSave())` call. Keep only:

```typescript
onConfirm={() => {
  setSchedulePromptOpen(false);
  setScheduleNo(suggestedScheduleNo);
  toast({ 
    title: "Schedule Updated", 
    description: `Schedule set to ${suggestedScheduleNo}. Please fill in the form and click Save.` 
  });
}}
```

This ensures:
- Schedule number is updated correctly in the UI (already shows as "SCH-3" etc.)
- User fills in weeks/wages as normal
- Validation only triggers when Save is clicked
- No breaking changes to existing save flow

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/c3Management/forms/SelfContributorC3Form.tsx` | Remove `setTimeout(handleSave)` from schedule prompt `onConfirm` |
| `src/pages/c3Management/forms/VoluntaryC3Form.tsx` | Same change |

