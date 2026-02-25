
# Plan: Consolidate Document Handling — COMPLETED

## Summary

Removed all `ip_documents` reads/writes for documents from external online-insured-person-application API. `ip_documents` table kept intact (no DROP). `ip_application_documents` is now the single source of truth. Added `application_reference_number` column for linking to IP-REG-xxxx-xxxxxx.

## What Was Done

### 1. Database Migration (✅ Complete)
- Added `application_reference_number`, `verification_category`, `is_supportive`, `supportive_doc_type`, `uploaded_by` columns to `ip_application_documents`
- Created index `idx_ip_app_docs_app_ref` on `application_reference_number`

### 2. Updated `convert_application_atomic` RPC (✅ Complete)
- Document INSERT now populates `application_reference_number = TRIM(p_application_ref_number)`

### 3. Updated `MeetingDocumentVerificationTab.tsx` (✅ Complete)
- Fetch: queries `ip_application_documents` by `application_reference_number` or `ssn`
- Upload: single insert into `ip_application_documents` with all fields
- Delete: deletes from `ip_application_documents` only

### 4. Updated `DocumentVerificationTab.tsx` (✅ Complete)
- Fetch: queries `ip_application_documents` by `ssn` or `metadata->unique_uuid`
- Upload: single insert into `ip_application_documents`
- Delete: deletes from `ip_application_documents` only

### 5. Updated `VerificationTab.tsx` (✅ Complete)
- Fetch/Upload/Delete all target `ip_application_documents`

### 6. Updated `useIPRegistration.ts` (✅ Complete)
- Marriage certificate check queries `ip_application_documents` by `document_name`

### 7. Knowledge Repository & Test Cases (✅ Complete)

## What Did NOT Change
- `ip_documents` table: remains untouched
- `dms-transfer` Edge Function: already uses `ip_application_documents`
- Storage bucket: still `ip-documents`
