


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

## APIs Implemented (5 Total)

### C3 History APIs (Phase 1)

#### API 1: Range API
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/range/{startPeriod}/{endPeriod},{c3Type}
```
Returns array of VAC C3 headers for a date range.

#### API 2: Detail API
```
GET /api/v1/C3/{payerId}/C3Submitted/{month},{year},{sequenceNo},{payerType},{c3Type}
```
Returns full C3 (header + wages).

#### API 3: Last C3 Submitted
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/{sequenceNo},{c3Type}
```
Returns the most recent C3 header.

### Employee Sync APIs (Phase 1.1 — C3-Wizard Query Response)

#### API 4: Employees By Last C3
```
GET /api/v1/Employee/employeesByLastC3/{registrationNumber}
```
Returns employees from the most recent VAC C3 for an employer.

#### API 5: NW Directors By Last C3
```
GET /api/v1/Employee/nwdirectorsByLastC3/{registrationNumber}
```
Returns NW directors from the most recent VAC C3.

## Implementation Status

### ✅ Step 1: Database — RPC Functions + Indexes
- `public_api_c3_range` — C3 headers by date range
- `public_api_c3_detail` — C3 header + wages detail
- `public_api_c3_last_submitted` — Most recent C3 header
- `public_api_employees_by_last_c3` — Employees from latest VAC C3
- `public_api_nwdirectors_by_last_c3` — NW Directors from latest VAC C3
- Indexes on `cn_c3_reported`, `ip_wages`, `ip_master`

### ✅ Step 2: Edge Function Routes + Handlers
- C3 History routes (Range, Detail, Last Submitted)
- Employee Sync routes (employeesByLastC3, nwdirectorsByLastC3)
- `isC3HistoryRoute()` and `isEmployeeRoute()` helpers
- Category-based registry/scope checks for `c3-history` and `employee-sync`

### ✅ Step 3: API Registry
- 5 entries registered under categories `c3-history` and `employee-sync`

### ✅ Step 4: Integration Guides
- v1: `C3_History_Sync_Integration_Guide.pdf` — Initial 3 APIs
- v2: `C3_Integration_Response_v2.pdf` — Full response to C3-Wizard queries + all 5 APIs

## C3-Wizard Query Responses Summary

| Query | Status | Answer |
|-------|--------|--------|
| Q1 — URL Prefix | ✅ Resolved | Set base_url to include `/api/v1` |
| Q2 — Employee API | ✅ Implemented | `GET /api/v1/Employee/employeesByLastC3/{regNo}` |
| Q3 — NW Director API | ✅ Implemented | `GET /api/v1/Employee/nwdirectorsByLastC3/{regNo}` |
| Q4 — Payer Type | ✅ Confirmed | ER+EE, ER+NW, SE+EE |
| Q5 — Empty Response | ✅ Confirmed | Range/Employee=200[], Detail/Last=404 |
| Q6 — Rate Limits | ✅ Confirmed | 100 req/min default, configurable |
