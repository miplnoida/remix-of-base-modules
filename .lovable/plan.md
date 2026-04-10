

# Set Base URL for Benefit Management Module

## What This Does

Updates the `Benefit Management` parent module in the `app_modules` table to set `base_url = 'https://benefits.secureserve.biz'`. Once set, all child menu items under Benefit Management will automatically resolve their routes as external URLs (e.g., `https://benefits.secureserve.biz/bn/claims`). The existing sidebar infrastructure already handles this — `useDynamicNavigation` propagates `base_url` from parent to children, and `SidebarMenuLink` uses `window.location.href` for external URLs.

## Steps

### 1. Database Migration — Set `base_url` on the parent module

```sql
UPDATE app_modules
SET base_url = 'https://benefits.secureserve.biz'
WHERE id = '839cee37-4006-43a4-a53c-6d0cea76a6b0';
```

This single update cascades to all 13+ child modules automatically via the `useDynamicNavigation` hook's `effectiveBaseUrl` inheritance logic.

### 2. Verify Sidebar Navigation

After the migration, confirm that:
- Clicking any Benefit Management sub-item in the sidebar navigates to `https://benefits.secureserve.biz/bn/...`
- The sidebar correctly renders all child items with their icons and titles
- Non-benefit modules are unaffected

## No Code Changes Required

The existing infrastructure already supports this:
- `useDynamicNavigation.ts` line 176: `const effectiveBaseUrl = module.base_url || parentBaseUrl || null;`
- `useDynamicNavigation.ts` line 187-188: Prepends `base_url` to routes
- `SidebarMenuLink.tsx` line 20-28: Detects `http://` / `https://` and uses `window.location.href`

## Files Modified

| File | Change |
|---|---|
| **Migration (SQL)** | `UPDATE app_modules SET base_url = 'https://benefits.secureserve.biz'` on `benefit_management` row |

## Important Note

This assumes the satellite app at `https://benefits.secureserve.biz` is deployed and running with the shared backend credentials (same Supabase URL and anon key). If that app is not yet live, the sidebar links will navigate to it but the destination may not load.

