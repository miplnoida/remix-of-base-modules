

# Fix: Disable Past Time Slots Based on Live Local Time

## Problem
Both `ScheduleMeetingDialog` and `RescheduleMeetingDialog` compute `nowTimeMinutes` using `useMemo(() => ..., [])` — this captures the current time **once at mount** and never updates. If a user opens the dialog at 10:00 AM and spends 15 minutes configuring, time slots like 10:00 and 10:10 remain selectable because `nowTimeMinutes` is still frozen at the mount-time value.

Additionally, if a user selects a time slot that was valid when clicked but becomes past by the time they submit, the submit guard uses the same stale value.

## Solution
Replace the static `useMemo` with a live-updating value that refreshes every 60 seconds. Both dialogs get the same fix.

## Changes

### File: `src/components/meetings/ScheduleMeetingDialog.tsx`

**Line 150** — Replace:
```typescript
const nowTimeMinutes = useMemo(() => today.getHours() * 60 + today.getMinutes(), []);
```
With a `useState` + `useEffect` that updates every 60 seconds:
```typescript
const [nowTimeMinutes, setNowTimeMinutes] = useState(() => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
});

useEffect(() => {
  const interval = setInterval(() => {
    const n = new Date();
    setNowTimeMinutes(n.getHours() * 60 + n.getMinutes());
  }, 60_000);
  return () => clearInterval(interval);
}, []);
```

This ensures:
- Time slots become disabled in real-time as minutes pass
- The submit guard (`isSlotInPast`) always checks against the current time
- If a previously-selected slot becomes past, the UI visually disables it and the submit guard rejects it

### File: `src/components/meetings/RescheduleMeetingDialog.tsx`

**Line 138** — Same replacement as above.

## Files Modified

| File | Change |
|---|---|
| `src/components/meetings/ScheduleMeetingDialog.tsx` | Replace stale `useMemo` with live-updating `nowTimeMinutes` |
| `src/components/meetings/RescheduleMeetingDialog.tsx` | Same fix |

## What Is NOT Changed
- Time slot generation logic — unchanged
- Overlap validation — unchanged
- Submit guards — already use `isSlotInPast`, which will now use live time
- Backend/database — no changes

