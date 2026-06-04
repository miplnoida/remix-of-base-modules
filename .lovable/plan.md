## Goal
1. Immediately unlock `admin@secureserve.gov` (currently locked until 2026-06-04 11:44 UTC, 7 failed attempts).
2. Add a proper "Unlock User" action in the admin UI.
3. Add a "Lockout Exemption" flag so designated accounts (e.g. system admins) never get auto-locked.

## Changes

### 1. Immediate unlock (data fix)
Run an update on `profiles` for `admin@secureserve.gov`:
- `locked_until = NULL`
- `failed_login_attempts = 0`

### 2. Schema: lockout-exemption flag
Migration on `profiles`:
- Add `lockout_exempt BOOLEAN NOT NULL DEFAULT false`
- Set `lockout_exempt = true` for `admin@secureserve.gov` as part of the same migration.

### 3. Login flow update (`src/contexts/SupabaseAuthContext.tsx`)
- Include `lockout_exempt` in the profile select.
- Skip the "account is locked" check when `lockout_exempt` is true.
- On failed login for an exempt user: still increment `failed_login_attempts` for visibility, but never set `locked_until`.
- On successful login: existing reset of attempts/lock continues to apply.

### 4. Admin UI — Unlock action
In `src/pages/admin/users/UserList.tsx` and `UserView.tsx`:
- Replace the ambiguous Lock/Unlock icon (which today toggles `is_active`) with two distinct actions:
  - **Activate/Deactivate** (toggles `is_active`)
  - **Unlock account** (visible only when `locked_until > now()` OR `failed_login_attempts > 0`) — clears `locked_until` and resets `failed_login_attempts`, writes `system_audit_trail` entry.
- Show a "Locked" badge with the unlock-until timestamp.

### 5. Admin UI — Lockout exemption
In `src/pages/admin/users/UserEdit.tsx` (and shown read-only in `UserView.tsx`):
- Add a switch **"Exempt from auto-lockout"** (admin-only, requires `system_admin` permission).
- Persists to `profiles.lockout_exempt`.
- Audit-log every change (old → new value) to `system_audit_trail`.

### 6. Audit + safety
- All unlock and exemption changes recorded via existing `logAuditTrail` service with `module: 'Security'`.
- Exemption toggle restricted to users with `system_admin` permission in the UI; document that DB-level enforcement is via app role check (RLS is intentionally off per project rule).

## Technical notes
- No RLS changes (per project constraint).
- No new tables; just one column on `profiles`.
- `auth-logs` shows the account exists and is reachable; only lockout state needs resetting.
- The existing `admin-update-password` edge function already resets login state on password change — no change needed there.

## Out of scope
- Per-IP or per-role exemption lists (can be added later if needed).
- Changing the 5-attempt threshold or 30-min duration (keep current policy).
