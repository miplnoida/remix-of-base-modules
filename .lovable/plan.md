## Issue
After creating a new Period Configuration via `C3ConfigCreateDialog`, the header still shows the green "Synced" badge instead of the red "Changes Pending Sync" badge until a manual refresh.

## Root Cause
`src/components/admin/c3-period-config/C3ConfigCreateDialog.tsx` (line 96) only invalidates `['c3-config-periods']` after a successful create. It does **not** invalidate `['c3-sync-status']`, which is what `C3PublishButton` reads to compute the pending-changes badge.

Every other mutation in the C3 config area (update, lifecycle, details dialog, etc.) correctly invalidates `['c3-sync-status']` — only the create dialog is missing it.

## Fix
Add a single line in `C3ConfigCreateDialog.tsx` right after the existing `c3-config-periods` invalidation:

```ts
queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] });
```

That forces `useC3SyncStatus` to rebuild the payload, recompute the hash, compare against the last published hash, and flip the badge to "Changes Pending Sync".

## Files
- `src/components/admin/c3-period-config/C3ConfigCreateDialog.tsx` — add the invalidation.

## Verification
1. Open `/admin/c3-configuration`, confirm badge shows "Synced".
2. Click "+ New Period", save a new period.
3. Badge should immediately switch to "Changes Pending Sync" without a page refresh.
