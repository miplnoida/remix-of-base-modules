## Root cause

The satellite app's exchange flow is wired correctly. The SSO is failing at step 1 (in the central app) — `navigateToSatellite()` is **never invoked**, so the browser is sent to the satellite with **no `?code`** parameter and the satellite, with no session in its `localStorage`, redirects to `/login` as expected.

Why it isn't invoked:

- The satellite is registered in `app_modules.base_url` as **`https://internalaudit.secureserve.biz`**.
- Our whitelist in `src/lib/satelliteSso.ts` only contains **`audit.secureserve.biz`**.
- `isSatelliteUrl()` therefore returns `false`, and `SidebarMenuLink` falls back to `window.location.href = url` — a plain redirect with no exchange code.

Confirmed with edge-function logs: `auth-issue-exchange-code` and `auth-redeem-exchange-code` show **no invocations**, so the satellite's `/auth/exchange` page is never reached. (`internalaudit.secureserve.biz` resolves; `audit.secureserve.biz` does not.)

## Fix (central project — this repo)

### 1. `src/lib/satelliteSso.ts` — register the real satellite host

Replace the `SATELLITE_HOSTS` map with the actual hosts:

```ts
const SATELLITE_HOSTS: Record<string, string> = {
  'internalaudit.secureserve.biz': 'internal_audit',
  // Lovable preview origins of the satellite (so SSO works before/without DNS):
  'nexus-guardian-sync.lovable.app': 'internal_audit',
  'id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app': 'internal_audit',
};
```

Keep the existing `audit.secureserve.biz` entry too (harmless if DNS is added later).

### 2. `supabase/functions/_shared/sso-cookies.ts` — allow the real origin in CORS

`ALLOWED_ORIGINS` already includes the Lovable preview origin and `audit.secureserve.biz`, but it does NOT include `https://internalaudit.secureserve.biz`. Add it so the satellite's `fetch(REDEEM_URL, …)` from that origin doesn't get blocked by CORS:

```ts
'https://internalaudit.secureserve.biz',
```

(Leave the rest of the list intact.)

### 3. Redeploy `auth-redeem-exchange-code` and `auth-issue-exchange-code`

Both import `_shared/sso-cookies.ts`, so they need to be redeployed for the new `ALLOWED_ORIGINS` to take effect. Deployment is automatic on save.

## No changes needed in the satellite project

- `/auth/exchange` route exists.
- `AuthExchange.tsx` correctly POSTs the code, calls `supabase.auth.setSession`, and navigates.
- Once the central app actually sends the user to `…/auth/exchange?code=…`, the existing satellite code will complete the handoff.

## How to verify after the change

1. From `admin.secureserve.biz` (logged in), click an Internal Audit child link.
2. Network tab: `POST /functions/v1/auth-issue-exchange-code` → 200 with `{ code }`.
3. Browser navigates to `https://internalaudit.secureserve.biz/auth/exchange?code=…`.
4. Satellite shows "Signing you in…", calls `POST /functions/v1/auth-redeem-exchange-code` → 200, then lands on `/audit/dashboard` without the login screen.
5. `auth-redeem-exchange-code` edge logs now show invocations (currently empty).

## Out of scope

No changes to roles, RLS, sidebar data, or the satellite's auth code.
