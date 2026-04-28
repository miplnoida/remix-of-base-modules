## Problem

Accepting an online IP application fails with:
> `DOCUMENT_INSERT_FAILED: Failed to insert document "Screenshot 2024-04-24 130404.png" — Invalid verification_type: supportive. Allowed values: birth_status, name_status, marital_status, death_status`

### Root cause
The trigger `validate_verification_type` (migration `20260225040726`) restricts `ip_application_documents.verification_type` to the four hardcoded `_status` values. The external API and platform uploads legitimately produce other values (e.g. `supportive`, and potentially others in future), so the trigger rejects valid data and aborts the entire atomic conversion.

### Decision (per user)
`verification_type` is free-form metadata — it must accept any non-empty string (or NULL). No whitelist.

### Secondary issue
Conversion errors are only `console.error`'d and toasted — they never reach `system_error_logs`, so `/system-logs/errors` cannot show them.

---

## Fix

### 1. Drop the verification_type whitelist (DB)

New migration `supabase/migrations/<ts>_relax_verification_type_validation.sql`:

- `DROP TRIGGER IF EXISTS trg_validate_verification_type ON public.ip_application_documents;`
- `DROP FUNCTION IF EXISTS public.validate_verification_type();`
- Keep the column nullable `varchar(100)` and the existing index — no schema change beyond removing the validator.
- Add a brief `COMMENT ON COLUMN` noting it's free-form metadata.

No mirror table changes needed (`ip_documents.verification_type` has no equivalent constraint).

Code paths that key off the four `_status` values (status-dropdown columns `birth_status / name_status / marital_status / death_status`, `useDocumentStatusDropdown`, `getStatusLabel`) keep working because they read those status *columns* directly — they don't depend on the trigger.

### 2. Centralized error logging to `/system-logs/errors`

Reuse the existing `logApplicationError` from `src/lib/globalErrorHandler.ts` (already inserts into `system_error_logs` with correlation_id, session_id, sanitized payload, severity, stack, module).

- **`src/hooks/useConvertToIPRegistration.ts`** — in the `catch` block (and on `result.success === false`), call `logApplicationError(err, { module: 'online-applications/convert', action: 'convert_application_atomic', entity_type: 'ip_application', entity_id: resolvedAppRefNumber, request_payload: { applicationReference, meetingId, userId } })` as fire-and-forget before classifying for the toast. Also log when the post-RPC `ip_audit_log` insert fails (currently silent).
- **`src/pages/online-applications/ApplicationDetailPage.tsx`** and **`src/pages/meetings/StartMeetingPage.tsx`** — wrap the `convert(...)` call site in try/catch and log unexpected throws with the page-level module name.
- Standardised payload shape (already enforced by `logApplicationError`): `error_message`, `stack_trace`, `error_type` (auto-categorised), `severity`, `module`, `api_name`, `entity_type`, `entity_id`, `payload_json`, `correlation_id`, `session_id`, `user_id`, `device_info`, `timestamp`.

### 3. Verification

- Re-run conversion for `IP-REG-2026-402256` — now succeeds; "Screenshot 2024-04-24 130404.png" is mirrored with `verification_type='supportive'`.
- Insert a doc with `verification_type='photo'` / `'identity'` / arbitrary string → succeeds.
- Insert with NULL → succeeds (was already allowed).
- Force a failure (e.g. invalid SSN format) → row appears in `/system-logs/errors` with module=`online-applications/convert`, full stack, sanitized payload.
- Status-dropdown UI for the four core categories continues to render (driven by `birth_status / name_status / marital_status / death_status` columns, unchanged).

---

## Files to change

1. `supabase/migrations/<ts>_relax_verification_type_validation.sql` (new) — drop trigger + function, add column comment.
2. `src/hooks/useConvertToIPRegistration.ts` — fire-and-forget `logApplicationError` in `catch` and on `result.success === false`; log audit-insert failures.
3. `src/pages/online-applications/ApplicationDetailPage.tsx` — wrap `convert(...)` invocation, log on throw.
4. `src/pages/meetings/StartMeetingPage.tsx` — same wrapping.

## Out of scope

- Replacing the validator with a softer hint (e.g. logging a warning) — user wants no restriction.
- Broad rollout of `useLoggedMutation` to unrelated mutation paths — only the conversion pipeline is wired up now.
