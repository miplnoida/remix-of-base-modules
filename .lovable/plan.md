## Add per-row "Sync" column to remaining C3 Configuration tabs

Mirror the pattern already wired in `HolidayPayPolicyDefaultTab` / `BonusPolicyExceptionsTab` for the three remaining tabs. Frontend-only — no schema or business-logic changes.

### Files to edit

1. **`src/components/admin/c3-configuration/HolidayPayPolicyExceptionsTab.tsx`**
2. **`src/components/admin/c3-configuration/IncomeCodePolicyDefaultTab.tsx`**
3. **`src/components/admin/c3-configuration/IncomeCodePolicyExceptionsTab.tsx`**

### Per-file changes (identical pattern)

- Import `C3RowSyncStatus, useLastSuccessfulC3PublishAt` from `@/components/admin/c3-configuration/C3RowSyncStatus`.
- Inside the component: `const { data: globalLastPublishedAt } = useLastSuccessfulC3PublishAt();`
- Add a header cell before "Actions":
  ```tsx
  <TableHead className="w-[60px] text-center">Sync</TableHead>
  ```
- Add a body cell before the Actions cell in each `<TableRow>`:
  ```tsx
  <TableCell className="text-center">
    <C3RowSyncStatus
      lastPublishedAt={(row as any).last_published_at}
      modifiedOn={(row as any).modified_on}
      createdOn={(row as any).created_on}
      globalLastPublishedAt={globalLastPublishedAt}
    />
  </TableCell>
  ```
  using `exc` for both Exceptions tabs and `p` for `IncomeCodePolicyDefaultTab`.

### Behavior

- Green check when row's `modified_on`/`created_on` ≤ baseline (row's own `last_published_at` if present, else last successful publish in `c3_config_sync_log`).
- Amber alert when the row was edited/inserted after the last successful sync — consistent with the global "Changes Pending Sync" badge already fixed via the SHA-256 hash in `useC3ConfigPublish.ts`.

### Verification

- Open `/admin/c3-configuration` → each of the 3 tabs now shows the Sync column.
- Edit any row or add a new one → that row immediately shows the amber pending icon and the global header badge flips to "Changes Pending Sync".
- After publishing successfully → all rows return to green.
