# Fix: 403 "Endpoint not authorized" for Range, Detail, and Employee APIs

## Root Cause

The `checkScopeAuthorization` function in `supabase/functions/public-api/index.ts` uses a Supabase PostgREST nested join:

```typescript
.select("api_registry_id, api_registry:api_registry!api_key_scope_assignments_api_registry_id_fkey(endpoint_path, http_method, category)")
```

This join relies on a **foreign key constraint** named `api_key_scope_assignments_api_registry_id_fkey` — but **no foreign key exists** on the `api_key_scope_assignments` table. The join silently returns `null` for every row's `api_registry` field. Since the code checks `reg && reg.category === "c3-history"`, it always evaluates to `false`, returning a 403 for every scoped endpoint.

The Reported/Wages/Verify endpoints (`C3 Ingestion` category) work because they use **exact path matching** (line 250) — they don't go through the category-based checks. But those also fail silently on the join; they just happen to match via the fallback path comparison against a null `reg`, which also shouldn't work. More likely, the ingestion endpoints aren't dynamic routes so they pass through a different code path entirely.

**Secondary issue**: The Employee scope check (line 211-215) only checks for `category === "employee-sync"` but some Employee endpoints use `category === "employee-lookup"`.

## Solution

### 1. Database Migration — Add Foreign Key Constraint

Add the missing FK so the Supabase PostgREST join works:

```sql
ALTER TABLE public.api_key_scope_assignments
  ADD CONSTRAINT api_key_scope_assignments_api_registry_id_fkey
  FOREIGN KEY (api_registry_id) REFERENCES public.api_registry(id)
  ON DELETE CASCADE;
```

### 2. Edge Function Fix — Employee Category Check

In `checkScopeAuthorization`, update the Employee route check to accept both `employee-sync` and `employee-lookup` categories:

```typescript
// Before (line 211-215):
if (isEmployeeRoute(endpointPath)) {
  return scopes.some((s: any) => {
    const reg = s.api_registry;
    return reg && reg.category === "employee-sync";
  });
}

// After:
if (isEmployeeRoute(endpointPath)) {
  return scopes.some((s: any) => {
    const reg = s.api_registry;
    return reg && (reg.category === "employee-sync" || reg.category === "employee-lookup");
  });
}
```

Also update the `checkApiRegistry` function's Employee route check (line 82-91) to query for both categories:

```typescript
if (isEmployeeRoute(endpointPath)) {
  const { data, error } = await supabase
    .from("api_registry")
    .select("*")
    .in("category", ["employee-sync", "employee-lookup"])
    .eq("is_enabled", true)
    .limit(1);
  ...
}
```

## Files Changed


| File                                     | Change                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Database migration                       | Add FK constraint `api_key_scope_assignments_api_registry_id_fkey` |
| `supabase/functions/public-api/index.ts` | Fix Employee scope to include `employee-lookup` category           |


## Expected Outcome

After deployment, the active API key `pk_live_sFFJ...` will correctly authorize Range, Detail, and Employee endpoints — all of which already have scope assignments in the database.  
  
Important note: make sure existing functionality should not be impact by this change.