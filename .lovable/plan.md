

# Server-Side Sortable Columns for Audit Trail

## What Changes

**Single file**: `src/pages/system-logs/AuditTrail.tsx`

1. Import `useTableSort`'s `SortConfig` type and `SortableTableHead` component (both already exist in the codebase).

2. Add `sortKey` and `sortDirection` state (default: `timestamp` / `desc`). Reset page to 0 when sort changes.

3. Update the Supabase query: replace the hardcoded `.order('timestamp', { ascending: false })` with `.order(sortKey, { ascending: sortDirection === 'asc', nullsFirst: false })`.

4. Add `sortKey`/`sortDirection` to the `queryKey` array so React Query refetches on sort change.

5. Replace all 7 `<TableHead>` elements in the table header with `<SortableTableHead>` wired to a `handleSort` callback that toggles asc/desc and resets page.

Column-to-DB-key mapping:
| Header | sortKey |
|---|---|
| Timestamp | `timestamp` |
| User | `user_name` |
| Action | `action` |
| Module | `module` |
| Route | `route` |
| Entity Type | `entity_type` |
| Entity ID | `entity_id` |

## Why This Works

- Sorting is fully server-side — Supabase `.order()` translates to SQL `ORDER BY`, so results come pre-sorted from PostgreSQL.
- `nullsFirst: false` ensures nulls sort consistently to the end.
- `timestamp` is a proper `timestamptz` column, so date sorting is native — no string comparison.
- Existing filters, pagination, and search are preserved; only the `.order()` call and `queryKey` change.
- `SortableTableHead` already renders arrow indicators for active sort state.

## Files Modified
- `src/pages/system-logs/AuditTrail.tsx` — add sort state + swap table headers

