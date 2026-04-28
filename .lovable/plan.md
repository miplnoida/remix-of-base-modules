## Two issues

### A. `MASTER_DOC_MIRROR_FAILED: column "file_name" of relation "ip_documents" does not exist`

The `convert_application_atomic` RPC mirrors staging rows into `ip_documents`, writing columns:
`file_name`, `verification_type`, `metadata` — none of which exist on the `ip_documents` table.

Verified live `ip_documents` columns: `id, unique_uuid, document_type, document_name, file_path, file_size (integer), mime_type, uploaded_at, uploaded_by, is_temp, verification_category, supportive_doc_type, is_supportive, ssn, doc_code, source_document_id, application_reference_number, is_active, transfer_status, transfer_error, dms_document_id, dms_uploaded_at`.

### B. The `MASTER_DOC_MIRROR_FAILED` error did not appear in `/system-logs/errors`

The hook's `catch` block does call `logApplicationError(...)` but with `void` (fire-and-forget). The error is thrown by the RPC, the hook returns immediately, the page may toast and navigate, and the in-flight insert into `system_error_logs` can be cancelled before it lands. Schema-wise the table accepts the payload (`correlation_id` UUID, `device_info` text, `payload_json` jsonb — all match what we send).

---

## Fix

### 1. Add the missing columns to `ip_documents` (new migration)

```sql
ALTER TABLE public.ip_documents
  ADD COLUMN IF NOT EXISTS file_name         text,
  ADD COLUMN IF NOT EXISTS verification_type text,
  ADD COLUMN IF NOT EXISTS metadata          jsonb;

-- staging uses bigint; widen master so large uploads do not overflow
ALTER TABLE public.ip_documents
  ALTER COLUMN file_size TYPE bigint USING file_size::bigint;
```

No data exists that needs preservation (columns are new / widening only).

### 2. Make the conversion error log reliable

In `src/hooks/useConvertToIPRegistration.ts` `catch` block:
- Replace `void logApplicationError(...)` with an **awaited** call wrapped in its own try/catch so the insert into `system_error_logs` finishes before the hook returns. The `globalErrorHandler` already swallows its own failures, so this can never rethrow.
- Keep the toast classification untouched.

This guarantees every conversion failure (including DB-side `MASTER_DOC_MIRROR_FAILED`, `DOCUMENT_INSERT_FAILED`, `DUPLICATE_CONVERSION`, validation, etc.) lands in `/system-logs/errors` with module=`online-applications/convert`, full stack, sanitized payload (applicationReference, meetingId, userId), correlation_id and session_id.

### 3. Verification

- Re-attempt acceptance for IP-REG-2026-402256 → conversion succeeds; `ip_documents` rows now carry `file_name`, `verification_type`, `metadata`.
- Force any conversion failure → row appears in `/system-logs/errors` with module `online-applications/convert`, severity `error`, full stack and request payload.

---

## Files to change

1. New migration `supabase/migrations/<ts>_add_missing_ip_documents_columns.sql` — adds `file_name text`, `verification_type text`, `metadata jsonb`; widens `file_size` to `bigint`.
2. `src/hooks/useConvertToIPRegistration.ts` — await the `logApplicationError` call in the `catch` block, wrapped in a defensive try/catch.

## Out of scope
- Refactoring other modules' silent-catch sites — only the conversion path is in this fix.
