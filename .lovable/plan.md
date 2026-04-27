## Goal

Refactor and standardize the document lifecycle for both **Insured Person (IP)** and **Employer (ER)** application flows so that:

1. External API documents are read-only at the online-application stage (no premature persistence).
2. Meeting-stage edits (upload / replace / delete) are persisted to dedicated override tables (`ip_application_documents`, `er_application_documents`) backed by Supabase Storage.
3. Conversion to registration is **fully transactional** and migrates effective documents into master tables (`ip_documents`, `er_documents`) with binaries moved into the DMS.
4. All write/read paths go through Supabase endpoints (RPCs + edge functions) — no client-side direct DB manipulation outside thin hooks.
5. SSN finalization (status `V`) cascades the temporary SSN → final SSN across `ip_documents`, mirroring `ip_depend`.

## Current state (verified)

- Storage buckets: `ip-documents` (private), `employer-documents` (public). No DMS-specific bucket yet.
- Override tables exist: `ip_application_documents` (keyed by `ssn`, has DMS transfer columns), `er_application_documents` (keyed by `regno`).
- Master tables exist: `ip_documents` (keyed by `unique_uuid`), `er_documents` (keyed by `regno`).
- `meeting_uploaded_documents` is currently used for meeting-stage uploads, keyed by `meeting_id` + `application_reference`.
- `convert_application_atomic` handles IP conversion but does not write to `ip_documents` (gap).
- `convert_application_to_employer` writes to both `er_application_documents` and `er_documents` but does not move binaries into a DMS bucket.
- `change_ip_status` finalizes SSN on `V` transition for `ip_master`/`ip_depend` but does not cascade into `ip_documents`.
- Two edge functions exist: `dms-transfer`, `dms-transfer-single` (~900 lines each) — currently used asynchronously after IP conversion.

## Architecture

```text
┌────────────────┐          ┌─────────────────────────┐         ┌─────────────────────┐
│ External API   │──read───▶│ Meeting screen          │──edit──▶│ Override tables     │
│ (initial docs) │          │  (merged view)          │         │  ip/er_application_ │
└────────────────┘          └─────────────────────────┘         │  documents          │
                                       │                         └──────────┬──────────┘
                                       │                                    │
                                       ▼                                    │
                            ┌─────────────────────┐                         │
                            │ Conversion RPC      │◀────────────────────────┘
                            │ (atomic)            │
                            └──────────┬──────────┘
                                       │  writes ip_documents / er_documents
                                       │  moves binaries: app bucket → DMS bucket
                                       ▼
                            ┌─────────────────────┐
                            │ Registration master │
                            │ + DMS storage       │
                            └─────────────────────┘
```

**Single source of truth at each stage:**

| Stage | IP source | ER source |
|---|---|---|
| Online list/detail | External API only | External API only |
| Meeting (review/edit) | External API ⊕ `ip_application_documents` overrides | External API ⊕ `er_application_documents` overrides |
| Post-conversion | `ip_documents` (DMS bucket) | `er_documents` (DMS bucket) |
| Post-verify (status V) | `ip_documents` re-keyed to final SSN | `er_documents` (regno is permanent — no cascade needed) |

## Plan

### 1. Storage layout

Create two new private buckets representing the DMS:
- `ip-dms` — finalized IP documents, path: `{ssn}/{unique_uuid}/{doc_id}.{ext}`
- `er-dms` — finalized employer documents, path: `{regno}/{doc_id}.{ext}`

Keep `ip-documents` and `employer-documents` as **staging** buckets used during meeting-stage uploads, path: `{application_reference}/{uuid}.{ext}`.

### 2. Override tables — minor adjustments

- `ip_application_documents`: add `is_deleted boolean default false`, `source_document_id` already exists (used to mark which external doc was overridden/deleted). Add unique partial index on `(application_reference_number, source_document_id) where is_deleted = true` to enforce one tombstone per external doc.
- `er_application_documents`: add `source_document_id text` and `is_deleted boolean default false` (same semantics). Existing `is_active` will continue to flag active uploads.

Override semantics:
- **Upload new:** insert override row, `source_document_id = null`, `is_deleted = false`.
- **Replace external:** insert override row with `source_document_id = <external doc id>`, `is_deleted = false`. Merge logic hides the external doc.
- **Delete external:** insert tombstone row (no file), `source_document_id = <external doc id>`, `is_deleted = true`.
- **Delete own override:** soft-delete by setting `is_deleted = true` and removing storage object.

### 3. Reusable backend services (RPCs)

All write paths go through these RPCs (called via `supabase.rpc()` from hooks) — no direct table writes from the client.

- `ip_app_doc_upsert(p_application_reference, p_source_document_id, p_file_meta jsonb, p_user_code)` — insert/update override.
- `ip_app_doc_delete(p_application_reference, p_doc_id_or_source_id, p_user_code)` — soft-delete + tombstone.
- `er_app_doc_upsert(...)` / `er_app_doc_delete(...)` — same semantics for employer.
- `ip_app_docs_resolve(p_application_reference, p_external_docs jsonb)` returns `setof jsonb` — pure function that takes external docs JSON + reads override table and returns the merged effective set. Used by both meeting UI and conversion.
- `er_app_docs_resolve(...)` — same for employer.

Authorization is enforced inside each RPC by checking `auth.uid()` against `user_roles` (per the No-RLS rule, role-based checks live in the RPC body).

### 4. Conversion RPC updates

**`convert_application_atomic` (IP)** — extend to:
1. Accept `p_documents` (already does) — caller passes the **resolved merged set** from `ip_app_docs_resolve`.
2. For each doc, **insert into `ip_documents`** keyed by the new `unique_uuid` and the temp SSN.
3. Call `dms-transfer` edge function asynchronously (via `pg_net` or return a job id and let the client invoke it) to copy binaries from staging bucket → `ip-dms` bucket. Update `ip_application_documents.transfer_status` to `Transferred` on success.
4. The whole DB portion stays atomic; binary copy is tracked via `transfer_status` for retry.

**`convert_application_to_employer` (ER)** — already writes to `er_documents`; extend to:
1. Accept resolved merged set.
2. Trigger DMS transfer to `er-dms` bucket.
3. Mark `er_application_documents.transferred_at` on success.

### 5. SSN finalization cascade (IP only)

Update `change_ip_status` so when transitioning to `V`:
- Generate the final SSN via `generate_ip_ssn()`.
- Update `ip_master.ssn`, then cascade to `ip_depend`, **`ip_documents`** (new), and `ip_application_documents` via `ON UPDATE CASCADE` (already in place for `ip_application_documents`). Add the FK on `ip_documents.unique_uuid` instead — since `ip_documents` is keyed by `unique_uuid` (not SSN), no SSN rewrite needed there. **Decision:** add `ssn` column to `ip_documents` and keep it in sync with `ip_master.ssn` via FK + `ON UPDATE CASCADE` so the user’s requirement (“update SSN reference in `ip_documents` from temporary to final”) is met.
- Move binaries from `{temp_ssn}/...` to `{final_ssn}/...` inside `ip-dms` bucket via an edge function call queued by the RPC.

### 6. DMS edge function consolidation

- Refactor `dms-transfer` and `dms-transfer-single` into one function `dms-transfer` that accepts `{ scope: 'ip' | 'er', application_reference | unique_uuid | regno }`.
- Delete `dms-transfer-single` after migration.
- Function responsibilities:
  - Read `ip_application_documents` / `er_application_documents` rows with `transfer_status = 'Pending'`.
  - Stream binary from staging bucket → DMS bucket (server-side `storage.from(src).download` then `storage.from(dst).upload`).
  - Update row status (`Transferred` / `Failed`), capture HTTP status, request id, error snippet.
  - Idempotent: skip rows already `Transferred`.

### 7. Frontend changes (thin hooks only)

- Replace `meeting_uploaded_documents` writes in `EmployerMeetingDocumentsTab` and `MeetingDocumentVerificationTab` with calls to the new `ip_app_doc_upsert` / `er_app_doc_upsert` RPCs.
- Replace direct merge logic in `useConvertToIPRegistration.buildDocumentsForConversion` with a single call to `ip_app_docs_resolve(application_reference, external_docs_json)`.
- Same for `useConvertToEmployerRegistration`.
- Add a small `useApplicationDocuments(applicationReference, scope)` hook that returns the resolved merged set for the meeting/review UIs, fed by `*_app_docs_resolve`.

### 8. Audit logging

Every write RPC inserts into `ip_audit_log` / a new `er_audit_log` (or existing equivalent) with:
- `action` ∈ `DOC_UPLOAD | DOC_REPLACE | DOC_DELETE | DOC_MIGRATED | DOC_SSN_CASCADE`
- `changed_by` = `auth.uid()`
- `metadata` capturing source_document_id, file_path, transfer status.

### 9. Migration of existing data

One-shot migration:
1. Move every active row in `meeting_uploaded_documents` whose meeting links to an IP application → `ip_application_documents`, preserving timestamps and storage paths.
2. Move every active row whose meeting links to an Employer application → `er_application_documents`.
3. Mark migrated rows in `meeting_uploaded_documents` as `is_active = false` (don’t drop the table yet — keep for rollback for one release cycle).

### 10. Testing

For each scope (IP, ER) and each transition (online → meeting → conversion → verify):
- Upload new doc → appears in merged view, NOT in master until conversion.
- Replace external doc → external hidden, override shown.
- Delete external doc → tombstone hides it.
- Convert → all effective docs land in master table; binaries in DMS bucket; staging rows marked `Transferred`.
- IP only: finalize SSN → master rows + `ip_documents` rows + DMS paths all reflect final SSN; no orphans.
- Failure simulation: kill DMS transfer mid-way → `Failed` status with retry; conversion remains atomic.

## Technical details

### New RPC signatures (summary)

```sql
ip_app_doc_upsert(p_application_reference text, p_source_document_id text, p_file_meta jsonb, p_user_code text) returns uuid
ip_app_doc_delete(p_application_reference text, p_doc_id_or_source_id text, p_user_code text) returns void
ip_app_docs_resolve(p_application_reference text, p_external_docs jsonb) returns setof jsonb
er_app_doc_upsert(p_source_application_reference text, p_source_document_id text, p_file_meta jsonb, p_user_code text) returns uuid
er_app_doc_delete(...) returns void
er_app_docs_resolve(...) returns setof jsonb
```

### Schema changes

- `ip_application_documents`: `+ is_deleted boolean default false`
- `er_application_documents`: `+ source_document_id text`, `+ is_deleted boolean default false`
- `ip_documents`: `+ ssn varchar(6)`, FK to `ip_master(ssn) on update cascade on delete cascade`
- New buckets: `ip-dms`, `er-dms` (both private)

### Edge functions

- Consolidate to single `dms-transfer` function (~400 lines after dedup).
- Remove `dms-transfer-single`.

### Files to be touched

- `supabase/migrations/<new>_doc_lifecycle_refactor.sql` (schema + RPCs + cascade)
- `supabase/functions/dms-transfer/index.ts` (rewrite)
- `supabase/functions/dms-transfer-single/` (delete)
- `src/hooks/useConvertToIPRegistration.ts` (use resolve RPC)
- `src/hooks/useConvertToEmployerRegistration.ts` (use resolve RPC)
- `src/hooks/useApplicationDocuments.ts` (new)
- `src/components/meetings/MeetingDocumentVerificationTab.tsx` (use upsert/delete RPCs)
- `src/components/meetings/EmployerMeetingDocumentsTab.tsx` (use upsert/delete RPCs)
- `src/components/meetings/EmployerApplicationEditForm.tsx` (use new hook)

### Out of scope

- Replacing `meeting_uploaded_documents` for non-IP/ER meeting types.
- Changing the external API contract.
- UI redesign — only the persistence/data layer changes.
