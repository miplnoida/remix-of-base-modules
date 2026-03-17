# C3-Wizard API Request: Role Dropdown & Date Filter Support

**Date:** 2026-03-17  
**Priority:** High  
**Module:** Reports → Users History, Employer History, Self-Employed History  
**Requested By:** SSB Admin Frontend Team  
**Status:** ✅ RESOLVED (confirmed by C3-Wizard team)

---

## Issue 1: Missing "Self Employed Users" Role in `get_users_report_roles` — ✅ FIXED

### Resolution
The missing "Self Employed Users" role has been added to `c3_roles` (id: 25, category: SelfEmployee). Calling `get_users_report_roles` with `category = "SelfEmployee"` now returns both:
- `Self Employed`
- `Self Employed Users`

### Original Problem
When calling `get_users_report_roles` with `category = "SelfEmployee"`, the API returned only `Self Employed`, missing `Self Employed Users`.

---

## Issue 2: Date Filter Support on Report Actions — ✅ FIXED

### Resolution
The following actions now accept optional `from_date` and `to_date` parameters (format: `yyyy-MM-dd`):

| Action | Filter Column |
|---|---|
| `get_employer_report` | `registration_date` |
| `get_self_employed_report` | `created_at` |
| `get_company_users_report` | `created_at` |
| `get_self_employed_users_report` | `created_at` |

### Filter Behavior (confirmed working)
- If only `from_date` is provided: filter `column >= from_date`
- If only `to_date` is provided: filter `column <= to_date`
- If both provided: filter `column >= from_date AND column <= to_date`
- If neither provided: no date filtering (original behavior)

---

## Verification

```bash
curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <KEY>" \
  -d '{"action":"get_users_report_roles","params":{"category":"SelfEmployee"}}'
# ✅ Returns both "Self Employed" and "Self Employed Users"

curl -X POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: <KEY>" \
  -d '{"action":"get_employer_report","params":{"from_date":"2025-01-01","to_date":"2025-12-31","page_offset":0,"page_limit":10}}'
# ✅ Returns only employers registered in 2025
```

## Frontend Notes
The UI retains a fallback `mergeRoles` utility in `WizUsersHistory.tsx` as a safety net — if the API ever omits a role, the fallback ensures `Self Employed Users` and `Company Users` are always available in the dropdown.
