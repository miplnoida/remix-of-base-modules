## Findings

I checked the current central app and the Internal Audit satellite project. The backend table now exists and the root `internal_audit` module has `base_url = https://internalaudit.secureserve.biz`, so the earlier database issue is mostly fixed.

The remaining failure is likely caused by two implementation gaps:

1. **Central sidebar grouped links can still bypass the SSO helper**
   - The active sidebar renderer is `src/components/sidebar/SidebarMenuGroup.tsx`.
   - It uses `SidebarMenuLink` only for top-level leaf items.
   - Nested items ultimately use plain React Router links unless rendered through `SidebarMenuLink`.
   - If an Internal Audit nested link is treated as a normal router link, it opens the satellite route without `/auth/exchange?code=...`, so the satellite correctly redirects to its login page.

2. **Satellite exchange page has not fully applied the compatibility patch**
   - In `SocialServe-Internal Audit`, `src/pages/auth/AuthExchange.tsx` still reads only `params.get('code')` before redeeming.
   - It contains a later unused line for `code ?? sso_code`, but that happens after redeem, so legacy `?sso_code=` links still fail.
   - It also does not explicitly wait for `setSession()` persistence to settle before moving to a protected route.

There is also a possible hard-fail in the redeem function: it binds the exchange code to both browser user-agent and IP. If the request path through hosting/CDN changes the apparent IP between issue and redeem, the redeem function returns `binding_mismatch`, then the satellite goes to login. I did not see redeem logs yet, which suggests the satellite may not be reaching redeem at all, but the function should still be made more observable and less brittle.

## Plan

### 1. Fix central sidebar navigation so every external satellite link goes through SSO

Update the active sidebar tree renderer so all leaf links, including nested links, use `SidebarMenuLink` instead of plain React Router links.

This will ensure any URL like:

```text
https://internalaudit.secureserve.biz/audit/audits
```

is handled by:

```text
navigateToSatellite()
  -> auth-issue-exchange-code
  -> https://internalaudit.secureserve.biz/auth/exchange?code=...&redirect_path=/audit/audits
```

instead of directly opening `/audit/audits` and hitting the satellite login guard.

### 2. Correct Internal Audit grouping logic for external URLs

`groupInternalAuditNavigation()` currently normalizes and compares the full URL against internal route paths such as `/audit/dashboard`. Once `base_url` is inherited, those comparisons no longer reliably match.

I will update the normalizer to extract the pathname from full URLs before grouping and active-state checks. This preserves the current menu grouping while allowing the link itself to remain a full external URL.

### 3. Patch the satellite `AuthExchange.tsx`

In the [SocialServe-Internal Audit](/projects/7e98fc6b-f149-4e9f-9fd2-cbef90aba410) project, update `src/pages/auth/AuthExchange.tsx` to:

- Read both `?code=` and legacy `?sso_code=` before calling redeem.
- Preserve the `redirect_path` fallback.
- Call `supabase.auth.setSession()` and then verify `supabase.auth.getSession()` before navigating.
- Navigate with `replace: true` only after a session exists.
- Keep `/auth/exchange` as a public route.

### 4. Harden SSO backend diagnostics and reduce false login fallbacks

Update `auth-issue-exchange-code` and `auth-redeem-exchange-code` to add non-sensitive structured logs:

- app id
- redirect path
- success/failure reason
- code expiry/failure category

I will also adjust IP binding so it does not fail legitimate users due to CDN/proxy IP changes. User-agent binding and single-use/short TTL protections remain in place.

### 5. Redeploy the SSO backend functions

Redeploy:

- `auth-issue-exchange-code`
- `auth-redeem-exchange-code`

Then validate their logs show issue/redeem attempts.

### 6. Validate the full flow

After implementation, validate:

```text
Central sidebar click
  -> external Internal Audit URL detected
  -> exchange code issued
  -> browser lands on /auth/exchange?code=...
  -> satellite redeems code
  -> satellite stores session
  -> satellite opens requested /audit/... route
```

I will also check that direct navigation to `https://internalaudit.secureserve.biz/audit/...` still redirects to login, because direct cross-domain localStorage sharing is not possible. The supported flow remains starting from the central app sidebar/menu link.