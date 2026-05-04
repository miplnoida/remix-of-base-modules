## Findings

The current behavior is still falling back to the satellite login because the central app is not actually treating the Internal Audit menu URLs as external satellite URLs:

- The `app_modules` rows for Internal Audit currently have `base_url = null` in both Test and Live backend data.
- Because `base_url` is null, `useDynamicNavigation()` builds URLs like `/audit/dashboard` instead of `https://internalaudit.secureserve.biz/audit/dashboard`.
- Those relative URLs never trigger `navigateToSatellite()`, so no one-time SSO code is issued.
- The SSO exchange-code table also does not exist in the active backend (`auth_exchange_codes` is missing), so even if navigation reached the issue function, exchange-code issuance would fail.
- The satellite app does have `/auth/exchange`, but it only sets a session if it receives a valid `?code=...`. Directly opening `/audit/...` on the satellite will still go to `/login`, because no code is present.

## Plan

1. **Create/repair the SSO exchange-code backend table**
   - Add a migration for `auth_exchange_codes` in the active backend.
   - Keep it service-role only so client code cannot read or write exchange codes.
   - Include indexes for expiry and user lookup.
   - Keep the cleanup function for expired/consumed codes.

2. **Point Internal Audit navigation to the satellite application**
   - Add a migration that sets `base_url = 'https://internalaudit.secureserve.biz'` on the root `internal_audit` module.
   - Because `useDynamicNavigation()` already inherits `base_url` from parent modules, all Internal Audit child routes will become full satellite URLs such as:
     - `https://internalaudit.secureserve.biz/audit/dashboard`
     - `https://internalaudit.secureserve.biz/audit/audit-plans`
     - `https://internalaudit.secureserve.biz/audit/audits`
   - This will cause sidebar clicks to call `navigateToSatellite()` instead of local navigation.

3. **Make SSO navigation preserve the requested page reliably**
   - Update `src/lib/satelliteSso.ts` to pass the requested path to the satellite exchange page as a `redirect_path` query parameter in addition to the one-time code:
     - `/auth/exchange?code=...&redirect_path=/audit/audit-plans`
   - Keep the server-stored redirect path as the source of truth, but include the URL parameter as a safe fallback for compatibility.
   - Correct the stale comments that still mention `sso_code` even though the implementation uses `code`.

4. **Redeploy the SSO backend functions**
   - Deploy `auth-issue-exchange-code` and `auth-redeem-exchange-code` after the migration/code changes.

5. **Apply the required satellite-side compatibility fix**
   - In the satellite project, update `src/pages/auth/AuthExchange.tsx` to support both:
     - `?code=...`
     - legacy `?sso_code=...` if any old link still sends it
   - When redeem succeeds, navigate to:
     - `data.redirect_path`, or
     - the safe `redirect_path` URL parameter fallback, or
     - `/audit/dashboard`
   - This ensures the user lands on the actual requested Internal Audit screen after SSO.

6. **Validation after approval**
   - Confirm that the Internal Audit menu URLs are now full satellite URLs.
   - Confirm `auth_exchange_codes` exists.
   - Check function logs / function calls for issue and redeem activity.
   - Verify the expected flow:

```text
Central app sidebar click
  -> auth-issue-exchange-code creates one-time code
  -> browser opens https://internalaudit.secureserve.biz/auth/exchange?code=...
  -> satellite redeems code
  -> satellite stores session
  -> satellite redirects to requested /audit/... route
```

## Important note

Opening `https://internalaudit.secureserve.biz/audit/...` directly in a new tab without first coming through the central app cannot share localStorage automatically across domains. The supported flow is: user starts in the central app, clicks the Internal Audit menu/link, and the central app sends the user through `/auth/exchange` with a one-time code.