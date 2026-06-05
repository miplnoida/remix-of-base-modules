
## Goal

Make the same Developer Information experience available on **Compliance & Enforcements → Dashboard → Manager Dashboard** (`/compliance/workbench/manager`) that already works on `/c3-management/dashboard`, including the Re-analyze (AI auto-extract) button.

## Findings

- The FAB component `DeveloperInfoFAB` is already mounted globally in `src/components/layout/AppLayout.tsx`, so the `</>` button already appears on every authenticated route — including the Compliance Manager Dashboard — for Super Admin users when the `developer_info_enabled` system setting is `true`.
- `DeveloperInfoModal` calls `developerInfoService.getScreenByRoute(currentRoute)`. If no `dev_info_screens` row exists for the current route, the modal shows "No Developer Information" and the **Re-analyze** button is hidden (it is gated by `devInfo?.screen`).
- The `analyze-screen-devinfo` edge function only updates an existing `dev_info_screens` row; it cannot create one.
- Therefore the Manager Dashboard route is missing a seed row. The C3 Management Dashboard has one, which is why the full UI (Overview, Tables, Logic, Re-analyze, etc.) renders there.

## Plan

### 1. Seed `dev_info_screens` row for the Manager Dashboard

Add a Supabase migration inserting one row:

```
screen_code:    'COMPLIANCE_MANAGER_DASHBOARD'
screen_name:    'Compliance Manager Dashboard'
module_name:    'Compliance & Enforcement'
submodule_name: 'Dashboards'
route_url:      '/compliance/workbench/manager'
menu_path:      'Compliance & Enforcement > Dashboard > Manager Dashboard'
screen_type:    'dashboard'
documentation_status: 'pending'
is_active:      true
```

Use `ON CONFLICT (screen_code) DO NOTHING` (or equivalent `WHERE NOT EXISTS`) so reruns are safe. Follow the existing public-schema GRANT pattern already applied to `dev_info_screens`.

### 2. Make Re-analyze available on first open

So the same self-bootstrapping behavior works for any future dashboard without another migration, update the modal to render the **Re-analyze** button even when no `devInfo.screen` exists yet, and extend the flow to auto-create a minimal `dev_info_screens` row before invoking the AI analyzer.

Two small changes:

- `src/services/developerInfoService.ts` — add `ensureScreenForRoute(routeUrl, fallbackName)` that inserts a stub row if none exists and returns the row.
- `src/components/developer-info/DeveloperInfoModal.tsx` — when `devInfo` is null, show a "Generate documentation" button that calls `ensureScreenForRoute` then `triggerAIAnalysis`, then reloads. The existing **Re-analyze** button stays as-is for screens that already have data.

This preserves the C3 Dashboard behavior 1:1 and gives Manager Dashboard (and any other route) the identical experience including Re-analyze.

### 3. Verification

- Sign in as Super Admin, enable `developer_info_enabled`.
- Visit `/compliance/workbench/manager` → click the floating `</>` button → modal opens with Route shown, sections render (initially empty), Re-analyze/Generate button visible.
- Click Re-analyze → edge function runs, sections populate (Overview, Business Purpose, Tables, Logic, Actions, Dependencies, Audit), badge shows `auto extracted`.
- Confirm Copy and Export buttons produce the same JSON output as on the C3 dashboard.

## Files to change

- `supabase/migrations/<timestamp>_seed_devinfo_compliance_manager_dashboard.sql` (new)
- `src/services/developerInfoService.ts` (add `ensureScreenForRoute`)
- `src/components/developer-info/DeveloperInfoModal.tsx` (allow generate-on-empty)

No changes to the FAB, edge function, or routing required.
