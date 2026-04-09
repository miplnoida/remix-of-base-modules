

# Fix: Meeting Time Stored as UTC During Auto-Reschedule

## Problem
When a user clicks "Start Meeting" on a future-dated meeting, the edge function auto-reschedules it to "now". It computes the current time using `getUTCHours()`/`getUTCMinutes()`, storing UTC time (e.g., `03:30`) in `meeting_time`. But `meeting_time` is a **business field** — when users schedule meetings for "11:20 AM", that's their local time. The frontend `formatTime()` then displays this UTC value as-is, showing "3:30 AM" instead of "7:30 AM".

## Root Cause
- `supabase/functions/meeting-api-handler/index.ts` line ~243: `getUTCHours()` / `getUTCMinutes()` used to compute `currentTimeHHMM`
- This value is stored directly in `meeting_time` for the new auto-rescheduled meeting
- Frontend treats `meeting_time` as local time (correct for all other meetings), so UTC value displays incorrectly

## Fix Strategy
Since `meeting_time` is a business field (local time, no TZ conversion), the **client must send its local time** when starting a meeting. The edge function should use the client-provided time instead of computing UTC.

## Changes

### 1. Frontend: Send client local time with start_meeting call
**File:** `src/hooks/useMeetings.ts`

Update `useStartMeeting` mutation to include the client's current local date and time in the request body:
```typescript
mutationFn: async ({ meetingId }: { meetingId: string }) => {
  const now = new Date();
  const clientDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const clientTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const { data, error } = await supabase.functions.invoke('meeting-api-handler', {
    body: {
      action: 'start_meeting',
      meetingId,
      clientDate,   // "2026-04-09" in user's local TZ
      clientTime,   // "07:30" in user's local TZ
    }
  });
  ...
}
```

### 2. Edge Function: Use client-provided time instead of UTC
**File:** `supabase/functions/meeting-api-handler/index.ts`

In the `start_meeting` handler (~line 240-252):
- Read `body.clientDate` and `body.clientTime` from the request
- Fall back to UTC if not provided (backward compatibility)
- Use these values for `todayDate`, `currentTimeHHMM`, and `currentTime` instead of the UTC-derived values
- Keep the UTC `nowUtc` only for `updated_at` audit timestamps (which correctly use ISO strings)

```text
Before:
  const nowUtc = new Date()
  const todayDate = nowUtc.toISOString().split('T')[0]
  const currentTimeHHMM = `${nowUtc.getUTCHours()...}:${nowUtc.getUTCMinutes()...}`
  const currentTime = currentTimeHHMM

After:
  const nowUtc = new Date()
  const todayDate = body.clientDate || nowUtc.toISOString().split('T')[0]
  const currentTimeHHMM = body.clientTime || `${nowUtc.getUTCHours()...}:${nowUtc.getUTCMinutes()...}`
  const currentTime = currentTimeHHMM
```

Update remarks strings to remove "UTC" suffix from time references.

### 3. No display-layer changes needed
The existing `formatTime()` functions in `StartMeetingPage.tsx`, `ManageMeetingsPage.tsx`, `MeetingDetailView.tsx`, and `MeetingCalendarModal.tsx` already treat `meeting_time` as local time — which is correct. Once the stored value is local time, all displays will be correct automatically.

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useMeetings.ts` | Send `clientDate` and `clientTime` in start_meeting request |
| `supabase/functions/meeting-api-handler/index.ts` | Use client-provided local date/time for auto-reschedule instead of UTC |

## What Is NOT Changed
- Scheduling dialog — already sends user-selected local time
- Reschedule dialog — already sends user-selected local time
- All display functions — already treat meeting_time as local time
- `updated_at` / `created_at` audit fields — remain UTC (correct)
- All other meeting actions (close, cancel, approve, reject)

