

# Fix Unexpected Session Logouts During Active Use

## Root Cause Analysis

**Database configuration**: The `password_policies` table has `idle_timeout_minutes = 15`, while the `session_timeout_minutes` in `system_settings` is 480 (8 hours). This means users get logged out after just 15 minutes of no mouse/keyboard activity — even if they're reading a long page or stepped away briefly.

**Critical code bug**: The `useEffect` that runs the timeout checker (line 244) depends on `[session, logout, ...]`. The `logout` callback depends on `[user, profile]` (line 171). Every time `profile` or `user` state changes, `logout` is recreated, which **tears down and recreates the interval and all activity listeners**. During this brief gap, no activity events are captured. More importantly, if `loadSessionPolicy()` hasn't resolved yet when the interval first fires, it uses the hardcoded defaults (15-min idle), not the DB values.

**No warning before logout**: Users are logged out instantly with no chance to extend their session.

**Session replay confirms**: User was shown "Session expired due to inactivity" toast while the tab was open.

## Changes

### 1. Fix `logout` dependency causing interval churn (`SupabaseAuthContext.tsx`)

- Change `logout` to use a ref-based pattern (`logoutRef`) so the timeout `useEffect` doesn't depend on `logout` directly. This prevents the interval from being destroyed/recreated on every profile/user state change.
- Remove `logout` from the `useEffect` dependency array for the timeout checker.

### 2. Ensure policy is loaded before timeout checks begin

- Make `loadSessionPolicy()` an awaited call during `initializeAuth()`, and store a `policyLoadedRef` flag.
- In `checkTimeouts`, skip the check if policy hasn't loaded yet (prevents premature logout using 15-min defaults when DB says 30 min).

### 3. Add idle warning dialog before auto-logout

- Show a warning toast/dialog **2 minutes before** the idle timeout triggers, giving the user a chance to interact and reset the timer.
- Message: "Your session will expire in 2 minutes due to inactivity. Move your mouse or press any key to stay logged in."

### 4. Throttle `mousemove` activity tracking

- Wrap `updateActivity` with a throttle (e.g., update at most once per 10 seconds) to reduce unnecessary calls while still detecting real activity.

### 5. Reset `sessionStartRef` on token refresh

- When `TOKEN_REFRESHED` fires, also reset `sessionStartRef` so an active session doesn't hit the absolute session timeout while the user is actively working.

## Technical Details

All changes are in a single file: `src/contexts/SupabaseAuthContext.tsx`.

```text
Before:
  logout depends on [user, profile]
  → useEffect depends on [session, logout, ...]
  → interval recreated on every profile change
  → brief window with no activity tracking

After:
  logoutRef.current = logout  (updated via useEffect)
  → timeout useEffect depends on [session] only
  → interval stable across profile/user changes
  → activity tracking never interrupted
```

**Warning dialog flow:**
```text
idle 0 min ────── idle (T-2) min ──────── idle T min
                  │                       │
                  Show warning toast      Auto-logout
                  "2 min remaining"
```

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Fix logout ref pattern, stabilize timeout interval, add idle warning, throttle mousemove, reset sessionStart on token refresh, guard against unloaded policy |

