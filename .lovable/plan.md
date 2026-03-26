

# Change `user_code` Generation to First-Initial + Full Last Name

## Current State
- `user_code` is `VARCHAR(5)`, generated as `UPPER(first_initial + first 4 chars of last_name)`, padded to 5 chars
- Trigger `set_user_code` fires on INSERT/UPDATE, only generates when `user_code IS NULL`
- Uniqueness handled by appending digits within the 5-char limit
- Used in 51+ frontend files for audit trails, filters, logging — all read from `profiles.user_code`

## Changes Required

### 1. Database Migration (single migration)

**a) Widen column** from `VARCHAR(5)` to `VARCHAR(50)` to fit full last names:
```sql
ALTER TABLE public.profiles ALTER COLUMN user_code TYPE VARCHAR(50);
```

**b) Replace `generate_user_code` function** — new logic: `UPPER(LEFT(first_name,1)) || INITCAP(TRIM(last_name))`. If duplicate exists, append numeric suffix (JBarry2, JBarry3…). If last_name is NULL/empty, raise an exception.

```sql
CREATE OR REPLACE FUNCTION public.generate_user_code(p_first_name TEXT, p_last_name TEXT)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_first CHAR(1);
  v_last TEXT;
  v_base VARCHAR(50);
  v_code VARCHAR(50);
  v_counter INT := 1;
BEGIN
  IF TRIM(COALESCE(p_last_name, '')) = '' THEN
    RAISE EXCEPTION 'Last name is required to generate user_code';
  END IF;
  IF TRIM(COALESCE(p_first_name, '')) = '' THEN
    RAISE EXCEPTION 'First name is required to generate user_code';
  END IF;
  v_first := UPPER(LEFT(TRIM(p_first_name), 1));
  v_last := INITCAP(TRIM(p_last_name));
  v_base := v_first || v_last;
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := v_base || v_counter::TEXT;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

**c) Update trigger** to always regenerate on name change (not just when NULL):
```sql
CREATE OR REPLACE FUNCTION public.set_user_code() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR 
     NEW.first_name IS DISTINCT FROM OLD.first_name OR 
     NEW.last_name IS DISTINCT FROM OLD.last_name OR
     NEW.user_code IS NULL THEN
    NEW.user_code := public.generate_user_code(NEW.first_name, NEW.last_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

**d) Migrate existing data** — regenerate all user_codes:
```sql
UPDATE public.profiles
SET user_code = NULL
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;
-- Trigger will fire and regenerate each one
```
Note: We set to NULL so the trigger regenerates. For profiles missing last_name, we skip them (they keep old codes).

**e) Drop unique index and recreate** with new size:
```sql
DROP INDEX IF EXISTS profiles_user_code_unique;
CREATE UNIQUE INDEX profiles_user_code_unique ON public.profiles(user_code) WHERE user_code IS NOT NULL;
```

### 2. Frontend — Documentation Update Only
- `src/hooks/useUserCode.ts`: Update JSDoc from "5-character identifier" to "first-initial + last-name identifier"
- No logic changes needed — all 51+ files read `user_code` from the profiles table via hooks

### 3. No Other Code Changes Required
All consumers (audit fields, filters, dropdowns, payment flows, DMS, approval workflows) just read `user_code` from the `profiles` table. The new value will flow through automatically.

### 4. SQL for Live Environment
Will provide the exact ALTER TABLE, function replacement, and data migration SQL for manual execution on the live database.

## What Does NOT Change
- No UI component changes — `user_code` is read-only everywhere
- No edge function changes — they receive `user_code` as a parameter from the frontend
- No changes to how `user_code` is consumed in audit trails, filters, or APIs
- Historical audit records keep their old `user_code` values (preserving audit trail integrity)
- The `handle_new_user` trigger inserts profiles; then `set_user_code` trigger fires and derives the code

## Files Modified
- 1 new Supabase migration (column widen + function replacement + trigger update + data migration)
- `src/hooks/useUserCode.ts` — JSDoc comment update only

## Edge Cases Handled
- Missing last_name → raises exception, blocks creation
- Missing first_name → raises exception, blocks creation  
- Duplicate names (e.g., two "John Barry") → JBarry, JBarry2, JBarry3…
- Name changes → trigger detects change and regenerates user_code
- Extra spaces → trimmed before processing

