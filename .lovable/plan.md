

# Fix: Type Mismatch in `create_c3_payment_with_receipt` — `date_received` Column

## Problem

The `cn_payment_header.date_received` column is `timestamp without time zone`, but the function inserts `p_date_received` (TEXT, e.g. `"2026-04-02"`) without casting. PostgreSQL rejects this on Live with:

> column "date_received" is of type timestamp without time zone but expression is of type text

## Fix

**Single migration** that drops and recreates `create_c3_payment_with_receipt`, changing only line 97:

```sql
-- Before (line 97):
p_date_received

-- After:
p_date_received::timestamp
```

The rest of the function body remains identical. The explicit `::timestamp` cast converts the text date string (e.g. `"2026-04-02"`) to a valid timestamp.

## Technical Details

- File: New migration SQL
- Scope: Drop existing function, recreate with the single-line cast fix
- No frontend code changes needed — `C3Payments.tsx` already sends a text date via `formatDateForStorage()`

