

# Fix: Meeting Action Buttons — Instant Appearance & Responsive Layout

## Problem 1: Buttons Don't Appear After Scheduling

**Root cause**: In `WorkflowActionButtons.tsx`, `handleMeetingSuccess` is async and **awaits** the `workflow-action-api` edge function call (lines 155-204) before reaching `onActionComplete()` at line 207. This edge function can take several seconds, during which `invalidateMeeting()` is never called — so the meeting query cache stays stale and buttons don't render.

**Fix**: Move `onActionComplete()` call to fire **immediately** after `setShowMeetingDialog(false)` and `refetch()`, before the async API call. The API notification is non-blocking by design (comment on line 151 even says "non-blocking"), so it should not gate the UI update.

```text
handleMeetingSuccess:
  1. setShowMeetingDialog(false)      ← existing
  2. refetch()                         ← existing
  3. onActionComplete(...)             ← MOVE HERE (was at end)
  4. await workflow-action-api(...)    ← non-blocking, runs after UI updates
```

**File**: `src/components/workflow/WorkflowActionButtons.tsx` — reorder `handleMeetingSuccess` so `onActionComplete` fires before the async API call.

## Problem 2: Responsive Layout

**IP Page** (`ApplicationDetailPage.tsx`): Header container at line 194 uses `flex items-center justify-between` without `flex-wrap` or `gap`, causing overflow on narrow screens.

**Fix**: Add `flex-wrap gap-4` to the header container (line 194) — matching the employer page pattern. Also wrap the action buttons section (line 209) with `flex-wrap` to allow stacking.

**Employer Page** (`EmployerApplicationDetailPage.tsx`): Already has `flex-wrap gap-4` on the outer container (line 175) and inner actions (line 191). No changes needed.

**MeetingActionButtons** (`MeetingActionButtons.tsx`): Already uses `flex flex-wrap gap-2`. No changes needed.

## Files Modified

| File | Change |
|---|---|
| `src/components/workflow/WorkflowActionButtons.tsx` | Move `onActionComplete()` before the async API call in `handleMeetingSuccess` |
| `src/pages/online-applications/ApplicationDetailPage.tsx` | Add `flex-wrap gap-4` to header container for responsive layout |

## What Is NOT Changed
- `useApplicationMeeting` hook — already has realtime subscription, works correctly once cache is invalidated
- `MeetingActionButtons` component — already responsive with `flex-wrap`
- Employer detail page — already responsive
- No database changes needed

