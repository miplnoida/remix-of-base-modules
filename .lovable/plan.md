

# Fix Validation API Issues — Email Enforcement & Address Mapping

## Issues Identified

### Issue 1: Email Validation Not Enforced (SECURITY BUG)
Both ER and SE master RPCs have `p_email TEXT DEFAULT NULL` — email is optional. The edge function handlers also treat email as optional: if the URL doesn't include `,email`, validation is skipped entirely. Data leaks based on a single identifier (regNo or SSN), which is exactly the security gap the C3-Wizard team flagged in Section 12 of their guide.

**Root cause in edge function** (lines 660-667 & 678-685): `email` is derived from `parts[1]` after comma-split. If no comma in URL, email is `null` and the RPC skips validation.

### Issue 2: ER Master Address Mapping Wrong
Current mapping: `city → COALESCE(TRIM(v_rec.maddr1), '')` — this is **mailing address line 1**, not city. The `er_master` table has no dedicated `city` column. The `hq_addr2` field typically contains the island/city (e.g., "Nevis"). 

Correct mapping should be:
- `address1` → `hq_addr1` (physical/HQ address line 1) ✅ already correct
- `address2` → `hq_addr2` (physical/HQ address line 2) ✅ already correct  
- `city` → empty string (no city column exists; `maddr1` is mailing, not city)

### Issue 3: SE SSN 100010 — Data Exists, API Should Work
Database confirms:
- `ip_master`: SSN 100010 exists (Tonnie James, tonnie@yopmail.com)
- `ip_self_employ`: 2 activities exist (status P)
- `ip_self_category`: 2 wage categories exist

The SE master RPC should return this data successfully. The "invalid ssn" error is likely on the **C3-Wizard side** — they may be calling the wrong endpoint, or their local validation is failing. A clarification request will be raised.

## Changes

### Step 1: Database Migration — Fix 2 RPCs

**`public_api_er_master_details`**: 
- Make `p_email` truly required: if NULL or empty, return error `{ "error": "Email is required", "code": "BAD_REQUEST" }`
- Fix `city` mapping: change from `maddr1` to empty string `''`
- Return 404 (NOT_FOUND) when email doesn't match

**`public_api_se_master_details`**:
- Make `p_email` truly required: same validation as ER
- Return 404 when email doesn't match

### Step 2: Edge Function — Enforce Email in Handlers

Update `handleERMasterDetails` (line 660):
- After splitting `regNoAndEmail`, if `email` is null/empty, throw `BAD_REQUEST` error: "Email parameter is required. Use format: /{regNo},{email}"

Update `handleSEMasterDetails` (line 678):
- Same enforcement for `ssnAndEmail`

### Step 3: Raise Query to C3-Wizard Team

Prepare a structured message asking:
- **SE SSN 100010**: Which exact API endpoint is being called? The SE master details API (`/Employer/getSEMasterDetails/100010,tonnie@yopmail.com`) should return valid data. Please share the exact URL being called and the full error response.
- **Confirmation**: Email is now mandatory for both ER and SE lookups (URL format: `/{regNo},{email}` and `/{ssn},{email}`). Calls without email will return 400.
- **Address fields**: `city` will return empty string for ER (no city column in database). Is this acceptable, or should C3-Wizard derive city from `address2`?

## Files Modified

| File | Change |
|------|--------|
| Migration SQL | Recreate 2 RPCs with mandatory email + fixed address mapping |
| `supabase/functions/public-api/index.ts` | Add email-required check in both handlers |

