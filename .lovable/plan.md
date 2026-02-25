

# Plan: Consolidate Document Handling — Remove `ip_documents` Usage for External API Documents Only

## Summary

Remove all `ip_documents` reads/writes that handle documents originating from the external online-insured-person-application API. Keep `ip_documents` table intact (no DROP). Use `ip_application_documents` as the single source of truth for these documents. Add `application_reference_number` column to `ip_application_documents` for linking.

## Current State

| Location | Currently uses `ip_documents` | Purpose |
|---|---|---|
| `MeetingDocumentVerificationTab.tsx` | Fetch, Insert, Delete | Meeting document uploads & display |
| `DocumentVerificationTab.tsx` (IP Registration) | Fetch, Insert, Delete | IP Registration document uploads & display |
| `VerificationTab.tsx` (legacy) | Fetch, Insert, Delete | Legacy verification tab |
| `useIPRegistration.ts` line 524 | Select query | Marriage certificate check before submit |
| `convert_application_atomic` RPC | Insert into `ip_application_documents` only | Already correct — no change needed |
| `dms-transfer` Edge Function | `ip_application_documents` only | Already correct — no change needed |

## Step 1: Database Migration

Add columns to `ip_application_documents` that currently only exist on `ip_documents`:

```sql
ALTER TABLE ip_application_documents
  ADD COLUMN IF NOT EXISTS application_reference_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS verification_category VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_supportive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supportive_doc_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS uploaded_by UUID;

CREATE INDEX IF NOT EXISTS idx_ip_app_docs_app_ref
  ON ip_application_documents(application_reference_number);
```

This ensures `ip_application_documents` can store the same metadata that `ip_documents` currently holds (verification_category, is_supportive, supportive_doc_type, uploaded_by).

## Step 2: Update `convert_application_atomic` RPC

The RPC (latest migration `20260221214928`) inserts documents into `ip_application_documents` but does NOT populate `application_reference_number`. Update the INSERT to include it:

```sql
-- In the document INSERT loop, add application_reference_number = TRIM(p_application_ref_number)
INSERT INTO ip_application_documents (
  ssn, application_reference_number, document_name, ...
) VALUES (
  v_final_ssn, NULLIF(TRIM(p_application_ref_number), ''), ...
);
```

## Step 3: Update `MeetingDocumentVerificationTab.tsx`

### Fetch (lines 285-299)
**Before:** Queries `ip_documents` WHERE `unique_uuid = storageKey`
**After:** Queries `ip_application_documents` WHERE `application_reference_number = applicationReference` OR `ssn = applicationReference`, ordered by `uploaded_at DESC`

### Upload (lines 343-358)
**Before:** Primary insert into `ip_documents`, secondary insert into `ip_application_documents`
**After:** Single insert into `ip_application_documents` only, with `application_reference_number`, `verification_category`, `is_supportive`, `supportive_doc_type`, `uploaded_by` columns populated directly

### Delete (lines 413-431)
**Before:** Deletes from both `ip_documents` and `ip_application_documents`
**After:** Deletes from `ip_application_documents` only (by `id`)

### UploadedDocument interface (lines 39-49)
Update to match `ip_application_documents` column names (e.g., `file_name` instead of `document_name` for the raw file, `document_name` for the type description).

## Step 4: Update `DocumentVerificationTab.tsx` (IP Registration)

### Fetch (lines 377-391)
**Before:** Queries `ip_documents` WHERE `unique_uuid = formData.unique_uuid`
**After:** Queries `ip_application_documents` WHERE `ssn = ssn` OR `metadata->>'unique_uuid' = formData.unique_uuid` (fallback for pre-SSN state)

### Upload (lines 435-481)
**Before:** Primary insert into `ip_documents`, secondary insert into `ip_application_documents`
**After:** Single insert into `ip_application_documents` with all fields including `verification_category`, `is_supportive`, `supportive_doc_type`, `uploaded_by`, and `application_reference_number` (from formData if available)

### Delete (lines 511-514)
**Before:** Deletes from `ip_documents`, then cascades to `ip_application_documents`
**After:** Deletes from `ip_application_documents` only

## Step 5: Update `VerificationTab.tsx` (Legacy)

### Fetch (lines 42-52)
**Before:** Queries `ip_documents` WHERE `ssn = formData.ssn`
**After:** Queries `ip_application_documents` WHERE `ssn = formData.ssn`

### Upload (lines 56-81)
**Before:** Inserts into `ip_documents`
**After:** Inserts into `ip_application_documents` with `ssn`, `verification_category`, `transfer_status = 'Pending'`

### Delete (lines 84-92)
**Before:** Deletes from `ip_documents`
**After:** Deletes from `ip_application_documents`

## Step 6: Update `useIPRegistration.ts` (Marriage Certificate Check)

### Line 524
**Before:** Queries `ip_documents` WHERE `ssn = formData.ssn` AND `document_type = 'Marriage Certificate'`
**After:** Queries `ip_application_documents` WHERE `ssn = formData.ssn` AND `document_name = 'Marriage Certificate'`

## What Does NOT Change

- **`ip_documents` table**: Remains in the database untouched (no DROP, no ALTER)
- **`dms-transfer` Edge Function**: Already uses `ip_application_documents` exclusively — no changes
- **`dms-transfer-single` Edge Function**: Already uses `ip_application_documents` — no changes
- **`convert_application_atomic` RPC**: Already inserts into `ip_application_documents` — only adding `application_reference_number` column to the INSERT
- **Storage bucket**: Still `ip-documents` (Supabase Storage) — unchanged

## Files Modified

| File | Type of Change |
|---|---|
| New SQL migration | Add columns + index to `ip_application_documents` |
| New SQL migration | Update `convert_application_atomic` RPC to include `application_reference_number` |
| `src/components/meetings/MeetingDocumentVerificationTab.tsx` | Replace `ip_documents` → `ip_application_documents` |
| `src/pages/ip-registration/tabs/DocumentVerificationTab.tsx` | Replace `ip_documents` → `ip_application_documents` |
| `src/components/ip-registration/VerificationTab.tsx` | Replace `ip_documents` → `ip_application_documents` |
| `src/hooks/useIPRegistration.ts` | Update marriage cert query |

## Verification Scenarios

1. Fetch an online application with documents → confirm rows saved in `ip_application_documents` with correct `application_reference_number`
2. Open meeting flow → documents display from `ip_application_documents`, no `ip_documents` queries
3. Upload in meeting → saved to `ip_application_documents` only with `verification_category`, `is_supportive`
4. Upload in IP Registration → saved to `ip_application_documents` only
5. Approve IP Registration → DMS transfer reads from `ip_application_documents` (already does), marks as Transferred
6. Marriage certificate check → queries `ip_application_documents` successfully

