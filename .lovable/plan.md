

## Fix: Employer Application Conversion Failure

### Problem
The `convert_application_to_employer` RPC fails with "value too long for type character varying(6)" because `generate_temp_er_regno()` returns 9-character values (e.g., `ER-T00001`) into `er_master.regno` which is `varchar(6)`.

### Changes

#### 1. Fix `generate_temp_er_regno()` — Database Migration
Change the function to produce 6-character values (`T` + 5 zero-padded digits):
```sql
CREATE OR REPLACE FUNCTION public.generate_temp_er_regno()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'T' || LPAD(nextval('er_temp_regno_seq')::TEXT, 5, '0');
END;
$$;
```
Output example: `T00001` (6 chars, fits `varchar(6)`).

#### 2. Widen `er_notes` columns — Database Migration
Instead of truncating data in the frontend, alter the `er_notes` table columns to accommodate full-length values:

```sql
ALTER TABLE public.er_notes ALTER COLUMN note TYPE varchar(500);
ALTER TABLE public.er_notes ALTER COLUMN user_id TYPE varchar(50);
```

This ensures notes and user identifiers from the application are captured in full without data loss.

#### 3. Remove truncation in the conversion hook
**File:** `src/hooks/useConvertToEmployerRegistration.ts` (lines 125-129)

Update the `notesJson` builder to stop trimming these fields to artificially small limits. The `trim()` calls for `note` and `user_id` should use the new column sizes (500 and 50 respectively) or be removed entirely since the schema now accommodates the data.

### Files to modify
| File | Change |
|------|--------|
| New database migration | Fix `generate_temp_er_regno()` + widen `er_notes.note` to `varchar(500)` and `er_notes.user_id` to `varchar(50)` |
| `src/hooks/useConvertToEmployerRegistration.ts` | Update trim limits in `notesJson` builder to match new column sizes |

