

# Fix Payment History Management — 4 Issues

## Issues Found

### 1. Receipt Status "O" Showing "Not Defined"
**Root cause**: Race condition in `fetchPayments`. The `statusMap` state is in the `useCallback` dependency array, causing an infinite re-render loop where `fetchStatusMap` returns data but `statusMap` state hasn't updated yet for the first render cycle. The local `sMap` variable is used correctly, but the `statusMap` dependency causes `fetchPayments` to re-create on every status map update, triggering `useEffect` again. The actual lookup logic is correct — the issue is likely that `tb_receipt_status` doesn't have an "O" record, OR the infinite loop causes timing issues.

**Fix**: Query `tb_receipt_status` once on mount into a `useRef`, remove `statusMap` from `fetchPayments` dependencies. Use the ref-based map for both list and detail popup status resolution.

### 2. "record old has no field id" Error on Receipt Generation
**Root cause**: The `audit_table_changes()` trigger function on line 48 references `OLD.id` / `NEW.id` for the `entity_id` column. But `cn_receipt` has no `id` column — its primary key is `receipt_id`. When the trigger fires on INSERT into `cn_receipt`, `NEW.id` fails.

**Fix**: Create a new migration to update `audit_table_changes()` to use a dynamic column lookup. Instead of hardcoding `.id`, check for common PK names (`id`, `receipt_id`, `payment_id`, etc.) from the JSONB representation of the row. This fixes it for `cn_receipt` and any other table without an `id` column.

```sql
-- Replace the entity_id line with dynamic PK resolution:
COALESCE(
  (CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'id',
  (CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'receipt_id',
  (CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'payment_id',
  'unknown'
)
```

### 3. Missing Confirmation Dialog for "Generate Receipt"
**Root cause**: The "Generate Receipt" button calls `handleGenerateReceipt` directly without confirmation. "Remove" already has an `AlertDialog`.

**Fix**: Add a `generateTarget` state (like `removeTarget`), show an `AlertDialog` on click, and only execute `handleGenerateReceipt` on confirm.

### 4. Row Click to Open Detail
**Root cause**: Currently `onView` only renders an Eye icon button in the actions column. The row itself is not clickable. When `renderActions` is provided (which it is here), the default `onView` eye button is replaced, so there's no way to click to view unless we make the row itself clickable.

**Fix**: Add `onClick` handler to each `TableRow` in `DataTable.tsx` that calls `onView` when the row is clicked (but not when action buttons are clicked, since those use `stopPropagation`). Add cursor styling.

## Files Changed

| File | Change |
|------|--------|
| Migration (new) | Fix `audit_table_changes()` to handle tables without `id` column |
| `src/components/common/DataTable.tsx` | Add row click handler when `onView` is provided |
| `src/pages/cashier/PaymentHistoryManagement.tsx` | Fix status map race condition; add Generate Receipt confirmation dialog |

## Technical Details

- The `audit_table_changes` fix uses JSONB key lookup so it works generically across all tables
- DataTable row click uses `onView` callback with `cursor-pointer` styling; action button clicks already use `stopPropagation` so they won't trigger row click
- Status map will be fetched once via `useRef` to avoid the dependency cycle

