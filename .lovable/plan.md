## Goal
Unblock Live publish by removing the hardcoded admin API key from the frontend bundle and redacting it from historical migration files. This is the security finding most likely causing "Publishing failed".

## Changes

### 1. `src/lib/wizApiConfig.ts` — remove client-side secret
- Delete the `FALLBACK_ADMIN_KEY = "uiop906754drd35fvg"` constant.
- When the DB-driven `OUTBOUND_ADMIN_API_KEY` setting is missing/empty, throw a clear configuration error instead of falling back. The browser should never carry an admin key — privileged calls already go through edge functions that read `WIZ_ADMIN_API_KEY` from project secrets.
- Keep `FALLBACK_BASE_URL` (non-secret, just a URL).

### 2. Historical migration files — redact the leaked literal
Files containing the same hardcoded key as seed data:
- `supabase/migrations/20260417193941_*.sql`
- `supabase/migrations/260417122616_*.sql`

Replace the literal `'uiop906754drd35fvg'` in the `c3_site_settings` seed rows with a placeholder like `'__SET_VIA_BACKEND_SECRET__'`. These migrations have already run on Live, so this edit is purely to clear the security scanner — no DB rerun needed.

### 3. Live database configuration (manual, post-publish)
Live `c3_site_settings` currently has 0 rows for these keys. After publish succeeds, the user must insert the real `OUTBOUND_ADMIN_API_KEY` (and confirm `WIZ_ADMIN_API_KEY` project secret on Live) so C3-Wizard sync keeps working. I'll provide the exact insert statement when we get there.

### 4. Verification
- `rg` for the literal key across the repo to confirm zero matches.
- Run `vite build` to confirm a clean production build.
- Ask user to retry Publish.

## Out of scope
- Rotating the actual key on the C3-Wizard side (recommended, but user-driven).
- Any UI/business-logic changes.

## Technical notes
- `WIZ_ADMIN_API_KEY` already exists as a backend secret and is the correct path for privileged C3-Wizard calls.
- No migrations are being executed; only static SQL files are edited to satisfy the secret scanner.
