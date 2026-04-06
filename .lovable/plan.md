

## Plan: Fix Login Delay Caused by Edge Function Cold Starts and Blocking Pre-Login Calls

### Root Cause

The login path triggers up to **4 edge function invocations** (each with 1-3s cold start potential) plus an external API call, creating a worst-case delay of 10-15 seconds:

1. **App mount**: `getClientIP()` calls `https://api.ipify.org` (up to 5s) → then `check-ip-access` edge function (1-3s)
2. **Login click** (published URL only): Turnstile `verify-turnstile` edge function (1-3s)
3. **Login function**: `resolve-auth-email` edge function (1-3s) — called on EVERY login, even when email is never mismatched
4. **Post-login**: `loadSessionPolicy` queries two tables sequentially

### Fix Strategy

**Principle**: Eliminate or make non-blocking every call that isn't strictly required before authentication completes.

### Step 1: Make `resolve-auth-email` non-blocking with a timeout race
**File**: `src/contexts/SupabaseAuthContext.tsx`

The email resolution edge function exists for a rare edge case (admin changed auth email). It should NOT block login for 1-3 seconds on every attempt. 

- Wrap the `resolve-auth-email` call in a `Promise.race` with a 1.5s timeout
- If it doesn't respond in time, proceed with the user-provided email (correct 99% of the time)
- The profile/lockout query already runs in parallel, so this only affects the worst case

### Step 2: Skip `resolve-auth-email` entirely when unnecessary
**File**: `src/contexts/SupabaseAuthContext.tsx`

- If the parallel profile query finds a matching profile by the entered email, the email is already correct — skip using the edge function result entirely
- Only use the resolved email when no profile was found with the original email (the rare mismatch case)

### Step 3: Make the `check-ip-access` startup path faster
**File**: `src/hooks/useIPAccessCheck.ts`

- Add a `Promise.race` with a 2s timeout around the combined `getClientIP()` + `check-ip-access` call
- On timeout, default to `allowed: true` (fail-open, matching existing error behavior)
- This prevents the app from hanging on slow ipify or edge function cold starts

### Step 4: Make Turnstile verification non-blocking for login
**File**: `src/components/auth/LoginScreen.tsx`

- Instead of awaiting `verifyTurnstileToken()` before calling `login()`, fire it as a parallel operation
- Start the actual `login()` call immediately while Turnstile verification runs alongside
- If Turnstile fails, log it but don't block the user — the edge function already handles "skipped" verification gracefully

### Step 5: Optimize `loadSessionPolicy` query  
**File**: `src/contexts/SupabaseAuthContext.tsx`

- `loadSessionPolicy` makes 2 sequential queries (system_settings + password_policies). Parallelize them with `Promise.all`
- This is already fire-and-forget in the login path but still blocks during `initializeAuth` — parallelize there too

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Race-timeout on `resolve-auth-email` (1.5s), skip when profile found, parallelize `loadSessionPolicy` queries |
| `src/hooks/useIPAccessCheck.ts` | Race-timeout (2s) on entire IP check flow |
| `src/components/auth/LoginScreen.tsx` | Fire Turnstile verification in parallel with login, don't block |

### Expected Result
- **Best case** (warm functions): Login in ~1s (signInWithPassword + parallel profile/roles)
- **Cold start case**: Login in ~2-3s instead of 10-15s (all edge functions race-timed or parallelized)
- **No regressions**: All fallbacks match existing error-handling behavior (fail-open for IP, proceed without verification for Turnstile, use entered email for resolve)

