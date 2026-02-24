# Admin Password Update & Login Process

## Module: UserManagement / Authentication
## Last Modified: 2026-02-24

---

## 1. Admin Password Update (`admin-update-password` edge function)

### Behavior
- Admin users can reset any user's password via `/admin/users/update-password`.
- The frontend sends `identity_user_id` (profile ID = Supabase auth user ID) and `new_password`.
- The edge function:
  1. Verifies caller is authenticated and has `Admin` role.
  2. Looks up the user in `profiles` table by ID.
  3. Calls `supabase.auth.admin.updateUserById(id, { password })` to update in Supabase Auth.
  4. **Syncs profile email** with auth email if they differ (prevents login failures).
  5. Updates `profiles.last_password_change`, `force_password_change = false`.
  6. Logs to `system_audit_trail` and `system_technical_logs`.

### Input
```json
{ "identity_user_id": "<uuid>", "new_password": "<string>" }
```

### Output
```json
{ "success": true, "message": "Password updated successfully" }
```

### Dependencies
- `profiles` table (user lookup, email sync)
- `user_roles` table (admin check)
- Supabase Auth Admin API

---

## 2. Login Process (`SupabaseAuthContext.login()`)

### Behavior
1. **Email Resolution**: Calls `resolve-auth-email` edge function to check if profile email differs from auth email. If so, uses the auth email for login.
2. **Account Checks**: Queries profile for `is_active`, `locked_until`, `failed_login_attempts`.
3. **Authentication**: Calls `supabase.auth.signInWithPassword({ email, password })`.
4. **Lockout**: After 5 failed attempts, locks account for 30 minutes.
5. **Force Password Change**: If `force_password_change` is true, redirects to change-password screen.

### Email Resolution (`resolve-auth-email` edge function)
- Called before login with the email user entered.
- Looks up profile by email → gets auth user by profile ID → compares emails.
- If emails differ, syncs profile email to auth email and returns the auth email.
- `verify_jwt = false` (pre-authentication).

### Known Issue (Fixed 2026-02-24)
**Root Cause**: Profile email could become out of sync with Supabase Auth email (e.g., when admin changes email in one system but not the other). Login used profile email for `signInWithPassword`, but auth had a different email → "Invalid credentials".

**Fix**: 
1. `admin-update-password` now syncs profile email with auth email after password update.
2. Login flow resolves auth email before calling `signInWithPassword`.
3. `resolve-auth-email` edge function auto-syncs mismatched emails.
