

## Plan: Fix Login Timeout — Make Auth Call Non-Blocking

### Root Cause

The `login()` function in `SupabaseAuthContext.tsx` (line 488-651) performs **5 sequential network calls** before returning `{ success: true }`:

```text
1. resolveAuthEmailPromise   → edge function (500ms timeout, but started async)
2. fetchProfileByEmail()     → DB query (awaited)
3. signInWithPassword()      → Supabase auth API (awaited) ← HANGS IN IFRAME
4. fetchProfile()            → DB query (awaited after success)
5. fetchRoles()              → DB query (awaited after success)
```

In the **editor preview iframe**, `signInWithPassword` hangs indefinitely due to the platform's fetch proxy interfering with `/auth/v1/token` POST requests. This is a known platform limitation documented in memory.

In the **share preview**, `signInWithPassword` works but steps 2+3+4+5 sequentially can exceed 10 seconds on cold connections, triggering the `LOGIN_SAFETY_TIMEOUT_MS` timer in `LoginScreen.tsx`.

The `login()` function currently **awaits profile+roles fetch after successful sign-in** (lines 627-630), which is redundant because `onAuthStateChange` with `SIGNED_IN` event already triggers `loadUserDataInBackground()` (line 423). The `loginJustCompletedRef` flag prevents double-fetching, but the problem is the login function blocks waiting for data it doesn't need to return.

### Fix Strategy

**Make `login()` return immediately after `signInWithPassword` succeeds.** Move profile/roles fetch to background. Add a hard timeout around `signInWithPassword` itself.

### Step 1: Add timeout to `signInWithPassword` call
**File**: `src/contexts/SupabaseAuthContext.tsx`

Wrap the `signInWithPassword` call in a `Promise.race` with an 8-second timeout. If it hangs (iframe proxy issue), return a clear error: "Authentication service is not responding. Please use the Share Preview link or published URL."

### Step 2: Remove blocking profile/roles await from `login()`
**File**: `src/contexts/SupabaseAuthContext.tsx`

Lines 627-638 currently await `Promise.all([fetchProfile, fetchRoles])` before returning success. Remove this await — the `onAuthStateChange` handler already calls `loadUserDataInBackground()` which does the same work. Just return `{ success: true }` immediately after `signInWithPassword` succeeds.

Keep the fire-and-forget profile update (reset failed_login_attempts, update last_login) — that's already non-blocking.

Keep the `force_password_change` check by doing a quick single-field query on the profile instead of the full fetch.

### Step 3: Remove redundant `loginJustCompletedRef` pattern
**File**: `src/contexts/SupabaseAuthContext.tsx`

Since `login()` will no longer pre-fetch profile/roles, the `loginJustCompletedRef` guard is unnecessary. The `onAuthStateChange` SIGNED_IN handler will always trigger `loadUserDataInBackground()` — no duplication to prevent.

### Step 4: Increase safety timeout or remove it
**File**: `src/components/auth/LoginScreen.tsx`

With the `signInWithPassword` timeout at 8s, the login function will always resolve in <9s. Keep the 10s safety timeout as a last-resort guard but it should never trigger in practice.

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Add 8s timeout to `signInWithPassword`; remove blocking profile/roles await after login; remove `loginJustCompletedRef` |
| `src/components/auth/LoginScreen.tsx` | No structural changes needed — the safety timeout stays as-is |

### Expected Result
- Login succeeds in 2-4s on share preview (signInWithPassword + return)
- Login shows a clear actionable error in editor iframe within 8s instead of a vague "taking too long"
- Profile/roles load in background via existing `onAuthStateChange` handler
- The 10s safety timeout becomes a true last-resort guard, not the primary failure mode

