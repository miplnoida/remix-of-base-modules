

# Full BIMA API Replacement — Analysis & Implementation Plan

## Document Summary

The C3-Wizard team's handoff document identifies **15 total BIMA endpoints**. Of these:

- **5 are already implemented** (C3 Range, Detail, Last Submitted, Employees by Last C3, NW Directors by Last C3)
- **3 are deferred** (User Registration, C3 Bulk Submit, C3 Delete)
- **7 need implementation** across 4 priority groups

## New APIs to Implement (7 endpoints)

| # | Endpoint | Method | Priority | Category |
|---|----------|--------|----------|----------|
| 1 | `/Employer/getERMasterDetails/{regNo}` | GET | HIGH | validation |
| 2 | `/Employer/getSEMasterDetails/{ssn}` | GET | HIGH | validation |
| 3 | `/Employee/getIpDetailsByQuery/{ssn},{dob},{fname},{lname},{mname}` | GET | MEDIUM | employee-lookup |
| 4 | `/Employee/getMultipleIpDetails` | POST | MEDIUM | employee-lookup |
| 5 | `/User/updateUser` | POST | MEDIUM | profile-sync |
| 6 | `/api/payment/save/{payerId}/{payerType}` | POST | MEDIUM | payment |
| 7 | `/api/payment/getReceipt/{receiptNo}` | GET | MEDIUM | payment |
| 8 | `/ReferenceData/about/` | GET | LOW | utility |

## Database Gap Analysis — Questions for C3-Wizard Team

Before implementing, there are critical data mapping gaps. The `er_master` table is missing several fields from the expected BIMA response (`contactPerson`, `postalCode`, `isLevyExempt`, `c3RegnStatusCode`, `statusCode`, `employerType`, `firstName`, `lastName`). There is no dedicated Self-Employed master table. Payment receipt tables exist but may not match BIMA's receipt structure.

**A structured query message will be prepared for the C3-Wizard team** covering these gaps, asking them to clarify which fields are truly required vs. optional, and what fallback behavior is acceptable when certain fields don't exist in the SSB Admin database.

## Implementation Plan

### Step 1: Database — 6 New RPC Functions

1. **`public_api_er_master_details(p_reg_no TEXT)`** — Query `er_master` by `regno`, map available columns to BIMA response format. Missing fields (`contactPerson`, `postalCode`, etc.) will use NULL or derived values where possible.

2. **`public_api_se_master_details(p_ssn TEXT)`** — Query `ip_master` by `ssn` for self-employed persons. Map `firstname`, `surname`, `dob`, `email_addr`, `phone`, `mobile`, `resident_addr1/2`, `sex`, `marital_status` to the BIMA response fields. Fields like `wageCategory`, `tin`, `c3RegnStatusCode` may need defaults.

3. **`public_api_ip_details_by_query(p_ssn TEXT, p_dob TEXT, p_first_name TEXT, p_last_name TEXT, p_middle_name TEXT)`** — Query `ip_master` + `ip_employer` for employee details matching SSN/DOB/name criteria. Return BIMA-compatible employee detail array.

4. **`public_api_multiple_ip_details(p_employees JSONB)`** — Bulk validate SSNs against `ip_master`. Accept JSONB array, return validation results.

5. **`public_api_update_user(p_payload JSONB)`** — Update `er_master` (for ER type) or `ip_master` (for SE type) with profile changes from C3-Wizard.

6. **`public_api_payment_save(p_payer_id TEXT, p_payer_type TEXT, p_payload JSONB)`** — Insert payment into `cn_payment_header` + line items. Return receipt number from `cn_receipt`.

7. **`public_api_get_receipt(p_receipt_no TEXT)`** — Query `cn_receipt` + `cn_payment_header` for receipt details.

### Step 2: Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_er_master_regno ON er_master(regno);
CREATE INDEX IF NOT EXISTS idx_ip_master_ssn_lookup ON ip_master(ssn, dob);
CREATE INDEX IF NOT EXISTS idx_cn_receipt_number ON cn_receipt(receipt_number);
```

### Step 3: Update `public-api` Edge Function

Add route helpers:
- `isValidationRoute(path)` — matches `/api/v1/Employer/...`
- `isEmployeeLookupRoute(path)` — matches `/api/v1/Employee/getIpDetailsByQuery/...`
- `isPaymentRoute(path)` — matches `/api/v1/api/payment/...`
- `isProfileRoute(path)` — matches `/api/v1/User/...`
- `isUtilityRoute(path)` — matches `/api/v1/ReferenceData/...`

Add route patterns to `matchRoute()`:
- `GET /api/v1/Employer/getERMasterDetails/{regNo}` → `erMasterDetails`
- `GET /api/v1/Employer/getSEMasterDetails/{ssn}` → `seMasterDetails`
- `GET /api/v1/Employee/getIpDetailsByQuery/{params}` → `ipDetailsByQuery`
- `POST /api/v1/Employee/getMultipleIpDetails` → `multipleIpDetails`
- `POST /api/v1/User/updateUser` → `updateUser`
- `POST /api/v1/api/payment/save/{payerId}/{payerType}` → `paymentSave`
- `GET /api/v1/api/payment/getReceipt/{receiptNo}` → `receiptLookup`
- `GET /api/v1/ReferenceData/about/` → `healthCheck` (alias to existing health)

Add 7 handler functions calling the corresponding RPCs.

Update `checkApiRegistry` and `checkScopeAuthorization` with new category checks: `validation`, `employee-lookup`, `profile-sync`, `payment`, `utility`.

### Step 4: Register APIs in `api_registry`

Insert 8 new rows (7 new endpoints + health alias) with appropriate categories.

### Step 5: Register in External API Master

Insert all C3-Wizard-consumed APIs into `external_api_master` table (used by the External APIs screen) so they are visible and documented in the admin UI. Group them under `C3-Wizard` with request/response field definitions.

### Step 6: Generate Updated Integration Guide (v3)

Create `/mnt/documents/C3_Full_API_Migration_Guide_v3.pdf` covering all 13 active endpoints (5 existing + 8 new).

## Files to Create/Modify

| File | Action |
|------|--------|
| **Migration SQL** | 7 RPCs + 3 indexes |
| `supabase/functions/public-api/index.ts` | Add 7 route patterns, 7 handlers, 5 category checks |
| `api_registry` rows | Insert 8 new entries |
| `external_api_master` rows | Insert 13 entries for External APIs screen |
| `.lovable/plan.md` | Update with full API inventory |
| `/mnt/documents/C3_Full_API_Migration_Guide_v3.pdf` | Complete integration guide |

## Query Message for C3-Wizard Team

Before implementation, the following structured query will be sent:

---

**Subject: SSB Admin API Migration — Data Mapping Clarifications**

**To: C3-Wizard Development Team**

**Q1 — Employer Master: Missing Fields**

Our `er_master` table does not have these columns that appear in the BIMA response:
- `contactPerson` — Is this the employer name or a separate field?
- `postalCode` — Not in our schema. Can we return `null`?
- `isLevyExempt` — Not in our schema. Can we derive this from contribution configuration?
- `c3RegnStatusCode` / `c3RegnStatusText` — How does BIMA determine this? Is it based on whether the employer has submitted C3s online?
- `statusCode` / `statusText` — Our table has `status` (single char). What are the valid BIMA values? (A=Active, I=Inactive, C=Closed?)
- `employerType` — Always `ER` for employers?
- `isActive` — Derived from `status = 'A'`?
- `firstName` / `lastName` — These appear separate from `compName`. Are they the contact person's name?

**Q2 — Self-Employed Master: Source Table**

Our system stores insured persons in `ip_master`. For self-employed lookup by SSN:
- Should we look up by `ssn` field in `ip_master`?
- Where does BIMA store `wageCategory` and `tin` for self-employed? We don't have these in `ip_master`.
- `c3RegnStatusCode` for SE — same question as Q1.
- `userName` — Is this the C3-Wizard username or a BIMA user field? Can we return empty string?

**Q3 — Employee Lookup: Parameter Order**

Your document mentions two different parameter orderings:
- `/{ssn},{dob},{firstName},{lastName},{middleName}` (standard)
- `/{ssn},{dob},{firstName},,{lastName}` (bima-integration variant with double comma)

Should we support both? Or just the standard 5-param version?

**Q4 — Payment Save: Fund Codes & Payment Codes**

What are the complete sets of valid values for:
- `fundCode`: We see SS, LV, SV, PN — are there others?
- `paymentCode`: PC01, PC02, PC03 — full list?
- `officeCode`: Is this always from the employer/SE record?

**Q5 — Payment Save: Receipt Generation**

When BIMA processes a payment save, does it:
- Auto-generate a receipt number and return it?
- Or is the receipt number pre-assigned?

Our `cn_receipt` table has `receipt_number` — should we auto-generate in format `RCP-{YYYY}-{seq}`?

**Q6 — Receipt Lookup: Data Source**

The receipt lookup response includes `fundCode`, `paymentCode`, `periodMonth`, `periodYear`. Are these stored per-line-item in BIMA? Our `cn_payment_header` doesn't have fund/payment code columns — these may need to come from a payment details/line items table. Please confirm the receipt data model.

**Q7 — Profile Update: Security Questions**

The `updateUser` payload includes `question1`, `question2`, `answer1`, `answer2`, `passwordHash`. Should SSB Admin:
- Store these security questions? (We don't currently have a table for this)
- Or simply acknowledge receipt and return success?
- Is `passwordHash` ever non-empty? Should we process password changes?

**Q8 — Connectivity Check: Response Format**

For `/ReferenceData/about/` — you mention any 200 OK is acceptable. Should we return version info, or just `{ "status": "ok" }`?

---

This query will be presented as a formatted message. Implementation proceeds in parallel for endpoints where the data mapping is clear (Employee Lookup, Bulk SSN, Connectivity Check), while awaiting answers for the ambiguous ones (Employer/SE Master details, Payment Save, Profile Update).

