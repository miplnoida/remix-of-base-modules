## Goal

Make the document lifecycle for the **online IP application → IP registration** flow truly consistent and database-driven, fix the "replaced external doc not showing in Documents tab" bug, ensure conversion populates **`ip_documents`** (not just `ip_application_documents`), and reliably trigger the **`dms_service`** transfer from finalized state. All operations go through Supabase RPCs/Edge Functions; no direct client writes.

## Problems found in current implementation

1. **Two competing override stores.** Replacement uploads in the meeting screen go to `meeting_uploaded_documents` (via `MeetingDocumentVerificationTab`), but the Phase-1 resolver `ip_app_docs_resolve` only reads from `ip_application_documents`. Result: a replaced document does not appear in the Documents tab and is not picked up at conversion.
2. **Documents tab uses external API list directly** and only joins `ip_application_documents` by SSN (which doesn't exist before conversion). It must be driven by `ip_app_docs_resolve(applicationReference, externalDocs)` so replacements are visible immediately.
3. **`ip_documents` (master) is not populated at conversion.** `convert_application_atomic` writes only to `ip_application_documents`. The mirror trigger `trg_ip_master_post_insert_mirror_docs` fires on `ip_master` INSERT — which happens *before* the documents are inserted in the same RPC — so it copies zero rows.
4. **DMS trigger** (`dms_service` via the `dms-transfer` edge function) currently runs on workflow approval and reads `ip_application_documents`. After fix #3 it must read from `ip_documents` (the canonical post-registration table) and use the `dms_service` row in `api_settings` as the single source of truth (already the case but needs to survive the table switch). Failures must log to `external_api_execution_logs` and `er_audit_log` without rolling back the registration.

## Changes

### 1. Unify replacement storage (DB)

- **Stop writing to `meeting_uploaded_documents`** for IP replacements. Refactor `MeetingDocumentVerificationTab` so its adapter calls the existing RPCs:
  - Upload binary to the `ip-documents` bucket under `app/<applicationReference>/<categoryId>_<ts>.<ext>`.
  - `insertRecord` → `ip_app_doc_upsert(p_application_reference, p_source_document_id, p_file_meta, p_user_id, p_user_code)` — pass `source_document_id` when replacing an external API doc.
  - `deactivateByCategory` / `deleteDocument` → `ip_app_doc_delete(...)`.
  - `fetchDocuments` → `ip_app_docs_resolve(applicationReference, externalDocs)` and map the `merged` array into `UnifiedDocument[]` (source `external` vs `override`).
- Keep `meeting_uploaded_documents` only for read-back of legacy rows; add a one-time backfill RPC `ip_backfill_meeting_docs_to_overrides(p_application_reference)` that copies any active legacy rows for that reference into `ip_application_documents` before the resolver runs (idempotent on `(application_reference_number, source_document_id, file_path)`).
- Mirror the same change for the Employer flow (`EmployerMeetingDocumentsTab`) using the ER RPCs already created in Phase 1.

### 2. Drive the Documents tab from the resolver (UI)

- Refactor `ApplicationDocumentsTab` to use the new hook `useApplicationDocuments({ scope: 'ip', applicationReference, externalDocs })`. Render `merged` only — no separate join on `ip_application_documents` by SSN.
- Each row shows a `Source` badge (`External` / `Replaced` / `Uploaded`). Replaced externals are shown with a strike-through link to the original and the new file inline.
- After any upload/replace/delete, invalidate `['app-documents','ip',applicationReference]` so the tab refreshes immediately (no stale API cache).
- Apply the same change to the Review step and Admin Application Detail views so all three screens read from one source.

### 3. Fix `ip_documents` population at conversion (DB, transactional)

- Drop the after-INSERT trigger `trg_ip_master_post_insert_mirror_docs` (it fires before docs exist in the same RPC).
- Modify `convert_application_atomic` so that **after** it has inserted the document overrides into `ip_application_documents`, it inlines the mirror logic:
  - `INSERT INTO ip_documents (unique_uuid, ssn, document_type, document_name, doc_code, file_path, file_size, mime_type, uploaded_at, uploaded_by, verification_category, supportive_doc_type, is_supportive, source_document_id, application_reference_number)` selecting from `ip_application_documents` where `application_reference_number = p_application_ref_number AND is_deleted = false AND COALESCE(file_path,url,'') <> ''`.
  - Add the missing columns (`doc_code`, `source_document_id`, `application_reference_number`, `is_active`) to `ip_documents` if not present (additive migration, no destructive change). Default `is_active = true`.
  - Return `documents_added` in the RPC result so the client can verify and surface failure.
- Wrap the mirror in the same `BEGIN…EXCEPTION` block so any failure rolls back the entire conversion.
- Keep `ip_application_documents` as the staging/audit table (do not delete its rows after mirror); link via `source_document_id` for traceability.
- Keep the `ip_master_ssn_cascade` trigger (still useful when SSN changes after verification).

### 4. Ensure latest-version transfer at conversion (DB)

- The resolver already returns the **effective** doc set. The conversion hook now passes that set to `convert_application_atomic`, which will (a) insert each effective doc into `ip_application_documents` if not already there, then (b) mirror to `ip_documents` in the same transaction. This guarantees the replacement (not the original API URL) lands in `ip_documents`.
- Add a `version` column on `ip_application_documents` plus a unique index `(application_reference_number, source_document_id, version)`; auto-increment on each upsert when `source_document_id` matches an existing active row, and set `is_active = false` on the previous row (history preserved, only latest active visible to the resolver — already filters on `is_deleted = false`; extend filter to `AND is_active = true`).

### 5. DMS upload via `dms_service` (Edge Functions)

- Repoint `dms-transfer` and `dms-transfer-single` to read from `ip_documents` instead of `ip_application_documents` once the IP is in registration status (V or A). Source of truth for the URL/path remains `ip-documents` storage; for documents already moved to `ip-dms` skip.
- After successful upload to DMS, write back `dms_document_id`, `dms_uploaded_at`, `transfer_status='Transferred'` on the matching `ip_documents` row, and copy the file from `ip-documents` to the private `ip-dms` bucket so the original staging bucket can be cleaned up later.
- On failure: insert into `external_api_execution_logs` and `er_audit_log`, mark the row `transfer_status='Failed'` with `transfer_error`, and enqueue retry (a new lightweight `dms_transfer_queue` table consumed by a scheduled cron). The registration transaction is **not** affected.
- Trigger points (unchanged contract):
  - Workflow approval (`useWorkflowActions.ts`) — invokes `dms-transfer` for the SSN.
  - Manual button in `DocumentVerificationTab.tsx` — invokes `dms-transfer-single` for one document id.
  - New: also invoke `dms-transfer` automatically (fire-and-forget) at the end of `convert_application_atomic` via an `AFTER INSERT` trigger on `ip_documents` that only enqueues a row in `dms_transfer_queue` (no HTTP from the DB).

### 6. Audit & visibility

- Every RPC (`ip_app_doc_upsert`, `ip_app_doc_delete`, `convert_application_atomic` mirror step, `dms-transfer*`) writes to `er_audit_log` with `entity='ip_document'`, `action`, `before/after`, `user_code`.
- Admin "API Configuration → dms_service" detail page already shows `external_api_execution_logs`; surface counts of `Failed` transfers and a one-click retry that calls `dms-transfer-single`.

## Migrations (additive only — no destructive changes to Live data)

1. `add_columns_ip_documents.sql` — add `doc_code`, `source_document_id`, `application_reference_number`, `is_active`, `transfer_status`, `transfer_error`, `dms_document_id`, `dms_uploaded_at` if missing.
2. `add_version_ip_application_documents.sql` — add `version int default 1`, `is_active bool default true`, partial unique index on `(application_reference_number, source_document_id) where is_active`.
3. `replace_convert_application_atomic.sql` — append the in-transaction mirror block; drop `trg_ip_master_post_insert_mirror_docs`.
4. `dms_transfer_queue.sql` — new table + AFTER INSERT trigger on `ip_documents`.
5. `update_ip_app_docs_resolve.sql` — filter on `is_active = true`.

(No destructive `DROP COLUMN`/`DROP TABLE` on Live; legacy `meeting_uploaded_documents` rows are migrated by the backfill RPC, not deleted.)

## Edge Function changes

- `dms-transfer/index.ts` and `dms-transfer-single/index.ts`: switch source query from `ip_application_documents` to `ip_documents`; add post-success copy from `ip-documents` to `ip-dms`; on failure update `dms_transfer_queue` with retry metadata.
- New cron edge function `dms-transfer-retry` (every 5 min) that drains `dms_transfer_queue` with backoff (max 5 attempts).

## Frontend changes

- `MeetingDocumentVerificationTab.tsx` and `EmployerMeetingDocumentsTab.tsx`: swap adapter to use `useApplicationDocuments` RPCs; remove direct writes to `meeting_uploaded_documents`.
- `ApplicationDocumentsTab.tsx`: drop SSN-based query; consume `useApplicationDocuments({ scope:'ip' })`; render Source/Status badges; refresh on mutation.
- `useConvertToIPRegistration.ts`: no behavioral change required (already passes resolved docs); just assert `result.documents_added > 0` when `merged.length > 0` and surface a warning if not.
- `useConvertToEmployerRegistration.ts`: mirror the same assertion using ER RPCs.
- IP registration `DocumentVerificationTab.tsx`: read from `ip_documents` (already does post-registration); no functional change beyond column rename support.

## QA scenarios (to verify after implementation)

1. Replace a `birth_status` external doc in the meeting screen → row appears immediately in Documents tab with `Replaced` badge; original API row is hidden.
2. Delete a previously uploaded override → resolver hides it; original external doc reappears.
3. Convert application → `ip_documents` count == effective merged count; `dms_transfer_queue` has one row per doc.
4. Run `dms-transfer` → docs land in DMS, `transfer_status='Transferred'`, files copied to `ip-dms`, queue row deleted.
5. Force DMS API down → registration still succeeds; queue rows marked `Failed` with retry; admin sees them under `api-configuration → dms_service`.
6. SSN updated post-verification → `ip_documents.ssn` cascades via existing trigger; DMS `dms_document_id` retained.
7. Employer flow: same six checks against ER RPCs and ER audit/queue.

## Out of scope

- Re-architecting `meeting_uploaded_documents` away entirely (kept for legacy read until backfill is verified in Live).
- UI for the `dms_transfer_queue` retry dashboard beyond a row count + manual retry button on the existing `dms_service` admin page.

## Phase 2 — Step 2 status (in progress)

Done:
- Migration 1 (Phase 2 schema): `ip_documents` extra cols, `ip_application_documents`/`er_application_documents` versioning, `dms_transfer_queue` table, resolver filter on `is_active`, upsert versioning, `trg_ip_documents_enqueue_dms`, dropped broken pre-doc mirror trigger.
- Migration 2 (this step): rewrote `convert_application_atomic` to inline-mirror the active staging docs into `ip_documents` in the same transaction; returns `master_documents_mirrored`. Dropped obsolete `convert_application_atomic_with_master`.
- `useConvertToIPRegistration.ts` now logs warning when staging vs mirror counts diverge.

Next (still to do):
- ER convert RPC mirror to `er_documents` (mirror Phase 2 step 2 for Employer flow).
- Edge functions `dms-transfer` / `dms-transfer-single` to source from `ip_documents` + queue draining (`dms-transfer-retry` cron).
- UI: `ApplicationDocumentsTab`, meeting tabs to use `useApplicationDocuments` resolver hook; `dms_service` admin retry button.

## Phase 2 — Step 3 status (done in this iteration)

Done:
- Added DMS-tracking columns + enqueue trigger on `er_documents` (parity with `ip_documents`).
- `dms_queue_claim_batch(limit)` RPC: atomic SKIP-LOCKED claim of N pending queue rows, marks them `Processing` and increments attempts.
- `dms_queue_mark_result(queue_id, success, error)` RPC: on success → `Transferred` (+ updates the master doc row); on failure → exponential backoff (60s × 2^attempts, max 1h) and `Failed` after `max_attempts`.
- New edge function `dms-transfer-retry`: drains the queue in batches by invoking the existing `dms-transfer-single` (IP scope). ER scope is recorded as not-yet-supported so it won't be silently lost.

Next (recommended, not done in this iteration to avoid regression risk on 1700+ lines of existing edge code and meeting/review UI):
- Refactor `dms-transfer` and `dms-transfer-single` to read from `ip_documents` (master) instead of `ip_application_documents` (staging) — current logic still works because conversion now mirrors all docs into staging+master, but reading from master is cleaner.
- Add ER scope handling to `dms-transfer-single`.
- Refactor `ApplicationDocumentsTab`, `MeetingDocumentVerificationTab`, `EmployerMeetingDocumentsTab` to consume `useApplicationDocuments` resolver hook with Source/Status badges.
- Surface `dms_transfer_queue` Failed-row count + manual retry button on the `dms_service` admin page (calls `dms-transfer-retry`).

## Cron schedule (run separately, contains user-specific keys)

To schedule the retry function every 5 minutes, run in Cloud SQL editor (Live):
```sql
select cron.schedule(
  'dms-transfer-retry-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/dms-transfer-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"batchSize": 10}'::jsonb
  ) as request_id;
  $$
);
```
