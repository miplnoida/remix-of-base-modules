

# C3 History Sync APIs — SSB Admin Implementation Plan

## Overview

Build 3 new GET APIs inside the existing `public-api` edge function that replicate BIMA's URL structure exactly, allowing C3-Wizard to switch from BIMA to SSB Admin with zero frontend changes. Additionally, generate a PDF integration guide for the C3-Wizard team.

## Existing Infrastructure

The project already has a robust public API gateway (`supabase/functions/public-api/index.ts`) with:
- API key validation via `x-api-key` header (hashed keys in `public_api_keys`)
- API registry check (`api_registry` table)
- Rate limiting, scope authorization, IP whitelisting
- Access logging (`public_api_access_logs`)
- RESTful URL routing via `extractApiPath()` and `matchRoute()`

The data exists in `cn_c3_reported` (C3 headers) and `ip_wages` (wage line items). Person names come from `ip_master` (joined by SSN). Employment history is in `ip_employer`.

## APIs to Implement

### API 1: Range API
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/range/{startPeriod}/{endPeriod},{c3Type}
```
Returns array of VAC C3 headers for a date range. Dates in URL use `dd-MM-yyyy` format, response dates use `dd/MM/yyyy`.

### API 2: Detail API
```
GET /api/v1/C3/{payerId}/C3Submitted/{month},{year},{sequenceNo},{payerType},{c3Type}
```
Returns full C3 (header + wages). For `c3Type=EE`, returns `ipWages` array. For `c3Type=NW`, returns `nonWorkingDirectorWages` array.

### API 3: Last C3 Submitted
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/{sequenceNo},{c3Type}
```
Returns the most recent C3 header for a payer/sequence/type combination.

## Implementation Steps

### Step 1: Database — Create RPC Functions

Create 3 PostgreSQL RPC functions for efficient, indexed data retrieval:

**`public_api_c3_range`** — Accepts `p_payer_id`, `p_payer_type`, `p_start_period` (text), `p_end_period` (text), `p_c3_type` (text). Queries `cn_c3_reported` where `posting_status = 'VAC'` and period falls within the parsed date range. Returns JSON array of header summaries with fields mapped to BIMA format (`payerId`, `payerType`, `period` as `dd/MM/yyyy`, `sequenceNo`, `c3Status`, `receivedBy`, `dateReceived`).

**`public_api_c3_detail`** — Accepts `p_payer_id`, `p_month`, `p_year`, `p_sequence_no`, `p_payer_type`, `p_c3_type`. Fetches the C3 header and joins `ip_wages` with `ip_master` (for person names/DOB). For `EE` type: builds `ipWages` array with all wage/paid-code fields, person details, and contribution amounts. For `NW` type: builds `nonWorkingDirectorWages` array with SSN, name, wages, levy. Returns single JSON object `{ c3Header, ipWages/nonWorkingDirectorWages }`.

**`public_api_c3_last_submitted`** — Accepts `p_payer_id`, `p_payer_type`, `p_sequence_no`, `p_c3_type`. Returns the most recent VAC C3 header (ordered by period DESC, limit 1).

All functions use `SECURITY DEFINER` with `search_path = public` and cast text dates internally.

### Step 2: Add Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_range_lookup 
  ON cn_c3_reported(payer_id, payer_type, posting_status, period);
  
CREATE INDEX IF NOT EXISTS idx_ip_wages_c3_detail 
  ON ip_wages(c3_id, payer_type);

CREATE INDEX IF NOT EXISTS idx_ip_master_ssn_name
  ON ip_master(ssn);
```

### Step 3: Update `public-api` Edge Function

Add 3 new route patterns to `matchRoute()`:

```text
/api/v1/C3/{payerId}/C3Submitted/{payerType}/range/{startPeriod}/{endPeriod},{c3Type}  → c3Range
/api/v1/C3/{payerId}/C3Submitted/{month},{year},{seq},{payerType},{c3Type}              → c3Detail
/api/v1/C3/{payerId}/C3Submitted/{payerType}/{sequenceNo},{c3Type}                     → c3LastSubmitted
```

Add 3 handler functions that call the corresponding RPCs, validate path parameters (payer type must be ER/SE, c3Type must be EE/NW, dates must be dd-MM-yyyy), and return BIMA-compatible JSON responses.

Error responses follow existing pattern: `{ "status": "error", "message": "..." }` with appropriate HTTP status codes (400, 404, 500).

### Step 4: Register APIs in `api_registry`

Insert 3 new rows into `api_registry` via Supabase insert tool:

| endpoint_path | http_method | api_name | category |
|---|---|---|---|
| `/api/v1/C3/:payerId/C3Submitted/:payerType/range/:dates` | GET | C3 Range API | c3-history |
| `/api/v1/C3/:payerId/C3Submitted/:detail` | GET | C3 Detail API | c3-history |
| `/api/v1/C3/:payerId/C3Submitted/:last` | GET | C3 Last Submitted | c3-history |

Note: Since these use dynamic path segments, the registry check in the edge function will need a pattern-matching approach (prefix match on `/api/v1/C3/`) rather than exact match. This will be handled by adding a `c3History` category check in the middleware.

### Step 5: Generate Integration Guide PDF

Create a comprehensive PDF document at `/mnt/documents/C3_History_Sync_Integration_Guide.pdf` covering:
- Old → New endpoint mapping
- API key configuration via `/admin/api-keys`
- Request/response examples
- First-login sync flow
- Error handling and retry strategy
- Migration checklist for C3-Wizard team

## Files to Create/Modify

| File | Action |
|------|--------|
| **Migration SQL** | Create 3 RPC functions + indexes |
| `supabase/functions/public-api/index.ts` | Add route patterns + handlers for C3 Range, Detail, Last Submitted |
| `api_registry` rows | Insert 3 new API entries via insert tool |
| `/mnt/documents/C3_History_Sync_Integration_Guide.pdf` | Generated integration guide |

## Data Mapping Summary

### `cn_c3_reported` → Range/Header Response

| DB Column | API Field |
|---|---|
| `payer_id` | `payerId` |
| `payer_type` | `payerType` |
| `period` (date) | `period` (formatted `dd/MM/yyyy`) |
| `sequence_no` | `sequenceNo` |
| `posting_status` = 'VAC' | `c3Status` = "VAC" |
| `received_by` | `receivedBy` |
| `date_received` | `dateReceived` (formatted `dd/MM/yyyy`) |
| `number_employed` | `numberEmployed` |
| `emp_ss_amt_calc` | `calcEmpSsAmt` |
| `emp_levy_amt_calc` | `calcEmpLevyAmt` |
| `emp_pe_amt_calc` | `calcEmpPeAmt` |
| `emp_ss_fines_due` | `totalEmpSsFines` |
| `emp_levy_penalty_amt` | `totalEmpLevyPenalty` |
| `emp_pe_penalty_amt` | `totalEmpPePenalty` |
| `entered_by` | `submittedByName` |
| `nil_return` (bool→int) | `nilReturn` |

### `ip_wages` + `ip_master` → ipWages Response

| DB Column | API Field |
|---|---|
| `ip_wages.ssn` | `ssn` |
| `ip_master.first_name` | `firstName` |
| `ip_master.last_name` | `surName` |
| `ip_master.middle_name` | `middleName` |
| `ip_master.date_of_birth` | `birthDate` (yyyy-MM-dd) |
| `ip_wages.pay_period` → description from `tb_pay_periods` | `payPeriod` |
| `ip_wages.paid_code1-7` | `paidCode1-7` (X or empty) |
| `ip_wages.wages_paid1-7` | `wagesPaid1-7` |
| `ip_wages.ip_ss_amt` | `ipSsAmt` |
| `ip_wages.er_ss_amt` | `erSsAmt` |
| `ip_wages.ip_levy_amt` | `ipLevyAmt` |
| `ip_wages.er_levy_amt` | `erLevyAmt` |
| `ip_wages.ip_pe_amt` | `ipPeAmt` |
| `ip_wages.er_ei_amt` | `erEiAmt` |

## Validation & Edge Cases

- Date format validation: `dd-MM-yyyy` in URL path params
- Payer type must be `ER` or `SE`
- c3Type must be `EE` or `NW`
- Only `posting_status = 'VAC'` records returned
- Empty array `[]` for no results (HTTP 200, not 404)
- Person name lookup gracefully handles missing `ip_master` records (returns `employee_name` from `ip_wages` as fallback)

