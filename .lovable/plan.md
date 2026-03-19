

# Fix "Access Denied" for Self Employed Contribution Rates

## Root Cause

**Module name mismatch between database and frontend.**

| Layer | Module Name Used |
|-------|-----------------|
| Database (`app_modules.name`) | `self_employed_contrib_rates` |
| Database (`role_permissions`) | Grants exist for `self_employed_contrib_rates` |
| Frontend page (`MODULE_NAME`) | `sep_contrib_rate_management` |
| Frontend constant (`MODULE_NAMES.SEP_CONTRIB_RATE`) | `sep_contrib_rate_management` |

The `useActionPermissions` hook calls `get_user_permissions` RPC, which returns permissions keyed by `module_name: 'self_employed_contrib_rates'`. The hook then filters with `.filter(p => p.module_name === 'sep_contrib_rate_management')` — which matches nothing. So `can('view')`, `can('create')`, etc. all return `false` for non-admin users, making the page appear access-denied.

## Fix (2 files, 2 lines)

### File 1: `src/pages/admin/SepContribRateManagement.tsx`
- Line 38: Change `MODULE_NAME` from `"sep_contrib_rate_management"` to `"self_employed_contrib_rates"`

### File 2: `src/hooks/useActionPermission.ts`
- Line 85: Change `SEP_CONTRIB_RATE` constant from `'sep_contrib_rate_management'` to `'self_employed_contrib_rates'`

No database changes needed. No route changes needed. The permissions already exist in the database — the frontend was just looking them up under the wrong name.

