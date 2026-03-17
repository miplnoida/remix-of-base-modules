# C3-Wizard Bug Fix Request — `get_self_employed_users_report` Ambiguous Embed

**Date:** 2026-03-17  
**Priority:** High  
**Reported By:** SSB Admin Team  
**Affected Action:** `get_self_employed_users_report`  
**Endpoint:** `POST /functions/v1/wiz-admin-api`

---

## 1. Problem Summary

The `get_self_employed_users_report` action returns a **500 error** every time it is called. All other user report actions (`get_company_users_report`, `get_users_report_roles`) work correctly.

---

## 2. Error Details

**Request sent by SSB Admin:**
```json
{
  "action": "get_self_employed_users_report",
  "params": {
    "search": "",
    "role_id": null,
    "sort_column": "first_name",
    "sort_direction": "asc",
    "page": 1,
    "page_size": 50
  }
}
```

**Response received (HTTP 500):**
```json
{
  "status": "error",
  "error": "Could not embed because more than one relationship was found for 'c3_users' and 'c3_self_employed'"
}
```

---

## 3. Root Cause Analysis

This is a **PostgREST disambiguation error**. It occurs when the Supabase client attempts to embed (join) `c3_self_employed` from `c3_users` but finds **multiple foreign key relationships** between the two tables. PostgREST cannot determine which foreign key to use and returns a 300/500 error.

**Reference:** [PostgREST Resource Embedding — Disambiguation](https://docs.postgrest.org/en/v12/references/api/resource_embedding.html)

---

## 4. Recommended Fix

The C3-Wizard `wiz-admin-api` edge function must disambiguate the relationship. There are two approaches:

### Option A: Use the `!<foreign_key_name>` hint (Preferred)

If the Supabase JS client `.select()` currently looks like:

```typescript
// ❌ CURRENT (ambiguous)
const { data, error } = await supabase
  .from('c3_users')
  .select('*, c3_self_employed(*)');
```

Change it to explicitly specify the foreign key constraint name:

```typescript
// ✅ FIXED (disambiguated)
const { data, error } = await supabase
  .from('c3_users')
  .select('*, c3_self_employed!<foreign_key_name>(*)');
```

To find the correct `<foreign_key_name>`, run this SQL on the C3-Wizard database:

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    (tc.table_name = 'c3_users' AND ccu.table_name = 'c3_self_employed')
    OR
    (tc.table_name = 'c3_self_employed' AND ccu.table_name = 'c3_users')
  );
```

This will list all foreign keys between the two tables. Pick the one that represents the primary user-to-self-employed association (e.g., `c3_users_self_employed_id_fkey`).

### Option B: Two-step query (Alternative)

If disambiguation is complex, split into two queries:

```typescript
// Step 1: Get self-employed users
const { data: users } = await supabase
  .from('c3_users')
  .select('*')
  .in('role_id', selfEmployedRoleIds);

// Step 2: Get self-employed details
const selfEmployedIds = users.map(u => u.self_employed_id).filter(Boolean);
const { data: seDetails } = await supabase
  .from('c3_self_employed')
  .select('*')
  .in('id', selfEmployedIds);

// Step 3: Merge in application code
const merged = users.map(u => ({
  ...u,
  ssn: seDetails.find(se => se.id === u.self_employed_id)?.ssn ?? null,
  self_employed_id: u.self_employed_id,
}));
```

---

## 5. Expected Response After Fix

Once fixed, the action should return this shape (matching `get_company_users_report`):

```json
{
  "status": "success",
  "data": [
    {
      "user_id": 10,
      "first_name": "Cleo",
      "last_name": "Hanley-Walters",
      "middle_name": null,
      "username": "cleo",
      "email": "oscar840@hotmail.com",
      "role_id": 17,
      "role_name": "Self Employed",
      "self_employed_id": 3,
      "ssn": "164312",
      "is_locked": false,
      "last_login_at": "2026-02-10T14:00:00Z",
      "created_at": "2025-07-01T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 19,
    "total_pages": 1
  }
}
```

---

## 6. Verification

After applying the fix, please verify with this test call:

```bash
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <your_key>" \
  -d '{
    "action": "get_self_employed_users_report",
    "params": {
      "search": "",
      "role_id": null,
      "sort_column": "first_name",
      "sort_direction": "asc",
      "page": 1,
      "page_size": 10
    }
  }'
```

**Expected:** HTTP 200 with `"status": "success"` and populated `data` array.

---

## 7. Impact

- **SSB Admin Users History → Self Employed tab** is completely non-functional until this is fixed
- The `export_users_report` action with `category: "SelfEmployee"` may also be affected if it uses the same embed pattern — please verify and fix if needed

---

**Contact:** SSB Admin Development Team  
**Blocking:** Users History report — Self Employed tab
