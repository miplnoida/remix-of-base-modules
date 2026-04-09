

# Fix: Rescheduled Meeting Status — "Closed" → "Rescheduled"

## Problem

When a meeting is rescheduled (manually or via auto-reschedule at start), the **original meeting** is incorrectly set to `status: 'Closed'` with `outcome: 'NextSchedule'`. It should be `status: 'Rescheduled'` with `outcome: 'Reschedule'`.

The database RPC `process_meeting_outcome` already has the correct mapping (`Reschedule → Rescheduled`), but the edge function **bypasses the RPC** and hardcodes the wrong values.

## Root Cause

Two code paths in `supabase/functions/meeting-api-handler/index.ts`:

1. **`reschedule_meeting` action** (line ~648): Hardcodes `status: 'Closed', outcome: 'NextSchedule'`
2. **`start_meeting` auto-reschedule** (line ~258): Same hardcoded `status: 'Closed', outcome: 'NextSchedule'`

Both also log history with `new_status: 'Closed'` and `action_taken: 'CLOSED_NEXT_SCHEDULED'`.

## Changes — Single File

**File:** `supabase/functions/meeting-api-handler/index.ts`

### Change 1: `reschedule_meeting` case (~lines 646-678)

| Field | Before | After |
|---|---|---|
| `status` | `'Closed'` | `'Rescheduled'` |
| `outcome` | `'NextSchedule'` | `'Reschedule'` |
| Remove `closed_by`, `closed_by_name`, `closed_at` | present | removed (not a closure) |
| History `new_status` | `'Closed'` | `'Rescheduled'` |
| History `action_taken` | `'CLOSED_NEXT_SCHEDULED'` | `'RESCHEDULED'` |
| History `outcome` | `'NextSchedule'` | `'Reschedule'` |

### Change 2: `start_meeting` auto-reschedule case (~lines 256-291)

Same corrections:

| Field | Before | After |
|---|---|---|
| `status` | `'Closed'` | `'Rescheduled'` |
| `outcome` | `'NextSchedule'` | `'Reschedule'` |
| Remove `closed_by`, `closed_by_name`, `closed_at` | present | removed |
| `outcome_remarks` | `'Closed: next meeting...'` | `'Rescheduled: next meeting...'` |
| History `new_status` | `'Closed'` | `'Rescheduled'` |
| History `action_taken` | `'CLOSED_NEXT_SCHEDULED'` | `'RESCHEDULED'` |
| History `outcome` | `'NextSchedule'` | `'Reschedule'` |

### No Other Files Affected

- **DB RPC** (`process_meeting_outcome`): Already maps `Reschedule → Rescheduled` correctly — no change needed.
- **Frontend** (`RescheduleMeetingDialog.tsx`, `useMeetings.ts`): Does not hardcode status — delegates to edge function. No change needed.
- **UI status colors/filters** (`ManageMeetingsPage.tsx`, `StatusBadge.tsx`): Already handle `'Rescheduled'` status with appropriate styling and de-emphasis. No change needed.
- **Calendar/list queries** (`useMeetingCalendar.ts`, `useApplicationMeeting.ts`): Already include `'Rescheduled'` in active status filters where appropriate. No change needed.

