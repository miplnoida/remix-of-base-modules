

# Global Interaction-Blocking Overlay for Critical Actions

## Problem
When a user clicks an action button (e.g., "Start Meeting", "Approve", "Save"), a local spinner shows but the rest of the UI — including the left navigation menu — remains interactive. Users can navigate away or trigger duplicate actions, causing inconsistent state and data integrity issues.

## Architecture

A lightweight **global blocking overlay** managed via React context. Any component can call `startBlocking()` / `stopBlocking()` to activate a full-screen overlay that disables all pointer events. A reference counter handles concurrent operations (overlay stays until ALL operations complete).

```text
┌──────────────────────────────────┐
│  GlobalBlockingContext            │
│  ┌────────────────────────────┐  │
│  │ activeCount (ref counter)  │  │
│  │ startBlocking(label?)      │  │
│  │ stopBlocking()             │  │
│  │ isBlocking: boolean        │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  <BlockingOverlay />             │
│  fixed inset-0 z-[9999]         │
│  pointer-events: all            │
│  semi-transparent backdrop      │
│  centered Loader2 + label       │
└──────────────────────────────────┘
```

## Implementation

### 1. New Context: `GlobalBlockingContext`
**File:** `src/contexts/GlobalBlockingContext.tsx`

- `activeCount` ref (integer) — incremented by `startBlocking()`, decremented by `stopBlocking()`
- `isBlocking` state derived from `activeCount > 0`
- Optional `label` parameter for display text (e.g., "Saving..." or "Processing...")
- Safety: `stopBlocking` never decrements below 0
- **Timeout guard**: If blocking persists >30s, auto-release with error toast

### 2. New Component: `BlockingOverlay`
**File:** `src/components/ui/BlockingOverlay.tsx`

- Renders only when `isBlocking === true`
- `fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center pointer-events-auto`
- Shows `Loader2` spinner + label text
- Sits above everything including nav sidebar and modals

### 3. New Hook: `useBlockingMutation`
**File:** `src/hooks/useBlockingMutation.ts`

A thin wrapper around `useMutation` that automatically calls `startBlocking()` before the mutation and `stopBlocking()` on success/error/settled. Drop-in replacement for critical actions:

```typescript
export function useBlockingMutation<TData, TError, TVariables>(
  options: UseMutationOptions<TData, TError, TVariables>,
  blockingLabel?: string
) {
  const { startBlocking, stopBlocking } = useGlobalBlocking();
  return useMutation({
    ...options,
    onMutate: async (vars) => {
      startBlocking(blockingLabel);
      return options.onMutate?.(vars);
    },
    onSettled: (data, error, vars, ctx) => {
      stopBlocking();
      options.onSettled?.(data, error, vars, ctx);
    },
  });
}
```

### 4. Wire Into App.tsx
Add `GlobalBlockingProvider` wrapping the app content (inside `ThemeProvider`, outside `Router`), and render `<BlockingOverlay />` as a sibling to `<AppRoutes />`.

### 5. Integrate With Critical Actions
Update the following high-impact mutation hooks to use `useBlockingMutation` or manually call `startBlocking`/`stopBlocking`:

| Hook/Component | Action |
|---|---|
| `useStartMeeting` | Start Meeting button |
| `useProcessMeetingOutcome` | Approve/Reject/Defer outcome |
| `useConvertToIPRegistration` | Convert IP application |
| `useConvertToEmployerRegistration` | Convert ER application |
| `useCancelMeeting` / `useRescheduleMeeting` | Cancel/Reschedule |
| `useBnBulkPayableAction` | Bulk payable actions |
| `useBnScheduleRowAction` | Bulk schedule actions |
| Form submission handlers (registration steps) | Save/Submit forms |
| Document upload handlers | File uploads |

For each, replace `useMutation` with `useBlockingMutation` or wrap the async call with `startBlocking`/`stopBlocking`.

### 6. Error & Timeout Handling
- On mutation error: `stopBlocking()` is called via `onSettled`, overlay clears, error toast shown
- 30-second timeout: If `isBlocking` stays true for 30s, auto-clear with warning toast "Operation timed out — please check your data"
- `stopBlocking` is idempotent — multiple calls are safe

## Files Modified

| File | Change |
|---|---|
| `src/contexts/GlobalBlockingContext.tsx` (new) | Context with ref counter, start/stop, timeout |
| `src/components/ui/BlockingOverlay.tsx` (new) | Full-screen overlay component |
| `src/hooks/useBlockingMutation.ts` (new) | Drop-in blocking mutation wrapper |
| `src/App.tsx` | Add `GlobalBlockingProvider` + `<BlockingOverlay />` |
| `src/hooks/useMeetings.ts` | Switch critical mutations to `useBlockingMutation` |
| `src/hooks/useProcessMeetingOutcome.ts` | Switch to `useBlockingMutation` |
| `src/hooks/useConvertToIPRegistration.ts` | Switch to `useBlockingMutation` |
| `src/hooks/useConvertToEmployerRegistration.ts` | Switch to `useBlockingMutation` |
| `src/hooks/bn/useBnPayablesQueue.ts` | Switch bulk action to `useBlockingMutation` |
| `src/hooks/bn/useBnSchedule.ts` | Switch bulk action to `useBlockingMutation` |

## What Is NOT Changed
- No database changes needed — this is purely a frontend interaction pattern
- No changes to existing API/RPC logic
- No changes to React Query cache or audit interceptor
- Local component spinners remain as secondary visual feedback inside buttons

## Scalability
Any future feature can use either:
1. `useBlockingMutation(options, 'Saving...')` — automatic blocking
2. `const { startBlocking, stopBlocking } = useGlobalBlocking()` — manual control

This becomes the enforced standard per the governance policy.

