# Fix: SSO failing for Compliance satellite

## Root cause

`supabase/functions/_shared/sso-cookies.ts` defines `ALLOWED_ORIGINS` for the SSO edge functions (`auth-issue-exchange-code`, `auth-redeem-exchange-code`). The list currently contains only SocialServe + Internal Audit hosts:

```
admin.secureserve.biz
audit.secureserve.biz
internalaudit.secureserve.biz
social-wellspring-app.lovable.app
nexus-guardian-sync.lovable.app
id-preview--455cbbae-...lovable.app    (SocialServe preview)
id-preview--7e98fc6b-...lovable.app    (Internal Audit preview)
```

`compliance.secureserve.biz` and the Integrated Compliance Hub preview host (`id-preview--8471f73c-...lovable.app`) are missing.

In `corsHeadersFor()`, when the caller's `Origin` is not in the allow-list, the response sends `Access-Control-Allow-Origin: <first allowed origin>` instead of the caller's origin. The browser rejects the preflight, so `auth-redeem-exchange-code` never completes and the satellite drops back to its login screen.

The issue side (`auth-issue-exchange-code`) works because it's called from SocialServe (admin.secureserve.biz) which IS allow-listed — that's why edge logs already show codes being issued for `app: "compliance"`. The breakage is on the redeem side, called from the satellite.

## Fix

1. Edit `supabase/functions/_shared/sso-cookies.ts` and add to the default `ALLOWED_ORIGINS_RAW`:
   - `https://compliance.secureserve.biz`
   - `https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app`
   - (optionally) the published `.lovable.app` URL of the satellite once known

2. Redeploy both edge functions that import this helper:
   - `auth-issue-exchange-code`
   - `auth-redeem-exchange-code`

3. Verify by clicking the Compliance & Enforcement tile from SocialServe → satellite `/auth/exchange?code=...` should succeed and land on `/compliance/workbench` already authenticated. Confirm via `auth-redeem-exchange-code` edge logs showing `[sso-redeem] session minted`.

No DB changes, no satellite-project changes, no auth/RLS changes.
