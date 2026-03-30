

# C3 History Sync APIs — SSB Admin Implementation Plan

## Overview

Build complete BIMA API replacement inside the existing `public-api` edge function, allowing C3-Wizard to switch from BIMA to SSB Admin with zero frontend changes. All 13 active endpoints replicate BIMA's exact URL structure and response schemas.

## Existing Infrastructure

The project already has a robust public API gateway (`supabase/functions/public-api/index.ts`) with:
- API key validation via `x-api-key` header (hashed keys in `public_api_keys`)
- API registry check (`api_registry` table)
- Rate limiting, scope authorization, IP whitelisting
- Access logging (`public_api_access_logs`)
- RESTful URL routing via `extractApiPath()` and `matchRoute()`

## APIs Implemented (13 Total)

### C3 History APIs (Phase 1)

#### API 1: Range API
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/range/{startPeriod}/{endPeriod},{c3Type}
```

#### API 2: Detail API
```
GET /api/v1/C3/{payerId}/C3Submitted/{month},{year},{sequenceNo},{payerType},{c3Type}
```

#### API 3: Last C3 Submitted
```
GET /api/v1/C3/{payerId}/C3Submitted/{payerType}/{sequenceNo},{c3Type}
```

### Employee Sync APIs (Phase 1.1)

#### API 4: Employees By Last C3
```
GET /api/v1/Employee/employeesByLastC3/{registrationNumber}
```

#### API 5: NW Directors By Last C3
```
GET /api/v1/Employee/nwdirectorsByLastC3/{registrationNumber}
```

### Validation APIs (Phase 2)

#### API 6: Employer Master Details
```
GET /api/v1/Employer/getERMasterDetails/{regNo}
```

#### API 7: Self-Employed Master Details
```
GET /api/v1/Employer/getSEMasterDetails/{ssn}
```

### Employee Lookup APIs (Phase 2)

#### API 8: IP Details By Query
```
GET /api/v1/Employee/getIpDetailsByQuery/{ssn},{dob},{fname},{lname},{mname}
```

#### API 9: Multiple IP Details (Bulk SSN)
```
POST /api/v1/Employee/getMultipleIpDetails
```

### Profile Sync API (Phase 2)

#### API 10: Update User Profile
```
POST /api/v1/User/updateUser
```

### Payment APIs (Phase 2)

#### API 11: Payment Save
```
POST /api/v1/api/payment/save/{payerId}/{payerType}
```

#### API 12: Receipt Lookup
```
GET /api/v1/api/payment/getReceipt/{receiptNo}
```

### Utility API (Phase 2)

#### API 13: Connectivity Check
```
GET /api/v1/ReferenceData/about/
```

## Implementation Status

### ✅ Phase 1: C3 History + Employee Sync (5 APIs)
- `public_api_c3_range`, `public_api_c3_detail`, `public_api_c3_last_submitted`
- `public_api_employees_by_last_c3`, `public_api_nwdirectors_by_last_c3`

### ✅ Phase 2: Full BIMA Replacement (8 APIs)
- `public_api_er_master_details` — Employer master by regNo
- `public_api_se_master_details` — SE master by SSN (ip_master + ip_self_employ)
- `public_api_ip_details_by_query` — Employee lookup by SSN/DOB/name
- `public_api_multiple_ip_details` — Bulk SSN validation
- `public_api_update_user` — Profile update (ER/SE)
- `public_api_payment_save` — Payment + receipt generation
- `public_api_get_receipt` — Receipt lookup
- Health alias at /ReferenceData/about/

### ✅ API Registry
- 13 entries across categories: c3-history, employee-sync, validation, employee-lookup, profile-sync, payment, utility

### ✅ External API Master
- All 13 C3-Wizard APIs registered under "C3-Wizard" group for admin UI visibility

### ✅ Integration Guides
- v1: `C3_History_Sync_Integration_Guide.pdf` — Initial 3 APIs
- v2: `C3_Integration_Response_v2.pdf` — 5 APIs + query responses
- v3: `C3_Full_API_Migration_Guide_v3.pdf` — Complete 13-API guide

## Deferred APIs (Not Implemented)
- User Registration — Handled by SSB Admin's own registration flow
- C3 Bulk Submit — Uses existing C3 ingestion APIs (c3-reported, c3-wages, c3-verify)
- C3 Delete — Not supported per SSB Admin data integrity policy

## C3-Wizard Query Responses Summary

| Query | Status | Answer |
|-------|--------|--------|
| Q1 — URL Prefix | ✅ Resolved | Set base_url to include `/api/v1` |
| Q2 — Employee API | ✅ Implemented | `GET /Employee/employeesByLastC3/{regNo}` |
| Q3 — NW Director API | ✅ Implemented | `GET /Employee/nwdirectorsByLastC3/{regNo}` |
| Q4 — Payer Type | ✅ Confirmed | ER+EE, ER+NW, SE+EE |
| Q5 — Empty Response | ✅ Confirmed | Range/Employee=200[], Detail/Last=404 |
| Q6 — Rate Limits | ✅ Confirmed | 100 req/min default, configurable |
| Q7 — Profile Update | ✅ Implemented | Security Q&A acknowledged, not stored |
| Q8 — Connectivity | ✅ Implemented | /ReferenceData/about/ returns health |

## Data Mapping Notes (Pending C3-Wizard Clarification)
- ER Master: `contactPerson` defaults to `compName`, `postalCode` returns null, `isLevyExempt` defaults to false
- SE Master: `wageCategory` and `tin` return null, `userName` returns empty string
- Payment: Receipt auto-generated, fund codes SS/LV/SV/PN supported
- Profile Update: Security questions acknowledged but not persisted
