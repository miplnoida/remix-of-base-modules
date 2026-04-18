

## Plan: Single source of truth for Session Timeout — Password Policy only

### Decision
- **Remove** the "Session Timeout (Minutes)" field from Global Settings → Security tab.
- **Keep** session-timeout configuration **only** in the Password Policy screen, as the single source of truth.
- **Align** session behavior to industry-standard sliding idle timeout with absolute ceiling.

### Industry-standard model (final shape on Password Policy)
| Setting | Default | Meaning |
|---|---|---|
| `idle_timeout_minutes` | **30** | Sliding idle window. Resets on any user activity (DOM events + network calls + cross-tab activity). |
| `session_timeout_minutes` | **480** | Absolute ceiling. Hard logout regardless of activity (8h). Never reset on token refresh. |
| Idle warning lead | 2 min before idle limit | Modal warning with "Stay signed in" |

These two are the only knobs. No duplicate setting in Global Settings.

---

### A. Database — one migration

**File:** `supabase/migrations/<ts>_session-timeout-single-source.sql`

1. `UPDATE password_policies SET idle_timeout_minutes = 30, session_timeout_minutes = 480 WHERE is_active = true;`
2. `UPDATE system_settings SET is_active = false WHERE setting_key = 'session_timeout_minutes';` (soft-retire — keeps audit history; no row deletion).
3. Comment on `password_policies.idle_timeout_minutes` / `session_timeout_minutes` documenting them as the canonical session-timeout source.

Idempotent, safe on Test & Live.

---

### B. Frontend — Global Settings → Security tab

**File:** `src/pages/global-settings/SecuritySettings.tsx` (and any sub-component holding the field)

- Remove the "Session Timeout (Minutes)" input, its label, validation, and the corresponding `setting_key='session_timeout_minutes'` read/write.
- Replace with a small read-only info card: *"Session timeout is configured under **Password Policy**."* with a link/button to `/global-settings/password-policy`.
- Remove any imports / handlers that become unused.

---

### C. Frontend — Password Policy screen

**File:** `src/pages/global-settings/PasswordPolicy.tsx` (or equivalent)

- Ensure the form exposes both fields with clear copy:
  - **Idle Timeout (minutes)** — "Logs the user out after this many minutes of inactivity. Resets on any activity."
  - **Maximum Session Duration (minutes)** — "Absolute ceiling regardless of activity."
- Validation: `1 ≤ idle ≤ 240`, `idle ≤ session ≤ 1440`.
- Save via existing `password_policies` upsert (no schema change needed).

---

### D. Frontend — Auth context (industry-standard sliding session)

**File:** `src/contexts/SupabaseAuthContext.tsx`

1. **Remove** any read of `system_settings.session_timeout_minutes`. Read both values exclusively from the active `password_policies` row.
2. **Sliding idle**: existing DOM-event tracker stays. Add:
   - Global `fetch` wrapper → calls `updateActivity()` on every successful response (covers React-Query, supabase-js, axios). Background data activity counts as activity.
   - `BroadcastChannel('auth-activity')` to sync `lastActivityRef` across tabs (with `localStorage` fallback).
3. **Absolute ceiling**: stop resetting `sessionStartRef` on `TOKEN_REFRESHED` so the 8h hard limit is real.
4. **Audit logging**: add `logSecurity` entries for `idle_timeout_logout`, `absolute_timeout_logout`, and `token_refreshed`.
5. No change to Supabase JWT/refresh settings — `autoRefreshToken` stays on; refresh is silent.

---

### E. Memory update

**File:** `mem://security/session-and-inactivity-standards`

Replace existing text with:
> Session timeout has a **single source of truth: `password_policies`**. `idle_timeout_minutes` (default 30) is a sliding idle window reset on any user activity (DOM events, network calls, cross-tab sync). `session_timeout_minutes` (default 480) is the absolute ceiling, never reset on token refresh. The duplicate field on Global Settings → Security has been removed; `system_settings.session_timeout_minutes` is retired (kept inactive for audit). Auth context reads policy only; activity tracker covers DOM + fetch + BroadcastChannel.

---

### Files
- **Create:** `supabase/migrations/<ts>_session-timeout-single-source.sql`
- **Edit:** `src/pages/global-settings/SecuritySettings.tsx` (remove field + add info card)
- **Edit:** `src/pages/global-settings/PasswordPolicy.tsx` (clarify labels/help text + validation)
- **Edit:** `src/contexts/SupabaseAuthContext.tsx` (sliding idle + fetch wrapper + BroadcastChannel + ceiling fix + audit logs)
- **Update:** `mem://security/session-and-inactivity-standards`

### Why this is safe
- No RLS, no JWT/refresh changes, no edge function changes.
- `system_settings` row preserved (set inactive) — audit history intact.
- Migration idempotent; client changes are additive (worst-case fallback = current behavior with corrected 30-min idle).

### Verification
1. Global Settings → Security: "Session Timeout" field is gone; info card points to Password Policy.
2. Password Policy: editing Idle Timeout / Max Session Duration takes effect immediately for the next session.
3. Active reading with React-Query refetch every 60s → no logout for ≥ 30 min.
4. Two tabs, work in tab A → tab B's idle timer also resets.
5. True idle ≥ 30 min → warning at 28 min, logout at 30 min, redirect to `/login`.
6. Continuous active use > 8h → forced logout at 480 min ceiling.
7. Token refresh at 60 min → silent, audit log entry written.

