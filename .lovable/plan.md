

# Fix: Stat Card Counts Changing on Filter Selection

## Problem
The stat cards ("Total", "Scheduled", "In Progress", "Closed/Done") and the meeting list both consume the same `useMeetings(filters)` query. When a stat card applies a status filter, the query returns only meetings matching that status — so the other cards' counts drop to 0, confusing users.

## Solution
Separate the data source for **stat cards** (always unfiltered by status) from the **meeting list** (filtered). Use two queries:

1. **Stats query**: `useMeetings` with all filters **except** `status` — always returns the full set for counting
2. **List query**: `useMeetings` with all filters **including** `status` — returns filtered results for display

This is a minimal change — no new hooks, no backend changes.

## Changes

**File: `src/pages/meetings/ManageMeetingsPage.tsx`**

1. Add a second `useMeetings` call for stats that excludes the `status` filter:
```typescript
// Filters WITHOUT status — for stat card counts
const statsFilters = useMemo(() => {
  const { status, ...rest } = filters;
  return rest;
}, [filters]);

const { data: allMeetingsForStats } = useMeetings({
  ...statsFilters,
  applicationReference: searchTerm || undefined,
  meetingReference: searchTerm || undefined,
});
```

2. Compute `stats` from `allMeetingsForStats` instead of `meetings`:
```typescript
const stats = useMemo(() => {
  if (!allMeetingsForStats) return { total: 0, scheduled: 0, inProgress: 0, closed: 0 };
  return {
    total: allMeetingsForStats.length,
    scheduled: allMeetingsForStats.filter(m => m.status === 'Scheduled').length,
    inProgress: allMeetingsForStats.filter(m => m.status === 'InProgress').length,
    closed: allMeetingsForStats.filter(m => CLOSED_STATUSES.includes(m.status)).length,
  };
}, [allMeetingsForStats]);
```

3. Keep the existing `useMeetings` call (with status filter) for the list — no change needed there.

4. Update the stats cards visibility condition to use `allMeetingsForStats` instead of `meetings`.

## Files Modified

| File | Change |
|---|---|
| `src/pages/meetings/ManageMeetingsPage.tsx` | Add stats-only query, compute counts from unfiltered data |

## What Is NOT Changed
- `useMeetings` hook — no modifications
- Backend/database — no changes
- Meeting list filtering, grouping, or rendering logic
- Any other page or component

