# C3-Wizard API Migration — Updated Guide Implementation Plan

## Summary of Changes Required

The C3-Wizard team's updated guide reveals significant gaps between the current implementation and what BIMA actually returns. This plan addresses all discrepancies, including a critical **Security Enhancement** (email validation on Employer/SE lookup) and several **bug fixes** (wrong column names in employee sync RPCs).

---

## Critical Bug Fix

The employee sync RPCs (`public_api_employees_by_last_c3`, `public_api_nwdirectors_by_last_c3`) reference non-existent columns: `m.first_name`, `m.last_name`, `m.date_of_birth`. The actual columns are `m.firstname`, `m.surname`, `m.dob`. These RPCs would fail at runtime. Must be fixed.

---

## Changes by API

### 1. C3 Range API — Date Format Fix

**Current**: Expects `DD-MM-YYYY` in URL path  
**Required**: `MMYYYY` format (e.g., `012025`, `122025`)  
**Response changes**: Return `month`, `year`, `seqNo`, `payerType`, `c3Type` instead of full header object

**Changes**: Update `public_api_c3_range` RPC to parse `MMYYYY`, update edge function URL regex for `{startDate}/{endDate},{c3Type}`

### 2. C3 Detail API — Response Field Alignment

**Current**: Returns `sequenceNo`, dates in `DD/MM/YYYY`, `c3Status` as `VAC`  
**Required**: Returns `c3Status` as `S` (submitted), `submittedByEmail` field, `dateReceived` as `YYYY-MM-DD`  
**Changes**: Update RPC to match exact BIMA response schema

### 3. Employee Sync RPCs — Column Name Fixes

**Bug**: `m.first_name` → `m.firstname`, `m.last_name` → `m.surname`, `m.date_of_birth` → `m.dob`  
**Also**: Add `payPeriod` as single char (M/W/F), add `startDate`/`endDate` from ip_wages if available

### 4. Employer Master Details — Enhanced with Email Validation

**Current**: `GET /Employer/getERMasterDetails/{regNo}`  
**Required**: `GET /Employer/getERMasterDetails/{regNo},{email}`  
**Response changes**: Add fields `city`, `phoneNo`, `mobileNo`, `dateRegistered`, `prntRegNo`, `regNo`, `firstName`/`lastName` from contact. Map `c3RegnStatusCode` with values `D`/`A`/`O` (not `R`/`NR`).  
**Changes**: Update RPC signature, add email cross-check, update field mappings

### 5. SE Master Details — Enhanced with Email Validation

**Current**: `GET /Employer/getSEMasterDetails/{ssn}`  
**Required**: `GET /Employer/getSEMasterDetails/{ssn},{email}`  
**Response changes**: Add `email` from `ip_master.email_addr`, `wageCategory` from `ip_self_category`, `tradeName` from self-employ business, `gender`/`dateOfBirth`/`lastName`/`city`/`dateRegistered`, `name` composite field  
**Changes**: Update RPC signature, add email cross-check, join `ip_self_category` for wage category

### 6. IP Details by Query — Major Response Expansion

**Current**: Returns basic person info (12 fields)  
**Required**: Returns full employee profile (25+ fields) including `socSecNum`, `gender`, `streetAddress`, `cityTownName`, `stateRegion`, `postalCode`, `countryCode`, `email`, `phoneNo`, `mobileNo`, `occupation`, `salary`, `last_Pay_Date`, `isLevyExempt`, `isActive`, `isdirectorOnly`, `isemployeeDirector`, `status`  
**DOB format**: Must accept `MM/DD/YYYY` in addition to current formats  
**middleName**: Must handle literal `"null"` string as empty  
**Changes**: Rewrite RPC to join `ip_employer` for occupation/employment data, add all missing fields

### 7. Multiple IP Details — Input/Output Format Fix

**Current**: Expects `{ employees: [...] }` with `socSecNum` key  
**Required**: Accepts raw array `[...]` with `ssn`/`birthDate`/`firstName`/`lastName` keys  
**Response**: Must include `socSecNum`, `valid` field  
**Changes**: Update edge function to accept direct array, update RPC to match on `ssn` key

### 8. Update User — Response Message Alignment

**Current**: Returns `{ success: true, message: "Profile updated successfully" }`  
**Required ER**: `{ message: "Employer data Successfully Updated!" }`  
**Required SE**: `{ message: "Self Employee data Successfully Updated!" }`  
**Also**: Handle `employerType` field (not just `payerType`), `contactName`, `companyName`, `tradeName`, `country`, `postalCode`, `userName`, `firstName`, `surName`  
**Changes**: Update RPC to handle full BIMA payload fields and return exact response messages

### 9. Payment Save — Payload Structure Fix

**Current**: Expects `p_payload.payments` array with `amount` key  
**Required**: Expects `paymentHeaders` array with `paymentAmount` key, `mopCode`/`officeCode` at top level  
**Response**: Must return `{ receiptId: "RCP-2025-001234", message: "Payment processed successfully" }`  
**Changes**: Update RPC to read correct field names from BIMA payload



---

## Implementation Steps

### Step 1: Database Migration — Recreate All RPCs

Single migration that drops and recreates all 12 RPCs with corrected logic:

- Fix column names (`firstname`/`surname`/`dob`)
- Fix C3 Range date parsing (`MMYYYY`)
- Fix C3 Range/Detail response fields to match BIMA exactly
- Add email validation to ER/SE master lookups
- Expand IP Details response schema
- Fix Multiple IP Details input format
- Fix Update User response messages and field handling
- Fix Payment Save payload structure
- Step 2: Update Edge Function Routes

-   
Update ER Master route regex: `/{regNo}` → handle `/{regNo},{email}` (comma-separated)
- Update SE Master route regex: `/{ssn}` → handle `/{ssn},{email}` (comma-separated)
- Update C3 Range URL regex for `MMYYYY` format
- Update Multiple IP Details handler to accept raw array (not wrapped)
- Pass email params to RPC calls

### Step 3: Update External API Master Entries

Update `external_api_master` rows for ER/SE master to reflect new URL patterns with email parameter.

### Step 4: Update Plan Document

Update `.lovable/plan.md` with current state of all 13 APIs.

### Step 5: Generate Response Document

Create `/mnt/documents/C3_Integration_Response_v2.pdf` with:

- Confirmation of all changes made per the updated guide
- Exact URL patterns now supported
- Response schema examples for each API
- Answers to Section 12 action items (email validation confirmed, DOB format support confirmed, empty lastName/null middleName handling confirmed)
- Migration notes

---

## Files to Create/Modify


| File                                                | Action                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Migration SQL**                                   | Recreate 12 RPCs with all fixes                                                     |
| `supabase/functions/public-api/index.ts`            | Update route regexes, handler parameter passing, Multiple IP Details array handling |
| `external_api_master` rows                          | Update ER/SE endpoint URLs                                                          |
| `.lovable/plan.md`                                  | Update API status                                                                   |
| `/mnt/documents/C3_Full_API_Migration_Guide_v3.pdf` | Complete response for C3-Wizard team                                                |
