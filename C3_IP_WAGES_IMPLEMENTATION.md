# C3 Form → ip_wages Persistence Implementation

## Summary
Backend logic has been implemented to persist wage-detail rows into the `ip_wages` table when users Save or Submit C3 forms. The logic executes in the C3 save functions (`saveC3Draft`, `saveSelfContributorC3`, `saveVoluntaryContributorC3`) and follows the specification exactly.

## Changes Made

### 1. **Employer C3 – Employee Detail** (`saveC3Draft` in c3Service.ts)

**Trigger:** When user clicks Save on Employer C3 form.

**Logic:**
- For each Employee row in the form, creates/updates one `ip_wages` record
- **Upsert:** If record exists for `(ssn, payer_id, payer_type, sequence_no, period)` → UPDATE, else INSERT
- **Field mappings:**
  - `ssn` = SSN from Employee Detail
  - `payer_id` = employer ID from parent C3
  - `payer_type` = 'ER'
  - `sequence_no` = Schedule from parent
  - `period` = Period from parent (YYYY-MM-DD)
  - `pay_period` = 1 (Monthly), 2 (Bi-Weekly), 3 (Quarterly), 4 (2-Monthly)
  - `wages_paid1..7` = Week 1–5, Bonus Pay, Holiday Pay (NULL if no value)
  - `paid_code1..7` = 1 if amount exists and > 0, else 0
  - `ip_ss_amt`, `ip_levy_amt`, `ip_pe_amt` = Employee contributions
  - `er_ss_amt`, `er_levy_amt`, `er_ei_amt` = Employer contributions
  - Audit fields: `entered_by`, `date_entered`, `modified_by`, `date_modified`, `verified_by`, `date_verified`
  - `posting_status` = copied from parent; not overwritten if parent = 'DEL'

### 2. **Self-Contributor C3 – Wages Detail** (`saveSelfContributorC3` in c3Service.ts)

**Trigger:** When user clicks Save on Self-Contributor C3 form.

**Logic:**
- One `ip_wages` record per SSN (payer_id = SSN)
- `payer_type` = 'SE'
- `pay_period` = 1 (Monthly)
- `wages_paid1..5` = Week 1–5 wages (NULL if not selected)
- `wages_paid6`, `wages_paid7` = NULL
- `paid_code1..5` = 1 if wages exist else 0; `paid_code6`, `paid_code7` = NULL
- All contribution amounts = NULL
- Same audit fields as Employer

### 3. **Voluntary Contributor C3 – Wages Detail** (`saveVoluntaryContributorC3` in c3Service.ts)

**Trigger:** When user clicks Save on Voluntary Contributor C3 form.

**Logic:** Same as Self-Contributor except `payer_type` = 'VC'.

### 4. **General Rules Implemented**

- **UTC timestamp** for all date fields
- **UserCode** of logged-in user for `entered_by`, `modified_by`, `verified_by`
- **posting_status** copied from parent; not overwritten if parent = 'DEL'
- **Numeric fields** with no value → NULL (not empty string)
- **paid_code** = 1 if amount exists and > 0, 0 otherwise
- **One ip_wages record per SSN** per submission
- **Upsert** on conflict: `(ssn, payer_id, payer_type, sequence_no, period)`

### 5. **Employer C3 Edit – Load Employees**

When editing an Employer C3, the form now fetches the full record with wages and maps `ip_wages` rows to the Employee Detail format so existing employees and wages are displayed correctly.

## Files Modified

1. **src/services/c3Service.ts**
   - `toNumericOrNull`: Allow 0 to be stored (only null/undefined/'' → null)
   - `toPaidCode`: 1 if amount > 0, else 0
   - `mapPayPeriodToCode`: Added Quarterly (3)
   - `saveC3Draft`: Upsert logic, period validation, field mappings per spec
   - `saveSelfContributorC3`: Upsert logic, period validation, SE-specific mappings
   - `saveVoluntaryContributorC3`: Upsert logic, period validation, VC-specific mappings

2. **src/pages/c3Management/C3Management.tsx**
   - `handleEdit`: For Employer C3, fetches `getC3RecordWithWages` and maps wages to employees for the form

## Validation Checklist

After save, verify:
- [ ] One `ip_wages` row exists per SSN
- [ ] `payer_type` matches C3 contributor type (ER/SE/VC)
- [ ] `paid_code` flags correctly reflect entered amounts
- [ ] No numeric field stores empty strings (use NULL)
- [ ] `posting_status` matches parent C3 record

## Testing

1. **Employer C3:** Add employees with weekly wages, bonus, holiday pay → Save → Check `ip_wages` table
2. **Self-Contributor:** Enter SSN, select weeks, enter weekly wage → Save → Check `ip_wages` table
3. **Voluntary:** Same as Self-Contributor → Save → Check `ip_wages` table
4. **Edit Employer:** Edit existing Employer C3 → Verify employees load → Modify → Save → Verify updates in `ip_wages`
