

# C3-Wizard Integration Queries — Response & Implementation Plan

## Analysis of All Queries

### Q1 — URL Path Prefix (BLOCKER) → Already Resolved

The current `extractApiPath()` function (line 599-606 of `public-api/index.ts`) extracts everything after `/public-api`, producing paths like `/api/v1/C3/...`. 

**Answer to C3-Wizard**: Configure `base_url` in `c3_site_settings` as:
```
https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/public-api/api/v1
```
Then append `/C3/{payerId}/C3Submitted/...` as before. No URL construction changes needed on their side.

**Action**: No code change. Document this in the updated integration guide.

---

### Q2 — Employee Import API (BLOCKER) → Needs Implementation

BIMA endpoint: `GET /Employee/employeesByLastC3/{registrationNumber}`

This returns employees from the most recent VAC C3 for an employer. Data exists in `ip_wages` (joined with `ip_master` for names/DOB) and `ip_employer` for employment history. We need to find the latest VAC C3 for the employer and return all unique employees from its wage records.

**Response schema** (BIMA-compatible):
```json
[
  {
    "socialSecurityNumber": "220562",
    "firstName": "Nazio",
    "surName": "Fontain",
    "middleName": "",
    "birthDate": "1985-03-15",
    "payPeriod": "Monthly",
    "startDate": null,
    "endDate": null
  }
]
```

**Implementation**:
1. Create RPC `public_api_employees_by_last_c3(p_registration_number TEXT)` — finds latest VAC C3 for the employer, joins `ip_wages` + `ip_master` + `tb_pay_periods`, returns distinct employees
2. Add route pattern in `matchRoute()`: `/api/v1/Employee/employeesByLastC3/{registrationNumber}` → handler `employeesByLastC3`
3. Add handler function
4. Register in `api_registry`

---

### Q3 — NW Director Employee API → Needs Implementation

BIMA endpoint: `GET /Employee/nwdirectorsByLastC3/{registrationNumber}`

Same pattern but fetches from the latest NW-type C3 (`payer_type = 'ER'`, looking for NW wage records).

**Response schema**:
```json
[
  {
    "socialSecurityNumber": "220511",
    "firstName": "Nazio",
    "surName": "Foni",
    "middleName": "",
    "birthDate": "1980-05-20",
    "wages": 14500.00,
    "levyAmt": 145.00,
    "startDate": null,
    "endDate": null
  }
]
```

**Implementation**:
1. Create RPC `public_api_nwdirectors_by_last_c3(p_registration_number TEXT)` — finds latest VAC C3 with NW variant, returns directors
2. Add route + handler in edge function
3. Register in `api_registry`

---

### Q4 — Payer Type Mapping → Confirmed Correct

From the guide's combination rules table (page 7):

| User Type | payerType | c3Type | Use Case |
|---|---|---|---|
| Employer (employee C3s) | **ER** | **EE** | Fetch employer C3 submissions |
| NW Director C3s | **ER** | **NW** | Fetch non-working director C3 submissions |
| Self-Employed | **SE** | **EE** | Fetch self-employed C3 submissions |

This matches what's already implemented in the edge function. **No change needed.** Will be documented in the response guide.

---

### Q5 — Empty Response Format → Clarification

- **Range API**: Returns `200` with `[]` (empty array) — already implemented
- **Detail API**: If C3 not found, the RPC returns `{ "error": "C3 record not found" }` which the handler throws as `NOT_FOUND` → returns `404`. 
- **Last Submitted API**: Same as Detail — `404` if not found.

**Answer**: Range → `200 []`. Detail/LastSubmitted → `404` with error message. This is correct BIMA behavior.

---

### Q6 — Rate Limits → Already Configurable

Rate limits are per-API-key, configured in `public_api_keys.rate_limit_per_minute`. The default is set when creating the key via `/admin/api-keys`. The guide recommends 100/min. For 20-30 rapid Detail calls during first-login sync, this is well within limits.

**Answer**: Default 100 req/min per key. Configurable per key in `/admin/api-keys`. C3-Wizard's 20-30 rapid calls are fine.

---

### Required Confirmations → All Addressed

1. **API Contract Stability**: Yes, schemas are final. Any future changes will be backward-compatible.
2. **API Key Provisioning**: Same key works for all 5 endpoints (Range, Detail, Last Submitted, Employee, NW Directors). Scope assignments control access.
3. **Backward Compatibility**: Guaranteed — additive changes only.
4. **Base URL Consistency**: Yes, all APIs share the same base URL.

---

## Implementation Steps

### Step 1: Database Migration — 2 New RPC Functions + Index

```sql
-- RPC: Employees by last C3
CREATE OR REPLACE FUNCTION public.public_api_employees_by_last_c3(p_registration_number TEXT)
RETURNS JSONB ...
-- Finds latest VAC C3 for employer (payer_type='ER'), 
-- joins ip_wages + ip_master + tb_pay_periods
-- Returns JSONB array of unique employees

-- RPC: NW Directors by last C3  
CREATE OR REPLACE FUNCTION public.public_api_nwdirectors_by_last_c3(p_registration_number TEXT)
RETURNS JSONB ...
-- Finds latest VAC NW-variant C3, returns directors with wages/levy

-- Index for employer lookup
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_employer_latest 
  ON cn_c3_reported(payer_id, payer_type, posting_status, period DESC);
```

### Step 2: Update Edge Function — Add 2 Routes + Handlers

Add to `matchRoute()`:
- `/api/v1/Employee/employeesByLastC3/{registrationNumber}` → `employeesByLastC3`
- `/api/v1/Employee/nwdirectorsByLastC3/{registrationNumber}` → `nwDirectorsByLastC3`

Add `isEmployeeRoute()` helper (similar to `isC3HistoryRoute()`).

Add 2 handler functions that call the RPCs and return BIMA-compatible arrays.

Update `checkApiRegistry` and `checkScopeAuthorization` to handle `employee-sync` category.

### Step 3: Register APIs in `api_registry`

Insert 2 new rows:
- `Employee By Last C3` — GET, category `employee-sync`
- `NW Directors By Last C3` — GET, category `employee-sync`

### Step 4: Generate Updated Integration Guide (v2)

Create `/mnt/documents/C3_Integration_Response_v2.pdf` containing:
- Formal response to all 6 questions
- Updated endpoint reference (now 5 APIs total)
- Base URL configuration guidance
- Payer type confirmation table
- Rate limit details
- Employee API request/response examples
- API contract stability commitment

## Files to Create/Modify

| File | Action |
|------|--------|
| **Migration SQL** | 2 RPCs + index |
| `supabase/functions/public-api/index.ts` | Add Employee route patterns, handlers, registry/scope checks |
| `api_registry` rows | Insert 2 new entries |
| `/mnt/documents/C3_Integration_Response_v2.pdf` | Response document for C3-Wizard team |

