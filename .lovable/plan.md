

# Fix Migration Error: `ia_start_plan_approval_workflow` Default Conflict

## Problem

PostgreSQL error `42P13: cannot remove parameter defaults from existing function` is blocking all deployments to Live. The function `ia_start_plan_approval_workflow` was originally created with `p_submitted_by text DEFAULT 'SYSTEM'` and later migrations try to replace it with `p_submitted_by text` (no default). PostgreSQL's `CREATE OR REPLACE` cannot remove defaults — it requires a `DROP FUNCTION` first.

The existing DROP statements target `(uuid, text, boolean)` but the Live database may have a version with defaults that doesn't match or the migration ordering causes the CREATE OR REPLACE to execute before the DROP in a later migration file.

## Fix

Create a single new migration that:

1. Drops ALL possible signatures of `ia_start_plan_approval_workflow` to handle any state the Live DB might be in
2. Recreates the function with the latest version (from migration `20260329023458` — the most recent, with user_id resolution logic)

### SQL

```sql
-- Drop all possible overloads to handle any Live state
DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid, text);
DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid);

-- Recreate with the latest version (matches 20260329023458)
CREATE OR REPLACE FUNCTION public.ia_start_plan_approval_workflow(
  p_plan_id uuid,
  p_submitted_by text,
  p_is_revision boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  -- [full function body from 20260329023458 migration]
$$;
```

## Files Modified

| File | Change |
|------|--------|
| New migration SQL | Drop all signatures + recreate function with latest body |

No application code changes needed — this is purely a database migration fix.

