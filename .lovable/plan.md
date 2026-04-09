

# Fix: Search Reference AND Filter — OR Logic for Reference Fields

## Problem
When `searchTerm` is passed, `ManageMeetingsPage` sets **both** `applicationReference` and `meetingReference` to the same value. In `useMeetings.ts`, these are applied as two sequential `.filter()` calls (AND logic) — meaning a meeting must match the term in **both** `application_reference` AND `meeting_reference` simultaneously. This is why no results appear.

## Solution
Replace the two separate AND filters in `useMeetings.ts` with a single OR block: if both `applicationReference` and `meetingReference` are provided, match against **either** field. If only one is provided, filter by that one alone.

## Changes

**File: `src/hooks/useMeetings.ts`** (lines 47-57)

Replace:
```typescript
if (filters?.applicationReference) {
  meetings = meetings.filter(m =>
    m.application_reference?.toLowerCase().includes(filters.applicationReference!.toLowerCase())
  );
}
if (filters?.meetingReference) {
  meetings = meetings.filter(m =>
    m.meeting_reference?.toLowerCase().includes(filters.meetingReference!.toLowerCase())
  );
}
```

With:
```typescript
if (filters?.applicationReference || filters?.meetingReference) {
  meetings = meetings.filter(m => {
    const appRef = filters.applicationReference?.toLowerCase();
    const meetRef = filters.meetingReference?.toLowerCase();
    const matchesApp = appRef
      ? m.application_reference?.toLowerCase().includes(appRef)
      : false;
    const matchesMeet = meetRef
      ? m.meeting_reference?.toLowerCase().includes(meetRef)
      : false;
    // OR logic: match either field
    return matchesApp || matchesMeet;
  });
}
```

This ensures the search term matches meetings where **either** the application reference or meeting reference contains the text, while still applying as AND with all other filter criteria (status, type, date range).

## Files Modified
| File | Change |
|---|---|
| `src/hooks/useMeetings.ts` | Replace sequential AND reference filters with single OR block |

## What Is NOT Changed
- Filter bar logic — status, type, date range remain AND conditions as expected
- Stats query — unchanged
- No backend/database changes

