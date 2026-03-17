# C3-Wizard API Request: Role Dropdown & Date Filter Support

**Date:** 2026-03-17  
**Priority:** High  
**Module:** Reports → Users History, Employer History, Self-Employed History  
**Requested By:** SSB Admin Frontend Team

---

## Issue 1: Missing "Self Employed Users" Role in `get_users_report_roles`

### Problem
When calling `get_users_report_roles` with `category = "SelfEmployee"`, the API returns only:
- `Self Employed`

But the legacy system shows **two** roles for this category:
- `Self Employed`
- `Self Employed Users`

For the **Company** category, the API correctly returns both:
- `Company`
- `Company Users`

### Expected Response
```json
// POST { "action": "get_users_report_roles", "params": { "category": "SelfEmployee" } }
{
  "status": "success",
  "data": [
    { "id": 3, "role_name": "Self Employed", "role_code": "self_employed", "role_category": "SelfEmployee" },
    { "id": 4, "role_name": "Self Employed Users", "role_code": "self_employed_users", "role_category": "SelfEmployee" }
  ]
}
```

### Root Cause Investigation
Please check the `c3_roles` (or equivalent) table to ensure:
1. A role record exists for "Self Employed Users" with `role_category = 'SelfEmployee'`
2. The query in `get_users_report_roles` handler filters by category correctly and doesn't exclude this role

---

## Issue 2: Date Filter Support Required on Additional Report Actions

### Problem
The following report actions currently do **not** accept `from_date` / `to_date` parameters, but the legacy system provides date filtering on these screens:

| Action | Missing Parameters |
|---|---|
| `get_employer_report` | `from_date`, `to_date` |
| `get_self_employed_report` | `from_date`, `to_date` |
| `get_company_users_report` | `from_date`, `to_date` |
| `get_self_employed_users_report` | `from_date`, `to_date` |

### Required Changes
Each of the above actions must accept optional `from_date` and `to_date` parameters in `yyyy-MM-dd` format and filter records by their registration/creation date accordingly.

**Example Request:**
```json
{
  "action": "get_employer_report",
  "params": {
    "search": "",
    "from_date": "2025-01-01",
    "to_date": "2025-12-31",
    "sort_col": "registration_number",
    "sort_dir": "asc",
    "page_offset": 0,
    "page_limit": 10
  }
}
```

### Filter Column Mapping
| Action | Filter Column |
|---|---|
| `get_employer_report` | `registration_date` |
| `get_self_employed_report` | `created_at` |
| `get_company_users_report` | `created_at` |
| `get_self_employed_users_report` | `created_at` |

### Behavior
- If only `from_date` is provided: filter `column >= from_date`
- If only `to_date` is provided: filter `column <= to_date`
- If both provided: filter `column >= from_date AND column <= to_date`
- If neither provided: no date filtering (current behavior)

---

## Verification
After implementing, the following curl should work:

```bash
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <KEY>" \
  -d '{"action":"get_users_report_roles","params":{"category":"SelfEmployee"}}'
# Should return both "Self Employed" and "Self Employed Users"

curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <KEY>" \
  -d '{"action":"get_employer_report","params":{"from_date":"2025-01-01","to_date":"2025-12-31","page_offset":0,"page_limit":10}}'
# Should return only employers registered in 2025
```
