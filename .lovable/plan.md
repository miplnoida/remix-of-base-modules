

# Fix: "invalid input syntax for type integer: E0030" on Employer Application Accept

## Root Cause

The `convert_application_to_employer` RPC generates a new T-series registration number with this SQL:

```sql
SELECT COALESCE(
  'T' || LPAD((COALESCE(MAX(SUBSTRING(regno FROM 2)::INTEGER), 0) + 1)::TEXT, 5, '0'),
  'T00001'
) INTO v_regno
FROM er_master
WHERE regno LIKE 'T%';
```

The `WHERE regno LIKE 'T%'` filter matches **all** regnos starting with `T`, including `TE0030` (which exists in the table). `SUBSTRING('TE0030' FROM 2)` yields `'E0030'`, which cannot be cast to `INTEGER`.

## Fix

Update the RPC's T-series number generation query to use a stricter regex pattern that only matches `T` followed by exactly 5 digits:

```sql
WHERE regno ~ '^T\d{5}$'
```

This ensures only valid T-series numbers like `T00007`, `T00008`, `T00009` are considered, and `TE0030` is excluded.

## Additional Fix: Create `er_documents` table

The RPC also tries to `INSERT INTO er_documents` but this table doesn't exist in the database. This would cause a secondary failure after fixing the integer cast issue. A migration will create the `er_documents` table with appropriate columns matching the RPC's INSERT statement.

## Files to Modify

1. **New SQL migration** — Recreate the `convert_application_to_employer` function with the regex fix and create the `er_documents` table if missing.

## Technical Details
- Single database migration, no client-side code changes needed
- The RPC will be dropped and recreated with the corrected `WHERE` clause
- The `er_documents` table will include: `id`, `regno`, `file_name`, `file_path`, `storage_url`, `document_type`, `document_description`, `doc_code`, `mime_type`, `file_size`, `uploaded_by`, `uploaded_by_code`, `is_supportive`, `metadata`, `created_at`

